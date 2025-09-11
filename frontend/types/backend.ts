/**
 * Backend API Types for Vana AI Research Platform
 * 
 * Comprehensive TypeScript interfaces that EXACTLY match backend Pydantic models
 * Provides 100% type compatibility between Python backend and TypeScript frontend
 * 
 * This file contains:
 * - Core research and session models
 * - Authentication and user management models
 * - Health check and system metrics models
 * - Agent network and team status models
 * - Complete error handling types
 * - Utility types and constants
 */

// ============================================================================
// Core Research Models (matching app/models.py)
// ============================================================================

/**
 * Research request model matching backend ResearchRequest
 */
export interface ResearchRequest {
  query: string; // min_length=1, max_length=2000
  session_id?: string | null;
  user_id?: string | null;
  preferences?: Record<string, any> | null;
}

/**
 * Research response model matching backend ResearchResponse
 */
export interface ResearchResponse {
  session_id: string;
  status: string;
  message: string;
  progress?: number | null; // 0-100
  data?: Record<string, any> | null;
  timestamp: string; // ISO datetime string
}

/**
 * Session information model matching backend SessionInfo
 */
export interface SessionInfo {
  session_id: string;
  user_id?: string | null;
  created_at: string; // ISO datetime string
  last_active: string; // ISO datetime string
  status: string;
  query?: string | null;
  progress: number;
  results?: Record<string, any> | null;
}

/**
 * Error response model matching backend ErrorResponse
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, any> | null;
  timestamp: string; // ISO datetime string
}

// ============================================================================
// Environment and System Models
// ============================================================================

/**
 * Environment information model matching backend EnvironmentInfo
 */
export interface EnvironmentInfo {
  current: string;
  source: string;
  migration_complete?: boolean | null;
  phase?: string | null;
  conflicts?: string[] | null;
}

/**
 * System metrics model matching backend SystemMetrics
 */
export interface SystemMetrics {
  memory?: Record<string, any> | null;
  disk?: Record<string, any> | null;
  cpu_percent?: number | null;
  load_average?: [number, number, number] | null;
  error?: string | null;
}

/**
 * Dependency status model matching backend DependencyStatus
 */
export interface DependencyStatus {
  google_api_configured: boolean;
  session_storage: boolean;
  cloud_logging: boolean;
  project_id: string;
}

/**
 * Enhanced health response model matching backend HealthResponse
 */
export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  environment: EnvironmentInfo | string;
  session_storage_enabled?: boolean | null;
  session_storage_uri?: string | null;
  session_storage_bucket?: string | null;
  system_metrics?: SystemMetrics | null;
  dependencies?: DependencyStatus | null;
  response_time_ms?: number | null;
  active_chat_tasks?: number | null;
  uptime_check?: string | null;
  uptime?: number | null;
}

// ============================================================================
// Agent Network Models
// ============================================================================

/**
 * Agent status model matching backend AgentStatus
 */
export interface AgentStatus {
  agent_id: string;
  name: string;
  status: string;
  task?: string | null;
  progress: number;
  last_update: string; // ISO datetime string
}

/**
 * Team status model matching backend TeamStatus
 */
export interface TeamStatus {
  session_id: string;
  team_status: string;
  agents: AgentStatus[];
  progress: number;
  current_phase?: string | null;
  estimated_completion?: string | null; // ISO datetime string
}

// ============================================================================
// Authentication Models (matching app/models.py)
// ============================================================================

/**
 * Authentication token model matching backend AuthToken
 */
export interface AuthToken {
  access_token: string;
  token_type: string; // "bearer"
  expires_in: number; // seconds
  refresh_token?: string | null;
}

/**
 * User profile model matching backend UserProfile
 */
export interface UserProfile {
  user_id: string;
  username: string;
  email?: string | null;
  created_at: string; // ISO datetime string
  preferences: Record<string, any>;
  subscription_tier: string; // "free"
}

// ============================================================================
// Authentication Schema Models (matching app/auth/schemas.py)
// ============================================================================

