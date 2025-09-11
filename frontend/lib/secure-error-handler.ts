/**
 * Secure Error Handling for Vana AI Research Platform
 * 
 * Provides secure error handling that prevents information leakage while
 * maintaining useful debugging information in development environments.
 */

import { logSecurityEvent } from './security';

// ============================================================================
// Error Classification
// ============================================================================

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  CLIENT = 'client',
  SECURITY = 'security'
}

export interface SecureErrorInfo {
  publicMessage: string;
  internalMessage: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  errorCode: string;
  timestamp: Date;
  shouldLog: boolean;
  shouldReport: boolean;
}

// ============================================================================
// Error Mapping
// ============================================================================

const ERROR_MAPPINGS: Record<string, Partial<SecureErrorInfo>> = {
  // Authentication Errors
  'invalid_token': {
    publicMessage: 'Please log in again to continue.',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.MEDIUM,
    errorCode: 'AUTH_001'
  },
  'token_expired': {
    publicMessage: 'Your session has expired. Please log in again.',
    category: ErrorCategory.AUTHENTICATION,
    severity: ErrorSeverity.LOW,
    errorCode: 'AUTH_002'
  },
  'unauthorized': {
    publicMessage: 'You do not have permission to access this resource.',
    category: ErrorCategory.AUTHORIZATION,
    severity: ErrorSeverity.MEDIUM,
    errorCode: 'AUTH_003'
  },

  // Validation Errors
  'validation_failed': {
    publicMessage: 'Please check your input and try again.',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    errorCode: 'VAL_001'
  },
  'invalid_input': {
    publicMessage: 'Invalid input provided. Please check your data.',
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    errorCode: 'VAL_002'
  },

  // Network Errors
  'network_error': {
    publicMessage: 'Connection error. Please check your internet connection and try again.',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.MEDIUM,
    errorCode: 'NET_001'
  },
  'timeout': {
    publicMessage: 'Request timed out. Please try again.',
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.LOW,
    errorCode: 'NET_002'
  },

  // Server Errors
  'server_error': {
    publicMessage: 'An error occurred on our end. Please try again later.',
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.HIGH,
    errorCode: 'SRV_001'
  },
  'service_unavailable': {
    publicMessage: 'Service is temporarily unavailable. Please try again later.',
    category: ErrorCategory.SERVER,
    severity: ErrorSeverity.HIGH,
    errorCode: 'SRV_002'
  },

  // Security Errors
  'security_violation': {
    publicMessage: 'Security check failed. If you believe this is an error, please contact support.',
    category: ErrorCategory.SECURITY,
    severity: ErrorSeverity.CRITICAL,
    errorCode: 'SEC_001'
  },
  'rate_limited': {
    publicMessage: 'Too many requests. Please wait a moment before trying again.',
    category: ErrorCategory.SECURITY,
    severity: ErrorSeverity.MEDIUM,
    errorCode: 'SEC_002'
  },

  // Default fallback
  'unknown_error': {
    publicMessage: 'An unexpected error occurred. Please try again.',
    category: ErrorCategory.CLIENT,
    severity: ErrorSeverity.MEDIUM,
    errorCode: 'UNK_001'
  }
};

// ============================================================================
// Secure Error Handler
// ============================================================================

export class SecureErrorHandler {
  /**
   * Process error and return secure error information
   */
  static processError(error: Error | unknown, context?: string): SecureErrorInfo {
    const timestamp = new Date();
    let errorType = 'unknown_error';
    let internalMessage = 'Unknown error occurred';

    // Determine error type based on error properties
    if (error instanceof Error) {
      internalMessage = error.message;

      // Check for specific error types
      if (error.message.includes('token') || error.message.includes('unauthorized')) {
        errorType = error.message.includes('expired') ? 'token_expired' : 'invalid_token';
      } else if (error.message.includes('validation') || error.message.includes('invalid input')) {
        errorType = 'validation_failed';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorType = 'network_error';
      } else if (error.message.includes('timeout')) {
        errorType = 'timeout';
      } else if (error.message.includes('500') || error.message.includes('server')) {
        errorType = 'server_error';
      } else if (error.message.includes('503')) {
        errorType = 'service_unavailable';
      } else if (error.message.includes('rate limit') || error.message.includes('429')) {
        errorType = 'rate_limited';
      } else if (error.message.includes('security') || error.message.includes('forbidden')) {
        errorType = 'security_violation';
      }
    }

    // Get error mapping
    const mapping = ERROR_MAPPINGS[errorType] || ERROR_MAPPINGS['unknown_error'];

    const errorInfo: SecureErrorInfo = {
      publicMessage: mapping.publicMessage!,
      internalMessage: process.env.NODE_ENV === 'development' ? internalMessage : 'Internal error details hidden in production',
      category: mapping.category!,
      severity: mapping.severity!,
      errorCode: mapping.errorCode!,
      timestamp,
      shouldLog: mapping.severity !== ErrorSeverity.LOW,
      shouldReport: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL].includes(mapping.severity!)
    };

