/**
 * useAuth Hook
 * Provides authentication functionality and state
 */

import { useCallback, useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { getGoogleOAuthClient } from '@/lib/auth/google-oauth';
import { tokenManager } from '@/lib/auth/token-manager';
import type { AuthState, User } from '@/store/slices/auth';

/**
 * Authentication hook return type
 */
export interface UseAuthReturn {
  // State
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
}

/**
 * useAuth hook for authentication management
 */
export function useAuth(): UseAuthReturn {
  const {
    auth,
    setAuthState,
    setUser,
    setLoading,
    setError,
    clearAuth
  } = useStore();
  
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const isInitializedRef = useRef(false);
  const googleOAuthClient = getGoogleOAuthClient();

  /**
   * Initialize OAuth login flow
   */
  const login = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize OAuth flow
      const { authUrl } = await googleOAuthClient.initializeFlow();
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Login failed');
      setLoading(false);
    }
  }, [setLoading, setError]);

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      
      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      
      // Perform logout
      await googleOAuthClient.logout();
      
      // Clear auth state
      clearAuth();
    } catch (error) {
      console.error('Logout error:', error);
      setError(error instanceof Error ? error.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, clearAuth]);

  /**
   * Refresh authentication token
   */
  const refreshToken = useCallback(async () => {
    try {
      await googleOAuthClient.refreshTokens();
      
      // Update auth state with new token info
      const expiresAt = await tokenManager.getTimeUntilExpiry();
      if (expiresAt) {
        setAuthState({
          ...auth,
          expiresAt: Date.now() + expiresAt
        });
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      
      // If refresh fails, clear auth
      clearAuth();
      setError('Session expired. Please login again.');
    }
  }, [auth, setAuthState, clearAuth, setError]);

  /**
   * Check authentication status
   */
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Check if we have valid tokens
      const isAuthenticated = await googleOAuthClient.getAuthStatus();
      
      if (isAuthenticated) {
        // Get user info from ID token
        const idTokenClaims = await tokenManager.getIdTokenClaims<any>();
        
        if (idTokenClaims) {
          const user: User = {
            id: idTokenClaims.sub,
            email: idTokenClaims.email,
            name: idTokenClaims.name || '',
            picture: idTokenClaims.picture,
            emailVerified: idTokenClaims.email_verified
          };
          
          setUser(user);
          
          // Get token expiry
          const expiresAt = await tokenManager.getTimeUntilExpiry();
          
          setAuthState({
            isAuthenticated: true,
            user,
            accessToken: await tokenManager.getAccessToken() || '',
            idToken: await tokenManager.getIdToken() || '',
            expiresAt: expiresAt ? Date.now() + expiresAt : 0,
            error: null,
            loading: false
          });
          
          return true;
        }
      }
      
      clearAuth();
      return false;
    } catch (error) {
      console.error('Auth check error:', error);
      clearAuth();
      return false;
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUser, setAuthState, clearAuth]);

  /**
   * Clear authentication error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  /**
   * Setup token refresh timer
   */
  const setupRefreshTimer = useCallback(() => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    // Setup monitoring for token expiry
    const cleanup = tokenManager.startExpiryMonitor(async () => {
      await refreshToken();
    });
    
    // Store cleanup function
    refreshTimerRef.current = cleanup as any;
  }, [refreshToken]);

  /**
   * Handle OAuth callback
   */
  const handleOAuthCallback = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    
    if (error) {
      setError(`OAuth error: ${error}`);
      setLoading(false);
      return;
    }
    
    if (code && state) {
      try {
        setLoading(true);
        
        // Handle OAuth callback
        const authState = await googleOAuthClient.handleCallback(code, state);
        
        // Update store
        setAuthState(authState);
        
        // Setup refresh timer
        setupRefreshTimer();
        
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setError(error instanceof Error ? error.message : 'Authentication failed');
      } finally {
        setLoading(false);
      }
    }
  }, [setError, setLoading, setAuthState, setupRefreshTimer]);

  /**
   * Initialize authentication
   */
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      
      // Check for OAuth callback
      if (window.location.pathname === '/auth/callback') {
        handleOAuthCallback();
      } else {
        // Check existing auth status
        checkAuth().then(isAuthenticated => {
          if (isAuthenticated) {
            setupRefreshTimer();
          }
        });
      }
    }
  }, [handleOAuthCallback, checkAuth, setupRefreshTimer]);

  /**
   * Listen for auth events
   */
  useEffect(() => {
    const handleTokensRefreshed = () => {
      checkAuth();
    };
    
    const handleAuthLogout = () => {
      clearAuth();
    };
    
    const handleRefreshFailed = () => {
      clearAuth();
      setError('Session expired. Please login again.');
    };
    
    window.addEventListener('auth:tokens-refreshed', handleTokensRefreshed);
    window.addEventListener('auth:logout', handleAuthLogout);
    window.addEventListener('auth:refresh-failed', handleRefreshFailed);
    
    return () => {
      window.removeEventListener('auth:tokens-refreshed', handleTokensRefreshed);
      window.removeEventListener('auth:logout', handleAuthLogout);
      window.removeEventListener('auth:refresh-failed', handleRefreshFailed);
    };
  }, [checkAuth, clearAuth, setError]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    loading: auth.loading,
    error: auth.error,
    
    // Actions
    login,
    logout,
    refreshToken,
    checkAuth,
    clearError
  };
}