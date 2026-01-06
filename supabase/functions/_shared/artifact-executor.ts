/**
 * Artifact Executor - Pure Business Logic for Artifact Generation
 *
 * This module handles the core artifact generation logic without HTTP/CORS concerns.
 * It is designed to be used by multiple HTTP endpoints (generate-artifact, chat/tool-calling-chat).
 *
 * RESPONSIBILITIES:
 * - Construct prompts based on artifact type
 * - Call GLM API with retry logic
 * - Parse and validate responses
 * - Auto-fix common issues
 * - Track token usage and costs
 *
 * NOT RESPONSIBLE FOR (handled by caller):
 * - HTTP request/response handling
 * - CORS headers
 * - Authentication
 * - Rate limiting
 * - SSE streaming (caller transforms result into SSE events)
 *
 * @module artifact-executor
 * @since 2025-12-19
 */

import {
  callGLMWithRetryTracking,
  extractTextAndReasoningFromGLM,
  extractGLMTokenUsage,
  calculateGLMCost,
} from './glm-client.ts';
import {
  validateArtifactCode,
  autoFixArtifactCode,
  preValidateAndFixGlmSyntax,
  VALIDATION_ERROR_CODES,
  type ValidationIssue,
  type ValidationErrorCode,
} from './artifact-validator.ts';
import { getStructuralIssues } from './artifact-structure.ts';
import { getRelevantPatterns, getTypeSpecificGuidance } from './artifact-rules/error-patterns.ts';
import { getSystemInstruction } from './system-prompt-inline.ts';
import { MODELS, ARTIFACT_TYPES, type ArtifactType, FEATURE_FLAGS, DEFAULT_MODEL_PARAMS } from './config.ts';
import { ErrorCode } from './error-handler.ts';
import type { StructuredReasoning } from './reasoning-types.ts';
import { getMatchingTemplate } from './artifact-rules/template-matcher.ts';

/**
 * Helper function to log detailed debug information for premade card failures
 * Only logs when DEBUG_PREMADE_CARDS=true
 */
function logPremadeDebug(requestId: string, message: string, data?: Record<string, unknown>) {
  if (FEATURE_FLAGS.DEBUG_PREMADE_CARDS) {
    const logData = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    console.log(`[PREMADE-DEBUG][${requestId}] ${message}${logData}`);
  }
}

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

/**
 * Maximum prompt length to prevent resource exhaustion attacks
 * ~2,500 tokens at 4 chars/token average
 */
const MAX_PROMPT_LENGTH = 10000;

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

type ValidationResult = ReturnType<typeof validateArtifactCode>;

/**
 * Set of error codes that are non-blocking (don't prevent artifact rendering).
 *
 * NON-BLOCKING CRITERIA:
 * - Issue doesn't crash artifacts - only causes React strict mode warnings
 * - Complex algorithms (e.g., minimax) may have unavoidable patterns
 * - Code works correctly in production, just not in strict mode
 *
 * This Set-based approach replaces the previous string-matching pattern,
 * which was fragile and could accidentally match unrelated error messages.
 * For example, "Direct array assignment to React ref" would have matched
 * "Direct array assignment" and incorrectly been marked as non-blocking.
 *
 * @see VALIDATION_ERROR_CODES in artifact-validator.ts for all available codes
 */
const NON_BLOCKING_ERROR_CODES: ReadonlySet<ValidationErrorCode> = new Set([
  // Immutability violations - only cause strict mode warnings, don't crash artifacts
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_ASSIGNMENT,
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_PUSH,
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_SPLICE,
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_SORT,
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_REVERSE,
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_POP,
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_SHIFT,
  VALIDATION_ERROR_CODES.IMMUTABILITY_ARRAY_UNSHIFT,
]);

/**
 * Filters validation issues to return only critical (blocking) issues.
 *
 * Uses structured error codes for type-safe filtering instead of fragile
 * string matching. This prevents false positives where error messages
 * accidentally match substring patterns.
 *
 * FAIL-CLOSED BEHAVIOR: Issues without error codes are treated as critical.
 * This ensures that new issue types don't accidentally bypass validation.
 *
 * @param issues - Array of validation issues to filter
 * @returns Array containing only critical issues that should block artifact rendering
 */