    // Log security events
    if (errorInfo.category === ErrorCategory.SECURITY) {
      logSecurityEvent('Security Error', {
        errorCode: errorInfo.errorCode,
        context,
        severity: errorInfo.severity,
        timestamp: errorInfo.timestamp.toISOString()
      });
    }

    // Log errors in development or if they should be logged
    if (process.env.NODE_ENV === 'development' || errorInfo.shouldLog) {
      console.error(`[${errorInfo.category.toUpperCase()}] ${errorInfo.errorCode}: ${internalMessage}`, {
        context,
        severity: errorInfo.severity,
        timestamp: errorInfo.timestamp.toISOString()
      });
    }

    return errorInfo;
  }

  /**
   * Format error for user display
   */
  static formatUserError(errorInfo: SecureErrorInfo): string {
    return `${errorInfo.publicMessage} (Error Code: ${errorInfo.errorCode})`;
  }

  /**
   * Create user-friendly error object
   */
  static createUserError(error: Error | unknown, context?: string) {
    const errorInfo = this.processError(error, context);
    
    return {
      message: errorInfo.publicMessage,
      code: errorInfo.errorCode,
      severity: errorInfo.severity,
      timestamp: errorInfo.timestamp.toISOString(),
      // Include internal details only in development
      ...(process.env.NODE_ENV === 'development' && {
        internalMessage: errorInfo.internalMessage,
        context
      })
    };
  }

  /**
   * Handle API errors specifically
   */
  static handleApiError(error: Error | unknown, endpoint: string) {
    const errorInfo = this.processError(error, `API: ${endpoint}`);
    
    // Report critical errors to monitoring service
    if (errorInfo.shouldReport && process.env.NODE_ENV === 'production') {
      // TODO: Implement error reporting to monitoring service
      console.error('[ERROR_REPORTING] Critical error:', {
        endpoint,
        errorCode: errorInfo.errorCode,
        severity: errorInfo.severity,
        timestamp: errorInfo.timestamp.toISOString()
      });
    }

    return errorInfo;
  }

  /**
   * Sanitize error for logging (remove sensitive information)
   */
  static sanitizeErrorForLogging(error: Error | unknown): Record<string, unknown> {
    if (error instanceof Error) {
      const sanitized: Record<string, unknown> = {
        name: error.name,
        message: error.message.replace(/token|password|key|secret/gi, '[REDACTED]'),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };

      // Remove sensitive data from error properties
      Object.keys(error).forEach(key => {
        if (!['name', 'message', 'stack'].includes(key)) {
          const value = (error as Record<string, unknown>)[key];
          if (typeof value === 'string') {
            sanitized[key] = value.replace(/token|password|key|secret/gi, '[REDACTED]');
          } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = '[OBJECT_REDACTED]';
          } else {
            sanitized[key] = value;
          }
        }
      });

      return sanitized;
    }

    return {
      type: typeof error,
      value: error?.toString?.() || 'Unknown error'
    };
  }
}

// ============================================================================
// React Error Boundary Helpers
// ============================================================================

export interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: SecureErrorInfo | null;
  errorId: string | null;
}

/**
 * Generate unique error ID for tracking
 */
export function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create error boundary state from error
 */
export function createErrorBoundaryState(error: Error): ErrorBoundaryState {
  const errorInfo = SecureErrorHandler.processError(error, 'ErrorBoundary');
  const errorId = generateErrorId();

  return {
    hasError: true,
    errorInfo,
    errorId
  };
}

// ============================================================================
// Exports
// ============================================================================

export { SecureErrorHandler as default };