/**
 * HTTP Client for Vana AI Research Platform
 * 
 * Provides a robust HTTP client for communicating with the Google ADK backend.
 * Features include:
 * - Modern fetch API with TypeScript support
 * - Request/response interceptors
 * - Automatic retry logic
 * - Comprehensive error handling
 * - Development logging
 * - Environment-based configuration
 */

import { z } from 'zod';
import {
  EnvironmentInfoSchema,
  AuthResponseSchema as BackendAuthResponseSchema,
  UserResponseSchema,
  TokenSchema,
  ResearchRequestSchema
} from './backend-schemas';
import type {
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ChangePasswordRequest
} from '../types/auth';
import type {
  ChatMessage
} from '../types/api';
import type {
  AuthResponse,
  UserResponse,
  Token,
  ResearchRequest
} from '../types/backend';

// ============================================================================
// Additional Type Definitions
// ============================================================================

interface RequestConfigWithTiming {
  _startTime?: number;
  [key: string]: unknown;
}

interface ApiClientWithExtensions {
  cache?: {
    clear?: () => void;
    get?: (key: string) => unknown;
    set?: (key: string, value: unknown) => void;
  };
  circuitBreaker?: {
    reset?: () => void;
    state?: string;
  };
  addRequestInterceptor?: (interceptor: RequestInterceptor) => void;
  addResponseInterceptor?: (interceptor: ResponseInterceptor) => void;
}

type RequestInterceptor = (config: RequestConfigWithTiming) => Promise<RequestConfigWithTiming> | RequestConfigWithTiming;
type ResponseInterceptor = (response: { config: RequestConfigWithTiming }) => Promise<{ config: RequestConfigWithTiming }> | { config: RequestConfigWithTiming };

// ============================================================================
// Configuration & Environment
// ============================================================================

interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
}

const getApiConfig = (): ApiClientConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.NEXT_PUBLIC_API_RETRY_DELAY || '1000'),
    enableLogging: isDevelopment,
  };
};

// ============================================================================
// Type Definitions
// ============================================================================

// API Response types matching backend
const CreateChatResponseSchema = z.object({
  task_id: z.string(),
  message_id: z.string(),
  chat_id: z.string(),
});

const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  environment: z.union([z.string(), EnvironmentInfoSchema]).optional(),
  version: z.string().optional(),
});


export type CreateChatResponse = z.infer<typeof CreateChatResponseSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export interface ErrorResponse {
  detail: string;
  status_code?: number;
  error_type?: string;
}

// Request types
export interface CreateChatMessageRequest {
  message: string;
  user_id?: string;
}

export interface StreamingChunk {
  content: string;
  isComplete: boolean;
  messageId?: string;
  timestamp?: string;
}

// ============================================================================
// Error Classes
// ============================================================================

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, errorData?: ErrorResponse): ApiError {
    const message = errorData?.detail || `HTTP ${response.status}: ${response.statusText}`;
    return new ApiError(message, response.status, errorData?.error_type);
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request timeout') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ============================================================================
// Response Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize: number = 100;

  private generateKey(url: string, options?: Record<string, unknown>): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${url}:${optionsStr}`;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// Circuit Breaker Implementation
// ============================================================================

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
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
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures += 1;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailures(): number {
    return this.failures;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'CLOSED';
  }
}

// ============================================================================
// Request/Response Interceptor System
// ============================================================================

interface RequestInterceptor {
  (config: RequestInit & { url: string }): RequestInit & { url: string } | Promise<RequestInit & { url: string }>;
}

interface ResponseInterceptor {
  (response: Response): Response | Promise<Response>;
}

class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  async processRequest(config: RequestInit & { url: string }): Promise<RequestInit & { url: string }> {
    let processedConfig = config;
    
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    
    return processedConfig;
  }

  async processResponse(response: Response): Promise<Response> {
    let processedResponse = response;
    
    for (const interceptor of this.responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }
    
    return processedResponse;
  }
}

// ============================================================================
// HTTP Client Implementation
// ============================================================================

class HttpClient {
  private config: ApiClientConfig;
  private abortController: AbortController | null = null;
  private cache: ResponseCache;
  private circuitBreaker: CircuitBreaker;
  private interceptors: InterceptorManager;

  constructor(config?: Partial<ApiClientConfig>) {
    this.config = { ...getApiConfig(), ...config };
    this.cache = new ResponseCache();
    this.circuitBreaker = new CircuitBreaker();
    this.interceptors = new InterceptorManager();
    
    this.setupDefaultInterceptors();
  }

  /**
   * Setup default request/response interceptors
   */
  private setupDefaultInterceptors(): void {
    // Request logging interceptor
    this.interceptors.addRequestInterceptor(async (config) => {
      if (this.config.enableLogging) {
        console.log(`[API Client] Request: ${config.method || 'GET'} ${config.url}`);
      }
      return config;
    });

    // Response logging interceptor
    this.interceptors.addResponseInterceptor(async (response) => {
      if (this.config.enableLogging) {
        console.log(`[API Client] Response: ${response.status} ${response.statusText}`);
      }
      return response;
    });

    // Performance monitoring interceptor
    this.interceptors.addRequestInterceptor(async (config) => {
      (config as RequestConfigWithTiming)._startTime = Date.now();
      return config;
    });

    this.interceptors.addResponseInterceptor(async (response) => {
      const startTime = (response.config as RequestConfigWithTiming)?._startTime;
      if (startTime && this.config.enableLogging) {
        const duration = Date.now() - startTime;
        console.log(`[API Client] Request took ${duration}ms`);
      }
      return response;
    });
  }

  /**
   * Add custom request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.interceptors.addRequestInterceptor(interceptor);
  }

  /**
   * Add custom response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.interceptors.addResponseInterceptor(interceptor);
  }

  /**
   * Clear cache for specific endpoint or all cache
   */
  clearCache(endpoint?: string): void {
    if (endpoint) {
      const url = `${this.config.baseUrl}${endpoint}`;
      // Clear specific endpoint cache
      const keys = Array.from(this.cache['cache'].keys()).filter((key: string) => key.startsWith(url));
      keys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Log requests/responses in development
   */
  private log(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
    if (!this.config.enableLogging) return;
    
    const logData = data ? { message, data } : message;
    console[level](`[API Client] ${logData}`);
  }

  /**
   * Create request headers with common defaults
   */
  private async getHeaders(customHeaders?: Record<string, string>): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders,
    };

    // Add auth header if available and auth is required
    if (typeof window !== 'undefined') {
      const requireAuth = process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH !== 'false';
      
      if (requireAuth) {
        // Use secure token manager instead of direct localStorage access
        try {
          const { tokenManager, csrfProtection } = await import('./security');
          const token = tokenManager.getToken();
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }
          
          // Add CSRF token for state-changing requests
          const csrfToken = csrfProtection.getToken();
          if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
          }
        } catch (error) {
          // Fallback to localStorage for backward compatibility during migration
          const token = localStorage.getItem('vana_auth_token');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            // Log warning about insecure token storage
            console.warn('[Security] Using insecure token storage. Please migrate to secure storage.');
          }
        }
      }
    }

    return headers;
  }

  /**
   * Create AbortController with timeout
   */
  private createAbortController(): AbortController {
    this.abortController = new AbortController();
    
    setTimeout(() => {
      if (this.abortController && !this.abortController.signal.aborted) {
        this.abortController.abort();
      }
    }, this.config.timeout);

    return this.abortController;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate and parse response data using Zod schemas
   */
  private validateResponse<T>(data: unknown, schema: z.ZodSchema<T>): T {
    try {
      return schema.parse(data);
    } catch (error) {
      this.log('error', 'Response validation failed', { data, error });
      throw new ApiError('Invalid response format from server');
    }
  }

  /**
   * Core fetch method with retry logic and circuit breaker
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<Response> {
    const config = await this.interceptors.processRequest({ url, ...options });
    
    return this.circuitBreaker.execute(async () => {
      try {
        const abortController = this.createAbortController();
        const response = await fetch(config.url, {
          ...config,
          url: undefined, // Remove url from fetch options
          signal: abortController.signal,
        });

        const processedResponse = await this.interceptors.processResponse(response);

        this.log('info', `${config.method || 'GET'} ${config.url}`, {
          status: processedResponse.status,
          statusText: processedResponse.statusText,
          attempt,
          circuitBreakerState: this.circuitBreaker.getState(),
        });

        return processedResponse;
      } catch (error) {
        // Handle abort/timeout
        if (error instanceof Error && error.name === 'AbortError') {
          throw new TimeoutError(`Request timeout after ${this.config.timeout}ms`);
        }

        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          const networkError = new NetworkError('Network request failed', error);
          
          // Retry on network errors
          if (attempt < this.config.retryAttempts) {
            this.log('warn', `Network error, retrying (${attempt}/${this.config.retryAttempts})`, error);
            await this.sleep(this.config.retryDelay * attempt);
            return this.fetchWithRetry(url, options, attempt + 1);
          }
          
          throw networkError;
        }

        throw error;
      }
    });
  }

  /**
   * Process response and handle errors
   */
  private async processResponse<T>(
    response: Response,
    schema?: z.ZodSchema<T>
  ): Promise<T> {
    const isJson = response.headers.get('content-type')?.includes('application/json');
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = isJson ? await response.json() : await response.text();
      } catch {
        errorData = { detail: 'Unknown error occurred' };
      }
      
      throw ApiError.fromResponse(response, errorData);
    }

    if (!isJson) {
      // For non-JSON responses, return the response itself
      return response as unknown as T;
    }

    const data = await response.json();
    
    // Validate response if schema provided
    if (schema) {
      return this.validateResponse(data, schema);
    }
    
    return data;
  }

  /**
   * Make GET request with optional caching
   */
  async get<T>(
    endpoint: string,
    options?: {
      headers?: Record<string, string>;
      schema?: z.ZodSchema<T>;
      cache?: boolean;
      cacheTTL?: number;
    }
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = await this.getHeaders(options?.headers);
    const cacheKey = `${url}:${JSON.stringify(options || {})}`;

    // Check cache first if caching is enabled
    if (options?.cache !== false) {
      const cachedData = this.cache.get<T>(cacheKey);
      if (cachedData) {
        this.log('info', `Cache hit for ${url}`);
        return cachedData;
      }
    }

    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers,
    });

    const data = await this.processResponse(response, options?.schema);

    // Cache successful responses if caching is enabled
    if (options?.cache !== false && response.ok) {
      this.cache.set(cacheKey, data, options?.cacheTTL || 300); // 5 minutes default TTL
    }

    return data;
  }

  /**
   * Make POST request
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    options?: {
      headers?: Record<string, string>;
      schema?: z.ZodSchema<T>;
    }
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = await this.getHeaders(options?.headers);

    // Validate input data if it's a chat message
    let sanitizedData = data;
    if (endpoint.includes('/chat/') && data && typeof data === 'object' && 'message' in data) {
      try {
        const { InputValidator } = await import('./security');
        const validation = InputValidator.validateMessage((data as { message?: string }).message);
        
        if (!validation.isValid) {
          throw new ApiError('Invalid input: ' + validation.errors.join(', '));
        }
        
        sanitizedData = { ...data, message: validation.sanitized };
      } catch (error) {
        // Fallback if security module fails
        console.warn('[Security] Input validation failed, proceeding without sanitization');
      }
    }

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers,
      body: sanitizedData ? JSON.stringify(sanitizedData) : undefined,
    });

    return this.processResponse(response, options?.schema);
  }

  /**
   * Create a Server-Sent Events stream
   */
  async createEventStream(
    endpoint: string,
    options?: {
      headers?: Record<string, string>;
      method?: 'GET' | 'POST';
      body?: unknown;
    }
  ): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const method = options?.method || 'GET';
    
    const headers = await this.getHeaders({
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...options?.headers,
    });

    // Validate input data for POST requests (similar to post method)
    let sanitizedBody = options?.body;
    if (method === 'POST' && endpoint.includes('/chat/') && sanitizedBody && typeof sanitizedBody === 'object' && 'message' in sanitizedBody) {
      try {
        const { InputValidator } = await import('./security');
        const validation = InputValidator.validateMessage((sanitizedBody as { message?: string }).message);
        
        if (!validation.isValid) {
          throw new ApiError('Invalid input: ' + validation.errors.join(', '));
        }
        
        sanitizedBody = { ...sanitizedBody, message: validation.sanitized };
      } catch (error) {
        // Fallback if security module fails
        console.warn('[Security] Input validation failed, proceeding without sanitization');
      }
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for POST requests
    if (method === 'POST' && sanitizedBody !== undefined) {
      requestOptions.body = JSON.stringify(sanitizedBody);
    }

    const response = await this.fetchWithRetry(url, requestOptions);

    if (!response.ok) {
      throw ApiError.fromResponse(response);
    }

    return response;
  }

  /**
   * Cancel current request
   */
  cancelRequest(): void {
    if (this.abortController && !this.abortController.signal.aborted) {
      this.abortController.abort();
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const apiClient = new HttpClient();

// ============================================================================
// API Service Methods
// ============================================================================

export class ApiService {
  private client: HttpClient;

  constructor(client: HttpClient = apiClient) {
    this.client = client;
  }

  /**
   * Check service health
   */
  async healthCheck(): Promise<HealthResponse> {
    return this.client.get('/health', {
      schema: HealthResponseSchema,
    });
  }

  /**
   * Send a chat message and get task ID for streaming
   */
  async sendChatMessage(
    chatId: string,
    request: CreateChatMessageRequest
  ): Promise<CreateChatResponse> {
    return this.client.post(`/chat/${chatId}/message`, request, {
      schema: CreateChatResponseSchema,
    });
  }

  /**
   * Create a Server-Sent Events stream for chat responses
   */
  async createChatStream(chatId: string, taskId: string): Promise<Response> {
    return this.client.createEventStream(
      `/chat/${chatId}/stream?task_id=${encodeURIComponent(taskId)}`
    );
  }

  /**
   * Create agent network SSE stream
   */
  async createAgentNetworkStream(sessionId: string): Promise<Response> {
    return this.client.createEventStream(`/agent_network_sse/${sessionId}`);
  }

  /**
   * Get agent network history
   */
  async getAgentNetworkHistory(limit: number = 50): Promise<{
    events: Array<Record<string, unknown>>;
    limit: number;
    total?: number;
  }> {
    return this.client.get(`/agent_network_history?limit=${limit}`, {
      cache: true,
      cacheTTL: 60, // Cache for 1 minute
    });
  }

  /**
   * Start multi-agent research with SSE streaming
   */
  async startResearch(
    sessionId: string,
    request: ResearchRequest
  ): Promise<Response> {
    // Validate request data before sending
    const validatedRequest = ResearchRequestSchema.parse(request);
    return this.client.createEventStream(`/api/run_sse/${sessionId}`, {
      method: 'POST',
      body: validatedRequest,
    });
  }

  // ============================================================================
  // Authentication API Methods
  // ============================================================================

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.client.post('/auth/login', credentials, {
      schema: BackendAuthResponseSchema,
    });
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.client.post('/auth/register', userData, {
      schema: BackendAuthResponseSchema,
    });
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshData: RefreshTokenRequest): Promise<Token> {
    return this.client.post('/auth/refresh', refreshData, {
      schema: TokenSchema,
    });
  }

  /**
   * Logout user
   */
  async logout(refreshData: RefreshTokenRequest): Promise<void> {
    await this.client.post('/auth/logout', refreshData);
  }

  /**
   * Logout from all devices
   */
  async logoutAll(): Promise<{ message: string; count?: number }> {
    return this.client.post('/auth/logout-all');
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<UserResponse> {
    return this.client.get('/auth/me', {
      schema: UserResponseSchema,
      cache: true,
      cacheTTL: 300, // Cache for 5 minutes
    });
  }

  /**
   * Update current user
   */
  async updateCurrentUser(updates: Partial<UserResponse>): Promise<UserResponse> {
    const response = await this.client.post('/auth/me', updates, {
      schema: UserResponseSchema,
    });
    
    // Invalidate user cache after update
    this.client.clearCache('/auth/me');
    
    return response;
  }

  /**
   * Change password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string }> {
    return this.client.post('/auth/change-password', passwordData);
  }
}

export const apiService = new ApiService();

// Export additional client methods for direct access
export const apiClientUtils = {
  /**
   * Clear response cache
   */
  clearCache: () => {
    (apiClient as ApiClientWithExtensions).cache?.clear?.();
  },
  
  /**
   * Get cache statistics
   */
  getCacheStats: () => {
    const cache = (apiClient as ApiClientWithExtensions).cache;
    return cache ? {
      size: cache.size?.() || 0,
      maxSize: cache.maxSize || 0,
    } : { size: 0, maxSize: 0 };
  },
  
  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus: () => {
    const circuitBreaker = (apiClient as ApiClientWithExtensions).circuitBreaker;
    return circuitBreaker ? {
      state: circuitBreaker.getState?.() || 'UNKNOWN',
      failures: circuitBreaker.getFailures?.() || 0,
    } : { state: 'UNKNOWN', failures: 0 };
  },

  /**
   * Reset circuit breaker state
   */
  resetCircuitBreaker: () => {
    const circuitBreaker = (apiClient as ApiClientWithExtensions).circuitBreaker;
    if (circuitBreaker && circuitBreaker.reset) {
      circuitBreaker.reset();
      return true;
    }
    return false;
  },
  
  /**
   * Add request interceptor
   */
  addRequestInterceptor: (interceptor: RequestInterceptor) => {
    (apiClient as ApiClientWithExtensions).addRequestInterceptor?.(interceptor);
  },
  
  /**
   * Add response interceptor
   */
  addResponseInterceptor: (interceptor: ResponseInterceptor) => {
    (apiClient as ApiClientWithExtensions).addResponseInterceptor?.(interceptor);
  },
};
