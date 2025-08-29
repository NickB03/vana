'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, LoginCredentials, RegisterCredentials } from '@/types/auth';
import { AuthAPI, tokenManager } from '@/lib/auth';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  handleGoogleCallback: (code: string, state: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tokens: null,
      isLoading: false,
      error: null,
      
      // Actions
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      login: async (credentials: LoginCredentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await AuthAPI.login(credentials);
          
          tokenManager.setTokens(response.tokens);
          set({
            user: response.user,
            tokens: response.tokens,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            tokens: null,
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },
      
      register: async (credentials: RegisterCredentials) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await AuthAPI.register(credentials);
          
          tokenManager.setTokens(response.tokens);
          set({
            user: response.user,
            tokens: response.tokens,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Registration failed';
          set({
            user: null,
            tokens: null,
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },
      
      loginWithGoogle: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const authUrl = await AuthAPI.loginWithGoogle();
          
          // Redirect to Google OAuth using SSR-safe approach
          const { safeWindow } = require('@/lib/ssr-utils');
          const win = safeWindow();
          
          if (win) {
            win.location.href = authUrl;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Google login failed';
          set({
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },
      
      handleGoogleCallback: async (code: string, state: string) => {
        try {
          set({ isLoading: true, error: null });
          
          const response = await AuthAPI.handleGoogleCallback(code, state);
          
          tokenManager.setTokens(response.tokens);
          set({
            user: response.user,
            tokens: response.tokens,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Google callback failed';
          set({
            user: null,
            tokens: null,
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },
      
      refreshToken: async () => {
        try {
          const newTokens = await AuthAPI.refreshToken();
          
          // For mock mode, just update the state without triggering loops
          set(() => ({
            tokens: newTokens,
            error: null,
          }));
        } catch (error) {
          // In mock mode, don't logout on refresh failure to prevent loops
          console.warn('Token refresh failed in mock mode:', error);
          // Still provide mock tokens to keep the UI working
          const mockTokens = await AuthAPI.refreshToken();
          set(() => ({
            tokens: mockTokens,
            error: null,
          }));
        }
      },
      
      logout: async () => {
        try {
          set({ isLoading: true });
          
          await AuthAPI.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          tokenManager.clearTokens();
          set({
            user: null,
            tokens: null,
            isLoading: false,
            error: null,
          });
        }
      },
      
      checkAuth: async () => {
        try {
          // Prevent rapid-fire auth checks and loops
          const currentState = get();
          if (currentState.isLoading) {
            return; // Already checking auth
          }
          
          // For mock mode, just set the mock user and tokens directly
          const mockUser = await AuthAPI.getCurrentUser();
          const mockTokens = await AuthAPI.refreshToken();
          
          set({
            user: mockUser,
            tokens: mockTokens,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.error('Auth check failed:', error);
          // For mock mode, still set mock data to prevent loops
          const mockUser = await AuthAPI.getCurrentUser();
          const mockTokens = await AuthAPI.refreshToken();
          
          set({
            user: mockUser,
            tokens: mockTokens,
            isLoading: false,
            error: null,
          });
        }
      },
    }),
    {
      name: 'vana-auth-store',
      partialize: (state) => ({
        // Only persist user, not tokens (tokens are in localStorage)
        user: state.user,
      }),
    }
  )
);