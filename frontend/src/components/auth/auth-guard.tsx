'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

interface AuthGuardProps {
  children: ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: ReactNode;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo,
  fallback 
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while loading or during initial authentication check
    if (isLoading) return;

    // For protected routes: redirect to login if not authenticated
    if (requireAuth && !isAuthenticated) {
      const loginPath = redirectTo || '/auth/login';
      if (pathname !== loginPath) {
        router.push(loginPath);
      }
      return;
    }

    // For auth pages (login/register): redirect to dashboard if already authenticated
    // Only redirect if we're actually on an auth page to avoid redirecting from other pages
    if (!requireAuth && isAuthenticated && pathname?.startsWith('/auth')) {
      const dashboardPath = redirectTo || '/chat';
      router.push(dashboardPath);
      return;
    }
  }, [isAuthenticated, isLoading, requireAuth, redirectTo, router, pathname]);

  // Show loading state while auth is being determined
  if (isLoading) {
    return fallback || (
      <div className="flex h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  // For protected routes: show redirect message if not authenticated
  if (requireAuth && !isAuthenticated) {
    return fallback || (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting to login...</div>
      </div>
    );
  }

  // For auth pages: show redirect message if authenticated
  if (!requireAuth && isAuthenticated && pathname?.startsWith('/auth')) {
    return fallback || (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Redirecting to dashboard...</div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}