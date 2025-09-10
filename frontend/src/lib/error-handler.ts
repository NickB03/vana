/**
 * Comprehensive Error Handling System
 * Provides error classification, user-friendly messages, and recovery strategies
 */

import { ApiError, NetworkError, isApiError, isNetworkError } from './api-client';
import { isDebugEnabled } from './config';

// ===== ERROR TYPES =====

export interface AppError {
  id: string;
  type: ErrorType;
  message: string;
  userMessage: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  retryable: boolean;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: ErrorContext;
}

export type ErrorType = 
  | 'network_error'
  | 'api_error'
  | 'authentication_error'
  | 'authorization_error'
  | 'validation_error'
  | 'timeout_error'
  | 'server_error'
  | 'client_error'
  | 'sse_error'
  | 'unknown_error';

export type ErrorCategory = 
  | 'network'
  | 'auth'
  | 'validation'
  | 'server'
  | 'client'
  | 'sse'
  | 'system';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorContext {
  action?: string;
  resource?: string;
  sessionId?: string;
  userId?: string;
  userAgent?: string;
  url?: string;
  requestId?: string;
}

export interface ErrorRecoveryAction {
  type: 'retry' | 'reload' | 'login' | 'navigate' | 'contact_support' | 'ignore';
  label: string;
  action: () => void;
  primary?: boolean;
}

// ===== ERROR CLASSIFIER =====

export class ErrorClassifier {
  private static errorIdCounter = 0;

  static classifyError(error: any, context?: Partial<ErrorContext>): AppError {
    const id = `error_${++this.errorIdCounter}_${Date.now()}`;
    const timestamp = new Date();

    // Handle API errors
    if (isApiError(error)) {
      return this.classifyApiError(error, { id, timestamp, context });
    }

    // Handle network errors
    if (isNetworkError(error)) {
      return this.classifyNetworkError(error, { id, timestamp, context });
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      return this.classifyJavaScriptError(error, { id, timestamp, context });
    }

    // Handle unknown errors
    return {
      id,
      type: 'unknown_error',
      message: String(error),
      userMessage: 'An unexpected error occurred. Please try again.',
      timestamp,
      recoverable: true,
      retryable: true,
      category: 'system',
      severity: 'medium',
      context: context || {},
    };
  }

  private static classifyApiError(
    error: ApiError, 
    meta: { id: string; timestamp: Date; context?: Partial<ErrorContext> }
  ): AppError {
    let type: ErrorType = 'api_error';
    let category: ErrorCategory = 'server';
    let severity: ErrorSeverity = 'medium';
    let recoverable = true;
    let retryable = false;
    let userMessage = error.message;

    // Classify by status code
    switch (error.status) {
      case 400:
        type = 'validation_error';
        category = 'validation';
        severity = 'low';
        retryable = false;
        userMessage = 'Please check your input and try again.';
        break;
      
      case 401:
        type = 'authentication_error';
        category = 'auth';
        severity = 'high';
        retryable = false;
        userMessage = 'Please log in to continue.';
        break;
      
      case 403:
        type = 'authorization_error';
        category = 'auth';
        severity = 'high';
        retryable = false;
        userMessage = 'You don\'t have permission to perform this action.';
        break;
      
      case 404:
        type = 'client_error';
        category = 'client';
        severity = 'low';
        retryable = false;
        userMessage = 'The requested resource was not found.';
        break;
      
      case 408:
      case 504:
        type = 'timeout_error';
        category = 'network';
        severity = 'medium';
        retryable = true;
        userMessage = 'The request took too long. Please try again.';
        break;
      
      case 429:
        type = 'client_error';
        category = 'client';
        severity = 'medium';
        retryable = true;
        userMessage = 'Too many requests. Please wait a moment and try again.';
        break;
      
      case 500:
      case 502:
      case 503:
        type = 'server_error';
        category = 'server';
        severity = 'high';
        retryable = true;
        userMessage = 'Server error. Please try again later.';
        break;
      
      default:
        if (error.status >= 500) {
          type = 'server_error';
          severity = 'high';
          retryable = true;
          userMessage = 'Server error. Please try again later.';
        } else if (error.status >= 400) {
          type = 'client_error';
          severity = 'medium';
          userMessage = 'Request error. Please check your input.';
        }
    }

    // Handle specific error codes
    if (error.code) {
      switch (error.code) {
        case 'INVALID_CREDENTIALS':
          type = 'authentication_error';
          userMessage = 'Invalid email or password.';
          break;
        case 'SESSION_EXPIRED':
          type = 'authentication_error';
          userMessage = 'Your session has expired. Please log in again.';
          break;
        case 'RATE_LIMITED':
          userMessage = 'Too many requests. Please wait a moment.';
          break;
        case 'MAINTENANCE':
          userMessage = 'The service is under maintenance. Please try again later.';
          break;
      }
    }

    return {
      id: meta.id,
      type,
      message: error.message,
      userMessage,
      details: {
        status: error.status,
        code: error.code,
        details: error.details,
      },
      timestamp: meta.timestamp,
      recoverable,
      retryable,
      category,
      severity,
      context: meta.context || {},
    };
  }

