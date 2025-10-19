/**
 * useChatStream Hook - Chat message streaming with SSE integration
 * Connects PromptInput to backend research endpoints with real-time updates
 *
 * Refactored into modular components for better maintainability
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useResearchSSE } from './useSSE';
import { useAuth } from './useAuth';
import { apiClient } from '../lib/api/client';

// Import refactored modules
import { useChatStore } from './chat/store';
import { useSessionUtils } from './chat/session-utils';
import { useMessageHandlers } from './chat/message-handlers';
import { useSSEEventHandlers } from './chat/sse-event-handlers';
import {
  ChatStreamOptions,
  ChatStreamReturn,
  summaryToChatSession
} from './chat/types';

// Re-export types and store for backwards compatibility
export type { ChatSession, ChatStreamReturn } from './chat/types';
export { useChatStore } from './chat/store';

/**
 * Main chat streaming hook
 */
export function useChatStream(options: ChatStreamOptions = {}): ChatStreamReturn {
  const { autoCreateSession = false } = options;

  const { isAuthenticated } = useAuth();
  const hasAuthToken = isAuthenticated && apiClient.isAuthenticated();
  const currentSessionId = useChatStore(state => state.currentSessionId);
  const sessions = useChatStore(state => state.sessions);
  const createSessionInStore = useChatStore(state => state.createSession);
  const setCurrentSessionInStore = useChatStore(state => state.setCurrentSession);
  const clearSessionInStore = useChatStore(state => state.clearSession);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedServerSessions, setHasLoadedServerSessions] = useState(false);

  const currentSession = currentSessionId ? sessions[currentSessionId] : null;

  // Get session utilities
  const { ensureSessionHistory, loadServerSessions } = useSessionUtils();

  // CRITICAL FIX: Stable SSE options (enabled flag removed - calculated by useResearchSSE)
  // This prevents hook destruction between updateRequestBody() and connect()
  const sseOptions = useMemo(() => ({
    autoReconnect: true,
    maxReconnectAttempts: 5,
    // NOTE: 'enabled' flag removed - useResearchSSE calculates it from sessionId/url
  }), []); // ✅ NEVER CHANGES - no dependencies

  // Single SSE connection for all events (research + agent status)
  // Following Google ADK best practices: all events flow through one stream
  // useResearchSSE will enable/disable based on sessionId validity
  const researchSSE = useResearchSSE(currentSessionId || '', sseOptions);

  // Development logging (optional - can be removed in production)
  useEffect(() => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment) {
      console.log('[useChatStream] SSE state:', {
        currentSessionId,
        hasAuthToken,
        connectionState: researchSSE.connectionState,
        NODE_ENV: process.env.NODE_ENV
      });
    }
  }, [currentSessionId, hasAuthToken, researchSSE.connectionState]);

  // Auto-create session if needed
  useEffect(() => {
    if (autoCreateSession && !currentSessionId) {
      createSessionInStore();
    }
  }, [autoCreateSession, currentSessionId, createSessionInStore]);

  useEffect(() => {
    if (hasLoadedServerSessions || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const loadSessions = async () => {
      try {
        await loadServerSessions();
        if (!cancelled) {
          setHasLoadedServerSessions(true);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to load session history from API', err);
          setHasLoadedServerSessions(true);
        }
      }
    };

    const invokeLoad = () => {
      if (!cancelled) {
        void loadSessions();
      }
    };

    if (typeof window === 'undefined') {
      invokeLoad();
      return () => {
        cancelled = true;
      };
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleHandle = idleWindow.requestIdleCallback(() => {
        idleHandle = null;
        invokeLoad();
      }, { timeout: 1500 });
    } else {
      timeoutHandle = window.setTimeout(() => {
        timeoutHandle = null;
        invokeLoad();
      }, 0);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [hasLoadedServerSessions, loadServerSessions, isAuthenticated]);

  // CRITICAL FIX: Use refs to avoid dependency issues and stale closures
  // This ensures message handlers always have the latest SSE hook reference
  const researchSSERef = useRef(researchSSE);
  researchSSERef.current = researchSSE;

  // Get message handlers (using ref to prevent stale closures)
  const { sendMessage, retryLastMessage } = useMessageHandlers({
    currentSessionId,
    currentSession,
    setIsStreaming,
    setError,
    researchSSE: researchSSERef,  // Pass ref instead of direct value
    agentSSE: researchSSERef,     // Use same stream for agent events
  });

  // Setup SSE event handlers (single stream handles all event types)
  useSSEEventHandlers({
    currentSessionId,
    currentSession,
    researchSSE,
    agentSSE: researchSSE, // Same stream for agent events
    setIsStreaming,
    setError,
  });

  // Cleanup SSE connection on unmount or sessionId change
  useEffect(() => {
    return () => {
      researchSSERef.current.disconnect();
    };
  }, [currentSessionId]);

  useEffect(() => {
    if (currentSessionId) {
      void ensureSessionHistory(currentSessionId);
    }
  }, [currentSessionId, ensureSessionHistory]);

  // Create new session
  const createNewSession = useCallback(() => {
    return createSessionInStore();
  }, [createSessionInStore]);

  // Switch to different session
  const switchSession = useCallback((sessionId: string | null) => {
    setCurrentSessionInStore(sessionId);
    if (sessionId) {
      void ensureSessionHistory(sessionId);
    }
  }, [setCurrentSessionInStore, ensureSessionHistory]);

  // Clear current session
  const clearCurrentSession = useCallback(() => {
    if (currentSessionId) {
      clearSessionInStore(currentSessionId);
    }
  }, [currentSessionId, clearSessionInStore]);

  // Get all sessions
  // PERFORMANCE FIX: Cache sorted sessions to prevent re-sorting on every call
  const sortedSessions = useMemo(() => {
    return Object.values(sessions).sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [sessions]);

  const getAllSessions = useCallback(() => {
    return sortedSessions;
  }, [sortedSessions]);

  // Get session by ID
  const getSessionById = useCallback((sessionId: string) => {
    return sessions[sessionId] || null;
  }, [sessions]);

  // Memoize connection management functions
  const connectSSE = useCallback(() => {
    researchSSE.connect();
  }, [researchSSE.connect]);

  const disconnectSSE = useCallback(() => {
    researchSSE.disconnect();
  }, [researchSSE.disconnect]);

  // Memoize stable arrays and objects to prevent re-render loops
  // CRITICAL: Sort messages by timestamp to ensure correct display order
  // PERFORMANCE FIX: Use message length and last message ID as dependencies
  // instead of the entire messages array to prevent unnecessary sorts
  // BUG FIX: Added timestamp to dependencies to detect content updates during streaming
  const stableMessages = useMemo(() => {
    if (!Array.isArray(currentSession?.messages)) return [];

    // Sort messages by timestamp (ascending - oldest first)
    // PERFORMANCE: This only runs when message count or last message changes
    return [...currentSession.messages].sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeA - timeB;
    });
  }, [
    currentSession?.messages?.length,
    currentSession?.messages?.[currentSession.messages.length - 1]?.id,
    // CRITICAL FIX: Include timestamp to detect content updates (e.g., streaming messages)
    // Without this, updateStreamingMessage changes content but memo doesn't recalculate
    currentSession?.messages?.[currentSession.messages.length - 1]?.timestamp,
  ]);

  const stableAgents = useMemo(() => {
    return Array.isArray(currentSession?.agents) ? currentSession.agents : [];
  }, [currentSession?.agents]);

  const stableConnectionState = useMemo(() => ({
    research: researchSSE.connectionState,
    agents: researchSSE.connectionState, // Same stream
    isConnected: researchSSE.isConnected,
  }), [
    researchSSE.connectionState,
    researchSSE.isConnected,
  ]);

  const stableError = useMemo(() => {
    return error || researchSSE.error || currentSession?.error || null;
  }, [error, researchSSE.error, currentSession?.error]);

  return useMemo(() => ({
    // Session state
    currentSession,
    sessionId: currentSessionId,
    isStreaming: isStreaming || currentSession?.isStreaming || false,

    // Messages (memoized array)
    messages: stableMessages,

    // Agent coordination (memoized array)
    agents: stableAgents,
    progress: currentSession?.progress || null,

    // SSE connection state (memoized object)
    connectionState: stableConnectionState.research,
    isConnected: stableConnectionState.isConnected,

    // Error state (memoized)
    error: stableError,

    // Actions
    sendMessage,
    createNewSession,
    switchSession,
    clearCurrentSession,
    retryLastMessage,

    // Connection management
    connect: connectSSE,
    disconnect: disconnectSSE,

    // Helpers
    getAllSessions,
    getSessionById,
  }), [
    currentSession,
    currentSessionId,
    isStreaming,
    stableMessages,
    stableAgents,
    stableConnectionState,
    stableError,
    sendMessage,
    createNewSession,
    switchSession,
    clearCurrentSession,
    retryLastMessage,
    getAllSessions,
    getSessionById,
    connectSSE,
    disconnectSSE,
  ]);
}