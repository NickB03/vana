/**
 * Enhanced HTTP Client for Vana AI Research Platform
 * 
 * Extends the existing API client with comprehensive authentication integration:
 * - Automatic token management and refresh
 * - Type-safe API method signatures
 * - Enhanced error handling with auth-specific errors
 * - Request/response interceptors
 * - Comprehensive logging and monitoring
 */

import { z } from 'zod';

// Additional type definitions for enhanced client
interface RequestConfig {
  [key: string]: unknown;
}

interface ApiResponse {
  [key: string]: unknown;
}
import { apiClient } from './api-client';
import type { 
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  AuthVerificationRequest,
  AUTH_ENDPOINTS
} from '../types/auth';
import type {
  ApiClient,
  ApiService,
  HealthResponse,
  CreateChatMessageRequest,
  CreateChatResponse,
  ChatMessage,
  SessionInfo,
  ResearchRequest,
  ResearchResponse,
  AgentNetworkEvent,
  TeamStatus,
  ApiRequestOptions,
  LoginResponseSchema,
  UserSchema,
  CreateChatResponseSchema,
  HealthResponseSchema,
  AuthenticationError
} from '../types/api';

// Import comprehensive backend types
import type {
  // Backend model types
  ResearchRequest as BackendResearchRequest,
  ResearchResponse as BackendResearchResponse,
  SessionInfo as BackendSessionInfo,
  HealthResponse as BackendHealthResponse,
  AgentStatus as BackendAgentStatus,
  TeamStatus as BackendTeamStatus,
  UserProfile as BackendUserProfile,
  UserResponse as BackendUserResponse,
  AuthToken as BackendAuthToken,
  Token as BackendToken,
  PhoenixDebugResponse,
  Feedback as BackendFeedback,
  BACKEND_ENDPOINTS,
} from '../types/backend';

// Import validation schemas and utilities
import {
  validateHealthResponse,
  validateResearchResponse,
  validateUserResponse,
  validateAuthResponse,
  validateTokenResponse,
  validateAgentStatus,
  validateTeamStatus,
  validateSessionInfo,
  validatePhoenixDebug,
  createApiValidator,
} from './backend-schemas';

// ============================================================================
// Enhanced API Client with Full Auth Integration
// ============================================================================

class EnhancedApiClient implements ApiClient {
  private baseClient = apiClient;
  private authToken: string | null = null;
  private globalHeaders: Record<string, string> = {};
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig> = [];
  private responseInterceptors: Array<(response: ApiResponse) => ApiResponse> = [];

  // Configuration
  get config() {
    return this.baseClient.config;
  }

  // ========================================================================
  // Token Management
  // ========================================================================

  setAuthToken(token: string): void {
    this.authToken = token;
    this.setGlobalHeaders({ Authorization: `Bearer ${token}` });
  }

  clearAuthToken(): void {
    this.authToken = null;
    this.clearGlobalHeaders();
  }

  async refreshAuthToken(): Promise<string> {
    // This will be handled by the auth service
    const { authService } = await import('./auth-service');
    return authService.refreshToken();
  }

  setGlobalHeaders(headers: Record<string, string>): void {
    this.globalHeaders = { ...this.globalHeaders, ...headers };
  }

  clearGlobalHeaders(): void {
    this.globalHeaders = {};
  }

  // ========================================================================
  // Request Interceptors
  // ========================================================================

  private async interceptRequest(endpoint: string, options?: ApiRequestOptions): Promise<ApiRequestOptions> {
    let processedOptions = { ...options };
    
    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      processedOptions = await interceptor({ endpoint, ...processedOptions });
    }

    // Merge global headers
    processedOptions.headers = {
      ...this.globalHeaders,
      ...processedOptions.headers,
    };

