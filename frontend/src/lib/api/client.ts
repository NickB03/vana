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
import { addCsrfHeader } from '../csrf';

/**
 * ADK Configuration Constants
 * These define the ADK-compliant endpoint structure:
 * /apps/{appName}/users/{userId}/sessions/{sessionId}/run
 */
const ADK_CONFIG = {
  APP_NAME: process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana',
  DEFAULT_USER: process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default',
} as const;

/**
 * API Client for Vana backend integration
 *
 * Security Enhancement: CRIT-008
 * This client uses HttpOnly cookies for JWT token storage instead of sessionStorage.
 * This prevents XSS attacks by making tokens inaccessible to JavaScript.
 *
 * Security Benefits:
 * - XSS Protection: Tokens stored in HttpOnly cookies cannot be accessed by malicious scripts
 * - CSRF Protection: SameSite=lax prevents CSRF while allowing OAuth callbacks
 * - Reduced Attack Surface: No client-side token exposure in sessionStorage or localStorage
 */
export class VanaAPIClient {
  private config: APIConfig;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(config: Partial<APIConfig> = {}) {
    this.config = {
      baseURL: config.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    };

    // NOTE: Tokens are no longer stored in memory or sessionStorage
    // They are managed server-side as HttpOnly cookies for security
  }

