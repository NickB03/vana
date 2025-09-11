/**
 * Type Guards for Runtime Validation - Vana AI Research Platform
 * 
 * Provides comprehensive runtime validation for backend types
 * Ensures type safety when receiving data from the API
 * 
 * This file contains:
 * - Type guards for all backend models
 * - Validation helpers for complex types
 * - Utility functions for type checking
 * - Error handling for invalid data
 */

import type {
  // Core research types
  ResearchRequest,
  ResearchResponse,
  SessionInfo,
  ErrorResponse,
  
  // Environment and system types
  EnvironmentInfo,
  SystemMetrics,
  DependencyStatus,
  HealthResponse,
  
  // Agent network types
  AgentStatus,
  TeamStatus,
  
  // Auth types (models.py)
  AuthToken,
  UserProfile,
  
  // Auth schema types
  Permission,
  Role,
  UserBase,
  UserResponse,
  Token,
  TokenData,
  
  // Utility types
  ChatRequest,
  Feedback,
  PhoenixDebugResponse,
  BackendApiError,
  BackendValidationError,
  
  // Status types
  ResearchStatus,
  SessionStatus,
  AgentStatusType,
  TeamStatusType,
  HealthStatusType,
  SubscriptionTier,
  TokenType,
} from '../types/backend';

// ============================================================================
// Utility Type Checking Functions
// ============================================================================

/**
 * Checks if value is a valid ISO datetime string
 */
export function isISODateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value === date.toISOString();
}

/**
 * Checks if value is a valid email string
 */
export function isEmailString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Checks if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Checks if value is a valid number (not NaN, not Infinity)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Checks if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks if value is an array
 */
export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (itemGuard) {
    return value.every(itemGuard);
  }
  return true;
}

// ============================================================================
// Status Type Guards
// ============================================================================

export function isResearchStatus(value: unknown): value is ResearchStatus {
  return typeof value === 'string' && 
    ['queued', 'processing', 'completed', 'failed'].includes(value);
}

export function isSessionStatus(value: unknown): value is SessionStatus {
  return typeof value === 'string' && 
    ['active', 'paused', 'completed', 'archived'].includes(value);
}

export function isAgentStatusType(value: unknown): value is AgentStatusType {
  return typeof value === 'string' && 
    ['active', 'idle', 'processing', 'error'].includes(value);
}

export function isTeamStatusType(value: unknown): value is TeamStatusType {
  return typeof value === 'string' && 
    ['initializing', 'active', 'paused', 'completed', 'error'].includes(value);
}

export function isHealthStatusType(value: unknown): value is HealthStatusType {
  return typeof value === 'string' && 
    ['healthy', 'degraded', 'unhealthy'].includes(value);
}

export function isSubscriptionTier(value: unknown): value is SubscriptionTier {
  return typeof value === 'string' && 
    ['free', 'pro', 'enterprise'].includes(value);
}

export function isTokenType(value: unknown): value is TokenType {
  return value === 'bearer';
}

// ============================================================================
// Core Research Model Type Guards
// ============================================================================

export function isResearchRequest(value: unknown): value is ResearchRequest {
  if (!isObject(value)) return false;
  
  return (
    isNonEmptyString(value.query) &&
    value.query.length <= 2000 &&
    (value.session_id === null || value.session_id === undefined || typeof value.session_id === 'string') &&
    (value.user_id === null || value.user_id === undefined || typeof value.user_id === 'string') &&
    (value.preferences === null || value.preferences === undefined || isObject(value.preferences))
  );
}

export function isResearchResponse(value: unknown): value is ResearchResponse {
  if (!isObject(value)) return false;
  
  return (
    isNonEmptyString(value.session_id) &&
    typeof value.status === 'string' &&
    typeof value.message === 'string' &&
    (value.progress === null || value.progress === undefined || 
     (isValidNumber(value.progress) && value.progress >= 0 && value.progress <= 100)) &&
    (value.data === null || value.data === undefined || isObject(value.data)) &&
    isISODateString(value.timestamp)
  );
}

export function isSessionInfo(value: unknown): value is SessionInfo {
  if (!isObject(value)) return false;
  
  return (
    isNonEmptyString(value.session_id) &&
    (value.user_id === null || value.user_id === undefined || typeof value.user_id === 'string') &&
    isISODateString(value.created_at) &&
    isISODateString(value.last_active) &&
    typeof value.status === 'string' &&
    (value.query === null || value.query === undefined || typeof value.query === 'string') &&
    isValidNumber(value.progress) &&
    (value.results === null || value.results === undefined || isObject(value.results))
  );
}

