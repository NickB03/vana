/**
 * Authentication Types for Vana AI Research Platform
 * 
 * Comprehensive TypeScript definitions matching backend Pydantic models
 * Provides strict type safety for the entire authentication flow
 */

import { JwtPayload } from 'jwt-decode';

// ============================================================================
// Core User & Authentication Models (matching backend Pydantic models)
// ============================================================================

/**
 * User Profile interface matching backend UserProfile model
 */
export interface User {
  user_id: string;
  username: string;
  email: string | null;
  created_at: string; // ISO datetime string
  preferences: Record<string, unknown>;
  subscription_tier: 'free' | 'pro' | 'enterprise';
}

/**
 * Authentication Token interface matching backend AuthToken model
 */
export interface AuthToken {
  access_token: string;
  token_type: 'bearer';
  expires_in: number; // seconds
  refresh_token?: string;
}

/**
 * JWT Token Payload interface with standard claims + custom fields
 */
export interface VanaJwtPayload extends JwtPayload {
  // Standard JWT claims
  sub: string; // user_id
  exp: number; // expiration timestamp
  iat: number; // issued at timestamp
  
  // Vana-specific claims
  user_id: string;
  username: string;
  email?: string;
  subscription_tier: User['subscription_tier'];
  roles: string[];
  permissions: string[];
}

/**
 * Authentication state for application-wide state management
 */
export interface AuthState {
  // Authentication status
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // User data
  user: User | null;
  token: string | null;
  tokenExpiry: number | null; // timestamp
  
  // Session management
  lastActivity: number; // timestamp
  refreshTokenExpiry: number | null; // timestamp
  
  // Error handling
  error: string | null;
  
  // Feature flags
  requireAuth: boolean;
  autoRefresh: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

/**
 * Login response payload
 */
export interface LoginResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  refresh_token?: string;
  user: User;
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
  preferences?: Record<string, unknown>;
}

/**
 * Registration response payload
 */
export interface RegisterResponse {
  user: User;
  message: string;
  requires_verification: boolean;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
  confirm_password: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * Update profile request
 */
export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  preferences?: Record<string, unknown>;
}

/**
 * Auth verification request
 */
export interface AuthVerificationRequest {
  token: string;
  type: 'email_verification' | 'password_reset';
}

// ============================================================================
// Authentication Context Types
// ============================================================================

/**
 * Authentication context value type
 */
export interface AuthContextType extends AuthState {
  // State properties inherited from AuthState
  
  // Actions
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  
  // Profile management
  updateProfile: (data: UpdateProfileRequest) => Promise<User>;
  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  
  // Session management
  checkAuthStatus: () => Promise<boolean>;
  extendSession: () => void;
  clearError: () => void;
  
  // Utilities
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isTokenExpired: () => boolean;
  getTimeToExpiry: () => number; // seconds
}

// ============================================================================
// Authentication Hook Types
// ============================================================================

/**
 * UseAuth hook return type
 */
export interface UseAuthReturn extends AuthContextType {}

/**
 * UseAuthForm hook return type for form handling
 */
export interface UseAuthFormReturn<T extends Record<string, unknown>> {
  // Form state
  isSubmitting: boolean;
  errors: Partial<Record<keyof T, string>>;
  
  // Form actions
  handleSubmit: (data: T) => Promise<void>;
  setError: (field: keyof T, message: string) => void;
  clearErrors: () => void;
  
  // Validation
  validate: (data: T) => Record<keyof T, string>;
}

/**
 * UseProtectedRoute hook return type
 */
export interface UseProtectedRouteReturn {
  isAllowed: boolean;
  isLoading: boolean;
  redirectTo: string | null;
  error: string | null;
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for protected components
 */
export interface ProtectedComponentProps {
  children: React.ReactNode;
  
  // Access control
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  
  // Fallback components
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
  
