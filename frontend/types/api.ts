/**
 * API Types for Vana AI Research Platform
 * 
 * Central type definitions for all API interactions, including:
 * - Enhanced auth-aware API client types
 * - Error handling and response types
 * - Request/Response interfaces for all endpoints
 * - Type-safe API method signatures
 */

import { z } from 'zod';
import { 
  User, 
  AuthToken, 
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
  AuthVerificationRequest
} from './auth';

// ============================================================================
// Core API Configuration Types
// ============================================================================

export interface ApiClientConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableLogging: boolean;
  requireAuth: boolean;
  autoRefreshTokens: boolean;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  requireAuth?: boolean;
  schema?: z.ZodSchema<any>;
}

// ============================================================================
// Enhanced Error Types
// ============================================================================

export interface ApiErrorResponse {
  detail: string;
  status_code?: number;
  error_type?: string;
  field_errors?: Record<string, string[]>;
  validation_errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  timestamp?: string;
  request_id?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string,
    public fieldErrors?: Record<string, string[]>,
    public validationErrors?: Array<{ field: string; message: string; code: string }>,
    public requestId?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(response: Response, errorData?: ApiErrorResponse): ApiError {
    const message = errorData?.detail || `HTTP ${response.status}: ${response.statusText}`;
    return new ApiError(
      message,
      response.status,
      errorData?.error_type,
      errorData?.field_errors,
      errorData?.validation_errors,
      errorData?.request_id,
    );
  }

  hasFieldErrors(): boolean {
    return !!(this.fieldErrors && Object.keys(this.fieldErrors).length > 0);
  }

  getFieldError(field: string): string | null {
    return this.fieldErrors?.[field]?.[0] || null;
  }

  hasValidationErrors(): boolean {
    return !!(this.validationErrors && this.validationErrors.length > 0);
  }

  getValidationErrorsForField(field: string): Array<{ message: string; code: string }> {
    return this.validationErrors?.filter(error => error.field === field) || [];
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

export class AuthenticationError extends Error {
  constructor(message: string, public shouldRedirectToLogin: boolean = true) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// ============================================================================
// Chat API Types (Enhanced with Auth)
// ============================================================================

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  user_id?: string; // For authenticated chats
}

export interface CreateChatMessageRequest {
  message: string;
  user_id?: string;
  context?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
}

export interface CreateChatResponse {
  task_id: string;
  message_id: string;
  chat_id: string;
  user_id?: string;
  estimated_completion?: number; // seconds
}

export interface StreamingChunk {
  content: string;
  isComplete: boolean;
  messageId?: string;
  timestamp?: string;
  progress?: number; // 0-100
  metadata?: Record<string, unknown>;
}

export interface StreamingResponse {
  content: string;
  isComplete: boolean;
  messageId?: string;
  timestamp?: string;
  error?: string;
  progress?: number;
}

// ============================================================================
// Health Check Types (Enhanced)
// ============================================================================

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string | {
    current: string;
    source: string;
    migration_complete?: boolean;
    phase?: string;
    conflicts?: string[];
  };
  session_storage_enabled?: boolean;
  session_storage_uri?: string;
  session_storage_bucket?: string;
  system_metrics?: {
    memory?: Record<string, any>;
    disk?: Record<string, any>;
    cpu_percent?: number;
    load_average?: [number, number, number];
    error?: string;
  };
  dependencies?: {
    google_api_configured: boolean;
    session_storage: boolean;
    cloud_logging: boolean;
    project_id: string;
    auth_service?: boolean;
    database?: boolean;
  };
  response_time_ms?: number;
  active_chat_tasks?: number;
  uptime_check?: string;
  uptime?: number;
  authenticated_user?: User; // Present if request is authenticated
}

// ============================================================================
// Agent Network Types
// ============================================================================

export interface AgentStatus {
  agent_id: string;
  name: string;
  status: 'active' | 'idle' | 'processing' | 'error';
  task?: string;
  progress: number;
  last_update: string; // ISO datetime
  user_id?: string;
}

export interface TeamStatus {
  session_id: string;
  team_status: 'initializing' | 'active' | 'paused' | 'completed' | 'error';
  agents: AgentStatus[];
  progress: number;
  current_phase?: string;
  estimated_completion?: string; // ISO datetime
  user_id?: string;
}

export interface AgentNetworkEvent {
  event_id: string;
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
  user_id?: string;
  session_id?: string;
}

// ============================================================================
// Research API Types
// ============================================================================

export interface ResearchRequest {
  query: string;
  session_id?: string;
  user_id?: string;
  preferences?: Record<string, unknown>;
  priority?: 'low' | 'medium' | 'high';
  max_results?: number;
}

export interface ResearchResponse {
  session_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  message: string;
  progress?: number;
  data?: Record<string, unknown>;
  timestamp: string;
  user_id?: string;
  estimated_completion?: string;
}

export interface SessionInfo {
  session_id: string;
  user_id?: string;
  created_at: string;
  last_active: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  query?: string;
  progress: number;
  results?: Record<string, unknown>;
  agent_count?: number;
  total_messages?: number;
}

// ============================================================================
// Authentication API Types
// ============================================================================

export interface AuthEndpoints {
  login: (request: LoginRequest) => Promise<LoginResponse>;
  register: (request: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refresh: (request: RefreshTokenRequest) => Promise<RefreshTokenResponse>;
  me: () => Promise<User>;
  updateProfile: (request: UpdateProfileRequest) => Promise<User>;
  changePassword: (request: ChangePasswordRequest) => Promise<void>;
  resetPassword: (request: PasswordResetRequest) => Promise<{ message: string }>;
  confirmResetPassword: (request: PasswordResetConfirmRequest) => Promise<void>;
  verifyEmail: (request: AuthVerificationRequest) => Promise<{ message: string }>;
}

// ============================================================================
// API Client Interface
// ============================================================================

export interface ApiClient {
  // Configuration
  config: ApiClientConfig;
  
