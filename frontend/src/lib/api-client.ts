/**
 * API Client for Vana Frontend
 * Handles communication with FastAPI backend at localhost:8000
 */

import { 
  ChatSession, 
  ResearchQuery, 
  AgentResponse, 
  ResearchResult,
  CreateResearchQueryRequest,
  CreateChatSessionRequest,
  ApiResponse,
  PaginatedResponse,
  UserSession as UserProfile
} from '../types/chat';

// ===== CONFIGURATION =====

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 5000; // 5 seconds - faster failure for dev mode

// ===== ERROR TYPES =====

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ===== HTTP CLIENT =====

class HttpClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string, timeout: number = API_TIMEOUT) {
    this.baseURL = baseURL.replace(/\/+$/, ''); // Remove trailing slashes
    this.timeout = timeout;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  clearAuthToken() {
    delete this.defaultHeaders['Authorization'];
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: Record<string, unknown>,
    options: {
      headers?: Record<string, string>;
      timeout?: number;
      signal?: AbortSignal;
    } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { ...this.defaultHeaders, ...options.headers };
    const timeout = options.timeout || this.timeout;

    // Create timeout controller if no signal provided
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const signal = options.signal || controller.signal;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData: { message?: string; code?: string; details?: Record<string, unknown> };
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        // Handle authentication errors
        if (response.status === 401) {
          // Token expired or invalid - trigger auth refresh
          const refreshEvent = new CustomEvent('auth:token_expired', {
            detail: { originalError: errorData }
          });
          window.dispatchEvent(refreshEvent);
        }

        throw new ApiError(
          errorData.message || `HTTP ${response.status}`,
          response.status,
          errorData.code,
          errorData.details
        );
      }

      // Handle empty responses
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      const result = await response.json();
      return result;

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

  get<T>(endpoint: string, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  post<T>(endpoint: string, data?: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('POST', endpoint, data, options);
  }

  put<T>(endpoint: string, data?: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  patch<T>(endpoint: string, data?: Record<string, unknown>, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, options);
  }

  delete<T>(endpoint: string, options?: { signal?: AbortSignal }): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }
}

// ===== API CLIENT CLASS =====

export class VanaApiClient {
  private http: HttpClient;

  constructor(baseURL: string = API_BASE_URL) {
    this.http = new HttpClient(baseURL);
  }

  // ===== AUTHENTICATION =====

  setAuthToken(token: string) {
    this.http.setAuthToken(token);
  }

  clearAuth() {
    this.http.clearAuthToken();
  }

  getAuthToken(): string | null {
    const authHeader = this.http['defaultHeaders']['Authorization'];
    return authHeader ? authHeader.replace('Bearer ', '') : null;
  }

  async login(email: string, password: string): Promise<{ tokens: { access_token: string; refresh_token: string; token_type: string; expires_in: number }; user: UserProfile }> {
    // Google ADK backend expects username field (can be email)
    return this.http.post('/auth/login', { username: email, password });
  }