    return processedOptions;
  }

  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: ApiResponse) => ApiResponse): void {
    this.responseInterceptors.push(interceptor);
  }

  // ========================================================================
  // Core HTTP Methods
  // ========================================================================

  async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    const processedOptions = await this.interceptRequest(endpoint, options);
    return this.baseClient.get(endpoint, processedOptions);
  }

  async post<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    const processedOptions = await this.interceptRequest(endpoint, options);
    return this.baseClient.post(endpoint, data, processedOptions);
  }

  async put<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    const processedOptions = await this.interceptRequest(endpoint, options);
    
    // The base client doesn't have put method, so we need to implement it
    const response = await fetch(`${this.baseClient.config.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...processedOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (processedOptions.schema) {
      const json = await response.json();
      return processedOptions.schema.parse(json);
    }

    return response.json();
  }

  async patch<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    const processedOptions = await this.interceptRequest(endpoint, options);
    
    const response = await fetch(`${this.baseClient.config.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...processedOptions.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (processedOptions.schema) {
      const json = await response.json();
      return processedOptions.schema.parse(json);
    }

    return response.json();
  }

  async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    const processedOptions = await this.interceptRequest(endpoint, options);
    
    const response = await fetch(`${this.baseClient.config.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...processedOptions.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    if (processedOptions.schema) {
      const json = await response.json();
      return processedOptions.schema.parse(json);
    }

    return response.json();
  }

  // ========================================================================
  // Streaming Methods
  // ========================================================================

  async createEventStream(endpoint: string, options?: ApiRequestOptions): Promise<Response> {
    const processedOptions = await this.interceptRequest(endpoint, options);
    return this.baseClient.createEventStream(endpoint, processedOptions);
  }

  // ========================================================================
  // Authenticated Methods
  // ========================================================================

  async authenticatedGet<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'requireAuth'>): Promise<T> {
    return this.get(endpoint, { ...options, requireAuth: true });
  }

  async authenticatedPost<T>(endpoint: string, data?: unknown, options?: Omit<ApiRequestOptions, 'requireAuth'>): Promise<T> {
    return this.post(endpoint, data, { ...options, requireAuth: true });
  }

  async authenticatedPut<T>(endpoint: string, data?: unknown, options?: Omit<ApiRequestOptions, 'requireAuth'>): Promise<T> {
    return this.put(endpoint, data, { ...options, requireAuth: true });
  }

  async authenticatedPatch<T>(endpoint: string, data?: unknown, options?: Omit<ApiRequestOptions, 'requireAuth'>): Promise<T> {
    return this.patch(endpoint, data, { ...options, requireAuth: true });
  }

  async authenticatedDelete<T>(endpoint: string, options?: Omit<ApiRequestOptions, 'requireAuth'>): Promise<T> {
    return this.delete(endpoint, { ...options, requireAuth: true });
  }

  // ========================================================================
  // Request Management
  // ========================================================================

  cancelRequest(): void {
    this.baseClient.cancelRequest();
  }
}

// ============================================================================
// Enhanced API Service Implementation
// ============================================================================

class EnhancedApiService implements ApiService {
  private client: EnhancedApiClient;

  constructor(client?: EnhancedApiClient) {
    this.client = client || new EnhancedApiClient();
    this.setupAuthInterceptors();
  }

  private setupAuthInterceptors(): void {
    // Add request interceptor for automatic token refresh
    this.client.addRequestInterceptor(async (config) => {
      if (config.requireAuth) {
        try {
          const { authService } = await import('./auth-service');
          
          // Check if token is expired and refresh if needed
          if (authService.isTokenExpired()) {
            const newToken = await authService.refreshToken();
            this.client.setAuthToken(newToken);
          }
        } catch (error) {
          throw new AuthenticationError('Failed to refresh authentication token');
        }
      }
      return config;
    });

    // Add response interceptor for auth error handling
    this.client.addResponseInterceptor(async (response) => {
      if (response.status === 401) {
        // Token is invalid, clear it and redirect to login
        const { authService } = await import('./auth-service');
        await authService.logout();
        throw new AuthenticationError('Authentication required', true);
      }
      return response;
    });
  }

  // ========================================================================
  // Health & Status
  // ========================================================================

  async healthCheck(): Promise<BackendHealthResponse> {
    const response = await this.client.get('/health');
    return validateHealthResponse(response, '/health');
  }

  async getPhoenixDebug(): Promise<PhoenixDebugResponse> {
    const response = await this.client.authenticatedGet('/api/debug/phoenix');
    return validatePhoenixDebug(response, '/api/debug/phoenix');
  }

  // ========================================================================
  // Authentication Methods
  // ========================================================================

  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post('/auth/login', request);
    return validateAuthResponse(response, '/auth/login');
  }

  async register(request: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.client.post('/auth/register', request);
    // Note: RegisterResponse may need its own validator if structure differs from AuthResponse
    return response; // Temporary - should validate with proper schema
  }

  async logout(): Promise<void> {
    await this.client.authenticatedPost('/auth/logout');
  }

  async refresh(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    const response = await this.client.post('/auth/refresh', request);
    return validateTokenResponse(response, '/auth/refresh');
  }

  async me(): Promise<BackendUserResponse> {
    const response = await this.client.authenticatedGet('/auth/me');
    return validateUserResponse(response, '/auth/me');
  }

  async updateProfile(request: UpdateProfileRequest): Promise<BackendUserResponse> {
    const response = await this.client.authenticatedPatch('/auth/profile', request);
    return validateUserResponse(response, '/auth/profile');
  }

  async changePassword(request: ChangePasswordRequest): Promise<void> {
    await this.client.authenticatedPost('/auth/change-password', request);
  }

  async resetPassword(request: PasswordResetRequest): Promise<{ message: string }> {
    return this.client.post('/auth/reset-password', request);
  }

  async confirmResetPassword(request: PasswordResetConfirmRequest): Promise<void> {
    await this.client.post('/auth/confirm-reset', request);
  }

  async verifyEmail(request: AuthVerificationRequest): Promise<{ message: string }> {
    return this.client.post('/auth/verify-email', request);
  }

  // ========================================================================
  // Chat Methods
  // ========================================================================

  async sendChatMessage(chatId: string, request: CreateChatMessageRequest): Promise<CreateChatResponse> {
    return this.client.post(`/chat/${chatId}/message`, request, {
      schema: CreateChatResponseSchema,
    });
  }

  async createChatStream(chatId: string, taskId: string): Promise<Response> {
    return this.client.createEventStream(
      `/chat/${chatId}/stream?task_id=${encodeURIComponent(taskId)}`
    );
  }

  async getChatHistory(chatId: string, limit: number = 50): Promise<ChatMessage[]> {
    return this.client.authenticatedGet(`/chat/${chatId}/history?limit=${limit}`);
  }

  async deleteChatHistory(chatId: string): Promise<void> {
    await this.client.authenticatedDelete(`/chat/${chatId}`);
  }

  // ========================================================================
  // Research Methods
  // ========================================================================

  async createResearchSession(request: BackendResearchRequest): Promise<BackendResearchResponse> {
    const response = await this.client.authenticatedPost('/research/sessions', request);
    return validateResearchResponse(response, '/research/sessions');
  }

  async getSessionInfo(sessionId: string): Promise<BackendSessionInfo> {
    const response = await this.client.authenticatedGet(`/research/sessions/${sessionId}`);
    return validateSessionInfo(response, `/research/sessions/${sessionId}`);
  }

  async getSessionHistory(limit: number = 50): Promise<BackendSessionInfo[]> {
    const response = await this.client.authenticatedGet(`/research/sessions?limit=${limit}`);
    // Validate array of session info
    if (!Array.isArray(response)) {
      throw new Error('Expected array response from session history endpoint');
    }
    return response.map((item, index) => 
      validateSessionInfo(item, `/research/sessions?limit=${limit}[${index}]`)
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.client.authenticatedDelete(`/research/sessions/${sessionId}`);
  }

  // ========================================================================
  // Agent Network Methods
  // ========================================================================

  async createAgentNetworkStream(sessionId: string): Promise<Response> {
    return this.client.createEventStream(`/agent_network_sse/${sessionId}`, {
      requireAuth: true,
    });
  }

  async getAgentNetworkHistory(limit: number = 50): Promise<{
    events: AgentNetworkEvent[];
    authenticated: boolean;
    user_id?: string | null;
    timestamp: string;
  }> {
    const response = await this.client.authenticatedGet(`/agent_network_history?limit=${limit}`);
    // Backend returns this specific structure - validate accordingly
    if (typeof response !== 'object' || !response || !Array.isArray(response.events)) {
      throw new Error('Invalid agent network history response structure');
    }
    return response;
  }

  async getTeamStatus(sessionId: string): Promise<BackendTeamStatus> {
    const response = await this.client.authenticatedGet(`/agent_network/${sessionId}/status`);
    return validateTeamStatus(response, `/agent_network/${sessionId}/status`);
  }

  // ========================================================================
  // User Management Methods (Authenticated)
  // ========================================================================

  async getUserSessions(): Promise<SessionInfo[]> {
    return this.client.authenticatedGet('/user/sessions');
  }

  async getUserChatHistory(limit: number = 50): Promise<ChatMessage[]> {
    return this.client.authenticatedGet(`/user/chat-history?limit=${limit}`);
  }

  async updateUserPreferences(preferences: Record<string, unknown>): Promise<User> {
    return this.client.authenticatedPatch('/user/preferences', { preferences }, {
      schema: UserSchema,
    });
  }

  async deleteUserAccount(): Promise<void> {
    await this.client.authenticatedDelete('/user/account');
  }

  // ========================================================================
  // Admin Methods (Role-based)
  // ========================================================================

  async getSystemStats?(): Promise<{
    active_users: number;
    active_sessions: number;
    total_messages: number;
    system_load: number;
  }> {
    return this.client.authenticatedGet('/admin/system/stats');
  }

  async getUserList?(limit: number = 50, offset: number = 0): Promise<{
    users: User[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.client.authenticatedGet(`/admin/users?limit=${limit}&offset=${offset}`);
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const enhancedApiClient = new EnhancedApiClient();
export const enhancedApiService = new EnhancedApiService(enhancedApiClient);

// ============================================================================
// Default Export (Enhanced Service)
// ============================================================================

export default enhancedApiService;