/**
 * Robust error handling system for VANA API
 */

export interface ApiError {
  type: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  retryDelay: number;
  context?: any;
}

export class ApiErrorHandler {
  static handleCorsError(error: Error): ApiError {
    console.error('CORS Error:', error);
    
    if (error.message.includes('CORS') || error.message.includes('Load failed')) {
      return {
        type: 'CORS_ERROR',
        message: 'Connection blocked by security policy',
        userMessage: 'Unable to connect to the service. Please try again.',
        retryable: true,
        retryDelay: 3000,
        context: { originalError: error.message }
      };
    }
    
    return this.handleGenericError(error);
  }
  
  static handleStreamError(error: Error): ApiError {
    console.error('Stream Error:', error);
    
    return {
      type: 'STREAM_ERROR',
      message: 'Streaming connection failed',
      userMessage: 'Chat connection interrupted. Retrying...',
      retryable: true,
      retryDelay: 1000,
      context: { originalError: error.message }
    };
  }
  
  static handleNetworkError(error: Error): ApiError {
    console.error('Network Error:', error);
    
    return {
      type: 'NETWORK_ERROR',
      message: 'Network request failed',
      userMessage: 'Network connection failed. Please check your internet connection.',
      retryable: true,
      retryDelay: 2000,
      context: { originalError: error.message }
    };
  }
  
  static handleGenericError(error: Error): ApiError {
    console.error('Generic Error:', error);
    
    return {
      type: 'GENERIC_ERROR',
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      retryable: false,
      retryDelay: 0,
      context: { originalError: error.message }
    };
  }
  
  static categorizeError(error: Error): ApiError {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('cors') || errorMessage.includes('load failed')) {
      return this.handleCorsError(error);
    }
    
    if (errorMessage.includes('stream') || errorMessage.includes('connection')) {
      return this.handleStreamError(error);
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return this.handleNetworkError(error);
    }
    
    return this.handleGenericError(error);
  }
}