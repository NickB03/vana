/**
 * Tool Parameter Validator
 *
 * Validates and sanitizes all tool parameters before execution.
 * Prevents injection attacks, type confusion, and invalid data.
 *
 * SECURITY FIX: Added prototype pollution protection and object freezing.
 * SECURITY FIX: Added extra property rejection to prevent parameter smuggling.
 *
 * @security CWE-20 - Input Validation
 */

// =============================================================================
// Sanitization Utility
// =============================================================================

/**
 * Sanitize user input to prevent XSS attacks
 *
 * Encodes HTML entities to prevent script injection while preserving user content.
 *
 * @security CWE-79: Cross-Site Scripting Prevention
 */
function sanitizeContent(content: string): string {
  // SECURITY FIX: Return empty string for non-string inputs (type safety)
  if (!content || typeof content !== 'string') {
    return '';
  }

  return content
    .replace(/&/g, '&amp;')    // Must be first to avoid double-encoding
    .replace(/</g, '&lt;')     // Prevent opening tags
    .replace(/>/g, '&gt;')     // Prevent closing tags
    .replace(/"/g, '&quot;')   // Prevent attribute injection
    .replace(/'/g, '&#x27;')   // Prevent single-quote attribute injection
    .replace(/\//g, '&#x2F;'); // Prevent closing tag injection
}

/**
 * Normalize user input for API transmission to GLM models.
 * NOT for HTML rendering - preserves all visible characters.
 *
 * Security is handled separately by:
 * - PromptInjectionDefense (prompt injection)
 * - ReactMarkdown (XSS in chat)
 * - Iframe sandbox (XSS in artifacts)
 * - artifact-validator (code validation)
 *
 * This function only normalizes text for consistent processing:
 * - Standardizes line endings (CRLF/CR → LF)
 * - Removes invisible control characters
 * - Removes zero-width Unicode characters
 * - Preserves all visible user intent including JSX, quotes, slashes
 */
export function normalizePromptForApi(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/\r\n/g, '\n')           // Normalize Windows line endings
    .replace(/\r/g, '\n')             // Handle standalone CR
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')  // Strip ASCII control chars (keep TAB \x09, LF \x0A)
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');  // Strip zero-width and line/paragraph separators
}

// =============================================================================
// Types
// =============================================================================

export type ArtifactType = 'react' | 'html' | 'svg' | 'code' | 'mermaid' | 'markdown';
export type AspectRatio = '1:1' | '16:9' | '9:16';

export interface ValidatedArtifactParams {
  readonly type: ArtifactType;
  readonly prompt: string;
}

export interface ValidatedImageParams {
  readonly prompt: string;
  readonly aspectRatio: AspectRatio;
}

export interface ValidatedSearchParams {
  readonly query: string;
}

// =============================================================================
// Validation Errors
// =============================================================================

export class ToolValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string,
    public readonly code: string = 'INVALID_PARAMETER'
  ) {
    super(`Invalid ${field}: ${reason}`);
    this.name = 'ToolValidationError';
  }
}

// =============================================================================
// Security Utilities
// =============================================================================

/**
 * SECURITY FIX: Prototype pollution protection
 *
 * Checks if an object contains dangerous prototype pollution keys.
 * Attackers can try to inject __proto__, constructor, or prototype
 * to modify object behavior.
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

function checkPrototypePollution(obj: Record<string, unknown>, path: string = ''): void {
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.includes(key)) {
      throw new ToolValidationError(
        path ? `${path}.${key}` : key,
        'Potentially dangerous property name',
        'PROTOTYPE_POLLUTION'
      );
    }
    // Recursively check nested objects
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      checkPrototypePollution(value as Record<string, unknown>, path ? `${path}.${key}` : key);
    }
  }
}

/**
 * SECURITY FIX: Validate that object only contains expected keys
 *
 * Prevents parameter smuggling where extra fields are passed to
 * downstream functions that might use them unexpectedly.
 */
function validateOnlyExpectedKeys(
  obj: Record<string, unknown>,
  expectedKeys: readonly string[],
  optionalKeys: readonly string[] = []
): void {
  const allAllowedKeys = [...expectedKeys, ...optionalKeys];
  const actualKeys = Object.keys(obj);

  for (const key of actualKeys) {
    if (!allAllowedKeys.includes(key)) {
      throw new ToolValidationError(
        key,
        `Unexpected parameter. Allowed: ${allAllowedKeys.join(', ')}`,
        'UNEXPECTED_PROPERTY'
      );
    }
  }
}

// =============================================================================
// Validator Implementation
// =============================================================================

/**
 * Normalize artifact type from MIME format to short form
 *
 * GLM-4.7 sometimes outputs full MIME types like "application/vnd.ant.react"
 * instead of short forms like "react". This function normalizes both formats.
 */
function normalizeArtifactType(type: string): string {
  // Map of full MIME types to short forms
  const mimeToShort: Record<string, ArtifactType> = {
    'application/vnd.ant.react': 'react',
    'application/vnd.ant.html': 'html',
    'application/vnd.ant.svg': 'svg',
    'application/vnd.ant.code': 'code',
    'application/vnd.ant.mermaid': 'mermaid',
    'application/vnd.ant.markdown': 'markdown',
    // Also handle potential variations
    'text/html': 'html',
    'image/svg+xml': 'svg',
    'text/markdown': 'markdown',
  };

  // Check if it's a MIME type
  const normalized = mimeToShort[type.toLowerCase()];
  if (normalized) {
    return normalized;
  }

  // Return as-is (already short form or invalid)
  return type.toLowerCase();
}

export class ToolParameterValidator {

  // Valid artifact types (strict allowlist)
  private static readonly VALID_ARTIFACT_TYPES: readonly ArtifactType[] = [
    'react', 'html', 'svg', 'code', 'mermaid', 'markdown'
  ] as const;

  // Valid aspect ratios (strict allowlist)
  private static readonly VALID_ASPECT_RATIOS: readonly AspectRatio[] = [
    '1:1', '16:9', '9:16'
  ] as const;

  // Maximum prompt lengths per tool
  private static readonly MAX_ARTIFACT_PROMPT = 10000;
  private static readonly MAX_IMAGE_PROMPT = 2000;
  private static readonly MAX_SEARCH_QUERY = 500;

  // Expected keys per tool (for extra property validation)
  private static readonly ARTIFACT_EXPECTED_KEYS = ['type', 'prompt'] as const;
  private static readonly IMAGE_EXPECTED_KEYS = ['prompt'] as const;
  private static readonly IMAGE_OPTIONAL_KEYS = ['aspectRatio'] as const;
  private static readonly SEARCH_EXPECTED_KEYS = ['query'] as const;

  /**
   * Validate artifact tool parameters
   *
   * SECURITY FIX: Checks for prototype pollution and rejects extra properties.
   * Returns a frozen object to prevent modification after validation.
   *
   * @throws ToolValidationError if validation fails
   */
  static validateArtifactParams(args: unknown): ValidatedArtifactParams {
    // Type guard: must be object
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw new ToolValidationError('arguments', 'Must be a non-null object', 'TYPE_ERROR');
    }

    const params = args as Record<string, unknown>;

    // SECURITY FIX: Check for prototype pollution attempts
    checkPrototypePollution(params);

    // SECURITY FIX: Reject unexpected properties
    validateOnlyExpectedKeys(params, this.ARTIFACT_EXPECTED_KEYS);

    // Validate 'type' field
    const rawType = params.type;
    if (rawType === undefined || rawType === null) {
      throw new ToolValidationError('type', 'Required field missing', 'REQUIRED');
    }
    if (typeof rawType !== 'string') {
      throw new ToolValidationError('type', 'Must be a string', 'TYPE_ERROR');
    }

    // GLM-4.7 FIX: Normalize MIME types to short form
    // e.g., "application/vnd.ant.react" -> "react"
    const type = normalizeArtifactType(rawType);

    if (!this.VALID_ARTIFACT_TYPES.includes(type as ArtifactType)) {
      throw new ToolValidationError(
        'type',
        `Must be one of: ${this.VALID_ARTIFACT_TYPES.join(', ')} (received: ${rawType})`,
        'INVALID_ENUM'
      );
    }

    // Validate 'prompt' field
    const prompt = params.prompt;
    if (prompt === undefined || prompt === null) {
      throw new ToolValidationError('prompt', 'Required field missing', 'REQUIRED');
    }
    if (typeof prompt !== 'string') {
      throw new ToolValidationError('prompt', 'Must be a string', 'TYPE_ERROR');
    }

    // Normalize prompt for API transmission (preserves visible characters)
    const normalizedPrompt = normalizePromptForApi(prompt);
    if (normalizedPrompt.trim().length === 0) {
      throw new ToolValidationError('prompt', 'Cannot be empty', 'EMPTY');
    }
    if (normalizedPrompt.length > this.MAX_ARTIFACT_PROMPT) {
      throw new ToolValidationError(
        'prompt',
        `Maximum ${this.MAX_ARTIFACT_PROMPT} characters allowed`,
        'TOO_LONG'
      );
    }