  // Redirect options
  redirectTo?: string;
  redirectOnUnauthorized?: boolean;
}

/**
 * Props for auth-aware components
 */
export interface AuthAwareProps {
  showIfAuthenticated?: boolean;
  showIfUnauthenticated?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

/**
 * Login form component props
 */
export interface LoginFormProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
  redirectTo?: string;
  showRegisterLink?: boolean;
  showRememberMe?: boolean;
  className?: string;
}

/**
 * Register form component props
 */
export interface RegisterFormProps {
  onSuccess?: (user: User) => void;
  onError?: (error: string) => void;
  redirectTo?: string;
  showLoginLink?: boolean;
  className?: string;
}

// ============================================================================
// Route Protection Types
// ============================================================================

/**
 * Route configuration for protected routes
 */
export interface RouteConfig {
  path: string;
  requireAuth: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  redirectTo?: string;
}

/**
 * Auth guard configuration
 * @deprecated Use AuthGuardProps from '@/components/auth/auth-guard' instead
 */
export interface AuthGuardConfig {
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallbackPath?: string;
  onUnauthorized?: () => void;
}

// ============================================================================
// Storage & Persistence Types
// ============================================================================

/**
 * Token storage interface
 */
export interface TokenStorage {
  getToken: () => string | null;
  setToken: (token: string, expiry?: number) => void;
  removeToken: () => void;
  getRefreshToken: () => string | null;
  setRefreshToken: (token: string, expiry?: number) => void;
  removeRefreshToken: () => void;
  clear: () => void;
}

/**
 * Session storage data
 */
export interface SessionData {
  user: User;
  token: string;
  tokenExpiry: number;
  refreshToken?: string;
  refreshTokenExpiry?: number;
  lastActivity: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Authentication error types
 */
export type AuthErrorType = 
  | 'INVALID_CREDENTIALS'
  | 'TOKEN_EXPIRED' 
  | 'INVALID_TOKEN'
  | 'REFRESH_FAILED'
  | 'NETWORK_ERROR'
  | 'UNAUTHORIZED'
  | 'USER_NOT_FOUND'
  | 'EMAIL_NOT_VERIFIED'
  | 'ACCOUNT_LOCKED'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Authentication error interface
 */
export interface AuthError {
  type: AuthErrorType;
  message: string;
  field?: string; // For validation errors
  code?: string; // Backend error code
  statusCode?: number; // HTTP status
  retryable?: boolean;
  retryAfter?: number; // seconds
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Generic async operation state
 */
export interface AsyncOperationState<T = unknown> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Auth-related API endpoints
 */
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  UPDATE_PROFILE: '/auth/profile',
  CHANGE_PASSWORD: '/auth/change-password',
  RESET_PASSWORD: '/auth/reset-password',
  CONFIRM_RESET: '/auth/confirm-reset',
  VERIFY_EMAIL: '/auth/verify-email',
} as const;

/**
 * Token storage keys
 */
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'vana_auth_token',
  REFRESH_TOKEN: 'vana_refresh_token',
  USER_DATA: 'vana_user_data',
  LAST_ACTIVITY: 'vana_last_activity',
  AUTH_STATE: 'vana_auth_state',
} as const;

/**
 * Default auth configuration
 */
export const DEFAULT_AUTH_CONFIG = {
  TOKEN_REFRESH_THRESHOLD: 300, // 5 minutes before expiry
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000, // 24 hours
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  AUTO_REFRESH_ENABLED: true,
  REQUIRE_EMAIL_VERIFICATION: false,
} as const;

// ============================================================================
// Type Guards & Validation
// ============================================================================

/**
 * Type guard for User
 */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as User).user_id === 'string' &&
    typeof (value as User).username === 'string' &&
    (typeof (value as User).email === 'string' || (value as User).email === null) &&
    typeof (value as User).created_at === 'string' &&
    typeof (value as User).preferences === 'object' &&
    ['free', 'pro', 'enterprise'].includes((value as User).subscription_tier)
  );
}

/**
 * Type guard for AuthToken
 */
export function isAuthToken(value: unknown): value is AuthToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as AuthToken).access_token === 'string' &&
    (value as AuthToken).token_type === 'bearer' &&
    typeof (value as AuthToken).expires_in === 'number'
  );
}

/**
 * Type guard for JWT payload
 */
export function isVanaJwtPayload(value: unknown): value is VanaJwtPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as VanaJwtPayload).sub === 'string' &&
    typeof (value as VanaJwtPayload).user_id === 'string' &&
    typeof (value as VanaJwtPayload).exp === 'number' &&
    typeof (value as VanaJwtPayload).iat === 'number'
  );
}

// ============================================================================
// Export all types for easy importing
// ============================================================================

export type {
  // Re-export commonly used types at the top level
  User as UserProfile, // Alias for backward compatibility
  LoginRequest as AuthLoginRequest,
  LoginResponse as AuthLoginResponse,
  AuthState as AuthenticationState,
};