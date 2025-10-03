/**
 * useAuth Hook - Authentication state management for Vana
 * Handles JWT tokens, user state, and authentication flows
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useCallback, useEffect } from 'react';
import { 
  User, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest, 
  ChangePasswordRequest,
  PasswordResetRequest,
  PasswordReset,
  GoogleCloudIdentity,
  GoogleOAuthCallbackRequest,
} from '../lib/api/types';
import { apiClient } from '../lib/api/client';

interface AuthState {
  // User state
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginRequest) => Promise<void>;
  loginOAuth2: (username: string, password: string) => Promise<void>;
  loginGoogle: (googleData: GoogleCloudIdentity) => Promise<void>;
  handleGoogleCallback: (callbackData: GoogleOAuthCallbackRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
  requestPasswordReset: (resetData: PasswordResetRequest) => Promise<void>;
  resetPassword: (resetData: PasswordReset) => Promise<void>;
  getCurrentUser: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
}

/**
 * Zustand store for authentication state
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login with email/username and password
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiClient.login(credentials);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Login with OAuth2 form format
      loginOAuth2: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiClient.loginOAuth2(username, password);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Login with Google Cloud Identity
      loginGoogle: async (googleData: GoogleCloudIdentity) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiClient.loginGoogle(googleData);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Google login failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Handle Google OAuth callback
      handleGoogleCallback: async (callbackData: GoogleOAuthCallbackRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiClient.handleGoogleCallback(callbackData);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Google OAuth callback failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Register new user
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response: AuthResponse = await apiClient.register(userData);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Logout current session
      logout: async () => {
        set({ isLoading: true });
        
        try {
          await apiClient.logout();
        } catch (error) {
          console.warn('Logout request failed:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // Logout from all devices
      logoutAll: async () => {
        set({ isLoading: true });
        
        try {
          await apiClient.logoutAll();
        } catch (error) {
          console.warn('Logout all request failed:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // Change password
      changePassword: async (passwordData: ChangePasswordRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          await apiClient.changePassword(passwordData);
          
          // Password change logs out all sessions
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password change failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Request password reset
      requestPasswordReset: async (resetData: PasswordResetRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          await apiClient.requestPasswordReset(resetData);
          set({ isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Reset password with token
      resetPassword: async (resetData: PasswordReset) => {
        set({ isLoading: true, error: null });
        
        try {
          await apiClient.resetPassword(resetData);
          set({ isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      // Get current user information
      getCurrentUser: async () => {
        if (!apiClient.isAuthenticated()) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }

        set({ isLoading: true, error: null });
        
        try {
          const user = await apiClient.getCurrentUser();
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          console.warn('Failed to get current user:', error);
          
          // Clear authentication state on error
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // Clear error state
      clearError: () => {
        set({ error: null });
      },

      // Initialize authentication state
      initialize: async () => {
        if (apiClient.isAuthenticated()) {
          await get().getCurrentUser();
        } else {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
    }),
    {
      name: 'vana-auth-storage',
      storage: createJSONStorage(() => {
        // Use sessionStorage for auth state to improve security
        if (typeof window !== 'undefined') {
          return sessionStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * React hook for authentication
 */
export function useAuth() {
  const store = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    store.initialize();
  }, []); // Remove store dependency to prevent infinite loop

  // Helper functions
  const hasRole = useCallback((roleName: string): boolean => {
    return store.user?.roles?.some(role => role.name === roleName) ?? false;
  }, [store.user]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (!store.user?.roles) return false;
    
    return store.user.roles.some(role => 
      role.permissions?.some(perm => 
        `${perm.resource}:${perm.action}` === permission || perm.name === permission
      ) ?? false
    );
  }, [store.user]);

  const isSuperuser = useCallback((): boolean => {
    return store.user?.is_superuser ?? false;
  }, [store.user]);

  const isEmailVerified = useCallback((): boolean => {
    return store.user?.is_verified ?? false;
  }, [store.user]);

  return {
    // State
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,

    // Actions
    login: store.login,
    loginOAuth2: store.loginOAuth2,
    loginGoogle: store.loginGoogle,
    handleGoogleCallback: store.handleGoogleCallback,
    register: store.register,
    logout: store.logout,
    logoutAll: store.logoutAll,
    changePassword: store.changePassword,
    requestPasswordReset: store.requestPasswordReset,
    resetPassword: store.resetPassword,
    getCurrentUser: store.getCurrentUser,
    clearError: store.clearError,
    initialize: store.initialize,

    // Helpers
    hasRole,
    hasPermission,
    isSuperuser,
    isEmailVerified,
  };
}

/**
 * Hook for protected routes - redirects to login if not authenticated
 */
export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login page
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        const loginUrl = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
        window.location.href = loginUrl;
      }
    }
  }, [isAuthenticated, isLoading]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook for role-based access control
 */
export function useRoleGuard(requiredRole: string) {
  const { hasRole, isAuthenticated, isLoading } = useAuth();
  
  const hasRequiredRole = hasRole(requiredRole);
  
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRequiredRole) {
      // Redirect to unauthorized page
      if (typeof window !== 'undefined') {
        window.location.href = '/unauthorized';
      }
    }
  }, [isAuthenticated, isLoading, hasRequiredRole]);

  return { hasRequiredRole, isAuthenticated, isLoading };
}

/**
 * Hook for permission-based access control
 */
export function usePermissionGuard(requiredPermission: string) {
  const { hasPermission, isAuthenticated, isLoading } = useAuth();
  
  const hasRequiredPermission = hasPermission(requiredPermission);
  
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasRequiredPermission) {
      // Redirect to unauthorized page
      if (typeof window !== 'undefined') {
        window.location.href = '/unauthorized';
      }
    }
  }, [isAuthenticated, isLoading, hasRequiredPermission]);

  return { hasRequiredPermission, isAuthenticated, isLoading };
}