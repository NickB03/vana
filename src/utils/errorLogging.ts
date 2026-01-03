/**
 * Error logging utilities for production error tracking and debugging
 *
 * This provides a unified interface for error logging across the application,
 * integrating with Sentry (production), Statsig (analytics), and console (dev).
 */

interface ErrorContext {
  errorId: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

// Backwards-compatible interface for simpler usage
export interface LogErrorOptions {
  /** Unique identifier for the error type */
  errorId: string;
  /** Additional context about the error */
  metadata?: Record<string, unknown>;
}

/**
 * Log an error to Sentry and console
 * Use this for unexpected errors that should be tracked in production
 *
 * @example
 * ```typescript
 * logError(new Error('Failed to reload'), {
 *   errorId: 'CACHE_BUST_RELOAD_FAILED',
 *   metadata: { href: window.location.href }
 * });
 * ```
 */
export function logError(
  error: Error | string,
  context: ErrorContext | LogErrorOptions
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  // TODO: Integrate with Sentry when available
  // Sentry.captureException(error, {
  //   tags: { errorId: context.errorId },
  //   user: context.userId ? { id: context.userId } : undefined,
  //   contexts: {
  //     session: { sessionId: context.sessionId },
  //     metadata: context.metadata,
  //   },
  // });

  // Console logging for development and as fallback
  const fullContext = context as ErrorContext;
  console.error(`[${context.errorId}]`, errorMessage, {
    stack: errorStack,
    sessionId: fullContext.sessionId,
    userId: fullContext.userId,
    ...context.metadata,
  });
}

/**
 * Log debugging information (not errors)
 * Use this for non-error debugging output
 */
export function logForDebugging(message: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    console.log(`[DEBUG] ${message}`, data);
  }
}

/**
 * Log events for analytics
 * Use this for user actions and important state changes
 */
export function logEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  // TODO: Integrate with Statsig when available
  // statsig.logEvent(eventName, properties);

  if (import.meta.env.DEV) {
    console.log(`[EVENT] ${eventName}`, properties);
  }
}
