/**
 * Custom hook for authentication state stabilization
 * 
 * Provides stable auth state by:
 * - Tracking auth state changes over time
 * - Preventing decisions during rapid state transitions
 * - Debouncing state changes to avoid race conditions
 * - Providing redirect loop prevention
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { User } from '@/types/auth';

// ============================================================================
// Types
// ============================================================================

export interface AuthStabilizationState {
  isStable: boolean;
  isInitialized: boolean;
  stableAuth: boolean;
  stableUser: User | null;
  canRedirect: boolean;
  redirectHistory: string[];
}

interface RedirectHistoryEntry {
  path: string;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const STABILIZATION_DELAY = 150; // ms to wait before considering state stable
const MAX_REDIRECT_HISTORY = 10; // Maximum redirect history entries
const REDIRECT_LOOP_THRESHOLD = 3; // Max redirects to same path within time window
const REDIRECT_TIME_WINDOW = 5000; // Time window for detecting loops (5 seconds)

// ============================================================================
// Custom Hook
// ============================================================================

export function useAuthStabilization() {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Stabilization state
  const [isStable, setIsStable] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [stableAuth, setStableAuth] = useState(false);
  const [stableUser, setStableUser] = useState(null);
  
  // Redirect tracking
  const redirectHistoryRef = useRef<RedirectHistoryEntry[]>([]);
  const stabilizationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAuthStateRef = useRef({ isAuthenticated, isLoading, user });
  
  // Clear stabilization timer
  const clearStabilizationTimer = useCallback(() => {
    if (stabilizationTimerRef.current) {
      clearTimeout(stabilizationTimerRef.current);
      stabilizationTimerRef.current = null;
    }
  }, []);
  
  // Check for redirect loops
  const wouldCreateRedirectLoop = useCallback((targetPath: string): boolean => {
    const now = Date.now();
    const recentRedirects = redirectHistoryRef.current.filter(
      entry => (now - entry.timestamp) <= REDIRECT_TIME_WINDOW
    );
    
    const redirectsToTarget = recentRedirects.filter(
      entry => entry.path === targetPath
    ).length;
    
    return redirectsToTarget >= REDIRECT_LOOP_THRESHOLD;
  }, []);
  
  // Add redirect to history
  const addRedirectToHistory = useCallback((path: string) => {
    const now = Date.now();
    const entry: RedirectHistoryEntry = { path, timestamp: now };
    
    redirectHistoryRef.current.push(entry);
    
    // Keep only recent entries
    redirectHistoryRef.current = redirectHistoryRef.current
      .filter(e => (now - e.timestamp) <= REDIRECT_TIME_WINDOW)
      .slice(-MAX_REDIRECT_HISTORY);
  }, []);
  
  // Check if redirect is safe
  const canSafelyRedirect = useCallback((targetPath: string): boolean => {
    if (!isStable || !isInitialized) {
      return false;
    }
    
    return !wouldCreateRedirectLoop(targetPath);
  }, [isStable, isInitialized, wouldCreateRedirectLoop]);
  
  // Clear redirect history
  const clearRedirectHistory = useCallback(() => {
    redirectHistoryRef.current = [];
  }, []);
  
  // Effect to handle auth state stabilization
  useEffect(() => {
    const currentState = { isAuthenticated, isLoading, user };
    const prevState = lastAuthStateRef.current;
    
    // Check if auth state has changed
    const hasStateChanged = 
      currentState.isAuthenticated !== prevState.isAuthenticated ||
      currentState.isLoading !== prevState.isLoading ||
      currentState.user !== prevState.user;
    
    if (hasStateChanged) {
      // State changed, mark as unstable and start stabilization timer
      setIsStable(false);
      clearStabilizationTimer();
      
      stabilizationTimerRef.current = setTimeout(() => {
        // After delay, mark as stable with current state
        setIsStable(true);
        setIsInitialized(true);
        setStableAuth(isAuthenticated);
        setStableUser(user);
      }, STABILIZATION_DELAY);
    }
    
    // Update last known state
    lastAuthStateRef.current = currentState;
    
    return clearStabilizationTimer;
  }, [isAuthenticated, isLoading, user, clearStabilizationTimer]);
  
  // Initial stabilization on mount
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      stabilizationTimerRef.current = setTimeout(() => {
        setIsStable(true);
        setIsInitialized(true);
        setStableAuth(isAuthenticated);
        setStableUser(user);
      }, STABILIZATION_DELAY);
    }
    
    return clearStabilizationTimer;
  }, [isLoading, isInitialized, isAuthenticated, user, clearStabilizationTimer]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearStabilizationTimer();
      redirectHistoryRef.current = [];
    };
  }, [clearStabilizationTimer]);
  
  return {
    // State
    isStable,
    isInitialized,
    stableAuth,
    stableUser,
    canRedirect: isStable && isInitialized,
    redirectHistory: redirectHistoryRef.current.map(entry => entry.path),
    
    // Actions
    canSafelyRedirect,
    addRedirectToHistory,
    clearRedirectHistory,
    wouldCreateRedirectLoop,
  };
}

export default useAuthStabilization;