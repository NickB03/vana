/**
 * Authentication Hooks for Vana AI Research Platform
 * 
 * Comprehensive React hooks for authentication state management:
 * - useAuth - Main authentication hook
 * - useAuthForm - Form handling with validation
 * - useProtectedRoute - Route protection logic
 * - useAuthState - Reactive auth state management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  AuthState,
  LoginRequest, 
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateProfileRequest,
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  AuthError,
  UseAuthReturn,
  UseAuthFormReturn,
  UseProtectedRouteReturn,
  DEFAULT_AUTH_CONFIG
} from '../types/auth';
import { authService } from '../lib/auth-service';

// ============================================================================
// Main Authentication Hook
// ============================================================================

/**
 * Primary authentication hook providing complete auth state and methods
 */
export function useAuth(): UseAuthReturn {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    token: null,
    tokenExpiry: null,
    lastActivity: Date.now(),
    refreshTokenExpiry: null,
    error: null,
    requireAuth: typeof window !== 'undefined' 
      ? process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH !== 'false'
      : false,
    autoRefresh: DEFAULT_AUTH_CONFIG.AUTO_REFRESH_ENABLED,
  });

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const isAuth = authService.isAuthenticated();
        const user = authService.getUser();
        const token = authService.getToken();
        const tokenExpiry = authService.getTokenExpiry();

        setAuthState(prev => ({
          ...prev,
          isAuthenticated: isAuth,
          user,
          token,
          tokenExpiry,
          isLoading: false,
        }));
      } catch (error) {
        console.error('[useAuth] Failed to initialize auth state:', error);
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to initialize authentication',
        }));
      }
    };

    initializeAuth();
  }, []);

  // Set up event listeners for auth service events
  useEffect(() => {
    const unsubscribers = [
      authService.on('login', (data: { user: User; token: string }) => {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: true,
          user: data.user,
          token: data.token,
          tokenExpiry: authService.getTokenExpiry(),
          lastActivity: Date.now(),
          error: null,
        }));
      }),

      authService.on('logout', (data: { user?: User }) => {
        setAuthState(prev => ({
          ...prev,
          isAuthenticated: false,
          user: null,
          token: null,
          tokenExpiry: null,
          refreshTokenExpiry: null,
          error: null,
        }));
      }),

      authService.on('profileUpdated', (data: { user: User }) => {
        setAuthState(prev => ({
          ...prev,
          user: data.user,
        }));
      }),

      authService.on('tokenRefreshed', (data: { token: string }) => {
        setAuthState(prev => ({
          ...prev,
          token: data.token,
          tokenExpiry: authService.getTokenExpiry(),
          lastActivity: Date.now(),
          error: null,
        }));
      }),

      authService.on('error', (error: AuthError) => {
        setAuthState(prev => ({
          ...prev,
          error: error.message,
        }));
      }),
    ];

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  // Authentication methods
  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResponse> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.login(credentials);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest): Promise<RegisterResponse> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.register(data);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await authService.logout();
    } catch (error) {
      console.warn('[useAuth] Logout error:', error);
      // Don't set error state for logout - it should succeed locally even if server call fails
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string> => {
    try {
      const newToken = await authService.refreshToken();
      return newToken;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      setAuthState(prev => ({
        ...prev,
        error: message,
      }));
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (data: UpdateProfileRequest): Promise<User> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const user = await authService.updateProfile(data);
      return user;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const changePassword = useCallback(async (data: ChangePasswordRequest): Promise<void> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      await authService.changePassword(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password change failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    } finally {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      if (!authService.isAuthenticated()) {
        return false;
      }

      // Optionally verify with server
      await authService.getProfile();
      return true;
    } catch (error) {
      console.warn('[useAuth] Auth status check failed:', error);
      return false;
    }
  }, []);

  const extendSession = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      lastActivity: Date.now(),
    }));
  }, []);

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Utility methods
  const hasRole = useCallback((role: string): boolean => {
    return authService.hasRole(role);
  }, []);

  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(permission);
  }, []);

  const isTokenExpired = useCallback((): boolean => {
    return authService.isTokenExpired();
  }, []);

  const getTimeToExpiry = useCallback((): number => {
    return authService.getTimeToExpiry();
  }, []);

  return {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    checkAuthStatus,
    extendSession,
    clearError,
    hasRole,
    hasPermission,
    isTokenExpired,
    getTimeToExpiry,
  };
}

