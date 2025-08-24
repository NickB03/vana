/**
 * Auth Components Index
 * Central export for all authentication components
 */

export { GoogleLoginButton } from './GoogleLoginButton';
export { UserProfileDropdown } from './UserProfileDropdown';
export { AuthLoadingState, AuthPageLoading, AuthSkeleton } from './AuthLoadingState';
export { SessionIndicator } from './SessionIndicator';
export { AuthErrorBoundary, AuthErrorAlert } from './AuthErrorBoundary';

// Re-export types if needed
export type { GoogleLoginButtonProps } from './GoogleLoginButton';
export type { UserProfileDropdownProps } from './UserProfileDropdown';
export type { AuthLoadingStateProps } from './AuthLoadingState';
export type { SessionIndicatorProps } from './SessionIndicator';
export type { AuthErrorAlertProps } from './AuthErrorBoundary';