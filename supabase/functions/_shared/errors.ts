/**
 * Structured Error Types for LLM Operations
 *
 * Provides typed error classes for better error handling, retry logic,
 * and user-facing error messages throughout the LLM integration.
 *
 * @module errors
 */

/**
 * Base error properties shared across all LLM errors
 */
interface LLMErrorOptions {
  /** Whether this error is potentially retryable */
  retryable?: boolean;
  /** Optional cause for error chaining */
  cause?: Error;
}

/**
 * Error thrown when artifact parsing fails.
 * Occurs when the LLM response doesn't contain valid artifact XML
 * or when the extracted artifact fails validation.
 */
export class ArtifactParseError extends Error {
  /** The raw LLM response that failed to parse */
  public readonly rawResponse: string;
  /** Whether this error might succeed on retry (e.g., malformed response vs. fundamentally wrong) */
  public readonly retryable: boolean;

  constructor(message: string, rawResponse: string, retryable = true) {
    super(message);
    this.name = 'ArtifactParseError';
    this.rawResponse = rawResponse;
    this.retryable = retryable;

    // Maintains proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ArtifactParseError);
    }
  }
}

/**
 * Quota type indicating which resource limit was exceeded
 */
export type QuotaType = 'rate' | 'token' | 'cost';

/**
 * Error thrown when LLM API quota is exceeded.
 * This includes rate limits (requests per minute), token limits,
 * and cost/budget limits from OpenRouter or Gemini.
 */
export class LLMQuotaExceededError extends Error {
  /** When the quota will reset and requests can be made again */
  public readonly resetAt: Date;
  /** Type of quota that was exceeded */
  public readonly quotaType: QuotaType;
  /** Whether this error might succeed on retry (always true - wait and retry) */
  public readonly retryable = true;

  constructor(resetAt: Date, quotaType: QuotaType) {
    const timeUntilReset = Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
    const message = `LLM ${quotaType} quota exceeded. Resets in ${timeUntilReset}s at ${resetAt.toISOString()}`;

    super(message);
    this.name = 'LLMQuotaExceededError';
    this.resetAt = resetAt;
    this.quotaType = quotaType;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMQuotaExceededError);
    }
  }

  /**
   * Get the number of milliseconds to wait before retrying.
   * Adds a small buffer to avoid hitting the limit immediately after reset.
   */
  getRetryDelayMs(): number {
    const delayMs = this.resetAt.getTime() - Date.now();
    return Math.max(0, delayMs + 1000); // Add 1s buffer
  }
}

/**
 * Error thrown when an LLM operation times out.
 * Can occur during network requests or when streaming takes too long.
 */
export class LLMTimeoutError extends Error {
  /** The timeout duration that was exceeded (in milliseconds) */
  public readonly timeoutMs: number;
  /** The operation that timed out (e.g., 'callGemini', 'streaming', 'tool_execution') */
  public readonly operation: string;
  /** Whether this error might succeed on retry (true - timeout could be transient) */
  public readonly retryable = true;

  constructor(timeoutMs: number, operation: string) {
    const message = `LLM operation '${operation}' timed out after ${timeoutMs}ms`;

    super(message);
    this.name = 'LLMTimeoutError';
    this.timeoutMs = timeoutMs;
    this.operation = operation;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMTimeoutError);
    }
  }
}

/**
 * Error thrown when circuit breaker is open and rejecting requests.
 * Indicates the underlying service is unhealthy and we're failing fast.
 */
export class CircuitBreakerOpenError extends Error {
  /** When the circuit breaker will transition to half-open state */
  public readonly resetAt: Date;
  /** Not directly retryable - must wait for circuit to close */
  public readonly retryable = false;

  constructor(resetAt: Date) {
    const timeUntilReset = Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
    const message = `Circuit breaker is OPEN. Service unavailable. Will retry in ${timeUntilReset}s`;

    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.resetAt = resetAt;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CircuitBreakerOpenError);
    }
  }

  /**
   * Get the number of milliseconds until circuit breaker transitions to half-open.
   */
  getTimeUntilHalfOpenMs(): number {
    return Math.max(0, this.resetAt.getTime() - Date.now());
  }
}

/**
 * Error thrown when structured output validation fails.
 * Occurs when JSON schema validation or Zod parsing fails on LLM response.
 */
export class StructuredOutputValidationError extends Error {
  /** The raw response that failed validation */
  public readonly rawResponse: string;
  /** Validation error details */
  public readonly validationErrors: string[];
  /** Usually retryable - LLM may produce valid output on retry */
  public readonly retryable = true;

  constructor(message: string, rawResponse: string, validationErrors: string[] = []) {
    super(message);
    this.name = 'StructuredOutputValidationError';
    this.rawResponse = rawResponse;
    this.validationErrors = validationErrors;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StructuredOutputValidationError);
    }
  }
}

/**
 * Type guard to check if an error is retryable.
 *
 * Use this to determine if an operation should be retried after failure.
 * Non-retryable errors should fail immediately or trigger fallback logic.
 *
 * @param error - The error to check
 * @returns True if the error has a retryable property set to true
 *
 * @example
 * ```typescript
 * try {
 *   await callGemini(messages);
 * } catch (error) {
 *   if (isRetryableError(error)) {
 *     // Wait and retry
 *     await delay(1000);
 *     return callGemini(messages);
 *   } else {
 *     // Use fallback or throw
 *     throw error;
 *   }
 * }
 * ```
 */
export function isRetryableError(error: unknown): boolean {
  if (error === null || error === undefined) {
    return false;
  }

  // Check for our typed errors with retryable property
  if (typeof error === 'object' && 'retryable' in error) {
    return Boolean((error as { retryable: unknown }).retryable);
  }

  // Standard network errors are usually retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network/connection errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('socket') ||
      message.includes('timeout')
    ) {
      return true;
    }

    // Rate limiting (might be temporary)
    if (message.includes('rate limit') || message.includes('429')) {
      return true;
    }

    // Service unavailable (might recover)
    if (message.includes('503') || message.includes('service unavailable')) {
      return true;
    }
  }

  return false;
}

/**
 * Type guard to check if error is one of our custom LLM errors.
 *
 * @param error - The error to check
 * @returns True if error is an instance of any custom LLM error class
 */
export function isLLMError(error: unknown): error is
  | ArtifactParseError
  | LLMQuotaExceededError
  | LLMTimeoutError
  | CircuitBreakerOpenError
  | StructuredOutputValidationError {
  return (
    error instanceof ArtifactParseError ||
    error instanceof LLMQuotaExceededError ||
    error instanceof LLMTimeoutError ||
    error instanceof CircuitBreakerOpenError ||
    error instanceof StructuredOutputValidationError
  );
}

/**
 * Extract a user-friendly error message from any error type.
 *
 * @param error - The error to extract message from
 * @returns A user-friendly error message string
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ArtifactParseError) {
    return 'Failed to generate artifact. The AI response was incomplete or invalid.';
  }

  if (error instanceof LLMQuotaExceededError) {
    const seconds = Math.ceil(error.getRetryDelayMs() / 1000);
    return `Rate limit reached. Please try again in ${seconds} seconds.`;
  }

  if (error instanceof LLMTimeoutError) {
    return `Request timed out (${error.operation}). Please try again.`;
  }

  if (error instanceof CircuitBreakerOpenError) {
    return 'Service is temporarily unavailable due to high error rate. Please try again shortly.';
  }

  if (error instanceof StructuredOutputValidationError) {
    return 'The AI response was in an unexpected format. Please try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
