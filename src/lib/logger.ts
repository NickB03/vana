/**
 * Logging utilities for Vana
 * Provides structured logging with proper levels and environment-aware output
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private isDevelopment: boolean;
  private isTest: boolean;
  private enableDebug: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isTest = process.env.NODE_ENV === 'test';
    this.enableDebug = process.env.NEXT_PUBLIC_ENABLE_DEBUG_MODE === 'true' || this.isDevelopment;
  }

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    const prefix = `[${timestamp}] ${level.toUpperCase()}`;

    let formatted = `${prefix}: ${message}`;

    if (context && Object.keys(context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }

    if (error) {
      formatted += ` | Error: ${error.message}`;
      if (this.isDevelopment && error.stack) {
        formatted += `\nStack: ${error.stack}`;
      }
    }

    return formatted;
  }

  private createEntry(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    };
  }

  private shouldLog(level: LogLevel): boolean {
    // Don't log anything in test environment unless explicitly enabled
    if (this.isTest && !process.env.ENABLE_TEST_LOGGING) {
      return false;
    }

    // Debug logs only in development or when debug is explicitly enabled
    if (level === 'debug' && !this.enableDebug) {
      return false;
    }

    return true;
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;

    const entry = this.createEntry('debug', message, context);
    console.debug(this.formatMessage(entry));
  }

  info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;

    const entry = this.createEntry('info', message, context);
    console.info(this.formatMessage(entry));
  }

  warn(message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.createEntry('warn', message, context, error);
    console.warn(this.formatMessage(entry));
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog('error')) return;

    const entry = this.createEntry('error', message, context, error);
    console.error(this.formatMessage(entry));
  }

  // Specialized methods for common use cases
  apiRequest(method: string, url: string, context?: Record<string, any>): void {
    this.debug(`API Request: ${method} ${url}`, context);
  }

  apiResponse(method: string, url: string, status: number, context?: Record<string, any>): void {
    const level = status >= 400 ? 'warn' : 'debug';
    this[level](`API Response: ${method} ${url} - ${status}`, context);
  }

  performance(action: string, duration: number, context?: Record<string, any>): void {
    this.info(`Performance: ${action} took ${duration}ms`, context);
  }

  userAction(action: string, context?: Record<string, any>): void {
    this.info(`User Action: ${action}`, context);
  }

  // Test-specific logging
  test(message: string, context?: Record<string, any>): void {
    if (this.isTest && process.env.ENABLE_TEST_LOGGING) {
      const entry = this.createEntry('info', `[TEST] ${message}`, context);
      console.log(this.formatMessage(entry));
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export specific loggers for different modules
export const createModuleLogger = (moduleName: string) => {
  return {
    debug: (message: string, context?: Record<string, any>) =>
      logger.debug(`[${moduleName}] ${message}`, context),
    info: (message: string, context?: Record<string, any>) =>
      logger.info(`[${moduleName}] ${message}`, context),
    warn: (message: string, context?: Record<string, any>, error?: Error) =>
      logger.warn(`[${moduleName}] ${message}`, context, error),
    error: (message: string, context?: Record<string, any>, error?: Error) =>
      logger.error(`[${moduleName}] ${message}`, context, error),
    test: (message: string, context?: Record<string, any>) =>
      logger.test(`[${moduleName}] ${message}`, context),
  };
};

// Convenience exports for common use cases
export const apiLogger = createModuleLogger('API');
export const authLogger = createModuleLogger('Auth');
export const chatLogger = createModuleLogger('Chat');
export const performanceLogger = createModuleLogger('Performance');
export const testLogger = createModuleLogger('Test');

export default logger;