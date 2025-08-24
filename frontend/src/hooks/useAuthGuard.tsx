/**
 * useAuthGuard Hook
 * Provides route protection and authorization
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './use-auth';

/**
 * Auth guard configuration
 */
export interface AuthGuardConfig {
  redirectTo?: string;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requireVerifiedEmail?: boolean;
  allowedRoles?: string[];
  onUnauthorized?: () => void;
}

/**
 * Auth guard state
 */
export interface AuthGuardState {
  isAuthorized: boolean;
  isChecking: boolean;
  error: string | null;
}

/**
 * useAuthGuard hook for route protection
 */
export function useAuthGuard(config: AuthGuardConfig = {}): AuthGuardState {
  const {
    redirectTo = '/auth/login',
    requireAuth = true,
    requireVerifiedEmail = false,
    allowedRoles = [],
    onUnauthorized
  } = config;
  
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading, checkAuth } = useAuth();
  
  const [state, setState] = useState<AuthGuardState>({
    isAuthorized: false,
    isChecking: true,
    error: null
  });
  
  useEffect(() => {
    const verifyAuthorization = async () => {
      setState(prev => ({ ...prev, isChecking: true, error: null }));
      
      try {
        // If auth is required but user is not authenticated
        if (requireAuth && !isAuthenticated) {
          // Try to check auth status first
          await checkAuth();
          
          // Store intended destination
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('auth_redirect', pathname);
          }
          
          // Call unauthorized handler if provided
          if (onUnauthorized) {
            onUnauthorized();
          }
          
          // Redirect to login
          router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`);
          
          setState({
            isAuthorized: false,
            isChecking: false,
            error: 'Authentication required'
          });
          return;
        }
        
        // If email verification is required
        if (requireVerifiedEmail && user && !user.is_verified) {
          setState({
            isAuthorized: false,
            isChecking: false,
            error: 'Email verification required'
          });
          
          // Redirect to verification page
          router.push('/auth/verify-email');
          return;
        }
        
        // Check role-based access
        if (allowedRoles.length > 0 && user) {
          // This would need to be implemented based on your user model
          // For now, we'll assume all authenticated users have access
          const hasRequiredRole = true; // TODO: Implement role checking
          
          if (!hasRequiredRole) {
            setState({
              isAuthorized: false,
              isChecking: false,
              error: 'Insufficient permissions'
            });
            
            if (onUnauthorized) {
              onUnauthorized();
            }
            
            router.push('/unauthorized');
            return;
          }
        }
        
        // All checks passed
        setState({
          isAuthorized: true,
          isChecking: false,
          error: null
        });
      } catch (error) {
        console.error('Authorization check error:', error);
        setState({
          isAuthorized: false,
          isChecking: false,
          error: error instanceof Error ? error.message : 'Authorization check failed'
        });
      }
    };
    
    if (!isLoading) {
      verifyAuthorization();
    }
  }, [
    isAuthenticated,
    user,
    isLoading,
    requireAuth,
    requireVerifiedEmail,
    allowedRoles,
    redirectTo,
    pathname,
    router,
    checkAuth,
    onUnauthorized
  ]);
  
  return state;
}

/**
 * Higher-order component for protected routes
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  config?: AuthGuardConfig
): React.ComponentType<P> {
  return function AuthGuardedComponent(props: P) {
    const { isAuthorized, isChecking } = useAuthGuard(config);
    
    if (isChecking) {
      return config?.fallback || <div>Loading...</div>;
    }
    
    if (!isAuthorized) {
      return null;
    }
    
    return <Component {...props} />;
  };
}