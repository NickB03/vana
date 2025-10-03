/**
 * Vana API Client - TypeScript SDK for FastAPI backend integration
 * Handles authentication, request/response typing, and error handling
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

/**
 * API Client for Vana backend integration
 */
export class VanaAPIClient {
  private config: APIConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpirationTime: number | null = null;
  private refreshPromise: Promise<boolean> | null = null;

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
  }

  /**
   * Load authentication tokens from sessionStorage for improved security
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
   * Save authentication tokens to sessionStorage for improved security
   * Uses session-lifetime storage to reduce XSS vulnerability compared to localStorage
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
   * Clear authentication tokens from sessionStorage
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
   * Check if access token is expired or will expire soon
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpirationTime) return true;
    // Consider token expired if it expires within 5 minutes
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

    // Prevent multiple simultaneous refresh attempts
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
   * Make authenticated HTTP request with automatic token refresh
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & { skipAuth?: boolean; skipRetry?: boolean } = {}
  ): Promise<T> {
    const { skipAuth = false, skipRetry = false, ...requestOptions } = options;

    // In development mode, skip auth unless we have tokens
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

    const requestConfig: RequestInit = {
      ...requestOptions,
      headers,
    };

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    requestConfig.signal = controller.signal;

    try {
      const response = await fetch(url, requestConfig);
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle authentication errors
        if (response.status === 401 && !skipAuth && !skipRetry) {
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

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
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
    options: RequestInit & { skipAuth?: boolean } = {}
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

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * (attempt + 1)));
      }
    }

    throw lastError!;
  }

  // Authentication Methods

  /**
   * Register new user account
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      skipAuth: true,
    });

    this.saveTokensToStorage(response.tokens);
    return response;
  }

  /**
   * Login user with email/username and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    });

    this.saveTokensToStorage(response.tokens);
    return response;
  }

  /**
   * Login with OAuth2 form data (alternative format)
   */
  async loginOAuth2(username: string, password: string): Promise<AuthResponse> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('grant_type', 'password');

    const response = await this.makeRequestWithRetry<AuthResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
      skipAuth: true,
    });

    this.saveTokensToStorage(response.tokens);
    return response;
  }

  /**
   * Login with Google Cloud Identity
   */
  async loginGoogle(googleData: GoogleCloudIdentity): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
      skipAuth: true,
    });

    this.saveTokensToStorage(response.tokens);
    return response;
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(callbackData: GoogleOAuthCallbackRequest): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify(callbackData),
      skipAuth: true,
    });

    this.saveTokensToStorage(response.tokens);
    return response;
  }

  /**
   * Logout current session
   */
  async logout(): Promise<void> {
    if (this.refreshToken) {
      try {
        await this.makeRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });
      } catch (error) {
        console.warn('Logout request failed:', error);
      }
    }

    this.clearTokens();
  }

  /**
   * Logout from all devices
   */
  async logoutAll(): Promise<{ message: string }> {
    const response = await this.makeRequest<{ message: string }>('/auth/logout-all', {
      method: 'POST',
    });

    this.clearTokens();
    return response;
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<User> {
    return this.makeRequestWithRetry<User>('/api/auth/me');
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await this.makeRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });

    // Clear tokens since password change logs out all sessions
    this.clearTokens();
    return response;
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(resetData: PasswordResetRequest): Promise<{ message: string }> {
    return this.makeRequestWithRetry<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
      skipAuth: true,
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetData: PasswordReset): Promise<{ message: string }> {
    return this.makeRequestWithRetry<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
      skipAuth: true,
    });
  }

  // Research and Agent Methods

  /**
   * Start research session
   */
  async startResearch(sessionId: string, request: ResearchRequest): Promise<ResearchResponse> {
    return this.makeRequestWithRetry<ResearchResponse>(`/api/run_sse/${sessionId}`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get agent network event history
   */
  async getAgentNetworkHistory(limit: number = 50): Promise<{ events: AgentNetworkEvent[]; authenticated: boolean; user_id?: number; timestamp: string }> {
    return this.makeRequestWithRetry(`/agent_network_history?limit=${limit}`);
  }

  /**
   * List persisted chat sessions from the backend store
   */
  async listSessions(): Promise<SessionSummary[]> {
    const response = await this.makeRequestWithRetry<SessionListResponse>('/api/sessions');
    return response.sessions ?? [];
  }

  /**
   * Retrieve a single session including its message history
   */
  async getSession(sessionId: string): Promise<SessionDetail> {
    return this.makeRequestWithRetry<SessionDetail>(`/api/sessions/${sessionId}`);
  }

  /**
   * Update stored session metadata
   */
  async updateSession(
    sessionId: string,
    payload: Partial<Pick<SessionSummary, 'title' | 'status' | 'progress' | 'current_phase' | 'final_report' | 'error'>>,
  ): Promise<SessionSummary> {
    const response = await this.makeRequestWithRetry<SessionSummary & { authenticated?: boolean }>(
      `/api/sessions/${sessionId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );

    return response;
  }

  /**
   * Append a message to a persisted session
   */
  async appendSessionMessage(sessionId: string, message: ChatMessage): Promise<ChatMessage> {
    const response = await this.makeRequestWithRetry<ChatMessage & { authenticated?: boolean }>(
      `/api/sessions/${sessionId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(message),
      }
    );

    return response;
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.makeRequestWithRetry<{ success: boolean; message?: string }>(
        `/api/sessions/${sessionId}`,
        {
          method: 'DELETE',
        }
      );
      return response;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return { success: false, message: 'Failed to delete session' };
    }
  }

  // Chat Actions Methods

  /**
   * Edit a message's content
   */
  async editMessage(messageId: string, content: string, triggerRegeneration: boolean = true): Promise<MessageOperationResponse> {
    return this.makeRequestWithRetry<MessageOperationResponse>(`/api/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({
        content,
        trigger_regeneration: triggerRegeneration
      }),
    });
  }

  /**
   * Delete a message and all subsequent messages
   */
  async deleteMessage(messageId: string): Promise<MessageOperationResponse> {
    return this.makeRequestWithRetry<MessageOperationResponse>(`/api/messages/${messageId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Submit feedback for a message
   */
  async submitMessageFeedback(
    messageId: string,
    feedbackType: 'upvote' | 'downvote',
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<MessageFeedbackResponse> {
    return this.makeRequestWithRetry<MessageFeedbackResponse>(`/api/messages/${messageId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({
        feedback_type: feedbackType,
        reason,
        metadata
      }),
    });
  }

  /**
   * Regenerate an assistant message
   */
  async regenerateMessage(messageId: string, context?: string): Promise<MessageOperationResponse> {
    return this.makeRequestWithRetry<MessageOperationResponse>(`/api/messages/${messageId}/regenerate`, {
      method: 'POST',
      body: JSON.stringify({
        context
      }),
    });
  }

  // Utility Methods

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthResponse> {
    return this.makeRequestWithRetry<HealthResponse>('/health', { skipAuth: true });
  }

  /**
   * Submit feedback
   */
  async submitFeedback(feedback: Feedback): Promise<FeedbackResponse> {
    return this.makeRequest<FeedbackResponse>('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedback),
    });
  }

  // Authentication State Helpers

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.accessToken && this.refreshToken);
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Manually set tokens (useful for SSR)
   */
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

// Export singleton instance
export const apiClient = new VanaAPIClient();
