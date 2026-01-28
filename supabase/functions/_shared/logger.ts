/**
 * Structured Logging Utility
 *
 * Provides consistent, queryable JSON logs across all Edge Functions.
 * Supports correlation via requestId and includes contextual metadata.
 *
 * @module logger
 */

/**
 * Log severity levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log entry format
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log severity level */
  level: LogLevel;
  /** Human-readable message (use snake_case for event names) */
  message: string;
  /** Request correlation ID */
  requestId?: string;
  /** Authenticated user ID */
  userId?: string;
  /** Session ID for chat conversations */
  sessionId?: string;
  /** Additional structured data */
  data?: Record<string, unknown>;
  /** Error details (only for level=error) */
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger context for automatic field injection
 */
export interface LoggerContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  functionName?: string;
}

/**
 * Structured logger class with automatic context injection
 */
export class Logger {
  constructor(private readonly context: LoggerContext = {}) {}

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: Partial<LoggerContext>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  /**
   * Log debug-level message (development only)
   */
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  /**
   * Log info-level message (normal operations)
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  /**
   * Log warning-level message (recoverable issues)
   */
  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  /**
   * Log error-level message with error details
   */
  error(message: string, error: Error, data?: Record<string, unknown>): void {
    this.log('error', message, {
      ...data,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }

  /**
   * Internal log method that writes structured JSON
   */
  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...(data && { data })
    };

    // Separate error field for better querying
    if (data?.error) {
      entry.error = data.error as LogEntry['error'];
      delete entry.data?.error;
    }

    // Write to stdout as JSON (Supabase captures this)
    console.log(JSON.stringify(entry));
  }

  /**
   * Log request start with method and path
   */
  request(method: string, path?: string, data?: Record<string, unknown>): void {
    this.info('request_received', {
      method,
      path,
      ...data
    });
  }

  /**
   * Log request completion with duration and status
   */
  response(
    status: number,
    durationMs: number,
    data?: Record<string, unknown>
  ): void {
    this.info('request_completed', {
      status,
      durationMs,
      ...data
    });
  }

  /**
   * Log AI model invocation with token usage
   */
  aiCall(
    provider: string,
    model: string,
    data?: Record<string, unknown>
  ): void {
    this.info('ai_call', {
      provider,
      model,
      ...data
    });
  }

  /**
   * Log database operation
   */
  dbQuery(
    table: string,
    operation: string,
    durationMs?: number,
    data?: Record<string, unknown>
  ): void {
    this.debug('db_query', {
      table,
      operation,
      durationMs,
      ...data
    });
  }

  /**
   * Log rate limit check
   */
  rateLimit(
    exceeded: boolean,
    remaining: number,
    total: number,
    data?: Record<string, unknown>
  ): void {
    this.info('rate_limit_check', {
      exceeded,
      remaining,
      total,
      ...data
    });
  }

  /**
   * Log validation failure
   */
  validationError(field: string, reason: string, data?: Record<string, unknown>): void {
    this.warn('validation_error', {
      field,
      reason,
      ...data
    });
  }

  /**
   * Log external API call
   */
  externalApi(
    service: string,
    endpoint: string,
    status: number,
    durationMs: number,
    data?: Record<string, unknown>
  ): void {
    this.info('external_api_call', {
      service,
      endpoint,
      status,
      durationMs,
      ...data
    });
  }
}

/**
 * Create a logger instance with context
 */
export function createLogger(context: LoggerContext): Logger {
  return new Logger(context);
}

/**
 * Default logger without context (use createLogger for better observability)
 */
export const logger = new Logger();
