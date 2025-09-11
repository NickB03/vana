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

// ============================================================================
// Types
// ============================================================================

export interface AuthGuardProps {
  children: React.ReactNode;
  requiredRoles?: string[];
  requiredPermissions?: string[];
  fallbackPath?: string;
}

// ============================================================================
// AuthGuard Component
// ============================================================================

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRoles = [],
  requiredPermissions = [],
  fallbackPath = '/login'
}) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated || !user) {
      router.push(fallbackPath);
      return;
    }

    // Check required roles if specified
    if (requiredRoles.length > 0) {
      const userRoles = user.roles || [];
      const hasRequiredRole = requiredRoles.some(role => 
        userRoles.some(r => r.name === role)
      );
      
      if (!hasRequiredRole) {
        router.push('/unauthorized');
        return;
      }
    }

    // Check required permissions if specified
    if (requiredPermissions.length > 0) {
      const hasRequiredPermission = requiredPermissions.some(permission => 
        user.roles?.some(role => 
          role.permissions?.some(p => p.name === permission)
        ) ?? false
      );
      
      if (!hasRequiredPermission) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, user, router, requiredRoles, requiredPermissions, fallbackPath]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated (redirect will happen)
  if (!isAuthenticated || !user) {
    return null;
  }

  // Render protected content
  return <>{children}</>;
};

export default AuthGuard;