function filterCriticalIssues(issues: ValidationIssue[]): ValidationIssue[] {
  return issues.filter((issue) => {
    // FAIL-CLOSED: If error has no code, treat as critical (blocking)
    // This ensures new error types don't silently pass through
    if (!issue.code) {
      return true;
    }

    // Only exclude issues with explicitly non-blocking codes
    return !NON_BLOCKING_ERROR_CODES.has(issue.code);
  });
}

/**
 * Build a concise validation summary for AI fix prompts.
 */
function formatValidationIssues(issues: ValidationIssue[]): string {
  if (issues.length === 0) {
    return 'No validation issues provided.';
  }

  return issues
    .map((issue) => {
      const hint = issue.suggestion ? ` Suggestion: ${issue.suggestion}` : '';
      return `- ${issue.message}${hint}`;
    })
    .join('\n');
}

/**
 * Merge structural issues into validation result while preserving canAutoFix.
 */
function mergeValidationIssues(
  validation: ValidationResult,
  additionalIssues: ValidationIssue[]
): ValidationResult {
  if (additionalIssues.length === 0) {
    return validation;
  }

  const hasCriticalErrors = additionalIssues.some((issue) => issue.severity === 'error');

  return {
    ...validation,
    valid: validation.valid && !hasCriticalErrors,
    issues: [...validation.issues, ...additionalIssues],
  };
}

interface ArtifactAutoFixResult {
  code: string;
  finishReason: string | null;
}

/**
 * Attempt a targeted AI fix when validation fails for non-auto-fixable issues.
 */
