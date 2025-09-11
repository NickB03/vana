/**
 * Login Page for Vana AI Research Platform
 * 
 * Provides user authentication interface with proper error handling,
 * loading states, and redirect functionality.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle already authenticated users
  useEffect(() => {
    if (mounted && isAuthenticated && !isLoading) {
      const returnUrl = searchParams.get('return');
      const redirectTo = returnUrl || '/chat';
      router.push(redirectTo);
    }
  }, [mounted, isAuthenticated, isLoading, router, searchParams]);
  
  // Show loading while hydrating or checking auth
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Don't render if already authenticated (prevents flash)
  if (isAuthenticated) {
    return null;
  }
  
  const returnUrl = searchParams.get('return');
  const redirectTo = returnUrl || '/chat';
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <LoginForm 
        redirectTo={redirectTo}
        onSuccess={() => {
          // LoginForm will handle the redirect, but we can add analytics here
          console.log('User logged in successfully');
        }}
      />
    </div>
  );
}
