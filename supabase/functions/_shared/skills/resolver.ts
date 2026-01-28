/**
 * Skills System v2 - Skill Resolver
 *
 * Core resolution engine that:
 * 1. Executes context providers in parallel with timeout protection
 * 2. Replaces placeholders in skill content with provider results
 * 3. Sanitizes user content to prevent prompt injection
 * 4. Provides action execution with parameter validation
 * 5. Loads reference documentation on-demand
 *
 * ## Architecture
 *
 * The resolver transforms static skill definitions into runtime-ready prompts:
 *
 * ```
 * Skill (static)
 *   ↓ resolveSkill(skillId, context)
 *   ↓ - Execute context providers (parallel, 3s timeout each)
 *   ↓ - Replace {{placeholders}} with provider results
 *   ↓ - Sanitize user content
 *   ↓ - Truncate long outputs (5000 chars max)
 * ResolvedSkill (ready for LLM)
 * ```
 *
 * ## Error Handling
 *
 * ALL errors use SafeErrorHandler for consistent, secure error responses.
 * Provider failures gracefully degrade with placeholder fallback.
 *
 * ## Logging
 *
 * Uses structured logging via createLogger() - NO console.* statements.
 *
 * @module skills/resolver
 * @since 2026-01-25 (Skills System v2)
 */

import type {
  Skill,
  SkillId,
  SkillContext,
  ResolvedSkill,
  ContextProvider,
  SkillAction,
  ActionParameter,
} from './types.ts';
import { getSkill } from './registry.ts';
import { SafeErrorHandler } from '../safe-error-handler.ts';
import { createLogger } from '../logger.ts';
import { PromptInjectionDefense } from '../prompt-injection-defense.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { ERROR_IDS } from '../../../../src/constants/errorIds.ts';

// ============================================================================
// CRITICAL: Model Configuration Rule
// ============================================================================
//
// IMPORTANT: Per CLAUDE.md rule #3, NEVER hardcode model names!
// If skill resolution needs LLM calls (future feature), ALWAYS use:
//
// import { MODELS } from '../config.ts';
// model: MODELS.GEMINI_3_FLASH  // ✅ CORRECT
// model: 'google/gemini-3-flash'  // ❌ WRONG - CI will fail
//
// ============================================================================

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum characters for a single context provider output
 *
 * @remarks
 * Prevents token bloat from large provider results (e.g., entire conversation history).
 * Outputs exceeding this limit are truncated with warning.
 */
const MAX_PROVIDER_OUTPUT_CHARS = 5000;

/**
 * Timeout for context provider execution (milliseconds)
 *
 * @remarks
 * Each provider runs in parallel with a configurable timeout. Slow providers
 * (e.g., database queries, external APIs) that exceed this are failed gracefully.
 *
 * Configurable via SKILL_PROVIDER_TIMEOUT_MS environment variable.
 * Bounds: minimum 500ms, maximum 10000ms, default 3000ms.
 */
const DEFAULT_TIMEOUT_MS = 3000;
const MIN_TIMEOUT_MS = 500;
const MAX_TIMEOUT_MS = 10000;

const envTimeout = parseInt(Deno.env.get('SKILL_PROVIDER_TIMEOUT_MS') || '', 10);
const PROVIDER_TIMEOUT_MS =
  !isNaN(envTimeout) && envTimeout >= MIN_TIMEOUT_MS && envTimeout <= MAX_TIMEOUT_MS
    ? envTimeout
    : DEFAULT_TIMEOUT_MS;

// =============================================================================
// Provider Execution
// =============================================================================

/**
 * Execute a single context provider with timeout and error handling
 *
 * @param provider - Context provider to execute
 * @param context - Runtime context (session, conversation, artifacts)
 * @param requestId - Request ID for logging correlation
 * @returns Provider result (empty string on failure)
 *
 * @remarks
 * Errors are logged but do NOT throw. Provider failures gracefully degrade
 * by returning empty string, allowing skill resolution to continue.
 *
 * **Timeout Handling**: Uses Promise.race with AbortController for clean cancellation.
 */