export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (!isObject(value)) return false;
  
  return (
    typeof value.error === 'string' &&
    typeof value.message === 'string' &&
    (value.details === null || value.details === undefined || isObject(value.details)) &&
    isISODateString(value.timestamp)
  );
}

// ============================================================================
// System Model Type Guards
// ============================================================================

export function isEnvironmentInfo(value: unknown): value is EnvironmentInfo {
  if (!isObject(value)) return false;
  
  return (
    typeof value.current === 'string' &&
    typeof value.source === 'string' &&
    (value.migration_complete === null || value.migration_complete === undefined || 
     typeof value.migration_complete === 'boolean') &&
    (value.phase === null || value.phase === undefined || typeof value.phase === 'string') &&
    (value.conflicts === null || value.conflicts === undefined || 
     isArray(value.conflicts, (item): item is string => typeof item === 'string'))
  );
}

export function isSystemMetrics(value: unknown): value is SystemMetrics {
  if (!isObject(value)) return false;
  
  return (
    (value.memory === null || value.memory === undefined || isObject(value.memory)) &&
    (value.disk === null || value.disk === undefined || isObject(value.disk)) &&
    (value.cpu_percent === null || value.cpu_percent === undefined || isValidNumber(value.cpu_percent)) &&
    (value.load_average === null || value.load_average === undefined || 
     (Array.isArray(value.load_average) && value.load_average.length === 3 && 
      value.load_average.every(isValidNumber))) &&
    (value.error === null || value.error === undefined || typeof value.error === 'string')
  );
}

export function isDependencyStatus(value: unknown): value is DependencyStatus {
  if (!isObject(value)) return false;
  
  return (
    typeof value.google_api_configured === 'boolean' &&
    typeof value.session_storage === 'boolean' &&
    typeof value.cloud_logging === 'boolean' &&
    typeof value.project_id === 'string'
  );
}

export function isHealthResponse(value: unknown): value is HealthResponse {
  if (!isObject(value)) return false;
  
  return (
    typeof value.status === 'string' &&
    typeof value.timestamp === 'string' &&
    typeof value.service === 'string' &&
    typeof value.version === 'string' &&
    (typeof value.environment === 'string' || isEnvironmentInfo(value.environment)) &&
    (value.session_storage_enabled === null || value.session_storage_enabled === undefined || 
     typeof value.session_storage_enabled === 'boolean') &&
    (value.session_storage_uri === null || value.session_storage_uri === undefined || 
     typeof value.session_storage_uri === 'string') &&
    (value.session_storage_bucket === null || value.session_storage_bucket === undefined || 
     typeof value.session_storage_bucket === 'string') &&
    (value.system_metrics === null || value.system_metrics === undefined || 
     isSystemMetrics(value.system_metrics)) &&
    (value.dependencies === null || value.dependencies === undefined || 
     isDependencyStatus(value.dependencies)) &&
    (value.response_time_ms === null || value.response_time_ms === undefined || 
     isValidNumber(value.response_time_ms)) &&
    (value.active_chat_tasks === null || value.active_chat_tasks === undefined || 
     isValidNumber(value.active_chat_tasks)) &&
    (value.uptime_check === null || value.uptime_check === undefined || 
     typeof value.uptime_check === 'string') &&
    (value.uptime === null || value.uptime === undefined || isValidNumber(value.uptime))
  );
}

// ============================================================================
// Agent Network Model Type Guards
// ============================================================================

export function isAgentStatus(value: unknown): value is AgentStatus {
  if (!isObject(value)) return false;
  
  return (
    isNonEmptyString(value.agent_id) &&
    isNonEmptyString(value.name) &&
    typeof value.status === 'string' &&
    (value.task === null || value.task === undefined || typeof value.task === 'string') &&
    isValidNumber(value.progress) &&
    isISODateString(value.last_update)
  );
}

export function isTeamStatus(value: unknown): value is TeamStatus {
  if (!isObject(value)) return false;
  
  return (
    isNonEmptyString(value.session_id) &&
    typeof value.team_status === 'string' &&
    isArray(value.agents, isAgentStatus) &&
    isValidNumber(value.progress) &&
    (value.current_phase === null || value.current_phase === undefined || 
     typeof value.current_phase === 'string') &&
    (value.estimated_completion === null || value.estimated_completion === undefined || 
     isISODateString(value.estimated_completion))
  );
}

