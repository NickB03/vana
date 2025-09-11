/**
 * React Hook for Real-time Research SSE Streaming
 * 
 * Provides a React interface for managing multi-agent research sessions
 * with real-time progress updates, agent status tracking, and state management.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  researchSSEService, 
  ResearchSessionState, 
  ResearchRequest 
} from '@/lib/research-sse-service';

export interface UseResearchSSEResult {
  // State
  sessionState: ResearchSessionState | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startResearch: (query: string) => Promise<void>;
  stopResearch: () => void;
  clearError: () => void;
  
  // Computed values
  isResearchActive: boolean;
  isResearchComplete: boolean;
  hasError: boolean;
}

export interface UseResearchSSEOptions {
  autoReconnect?: boolean;
  onComplete?: (finalReport: string | null) => void;
  onError?: (error: string) => void;
  onProgress?: (progress: number, phase: string) => void;
}

export function useResearchSSE(options: UseResearchSSEOptions = {}): UseResearchSSEResult {
  const {
    autoReconnect = true,
    onComplete,
    onError,
    onProgress,
  } = options;
  
  const [sessionState, setSessionState] = useState<ResearchSessionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentSessionId = useRef<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const previousStateRef = useRef<ResearchSessionState | null>(null);
  
  // Handle session state updates
  const handleSessionUpdate = useCallback((newState: ResearchSessionState) => {
    const previousState = previousStateRef.current;
    setSessionState(newState);
    setIsConnected(newState.status === 'connected' || newState.status === 'running');
    
    // Handle completion
    if (newState.status === 'completed' && previousState?.status !== 'completed') {
      if (onComplete) {
        onComplete(newState.finalReport);
      }
      setIsLoading(false);
    }
    
    // Handle errors
    if (newState.status === 'error') {
      const errorMessage = newState.error || 'Research session failed';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
      setIsLoading(false);
    }
    
    // Handle progress updates
    if (onProgress && newState.status === 'running') {
      if (previousState?.overallProgress !== newState.overallProgress ||
          previousState?.currentPhase !== newState.currentPhase) {
        onProgress(newState.overallProgress, newState.currentPhase);
      }
    }
    
    previousStateRef.current = newState;
  }, [onComplete, onError, onProgress]);
  
  // Start research function
  const startResearch = useCallback(async (query: string) => {
    if (isLoading) {
      console.warn('[useResearchSSE] Research already in progress');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Clean up previous session
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      
      const sessionId = await researchSSEService.startResearch({ query });
      currentSessionId.current = sessionId;
      
      // Subscribe to session updates
      const unsubscribe = researchSSEService.subscribeToSession(sessionId, handleSessionUpdate);
      unsubscribeRef.current = unsubscribe;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start research';
      setError(errorMessage);
      setIsLoading(false);
      
      if (onError) {
        onError(errorMessage);
      }
    }
  }, [isLoading, handleSessionUpdate, onError]);
  
  // Stop research function
  const stopResearch = useCallback(() => {
    if (currentSessionId.current) {
      researchSSEService.stopResearch(currentSessionId.current);
      currentSessionId.current = null;
    }
    
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setSessionState(null);
    setIsConnected(false);
    setIsLoading(false);
    setError(null);
  }, []);
  
  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);
  
  // Computed values
  const isResearchActive = sessionState?.status === 'running' || sessionState?.status === 'connected';
  const isResearchComplete = sessionState?.status === 'completed';
  const hasError = error !== null || sessionState?.status === 'error';
  
  return {
    // State
    sessionState,
    isConnected,
    isLoading,
    error,
    
    // Actions
    startResearch,
    stopResearch,
    clearError,
    
    // Computed values
    isResearchActive,
    isResearchComplete,
    hasError,
  };
}

// ============================================================================
// Additional Hook for Agent Status Tracking
// ============================================================================

export function useAgentStatusTracker(sessionState: ResearchSessionState | null) {
  const [agentMap, setAgentMap] = useState<Map<string, any>>(new Map());
  
  useEffect(() => {
    if (sessionState?.agents) {
      const newMap = new Map();
      sessionState.agents.forEach(agent => {
        newMap.set(agent.agent_type, agent);
      });
      setAgentMap(newMap);
    }
  }, [sessionState?.agents]);
  
  const getAgentByType = useCallback((agentType: string) => {
    return agentMap.get(agentType) || null;
  }, [agentMap]);
  
  const getActiveAgent = useCallback(() => {
    return sessionState?.agents.find(agent => agent.status === 'current') || null;
  }, [sessionState?.agents]);
  
  const getCompletedAgents = useCallback(() => {
    return sessionState?.agents.filter(agent => agent.status === 'completed') || [];
  }, [sessionState?.agents]);
  
  const getPendingAgents = useCallback(() => {
    return sessionState?.agents.filter(agent => agent.status === 'waiting') || [];
  }, [sessionState?.agents]);
  
  const getFailedAgents = useCallback(() => {
    return sessionState?.agents.filter(agent => agent.status === 'error') || [];
  }, [sessionState?.agents]);
  
  return {
    agents: sessionState?.agents || [],
    getAgentByType,
    getActiveAgent,
    getCompletedAgents,
    getPendingAgents,
    getFailedAgents,
    totalAgents: sessionState?.agents.length || 0,
    completedCount: getCompletedAgents().length,
    activeCount: sessionState?.agents.filter(a => a.status === 'current').length || 0,
    errorCount: getFailedAgents().length,
  };
}

// ============================================================================
// Hook for Research Results Management
// ============================================================================

export function useResearchResults(sessionState: ResearchSessionState | null) {
  const [processedResults, setProcessedResults] = useState<{
    sections: Array<{ title: string; content: string; agent: string }>;
    summary: string;
    completion: number;
  } | null>(null);
  
  useEffect(() => {
    if (!sessionState?.partialResults && !sessionState?.finalReport) {
      setProcessedResults(null);
      return;
    }
    
    const sections: Array<{ title: string; content: string; agent: string }> = [];
    let summary = '';
    
    // Process partial results
    if (sessionState.partialResults) {
      Object.entries(sessionState.partialResults).forEach(([agentType, result]) => {
        if (result && typeof result === 'object' && result.content) {
          sections.push({
            title: agentType.replace('_', ' ').toUpperCase(),
            content: result.content,
            agent: agentType,
          });
        }
      });
    }
    
    // Process final report
    if (sessionState.finalReport) {
      summary = sessionState.finalReport;
    } else if (sessionState.currentPhase) {
      summary = `Research in progress: ${sessionState.currentPhase}`;
    }
    
    setProcessedResults({
      sections,
      summary,
      completion: sessionState.overallProgress,
    });
  }, [sessionState?.partialResults, sessionState?.finalReport, sessionState?.currentPhase, sessionState?.overallProgress]);
  
  return processedResults;
}