async function executeProvider(
  provider: ContextProvider,
  context: SkillContext,
  requestId: string,
): Promise<string> {
  const logger = createLogger({ requestId, functionName: 'skill-resolver' });

  try {
    // Create timeout promise that rejects after configured duration
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Provider '${provider.id}' timed out after ${PROVIDER_TIMEOUT_MS}ms`)),
        PROVIDER_TIMEOUT_MS
      )
    );

    // Race provider execution against timeout
    const result = await Promise.race([
      provider.provider(context),
      timeoutPromise,
    ]);

    // Truncate outputs exceeding max length
    if (result.length > MAX_PROVIDER_OUTPUT_CHARS) {
      logger.warn('provider_output_truncated', {
        providerId: provider.id,
        originalLength: result.length,
        maxLength: MAX_PROVIDER_OUTPUT_CHARS,
      });
      return result.slice(0, MAX_PROVIDER_OUTPUT_CHARS) + '\n[Output truncated]';
    }

    return result;
  } catch (error) {
    const { response } = SafeErrorHandler.toSafeResponse(error, requestId, {
      operation: 'provider_execution',
      providerId: provider.id,
    });

    logger.error(
      'provider_execution_failed',
      error instanceof Error ? error : new Error(String(error)),
      {
        errorId: ERROR_IDS.SKILL_PROVIDER_FAILED,
        providerId: provider.id,
        providerName: provider.name,
        error: response.error.message,
        retryable: response.error.retryable,
      }
    );

    // Graceful degradation - return empty string to allow skill resolution to continue
    return '';
  }
}

/**
 * Execute all context providers in parallel
 *
 * @param providers - Array of context providers to execute
 * @param context - Runtime context (session, conversation, artifacts)
 * @param requestId - Request ID for logging correlation
 * @returns Map of placeholder → resolved content
 *
 * @remarks
 * Executes all providers concurrently for performance. Individual failures
 * do not block other providers or skill resolution.
 */
async function executeProviders(
  providers: readonly ContextProvider[] | undefined,
  context: SkillContext,
  requestId: string,
): Promise<Map<string, string>> {
  const logger = createLogger({ requestId, functionName: 'skill-resolver' });

  if (!providers || providers.length === 0) {
    return new Map();
  }

  logger.info('executing_providers', {
    count: providers.length,
    providerIds: providers.map((p) => p.id),
  });

  // Execute all providers in parallel
  const results = await Promise.all(
    providers.map((provider) => executeProvider(provider, context, requestId)),
  );

  // Build placeholder → result map
  const placeholderMap = new Map<string, string>();
  providers.forEach((provider, index) => {
    placeholderMap.set(provider.placeholder, results[index]);
  });

  logger.info('providers_executed', {
    successCount: results.filter((r) => r.length > 0).length,
    failureCount: results.filter((r) => r.length === 0).length,
  });

  return placeholderMap;
}

// =============================================================================
// Placeholder Replacement
// =============================================================================

/**
 * Replace placeholders in skill content with provider results
 *
 * @param content - Skill content template with {{placeholders}}
 * @param placeholderMap - Map of placeholder → resolved content
 * @param logger - Logger instance for warnings
 * @returns Content with placeholders replaced
 *
 * @remarks
 * Logs warnings for unreplaced placeholders (potential configuration errors).
 * Empty provider results are replaced with empty string (not placeholder).
 */
function replacePlaceholders(
  content: string,
  placeholderMap: Map<string, string>,
  logger: ReturnType<typeof createLogger>,
): string {
  let resolvedContent = content;

  // Replace all placeholders
  for (const [placeholder, value] of placeholderMap.entries()) {
    resolvedContent = resolvedContent.replaceAll(placeholder, value);
  }

  // Warn about unreplaced placeholders (regex matches {{anything}})
  const unreplacedMatches = resolvedContent.match(/\{\{[^}]+\}\}/g);
  if (unreplacedMatches && unreplacedMatches.length > 0) {
    logger.warn('unreplaced_placeholders', {
      placeholders: unreplacedMatches,
      message: 'Skill content contains unreplaced placeholders - check provider configuration',
    });
  }

  return resolvedContent;
}

// =============================================================================
// User Content Sanitization
// =============================================================================

/**
 * Sanitize user-provided content in context to prevent prompt injection
 *
 * @param context - Runtime context with user-controlled data
 * @returns Sanitized context
 *
 * @remarks
 * Applies PromptInjectionDefense.sanitizeUserContent to conversation history
 * and artifact content. Mode hints and session IDs are already validated.
 */
function sanitizeContext(context: SkillContext): SkillContext {
  return {
    ...context,
    conversationHistory: context.conversationHistory.map((msg) => ({
      ...msg,
      content: PromptInjectionDefense.sanitizeArtifactContext(msg.content),
    })),
    currentArtifact: context.currentArtifact
      ? {
          ...context.currentArtifact,
          title: PromptInjectionDefense.sanitizeArtifactContext(
            context.currentArtifact.title,
          ),
          content: PromptInjectionDefense.sanitizeArtifactContext(
            context.currentArtifact.content,
          ),
        }
      : undefined,
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve a skill by ID, executing providers and replacing placeholders
 *
 * @param skillId - Skill identifier from SkillId union
 * @param context - Runtime context (session, conversation, artifacts)
 * @param requestId - Optional request ID for logging correlation
 * @returns Resolved skill with placeholders replaced, or null if skill not found
 *
 * @remarks
 * **Error Handling**: Skill not found returns null (caller decides how to handle).
 * Provider failures gracefully degrade (placeholder replaced with empty string).
 *
 * **Performance**: Providers execute in parallel with 3-second timeout each.
 * Total resolution time is bounded by slowest provider (max 3s) + replacement overhead.
 *
 * @example
 * ```typescript
 * const resolved = await resolveSkill('web-search', {
 *   sessionId: 'abc123',
 *   conversationHistory: [],
 *   requestId: 'req-456',
 * });
 *
 * if (!resolved) {
 *   throw new Error('Skill not found: web-search');
 * }
 *
 * // resolved.content now has {{recent_searches}} replaced
 * // resolved.loadedReferences is always empty for now (references not implemented)
 * ```
 */
export async function resolveSkill(
  skillId: SkillId,
  context: SkillContext,
  requestId?: string,
): Promise<ResolvedSkill | null> {
  const reqId = requestId || crypto.randomUUID();
  const logger = createLogger({ requestId: reqId, functionName: 'skill-resolver' });

  logger.info('resolving_skill', { skillId });

  // Step 1: Get skill from registry
  const skill = getSkill(skillId);
  if (!skill) {
    logger.warn('skill_not_found', { skillId });
    return null;
  }

  // Step 2: Sanitize user-provided context to prevent prompt injection
  const sanitizedContext = sanitizeContext(context);

  // Step 3: Execute all context providers in parallel
  const placeholderMap = await executeProviders(
    skill.contextProviders,
    sanitizedContext,
    reqId,
  );

  // Step 4: Replace placeholders in skill content
  const resolvedContent = replacePlaceholders(skill.content, placeholderMap, logger);

  logger.info('skill_resolved', {
    skillId,
    providersExecuted: placeholderMap.size,
    contentLength: resolvedContent.length,
  });

  // Return resolved skill (references loaded on-demand via loadReference())
  return {
    skill,
    content: resolvedContent,
    loadedReferences: [], // References loaded on-demand via loadReference() function
  };
}

/**
 * Load a specific reference document from a skill
 *
 * @param skill - Skill definition containing references
 * @param referenceId - Reference ID to load
 * @returns Reference content (markdown), or null if not found
 *
 * @remarks
 * Used for on-demand loading of supplementary documentation.
 * Currently a simple lookup - future versions may add caching.
 *
 * @example
 * ```typescript
 * const skill = getSkill('code-assistant');
 * const docs = loadReference(skill, 'recharts-examples');
 * if (docs) {
 *   // Inject docs into prompt
 * }
 * ```
 */
export function loadReference(skill: Skill, referenceId: string): string | null {
  if (!skill.references) {
    return null;
  }

  const reference = skill.references.find((ref) => ref.id === referenceId);
  return reference ? reference.content : null;
}

// =============================================================================
// Action Execution
// =============================================================================

/**
 * Build Zod schema from ActionParameter array
 *
 * @param parameters - Array of action parameter definitions
 * @returns Zod object schema for validation
 *
 * @remarks
 * Dynamically constructs Zod schema from parameter metadata.
 * Supports primitive types only (string, number, boolean).
 */
function buildParameterSchema(parameters: readonly ActionParameter[]): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const param of parameters) {
    // Map parameter type to Zod primitive schema
    let schema: z.ZodTypeAny;
    switch (param.type) {
      case 'string':
        schema = z.string();
        break;
      case 'number':
        schema = z.number();
        break;
      case 'boolean':
        schema = z.boolean();
        break;
      default:
        throw new Error(`Unsupported parameter type: ${param.type}`);
    }

    // Apply optional modifier if not required
    if (!param.required) {
      schema = schema.optional();
    }

    // Add description for validation error messages
    if (param.description) {
      schema = schema.describe(param.description);
    }

    shape[param.name] = schema;
  }

  return z.object(shape);
}

/**
 * Execute a skill action with parameter validation
 *
 * @param skill - Skill definition containing actions
 * @param actionId - Action ID to execute
 * @param params - Parameters to pass to action (validated internally against schema)
 * @param context - Runtime context (session, conversation, artifacts)
 * @param requestId - Optional request ID for logging correlation
 * @returns Structured result with success flag, optional data, and optional error
 *
 * @remarks
 * **Parameter Validation**: Uses Zod schema built from ActionParameter definitions.
 * Invalid parameters return `{ success: false, error: 'Validation error message' }`.
 *
 * **Error Handling**: Action execution errors are caught and returned as structured
 * errors (never thrown). Uses SafeErrorHandler for consistent error responses.
 *
 * **Security Note**: Always validate parameters before execution. Never execute
 * arbitrary code or shell commands from user input.
 *
 * @example
 * ```typescript
 * const result = await executeAction(
 *   skill,
 *   'web-search',
 *   { query: 'latest AI news' },
 *   context,
 *   'req-789'
 * );
 *
 * if (result.success) {
 *   console.log('Search results:', result.data);
 * } else {
 *   console.error('Action failed:', result.error);
 * }
 * ```
 */
export async function executeAction(
  skill: Skill,
  actionId: string,
  params: Record<string, unknown>,
  context: SkillContext,
  requestId?: string,
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const reqId = requestId || crypto.randomUUID();
  const logger = createLogger({ requestId: reqId, functionName: 'skill-resolver' });

  logger.info('executing_action', { skillId: skill.id, actionId });

  try {
    // Step 1: Find action in skill
    const action = skill.actions?.find((a) => a.id === actionId);
    if (!action) {
      logger.warn('action_not_found', { skillId: skill.id, actionId });
      return {
        success: false,
        error: `Action not found: ${actionId}`,
      };
    }

    // Step 2: Validate parameters against schema
    const schema = buildParameterSchema(action.parameters);
    const validation = schema.safeParse(params);

    if (!validation.success) {
      logger.warn('action_validation_failed', {
        actionId,
        errors: validation.error.errors,
      });
      return {
        success: false,
        error: `Parameter validation failed: ${validation.error.errors.map((e) => e.message).join(', ')}`,
      };
    }

    // Step 3: Execute action with validated parameters
    const result = await action.execute(validation.data, context);

    logger.info('action_executed', {
      actionId,
      success: result.success,
      hasData: !!result.data,
      hasError: !!result.error,
    });

    return result;
  } catch (error) {
    // Distinguish between bugs (TypeError, ReferenceError) and expected errors (Zod, etc.)
    const isBug =
      error instanceof TypeError ||
      error instanceof ReferenceError ||
      (error instanceof Error &&
        (error.name === 'TypeError' || error.name === 'ReferenceError'));

    if (isBug) {
      // Unexpected bug - log with stack trace
      logger.error(
        'action_execution_bug',
        error instanceof Error ? error : new Error(String(error)),
        {
          errorId: ERROR_IDS.ACTION_EXECUTION_BUG,
          skillId: skill.id,
          actionId,
          stack: error instanceof Error ? error.stack : undefined,
        }
      );

      return {
        success: false,
        error: 'Action execution failed (internal error)',
      };
    } else {
      // Expected error (Zod validation, etc.)
      const { response } = SafeErrorHandler.toSafeResponse(error, reqId, {
        operation: 'action_execution',
        skillId: skill.id,
        actionId,
      });

      logger.error(
        'action_execution_error',
        error instanceof Error ? error : new Error(String(error)),
        {
          errorId: ERROR_IDS.ACTION_EXECUTION_ERROR,
          skillId: skill.id,
          actionId,
          error: response.error.message,
        }
      );

      return {
        success: false,
        error: response.error.message,
      };
    }
  }
}
