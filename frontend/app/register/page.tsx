/**
 * Registration Page for Vana AI Research Platform
 * 
 * Provides user registration interface with comprehensive validation,
 * loading states, and proper redirect handling.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { RegisterForm } from '@/components/auth/register-form';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Handle already authenticated users
  useEffect(() => {
    if (mounted && isAuthenticated && !isLoading) {
      router.push('/chat');
    }
  }, [mounted, isAuthenticated, isLoading, router]);
  
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
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <RegisterForm 
        redirectTo="/chat"
        onSuccess={() => {
          // RegisterForm will handle the redirect, but we can add analytics here
          console.log('User registered successfully');
        }}
      />
    </div>
  );
}