  async register(userData: { email: string; username: string; password: string; first_name?: string; last_name?: string }): Promise<{ tokens: { access_token: string; refresh_token: string; token_type: string; expires_in: number }; user: UserProfile }> {
    return this.http.post('/auth/register', userData);
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }> {
    return this.http.post('/auth/refresh', { refresh_token: refreshToken });
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.http.post('/auth/logout', { refresh_token: refreshToken });
    } catch (error) {
      // Continue with logout even if server call fails
      console.warn('Server logout failed:', error);
    }
    this.clearAuth();
  }

  async getCurrentUser(): Promise<UserProfile> {
    return this.http.get('/auth/me');
  }

  // ===== HEALTH CHECK =====

  async healthCheck(): Promise<{ status: string; timestamp: string; version?: string }> {
    return this.http.get('/health');
  }

  // ===== SESSION MANAGEMENT (Google ADK Integration) =====

  /**
   * Create session via Google ADK session service
   * Maps to: POST /api/apps/{app}/users/{user}/sessions
   */
  async createAdkSession(appId: string = 'vana', userId: string = 'current'): Promise<{ session_id: string; status: string; created_at: string }> {
    const result = await this.http.post(`/apps/${appId}/users/${userId}/sessions`, {});
    // Google ADK returns 'id' field, map it to 'session_id' for consistency
    return {
      session_id: result.id,
      status: 'active',
      created_at: new Date().toISOString()
    };
  }

  /**
   * Get session information via Google ADK
   * Maps to: GET /api/apps/{app}/users/{user}/sessions/{session_id}
   */
  async getAdkSession(sessionId: string, appId: string = 'vana', userId: string = 'current'): Promise<{ session_id: string; app_name: string; user_id: string; created_at: string; last_active?: string }> {
    return this.http.get(`/apps/${appId}/users/${userId}/sessions/${sessionId}`);
  }

  /**
   * Legacy frontend session management (for UI state)
   */
  async getSessions(page: number = 1, pageSize: number = 20): Promise<PaginatedResponse<ChatSession>> {
    // This would need to be implemented if we want to persist session history
    // For now, return empty response
    return {
      items: [],
      page,
      limit: pageSize,
      total: 0,
      hasNext: false,
      hasPrev: false
    };
  }

  async getSession(sessionId: string): Promise<ApiResponse<ChatSession>> {
    // Map to ADK session if needed, or return cached session
    try {
      const adkSession = await this.getAdkSession(sessionId);
      return {
        success: true,
        data: this.transformAdkSessionToChatSession(adkSession),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: 'Session not found',
        timestamp: new Date().toISOString()
      };
    }
  }

  private transformAdkSessionToChatSession(adkSession: { session_id: string; app_name: string; user_id: string; created_at: string; last_active?: string; title?: string }): ChatSession {
    return {
      id: adkSession.session_id || adkSession.id,
      title: adkSession.title || 'Research Session',
      userId: adkSession.user_id || 'current',
      createdAt: new Date(adkSession.created_at || Date.now()),
      updatedAt: new Date(adkSession.updated_at || Date.now()),
      status: adkSession.status === 'active' ? 'active' : 'archived',
      messageCount: adkSession.message_count || 0,
      settings: {
        theme: 'system',
        autoScroll: true,
        notifications: true,
        streamingEnabled: true
      },
      metadata: {
        userAgent: navigator.userAgent,
        lastIpAddress: '',
        researchContext: adkSession.context
      }
    };
  }

  // ===== RESEARCH QUERIES =====

  async getQueries(sessionId: string): Promise<ApiResponse<ResearchQuery[]>> {
    return this.http.get(`/api/sessions/${sessionId}/queries`);
  }

  async getQuery(queryId: string): Promise<ApiResponse<ResearchQuery>> {
    return this.http.get(`/api/queries/${queryId}`);
  }

  async submitQuery(sessionId: string, request: CreateResearchQueryRequest): Promise<ApiResponse<ResearchQuery>> {
    return this.http.post(`/api/sessions/${sessionId}/queries`, request);
  }

  async cancelQuery(queryId: string): Promise<ApiResponse<void>> {
    return this.http.post(`/api/queries/${queryId}/cancel`);
  }

  // ===== GOOGLE ADK RESEARCH INTEGRATION =====
  
  /**
   * Initiate research via Google ADK SSE endpoint
   * This connects to the Google ADK agent network for multi-agent research
   */
  async startAdkResearch(
    query: string,
    sessionId: string,
    options?: {
      type?: string;
      priority?: string;
      maxDuration?: number;
      outputFormat?: string;
    }
  ): Promise<{ session_id: string; status: string; message: string }> {
    const payload = {
      query,
      session_id: sessionId,
      type: options?.type || 'research',
      priority: options?.priority || 'medium',
      max_duration: options?.maxDuration || 300, // 5 minutes default
      output_format: options?.outputFormat || 'structured'
    };

    return this.http.post('/api/run_sse', payload);
  }

  /**
   * Legacy research endpoint for backward compatibility
   */
  async startResearch(
    query: string, 
    options?: {
      queryId?: string;
      type?: string;
      priority?: string;
      parameters?: Record<string, string | number | boolean>;
    }
  ): Promise<{ queryId: string; message: string; sessionId: string }> {
    // Create ADK session first
    const session = await this.createAdkSession();
    
    // Start research with session
    const result = await this.startAdkResearch(query, session.session_id, {
      type: options?.type,
      priority: options?.priority,
      ...options?.parameters
    });
    
    return {
      queryId: `query-${Date.now()}`,
      message: result.message,
      sessionId: result.session_id
    };
  }

  // ===== AGENT RESPONSES =====

  async getResponses(queryId: string): Promise<ApiResponse<AgentResponse[]>> {
    return this.http.get(`/api/queries/${queryId}/responses`);
  }

  async getResponse(responseId: string): Promise<ApiResponse<AgentResponse>> {
    return this.http.get(`/api/responses/${responseId}`);
  }

  // ===== RESEARCH RESULTS =====

  async getResults(queryId: string): Promise<ApiResponse<ResearchResult[]>> {
    return this.http.get(`/api/queries/${queryId}/results`);
  }

  async getResult(resultId: string): Promise<ApiResponse<ResearchResult>> {
    return this.http.get(`/api/results/${resultId}`);
  }

  async downloadResult(resultId: string, format: 'pdf' | 'docx' | 'md' = 'pdf'): Promise<Blob> {
    const response = await fetch(`${this.http['baseURL']}/api/results/${resultId}/download?format=${format}`, {
      headers: this.http['defaultHeaders'],
    });

    if (!response.ok) {
      throw new ApiError(`Download failed: ${response.statusText}`, response.status);
    }

    return response.blob();
  }

  // ===== FEEDBACK =====

  async submitFeedback(
    responseId: string, 
    feedback: 'positive' | 'negative', 
    comment?: string
  ): Promise<ApiResponse<void>> {
    return this.http.post(`/api/responses/${responseId}/feedback`, {
      feedback,
      comment
    });
  }

  // ===== FILE UPLOADS =====

  async uploadFile(file: File, queryId?: string): Promise<ApiResponse<{ fileId: string; url: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    if (queryId) {
      formData.append('queryId', queryId);
    }

    const response = await fetch(`${this.http['baseURL']}/api/files/upload`, {
      method: 'POST',
      headers: {
        'Authorization': this.http['defaultHeaders']['Authorization'],
      },
      body: formData,
    });

    if (!response.ok) {
      throw new ApiError(`Upload failed: ${response.statusText}`, response.status);
    }

    return response.json();
  }

  // ===== UTILITY METHODS =====

  async checkConnection(): Promise<boolean> {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      console.warn('API connection check failed:', error);
      return false;
    }
  }

  /**
   * Create an AbortController for cancelling requests
   */
  createAbortController(): AbortController {
    return new AbortController();
  }

  /**
   * Get the Google ADK SSE endpoint URL for connecting EventSource
   * This connects to the agent network SSE stream with authentication
   */
  getSSEUrl(sessionId: string): string {
    const baseUrl = `${this.http['baseURL']}/agent_network_sse/${sessionId}`;
    return baseUrl; // Auth handled via custom EventSource with headers
  }

  /**
   * Create EventSource with proper authentication for Google ADK backend
   * The backend supports optional authentication based on REQUIRE_SSE_AUTH setting
   */
  createAuthenticatedEventSource(sessionId: string): EventSource {
    const url = this.getSSEUrl(sessionId);
    const token = this.getAuthToken();
    const authRequired = process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH !== 'false';
    
    if (typeof window === 'undefined') {
      throw new Error('EventSource not available in server environment');
    }
    
    // EventSource doesn't support custom headers, but Google ADK backend
    // handles authentication through optional middleware, so we can connect
    // directly and let the backend decide based on REQUIRE_SSE_AUTH setting
    if (token && authRequired) {
      console.log('Connecting to Google ADK SSE with authentication');
      // For now, use query param since EventSource doesn't support headers
      // TODO: Implement custom SSE client that supports headers
      const authenticatedUrl = `${url}?authorization=${encodeURIComponent(`Bearer ${token}`)}`;
      return new EventSource(authenticatedUrl);
    }
    
    console.log('Connecting to Google ADK SSE without authentication (development mode)');
    return new EventSource(url);
  }

  /**
   * Test authentication by calling a protected endpoint
   */
  async validateAuth(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get agent network event history
   */
  async getAgentNetworkHistory(limit: number = 50): Promise<{ events: Array<{ id: string; type: string; message: string; timestamp: string; data?: Record<string, unknown> }>; authenticated: boolean; timestamp: string }> {
    return this.http.get(`/agent_network_history?limit=${limit}`);
  }

  /**
   * Submit feedback for agent responses (duplicate removed)
   */
}

// ===== DEFAULT CLIENT INSTANCE =====

export const apiClient = new VanaApiClient();

// ===== CONVENIENCE HOOKS =====

/**
 * React hook for API client with automatic authentication
 */
export function useApiClient() {
  return apiClient;
}

// ===== UTILITY FUNCTIONS =====

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (isNetworkError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

export default apiClient;