/**
 * Permission model matching backend Permission
 */
export interface Permission {
  id: number;
  name: string;
  description?: string | null;
  resource: string;
  action: string;
  created_at: string; // ISO datetime string
}

/**
 * Permission base model for creating permissions
 */
export interface PermissionBase {
  name: string;
  description?: string | null;
  resource: string;
  action: string;
}

/**
 * Role model matching backend Role
 */
export interface Role {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  created_at: string; // ISO datetime string
  permissions: Permission[];
}

/**
 * Role base model for creating/updating roles
 */
export interface RoleBase {
  name: string;
  description?: string | null;
  is_active: boolean;
}

/**
 * Role creation model matching backend RoleCreate
 */
export interface RoleCreate extends RoleBase {
  permission_ids?: number[] | null;
}

/**
 * Role update model matching backend RoleUpdate
 */
export interface RoleUpdate {
  name?: string | null;
  description?: string | null;
  is_active?: boolean | null;
  permission_ids?: number[] | null;
}

/**
 * User base model matching backend UserBase
 */
export interface UserBase {
  email: string; // EmailStr in backend
  username: string; // min_length=3, max_length=50
  first_name?: string | null; // max_length=50
  last_name?: string | null; // max_length=50
  is_active: boolean;
  is_verified: boolean;
}

/**
 * User creation model matching backend UserCreate
 */
export interface UserCreate extends UserBase {
  password: string; // min_length=8
}

/**
 * User update model matching backend UserUpdate
 */
export interface UserUpdate {
  email?: string | null;
  username?: string | null; // min_length=3, max_length=50
  first_name?: string | null; // max_length=50
  last_name?: string | null; // max_length=50
  password?: string | null; // min_length=8
  role_ids?: number[] | null;
}

/**
 * User response model matching backend UserResponse
 */
export interface UserResponse extends UserBase {
  id: number;
  full_name: string;
  is_superuser: boolean;
  google_cloud_identity?: string | null;
  last_login?: string | null; // ISO datetime string
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
  roles: Role[];
}

/**
 * User login model matching backend UserLogin
 */
export interface UserLogin {
  username: string; // Username or email
  password: string;
}

/**
 * JWT token model matching backend Token
 */
export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string; // "bearer"
  expires_in: number; // seconds
}

/**
 * Token data model matching backend TokenData
 */
export interface TokenData {
  user_id?: number | null;
  username?: string | null;
  email?: string | null;
  scopes: string[];
}

/**
 * Refresh token request matching backend RefreshTokenRequest
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Password reset request matching backend PasswordResetRequest
 */
export interface PasswordResetRequest {
  email: string; // EmailStr
}

/**
 * Password reset model matching backend PasswordReset
 */
export interface PasswordReset {
  token: string;
  new_password: string; // min_length=8
}

/**
 * Change password model matching backend ChangePassword
 */
export interface ChangePassword {
  current_password: string;
  new_password: string; // min_length=8
}

/**
 * Google Cloud identity model matching backend GoogleCloudIdentity
 */
export interface GoogleCloudIdentity {
  id_token: string;
  access_token?: string | null;
}

/**
 * API key creation model matching backend ApiKeyCreate
 */
export interface ApiKeyCreate {
  name: string;
  scopes: string[];
  expires_in_days?: number | null;
}

/**
 * API key response model matching backend ApiKeyResponse
 */
export interface ApiKeyResponse {
  id: number;
  name: string;
  key: string; // Only shown once
  scopes: string[];
  expires_at?: string | null; // ISO datetime string
  created_at: string; // ISO datetime string
}

/**
 * OAuth2 error response matching backend OAuth2ErrorResponse
 */
export interface OAuth2ErrorResponse {
  error: string;
  error_description?: string | null;
  error_uri?: string | null;
}

/**
 * OAuth2 token request matching backend OAuth2TokenRequest
 */
