/**
 * AuthGuard Component for Vana AI Research Platform
 * 
 * Provides route protection by checking authentication status.
 * Redirects to login page if user is not authenticated.
 */

'use client';

import React, { useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useAuthStabilization } from '@/hooks/use-auth-stabilization';
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
  const { isLoading, hasRole, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // Use auth stabilization hook
  const {
    isStable,
    isInitialized,
    stableAuth,
    stableUser,
    canSafelyRedirect,
    addRedirectToHistory,
    wouldCreateRedirectLoop
  } = useAuthStabilization();
  
  // Use redirectTo as fallback if provided (backward compatibility)
  const redirectPath = redirectTo || fallbackPath;
  
  // Memoized redirect target validation
  const isValidRedirectTarget = useCallback((path: string): boolean => {
    // Basic validation
    if (!path || path === pathname) return false;
    
    // Check if path is a valid route format
    if (!/^\/[a-zA-Z0-9/_-]*$/.test(path)) return false;
    
    // Prevent redirecting to current path
    return path !== pathname;
  }, [pathname]);
  
  // Memoized permission check functions to prevent infinite re-renders
  const checkRolePermissions = useCallback((userToCheck: User | null): boolean => {
    if (!userToCheck || requiredRoles.length === 0) return true;
    
    // Use the auth context's hasRole method which works with JWT payload
    return roleLogic === 'AND'
      ? requiredRoles.every(role => hasRole(role))
      : requiredRoles.some(role => hasRole(role));
  }, [requiredRoles, roleLogic, hasRole]);
  
  const checkRequiredPermissions = useCallback((userToCheck: User | null): boolean => {
    if (!userToCheck || requiredPermissions.length === 0) return true;
    
    // Use the auth context's hasPermission method which works with JWT payload
    return requiredPermissions.some(permission => hasPermission(permission));
  }, [requiredPermissions, hasPermission]);
  
  const checkCustomPermissions = useCallback((userToCheck: User | null): boolean => {
    if (!customPermissionCheck) return true;
    return customPermissionCheck(userToCheck);
  }, [customPermissionCheck]);
  
  // Memoized permission check result
  const hasAllPermissions = useMemo(() => {
    if (!isStable || !stableUser) return false;
    
    return (
      checkRolePermissions(stableUser) &&
      checkRequiredPermissions(stableUser) &&
      checkCustomPermissions(stableUser)
    );
  }, [isStable, stableUser, checkRolePermissions, checkRequiredPermissions, checkCustomPermissions]);
  
  // Safe redirect function with loop prevention
  const performSafeRedirect = useCallback((targetPath: string, reason: string) => {
    // Validate redirect target
    if (!isValidRedirectTarget(targetPath)) {
      console.warn(`AuthGuard: Invalid redirect target '${targetPath}' from ${pathname}`);
      return false;
    }
    
    // Check for potential loops
    if (wouldCreateRedirectLoop(targetPath)) {
      console.warn(`AuthGuard: Preventing redirect loop to '${targetPath}' from ${pathname}`);
      return false;
    }
    
    // Check if we can safely redirect based on auth state
    if (!canSafelyRedirect(targetPath)) {
      console.warn(`AuthGuard: Cannot safely redirect to '${targetPath}' - auth state not stable`);
      return false;
    }
    
    console.log(`AuthGuard: Redirecting to '${targetPath}' - ${reason}`);
    
    // Add to history and perform redirect
    addRedirectToHistory(targetPath);
    router.replace(targetPath);
    return true;
  }, [isValidRedirectTarget, wouldCreateRedirectLoop, canSafelyRedirect, addRedirectToHistory, router, pathname]);

  // Auth guard effect with stabilization and loop prevention
  useEffect(() => {
    // Don't make decisions while loading or before auth state is stable
    if (isLoading || !isStable || !isInitialized) {
      return;
    }

    // Skip auth check if requireAuth is false
    if (!requireAuth) return;

    // Redirect to login if not authenticated
    if (!stableAuth || !stableUser) {
      onUnauthorized?.();
      if (!fallback) {
        performSafeRedirect(redirectPath, 'user not authenticated');
      }
      return;
    }

    // Check permissions using stable user data
    if (!hasAllPermissions) {
      onUnauthorized?.();
      if (!unauthorizedComponent) {
        performSafeRedirect('/unauthorized', 'insufficient permissions');
      }
      return;
    }
  }, [
    // Core auth state (memoized/stable)
    isLoading,
    isStable,
    isInitialized,
    stableAuth,
    stableUser,
    hasAllPermissions,
    
    // Configuration (stable props)
    requireAuth,
    
    // Handlers (memoized)
    onUnauthorized,
    performSafeRedirect,
    
    // Paths (stable)
    redirectPath,
    
    // Components (stable)
    fallback,
    unauthorizedComponent,
  ]);

  // Show loading state while checking auth or waiting for stabilization
  if (isLoading || !isStable || !isInitialized) {
    return loadingComponent || (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {isLoading ? 'Loading...' : 'Initializing...'}
          </p>
        </div>
      </div>
    );
  }

  // Skip auth check if requireAuth is false
  if (!requireAuth) {
    return <>{children}</>;
  }

  // Show fallback component if not authenticated and fallback is provided
  if ((!stableAuth || !stableUser) && fallback) {
    return <>{fallback}</>;
  }

  // Don't render children if not authenticated (redirect will happen)
  if (!stableAuth || !stableUser) {
    return null;
  }
  
  // Show unauthorized component if access is denied and component is provided
  if (unauthorizedComponent && !hasAllPermissions) {
    return <>{unauthorizedComponent}</>;
  }

  // Render protected content only if all permissions are satisfied
  if (!hasAllPermissions) {
    return null;
  }
  
  return <>{children}</>;
};

export default AuthGuard;