  private static classifyNetworkError(
    error: NetworkError,
    meta: { id: string; timestamp: Date; context?: Partial<ErrorContext> }
  ): AppError {
    const isTimeout = error.message.includes('timeout') || error.message.includes('aborted');
    
    return {
      id: meta.id,
      type: isTimeout ? 'timeout_error' : 'network_error',
      message: error.message,
      userMessage: isTimeout 
        ? 'The request took too long. Please check your connection and try again.'
        : 'Network error. Please check your internet connection.',
      details: {
        originalError: error.originalError?.message,
      },
      timestamp: meta.timestamp,
      recoverable: true,
      retryable: true,
      category: 'network',
      severity: 'medium',
      context: meta.context || {},
    };
  }

  private static classifyJavaScriptError(
    error: Error,
    meta: { id: string; timestamp: Date; context?: Partial<ErrorContext> }
  ): AppError {
    let type: ErrorType = 'client_error';
    let severity: ErrorSeverity = 'medium';
    let userMessage = 'An error occurred. Please refresh the page and try again.';

    // Handle specific error types
    if (error.name === 'TypeError') {
      severity = 'low';
      userMessage = 'A technical error occurred. Please refresh the page.';
    } else if (error.name === 'ReferenceError') {
      severity = 'high';
    } else if (error.name === 'SyntaxError') {
      severity = 'high';
    }

    return {
      id: meta.id,
      type,
      message: error.message,
      userMessage,
      details: {
        name: error.name,
        stack: isDebugEnabled('apiCalls') ? error.stack : undefined,
      },
      timestamp: meta.timestamp,
      recoverable: true,
      retryable: false,
      category: 'client',
      severity,
      context: meta.context || {},
    };
  }
}

// ===== ERROR RECOVERY SYSTEM =====

export class ErrorRecoveryService {
  static getRecoveryActions(error: AppError, context?: any): ErrorRecoveryAction[] {
    const actions: ErrorRecoveryAction[] = [];

    // Add retry action for retryable errors
    if (error.retryable) {
      actions.push({
        type: 'retry',
        label: 'Try Again',
        action: () => context?.retry?.(),
        primary: true,
      });
    }

    // Add auth-specific actions
    if (error.category === 'auth') {
      actions.push({
        type: 'login',
        label: 'Log In',
        action: () => context?.login?.(),
        primary: !error.retryable,
      });
    }

    // Add reload action for severe errors
    if (error.severity === 'high' || error.severity === 'critical') {
      actions.push({
        type: 'reload',
        label: 'Refresh Page',
        action: () => window.location.reload(),
      });
    }

    // Add contact support for critical errors
    if (error.severity === 'critical') {
      actions.push({
        type: 'contact_support',
        label: 'Contact Support',
        action: () => context?.contactSupport?.(error),
      });
    }

    // Default ignore action
    if (actions.length === 0 || error.severity === 'low') {
      actions.push({
        type: 'ignore',
        label: 'Dismiss',
        action: () => context?.dismiss?.(),
      });
    }

    return actions;
  }
}

// ===== ERROR LOGGING =====

export class ErrorLogger {
  private static logs: AppError[] = [];

  static log(error: AppError): void {
    // Add to internal log
    this.logs.push(error);
    
    // Keep only last 100 errors
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    // Console logging in development
    if (isDebugEnabled('apiCalls')) {
      console.group(`🚨 ${error.type.toUpperCase()}: ${error.message}`);
      console.error('Error Details:', error);
      console.error('Context:', error.context);
      if (error.details) {
        console.error('Additional Details:', error.details);
      }
      console.groupEnd();
    }

    // Send to analytics/monitoring in production
    if (process.env.NODE_ENV === 'production' && error.severity === 'critical') {
      this.sendToMonitoring(error);
    }
  }

  private static sendToMonitoring(error: AppError): void {
    // In production, send to error monitoring service
    // Example: Sentry, LogRocket, etc.
    try {
      // Placeholder for actual monitoring service integration
      console.log('Would send to monitoring:', error.id);
    } catch (monitoringError) {
      console.error('Failed to send error to monitoring:', monitoringError);
    }
  }

  static getErrorHistory(): AppError[] {
    return [...this.logs];
  }

  static clearErrorHistory(): void {
    this.logs = [];
  }
}

// ===== MAIN ERROR HANDLER =====

export class ErrorHandler {
  static handle(
    error: any, 
    context?: Partial<ErrorContext>,
    recoveryContext?: any
  ): {
    error: AppError;
    actions: ErrorRecoveryAction[];
  } {
    // Classify the error
    const appError = ErrorClassifier.classifyError(error, context);
    
    // Log the error
    ErrorLogger.log(appError);
    
    // Get recovery actions
    const actions = ErrorRecoveryService.getRecoveryActions(appError, recoveryContext);
    
    return {
      error: appError,
      actions,
    };
  }

  static handleApiError(error: any, context?: Partial<ErrorContext>) {
    return this.handle(error, { ...context, action: 'api_call' });
  }

  static handleSSEError(error: any, sessionId: string, context?: Partial<ErrorContext>) {
    return this.handle(error, { 
      ...context, 
      action: 'sse_connection', 
      sessionId,
      resource: 'agent_network'
    });
  }

  static handleAuthError(error: any, context?: Partial<ErrorContext>) {
    return this.handle(error, { ...context, action: 'authentication' });
  }
}

// ===== UTILITY FUNCTIONS =====

export function getErrorMessage(error: any): string {
  if (isApiError(error) || isNetworkError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function isRetryableError(error: any): boolean {
  const appError = ErrorClassifier.classifyError(error);
  return appError.retryable;
}

export function getErrorSeverity(error: any): ErrorSeverity {
  const appError = ErrorClassifier.classifyError(error);
  return appError.severity;
}

export default ErrorHandler;