export interface OAuth2TokenRequest {
  grant_type: string;
  username: string;
  password: string;
  scope?: string | null;
}

/**
 * Auth response model matching backend AuthResponse
 */
export interface AuthResponse {
  user: UserResponse;
  tokens: Token;
}

/**
 * Google OAuth callback request matching backend GoogleOAuthCallbackRequest
 */
export interface GoogleOAuthCallbackRequest {
  code: string;
  state: string;
}

// ============================================================================
// Utility Models (matching app/utils/typing.py)
// ============================================================================

/**
 * Chat request model matching backend Request
 */
export interface ChatRequest {
  message: any; // Content type from Google GenAI
  events: any[]; // Event array from Google ADK
  user_id: string;
  session_id: string;
}

/**
 * Feedback model matching backend Feedback
 */
export interface Feedback {
  score: number; // int | float
  text?: string | null;
  invocation_id: string;
  log_type: 'feedback';
  service_name: 'vana';
  user_id: string;
}

// ============================================================================
// Type Aliases (matching backend constants)
// ============================================================================

export type JSONData = Record<string, any>;
export type QueryData = string | Record<string, any>;
export type ResponseData = Record<string, any> | any[] | string | number | boolean;
export type ModelType = string;
export type HealthResponseData = Record<string, string | boolean | number | EnvironmentInfo | null>;

// ============================================================================
// Environment Configuration Types
// ============================================================================

/**
 * Environment configuration interface for runtime settings
 */
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'production' | 'test';
  REACT_APP_API_BASE_URL: string;
  REACT_APP_BACKEND_URL: string;
  REACT_APP_DEBUG_ENABLED?: string;
  REACT_APP_PHOENIX_DEBUG_ENABLED?: string;
}

/**
 * Debug configuration based on environment
 */
export interface DebugConfig {
  enabled: boolean;
  phoenixEndpointEnabled: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Runtime application configuration
 */
export interface AppConfig {
  environment: EnvironmentConfig;
  debug: DebugConfig;
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
}

// ============================================================================
// Backend Constants
// ============================================================================

export const BACKEND_CONSTANTS = {
  CRITIC_MODEL: 'gemini-2.5-pro-latest',
  WORKER_MODEL: 'gemini-2.5-flash-latest',
  DEFAULT_SESSION_TIMEOUT: 3600, // 1 hour
  MAX_QUERY_LENGTH: 2000,
  MAX_SESSIONS_PER_USER: 10,
} as const;

// ============================================================================
// Status Enums (derived from backend usage patterns)
// ============================================================================

export type ResearchStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'archived';
export type AgentStatusType = 'active' | 'idle' | 'processing' | 'error';
export type TeamStatusType = 'initializing' | 'active' | 'paused' | 'completed' | 'error';
export type HealthStatusType = 'healthy' | 'degraded' | 'unhealthy';
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type TokenType = 'bearer';

// ============================================================================
// API Endpoint Constants
// ============================================================================

export const BACKEND_ENDPOINTS = {
  // Health
  HEALTH: '/health',
  DEBUG_PHOENIX: '/api/debug/phoenix',
  
  // Research
  RESEARCH_SESSIONS: '/research/sessions',
  
  // Chat
  CHAT_MESSAGE: '/chat/{chat_id}/message',
  CHAT_STREAM: '/chat/{chat_id}/stream',
  
  // Agent Network
  AGENT_NETWORK_SSE: '/agent_network_sse/{session_id}',
  AGENT_NETWORK_HISTORY: '/agent_network_history',
  
  // Feedback
  FEEDBACK: '/feedback',
  
  // Authentication (from schemas)
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_ME: '/auth/me',
  AUTH_PROFILE: '/auth/profile',
  AUTH_CHANGE_PASSWORD: '/auth/change-password',
  AUTH_RESET_PASSWORD: '/auth/reset-password',
  AUTH_CONFIRM_RESET: '/auth/confirm-reset',
  AUTH_VERIFY_EMAIL: '/auth/verify-email',
  AUTH_GOOGLE: '/auth/google',
  
  // User management
  USERS: '/users',
  USER_ROLES: '/users/{user_id}/roles',
  
  // Admin
  ADMIN_USERS: '/admin/users',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_PERMISSIONS: '/admin/permissions',
  ADMIN_SYSTEM_STATS: '/admin/system/stats',
} as const;

// ============================================================================
// Phoenix Debug Endpoint Types
// ============================================================================

/**
 * Phoenix debug response (debug endpoint /api/debug/phoenix)
 */
export interface PhoenixDebugResponse {
  access_code: string;
  service_info: {
    pid: number;
    memory_rss: number;
    memory_vms: number;
    cpu_percent: number;
    create_time: number;
    num_threads: number;
  };
  system_diagnostics: {
    cpu_count: number;
    boot_time: number;
    disk_io?: Record<string, any> | null;
    network_io?: Record<string, any> | null;
  };
  application_state: {
    chat_tasks_count: number;
    active_connections: string;
    session_storage_uri?: string | null;
    bucket_name?: string | null;
    project_id: string;
  };
  environment_secrets: {
    google_api_configured: boolean;
    cloud_logging_enabled: boolean;
    node_env: string;
    ci_environment: boolean;
  };
  timestamp: string; // ISO datetime string
  debug_session: string;
}

// ============================================================================
// Error Types (comprehensive backend error mapping)
// ============================================================================

export interface BackendValidationError {
  field: string;
  message: string;
  code: string;
}

export interface BackendApiError {
  detail: string;
  status_code?: number;
  error_type?: string;
  field_errors?: Record<string, string[]>;
  validation_errors?: BackendValidationError[];
  timestamp?: string;
  request_id?: string;
}

// ============================================================================
// Union Types for API Responses
// ============================================================================

export type BackendUser = UserProfile | UserResponse;
export type BackendAuthTokenType = AuthToken | Token;
export type BackendEnvironment = EnvironmentInfo | string;

// ============================================================================
// Request/Response Wrapper Types
// ============================================================================

export interface BackendApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
  timestamp: string;
}

