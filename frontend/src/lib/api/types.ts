/**
 * TypeScript types for Vana API integration
 * Generated from FastAPI backend analysis
 */

// Generic API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Authentication Types
export interface User {
  id: number;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  is_verified: boolean;
  is_superuser: boolean;
  google_cloud_identity?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
  roles: Role[];
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  permissions: Permission[];
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: Token;
}

// Authentication Request Types
export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
  grant_type?: 'password';
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  new_password: string;
}

export interface GoogleCloudIdentity {
  id_token: string;
  access_token?: string;
}

export interface GoogleOAuthCallbackRequest {
  code: string;
  state?: string;
}

// Research and Agent Types
export interface AgentStatus {
  agent_id: string;
  agent_type: string;
  name: string;
  status: 'current' | 'waiting' | 'completed' | 'error';
  progress: number; // 0.0-1.0
  current_task?: string;
  results?: Record<string, any>;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface ResearchProgress {
  session_id: string;
  status: 'initializing' | 'running' | 'completed' | 'error';
  overall_progress: number; // 0.0-1.0
  current_phase: string;
  agents: AgentStatus[];
  partial_results?: Record<string, any>;
  final_report?: string;
  error?: string;
  started_at: string;
  updated_at: string;
}

export interface ResearchRequest {
  query: string;
  message?: string;
}

export interface ResearchResponse {
  success: boolean;
  session_id: string;
  message: string;
  timestamp: string;
}

// SSE Event Types
export interface SSEEvent {
  type: string;
  data: Record<string, any>;
  id?: string;
  retry?: number;
}

export interface AgentNetworkEvent extends SSEEvent {
  type:
    | 'agent_network_update'
    | 'agent_network_snapshot'
    | 'agent_start'
    | 'agent_complete'
    | 'agent_network_connection'
    | 'keepalive'
    | 'connection'
    | 'error'
    | 'message_chunk'
    | 'message_complete'
    | 'message'
    | 'research_started'
    | 'research_progress'
    | 'research_update'
    | 'research_complete'
    | 'message_edited'
    | 'message_deleted'
    | 'feedback_received'
    | 'regeneration_progress'
    | 'stream_complete';
  data: {
    sessionId?: string;
    status?: string;
    agents?: AgentStatus[];
    progress?: ResearchProgress;
    message?: string;
    chunk?: string;
    timestamp: string;
    authenticated?: boolean;
    userId?: number;
    // Research progress fields
    current_phase?: string;
    overall_progress?: number;
    partial_results?: Record<string, any>;
    final_report?: string;
    error?: string;
    // For message_edited event
    messageId?: string;
    newContent?: string;
    // For feedback_received event
    feedback?: 'upvote' | 'downvote' | null;
    // For regeneration_progress event
    thoughtProcess?: string;
    regenerationStep?: string;
    // Phase 3: ADK canonical event fields (when NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true)
    author?: string;
    textParts?: string[];
    thoughtParts?: string[];
    functionCalls?: Array<{
      name: string;
      args: Record<string, unknown>;
      id: string;
    }>;
    functionResponses?: Array<{
      name: string;
      response: Record<string, unknown>;
      id: string;
    }>;
    isAgentTransfer?: boolean;
    transferTargetAgent?: string;
    isFinalResponse?: boolean;
    _raw?: any; // Raw ADK event for debugging
    // Legacy event fields (for backward compatibility)
    content?: string;
    text?: string;
    role?: string;
    kind?: string;
    completed?: boolean;
    sources?: Array<{ url: string; title?: string }>;
    id?: string;
  };
}

export interface ConnectionEvent extends SSEEvent {
  type: 'connection';
  data: {
    status: 'connected' | 'disconnected';
    sessionId: string;
    timestamp: string;
    authenticated: boolean;
    userId?: number;
  };
}

// Health Check Types
export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
  environment: string | Record<string, any>;
  session_storage_enabled: boolean;
  session_storage_uri?: string;
  session_storage_bucket?: string;
  system_metrics: Record<string, any>;
  dependencies: Record<string, any>;
  response_time_ms: number;
  active_adk_sessions: number;
  uptime_check: string;
}

// Feedback Types
export interface Feedback {
  type: string;
  message: string;
  rating?: number;
  metadata?: Record<string, any>;
}

export interface FeedbackResponse {
  status: string;
}

// API Error Types
export interface APIError {
  detail: string;
  status_code: number;
  headers?: Record<string, string>;
}

// Environment Configuration
export interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Session Management
export interface SessionInfo {
  sessionId: string;
  userId?: number;
  created_at: string;
  last_activity: string;
  status: 'active' | 'inactive' | 'expired';
}

export interface SessionSummary {
  id: string;
  created_at: string;
  updated_at: string;
  status?: string;
  title?: string | null;
  user_id?: number | null;
  progress?: number | null;
  current_phase?: string | null;
  final_report?: string | null;
  error?: string | null;
}

export interface SessionDetail extends SessionSummary {
  messages: ChatMessage[];
  authenticated?: boolean;
}

export interface SessionListResponse {
  sessions: SessionSummary[];
  count: number;
  timestamp: string;
  authenticated?: boolean;
}

/**
 * Response from session creation endpoint (Phase 3.3)
 * Backend generates session ID before message submission.
 */
export interface SessionCreationResult {
  success: boolean;
  session_id: string;
  app_name: string;
  user_id: string;
  created_at: string;
}

// Chat Integration Types
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface StreamingResponse {
  chunk?: string;
  messageId?: string;
  complete?: boolean;
  agents?: AgentStatus[];
  error?: string;
}

// Chat Actions Types
export interface MessageOperationResponse {
  success: boolean;
  message_id: string;
  session_id: string;
  operation: string;
  timestamp: string;
  data?: Record<string, any>;
  error?: string;
}

export interface MessageFeedbackResponse {
  success: boolean;
  feedback_id: string;
  message_id: string;
  session_id: string;
  timestamp: string;
}
