/**
 * Retry service with exponential backoff
 */

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
}

export class RetryService {
  private static readonly DEFAULT_OPTIONS: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    exponentialBase: 2
  };
  
  static async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${config.maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, error);
        
        if (attempt === config.maxRetries) {
          throw lastError;
        }
        
        const delay = Math.min(
          config.baseDelay * Math.pow(config.exponentialBase, attempt - 1),
          config.maxDelay
        );
        
        console.log(`Retrying in ${delay}ms...`);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }
  
  static async withRetryAndCallback<T>(
    operation: () => Promise<T>,
    onRetry: (attempt: number, error: Error) => void,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_OPTIONS, ...options };
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < config.maxRetries) {
          onRetry(attempt, lastError);
          
          const delay = Math.min(
            config.baseDelay * Math.pow(config.exponentialBase, attempt - 1),
            config.maxDelay
          );
          
          await this.delay(delay);
        }
      }
    }
    
    throw lastError!;
  }
  
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Specific retry for CORS errors
  static async retryOnCorsError<T>(
    operation: () => Promise<T>,
    onRetry?: (attempt: number) => void
  ): Promise<T> {
    return this.withRetryAndCallback(
      operation,
      (attempt, error) => {
        if (error.message.includes('CORS') || error.message.includes('Load failed')) {
          onRetry?.(attempt);
        }
      },
      { maxRetries: 5, baseDelay: 2000 }
    );
  }
}