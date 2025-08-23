'use client';

/**
 * React Hook for SSE Connection Management
 * 
 * Features:
 * - React integration with SSE client
 * - Connection state management
 * - Event subscription with cleanup
 * - Session integration
 * - Type-safe event handling
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { SSEClient, SSEEvent, SSEConnectionState, SSEClientConfig } from '@/lib/sse-client';
import { useSessionStore } from '@/store/session-store';

export interface UseSSEOptions {
  sessionId?: string;
  baseUrl?: string;
  autoConnect?: boolean;
  enablePollingFallback?: boolean;
  maxRetries?: number;
  pollingInterval?: number;
}

export interface UseSSEReturn {
  // Connection state
  connectionState: SSEConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  
  // Connection control
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  
  // Event handling
  addEventListener: (eventType: string, handler: (event: SSEEvent) => void) => () => void;
  removeEventListener: (eventType: string, handler: (event: SSEEvent) => void) => void;
  
  // Session management
  updateSession: (sessionId: string) => void;
}

/**
 * Hook for managing SSE connections to the ADK backend
 */
export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const {
    sessionId: optionsSessionId,
    baseUrl = 'http://localhost:8000',
    autoConnect = true,
    enablePollingFallback = true,
    maxRetries = 10,
    pollingInterval = 5000,
  } = options;

  // Get current session from store if not provided
  const { currentSession } = useSessionStore();
  const sessionId = optionsSessionId || currentSession?.id || '';

  // SSE client instance
  const clientRef = useRef<SSEClient | null>(null);
  
  // Connection state
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    connected: false,
    connecting: false,
    error: null,
    retryCount: 0,
    lastEventId: null,
    connectionType: 'disconnected',
  });

  // Event handlers registry
  const eventHandlersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(new Map());

  /**
   * Initialize SSE client
   */
  const initializeClient = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.destroy();
    }

    const config: Partial<SSEClientConfig> = {
      baseUrl,
      sessionId,
      enablePollingFallback,
      maxRetries,
      pollingInterval,
    };

    clientRef.current = new SSEClient(config);

    // Set up connection state handler
    clientRef.current.onConnectionChange((state) => {
      setConnectionState(state);
    });

    // Re-register existing event handlers
    eventHandlersRef.current.forEach((handlers, eventType) => {
      handlers.forEach((handler) => {
        clientRef.current?.on(eventType, handler);
      });
    });
  }, [baseUrl, sessionId, enablePollingFallback, maxRetries, pollingInterval]);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(async () => {
    if (!sessionId) {
      console.warn('Cannot connect SSE without session ID');
      return;
    }

    if (!clientRef.current) {
      initializeClient();
    }

    await clientRef.current?.connect();
  }, [sessionId, initializeClient]);

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  /**
   * Reconnect to SSE endpoint
   */
  const reconnect = useCallback(async () => {
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 100)); // Brief delay
    await connect();
  }, [disconnect, connect]);

  /**
   * Add event listener with automatic cleanup
   */
  const addEventListener = useCallback((
    eventType: string, 
    handler: (event: SSEEvent) => void
  ): (() => void) => {
    // Register in local map
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType)!.add(handler);

    // Register with client
    const unsubscribe = clientRef.current?.on(eventType, handler);

    // Return cleanup function
    return () => {
      // Unregister from local map
      const handlers = eventHandlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(eventType);
        }
      }

      // Unregister from client
      unsubscribe?.();
    };
  }, []);

  /**
   * Remove event listener
   */
  const removeEventListener = useCallback((
    eventType: string, 
    handler: (event: SSEEvent) => void
  ) => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventType);
      }
    }
  }, []);

  /**
   * Update session and reconnect if needed
   */
  const updateSession = useCallback((newSessionId: string) => {
    if (!newSessionId) return;

    const wasConnected = connectionState.connected;
    
    if (clientRef.current) {
      clientRef.current.updateSession(newSessionId);
    } else if (wasConnected) {
      // Reinitialize and connect if we were previously connected
      initializeClient();
      connect();
    }
  }, [connectionState.connected, initializeClient, connect]);

  /**
   * Initialize client when dependencies change
   */
  useEffect(() => {
    if (sessionId) {
      initializeClient();
    }
  }, [initializeClient]);

  /**
   * Auto-connect when requested and session is available
   */
  useEffect(() => {
    if (autoConnect && sessionId && !connectionState.connected && !connectionState.connecting) {
      connect();
    }
  }, [autoConnect, sessionId, connectionState.connected, connectionState.connecting, connect]);

  /**
   * Handle session changes from store
   */
  useEffect(() => {
    if (currentSession?.id && currentSession.id !== sessionId) {
      updateSession(currentSession.id);
    }
  }, [currentSession?.id, sessionId, updateSession]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clientRef.current?.destroy();
      eventHandlersRef.current.clear();
    };
  }, []);

  return {
    // Connection state
    connectionState,
    isConnected: connectionState.connected,
    isConnecting: connectionState.connecting,
    connectionError: connectionState.error,
    
    // Connection control
    connect,
    disconnect,
    reconnect,
    
    // Event handling
    addEventListener,
    removeEventListener,
    
    // Session management
    updateSession,
  };
}

/**
 * Simplified hook for specific event types
 */
export function useSSEEvent<T = unknown>(
  eventType: string,
  handler: (data: T, event: SSEEvent) => void,
  options: UseSSEOptions = {}
): UseSSEReturn {
  const sse = useSSE(options);

  useEffect(() => {
    const unsubscribe = sse.addEventListener(eventType, (event) => {
      handler(event.data as T, event);
    });

    return unsubscribe;
  }, [eventType, handler, sse]);

  return sse;
}

/**
 * Hook for agent network events specifically
 */
export function useAgentNetworkEvents(
  onUpdate?: (data: unknown, event: SSEEvent) => void,
  options: UseSSEOptions = {}
): UseSSEReturn {
  return useSSEEvent('agent_network_update', onUpdate || (() => {}), options);
}

/**
 * Hook for connection status events
 */
export function useSSEConnectionEvents(
  onConnectionChange?: (data: unknown, event: SSEEvent) => void,
  options: UseSSEOptions = {}
): UseSSEReturn {
  return useSSEEvent('connection', onConnectionChange || (() => {}), options);
}

/**
 * Hook for error events
 */
export function useSSEErrorEvents(
  onError?: (data: unknown, event: SSEEvent) => void,
  options: UseSSEOptions = {}
): UseSSEReturn {
  return useSSEEvent('error', onError || (() => {}), options);
}