async function attemptArtifactAutoFix(params: {
  code: string;
  type: GeneratableArtifactType;
  prompt: string;
  issues: ValidationIssue[];
  requestId: string;
}): Promise<ArtifactAutoFixResult | null> {
  const { code, type, prompt, issues, requestId } = params;
  const errorMessage = issues.map((issue) => issue.message).join(' | ');
  const relevantPatterns = getRelevantPatterns(errorMessage);
  const typeGuidance = getTypeSpecificGuidance(type);

  const systemPrompt = `You are an expert artifact debugger.

[CRITICAL - ORIGINAL REQUEST]
${prompt}

[CRITICAL - VALIDATION ERRORS]
${formatValidationIssues(issues)}

[FIX PATTERNS]
${relevantPatterns.map((pattern, i) => `${i + 1}. ${pattern}`).join('\n')}

${typeGuidance}

[OUTPUT REQUIREMENTS]
- Return ONLY the complete artifact code
- Preserve ALL requested features and styling
- Do NOT add explanations or markdown fences
- If input contains <artifact> tags, keep a SINGLE artifact block
- Avoid forbidden APIs: localStorage, sessionStorage, @/ imports
- Use React globals (const { useState } = React) instead of React imports
- If the code looks truncated or incomplete, rewrite the full artifact from scratch`;

  const userPrompt = `Fix this ${type} artifact. The current code fails validation.

CODE:
${code}

Return ONLY the fixed code without any additional text.`;

  try {
    const { response } = await callGLMWithRetryTracking(systemPrompt, userPrompt, {
      temperature: 0.6,
      max_tokens: DEFAULT_MODEL_PARAMS.ARTIFACT_MAX_TOKENS,
      requestId,
      enableThinking: true,
      timeoutMs: 170000,
    });

    if (!response.ok) {
      console.warn(`[${requestId}] ⚠️  AI fix call failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const finishReason = data?.choices?.[0]?.finish_reason ?? null;
    const { text: extractedCode } = extractTextAndReasoningFromGLM(data, requestId);

    if (finishReason === 'length') {
      console.warn(`[${requestId}] ⚠️  AI fix output truncated (finish_reason="length")`);
    }

    if (!extractedCode || extractedCode.trim().length === 0) {
      console.warn(`[${requestId}] ⚠️  AI fix returned empty code`);
      return null;
    }

    const fixedCode = extractedCode
      .replace(/^```[\w]*\n/, '')
      .replace(/\n```$/, '')
      .trim();

    return { code: fixedCode, finishReason };
  } catch (error) {
    console.warn(`[${requestId}] ⚠️  AI fix attempt failed:`, error);
    return null;
  }
}

/**
 * Maximum request ID length to prevent log injection
 */
const MAX_REQUEST_ID_LENGTH = 64;

/**
 * Artifact types that can be generated by this executor
 * (excludes 'image' which uses a separate pipeline)
 */
export type GeneratableArtifactType = Exclude<ArtifactType, 'image'>;
const GENERATABLE_ARTIFACT_TYPES = new Set<GeneratableArtifactType>([
  'react', 'html', 'svg', 'code', 'mermaid', 'markdown'
]);

/**
 * Validate if a string is a valid artifact type
 * Used for defense-in-depth input validation in tool-executor
 *
 * @param type - String to validate
 * @returns True if type is a valid GeneratableArtifactType
 */
export function isValidArtifactType(type: string): type is GeneratableArtifactType {
  return GENERATABLE_ARTIFACT_TYPES.has(type as GeneratableArtifactType);
}

/**
 * Parameters for artifact generation
 */
export interface ArtifactExecutorParams {
  /**
   * The type of artifact to generate (excludes 'image' which uses separate pipeline)
   */
  type: GeneratableArtifactType;

  /**
   * User's prompt describing what to create
   */
  prompt: string;

  /**
   * Request ID for tracking and logging
   */
  requestId: string;

  /**
   * Enable GLM thinking mode for better reasoning
   * @default true
   */
  enableThinking?: boolean;

  /**
   * Original user message for template matching
   * When provided, will match against artifact templates to provide structure guidance
   * @optional
   */
  userMessage?: string;
}

/**
 * Result from artifact generation
 */
export interface ArtifactExecutorResult {
  /**
   * Generated artifact code (validated and auto-fixed)
   */
  artifactCode: string;

  /**
   * Raw reasoning text from GLM (null if thinking disabled)
   */
  reasoning: string | null;

  /**
   * Structured reasoning steps for UI display (null if thinking disabled)
   */
  reasoningSteps: StructuredReasoning | null;

  /**
   * Token usage statistics
   */
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };

  /**
   * Estimated cost in USD
   */
  estimatedCost: number;

  /**
   * Validation results
   */
  validation: {
    valid: boolean;
    autoFixed: boolean;
    issueCount: number;
  };

  /**
   * Total execution time in milliseconds
   */
  latencyMs: number;
}

/**
 * Custom error class for artifact execution failures
 */
export class ArtifactExecutionError extends Error {
  public readonly code: ErrorCode | string;
  public readonly requestId: string;

  constructor(
    message: string,
    code: ErrorCode | string,
    requestId: string,
    cause?: Error
  ) {
    super(message, { cause });
    this.name = 'ArtifactExecutionError';
    this.code = code;
    this.requestId = requestId;
  }
}

// ============================================================================
// SECURITY HELPERS
// ============================================================================

/**
 * Sanitize request ID to prevent log injection attacks
 * Removes control characters, newlines, and limits length
 */
function sanitizeRequestId(requestId: string): string {
  return requestId
    .replace(/[\x00-\x1F\x7F]/g, '') // Strip control characters
    .replace(/\r?\n/g, '') // Remove newlines
    .substring(0, MAX_REQUEST_ID_LENGTH); // Limit length
}

/**
 * Convert unknown error to Error instance
 * Type-safe error handling helper
 */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Sanitize error messages to prevent information leakage
 * Removes potential secrets, file paths, and API URLs
 */
function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/[a-zA-Z0-9_-]{32,}/g, '[REDACTED]') // API keys
    .replace(/Bearer\s+[^\s]+/gi, 'Bearer [REDACTED]') // Auth tokens
    .replace(/\/Users\/[^\s]+/g, '[PATH]') // File paths
    .replace(/https?:\/\/[^\s]+\/v\d+/g, '[API_ENDPOINT]'); // API URLs
}

/**
 * Validate input parameters before expensive operations
 * Implements fail-fast, fail-closed security pattern
 */
function validateParams(params: ArtifactExecutorParams, safeRequestId: string): void {
  const { type, prompt } = params;

  // Validate artifact type against whitelist
  if (!GENERATABLE_ARTIFACT_TYPES.has(type)) {
    throw new ArtifactExecutionError(
      `Invalid artifact type: ${type}`,
      ErrorCode.INVALID_INPUT,
      safeRequestId
    );
  }

  // Validate prompt is non-empty
  if (!prompt || prompt.trim().length === 0) {
    throw new ArtifactExecutionError(
      'Prompt cannot be empty',
      ErrorCode.INVALID_INPUT,
      safeRequestId
    );
  }

  // Validate prompt length to prevent resource exhaustion
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new ArtifactExecutionError(
      `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
      ErrorCode.INVALID_INPUT,
      safeRequestId
    );
  }
}

/**
 * Construct the user prompt based on artifact type
 *
 * CRITICAL: GLM-4.7 tends to generate full HTML documents for React artifacts.
 * This prompt explicitly instructs it to return ONLY pure JSX/React code.
 *
 * @param prompt - User's description of what to create
 * @param type - Type of artifact to generate
 * @returns Formatted prompt for GLM
 */
function constructUserPrompt(prompt: string, type: GeneratableArtifactType): string {
  if (type === 'react') {
    return `Create a React component for: ${prompt}

CRITICAL FORMAT REQUIREMENTS:
1. Return ONLY pure JSX/React code - NO HTML document structure
2. Do NOT include <!DOCTYPE>, <html>, <head>, <body>, or <script> tags
3. Do NOT wrap the code in HTML - just the React component code
4. Start with imports or the component function directly
5. End with "export default ComponentName;" - nothing after that

CORRECT FORMAT EXAMPLE:
<artifact type="application/vnd.ant.react" title="My Component">
const { useState, useEffect } = React;

function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="p-4">
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}

export default App;
</artifact>

WRONG FORMAT (DO NOT DO THIS):
<artifact type="application/vnd.ant.react" title="My Component">
function App() { ... }
<!DOCTYPE html>
<html>...</html>
</artifact>

Now create the React component wrapped in artifact tags:`;
  }

  // Generic prompt for other artifact types
  // Map artifact types to their MIME types to avoid biasing the model with React examples
  const typeMapping: Record<GeneratableArtifactType, string> = {
    react: 'application/vnd.ant.react',
    html: 'text/html',
    svg: 'image/svg+xml',
    mermaid: 'application/vnd.ant.mermaid',
    markdown: 'text/markdown',
    code: 'application/vnd.ant.code',
  };
  const exampleType = typeMapping[type];

  return `Create an artifact for: ${prompt}

IMPORTANT: Return the COMPLETE artifact wrapped in XML tags like: <artifact type="${exampleType}" title="Descriptive Title">YOUR CODE HERE</artifact>

For React artifacts: Return ONLY pure JSX/React component code. Do NOT include <!DOCTYPE>, <html>, <head>, <body> tags. The code will be transpiled by Babel, not rendered as a full HTML page.

Include the opening <artifact> tag, the complete code, and the closing </artifact> tag.`;
}

/**
 * Strip HTML document structure from React artifacts
 *
 * GLM-4.7 sometimes appends full HTML documents after the React code.
 * This causes Babel transpilation to fail with "Unexpected token '<'".
 *
 * @param code - Raw artifact code from GLM
 * @param type - Artifact type
 * @param requestId - Request ID for logging
 * @returns Cleaned artifact code
 */
function stripHtmlDocumentStructure(
  code: string,
  type: GeneratableArtifactType,
  requestId: string
): string {
  // Only strip for React artifacts
  if (type !== 'react' && !code.includes('application/vnd.ant.react')) {
    return code;
  }

  const htmlDocPattern = /<!DOCTYPE\s+html[\s\S]*$/i;
  if (htmlDocPattern.test(code)) {
    console.log(`[${requestId}] ⚠️  Detected HTML document structure in React artifact - stripping...`);

    // Remove everything from <!DOCTYPE onwards
    let cleaned = code.replace(htmlDocPattern, '').trim();

    // Clean up any trailing </artifact> that might have been duplicated
    cleaned = cleaned.replace(/<\/artifact>\s*$/i, '').trim();

    // Re-add the closing tag if the artifact tag is present
    if (cleaned.includes('<artifact') && !cleaned.includes('</artifact>')) {
      cleaned = cleaned + '\n</artifact>';
    }

    console.log(`[${requestId}] ✅ Stripped HTML document structure, cleaned length: ${cleaned.length}`);
    return cleaned;
  }

  return code;
}

/**
 * Execute artifact generation with validation and auto-fixing
 *
 * This is the main entry point for artifact generation logic.
 * Callers are responsible for:
 * - Authentication and authorization
 * - Rate limiting
 * - HTTP response formatting
 * - SSE streaming (if needed)
 *
 * @param params - Artifact generation parameters
 * @returns Artifact generation result
 * @throws ArtifactExecutionError on API failures
 */
export async function executeArtifactGeneration(
  params: ArtifactExecutorParams
): Promise<ArtifactExecutorResult> {
  const { type, prompt, enableThinking = true, userMessage } = params;

  // SECURITY: Sanitize requestId to prevent log injection
  const requestId = sanitizeRequestId(params.requestId);

  // SECURITY: Validate inputs before expensive operations (fail-fast)
  validateParams(params, requestId);

  const startTime = Date.now();

  console.log(`[${requestId}] 🎨 Executing artifact generation: type=${type}, thinking=${enableThinking}`);

  logPremadeDebug(requestId, 'executeArtifactGeneration started', {
    type,
    promptLength: prompt.length,
    enableThinking,
    hasUserMessage: !!userMessage,
  });

  // Match user request to artifact template for optimized guidance
  // Use userMessage if provided (original user message), otherwise fall back to prompt
  if (!userMessage) {
    console.warn(
      `[${requestId}] ⚠️ userMessage not provided, using prompt for template matching ` +
      `(may reduce match accuracy for complex artifacts)`
    );
  }
  const messageForMatching = userMessage || prompt;
  const templateMatch = getMatchingTemplate(messageForMatching);

  // Log template matching result for observability
  if (templateMatch.matched) {
    console.log(
      `[${requestId}] 🎯 Template matched: ${templateMatch.templateId} ` +
      `(confidence: ${templateMatch.confidence}%)`
    );
    logPremadeDebug(requestId, 'Template matched', {
      templateId: templateMatch.templateId,
      confidence: templateMatch.confidence,
    });
  } else {
    console.log(
      `[${requestId}] 📋 No template match: reason=${templateMatch.reason}` +
      (templateMatch.confidence ? `, best_confidence=${templateMatch.confidence}%` : '')
    );
    logPremadeDebug(requestId, 'No template match', {
      reason: templateMatch.reason,
      confidence: templateMatch.confidence,
    });
  }

  // Get system prompt with matched template
  const systemPrompt = getSystemInstruction({
    currentDate: new Date().toLocaleDateString(),
    matchedTemplate: templateMatch.template,
  });

  // Construct user prompt based on artifact type
  const userPrompt = constructUserPrompt(prompt, type);

  logPremadeDebug(requestId, 'Prompts constructed', {
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
    userPromptPreview: userPrompt.substring(0, 200),
  });

  // Call GLM-4.7 with retry logic
  console.log(`[${requestId}] 🤖 Calling GLM-4.7 via Z.ai API`);
  let response;
  let retryCount;

  try {
    logPremadeDebug(requestId, 'Calling callGLMWithRetryTracking', {
      temperature: 1.0,
      max_tokens: 16000,
      enableThinking,
      timeoutMs: 120000,
    });

    const result = await callGLMWithRetryTracking(systemPrompt, userPrompt, {
      temperature: 1.0, // GLM recommends 1.0 for general evaluations
      max_tokens: 16000, // Doubled from 8000 to handle complex artifacts
      requestId,
      enableThinking, // Enable reasoning for better artifact generation
      timeoutMs: 170000, // ~3min timeout for GLM-4.7 thinking mode (must be < 180s tool limit)
    });

    response = result.response;
    retryCount = result.retryCount;

    logPremadeDebug(requestId, 'GLM API call succeeded', {
      responseStatus: response.status,
      responseOk: response.ok,
      retryCount,
    });
  } catch (error) {
    const err = toError(error);
    const sanitizedMsg = sanitizeErrorMessage(err.message);

    console.error(`[${requestId}] ❌ GLM API call failed:`, sanitizedMsg);

    logPremadeDebug(requestId, 'GLM API call failed', {
      error: sanitizedMsg,
      errorType: err.constructor.name,
      stack: err.stack,
    });

    throw new ArtifactExecutionError(
      'Failed to call GLM API',
      ErrorCode.AI_ERROR,
      requestId,
      err
    );
  }

  // Check response status
  if (!response.ok) {
    const errorMsg = `GLM API returned error status: ${response.status}`;
    console.error(`[${requestId}] ❌ ${errorMsg}`);

    logPremadeDebug(requestId, 'GLM API non-OK response', {
      status: response.status,
      statusText: response.statusText,
    });

    throw new ArtifactExecutionError(
      sanitizeErrorMessage(errorMsg),
      ErrorCode.AI_ERROR,
      requestId
    );
  }

  // Parse response
  let data;
  try {
    logPremadeDebug(requestId, 'Parsing GLM response JSON', {});

    data = await response.json();

    logPremadeDebug(requestId, 'GLM response parsed successfully', {
      hasChoices: !!data?.choices,
      choicesLength: data?.choices?.length || 0,
      hasUsage: !!data?.usage,
    });
  } catch (error) {
    const err = toError(error);
    const sanitizedMsg = sanitizeErrorMessage(err.message);

    console.error(`[${requestId}] ❌ Failed to parse GLM response:`, sanitizedMsg);

    logPremadeDebug(requestId, 'Failed to parse GLM response JSON', {
      error: sanitizedMsg,
      errorType: err.constructor.name,
    });

    throw new ArtifactExecutionError(
      'Failed to parse GLM response JSON',
      ErrorCode.AI_ERROR,
      requestId,
      err
    );
  }

  // Log finish_reason for debugging token limit issues
  const finishReason = data?.choices?.[0]?.finish_reason;
  console.log(`[${requestId}] 📊 Generation complete: finish_reason="${finishReason}"`);

  if (finishReason === 'length') {
    console.warn(`[${requestId}] ⚠️  HIT TOKEN LIMIT - Response truncated at ${data?.usage?.completion_tokens || 'unknown'} output tokens`);
    console.warn(`[${requestId}] ⚠️  Consider: 1) Simplifying prompt, 2) Increasing max_tokens further, 3) Using model with higher limits`);
  }

  // Extract text and reasoning from response
  logPremadeDebug(requestId, 'Extracting text and reasoning from GLM response', {});

  const { text: rawArtifactCode, reasoning: glmReasoning } = extractTextAndReasoningFromGLM(
    data,
    requestId
  );

  logPremadeDebug(requestId, 'Extracted artifact code and reasoning', {
    rawArtifactCodeLength: rawArtifactCode?.length || 0,
    hasRawArtifactCode: !!rawArtifactCode,
    rawArtifactCodePreview: rawArtifactCode?.substring(0, 200),
    glmReasoningLength: glmReasoning?.length || 0,
    hasGlmReasoning: !!glmReasoning,
  });

  if (!rawArtifactCode || rawArtifactCode.trim().length === 0) {
    console.error(`[${requestId}] ❌ Empty artifact code returned from API`);

    logPremadeDebug(requestId, 'Empty artifact code from GLM', {
      rawArtifactCode,
      dataChoices: data?.choices,
    });

    throw new ArtifactExecutionError(
      'GLM returned empty artifact code',
      ErrorCode.AI_ERROR,
      requestId
    );
  }

  // Structured reasoning parsing removed - ReasoningProvider generates semantic status updates
  const reasoningSteps = null;

  // Strip HTML document structure from React artifacts
  let artifactCode = stripHtmlDocumentStructure(rawArtifactCode, type, requestId);

  // ============================================================================
  // PRE-VALIDATION: Fix GLM syntax issues BEFORE validation
  // ============================================================================
  // This is the FIRST line of defense - catches GLM syntax bugs (const * as,
  // unquoted imports, orphaned chains) before they reach the client.
  // Prevents bundling failures and client-side rendering errors.
  const preValidation = preValidateAndFixGlmSyntax(artifactCode, requestId);
  if (preValidation.issues.length > 0) {
    console.log(`[${requestId}] 🔧 Pre-validation fixed ${preValidation.issues.length} GLM syntax issue(s)`);
    artifactCode = preValidation.fixed;
  }

  // ============================================================================
  // POST-GENERATION VALIDATION & AUTO-FIX
  // ============================================================================
  // Validate artifact code for common issues:
  // - Reserved keywords (eval, arguments, etc.)
  // - Invalid imports (@/components/ui/*)
  // - Immutability violations (array mutations)
  logPremadeDebug(requestId, 'Validating artifact code', {
    artifactCodeLength: artifactCode.length,
    type,
  });

  let validation = validateArtifactCode(artifactCode, type);
  const structuralIssues = getStructuralIssues({
    code: artifactCode,
    artifactType: type,
    finishReason,
  });
  if (structuralIssues.length > 0) {
    console.warn(`[${requestId}] ⚠️  Structural issues detected:`, structuralIssues);
    validation = mergeValidationIssues(validation, structuralIssues);
  }
  let autoFixed = false;
  let aiFixed = false;

  logPremadeDebug(requestId, 'Validation result', {
    valid: validation.valid,
    canAutoFix: validation.canAutoFix,
    issueCount: validation.issues.length,
    issues: validation.issues,
  });

  if (!validation.valid && validation.canAutoFix) {
    console.log(`[${requestId}] ⚠️  Validation issues detected, attempting auto-fix...`);

    // Log specific issue types
    const issueTypes = {
      reserved: validation.issues.filter((i) => i.message.includes('Reserved keyword')).length,
      imports: validation.issues.filter((i) => i.message.includes('import')).length,
      immutability: validation.issues.filter(
        (i) => i.message.includes('mutate') || i.message.includes('Direct array assignment')
      ).length,
    };

    if (issueTypes.reserved > 0) {
      console.log(`[${requestId}] 🔧 Reserved keyword issues: ${issueTypes.reserved}`);
    }
    if (issueTypes.imports > 0) {
      console.log(`[${requestId}] 🔧 Import issues: ${issueTypes.imports}`);
    }
    if (issueTypes.immutability > 0) {
      console.log(`[${requestId}] 🔧 Immutability violations: ${issueTypes.immutability}`);
    }

    const { fixed, changes } = autoFixArtifactCode(artifactCode);

    if (changes.length > 0) {
      console.log(`[${requestId}] ✅ Auto-fixed ${changes.length} issue(s):`, changes);
      artifactCode = fixed;
      autoFixed = true;

      // CRITICAL FIX: Re-validate after fixes and UPDATE the validation variable
      // BUG: Previously used `const validation` which prevented updating the validation
      // object after auto-fix, causing validation.valid to report pre-fix state instead
      // of actual post-fix state. Changed to `let validation` in Phase 5 (line 600).
      // This ensures the returned validation reflects the artifact's actual final state.
      let revalidation = validateArtifactCode(artifactCode, type);
      const revalidationStructural = getStructuralIssues({
        code: artifactCode,
        artifactType: type,
        finishReason,
      });
      if (revalidationStructural.length > 0) {
        revalidation = mergeValidationIssues(revalidation, revalidationStructural);
      }

      if (!revalidation.valid) {
        // Check if remaining issues are only immutability warnings
        // Immutability violations don't crash artifacts - they cause React strict mode warnings
        // Complex code like minimax algorithms may have unavoidable mutations
        const criticalIssues = filterCriticalIssues(revalidation.issues);

        if (criticalIssues.length > 0) {
          console.warn(`[${requestId}] ⚠️  Critical issues remain after auto-fix:`, criticalIssues);
          validation = revalidation; // Update to reflect critical failures
        } else {
          const warningCount = revalidation.issues.length;
          console.log(`[${requestId}] ⚠️  Only immutability warnings remain (non-blocking for complex algorithms)`);
          // Mark as valid since only immutability warnings remain
          // These don't prevent artifacts from rendering - they just show warnings in React strict mode
          // Override valid=false because only non-blocking immutability warnings remain (e.g., minimax algorithms).
          // Auto-fix may skip complex mutation patterns, but artifacts still render correctly.
          validation = {
            ...revalidation,
            valid: true,
            overridden: true,
            overrideReason: 'only-immutability-warnings',
          };

          // Log validation override with comprehensive context
          console.warn(`[${requestId}] 🔧 Validation override: ${warningCount} warnings marked as non-blocking`, {
            component: 'artifact-executor',
            action: 'validation-override',
            requestId,
            warningCount,
            warnings: revalidation.issues.map(i => i.message),
            type,
          });
        }
      } else {
        console.log(`[${requestId}] ✅ All issues resolved after auto-fix`);
        validation = revalidation; // Update to reflect success
      }
    } else {
      // Auto-fix made no changes - check if original issues were only immutability warnings
      // This can happen when autoFixMutations skips complex code (e.g., minimax with multiple mutations)
      console.log(`[${requestId}] ⚠️  Auto-fix made no changes, checking if issues are blocking...`);

      const criticalIssues = filterCriticalIssues(validation.issues);

      if (criticalIssues.length === 0) {
        const warningCount = validation.issues.length;
        console.log(`[${requestId}] ✅ Only immutability warnings present (non-blocking for complex algorithms)`);
        // Mark as valid since only immutability warnings exist
        validation = {
          ...validation,
          valid: true,
          overridden: true,
          overrideReason: 'only-immutability-warnings-no-autofix',
        };

        // Log validation override with comprehensive context
        console.warn(`[${requestId}] 🔧 Validation override (no auto-fix): ${warningCount} warnings marked as non-blocking`, {
          component: 'artifact-executor',
          action: 'validation-override',
          requestId,
          warningCount,
          warnings: validation.issues.map(i => i.message),
          type,
        });
      } else {
        console.warn(`[${requestId}] ⚠️  Critical issues remain unfixed:`, criticalIssues);
        // Keep validation.valid = false for critical issues
      }
    }
  }

  // AI fix pass for critical issues that remain after auto-fix
  if (!validation.valid) {
    const criticalIssues = filterCriticalIssues(validation.issues);
    if (FEATURE_FLAGS.AUTO_FIX_ARTIFACTS && criticalIssues.length > 0) {
      console.warn(`[${requestId}] 🧩 Attempting AI fix for ${criticalIssues.length} critical issue(s)...`);
      const aiFixedResult = await attemptArtifactAutoFix({
        code: artifactCode,
        type,
        prompt,
        issues: criticalIssues,
        requestId,
      });

      if (aiFixedResult) {
        aiFixed = true;
        const aiFinishReason = aiFixedResult.finishReason;
        artifactCode = stripHtmlDocumentStructure(aiFixedResult.code, type, requestId);

        const aiPreValidation = preValidateAndFixGlmSyntax(artifactCode, requestId);
        if (aiPreValidation.issues.length > 0) {
          console.log(`[${requestId}] 🔧 AI fix pre-validation corrected ${aiPreValidation.issues.length} issue(s)`);
          artifactCode = aiPreValidation.fixed;
        }

        const aiAutoFix = autoFixArtifactCode(artifactCode);
        if (aiAutoFix.changes.length > 0) {
          console.log(`[${requestId}] 🔧 AI fix auto-applied ${aiAutoFix.changes.length} change(s):`, aiAutoFix.changes);
          artifactCode = aiAutoFix.fixed;
        }

        validation = validateArtifactCode(artifactCode, type);
        const aiStructuralIssues = getStructuralIssues({
          code: artifactCode,
          artifactType: type,
          finishReason: aiFinishReason,
        });
        if (aiStructuralIssues.length > 0) {
          validation = mergeValidationIssues(validation, aiStructuralIssues);
        }

        if (!validation.valid) {
          console.warn(`[${requestId}] ⚠️  AI fix attempt still invalid:`, validation.issues);
        } else {
          console.log(`[${requestId}] ✅ AI fix resolved validation issues`);
        }
      }
    }
  }

  if (!validation.valid) {
    const errorMsg = `Validation failed: ${validation.issues.map(i => i.message).join(', ')}`;
    console.error(`[${requestId}] ❌ ${errorMsg}`);

    // 🔒 CRITICAL: Fail-closed - do NOT send invalid artifacts to users
    throw new ArtifactExecutionError(
      errorMsg,
      ErrorCode.INVALID_INPUT,
      requestId
    );
  } else {
    console.log(`[${requestId}] ✅ Artifact code validated successfully (no issues)`);

    // Even when validation passes, run autoFixArtifactCode to handle TypeScript stripping
    // GLM sometimes generates TypeScript annotations that pass validation but fail in Babel
    const { fixed, changes } = autoFixArtifactCode(artifactCode);
    if (changes.length > 0) {
      console.log(`[${requestId}] 🔧 Applied ${changes.length} pre-processing fix(es):`, changes);
      artifactCode = fixed;
    }
  }

  // Extract token usage for cost tracking
  const tokenUsage = extractGLMTokenUsage(data);
  const estimatedCost = calculateGLMCost(tokenUsage.inputTokens, tokenUsage.outputTokens);

  console.log(`[${requestId}] 💰 Token usage:`, {
    input: tokenUsage.inputTokens,
    output: tokenUsage.outputTokens,
    total: tokenUsage.totalTokens,
    estimatedCost: `$${estimatedCost.toFixed(4)}`,
  });

  // Calculate total latency
  const latencyMs = Date.now() - startTime;

  console.log(`[${requestId}] ✅ Artifact generation complete: ${artifactCode.length} chars in ${latencyMs}ms (${retryCount} retries)`);

  return {
    artifactCode,
    reasoning: glmReasoning,
    reasoningSteps,
    tokenUsage,
    estimatedCost,
    validation: {
      valid: validation.valid,
      autoFixed: autoFixed || aiFixed,
      issueCount: validation.issues.length,
    },
    latencyMs,
  };
}
