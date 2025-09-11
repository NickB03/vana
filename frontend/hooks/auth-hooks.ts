/**
 * Authentication Hooks
 * 
 * Custom React hooks for authentication functionality:
 * - useAuthToken: Token management and automatic refresh
 * - useAuthGuard: Protected route access control
 * - useLoginForm: Login form state and validation
 * - useSessionManager: Session timeout and activity monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AuthService, User } from '@/lib/auth-service';

// ============================================================================
// Types
// ============================================================================

export interface AuthTokenOptions {
  refreshThreshold?: number; // Time in ms before expiry to refresh
  autoRefresh?: boolean;
  onRefreshError?: (error: Error) => void;
  onRefreshSuccess?: (token: string) => void;
}

export interface AuthGuardOptions {
  redirectTo?: string;
  requiredRoles?: string[];
  roleLogic?: 'OR' | 'AND';
  customPermissionCheck?: (user: User) => boolean;
}

export interface LoginFormOptions {
  passwordMinLength?: number;
  requireSpecialChars?: boolean;
  onSuccess?: (response: any) => void;
  onError?: (error: Error) => void;
}

export interface SessionManagerOptions {
  sessionTimeout?: number; // Time in ms for session timeout
  warningTime?: number; // Time in ms before timeout to show warning
  maxSessionExtensions?: number;
  onSessionExpired?: () => void;
  onWarning?: (timeLeft: number) => void;
}

// ============================================================================
// useAuthToken Hook
// ============================================================================

export function useAuthToken(options: AuthTokenOptions = {}) {
  const { token, refreshToken: contextRefreshToken } = useAuth();
  const [isValidToken, setIsValidToken] = useState(false);
  const [refreshError, setRefreshError] = useState<Error | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const {
    refreshThreshold = 5 * 60 * 1000, // 5 minutes
    autoRefresh = true,
    onRefreshError,
    onRefreshSuccess,
  } = options;

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const refreshPromiseRef = useRef<Promise<string> | null>(null);

  // Validate token format
  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
      return;
    }

    // Basic JWT format validation
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    setIsValidToken(jwtRegex.test(token));
  }, [token]);

  // Setup automatic token refresh
  useEffect(() => {
    if (!token || !autoRefresh || !isValidToken) {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      return;
    }

    const setupRefreshTimer = () => {
      const expiry = AuthService.getTokenExpiry();
      if (!expiry) return;

      const now = Date.now();
      const timeUntilRefresh = expiry - now - refreshThreshold;

      if (timeUntilRefresh > 0) {
        refreshTimeoutRef.current = setTimeout(async () => {
          try {
            await performRefresh();
          } catch (error) {
            console.error('Auto-refresh failed:', error);
          }
        }, timeUntilRefresh);
      } else if (timeUntilRefresh > -refreshThreshold) {
        // Token is within refresh threshold, refresh immediately
        performRefresh();
      }
    };

    setupRefreshTimer();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [token, isValidToken, autoRefresh, refreshThreshold]);

  const performRefresh = useCallback(async () => {
    // Prevent concurrent refresh requests
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    setIsRefreshing(true);
    setRefreshError(null);

    const refreshPromise = contextRefreshToken();
    refreshPromiseRef.current = refreshPromise;

    try {
      const newToken = await refreshPromise;
      onRefreshSuccess?.(newToken);
      return newToken;
    } catch (error) {
      const refreshErr = error instanceof Error ? error : new Error('Token refresh failed');
      setRefreshError(refreshErr);
      onRefreshError?.(refreshErr);
      throw refreshErr;
    } finally {
      setIsRefreshing(false);
      refreshPromiseRef.current = null;
    }
  }, [contextRefreshToken, onRefreshError, onRefreshSuccess]);

  return {
    token,
    isValidToken,
    refreshError,
    isRefreshing,
    refreshToken: performRefresh,
  };
}

// ============================================================================
// useAuthGuard Hook
// ============================================================================

export function useAuthGuard(options: AuthGuardOptions = {}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [canAccess, setCanAccess] = useState(false);
  const [hasRequiredRoles, setHasRequiredRoles] = useState(true);

  const {
    redirectTo = '/login',
    requiredRoles = [],
    roleLogic = 'OR',
    customPermissionCheck,
  } = options;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      setCanAccess(false);
      router.push(redirectTo);
      return;
    }

    // Check role requirements
    if (requiredRoles.length > 0 && user) {
      const userRoles = user.roles || [];
      
      const hasRoles = roleLogic === 'AND'
        ? requiredRoles.every(role => userRoles.includes(role))
        : requiredRoles.some(role => userRoles.includes(role));

      setHasRequiredRoles(hasRoles);
      
      if (!hasRoles) {
        setCanAccess(false);
        router.push('/unauthorized');
        return;
      }
    }

    // Check custom permission
    if (customPermissionCheck && user && !customPermissionCheck(user)) {
      setCanAccess(false);
      router.push('/unauthorized');
      return;
    }

    setCanAccess(true);
  }, [isAuthenticated, isLoading, user, requiredRoles, roleLogic, customPermissionCheck, redirectTo, router]);

  return {
    canAccess,
    isLoading,
    hasRequiredRoles,
    user,
  };
}

// ============================================================================
// useLoginForm Hook
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export function useLoginForm(options: LoginFormOptions = {}) {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    passwordMinLength = 8,
    requireSpecialChars = false,
    onSuccess,
    onError,
  } = options;

  const updateField = useCallback((field: keyof LoginFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof LoginFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }

    // Clear general error
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
  }, [errors]);

  const validateForm = useCallback((): boolean => {
    const newErrors: LoginFormErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < passwordMinLength) {
      newErrors.password = `Password must be at least ${passwordMinLength} characters`;
    } else if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one special character';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, passwordMinLength, requireSpecialChars]);

  const submitForm = useCallback(async () => {
    if (isSubmitting) return; // Prevent double submission

    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const response = await login(formData.email, formData.password);
      onSuccess?.(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      setErrors({ general: errorMessage });
      onError?.(error instanceof Error ? error : new Error('Login failed'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, validateForm, login, onSuccess, onError]);

  const setError = useCallback((field: keyof LoginFormErrors, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  return {
    formData,
    errors,
    isSubmitting,
    updateField,
    validateForm,
    submitForm,
    setError,
  };
}

// ============================================================================
// useSessionManager Hook
// ============================================================================

export function useSessionManager(options: SessionManagerOptions = {}) {
  const { logout } = useAuth();
  const [isSessionActive, setIsSessionActive] = useState(true);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [extensionsUsed, setExtensionsUsed] = useState(0);

  const {
    sessionTimeout = 30 * 60 * 1000, // 30 minutes
    warningTime = 5 * 60 * 1000, // 5 minutes
    maxSessionExtensions = 5,
    onSessionExpired,
    onWarning,
  } = options;

  const sessionStartRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const updateSessionStatus = () => {
      const elapsed = Date.now() - sessionStartRef.current;
      const remaining = sessionTimeout - elapsed;
      
      setTimeUntilExpiry(Math.max(0, remaining));

      if (remaining <= 0) {
        // Session expired
        setIsSessionActive(false);
        logout();
        onSessionExpired?.();
        return;
      }

      if (remaining <= warningTime && !warningShownRef.current) {
        // Show warning
        setShowWarning(true);
        warningShownRef.current = true;
        onWarning?.(remaining);
      }
    };

    // Update immediately
    updateSessionStatus();

    // Set up interval
    intervalRef.current = setInterval(updateSessionStatus, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [sessionTimeout, warningTime, logout, onSessionExpired, onWarning]);

  const extendSession = useCallback(() => {
    if (extensionsUsed >= maxSessionExtensions) return;

    sessionStartRef.current = Date.now();
    setExtensionsUsed(prev => prev + 1);
    setShowWarning(false);
    warningShownRef.current = false;
  }, [extensionsUsed, maxSessionExtensions]);

  const resetSession = useCallback(() => {
    sessionStartRef.current = Date.now();
    setExtensionsUsed(0);
    setShowWarning(false);
    setIsSessionActive(true);
    warningShownRef.current = false;
  }, []);

  return {
    isSessionActive,
    timeUntilExpiry,
    showWarning,
    extensionsUsed,
    maxExtensions: maxSessionExtensions,
    extendSession,
    resetSession,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const { user } = useAuth();

  const hasRole = useCallback((role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  }, [user]);

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    if (!user?.roles) return false;
    return roles.some(role => user.roles!.includes(role));
  }, [user]);

  const hasAllRoles = useCallback((roles: string[]): boolean => {
    if (!user?.roles) return false;
    return roles.every(role => user.roles!.includes(role));
  }, [user]);

  return {
    hasRole,
    hasPermission,
    hasAnyRole,
    hasAllRoles,
    userRoles: user?.roles || [],
    userPermissions: user?.permissions || [],
  };
}

/**
 * Hook for handling authentication redirects
 */
export function useAuthRedirect() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  const redirectToLogin = useCallback((returnTo?: string) => {
    const loginUrl = returnTo 
      ? `/login?redirect=${encodeURIComponent(returnTo)}`
      : '/login';
    router.push(loginUrl);
  }, [router]);

  const redirectToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const redirectAfterLogin = useCallback((defaultPath = '/dashboard') => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect');
    const destination = redirect || defaultPath;
    router.push(destination);
  }, [router]);

  return {
    redirectToLogin,
    redirectToDashboard,
    redirectAfterLogin,
    isAuthenticated,
    isLoading,
  };
}

export default {
  useAuthToken,
  useAuthGuard,
  useLoginForm,
  useSessionManager,
  usePermissions,
  useAuthRedirect,
};