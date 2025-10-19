/**
 * ADK Event Validator - Phase 3 Frontend Integration
 *
 * Optional runtime validation for ADK events.
 * Only enabled in development mode for debugging.
 *
 * Performance Target: <2ms per validation
 *
 * Usage:
 * ```typescript
 * import { validateAdkEvent } from '@/lib/streaming/adk/validator';
 *
 * const validation = validateAdkEvent(event);
 * if (!validation.valid) {
 *   console.warn('Invalid event:', validation.errors);
 * }
 * ```
 */

import type { AdkEvent } from './types';

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate ADK Event structure
 *
 * Performs comprehensive validation of required and optional fields.
 * Only use in development mode - skip in production for performance.
 *
 * @param event - Event to validate
 * @returns Validation result with errors array
 */
export function validateAdkEvent(event: unknown): ValidationResult {
  const errors: string[] = [];

  // Type check
  if (typeof event !== 'object' || event === null) {
    errors.push('Event must be a non-null object');
    return { valid: false, errors };
  }

  const evt = event as Partial<AdkEvent>;

  // Required fields
  if (!evt.id || typeof evt.id !== 'string') {
    errors.push('Missing or invalid "id" field (required string)');
  }

  if (!evt.author || typeof evt.author !== 'string') {
    errors.push('Missing or invalid "author" field (required string)');
  }

  if (!evt.invocationId || typeof evt.invocationId !== 'string') {
    errors.push('Missing or invalid "invocationId" field (required string)');
  }

  if (typeof evt.timestamp !== 'number') {
    errors.push('Missing or invalid "timestamp" field (required number)');
  }

  // Optional content validation
  if (evt.content !== undefined) {
    if (typeof evt.content !== 'object' || evt.content === null) {
      errors.push('Invalid "content" field (must be object if present)');
    } else if (evt.content.parts !== undefined) {
      if (!Array.isArray(evt.content.parts)) {
        errors.push('Invalid "content.parts" field (must be array if present)');
      } else {
        // Validate each part
        evt.content.parts.forEach((part, index) => {
          const partErrors = validatePart(part, index);
          errors.push(...partErrors);
        });
      }
    }
  }

  // Optional actions validation
  if (evt.actions !== undefined) {
    if (typeof evt.actions !== 'object' || evt.actions === null) {
      errors.push('Invalid "actions" field (must be object if present)');
    }
  }

  // Optional longRunningToolIds validation
  if (evt.longRunningToolIds !== undefined) {
    if (!Array.isArray(evt.longRunningToolIds)) {
      errors.push('Invalid "longRunningToolIds" field (must be array if present)');
    }
  }

  // Optional branch validation
  if (evt.branch !== undefined && typeof evt.branch !== 'string') {
    errors.push('Invalid "branch" field (must be string if present)');
  }

  // Optional partial validation
  if (evt.partial !== undefined && typeof evt.partial !== 'boolean') {
    errors.push('Invalid "partial" field (must be boolean if present)');
  }

  // Optional turnComplete validation
  if (evt.turnComplete !== undefined && typeof evt.turnComplete !== 'boolean') {
    errors.push('Invalid "turnComplete" field (must be boolean if present)');
  }

  // Optional error fields validation
  if (evt.errorCode !== undefined && typeof evt.errorCode !== 'string') {
    errors.push('Invalid "errorCode" field (must be string if present)');
  }

  if (evt.errorMessage !== undefined && typeof evt.errorMessage !== 'string') {
    errors.push('Invalid "errorMessage" field (must be string if present)');
  }

  // Optional groundingMetadata validation
  if (evt.groundingMetadata !== undefined) {
    if (typeof evt.groundingMetadata !== 'object' || evt.groundingMetadata === null) {
      errors.push('Invalid "groundingMetadata" field (must be object if present)');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a single ADK part
 *
 * @param part - Part to validate
 * @param index - Part index for error messages
 * @returns Array of error messages
 */
function validatePart(part: unknown, index: number): string[] {
  const errors: string[] = [];

  if (typeof part !== 'object' || part === null) {
    errors.push(`Part[${index}]: Must be a non-null object`);
    return errors;
  }

  const p = part as Record<string, unknown>;

  // Must have exactly one of: text, functionCall, functionResponse, codeExecutionResult
  const hasText = 'text' in p;
  const hasFunctionCall = 'functionCall' in p;
  const hasFunctionResponse = 'functionResponse' in p;
  const hasCodeExecutionResult = 'codeExecutionResult' in p;

  const typeCount = [hasText, hasFunctionCall, hasFunctionResponse, hasCodeExecutionResult].filter(Boolean).length;

  if (typeCount === 0) {
    errors.push(`Part[${index}]: Must have at least one of: text, functionCall, functionResponse, codeExecutionResult`);
  }

  // Validate text part
  if (hasText) {
    if (typeof p.text !== 'string') {
      errors.push(`Part[${index}]: "text" field must be string`);
    }

    if ('thought' in p && typeof p.thought !== 'boolean') {
      errors.push(`Part[${index}]: "thought" field must be boolean if present`);
    }
  }

  // Validate function call part
  if (hasFunctionCall) {
    const fc = p.functionCall as Record<string, unknown>;

    if (typeof fc !== 'object' || fc === null) {
      errors.push(`Part[${index}]: "functionCall" must be object`);
    } else {
      if (typeof fc.name !== 'string') {
        errors.push(`Part[${index}]: "functionCall.name" must be string`);
      }

      if (typeof fc.args !== 'object' || fc.args === null) {
        errors.push(`Part[${index}]: "functionCall.args" must be object`);
      }

      if (fc.id !== undefined && typeof fc.id !== 'string') {
        errors.push(`Part[${index}]: "functionCall.id" must be string if present`);
      }
    }
  }

  // Validate function response part
  if (hasFunctionResponse) {
    const fr = p.functionResponse as Record<string, unknown>;

    if (typeof fr !== 'object' || fr === null) {
      errors.push(`Part[${index}]: "functionResponse" must be object`);
    } else {
      if (typeof fr.name !== 'string') {
        errors.push(`Part[${index}]: "functionResponse.name" must be string`);
      }

      if (typeof fr.response !== 'object' || fr.response === null) {
        errors.push(`Part[${index}]: "functionResponse.response" must be object`);
      }

      if (fr.id !== undefined && typeof fr.id !== 'string') {
        errors.push(`Part[${index}]: "functionResponse.id" must be string if present`);
      }
    }
  }

  // Validate code execution result part
  if (hasCodeExecutionResult) {
    const cer = p.codeExecutionResult as Record<string, unknown>;

    if (typeof cer !== 'object' || cer === null) {
      errors.push(`Part[${index}]: "codeExecutionResult" must be object`);
    } else {
      if (typeof cer.outcome !== 'string') {
        errors.push(`Part[${index}]: "codeExecutionResult.outcome" must be string`);
      }

      if (cer.output !== undefined && typeof cer.output !== 'string') {
        errors.push(`Part[${index}]: "codeExecutionResult.output" must be string if present`);
      }
    }
  }

  return errors;
}

/**
 * Quick validation for performance-critical paths
 *
 * Only checks required fields, skips deep validation.
 *
 * @param event - Event to validate
 * @returns True if event has required fields
 */
export function quickValidateAdkEvent(event: unknown): boolean {
  if (typeof event !== 'object' || event === null) {
    return false;
  }

  const evt = event as Partial<AdkEvent>;

  return !!(
    evt.id &&
    typeof evt.id === 'string' &&
    evt.author &&
    typeof evt.author === 'string' &&
    evt.invocationId &&
    typeof evt.invocationId === 'string' &&
    typeof evt.timestamp === 'number'
  );
}

/**
 * Check if validation should be enabled
 *
 * Only enable in development mode to avoid performance overhead.
 *
 * @returns True if validation should run
 */
export function shouldValidate(): boolean {
  // Check if we're in development mode
  return process.env.NODE_ENV === 'development';
}

/**
 * Conditionally validate event (dev mode only)
 *
 * Convenience function that only validates in development.
 *
 * @param event - Event to validate
 * @returns Validation result (always valid in production)
 */
export function conditionalValidate(event: unknown): ValidationResult {
  if (!shouldValidate()) {
    return { valid: true, errors: [] };
  }

  return validateAdkEvent(event);
}
