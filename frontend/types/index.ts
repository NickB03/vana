/**
 * Central Type Exports for Vana AI Research Platform
 * 
 * Provides organized exports of all TypeScript types across the application
 * with proper namespacing and re-exports for easy consumption
 */

// ============================================================================
// Authentication Types
// ============================================================================
export type {
  // Core user and authentication models
  User,
  UserProfile,
  AuthToken,
  VanaJwtPayload,
  AuthState,
  AuthenticationState,
  
  // API request/response types
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  ChangePasswordRequest,
  UpdateProfileRequest,
  AuthVerificationRequest,
  AuthLoginRequest,
  AuthLoginResponse,
  
  // Context and hook types
  AuthContextType,
  UseAuthReturn,
  UseAuthFormReturn,
  UseProtectedRouteReturn,
  
  // Component prop types
  ProtectedComponentProps,
  AuthAwareProps,
  LoginFormProps,
  RegisterFormProps,
  
  // Route protection types
  RouteConfig,
  AuthGuardConfig,
  
  // Storage and persistence types
  TokenStorage,
  SessionData,
  
  // Error types
  AuthError,
  AuthErrorType,
  
  // Utility types
  AsyncOperationState,
} from './auth';

// Export auth constants
export {
  AUTH_ENDPOINTS,
  STORAGE_KEYS,
  DEFAULT_AUTH_CONFIG,
  isUser,
  isAuthToken,
  isVanaJwtPayload,
} from './auth';

// ============================================================================
// API Types
// ============================================================================
export type {
  // Configuration types
  ApiClientConfig,
  ApiRequestOptions,
  
  // Error types
  ApiErrorResponse,
  
  // Chat types
  ChatMessage,
  CreateChatMessageRequest,
  CreateChatResponse,
  StreamingChunk,
  StreamingResponse,
  
  // Health check types
  HealthResponse,
  
  // Agent network types
  AgentStatus,
  TeamStatus,
  AgentNetworkEvent,
  
  // Research types
  ResearchRequest,
  ResearchResponse,
  SessionInfo,
  
  // API interfaces
  AuthEndpoints,
  ApiClient,
  ApiService,
  
  // Response wrapper types
  ApiResponse,
  PaginatedResponse,
  StreamResponse,
  
  // Re-exported types
  ApiUser,
} from './api';

// Export API classes and schemas
export {
  ApiError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  CreateChatResponseSchema,
  HealthResponseSchema,
  LoginResponseSchema,
  UserSchema,
} from './api';

// ============================================================================
// Common Utility Types
// ============================================================================

/**
 * Generic async state wrapper for components
 */
export interface AsyncState<T = unknown, E = string> {
  data: T | null;
  isLoading: boolean;
  error: E | null;
  lastUpdated: number | null;
}

/**
 * Generic form state for form components
 */
export interface FormState<T = Record<string, unknown>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

/**
 * Generic API operation result
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/**
 * Page metadata for SEO and navigation
 */
export interface PageMeta {
  title: string;
  description: string;
  keywords?: string[];
  noIndex?: boolean;
  requireAuth?: boolean;
}

/**
 * Navigation item for menus and sidebars
 */
export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: string;
  children?: NavItem[];
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  badge?: string | number;
  isActive?: boolean;
  isDisabled?: boolean;
}

/**
 * Theme configuration
 */
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: 'sm' | 'md' | 'lg';
  borderRadius: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Notification/Toast configuration
 */
export interface NotificationConfig {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number; // milliseconds, 0 for persistent
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  timestamp?: number;
}

// ============================================================================
// Component Base Types
// ============================================================================

/**
 * Base props for all components
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  id?: string;
  testId?: string;
}

/**
 * Props for components that can be disabled/loading
 */
export interface StatefulComponentProps extends BaseComponentProps {
  isLoading?: boolean;
  isDisabled?: boolean;
  error?: string;
}

/**
 * Props for interactive components
 */
export interface InteractiveComponentProps extends StatefulComponentProps {
  onClick?: (event: React.MouseEvent) => void;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

/**
 * Props for form input components
 */
export interface FormInputProps extends InteractiveComponentProps {
  name: string;
  value?: string | number | boolean;
  defaultValue?: string | number | boolean;
  onChange?: (value: any, event?: React.ChangeEvent) => void;
  onValidate?: (value: any) => string | null;
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
}

// ============================================================================
// Environment Configuration Types
// ============================================================================

/**
 * Environment variables interface
 */
export interface EnvironmentConfig {
  // API Configuration
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_API_TIMEOUT: string;
  NEXT_PUBLIC_API_RETRY_ATTEMPTS: string;
  NEXT_PUBLIC_API_RETRY_DELAY: string;
  
  // Authentication
  NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH: string;
  
  // Feature flags
  NEXT_PUBLIC_ENABLE_AUTH: string;
  NEXT_PUBLIC_ENABLE_ANALYTICS: string;
  NEXT_PUBLIC_ENABLE_DARK_MODE: string;
  
  // Analytics
  NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
  
  // Debug settings
  NEXT_PUBLIC_DEBUG_MODE?: string;
  NEXT_PUBLIC_LOG_LEVEL?: string;
}

/**
 * Feature flags interface
 */
export interface FeatureFlags {
  authEnabled: boolean;
  analyticsEnabled: boolean;
  darkModeEnabled: boolean;
  debugMode: boolean;
  betaFeatures: boolean;
  maintenanceMode: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Custom event data for analytics
 */
export interface AnalyticsEvent {
  name: string;
  category: string;
  properties?: Record<string, string | number | boolean>;
  userId?: string;
  timestamp?: number;
}

/**
 * Application-wide event types
 */
export type AppEvent = 
  | { type: 'AUTH_STATE_CHANGED'; payload: { isAuthenticated: boolean; user: User | null } }
  | { type: 'THEME_CHANGED'; payload: { theme: 'light' | 'dark' | 'system' } }
  | { type: 'NOTIFICATION_ADDED'; payload: NotificationConfig }
  | { type: 'NOTIFICATION_REMOVED'; payload: { id: string } }
  | { type: 'ROUTE_CHANGED'; payload: { path: string; requireAuth: boolean } }
  | { type: 'ERROR_OCCURRED'; payload: { error: Error; context: string } }
  | { type: 'API_REQUEST_STARTED'; payload: { endpoint: string; method: string } }
  | { type: 'API_REQUEST_COMPLETED'; payload: { endpoint: string; method: string; duration: number } };

// ============================================================================
// Development & Testing Types
// ============================================================================

/**
 * Mock data interface for testing
 */
export interface MockData<T = unknown> {
  [key: string]: T;
}

/**
 * Test utilities interface
 */
export interface TestUtils {
  createMockUser: () => User;
  createMockAuthToken: () => AuthToken;
  createMockChatMessage: (override?: Partial<ChatMessage>) => ChatMessage;
  createMockApiResponse: <T>(data: T) => ApiResponse<T>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an object is an AsyncState
 */
export function isAsyncState<T>(value: unknown): value is AsyncState<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'isLoading' in value &&
    'error' in value
  );
}

/**
 * Check if an object is an OperationResult
 */
export function isOperationResult<T>(value: unknown): value is OperationResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as OperationResult).success === 'boolean'
  );
}

// ============================================================================
// Export everything for convenient importing
// ============================================================================

// This allows consumers to import everything they need from a single location:
// import { User, AuthState, ApiClient, AsyncState } from '@/types';
// or import specific categories:
// import type { User, AuthState } from '@/types/auth';
// import type { ApiClient, HealthResponse } from '@/types/api';