// ============================================================================
// Authentication Model Type Guards (models.py)
// ============================================================================

export function isAuthToken(value: unknown): value is AuthToken {
  if (!isObject(value)) return false;
  
  return (
    isNonEmptyString(value.access_token) &&
    typeof value.token_type === 'string' &&
    isValidNumber(value.expires_in) &&
    (value.refresh_token === null || value.refresh_token === undefined || 
     typeof value.refresh_token === 'string')
  );
}

export function isUserProfile(value: unknown): value is UserProfile {
  if (!isObject(value)) return false;
  
  return (
    isNonEmptyString(value.user_id) &&
    isNonEmptyString(value.username) &&
    (value.email === null || value.email === undefined || typeof value.email === 'string') &&
    isISODateString(value.created_at) &&
    isObject(value.preferences) &&
    typeof value.subscription_tier === 'string'
  );
}

// ============================================================================
// Authentication Schema Type Guards
// ============================================================================

export function isPermission(value: unknown): value is Permission {
  if (!isObject(value)) return false;
  
  return (
    isValidNumber(value.id) &&
    isNonEmptyString(value.name) &&
    (value.description === null || value.description === undefined || 
     typeof value.description === 'string') &&
    isNonEmptyString(value.resource) &&
    isNonEmptyString(value.action) &&
    isISODateString(value.created_at)
  );
}

export function isRole(value: unknown): value is Role {
  if (!isObject(value)) return false;
  
  return (
    isValidNumber(value.id) &&
    isNonEmptyString(value.name) &&
    (value.description === null || value.description === undefined || 
     typeof value.description === 'string') &&
    typeof value.is_active === 'boolean' &&
    isISODateString(value.created_at) &&
    isArray(value.permissions, isPermission)
  );
}

export function isUserBase(value: unknown): value is UserBase {
  if (!isObject(value)) return false;
  
  return (
    isEmailString(value.email) &&
    isNonEmptyString(value.username) &&
    value.username.length >= 3 &&
    value.username.length <= 50 &&
    (value.first_name === null || value.first_name === undefined || 
     (typeof value.first_name === 'string' && value.first_name.length <= 50)) &&
    (value.last_name === null || value.last_name === undefined || 
     (typeof value.last_name === 'string' && value.last_name.length <= 50)) &&
    typeof value.is_active === 'boolean' &&
    typeof value.is_verified === 'boolean'
  );
}

export function isUserResponse(value: unknown): value is UserResponse {
  if (!isObject(value)) return false;
  
  return (
    // Check all UserBase properties individually instead of using isUserBase
    isEmailString(value.email) &&
    isNonEmptyString(value.username) &&
    value.username.length >= 3 &&
    value.username.length <= 50 &&
    (value.first_name === null || value.first_name === undefined || 
     (typeof value.first_name === 'string' && value.first_name.length <= 50)) &&
    (value.last_name === null || value.last_name === undefined || 
     (typeof value.last_name === 'string' && value.last_name.length <= 50)) &&
    typeof value.is_active === 'boolean' &&
    typeof value.is_verified === 'boolean' &&
    // Additional UserResponse properties
    isValidNumber(value.id) &&
    isNonEmptyString(value.full_name) &&
    typeof value.is_superuser === 'boolean' &&
    (value.google_cloud_identity === null || value.google_cloud_identity === undefined || 
     typeof value.google_cloud_identity === 'string') &&
    (value.last_login === null || value.last_login === undefined || 
     isISODateString(value.last_login)) &&
    isISODateString(value.created_at) &&
    isISODateString(value.updated_at) &&
    isArray(value.roles, isRole)
  );
}

export function isToken(value: unknown): value is Token {
  if (!isObject(value)) return false;
  
  return (
    isNonEmptyString(value.access_token) &&
    isNonEmptyString(value.refresh_token) &&
    isTokenType(value.token_type) &&
    isValidNumber(value.expires_in)
  );
}

export function isTokenData(value: unknown): value is TokenData {
  if (!isObject(value)) return false;
  
  return (
    (value.user_id === null || value.user_id === undefined || isValidNumber(value.user_id)) &&
    (value.username === null || value.username === undefined || typeof value.username === 'string') &&
    (value.email === null || value.email === undefined || typeof value.email === 'string') &&
    isArray(value.scopes, (item): item is string => typeof item === 'string')
  );
}

// ============================================================================
// Utility Model Type Guards
// ============================================================================

