/**
 * Hook to Bridge SSE with ResponseStream
 * 
 * Provides a React hook that connects the existing useResearchSSE hook
 * with the ResponseStream component via the SSE-to-ResponseStream adapter.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useResearchSSE, UseResearchSSEOptions } from '@/hooks/use-research-sse';
import { ResponseStreamAdapter, ResponseStreamData, createResponseStreamAdapter } from '@/lib/response-stream-adapter';

export interface UseResponseStreamSSEOptions extends UseResearchSSEOptions {
  /**
   * Whether to use ResponseStream mode instead of traditional SSE display
   * @default false
   */
  enableResponseStream?: boolean;
  
  /**
   * ResponseStream mode configuration
   * @default "typewriter"
   */
  streamMode?: 'typewriter' | 'fade';
  
  /**
   * ResponseStream speed (1-100)
   * @default 30
   */
  streamSpeed?: number;

  /**
   * Callback when ResponseStream completes streaming
   */
  onStreamComplete?: () => void;
}

export interface UseResponseStreamSSEResult {
  // Original SSE hook results (preserved for compatibility)
  sessionState: ReturnType<typeof useResearchSSE>['sessionState'];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  startResearch: (query: string) => Promise<void>;
  stopResearch: () => void;
  clearError: () => void;
  isResearchActive: boolean;
  isResearchComplete: boolean;
  hasError: boolean;

  // ResponseStream-specific results
  responseStreamData: ResponseStreamData | null;
  isResponseStreamMode: boolean;
  streamingError: string | null;
  
  // Control methods
  switchToResponseStreamMode: () => void;
  switchToTraditionalMode: () => void;
}

/**
 * Hook that bridges SSE events with ResponseStream component
 */
