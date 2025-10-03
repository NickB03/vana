/**
 * ProtectedRoute - Authentication and authorization wrapper
 * Handles route protection with role-based access control
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, AlertTriangle, LogIn, Home } from 'lucide-react';
import { logger } from '@/lib/logger';

/**
 * Validates a redirect path to prevent open redirect attacks
 * @param path - The path to validate
 * @returns A safe redirect path or null if invalid
 */
function validateRedirectPath(path: string): string | null {
  if (!path || typeof path !== 'string') {
    return null;
  }

  // Remove leading/trailing whitespace
  const trimmedPath = path.trim();

  // Must start with '/' but not '//' (to prevent protocol-relative URLs)
  if (!trimmedPath.startsWith('/') || trimmedPath.startsWith('//')) {
    return null;
  }

  // Must not contain protocol schemes
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(trimmedPath)) {
    return null;
  }

  // Must not contain backslashes (Windows path separators)
  if (trimmedPath.includes('\\')) {
    return null;
  }

  // Must not contain null bytes or other control characters
  if (/[\x00-\x1f\x7f]/.test(trimmedPath)) {
    return null;
  }

  // Whitelist of allowed path patterns (adjust based on your app's routes)
  const allowedPatterns = [
    /^\/$/,                           // Root
    /^\/dashboard(\/.*)?$/,           // Dashboard and sub-routes
    /^\/profile(\/.*)?$/,             // Profile pages
    /^\/settings(\/.*)?$/,            // Settings pages
    /^\/admin(\/.*)?$/,               // Admin pages
    /^\/projects(\/.*)?$/,            // Projects pages
    /^\/api\/.*$/,                    // API routes (if needed for client-side redirects)
    /^\/[a-zA-Z0-9\-_]+(\/[a-zA-Z0-9\-_\/]*)?$/, // General safe paths
  ];

  // Check if path matches any allowed pattern
  const isAllowed = allowedPatterns.some(pattern => pattern.test(trimmedPath));
  
  if (!isAllowed) {
    return null;
  }

  return trimmedPath;
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Required role for access */
  requiredRole?: string;
  /** Required permission for access */
  requiredPermission?: string;
  /** Require superuser access */
  requireSuperuser?: boolean;
  /** Custom fallback component */
  fallback?: React.ReactNode;
  /** Redirect path for unauthorized users */
  redirectTo?: string;
  /** Show loading state */
  showLoading?: boolean;
}

/**
 * Loading component for authentication state
 */
function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Verifying access...</h3>
              <p className="text-sm text-muted-foreground">Please wait while we check your permissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Unauthorized access component
 */
interface UnauthorizedProps {
  type: 'unauthenticated' | 'insufficient_role' | 'insufficient_permission' | 'not_superuser';
  requiredRole?: string;
  requiredPermission?: string;
  redirectTo?: string;
}

