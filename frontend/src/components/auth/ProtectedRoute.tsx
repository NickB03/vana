/**
 * Protected Route Component
 * Client-side route protection wrapper
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthGuard } from '@/hooks/useAuthGuard';
import { AuthPageLoading } from '@/components/auth/AuthLoadingState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerifiedEmail?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function ProtectedRoute({
  children,
  requireAuth = true,
  requireVerifiedEmail = false,
  allowedRoles = [],
  redirectTo = '/auth/login',
  fallback
}: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthorized, isChecking, error } = useAuthGuard({
    requireAuth,
    requireVerifiedEmail,
    allowedRoles,
    redirectTo
  });

  useEffect(() => {
    // If not authorized and not checking, the useAuthGuard hook
    // will handle the redirect
  }, [isAuthorized, isChecking]);

  if (isChecking) {
    return fallback || <AuthPageLoading />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Icons.alertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            {error}
            <div className="mt-4 flex gap-2">
              <Button
                size="sm"
                onClick={() => router.push('/auth/login')}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push('/')}
              >
                Go Home
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Layout wrapper for protected pages
 */
interface ProtectedLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireVerifiedEmail?: boolean;
  allowedRoles?: string[];
}

export function ProtectedLayout({
  children,
  requireAuth = true,
  requireVerifiedEmail = false,
  allowedRoles = []
}: ProtectedLayoutProps) {
  return (
    <ProtectedRoute
      requireAuth={requireAuth}
      requireVerifiedEmail={requireVerifiedEmail}
      allowedRoles={allowedRoles}
    >
      {children}
    </ProtectedRoute>
  );
}