// ============================================================================
// Authentication Form Hook
// ============================================================================

/**
 * Hook for handling authentication forms with validation
 */
export function useAuthForm<T extends Record<string, unknown>>(
  submitHandler: (data: T) => Promise<void>,
  validator?: (data: T) => Record<keyof T, string>
): UseAuthFormReturn<T> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const handleSubmit = useCallback(async (data: T): Promise<void> => {
    setIsSubmitting(true);
    setErrors({});

    try {
      // Validate if validator provided
      if (validator) {
        const validationErrors = validator(data);
        const hasErrors = Object.keys(validationErrors).length > 0;
        
        if (hasErrors) {
          setErrors(validationErrors);
          return;
        }
      }

      await submitHandler(data);
    } catch (error) {
      // Handle API errors with field-specific errors
      if (error && typeof error === 'object' && 'fieldErrors' in error) {
        const apiErrors = error as { fieldErrors: Record<string, string[]> };
        const formErrors: Partial<Record<keyof T, string>> = {};
        
        Object.entries(apiErrors.fieldErrors).forEach(([field, messages]) => {
          if (messages.length > 0) {
            formErrors[field as keyof T] = messages[0];
          }
        });
        
        setErrors(formErrors);
      } else {
        // Generic error handling
        const message = error instanceof Error ? error.message : 'An error occurred';
        console.error('[useAuthForm] Submission error:', message);
        throw error; // Re-throw for component handling
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [submitHandler, validator]);

  const setError = useCallback((field: keyof T, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const validate = useCallback((data: T): Record<keyof T, string> => {
    return validator ? validator(data) : {} as Record<keyof T, string>;
  }, [validator]);

  return {
    isSubmitting,
    errors,
    handleSubmit,
    setError,
    clearErrors,
    validate,
  };
}

// ============================================================================
// Protected Route Hook
// ============================================================================

/**
 * Hook for implementing route protection logic
 */
export function useProtectedRoute(
  requiredRoles?: string[],
  requiredPermissions?: string[],
  redirectTo: string = '/login'
): UseProtectedRouteReturn {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const isAllowed = useMemo(() => {
    if (isLoading) return false;
    if (!isAuthenticated) return false;

    // Check required roles
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some(role => hasRole(role));
      if (!hasRequiredRole) {
        setError(`Access denied. Required role: ${requiredRoles.join(' or ')}`);
        return false;
      }
    }

    // Check required permissions
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasRequiredPermission = requiredPermissions.some(permission => 
        hasPermission(permission)
      );
      if (!hasRequiredPermission) {
        setError(`Access denied. Required permission: ${requiredPermissions.join(' or ')}`);
        return false;
      }
    }

    setError(null);
    return true;
  }, [isAuthenticated, isLoading, requiredRoles, requiredPermissions, hasRole, hasPermission]);

  // Handle redirects
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAllowed) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isAllowed, isLoading, redirectTo, router]);

  return {
    isAllowed,
    isLoading,
    redirectTo: !isAuthenticated || !isAllowed ? redirectTo : null,
    error,
  };
}

// ============================================================================
// Reactive Auth State Hook
// ============================================================================

/**
 * Lightweight hook for reactive auth state without methods
 */
export function useAuthState() {
  const { 
    isAuthenticated, 
    isLoading, 
    user, 
    token, 
    error,
    hasRole,
    hasPermission,
  } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    user,
    token,
    error,
    hasRole,
    hasPermission,
  };
}

// ============================================================================
// Auto-refresh Token Hook
// ============================================================================

/**
 * Hook for automatic token refresh
 */
export function useAutoRefreshToken(
  refreshThreshold: number = DEFAULT_AUTH_CONFIG.TOKEN_REFRESH_THRESHOLD
) {
  const { isAuthenticated, refreshToken, isTokenExpired, getTimeToExpiry } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkTokenExpiry = async () => {
      const timeToExpiry = getTimeToExpiry();
      
      if (timeToExpiry <= refreshThreshold) {
        try {
          await refreshToken();
        } catch (error) {
          console.error('[useAutoRefreshToken] Auto refresh failed:', error);
        }
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Set up interval to check periodically
    const interval = setInterval(checkTokenExpiry, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshToken, refreshThreshold, getTimeToExpiry]);
}