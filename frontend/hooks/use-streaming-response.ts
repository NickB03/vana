/**
 * Hook for Streaming Response Integration
 * 
 * Bridges SSE with ResponseStream for research streaming.
 * Provides unified interface for both streaming approaches.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useResearchSSE, UseResearchSSEOptions } from './use-research-sse';
import { ResponseStreamAdapter, ResponseStreamData, createResponseStreamAdapter } from '@/lib/response-stream-adapter';
import { ResearchSessionState } from '@/lib/research-sse-service';

export interface UseStreamingResponseOptions extends UseResearchSSEOptions {
  /**
   * Enable ResponseStream mode
   * @default false
   */
  enableResponseStream?: boolean;
  
  /**
   * Stream mode for ResponseStream
   * @default "typewriter"
   */
  streamMode?: 'typewriter' | 'fade';
  
  /**
   * Stream speed (1-100)
   * @default 30
   */
  streamSpeed?: number;
  
  /**
   * Show agent overlay
   * @default true
   */
  showAgentOverlay?: boolean;
  
  /**
   * Show connection health
   * @default true
   */
  showConnectionHealth?: boolean;
}

export interface UseStreamingResponseResult {
  // Original SSE results
  sessionState: ResearchSessionState | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  isResearchActive: boolean;
  isResearchComplete: boolean;
  hasError: boolean;
  
  // ResponseStream data
  responseStreamData: ResponseStreamData | null;
  isResponseStreamMode: boolean;
  streamingError: string | null;
  
  // Actions
  startResearch: (query: string) => Promise<void>;
  stopResearch: () => void;
  clearError: () => void;
  
  // Mode switching
  enableResponseStream: () => void;
  disableResponseStream: () => void;
  toggleResponseStream: () => void;
}

/**
 * Hook that provides streaming response functionality
 */
