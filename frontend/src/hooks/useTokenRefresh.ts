/**
 * useTokenRefresh Hook
 * Manages automatic token refresh
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-auth';
import { tokenManager } from '@/lib/auth/token-manager';

/**
 * Token refresh configuration
 */
export interface TokenRefreshConfig {
  enabled?: boolean;
  checkInterval?: number; // in milliseconds
  refreshThreshold?: number; // in milliseconds before expiry
  onRefreshSuccess?: () => void;
  onRefreshError?: (error: Error) => void;
  retryAttempts?: number;
  retryDelay?: number; // in milliseconds
}

/**
 * Token refresh state
 */
export interface TokenRefreshState {
  isRefreshing: boolean;
  lastRefresh: Date | null;
  nextRefresh: Date | null;
  error: Error | null;
}

/**
 * useTokenRefresh hook for automatic token management
 */
export function useTokenRefresh(config: TokenRefreshConfig = {}) {
  const {
    enabled = true,
    checkInterval = 60000, // Check every minute
    refreshThreshold = 5 * 60 * 1000, // 5 minutes before expiry
    onRefreshSuccess,
    onRefreshError,
    retryAttempts = 3,
    retryDelay = 5000
  } = config;
  
  const { isAuthenticated, refreshToken } = useAuth();
  
  const [state, setState] = useState<TokenRefreshState>({
    isRefreshing: false,
    lastRefresh: null,
    nextRefresh: null,
    error: null
  });
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  /**
   * Perform token refresh with retry logic
   */
  const performRefresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      return; // Prevent concurrent refreshes
    }
    
    isRefreshingRef.current = true;
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));
    
    try {
      await tokenManager.ensureRefresh(async () => {
        await refreshToken();
      });
      
      // Reset retry count on success
      retryCountRef.current = 0;
      
      // Update state
      const now = new Date();
      const timeUntilExpiry = await tokenManager.getTimeUntilExpiry();
      const nextRefresh = timeUntilExpiry 
        ? new Date(Date.now() + timeUntilExpiry - refreshThreshold)
        : null;
      
      setState({
        isRefreshing: false,
        lastRefresh: now,
        nextRefresh,
        error: null
      });
      
      // Call success callback
      if (onRefreshSuccess) {
        onRefreshSuccess();
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Token refresh failed');
      
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        error: err
      }));
      
      // Handle retry logic
      if (retryCountRef.current < retryAttempts) {
        retryCountRef.current++;
        
        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        
        retryTimeoutRef.current = setTimeout(() => {
          performRefresh();
        }, retryDelay * retryCountRef.current);
      } else {
        // Max retries reached
        if (onRefreshError) {
          onRefreshError(err);
        }
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refreshToken, refreshThreshold, retryAttempts, retryDelay, onRefreshSuccess, onRefreshError]);
  
  /**
   * Check if refresh is needed
   */
  const checkRefreshNeeded = useCallback(async () => {
    if (!isAuthenticated || !enabled) {
      return;
    }
    
    try {
      const needsRefresh = await tokenManager.needsRefresh();
      
      if (needsRefresh && !isRefreshingRef.current) {
        await performRefresh();
      } else {
        // Update next refresh time
        const timeUntilExpiry = await tokenManager.getTimeUntilExpiry();
        if (timeUntilExpiry) {
          setState(prev => ({
            ...prev,
            nextRefresh: new Date(Date.now() + timeUntilExpiry - refreshThreshold)
          }));
        }
      }
    } catch (error) {
      console.error('Token refresh check error:', error);
    }
  }, [isAuthenticated, enabled, performRefresh, refreshThreshold]);
  
  /**
   * Force immediate refresh
   */
  const forceRefresh = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error('Cannot refresh token when not authenticated');
    }
    
    await performRefresh();
  }, [isAuthenticated, performRefresh]);
  
  /**
   * Setup automatic refresh checking
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }
    
    // Initial check
    checkRefreshNeeded();
    
    // Setup interval
    intervalRef.current = setInterval(checkRefreshNeeded, checkInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [enabled, isAuthenticated, checkInterval, checkRefreshNeeded]);
  
  /**
   * Listen for visibility change to refresh when app becomes visible
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App became visible, check if refresh is needed
        checkRefreshNeeded();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, isAuthenticated, checkRefreshNeeded]);
  
  /**
   * Listen for online/offline events
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated) {
      return;
    }
    
    const handleOnline = () => {
      // Connection restored, check if refresh is needed
      checkRefreshNeeded();
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [enabled, isAuthenticated, checkRefreshNeeded]);
  
  return {
    ...state,
    forceRefresh,
    checkNow: checkRefreshNeeded
  };
}

// Re-export for convenience
import { useState } from 'react';