export function isChatRequest(value: unknown): value is ChatRequest {
  if (!isObject(value)) return false;
  
  return (
    value.message !== null &&
    value.message !== undefined &&
    Array.isArray(value.events) &&
    typeof value.user_id === 'string' &&
    typeof value.session_id === 'string'
  );
}

export function isFeedback(value: unknown): value is Feedback {
  if (!isObject(value)) return false;
  
  return (
    isValidNumber(value.score) &&
    (value.text === null || value.text === undefined || typeof value.text === 'string') &&
    isNonEmptyString(value.invocation_id) &&
    value.log_type === 'feedback' &&
    value.service_name === 'vana' &&
    typeof value.user_id === 'string'
  );
}

export function isPhoenixDebugResponse(value: unknown): value is PhoenixDebugResponse {
  if (!isObject(value)) return false;
  
  return (
    typeof value.access_code === 'string' &&
    isObject(value.service_info) &&
    isObject(value.system_diagnostics) &&
    isObject(value.application_state) &&
    isObject(value.environment_secrets) &&
    isISODateString(value.timestamp) &&
    typeof value.debug_session === 'string'
  );
}

// ============================================================================
// Error Type Guards
// ============================================================================

export function isBackendValidationError(value: unknown): value is BackendValidationError {
  if (!isObject(value)) return false;
  
  return (
    typeof value.field === 'string' &&
    typeof value.message === 'string' &&
    typeof value.code === 'string'
  );
}

export function isBackendApiError(value: unknown): value is BackendApiError {
  if (!isObject(value)) return false;
  
  return (
    typeof value.detail === 'string' &&
    (value.status_code === undefined || isValidNumber(value.status_code)) &&
    (value.error_type === undefined || typeof value.error_type === 'string') &&
    (value.field_errors === undefined || isObject(value.field_errors)) &&
    (value.validation_errors === undefined || 
     isArray(value.validation_errors, isBackendValidationError)) &&
    (value.timestamp === undefined || isISODateString(value.timestamp)) &&
    (value.request_id === undefined || typeof value.request_id === 'string')
  );
}

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates and converts unknown data to a typed value, throwing if invalid
 */
export function validateAndConvert<T>(
  data: unknown,
  guard: (value: unknown) => value is T,
  errorMessage?: string
): T {
  if (guard(data)) {
    return data;
  }
  throw new Error(errorMessage || `Invalid data format`);
}

/**
 * Safe validation that returns null if data is invalid
 */
export function safeValidate<T>(
  data: unknown,
  guard: (value: unknown) => value is T
): T | null {
  try {
    return validateAndConvert(data, guard);
  } catch {
    return null;
  }
}

/**
 * Validates API response data with comprehensive error handling
 */
export function validateApiResponse<T>(
  response: unknown,
  guard: (value: unknown) => value is T,
  endpoint?: string
): T {
  if (!response) {
    throw new Error(`Empty response${endpoint ? ` from ${endpoint}` : ''}`);
  }

  // Check if it's an error response first
  if (isBackendApiError(response)) {
    throw new Error(`API Error${endpoint ? ` from ${endpoint}` : ''}: ${response.detail}`);
  }

  return validateAndConvert(
    response,
    guard,
    `Invalid response format${endpoint ? ` from ${endpoint}` : ''}`
  );
}

// ============================================================================
// Export All Type Guards
// ============================================================================

export const typeGuards = {
  // Utility
  isISODateString,
  isEmailString,
  isNonEmptyString,
  isValidNumber,
  isObject,
  isArray,
  
  // Status types
  isResearchStatus,
  isSessionStatus,
  isAgentStatusType,
  isTeamStatusType,
  isHealthStatusType,
  isSubscriptionTier,
  isTokenType,
  
  // Core models
  isResearchRequest,
  isResearchResponse,
  isSessionInfo,
  isErrorResponse,
  
  // System models
  isEnvironmentInfo,
  isSystemMetrics,
  isDependencyStatus,
  isHealthResponse,
  
  // Agent models
  isAgentStatus,
  isTeamStatus,
  
  // Auth models (models.py)
  isAuthToken,
  isUserProfile,
  
  // Auth schema models
  isPermission,
  isRole,
  isUserBase,
  isUserResponse,
  isToken,
  isTokenData,
  
  // Utility models
  isChatRequest,
  isFeedback,
  isPhoenixDebugResponse,
  
  // Error models
  isBackendValidationError,
  isBackendApiError,
} as const;

export default typeGuards;