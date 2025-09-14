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

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo, useRef } from 'react';
import { AuthService } from '@/lib/auth-service';
import { useDebouncedStorage, type StorageChangeEvent } from '@/hooks/use-debounced-storage';
import type { User } from '@/types/auth';

// ============================================================================
// Types
// ============================================================================

// ============================================================================
// User Data Transformation Utilities
// ============================================================================

/**
 * Transform stored user data from AuthService to match the unified User interface
 * Handles compatibility between different user data formats
 */
function transformStoredUser(storedUser: any): User | null {
  if (!storedUser) return null;

  try {
    const userId = storedUser.id || storedUser.user_id || '';
    return {
      // Primary identifiers
      user_id: userId,
      id: userId,
      
      // Basic profile information
      email: storedUser.email || '',
      username: storedUser.username || storedUser.name || storedUser.email?.split('@')[0] || 'user',
      
      // Name fields
      first_name: storedUser.first_name,
      last_name: storedUser.last_name,
      full_name: storedUser.full_name || storedUser.name,
      name: storedUser.name || storedUser.full_name || storedUser.username,
      
      // Status and verification
      is_active: storedUser.is_active,
      is_verified: storedUser.is_verified || storedUser.isEmailVerified,
      is_superuser: storedUser.is_superuser,
      
      // Authentication and security
      google_cloud_identity: storedUser.google_cloud_identity,
      last_login: storedUser.last_login || storedUser.lastLogin,
      
      // Timestamps
      created_at: storedUser.created_at || storedUser.createdAt || new Date().toISOString(),
      updated_at: storedUser.updated_at,
      
      // User preferences and settings
      preferences: storedUser.preferences || {},
      subscription_tier: storedUser.subscription_tier || 'free',
      
      // Profile customization
      avatar: storedUser.avatar,
      profile: storedUser.profile,
      
      // Authorization
      roles: transformRoles(storedUser.roles),
      role_names: extractRoleNames(storedUser.roles),
      permissions: storedUser.permissions,
    };
  } catch (error) {
    console.error('Error transforming stored user data:', error);
    return null;
  }
}

/**
 * Transform roles from various formats to the expected format
 */
function transformRoles(roles: any): User['roles'] {
  if (!roles) return undefined;
  
  // If roles is already in the expected format
  if (Array.isArray(roles) && typeof roles[0] === 'object' && roles[0]?.id) {
    return roles;
  }
  
  // If roles is a simple string array
  if (Array.isArray(roles) && typeof roles[0] === 'string') {
    return roles.map((roleName: string, index: number) => ({
      id: index + 1,
      name: roleName,
      is_active: true,
    }));
  }
  
  return undefined;
}

/**
 * Extract simple role names from complex role objects
 */
function extractRoleNames(roles: any): string[] | undefined {
  if (!roles) return undefined;
  
  // If roles is already a string array
  if (Array.isArray(roles) && typeof roles[0] === 'string') {
    return roles;
  }
  
  // If roles is an array of objects, extract the names
  if (Array.isArray(roles) && typeof roles[0] === 'object' && roles[0]?.name) {
    return roles.map((role: any) => role.name);
  }
  
  return undefined;
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
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Track initialization attempts to prevent race conditions
  const initializationAttemptedRef = useRef(false);
  const isInitializingRef = useRef(false);

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
  
  // Memoized storage keys for debounced storage handler
  const storageKeys = useMemo(() => ['vana_auth_token', 'vana_user_data'], []);

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
      const transformedUser = transformStoredUser(response.user);
      if (transformedUser) {
        setUser(transformedUser);
        setIsAuthenticated(true);
      } else {
        throw new Error('Invalid user data received from server');
      }
      
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

  // Initialize auth state from storage with race condition prevention
  useEffect(() => {
    const initializeAuth = async () => {
      // Prevent multiple initialization attempts
      if (initializationAttemptedRef.current || isInitializingRef.current) {
        return;
      }
      
      initializationAttemptedRef.current = true;
      isInitializingRef.current = true;
      
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
            const transformedUser = transformStoredUser(storedUser);
            if (transformedUser) {
              setUser(transformedUser);
              setIsAuthenticated(true);
            } else {
              console.error('Failed to transform stored user data, clearing session');
              await AuthService.logout();
            }
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
        setIsInitialized(true);
        isInitializingRef.current = false;
      }
    };

    initializeAuth();
  }, []);

  // Debounced storage change handler
  const handleDebouncedStorageChange = useCallback((event: StorageChangeEvent) => {
    // Only process if we're initialized to prevent race conditions during startup
    if (!isInitialized) return;
    
    if (event.key === 'vana_auth_token') {
      if (event.newValue === null) {
        // Token was removed in another tab
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } else if (event.newValue && event.newValue !== token) {
        // Token was updated in another tab
        setToken(event.newValue);
        // Optionally fetch updated user data
      }
    }
    
    if (event.key === 'vana_user_data') {
      if (event.newValue === null) {
        setUser(null);
      } else {
        try {
          const userData = JSON.parse(event.newValue);
          const transformedUser = transformStoredUser(userData);
          if (transformedUser) {
            setUser(transformedUser);
          } else {
            console.error('Failed to transform user data from storage change');
          }
        } catch (err) {
          console.error('Failed to parse user data:', err);
        }
      }
    }
  }, [isInitialized, token]);
  
  // Use debounced storage hook
  useDebouncedStorage(storageKeys, handleDebouncedStorageChange);

  // Memoized refresh token function to prevent effect dependency issues
  const memoizedRefreshToken = useMemo(() => refreshToken, [refreshToken]);
  
  // Auto-refresh token before expiration
  useEffect(() => {
    if (!token || !isAuthenticated || !isInitialized) return;

    const checkTokenExpiry = async () => {
      try {
        const expiry = AuthService.getTokenExpiry();
        if (!expiry) return;

        const now = Date.now();
        const timeUntilExpiry = expiry - now;
        
        // Refresh if token expires within 5 minutes
        if (timeUntilExpiry <= 5 * 60 * 1000 && timeUntilExpiry > 0) {
          await memoizedRefreshToken();
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
  }, [token, isAuthenticated, isInitialized, memoizedRefreshToken]);

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: AuthContextType = useMemo(() => ({
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
  }), [isAuthenticated, isLoading, user, token, error, login, logout, refreshToken, validateToken, hasRole, hasPermission, clearError]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };