/**
 * Artifact Validator Stub
 *
 * This file contains minimal stubs for the deleted artifact validation system.
 * The complex validation logic was removed in the vanilla Sandpack refactor since
 * Gemini 3 Flash generates cleaner code than GLM and doesn't need server-side fixes.
 *
 * Sandpack handles all validation/error display in the browser.
 */

export interface ValidationResult {
  valid: boolean;
  issues: string[];
}

export interface AutoFixResult {
  fixed: string;
  changes: string[];
}

/**
 * Validates artifact code.
 * Stub: Always returns valid since Sandpack handles validation in the browser.
 */
export function validateArtifactCode(_code: string, _type: string): ValidationResult {
  return { valid: true, issues: [] };
}

/**
 * Auto-fixes artifact code issues.
 * Stub: Returns code unchanged since Gemini 3 Flash generates clean code.
 */
export function autoFixArtifactCode(code: string): AutoFixResult {
  return { fixed: code, changes: [] };
}