    // SECURITY FIX: Return frozen object to prevent post-validation modification
    return Object.freeze({
      type: type as ArtifactType,
      prompt: normalizedPrompt
    });
  }

  /**
   * Validate image tool parameters
   *
   * SECURITY FIX: Checks for prototype pollution and rejects extra properties.
   * Returns a frozen object to prevent modification after validation.
   *
   * @throws ToolValidationError if validation fails
   */
  static validateImageParams(args: unknown): ValidatedImageParams {
    // Type guard: must be object
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw new ToolValidationError('arguments', 'Must be a non-null object', 'TYPE_ERROR');
    }

    const params = args as Record<string, unknown>;

    // SECURITY FIX: Check for prototype pollution attempts
    checkPrototypePollution(params);

    // SECURITY FIX: Reject unexpected properties
    validateOnlyExpectedKeys(params, this.IMAGE_EXPECTED_KEYS, this.IMAGE_OPTIONAL_KEYS);

    // Validate 'prompt' field (required)
    const prompt = params.prompt;
    if (prompt === undefined || prompt === null) {
      throw new ToolValidationError('prompt', 'Required field missing', 'REQUIRED');
    }
    if (typeof prompt !== 'string') {
      throw new ToolValidationError('prompt', 'Must be a string', 'TYPE_ERROR');
    }

    // Normalize prompt for API transmission (preserves visible characters)
    const normalizedPrompt = normalizePromptForApi(prompt);
    if (normalizedPrompt.trim().length === 0) {
      throw new ToolValidationError('prompt', 'Cannot be empty', 'EMPTY');
    }
    if (normalizedPrompt.length > this.MAX_IMAGE_PROMPT) {
      throw new ToolValidationError(
        'prompt',
        `Maximum ${this.MAX_IMAGE_PROMPT} characters allowed`,
        'TOO_LONG'
      );
    }

    // Validate 'aspectRatio' field (optional, defaults to '1:1')
    let aspectRatio: AspectRatio = '1:1';
    if (params.aspectRatio !== undefined && params.aspectRatio !== null) {
      if (typeof params.aspectRatio !== 'string') {
        throw new ToolValidationError('aspectRatio', 'Must be a string', 'TYPE_ERROR');
      }
      if (!this.VALID_ASPECT_RATIOS.includes(params.aspectRatio as AspectRatio)) {
        throw new ToolValidationError(
          'aspectRatio',
          `Must be one of: ${this.VALID_ASPECT_RATIOS.join(', ')}`,
          'INVALID_ENUM'
        );
      }
      aspectRatio = params.aspectRatio as AspectRatio;
    }

    // SECURITY FIX: Return frozen object to prevent post-validation modification
    return Object.freeze({
      prompt: normalizedPrompt,
      aspectRatio
    });
  }

  /**
   * Validate search tool parameters
   *
   * SECURITY FIX: Checks for prototype pollution and rejects extra properties.
   * Returns a frozen object to prevent modification after validation.
   *
   * @throws ToolValidationError if validation fails
   */
  static validateSearchParams(args: unknown): ValidatedSearchParams {
    // Type guard: must be object
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
      throw new ToolValidationError('arguments', 'Must be a non-null object', 'TYPE_ERROR');
    }

    const params = args as Record<string, unknown>;

    // SECURITY FIX: Check for prototype pollution attempts
    checkPrototypePollution(params);

    // SECURITY FIX: Reject unexpected properties
    validateOnlyExpectedKeys(params, this.SEARCH_EXPECTED_KEYS);

    // Validate 'query' field
    const query = params.query;
    if (query === undefined || query === null) {
      throw new ToolValidationError('query', 'Required field missing', 'REQUIRED');
    }
    if (typeof query !== 'string') {
      throw new ToolValidationError('query', 'Must be a string', 'TYPE_ERROR');
    }

    // Normalize query for API transmission (preserves visible characters)
    const normalizedQuery = normalizePromptForApi(query);
    if (normalizedQuery.trim().length === 0) {
      throw new ToolValidationError('query', 'Cannot be empty', 'EMPTY');
    }
    if (normalizedQuery.length > this.MAX_SEARCH_QUERY) {
      throw new ToolValidationError(
        'query',
        `Maximum ${this.MAX_SEARCH_QUERY} characters allowed`,
        'TOO_LONG'
      );
    }

    // SECURITY FIX: Return frozen object to prevent post-validation modification
    return Object.freeze({ query: normalizedQuery });
  }

  /**
   * Generic validator that routes to specific validators
   */
  static validate(
    toolName: string,
    args: unknown
  ): ValidatedArtifactParams | ValidatedImageParams | ValidatedSearchParams {
    switch (toolName) {
      case 'generate_artifact':
        return this.validateArtifactParams(args);
      case 'generate_image':
        return this.validateImageParams(args);
      case 'browser.search':
        return this.validateSearchParams(args);
      default:
        throw new ToolValidationError('toolName', `Unknown tool: ${toolName}`, 'UNKNOWN_TOOL');
    }
  }
}
