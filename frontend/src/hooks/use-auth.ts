'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

export type UseAuthReturn = ReturnType<typeof useAuth>;

export function useAuth() {
  const {
    user,
    tokens,
    isLoading,
    error,
    login,
    register,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    refreshToken,
    checkAuth,
    clearError,
    setLoading,
  } = useAuthStore();

  const isAuthenticated = !!user && !!tokens;

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []); // Remove checkAuth from dependencies to prevent infinite loop

  // Token refresh is handled by useTokenRefresh hook
  // Removed duplicate auto-refresh logic to prevent race conditions

  return {
    // State
    user,
    tokens,
    isLoading,
    error,
    isAuthenticated,
    
    // Actions
    login,
    register,
    loginWithGoogle,
    handleGoogleCallback,
    logout,
    refreshToken,
    checkAuth,
    clearError,
    setLoading,
  };
}