export interface BackendPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface BackendStreamResponse {
  stream: ReadableStream;
  headers: Record<string, string>;
  status: number;
}

// ============================================================================
// Complex Type Mappings
// ============================================================================

/**
 * Complete backend type mapping for all major entities
 */
export interface BackendTypeMap {
  // Research types
  ResearchRequest: ResearchRequest;
  ResearchResponse: ResearchResponse;
  SessionInfo: SessionInfo;
  
  // Auth types
  UserProfile: UserProfile;
  UserResponse: UserResponse;
  AuthToken: AuthToken;
  Token: Token;
  
  // System types
  HealthResponse: HealthResponse;
  SystemMetrics: SystemMetrics;
  DependencyStatus: DependencyStatus;
  
  // Agent types
  AgentStatus: AgentStatus;
  TeamStatus: TeamStatus;
  
  // Error types
  ErrorResponse: ErrorResponse;
  BackendApiError: BackendApiError;
}

// ============================================================================
// Type Exports for Easy Importing (avoiding conflicts)
// ============================================================================

// Export with Backend prefix to avoid conflicts with existing API types
export type BackendResearchRequest = ResearchRequest;
export type BackendResearchResponse = ResearchResponse;
export type BackendSessionInfo = SessionInfo;
export type BackendUserProfile = UserProfile;
export type BackendUserResponse = UserResponse;
export type BackendAuthToken = AuthToken;
export type BackendToken = Token;
export type BackendHealthResponse = HealthResponse;
export type BackendSystemMetrics = SystemMetrics;
export type BackendAgentStatus = AgentStatus;
export type BackendTeamStatus = TeamStatus;
export type BackendErrorResponse = ErrorResponse;

// Export environment configuration types
export type BackendEnvironmentConfig = EnvironmentConfig;
export type BackendDebugConfig = DebugConfig;
export type BackendAppConfig = AppConfig;