  // HTTP methods
  get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T>;
  post<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T>;
  put<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T>;
  patch<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T>;
  delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T>;
  
  // Streaming
  createEventStream(endpoint: string, options?: ApiRequestOptions): Promise<Response>;
  
  // Auth-aware methods
  authenticatedGet<T>(endpoint: string, options?: ApiRequestOptions): Promise<T>;
  authenticatedPost<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T>;
  authenticatedPut<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T>;
  authenticatedPatch<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T>;
  authenticatedDelete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T>;
  
  // Token management
  setAuthToken(token: string): void;
  clearAuthToken(): void;
  refreshAuthToken(): Promise<string>;
  
  // Request management
  cancelRequest(): void;
  setGlobalHeaders(headers: Record<string, string>): void;
}

// ============================================================================
// API Service Interface
// ============================================================================

export interface ApiService extends AuthEndpoints {
  // Health & Status
  healthCheck(): Promise<HealthResponse>;
  
  // Chat functionality
  sendChatMessage(chatId: string, request: CreateChatMessageRequest): Promise<CreateChatResponse>;
  createChatStream(chatId: string, taskId: string): Promise<Response>;
  getChatHistory(chatId: string, limit?: number): Promise<ChatMessage[]>;
  deleteChatHistory(chatId: string): Promise<void>;
  
  // Research functionality
  createResearchSession(request: ResearchRequest): Promise<ResearchResponse>;
  getSessionInfo(sessionId: string): Promise<SessionInfo>;
  getSessionHistory(limit?: number): Promise<SessionInfo[]>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Agent network
  createAgentNetworkStream(sessionId: string): Promise<Response>;
  getAgentNetworkHistory(limit?: number): Promise<{
    events: AgentNetworkEvent[];
    limit: number;
    total?: number;
  }>;
  getTeamStatus(sessionId: string): Promise<TeamStatus>;
  
  // User management (authenticated)
  getUserSessions(): Promise<SessionInfo[]>;
  getUserChatHistory(limit?: number): Promise<ChatMessage[]>;
  updateUserPreferences(preferences: Record<string, unknown>): Promise<User>;
  deleteUserAccount(): Promise<void>;
  
  // Admin functionality (if authorized)
  getSystemStats?(): Promise<{
    active_users: number;
    active_sessions: number;
    total_messages: number;
    system_load: number;
  }>;
  
  getUserList?(limit?: number, offset?: number): Promise<{
    users: User[];
    total: number;
    limit: number;
    offset: number;
  }>;
}

// ============================================================================
// Response Wrapper Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface StreamResponse {
  stream: ReadableStream;
  headers: Record<string, string>;
  status: number;
}

// ============================================================================
// Validation Schemas (Zod)
// ============================================================================

export const CreateChatResponseSchema = z.object({
  task_id: z.string(),
  message_id: z.string(),
  chat_id: z.string(),
  user_id: z.string().optional(),
  estimated_completion: z.number().optional(),
});

export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string(),
  service: z.string(),
  version: z.string(),
  environment: z.union([
    z.string(),
    z.object({
      current: z.string(),
      source: z.string(),
      migration_complete: z.boolean().optional(),
      phase: z.string().optional(),
      conflicts: z.array(z.string()).optional(),
    })
  ]),
  authenticated_user: z.object({
    user_id: z.string(),
    username: z.string(),
    email: z.string().nullable(),
    subscription_tier: z.enum(['free', 'pro', 'enterprise']),
  }).optional(),
  // ... other optional fields
}).passthrough(); // Allow additional fields

export const LoginResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('bearer'),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  user: z.object({
    user_id: z.string(),
    username: z.string(),
    email: z.string().nullable(),
    created_at: z.string(),
    preferences: z.record(z.unknown()),
    subscription_tier: z.enum(['free', 'pro', 'enterprise']),
  }),
});

export const UserSchema = z.object({
  user_id: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  created_at: z.string(),
  preferences: z.record(z.unknown()),
  subscription_tier: z.enum(['free', 'pro', 'enterprise']),
});

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Re-export key types for convenience
  CreateChatResponse,
  HealthResponse,
  LoginResponse as AuthLoginResponse,
  User as ApiUser,
} from './auth';

// Validation schema exports
export {
  CreateChatResponseSchema,
  HealthResponseSchema,
  LoginResponseSchema,
  UserSchema,
};

// Error class exports
export {
  ApiError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
};