export function useResponseStreamSSE(options: UseResponseStreamSSEOptions = {}): UseResponseStreamSSEResult {
  const {
    enableResponseStream = false,
    streamMode = 'typewriter',
    streamSpeed = 30,
    onStreamComplete,
    ...sseOptions
  } = options;

  // Original SSE hook
  const sseHook = useResearchSSE(sseOptions);

  // ResponseStream-specific state
  const [isResponseStreamMode, setIsResponseStreamMode] = useState(enableResponseStream);
  const [responseStreamData, setResponseStreamData] = useState<ResponseStreamData | null>(null);
  const [streamingError, setStreamingError] = useState<string | null>(null);

  // Adapter instance
  const adapterRef = useRef<ResponseStreamAdapter | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize adapter when needed
  const initializeAdapter = useCallback(() => {
    if (!adapterRef.current) {
      adapterRef.current = createResponseStreamAdapter();
      console.log('[useResponseStreamSSE] Adapter initialized');
    }
    return adapterRef.current;
  }, []);

  // Reset adapter
  const resetAdapter = useCallback(() => {
    if (adapterRef.current) {
      adapterRef.current.reset();
      adapterRef.current = null;
      console.log('[useResponseStreamSSE] Adapter reset');
    }
    setResponseStreamData(null);
    setStreamingError(null);
    isInitializedRef.current = false;
  }, []);

  // Switch modes
  const switchToResponseStreamMode = useCallback(() => {
    setIsResponseStreamMode(true);
    if (sseHook.sessionState) {
      const adapter = initializeAdapter();
      const streamData = adapter.createResponseStreamData(sseHook.sessionState);
      setResponseStreamData(streamData);
    }
  }, [sseHook.sessionState, initializeAdapter]);

  const switchToTraditionalMode = useCallback(() => {
    setIsResponseStreamMode(false);
    resetAdapter();
  }, [resetAdapter]);

  // Handle session state updates
  useEffect(() => {
    if (!isResponseStreamMode || !sseHook.sessionState) {
      return;
    }

    const adapter = initializeAdapter();

    // Initialize ResponseStream data if not already done
    if (!responseStreamData || !isInitializedRef.current) {
      console.log('[useResponseStreamSSE] Creating ResponseStream data from session state');
      const streamData = adapter.createResponseStreamData(sseHook.sessionState);
      setResponseStreamData(streamData);
      isInitializedRef.current = true;
    }

    // Handle completion
    if (sseHook.sessionState.status === 'completed') {
      console.log('[useResponseStreamSSE] Research completed, finalizing stream');
      adapter.completeStream(sseHook.sessionState.finalReport);
      if (onStreamComplete) {
        onStreamComplete();
      }
    }

    // Handle errors
    if (sseHook.sessionState.status === 'error') {
      console.log('[useResponseStreamSSE] Research error, handling stream error');
      const errorMessage = sseHook.sessionState.error || 'Research session failed';
      adapter.errorStream(errorMessage);
      setStreamingError(errorMessage);
    }

  }, [sseHook.sessionState, isResponseStreamMode, responseStreamData, initializeAdapter, onStreamComplete]);

  // Process SSE events (this would ideally be integrated directly with the SSE service)
  useEffect(() => {
    if (!isResponseStreamMode || !adapterRef.current || !sseHook.sessionState) {
      return;
    }

    // Create a synthetic event from session state for processing
    // In a real implementation, we'd want to intercept the actual SSE events
    if (sseHook.sessionState.status === 'running') {
      const syntheticEvent = {
        type: 'research_progress' as const,
        sessionId: sseHook.sessionState.sessionId,
        status: 'running' as const,
        overall_progress: sseHook.sessionState.overallProgress,
        current_phase: sseHook.sessionState.currentPhase,
        agents: sseHook.sessionState.agents,
        partial_results: sseHook.sessionState.partialResults,
        timestamp: sseHook.sessionState.lastUpdate.toISOString(),
      };

      adapterRef.current.processSSEEvent(syntheticEvent);
    }
  }, [
    isResponseStreamMode, 
    sseHook.sessionState?.status, 
    sseHook.sessionState?.overallProgress,
    sseHook.sessionState?.partialResults,
    sseHook.sessionState?.lastUpdate
  ]);

  // Enhanced startResearch that can initialize ResponseStream mode
  const startResearch = useCallback(async (query: string) => {
    try {
      setStreamingError(null);
      
      if (isResponseStreamMode) {
        resetAdapter(); // Reset any previous adapter state
      }
      
      await sseHook.startResearch(query);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start research';
      setStreamingError(errorMessage);
      throw error;
    }
  }, [sseHook.startResearch, isResponseStreamMode, resetAdapter]);

  // Enhanced stopResearch that cleans up adapter
  const stopResearch = useCallback(() => {
    sseHook.stopResearch();
    if (isResponseStreamMode) {
      resetAdapter();
    }
  }, [sseHook.stopResearch, isResponseStreamMode, resetAdapter]);

  // Enhanced clearError that clears both SSE and streaming errors
  const clearError = useCallback(() => {
    sseHook.clearError();
    setStreamingError(null);
  }, [sseHook.clearError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetAdapter();
    };
  }, [resetAdapter]);

  return {
    // Original SSE hook results (preserved for compatibility)
    sessionState: sseHook.sessionState,
    isConnected: sseHook.isConnected,
    isLoading: sseHook.isLoading,
    error: sseHook.error || streamingError, // Combine both error sources
    startResearch,
    stopResearch,
    clearError,
    isResearchActive: sseHook.isResearchActive,
    isResearchComplete: sseHook.isResearchComplete,
    hasError: sseHook.hasError || !!streamingError,

    // ResponseStream-specific results
    responseStreamData,
    isResponseStreamMode,
    streamingError,

    // Control methods
    switchToResponseStreamMode,
    switchToTraditionalMode,
  };
}

/**
 * Utility hook for feature flag support
 * This allows for A/B testing between traditional SSE and ResponseStream modes
 */
export function useResponseStreamFeatureFlag() {
  const [isEnabled, setIsEnabled] = useState(() => {
    // Check for feature flag in localStorage or environment
    if (typeof window !== 'undefined') {
      const storedFlag = localStorage.getItem('vana_responsestream_enabled');
      if (storedFlag !== null) {
        return storedFlag === 'true';
      }
    }
    
    // Check environment variable
    return process.env.NEXT_PUBLIC_RESPONSESTREAM_ENABLED === 'true';
  });

  const toggleFeatureFlag = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vana_responsestream_enabled', enabled.toString());
    }
  }, []);

  return {
    isResponseStreamEnabled: isEnabled,
    toggleResponseStream: toggleFeatureFlag
  };
}