function Unauthorized({ type, requiredRole, requiredPermission }: UnauthorizedProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogin = () => {
    const currentPath = window.location.pathname;
    const safePath = validateRedirectPath(currentPath);
    
    // Use validated path or fall back to safe default
    const redirectPath = safePath || '/dashboard';
    const loginUrl = `/auth/login?redirect=${encodeURIComponent(redirectPath)}`;
    
    // Log security event if path was rejected
    if (!safePath && currentPath) {
      logger.authError('Rejected unsafe redirect path', {
        originalPath: currentPath,
        fallbackPath: redirectPath,
        reason: 'Failed path validation'
      });
    }
    
    router.push(loginUrl);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const getContent = () => {
    switch (type) {
      case 'unauthenticated':
        return {
          icon: LogIn,
          title: 'Authentication Required',
          description: 'You need to log in to access this page.',
          action: (
            <Button onClick={handleLogin} className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Log In
            </Button>
          ),
        };

      case 'insufficient_role':
        return {
          icon: Shield,
          title: 'Insufficient Permissions',
          description: `You need the "${requiredRole}" role to access this page.`,
          action: (
            <div className="space-y-2">
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
              <Button onClick={handleLogout} variant="ghost" className="w-full">
                Log Out
              </Button>
            </div>
          ),
        };

      case 'insufficient_permission':
        return {
          icon: Shield,
          title: 'Access Denied',
          description: `You need the "${requiredPermission}" permission to access this page.`,
          action: (
            <div className="space-y-2">
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
              <Button onClick={handleLogout} variant="ghost" className="w-full">
                Log Out
              </Button>
            </div>
          ),
        };

      case 'not_superuser':
        return {
          icon: AlertTriangle,
          title: 'Administrator Access Required',
          description: 'Only administrators can access this page.',
          action: (
            <div className="space-y-2">
              <Button onClick={handleGoHome} variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
              <Button onClick={handleLogout} variant="ghost" className="w-full">
                Log Out
              </Button>
            </div>
          ),
        };

      default:
        return {
          icon: AlertTriangle,
          title: 'Access Denied',
          description: 'You do not have permission to access this page.',
          action: (
            <Button onClick={handleGoHome} variant="outline" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Button>
          ),
        };
    }
  };

  const content = getContent();
  const IconComponent = content.icon;

  useEffect(() => {
    logger.authError('Unauthorized access attempt', {
      type,
      requiredRole,
      requiredPermission,
      currentPath: window.location.pathname,
    });
  }, [type, requiredRole, requiredPermission]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="rounded-full bg-red-100 p-3">
              <IconComponent className="h-8 w-8 text-red-600" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">{content.title}</h3>
              <p className="text-sm text-muted-foreground">{content.description}</p>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                If you believe this is an error, please contact your administrator.
              </AlertDescription>
            </Alert>

            <div className="w-full">{content.action}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main ProtectedRoute component
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
  requireSuperuser = false,
  fallback,
  redirectTo,
  showLoading = true,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, isSuperuser, hasRole, hasPermission } = useAuth();
  const [accessChecked, setAccessChecked] = useState(false);
  const router = useRouter();

  // Check access once authentication state is determined
  useEffect(() => {
    if (!isLoading) {
      setAccessChecked(true);
      
      // Log access attempt
      logger.authEvent('Route access attempt', user?.id, {
        path: window.location.pathname,
        requiredRole,
        requiredPermission,
        requireSuperuser,
        isAuthenticated,
        userRoles: user?.roles?.map(r => r.name),
      });
    }
  }, [isLoading, isAuthenticated, user, requiredRole, requiredPermission, requireSuperuser]);

  // Handle redirects
  useEffect(() => {
    if (accessChecked && !isAuthenticated && redirectTo) {
      router.push(redirectTo);
      return;
    }
  }, [accessChecked, isAuthenticated, redirectTo, router]);

  // Show loading state
  if (isLoading || !accessChecked) {
    if (showLoading) {
      return fallback || <AuthLoading />;
    }
    return null;
  }

  // Check authentication
  if (!isAuthenticated) {
    if (redirectTo) {
      return null; // Will redirect in useEffect
    }
    return <Unauthorized type="unauthenticated" redirectTo={redirectTo} />;
  }

  // Check superuser requirement
  if (requireSuperuser && !isSuperuser()) {
    return <Unauthorized type="not_superuser" redirectTo={redirectTo} />;
  }

  // Check role requirement
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <Unauthorized 
        type="insufficient_role" 
        requiredRole={requiredRole} 
        redirectTo={redirectTo} 
      />
    );
  }

  // Check permission requirement
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <Unauthorized 
        type="insufficient_permission" 
        requiredPermission={requiredPermission} 
        redirectTo={redirectTo} 
      />
    );
  }

  // Access granted - log success and render children
  useEffect(() => {
    if (accessChecked && isAuthenticated) {
      logger.authEvent('Route access granted', user?.id, {
        path: window.location.pathname,
        requiredRole,
        requiredPermission,
        requireSuperuser,
      });
    }
  }, [accessChecked, isAuthenticated, user?.id, requiredRole, requiredPermission, requireSuperuser]);

  return <>{children}</>;
}

/**
 * Higher-order component for route protection
 */
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  WrappedComponent.displayName = `withProtectedRoute(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for conditional rendering based on permissions
 */
export function useConditionalRender() {
  const { isAuthenticated, hasRole, hasPermission, isSuperuser } = useAuth();

  const canRender = (options: {
    requireAuth?: boolean;
    requiredRole?: string;
    requiredPermission?: string;
    requireSuperuser?: boolean;
  }) => {
    const { requireAuth = false, requiredRole, requiredPermission, requireSuperuser = false } = options;

    if (requireAuth && !isAuthenticated) return false;
    if (requireSuperuser && !isSuperuser()) return false;
    if (requiredRole && !hasRole(requiredRole)) return false;
    if (requiredPermission && !hasPermission(requiredPermission)) return false;

    return true;
  };

  return { canRender, isAuthenticated, hasRole, hasPermission, isSuperuser };
}

export default ProtectedRoute;