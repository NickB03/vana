/**
 * Hooks Index
 * Central export for all custom hooks
 */

// Authentication hooks
export { useAuth } from './useAuth';
export { useAuthGuard, withAuthGuard } from './useAuthGuard';
export { useTokenRefresh } from './useTokenRefresh';

// Export types
export type { UseAuthReturn } from './useAuth';
export type { AuthGuardConfig, AuthGuardState } from './useAuthGuard';
export type { TokenRefreshConfig, TokenRefreshState } from './useTokenRefresh';