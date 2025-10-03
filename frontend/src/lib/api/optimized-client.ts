/**
 * Optimized Vana API Client - Enhanced performance with caching, batching, and connection pooling
 * Addresses performance bottlenecks identified in the original client
 */

import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordReset,
  GoogleCloudIdentity,
  GoogleOAuthCallbackRequest,
  ResearchRequest,
  ResearchResponse,
  HealthResponse,
  Feedback,
  FeedbackResponse,
  User,
  APIConfig,
  AgentNetworkEvent,
  Token,
  SessionListResponse,
  SessionSummary,
  SessionDetail,
  ChatMessage,
  MessageOperationResponse,
  MessageFeedbackResponse,
} from './types';
import { syncTokensToCookies } from '../auth-cookies';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  etag?: string;
}

interface RequestQueue {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
}

interface BatchRequest {
  endpoint: string;
  options: RequestInit;
  id: string;
}

/**
 * Enhanced API Client with performance optimizations
 */
export class OptimizedVanaAPIClient {
  private config: APIConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpirationTime: number | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  // Performance optimizations
  private cache = new Map<string, CacheEntry<any>>();
  private requestQueue = new Map<string, RequestQueue[]>();
  private batchQueue: BatchRequest[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private connectionPool = new Map<string, {
    controller: AbortController;
    lastUsed: number;
    inUse: boolean;
  }>();
  private metrics = {
    requests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    batchedRequests: 0,
    averageResponseTime: 0,
    errors: 0,
  };

  constructor(config: Partial<APIConfig> = {}) {
    this.config = {
      baseURL: config.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };

    // Load tokens from sessionStorage if available
    if (typeof window !== 'undefined') {
      this.loadTokensFromStorage();
    }

    // Setup cache cleanup
    this.setupCacheCleanup();

    // Setup connection pool cleanup
    this.setupConnectionPoolCleanup();
  }

  /**
   * Setup periodic cache cleanup to prevent memory leaks
   */
  private setupCacheCleanup(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
        }
      }
    }, 60000); // Cleanup every minute
  }

  /**
   * Setup connection pool cleanup for idle connections
   */
  private setupConnectionPoolCleanup(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      const now = Date.now();
      const maxIdleTime = 300000; // 5 minutes

      for (const [key, connection] of this.connectionPool.entries()) {
        if (!connection.inUse && now - connection.lastUsed > maxIdleTime) {
          connection.controller.abort();
          this.connectionPool.delete(key);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(endpoint: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${endpoint}:${body}`;
  }

  /**
   * Check cache for existing response
   */
  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.metrics.cacheMisses++;
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.cacheMisses++;
      return null;
    }

    this.metrics.cacheHits++;
    return entry.data;
  }

  /**
   * Store response in cache
   */
  private setCache<T>(key: string, data: T, ttl: number = 300000, etag?: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      etag,
    });
  }

  /**
   * Get or create connection from pool
   */
  private getPooledConnection(endpoint: string): AbortController {
    const existing = this.connectionPool.get(endpoint);

    if (existing && !existing.inUse) {
      existing.inUse = true;
      existing.lastUsed = Date.now();
      return existing.controller;
    }

    const controller = new AbortController();
    this.connectionPool.set(endpoint, {
      controller,
      lastUsed: Date.now(),
      inUse: true,
    });

    return controller;
  }

  /**
   * Release connection back to pool
   */
  private releaseConnection(endpoint: string): void {
    const connection = this.connectionPool.get(endpoint);
    if (connection) {
      connection.inUse = false;
      connection.lastUsed = Date.now();
    }
  }

  /**
   * Request deduplication - prevent duplicate requests
   */
  private async deduplicateRequest<T>(
    key: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const existingQueues = this.requestQueue.get(key);

    if (existingQueues) {
      // Request already in progress, wait for it
      return new Promise((resolve, reject) => {
        existingQueues.push({ resolve, reject, timestamp: Date.now() });
      });
    }

    // Start new request
    const queues: RequestQueue[] = [];
    this.requestQueue.set(key, queues);

    try {
      const result = await requestFn();

      // Resolve all waiting requests
      queues.forEach(queue => queue.resolve(result));
      this.requestQueue.delete(key);

      return result;
    } catch (error) {
      // Reject all waiting requests
      queues.forEach(queue => queue.reject(error));
      this.requestQueue.delete(key);

      throw error;
    }
  }

  /**
   * Batch multiple requests to reduce network overhead
   */
  private addToBatch(endpoint: string, options: RequestInit): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `${Date.now()}_${Math.random()}`;

      this.batchQueue.push({
        endpoint,
        options,
        id: requestId,
      });

      // Store resolution functions
      (this as any)[`batch_${requestId}`] = { resolve, reject };

      // Setup batch timeout if not already set
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, 50); // 50ms batch window
      }
    });
  }

  /**
   * Process batched requests
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];
    this.batchTimeout = null;

    // Group by method and endpoint for efficient batching
    const groups = new Map<string, BatchRequest[]>();

    batch.forEach(request => {
      const key = `${request.options.method || 'GET'}:${request.endpoint}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(request);
    });

    // Process each group
    for (const [_, requests] of groups) {
      if (requests.length === 1) {
        // Single request, process normally
        const request = requests[0];
        try {
          const result = await this.makeRequest(request.endpoint, request.options);
          (this as any)[`batch_${request.id}`].resolve(result);
        } catch (error) {
          (this as any)[`batch_${request.id}`].reject(error);
        }
      } else {
        // Multiple requests, could be batched if API supports it
        // For now, process them in parallel
        const promises = requests.map(async (request) => {
          try {
            const result = await this.makeRequest(request.endpoint, request.options);
            (this as any)[`batch_${request.id}`].resolve(result);
          } catch (error) {
            (this as any)[`batch_${request.id}`].reject(error);
          }
        });

        await Promise.allSettled(promises);
        this.metrics.batchedRequests += requests.length;
      }
    }

    // Cleanup resolution functions
    batch.forEach(request => {
      delete (this as any)[`batch_${request.id}`];
    });
  }

  /**
   * Load authentication tokens from sessionStorage
   */
  private loadTokensFromStorage(): void {
    try {
      const accessToken = sessionStorage.getItem('vana_access_token');
      const refreshToken = sessionStorage.getItem('vana_refresh_token');
      const expirationTime = sessionStorage.getItem('vana_token_expiration');

      if (accessToken && refreshToken) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.tokenExpirationTime = expirationTime ? parseInt(expirationTime, 10) : null;
      }
    } catch (error) {
      console.warn('Failed to load tokens from storage:', error);
    }
  }

  /**
   * Save authentication tokens to sessionStorage
   */
  private saveTokensToStorage(tokens: Token): void {
    try {
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      this.tokenExpirationTime = Date.now() + (tokens.expires_in * 1000);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vana_access_token', tokens.access_token);
        sessionStorage.setItem('vana_refresh_token', tokens.refresh_token);
        sessionStorage.setItem('vana_token_expiration', this.tokenExpirationTime.toString());
        syncTokensToCookies();
      }
    } catch (error) {
      console.warn('Failed to save tokens to storage:', error);
    }
  }

  /**
   * Clear authentication tokens
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpirationTime = null;

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('vana_access_token');
      sessionStorage.removeItem('vana_refresh_token');
      sessionStorage.removeItem('vana_token_expiration');
      syncTokensToCookies();
      fetch('/api/auth/sync-cookies', { method: 'DELETE' }).catch(() => {});
    }
  }

  /**
   * Check if access token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpirationTime) return true;
    return Date.now() >= (this.tokenExpirationTime - 300000);
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) {
      this.clearTokens();
      return false;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    const result = await this.refreshPromise;
    this.refreshPromise = null;
    return result;
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      const response = await this.makeRequest<Token>('/api/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: this.refreshToken }),
        headers: { 'Content-Type': 'application/json' },
        skipAuth: true,
        skipCache: true,
      });

      this.saveTokensToStorage(response);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Enhanced HTTP request with caching, deduplication, and pooling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & {
      skipAuth?: boolean;
      skipRetry?: boolean;
      skipCache?: boolean;
      cacheTTL?: number;
    } = {}
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.requests++;

    const {
      skipAuth = false,
      skipRetry = false,
      skipCache = false,
      cacheTTL = 300000, // 5 minutes default
      ...requestOptions
    } = options;

    // Check cache first for GET requests
    if (!skipCache && (!requestOptions.method || requestOptions.method === 'GET')) {
      const cacheKey = this.getCacheKey(endpoint, requestOptions);
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Setup deduplication for GET requests
    const deduplicationKey = this.getCacheKey(endpoint, requestOptions);
    if (!skipCache && (!requestOptions.method || requestOptions.method === 'GET')) {
      return this.deduplicateRequest(deduplicationKey, async () => {
        return this.performRequest<T>(endpoint, requestOptions, {
          skipAuth,
          skipCache,
          cacheTTL,
          startTime,
        });
      });
    }

    return this.performRequest<T>(endpoint, requestOptions, {
      skipAuth,
      skipCache,
      cacheTTL,
      startTime,
    });
  }

  /**
   * Perform the actual HTTP request
   */
  private async performRequest<T>(
    endpoint: string,
    requestOptions: RequestInit,
    context: {
      skipAuth: boolean;
      skipCache: boolean;
      cacheTTL: number;
      startTime: number;
    }
  ): Promise<T> {
    const { skipAuth, skipCache, cacheTTL, startTime } = context;

    // Development mode auth handling
    const isDevelopment = process.env.NODE_ENV === 'development';
    const shouldSkipAuth = skipAuth || (isDevelopment && !this.accessToken);

    // Automatic token refresh for authenticated requests
    if (!shouldSkipAuth && this.refreshToken && this.isTokenExpired()) {
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        throw new APIError('Authentication failed - please login again', 401);
      }
    }

    // Prepare request
    const url = `${this.config.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((requestOptions.headers as Record<string, string>) || {}),
    };

    // Add authorization header for authenticated requests
    if (!shouldSkipAuth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    // Get pooled connection
    const controller = this.getPooledConnection(endpoint);

    const requestConfig: RequestInit = {
      ...requestOptions,
      headers,
      signal: controller.signal,
    };

    // Add timeout
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);
      this.releaseConnection(endpoint);

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime + responseTime) / 2;

      if (!response.ok) {
        this.metrics.errors++;

        // Handle authentication errors
        if (response.status === 401 && !skipAuth) {
          this.clearTokens();
          throw new APIError('Authentication required', 401);
        }

        const errorText = await response.text();
        let errorDetail = `HTTP ${response.status}`;

        try {
          const errorJson = JSON.parse(errorText);
          errorDetail = errorJson.detail || errorDetail;
        } catch {
          errorDetail = errorText || errorDetail;
        }

        throw new APIError(errorDetail, response.status, Object.fromEntries(response.headers.entries()));
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }

      const result = await response.json();

      // Cache successful GET requests
      if (!skipCache && (!requestOptions.method || requestOptions.method === 'GET')) {
        const cacheKey = this.getCacheKey(endpoint, requestOptions);
        const etag = response.headers.get('etag') || undefined;
        this.setCache(cacheKey, result, cacheTTL, etag);
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      this.releaseConnection(endpoint);
      this.metrics.errors++;

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }

      throw new APIError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`, 0);
    }
  }

  /**
   * Make request with retry logic
   */
  private async makeRequestWithRetry<T>(
    endpoint: string,
    options: RequestInit & { skipAuth?: boolean; skipCache?: boolean; cacheTTL?: number } = {}
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this.makeRequest<T>(endpoint, options);
      } catch (error) {
        lastError = error as Error;

        // Don't retry authentication errors or client errors (4xx)
        if (error instanceof APIError && (error.status_code === 401 || (error.status_code >= 400 && error.status_code < 500))) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.config.retryAttempts) {
          break;
        }

        // Wait before retrying with exponential backoff
        await new Promise(resolve =>
          setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt))
        );
      }
    }

    throw lastError!;
  }

  // Authentication Methods (same as original but with caching optimizations)

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      skipAuth: true,
      skipCache: true,
    });

    this.saveTokensToStorage(response.tokens);
    return response;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
      skipCache: true,
    });

    this.saveTokensToStorage(response.tokens);
    return response;
  }

  async getCurrentUser(): Promise<User> {
    return this.makeRequestWithRetry<User>('/api/auth/me', {
      cacheTTL: 60000, // Cache user info for 1 minute
    });
  }

  async listSessions(): Promise<SessionSummary[]> {
    const response = await this.makeRequestWithRetry<SessionListResponse>('/api/sessions', {
      cacheTTL: 30000, // Cache sessions for 30 seconds
    });
    return response.sessions ?? [];
  }

  async getSession(sessionId: string): Promise<SessionDetail> {
    return this.makeRequestWithRetry<SessionDetail>(`/api/sessions/${sessionId}`, {
      cacheTTL: 60000, // Cache session details for 1 minute
    });
  }

  async healthCheck(): Promise<HealthResponse> {
    return this.makeRequestWithRetry<HealthResponse>('/health', {
      skipAuth: true,
      cacheTTL: 30000, // Cache health check for 30 seconds
    });
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheHitRatio: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
      cacheSize: this.cache.size,
      connectionPoolSize: this.connectionPool.size,
    };
  }

  /**
   * Clear cache and reset metrics
   */
  clearCache(): void {
    this.cache.clear();
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      batchedRequests: 0,
      averageResponseTime: 0,
      errors: 0,
    };
  }

  // ... (include all other methods from original client with caching optimizations)

  isAuthenticated(): boolean {
    return !!(this.accessToken && this.refreshToken);
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setTokens(tokens: Token): void {
    this.saveTokensToStorage(tokens);
  }
}

// Custom error class for API errors
class APIError extends Error {
  public status_code: number;
  public headers?: Record<string, string>;

  constructor(message: string, status_code: number, headers?: Record<string, string>) {
    super(message);
    this.name = 'APIError';
    this.status_code = status_code;
    this.headers = headers;
  }
}

// Export optimized singleton instance
export const optimizedApiClient = new OptimizedVanaAPIClient();