'use client';

/**
 * SSE Context Provider for Chat Application
 * 
 * Features:
 * - Global SSE state management
 * - Event broadcasting to child components
 * - Connection management across route changes
 * - Integration with session store
 * - Real-time agent network updates
 */

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useRef, 
  useCallback,
  useState,
  ReactNode 
} from 'react';
import { 
  useAgentNetworkEvents,
  UseSSEOptions 
} from '@/hooks/use-sse';
import { AgentNetworkUpdate } from '@/types/session';
import { SSEEvent, SSEConnectionState } from '@/lib/sse-client';
import { useSessionStore } from '@/store/session-store';

export interface SSEContextValue {
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
  
  // Recent events
  recentEvents: SSEEvent[];
  clearRecentEvents: () => void;
  
  // Agent network state
  agentNetworkState: AgentNetworkUpdate | null;
  lastAgentUpdate: SSEEvent | null;
  
  // Statistics
  eventCount: number;
  connectionUptime: number;
}

const SSEContext = createContext<SSEContextValue | null>(null);

export interface SSEProviderProps {
  children: ReactNode;
  options?: UseSSEOptions;
  maxRecentEvents?: number;
  enableAgentNetworkTracking?: boolean;
}

/**
 * SSE Context Provider Component
 */
export function SSEProvider({ 
  children, 
  options = {},
  maxRecentEvents = 50,
  enableAgentNetworkTracking = true,
}: SSEProviderProps): JSX.Element {
  // Session integration
  const { currentSession } = useSessionStore();
  
  // SSE connection with agent network events
  const sse = useAgentNetworkEvents(undefined, {
    autoConnect: true,
    enablePollingFallback: true,
    ...options,
  });

  // Recent events storage
  const [recentEvents, setRecentEvents] = useState<SSEEvent[]>([]);
  
  // Agent network state tracking
  const [agentNetworkState, setAgentNetworkState] = useState<AgentNetworkUpdate | null>(null);
  const [lastAgentUpdate, setLastAgentUpdate] = useState<SSEEvent | null>(null);
  
  // Statistics
  const [eventCount, setEventCount] = useState(0);
  const [connectionStartTime, setConnectionStartTime] = useState<number | null>(null);
  const [connectionUptime, setConnectionUptime] = useState(0);

  // Event handlers registry for child components
  const eventHandlersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(new Map());

  /**
   * Add event to recent events list
   */
  const addRecentEvent = useCallback((event: SSEEvent) => {
    setRecentEvents(prev => {
      const updated = [event, ...prev];
      return updated.slice(0, maxRecentEvents);
    });
    setEventCount(prev => prev + 1);
  }, [maxRecentEvents]);

  /**
   * Clear recent events
   */
  const clearRecentEvents = useCallback(() => {
    setRecentEvents([]);
    setEventCount(0);
  }, []);

  /**
   * Enhanced event listener that also stores events
   */
  const addEventListener = useCallback((
    eventType: string, 
    handler: (event: SSEEvent) => void
  ): (() => void) => {
    // Register in local registry
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType)!.add(handler);

    // Create wrapped handler that also stores the event
    const wrappedHandler = (event: SSEEvent) => {
      addRecentEvent(event);
      handler(event);
    };

    // Register with SSE hook
    const unsubscribe = sse.addEventListener(eventType, wrappedHandler);

    // Return cleanup function
    return () => {
      const handlers = eventHandlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(eventType);
        }
      }
      unsubscribe();
    };
  }, [sse, addRecentEvent]);

  /**
   * Handle agent network updates
   */
  const handleAgentNetworkUpdate = useCallback((event: SSEEvent) => {
    if (enableAgentNetworkTracking) {
      setAgentNetworkState(prevState => ({
        ...(prevState as Partial<AgentNetworkUpdate>),
        ...(event.data as Partial<AgentNetworkUpdate>),
        lastUpdateTime: event.timestamp,
      } as AgentNetworkUpdate));
      setLastAgentUpdate(event);
    }
    addRecentEvent(event);
  }, [enableAgentNetworkTracking, addRecentEvent]);

  /**
   * Handle connection events
   */
  const handleConnectionEvent = useCallback((event: SSEEvent) => {
    console.log('SSE Connection Event:', event.data);
    addRecentEvent(event);
  }, [addRecentEvent]);

  /**
   * Handle error events
   */
  const handleErrorEvent = useCallback((event: SSEEvent) => {
    console.error('SSE Error Event:', event.data);
    addRecentEvent(event);
  }, [addRecentEvent]);

  /**
   * Update connection uptime
   */
  useEffect(() => {
    if (sse.isConnected) {
      if (!connectionStartTime) {
        setConnectionStartTime(Date.now());
      }
      
      const interval = setInterval(() => {
        if (connectionStartTime) {
          setConnectionUptime(Date.now() - connectionStartTime);
        }
      }, 1000);

      return () => clearInterval(interval);
    } else {
      setConnectionStartTime(null);
      setConnectionUptime(0);
      return undefined;
    }
  }, [sse.isConnected, connectionStartTime]);

  /**
   * Set up event listeners for agent network events
   */
  useEffect(() => {
    const unsubscribeUpdate = sse.addEventListener('agent_network_update', handleAgentNetworkUpdate);
    const unsubscribeConnection = sse.addEventListener('agent_network_connection', handleConnectionEvent);
    const unsubscribeError = sse.addEventListener('error', handleErrorEvent);

    // Also listen for general message events
    const unsubscribeMessage = sse.addEventListener('message', addRecentEvent);
    const unsubscribeKeepalive = sse.addEventListener('keepalive', addRecentEvent);

    return () => {
      unsubscribeUpdate();
      unsubscribeConnection();
      unsubscribeError();
      unsubscribeMessage();
      unsubscribeKeepalive();
    };
  }, [sse, handleAgentNetworkUpdate, handleConnectionEvent, handleErrorEvent, addRecentEvent]);

  /**
   * Log connection state changes
   */
  useEffect(() => {
    console.log('SSE Connection State Changed:', sse.connectionState);
  }, [sse.connectionState]);

  /**
   * Clear events when session changes
   */
  useEffect(() => {
    if (currentSession) {
      clearRecentEvents();
      setAgentNetworkState(null);
      setLastAgentUpdate(null);
    }
  }, [currentSession?.id, clearRecentEvents]);

  const contextValue: SSEContextValue = {
    // Connection state
    connectionState: sse.connectionState,
    isConnected: sse.isConnected,
    isConnecting: sse.isConnecting,
    connectionError: sse.connectionError,
    
    // Connection control
    connect: sse.connect,
    disconnect: sse.disconnect,
    reconnect: sse.reconnect,
    
    // Event handling
    addEventListener,
    
    // Recent events
    recentEvents,
    clearRecentEvents,
    
    // Agent network state
    agentNetworkState,
    lastAgentUpdate,
    
    // Statistics
    eventCount,
    connectionUptime,
  };

  return (
    <SSEContext.Provider value={contextValue}>
      {children}
    </SSEContext.Provider>
  );
}

