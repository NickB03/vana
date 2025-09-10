/**
 * Authentication Guard Component
 * Protects routes and components that require authentication
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { LoadingSpinner } from '../ui/loading-spinner';
import { LoginForm } from './login-form';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  requireAuth?: boolean;
  showLoginForm?: boolean;
}

export function AuthGuard({ 
  children, 
  fallback: Fallback,
  requireAuth = true,
  showLoginForm = true 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, isDevMode, createDevSession } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // In dev mode, automatically create a session if none exists
      if (isDevMode() && !isAuthenticated && !isLoading) {
        console.log('Auto-creating dev session for authentication guard');
        createDevSession();
      }
      setIsInitializing(false);
    };

    initializeAuth();
  }, [isAuthenticated, isLoading, isDevMode, createDevSession]);

  // Show loading while initializing
  if (isInitializing || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
        <span className="ml-2">Initializing...</span>
      </div>
    );
  }

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If not authenticated and we have a custom fallback, use it
  if (!isAuthenticated && Fallback) {
    return <Fallback />;
  }

  // If not authenticated, show login form or default message
  if (!isAuthenticated) {
    if (showLoginForm) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Sign in to Vana
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Authentication required to access this page
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      );
    } else {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Authentication Required</h2>
            <p className="mt-2 text-gray-600">Please log in to access this page.</p>
          </div>
        </div>
      );
    }
  }

  // User is authenticated, render children
  return <>{children}</>;
}

/**
 * Higher-order component version of AuthGuard
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<AuthGuardProps, 'children'> = {}
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

/**
 * Hook for checking authentication status within components
 */
export function useAuthGuard() {
  const { isAuthenticated, isLoading, isDevMode } = useAuth();
  
  return {
    isAuthenticated,
    isLoading,
    isDevMode: isDevMode(),
    isReady: !isLoading,
  };
}