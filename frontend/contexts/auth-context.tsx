/**
 * Authentication Context
 * 
 * Provides global authentication state management for the Vana application.
 * Features:
 * - JWT token management
 * - User session persistence
 * - Automatic token refresh
 * - Authentication state synchronization across tabs
 * - Secure storage practices
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AuthService } from '@/lib/auth-service';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  is_active?: boolean;
  is_verified?: boolean;
  is_superuser?: boolean;
  google_cloud_identity?: string | null;
  last_login?: string | null;
  created_at?: string;
  updated_at?: string;
  roles?: Array<{
    id: number;
    name: string;
    description?: string;
    is_active?: boolean;
    created_at?: string;
    permissions?: Array<{
      id: number;
      name: string;
      description?: string;
      resource: string;
      action: string;
      created_at?: string;
    }>;
  }>;
}

export interface AuthContextType {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string>;
  validateToken?: () => Promise<boolean>;

  // Utilities
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  clearError: () => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}

// ============================================================================
// Context Creation
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ============================================================================
// Provider Implementation
// ============================================================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    return user?.roles?.some(r => r.name === role) ?? false;
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    return user?.roles?.some(role => 
      role.permissions?.some(p => p.name === permission)
    ) ?? false;
  }, [user]);

  // ============================================================================
  // Authentication Actions
  // ============================================================================

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate inputs
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      const response = await AuthService.login(email, password);
      
      if (!response || !response.tokens?.access_token || !response.user) {
        throw new Error('Invalid response from server');
      }

      // Update state
      setToken(response.tokens.access_token);
      setUser(response.user);
      setIsAuthenticated(true);
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      
      // Reset auth state on error
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      await AuthService.logout();
      
      // Clear all auth state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      
    } catch (err) {
      // Even if logout API fails, clear local state
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string> => {
    try {
      const newToken = await AuthService.refreshToken();
      
      setToken(newToken);
      
      return newToken;
    } catch (err) {
      // On refresh failure, logout user
      await logout();
      throw err;
    }
  }, [logout]);

  const validateToken = useCallback(async (): Promise<boolean> => {
    if (!token) return false;
    
    try {
      const isValid = await AuthService.validateToken(token);
      
      if (!isValid) {
        await logout();
      }
      
      return isValid;
    } catch (err) {
      await logout();
      return false;
    }
  }, [token, logout]);

  // ============================================================================
  // State Synchronization
  // ============================================================================

  // Initialize auth state from storage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is already authenticated
        const isAuth = AuthService.isAuthenticated();
        const storedToken = AuthService.getToken();
        const storedUser = AuthService.getUser();
        
        if (isAuth && storedToken && storedUser) {
          // Validate stored token
          const isValidToken = await AuthService.validateToken(storedToken);
          
          if (isValidToken) {
            setToken(storedToken);
            setUser(storedUser);
            setIsAuthenticated(true);
          } else {
            // Clear invalid session
            await AuthService.logout();
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        // Clear potentially corrupted state
        await AuthService.logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Listen for auth state changes across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vana_auth_token') {
        if (e.newValue === null) {
          // Token was removed in another tab
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        } else if (e.newValue && e.newValue !== token) {
          // Token was updated in another tab
          setToken(e.newValue);
          // Optionally fetch updated user data
        }
      }
      
      if (e.key === 'vana_user_data') {
        if (e.newValue === null) {
          setUser(null);
        } else {
          try {
            const userData = JSON.parse(e.newValue);
            setUser(userData);
          } catch (err) {
            console.error('Failed to parse user data:', err);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [token]);

  // Auto-refresh token before expiration
  useEffect(() => {
    if (!token || !isAuthenticated) return;

    const checkTokenExpiry = async () => {
      try {
        const expiry = AuthService.getTokenExpiry();
        if (!expiry) return;

        const now = Date.now();
        const timeUntilExpiry = expiry - now;
        
        // Refresh if token expires within 5 minutes
        if (timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 0) {
          await refreshToken();
        }
      } catch (err) {
        console.error('Token expiry check failed:', err);
      }
    };

    // Check immediately
    checkTokenExpiry();
    
    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000);
    
    return () => clearInterval(interval);
  }, [token, isAuthenticated, refreshToken]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: AuthContextType = {
    // State
    isAuthenticated,
    isLoading,
    user,
    token,
    error,

    // Actions
    login,
    logout,
    refreshToken,
    validateToken,

    // Utilities
    hasRole,
    hasPermission,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };