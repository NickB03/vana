/**
 * Safe Error Handler
 *
 * Sanitizes error messages before returning to clients.
 * Prevents information leakage through error responses.
 *
 * @security CWE-209 - Information Exposure Prevention
 */

// =============================================================================
// Types
// =============================================================================

export interface SafeErrorResponse {
  error: {
    type: string;
    message: string;
    requestId: string;
    retryable: boolean;
  };
}

// =============================================================================
// Error Classification
// =============================================================================

type ErrorCategory =
  | 'rate_limit'
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'tool_execution'
  | 'resource_exhaustion'
  | 'timeout'
  | 'internal';

interface ErrorMapping {
  pattern: RegExp | string;
  category: ErrorCategory;
  safeMessage: string;
  retryable: boolean;
  statusCode: number;
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // Rate limiting
  {
    pattern: /rate.?limit/i,
    category: 'rate_limit',
    safeMessage: 'Request limit exceeded. Please try again later.',
    retryable: true,
    statusCode: 429,
  },

  // Validation errors
  {
    pattern: /validation|invalid|required field/i,
    category: 'validation',
    safeMessage: 'Invalid request parameters.',
    retryable: false,
    statusCode: 400,
  },

  // Authentication
  {
    pattern: /auth|unauthorized|jwt|token expired/i,
    category: 'authentication',
    safeMessage: 'Authentication required or session expired.',
    retryable: false,
    statusCode: 401,
  },

  // Authorization
  {
    pattern: /forbidden|permission|not allowed/i,
    category: 'authorization',
    safeMessage: 'You do not have permission for this action.',
    retryable: false,
    statusCode: 403,
  },

  // Tool execution
  {
    pattern: /tool.?(execution|failed)|artifact|image.?generation/i,
    category: 'tool_execution',
    safeMessage: 'The requested operation could not be completed. Please try again.',
    retryable: true,
    statusCode: 500,
  },

  // Resource exhaustion - be specific to avoid false positives
  // Matches: "ResourceExhaustionError", "resource exhaustion", "max_calls", "max_time"
  // Does NOT match generic "resource" or "timeout" (handled separately)
  {
    pattern: /resource.?exhaustion|ResourceExhaustionError|max.?(calls|time)|limit.?exceeded.*max/i,
    category: 'resource_exhaustion',
    safeMessage: 'Request processing limit reached. Please simplify your request.',
    retryable: false,
    statusCode: 429,
  },

  // Timeout
  {
    pattern: /timeout|timed?.?out|deadline/i,
    category: 'timeout',
    safeMessage: 'Request took too long to process. Please try again.',
    retryable: true,
    statusCode: 504,
  },
];

// =============================================================================
// Safe Error Handler Implementation
// =============================================================================

export class SafeErrorHandler {

  /**
   * Convert any error to a safe response
   *
   * Logs full error server-side, returns sanitized message to client.
   */
  static toSafeResponse(
    error: unknown,
    requestId: string,
    context?: Record<string, unknown>
  ): { response: SafeErrorResponse; statusCode: number } {
    // Log full error server-side (never exposed to client)
    console.error(`[${requestId}] Error occurred:`, {
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      context,
    });

    // Classify error
    const classification = this.classifyError(error);

    return {
      response: {
        error: {
          type: classification.category,
          message: classification.safeMessage,
          requestId,
          retryable: classification.retryable,
        },
      },
      statusCode: classification.statusCode,
    };
  }

  /**
   * Classify error and determine safe response
   */
  private static classifyError(error: unknown): ErrorMapping {
    const errorMessage = error instanceof Error
      ? error.message
      : String(error);

    // Try to match known error patterns
    for (const mapping of ERROR_MAPPINGS) {
      const pattern = mapping.pattern instanceof RegExp
        ? mapping.pattern
        : new RegExp(mapping.pattern, 'i');

      if (pattern.test(errorMessage)) {
        return mapping;
      }
    }

    // Default: internal error (most restrictive message)
    return {
      pattern: '',
      category: 'internal',
      safeMessage: 'An unexpected error occurred. Please try again.',
      retryable: true,
      statusCode: 500,
    };
  }

  /**
   * Create error response suitable for SSE streaming
   */
  static toSSEError(
    error: unknown,
    requestId: string
  ): string {
    const { response } = this.toSafeResponse(error, requestId);

    return `event: error\ndata: ${JSON.stringify(response)}\n\n`;
  }

  /**
   * Wrap async function with safe error handling
   */
  static wrapAsync<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    requestId: string
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        const { response, statusCode } = this.toSafeResponse(error, requestId);
        throw new SafeError(response.error.message, statusCode, response);
      }
    }) as T;
  }
}

/**
 * Safe error that can be directly returned to client
 */
export class SafeError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly response: SafeErrorResponse
  ) {
    super(message);
    this.name = 'SafeError';
  }
}
