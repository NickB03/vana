/**
 * Enhanced API Client with Retry Logic and Circuit Breaker Pattern
 */

import { ApiError, NetworkError } from './api-client';
import { ErrorHandler } from './error-handler';

// ===== RETRY CONFIGURATION =====

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableStatusCodes: number[];
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  jitter: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['NetworkError', 'TimeoutError', 'AbortError'],
};

// ===== CIRCUIT BREAKER =====

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringWindow: 120000, // 2 minutes
};

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime < this.config.recoveryTimeout) {
        throw new Error('Circuit breaker is open');
      } else {
        this.state = 'half-open';
        this.successCount = 0;
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = 'closed';
        this.failureCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): { state: CircuitBreakerState; failureCount: number; lastFailureTime: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.successCount = 0;
  }
}

// ===== RETRY LOGIC =====

export class RetryableClient {
  private circuitBreaker: CircuitBreaker;

  constructor(
    private retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
    circuitBreakerConfig: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG
  ) {
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: { action?: string; resource?: string }
  ): Promise<T> {
    return this.circuitBreaker.execute(async () => {
      let lastError: any;
      
      for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;
          
          // Don't retry on last attempt
          if (attempt === this.retryConfig.maxRetries) {
            break;
          }
          
          // Check if error is retryable
          if (!this.isRetryableError(error)) {
            throw error;
          }
          
          // Calculate delay with exponential backoff and jitter
          const delay = this.calculateDelay(attempt);
          
          // Log retry attempt
          console.warn(`Retry attempt ${attempt + 1}/${this.retryConfig.maxRetries} in ${delay}ms for ${context?.action || 'operation'}`, error);
          
          await this.sleep(delay);
        }
      }
      
      // All retries exhausted, throw the last error
      throw lastError;
    });
  }

  private isRetryableError(error: any): boolean {
    // Check for API errors with retryable status codes
    if (error instanceof ApiError) {
      return this.retryConfig.retryableStatusCodes.includes(error.status);
    }
    
    // Check for network errors
    if (error instanceof NetworkError) {
      return true;
    }
    
    // Check for other retryable error types
    if (error instanceof Error) {
      return this.retryConfig.retryableErrors.some(
        retryableType => error.name.includes(retryableType) || error.message.includes(retryableType)
      );
    }
    
    return false;
  }

  private calculateDelay(attempt: number): number {
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
    
    // Apply maximum delay cap
    delay = Math.min(delay, this.retryConfig.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (this.retryConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.round(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }
}

// ===== REQUEST QUEUE =====

interface QueuedRequest<T> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: number;
  createdAt: number;
  context?: { action?: string; resource?: string };
}

export class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private maxConcurrency = 5;
  private activeRequests = 0;

  async enqueue<T>(
    operation: () => Promise<T>,
    priority: number = 0,
    context?: { action?: string; resource?: string }
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation,
        resolve,
        reject,
        priority,
        createdAt: Date.now(),
        context,
      };
      
      // Insert request based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(req => req.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.activeRequests >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0 && this.activeRequests < this.maxConcurrency) {
      const request = this.queue.shift();
      if (!request) break;
      
      this.activeRequests++;
      
      // Process request without blocking the queue
      this.executeRequest(request).finally(() => {
        this.activeRequests--;
        this.processQueue();
      });
    }
    
    this.processing = false;
  }

  private async executeRequest<T>(request: QueuedRequest<T>): Promise<void> {
    try {
      const result = await request.operation();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      processing: this.processing,
    };
  }

  clear(): void {
    // Reject all pending requests
    this.queue.forEach(request => {
      request.reject(new Error('Request queue cleared'));
    });
    this.queue = [];
  }
}

// ===== ENHANCED API CLIENT =====

export class EnhancedApiClient {
  private retryClient: RetryableClient;
  private requestQueue: RequestQueue;
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(
    baseURL: string,
    timeout: number = 30000,
    retryConfig?: Partial<RetryConfig>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ) {
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.timeout = timeout;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    this.retryClient = new RetryableClient(
      { ...DEFAULT_RETRY_CONFIG, ...retryConfig },
      { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...circuitBreakerConfig }
    );
    
    this.requestQueue = new RequestQueue();
  }

  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      priority?: number;
      skipRetry?: boolean;
      skipQueue?: boolean;
    } = {}
  ): Promise<T> {
    const operation = () => this.executeRequest<T>(method, endpoint, data, options);
    
    if (options.skipQueue) {
      if (options.skipRetry) {
        return operation();
      } else {
        return this.retryClient.executeWithRetry(operation, {
          action: `${method} ${endpoint}`,
          resource: endpoint,
        });
      }
    }
    
    return this.requestQueue.enqueue(
      options.skipRetry ? operation : () => this.retryClient.executeWithRetry(operation, {
        action: `${method} ${endpoint}`,
        resource: endpoint,
      }),
      options.priority || 0,
      { action: `${method} ${endpoint}`, resource: endpoint }
    );
  }

  private async executeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...options.headers };
    const timeout = options.timeout || this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: { message?: string; code?: string; details?: any };
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData.code,
          errorData.details
        );
      }

      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new NetworkError('Request timeout');
      }

      throw new NetworkError(
        'Network request failed',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, options?: any): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async patch<T>(endpoint: string, data?: any, options?: any): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: any): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  // Status and control methods
  getStatus() {
    return {
      circuitBreaker: this.retryClient.getCircuitBreakerState(),
      requestQueue: this.requestQueue.getQueueStatus(),
    };
  }

  resetCircuitBreaker(): void {
    this.retryClient.resetCircuitBreaker();
  }

  clearQueue(): void {
    this.requestQueue.clear();
  }
}

export default EnhancedApiClient;