/**
 * Hook to access SSE context
 */
export function useSSEContext(): SSEContextValue {
  const context = useContext(SSEContext);
  
  if (!context) {
    throw new Error('useSSEContext must be used within an SSEProvider');
  }
  
  return context;
}

/**
 * Hook for subscribing to specific event types with automatic cleanup
 */
export function useSSEEventListener<T = unknown>(
  eventType: string,
  handler: (data: T, event: SSEEvent) => void,
  deps: unknown[] = []
): void {
  const { addEventListener } = useSSEContext();

  useEffect(() => {
    const unsubscribe = addEventListener(eventType, (event) => {
      handler(event.data as T, event);
    });

    return unsubscribe;
  }, [eventType, addEventListener, ...deps]);
}

/**
 * Hook for getting recent events of a specific type
 */
export function useRecentSSEEvents(
  eventType?: string,
  limit: number = 10
): SSEEvent[] {
  const { recentEvents } = useSSEContext();

  return React.useMemo(() => {
    let filtered = recentEvents;
    
    if (eventType) {
      filtered = filtered.filter(event => event.type === eventType);
    }
    
    return filtered.slice(0, limit);
  }, [recentEvents, eventType, limit]);
}

/**
 * Hook for connection status with user-friendly messages
 */
export function useSSEStatus(): {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  message: string;
  canRetry: boolean;
} {
  const { connectionState } = useSSEContext();

  return React.useMemo(() => {
    if (connectionState.error) {
      return {
        status: 'error',
        message: `Connection error: ${connectionState.error}`,
        canRetry: true,
      };
    }

    if (connectionState.connecting) {
      return {
        status: 'connecting',
        message: connectionState.retryCount > 0 
          ? `Reconnecting... (attempt ${connectionState.retryCount})`
          : 'Connecting...',
        canRetry: false,
      };
    }

    if (connectionState.connected) {
      const typeMsg = connectionState.connectionType === 'polling' 
        ? ' (using polling)' 
        : '';
      return {
        status: 'connected',
        message: `Connected${typeMsg}`,
        canRetry: false,
      };
    }

    return {
      status: 'disconnected',
      message: 'Disconnected',
      canRetry: true,
    };
  }, [connectionState]);
}