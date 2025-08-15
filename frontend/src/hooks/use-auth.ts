'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

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
  }, [checkAuth]);

  // Auto-refresh token
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      refreshToken().catch(() => {
        // Token refresh failed, user will be logged out
      });
    }, 15 * 60 * 1000); // Refresh every 15 minutes

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, refreshToken]);

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