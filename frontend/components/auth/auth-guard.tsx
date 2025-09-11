/**
 * AuthGuard Component for Vana AI Research Platform
 * 
 * Provides route protection by checking authentication status.
 * Redirects to login page if user is not authenticated.
 */

'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { User } from '@/types/auth';

// ============================================================================
// Types
// ============================================================================

export interface AuthGuardProps {
  children: React.ReactNode;
  
  // Access control
  requireAuth?: boolean;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  
  // Role logic (AND = all roles required, OR = any role required)
  roleLogic?: 'AND' | 'OR';
  
  // Custom permission check function
  customPermissionCheck?: (user: User | null) => boolean;
  
  // Fallback options (use either path redirect or component)
  fallbackPath?: string; // Redirect path (default: '/login')
  fallback?: React.ReactNode; // Fallback component to render instead of redirect
  
  // Additional redirect options
  redirectTo?: string; // Alias for fallbackPath (for backward compatibility)
  
  // Callbacks
  onUnauthorized?: () => void;
  
  // Loading and error states
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}

// ============================================================================
// AuthGuard Component
// ============================================================================

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requireAuth = true,
  requiredRoles = [],
  requiredPermissions = [],
  roleLogic = 'OR',
  customPermissionCheck,
  fallbackPath = '/login',
  fallback,
  redirectTo,
  onUnauthorized,
  loadingComponent,
  unauthorizedComponent,
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  // Use redirectTo as fallback if provided (backward compatibility)
  const redirectPath = redirectTo || fallbackPath;

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // Skip auth check if requireAuth is false
    if (!requireAuth) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      onUnauthorized?.();
      if (!fallback) {
        router.push(redirectPath);
      }
      return;
    }

    // Check required roles if specified
    if (requiredRoles.length > 0) {
      const userRoles = user.roles || [];
      
      // Extract role names (handle both string arrays and role objects)
      const roleNames = userRoles.map(role => 
        typeof role === 'string' ? role : role.name || role
      );
      
      const hasRequiredRole = roleLogic === 'AND'
        ? requiredRoles.every(role => roleNames.includes(role))
        : requiredRoles.some(role => roleNames.includes(role));
      
      if (!hasRequiredRole) {
        onUnauthorized?.();
        if (!unauthorizedComponent) {
          router.push('/unauthorized');
        }
        return;
      }
    }

    // Check required permissions if specified
    if (requiredPermissions.length > 0) {
      const hasRequiredPermission = requiredPermissions.some(permission => 
        user.roles?.some(role => 
          role.permissions?.some(p => 
            (typeof p === 'string' ? p : p.name) === permission
          )
        ) ?? false
      );
      
      if (!hasRequiredPermission) {
        onUnauthorized?.();
        if (!unauthorizedComponent) {
          router.push('/unauthorized');
        }
        return;
      }
    }
    
    // Check custom permission function
    if (customPermissionCheck && !customPermissionCheck(user)) {
      onUnauthorized?.();
      if (!unauthorizedComponent) {
        router.push('/unauthorized');
      }
      return;
    }
  }, [isAuthenticated, isLoading, user, router, requiredRoles, requiredPermissions, roleLogic, customPermissionCheck, requireAuth, redirectPath, fallback, unauthorizedComponent, onUnauthorized]);

  // Show loading state while checking auth
  if (isLoading) {
    return loadingComponent || (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Skip auth check if requireAuth is false
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Show fallback component if not authenticated and fallback is provided
  if ((!isAuthenticated || !user) && fallback) {
    return <>{fallback}</>;
  }

  // Don't render children if not authenticated (redirect will happen)
  if (!isAuthenticated || !user) {
    return null;
  }
  
  // Show unauthorized component if access is denied and component is provided
  if (unauthorizedComponent) {
    // Re-check permissions for unauthorized component
    if (requiredRoles.length > 0) {
      const userRoles = user.roles || [];
      const roleNames = userRoles.map(role => 
        typeof role === 'string' ? role : role.name || role
      );
      
      const hasRequiredRole = roleLogic === 'AND'
        ? requiredRoles.every(role => roleNames.includes(role))
        : requiredRoles.some(role => roleNames.includes(role));
      
      if (!hasRequiredRole) {
        return <>{unauthorizedComponent}</>;
      }
    }
    
    if (requiredPermissions.length > 0) {
      const hasRequiredPermission = requiredPermissions.some(permission => 
        user.roles?.some(role => 
          role.permissions?.some(p => 
            (typeof p === 'string' ? p : p.name) === permission
          )
        ) ?? false
      );
      
      if (!hasRequiredPermission) {
        return <>{unauthorizedComponent}</>;
      }
    }
    
    if (customPermissionCheck && !customPermissionCheck(user)) {
      return <>{unauthorizedComponent}</>;
    }
  }

  // Render protected content
  return <>{children}</>;
};

export default AuthGuard;