  /**
   * Set authentication tokens as secure HttpOnly cookies
   *
   * Security: This method sends tokens to the backend which stores them as HttpOnly cookies.
   * This prevents XSS attacks since JavaScript cannot access HttpOnly cookies.
   */
  private async setAuthenticationCookies(tokens: Token): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseURL}/api/auth/set-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expires_in,
        }),
        credentials: 'include', // Required for cookies
      });

      if (!response.ok) {
        throw new Error('Failed to set authentication cookies');
      }
    } catch (error) {
      console.error('Failed to set authentication cookies:', error);
      throw error;
    }
  }

  /**
   * Clear authentication cookies (logout)
   *
   * Security: Clears HttpOnly cookies by calling backend endpoint
   */
  private async clearAuthenticationCookies(): Promise<void> {
    try {
      await fetch(`${this.config.baseURL}/api/auth/clear-tokens`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch (error) {
      console.warn('Failed to clear authentication cookies:', error);
    }
  }

  /**
   * Refresh access token using refresh token from HttpOnly cookie
   *
   * Security: The refresh token is automatically sent via cookie, not exposed to JavaScript
   */
  private async refreshAccessToken(): Promise<boolean> {
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
   *
   * Security: Refresh token is sent automatically via HttpOnly cookie
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      // Note: The refresh token cookie is automatically sent with credentials: 'include'
      const response = await fetch(`${this.config.baseURL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Send cookies
        body: JSON.stringify({}), // Empty body, token from cookie
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokens: Token = await response.json();
      await this.setAuthenticationCookies(tokens);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearAuthenticationCookies();
      return false;
    }
  }

  /**
   * Make authenticated HTTP request with automatic token refresh
   *
   * Security: Uses HttpOnly cookies for authentication, tokens never exposed to JavaScript
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & { skipAuth?: boolean; skipRetry?: boolean } = {}
  ): Promise<T> {
    const { skipAuth = false, skipRetry = false, ...requestOptions } = options;

    // Prepare request
    const url = `${this.config.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((requestOptions.headers as Record<string, string>) || {}),
    };

    // Add CSRF token for state-changing methods (POST, PUT, DELETE, PATCH)
    // GET, HEAD, OPTIONS don't need CSRF protection per HTTP semantics
    if (options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
      Object.assign(headers, addCsrfHeader(headers));
    }

    // Always include credentials for cookie-based authentication
    const requestConfig: RequestInit = {
      ...requestOptions,
      headers,
      credentials: 'include', // CRITICAL: Always send cookies
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
          await this.clearAuthenticationCookies();
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
   *
   * Security: Tokens are stored as HttpOnly cookies, not exposed to JavaScript
   */
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      skipAuth: true,
    });

    // Store tokens securely as HttpOnly cookies
    await this.setAuthenticationCookies(response.tokens);
    return response;
  }

  /**
   * Login user with email/username and password
   *
   * Security: Tokens are stored as HttpOnly cookies, not exposed to JavaScript
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuth: true,
    });

    // Store tokens securely as HttpOnly cookies
    await this.setAuthenticationCookies(response.tokens);
    return response;
  }

  /**
   * Login with OAuth2 form data (alternative format)
   *
   * Security: Tokens are stored as HttpOnly cookies, not exposed to JavaScript
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

    // Store tokens securely as HttpOnly cookies
    await this.setAuthenticationCookies(response.tokens);
    return response;
  }

  /**
   * Login with Google Cloud Identity
   *
   * Security: Tokens are stored as HttpOnly cookies, not exposed to JavaScript
   */
  async loginGoogle(googleData: GoogleCloudIdentity): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify(googleData),
      skipAuth: true,
    });

    // Store tokens securely as HttpOnly cookies
    await this.setAuthenticationCookies(response.tokens);
    return response;
  }

  /**
   * Handle Google OAuth callback
   *
   * Security: Tokens are stored as HttpOnly cookies, not exposed to JavaScript
   */
  async handleGoogleCallback(callbackData: GoogleOAuthCallbackRequest): Promise<AuthResponse> {
    const response = await this.makeRequestWithRetry<AuthResponse>('/auth/google/callback', {
      method: 'POST',
      body: JSON.stringify(callbackData),
      skipAuth: true,
    });

    // Store tokens securely as HttpOnly cookies
    await this.setAuthenticationCookies(response.tokens);
    return response;
  }

  /**
   * Logout current session
   *
   * Security: Clears HttpOnly cookies and revokes refresh token
   */
  async logout(): Promise<void> {
    try {
      // Note: Refresh token is automatically sent via cookie
      await this.makeRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({}),
      });
    } catch (error) {
      console.warn('Logout request failed:', error);
    }

    // Clear cookies regardless of backend response
    await this.clearAuthenticationCookies();
  }

  /**
   * Logout from all devices
   *
   * Security: Revokes all refresh tokens and clears cookies
   */
  async logoutAll(): Promise<{ message: string }> {
    const response = await this.makeRequest<{ message: string }>('/auth/logout-all', {
      method: 'POST',
    });

    await this.clearAuthenticationCookies();
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
   *
   * Security: Clears all auth cookies as password change logs out all sessions
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string }> {
    const response = await this.makeRequest<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });

    // Clear cookies since password change logs out all sessions
    await this.clearAuthenticationCookies();
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
   * Uses ADK-compliant endpoint: /apps/{appName}/users/{userId}/sessions/{sessionId}/run
   */
  async startResearch(sessionId: string, request: ResearchRequest): Promise<ResearchResponse> {
    // ADK-compliant endpoint structure
    const adkEndpoint = `/apps/${ADK_CONFIG.APP_NAME}/users/${ADK_CONFIG.DEFAULT_USER}/sessions/${sessionId}/run`;

    return await this.makeRequestWithRetry<ResearchResponse>(adkEndpoint, {
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
   * Check if user is authenticated by verifying cookies on backend
   *
   * Security: Does not expose tokens to JavaScript, checks server-side cookies
   *
   * @returns Promise<boolean> indicating authentication status
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseURL}/api/auth/check`, {
        credentials: 'include', // Send cookies
      });

      if (!response.ok) {
        return false;
      }

      const data: { authenticated: boolean } = await response.json();
      return data.authenticated;
    } catch (error) {
      console.warn('Failed to check authentication status:', error);
      return false;
    }
  }

  /**
   * Manually set tokens (useful for SSR or after OAuth)
   *
   * Security: Stores tokens as HttpOnly cookies, not exposed to JavaScript
   */
  async setTokens(tokens: Token): Promise<void> {
    await this.setAuthenticationCookies(tokens);
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