export function useStreamingResponse(options: UseStreamingResponseOptions = {}): UseStreamingResponseResult {
  const {
    enableResponseStream = false,
    streamMode = 'typewriter',
    streamSpeed = 30,
    showAgentOverlay = true,
    showConnectionHealth = true,
    ...sseOptions
  } = options;

  // Use the original SSE hook
  const sseHook = useResearchSSE(sseOptions);

  // ResponseStream state
  const [isResponseStreamMode, setIsResponseStreamMode] = useState(enableResponseStream);
  const [responseStreamData, setResponseStreamData] = useState<ResponseStreamData | null>(null);
  const [streamingError, setStreamingError] = useState<string | null>(null);

  // Adapter reference
  const adapterRef = useRef<ResponseStreamAdapter | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize adapter
  const initializeAdapter = useCallback(() => {
    if (!adapterRef.current) {
      adapterRef.current = createResponseStreamAdapter();
      console.log('[useStreamingResponse] ResponseStream adapter initialized');
    }
    return adapterRef.current;
  }, []);

  // Clean up adapter
  const cleanupAdapter = useCallback(() => {
    if (adapterRef.current) {
      adapterRef.current.reset();
      adapterRef.current = null;
      console.log('[useStreamingResponse] ResponseStream adapter cleaned up');
    }
    setResponseStreamData(null);
    setStreamingError(null);
    isInitializedRef.current = false;
  }, []);

  // Mode switching functions
  const enableResponseStreamMode = useCallback(() => {
    console.log('[useStreamingResponse] Enabling ResponseStream mode');
    setIsResponseStreamMode(true);
    if (sseHook.sessionState) {
      const adapter = initializeAdapter();
      const streamData = adapter.createResponseStreamData(sseHook.sessionState);
      setResponseStreamData(streamData);
      isInitializedRef.current = true;
    }
  }, [sseHook.sessionState, initializeAdapter]);

  const disableResponseStreamMode = useCallback(() => {
    console.log('[useStreamingResponse] Disabling ResponseStream mode');
    setIsResponseStreamMode(false);
    cleanupAdapter();
  }, [cleanupAdapter]);

  const toggleResponseStreamMode = useCallback(() => {
    if (isResponseStreamMode) {
      disableResponseStreamMode();
    } else {
      enableResponseStreamMode();
    }
  }, [isResponseStreamMode, enableResponseStreamMode, disableResponseStreamMode]);

  // Handle session state changes
  useEffect(() => {
    if (!isResponseStreamMode || !sseHook.sessionState) {
      return;
    }

    const adapter = initializeAdapter();

    // Initialize stream data if not done yet
    if (!responseStreamData || !isInitializedRef.current) {
      console.log('[useStreamingResponse] Creating ResponseStream data from session state');
      const streamData = adapter.createResponseStreamData(sseHook.sessionState);
      setResponseStreamData(streamData);
      isInitializedRef.current = true;
    }

    // Handle completion
    if (sseHook.sessionState.status === 'completed') {
      console.log('[useStreamingResponse] Research completed, finalizing ResponseStream');
      adapter.completeStream(sseHook.sessionState.finalReport);
    }

    // Handle errors
    if (sseHook.sessionState.status === 'error') {
      console.log('[useStreamingResponse] Research error, handling ResponseStream error');
      const errorMessage = sseHook.sessionState.error || 'Research session failed';
      adapter.errorStream(errorMessage);
      setStreamingError(errorMessage);
    }
  }, [sseHook.sessionState, isResponseStreamMode, responseStreamData, initializeAdapter]);

  // Process SSE events for ResponseStream
  useEffect(() => {
    if (!isResponseStreamMode || !adapterRef.current || !sseHook.sessionState) {
      return;
    }

    // Create synthetic event for processing (in real implementation, we'd intercept actual SSE events)
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

  // Enhanced startResearch
  const startResearch = useCallback(async (query: string) => {
    try {
      setStreamingError(null);
      
      if (isResponseStreamMode) {
        cleanupAdapter(); // Reset previous state
      }
      
      await sseHook.startResearch(query);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start research';
      setStreamingError(errorMessage);
      throw error;
    }
  }, [sseHook.startResearch, isResponseStreamMode, cleanupAdapter]);

  // Enhanced stopResearch
  const stopResearch = useCallback(() => {
    sseHook.stopResearch();
    if (isResponseStreamMode) {
      cleanupAdapter();
    }
  }, [sseHook.stopResearch, isResponseStreamMode, cleanupAdapter]);

  // Enhanced clearError
  const clearError = useCallback(() => {
    sseHook.clearError();
    setStreamingError(null);
  }, [sseHook.clearError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAdapter();
    };
  }, [cleanupAdapter]);

  return {
    // Original SSE results
    sessionState: sseHook.sessionState,
    isConnected: sseHook.isConnected,
    isLoading: sseHook.isLoading,
    error: sseHook.error || streamingError,
    isResearchActive: sseHook.isResearchActive,
    isResearchComplete: sseHook.isResearchComplete,
    hasError: sseHook.hasError || !!streamingError,
    
    // ResponseStream specific
    responseStreamData,
    isResponseStreamMode,
    streamingError,
    
    // Actions
    startResearch,
    stopResearch,
    clearError,
    
    // Mode switching
    enableResponseStream: enableResponseStreamMode,
    disableResponseStream: disableResponseStreamMode,
    toggleResponseStream: toggleResponseStreamMode,
  };
}

/**
 * Utility hook for ResponseStream feature flag management
 */
export function useResponseStreamFeatureFlag() {
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check localStorage first
      const stored = localStorage.getItem('vana_response_stream_enabled');
      if (stored !== null) {
        return stored === 'true';
      }
    }
    
    // Check environment variable
    return process.env.NEXT_PUBLIC_RESPONSE_STREAM_ENABLED === 'true';
  });

  const enableFeature = useCallback(() => {
    setIsEnabled(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vana_response_stream_enabled', 'true');
    }
    console.log('[ResponseStream] Feature enabled');
  }, []);

  const disableFeature = useCallback(() => {
    setIsEnabled(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vana_response_stream_enabled', 'false');
    }
    console.log('[ResponseStream] Feature disabled');
  }, []);

  const toggleFeature = useCallback(() => {
    if (isEnabled) {
      disableFeature();
    } else {
      enableFeature();
    }
  }, [isEnabled, enableFeature, disableFeature]);

  return {
    isResponseStreamEnabled: isEnabled,
    enableResponseStream: enableFeature,
    disableResponseStream: disableFeature,
    toggleResponseStream: toggleFeature,
  };
}