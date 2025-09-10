/**
 * SSE Client Hook for Google ADK Agent Network
 * Provides real-time streaming integration with the Google ADK backend
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '../src/lib/api-client';
import { authService } from '../src/lib/auth';

// ===== SSE EVENT TYPES =====

export interface SSEEvent<T = any> {
  event: string;
  data: T;
  id?: string;
  retry?: number;
}

export interface ConnectionEvent {
  type: 'connection';
  status: 'connected' | 'disconnected';
  sessionId: string;
  timestamp: string;
  authenticated?: boolean;
  userId?: string;
}

export interface HeartbeatEvent {
  type: 'heartbeat';
  timestamp: string;
}

export interface AgentEvent {
  type: 'agent_started' | 'agent_completed' | 'agent_progress';
  sessionId: string;
  agentId: string;
  agentType: string;
  timestamp: string;
  data?: any;
}

export interface ResultEvent {
  type: 'partial_result' | 'result_generated' | 'processing_complete';
  sessionId: string;
  content?: string;
  resultId?: string;
  timestamp: string;
  data?: any;
}

export interface ErrorEvent {
  type: 'error';
  sessionId: string;
  message: string;
  errorCode?: string;
  timestamp: string;
  recoverable?: boolean;
}

export type SSEEventData = ConnectionEvent | HeartbeatEvent | AgentEvent | ResultEvent | ErrorEvent;

// ===== CONNECTION RESILIENCE TYPES =====

export interface ConnectionMetrics {
  uptime: number;
  totalConnections: number;
  reconnectionCount: number;
  averageLatency: number;
  eventProcessingTime: number;
  errorRate: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime: number;
  nextAttemptTime: number;
}

export interface ConnectionDiagnostics {
  latency: number[];
  packetsLost: number;
  networkType: string;
  effectiveBandwidth: number;
  jitter: number;
}

// ===== SSE CLIENT HOOK =====

export interface SSEClientOptions {
  sessionId: string;
  autoReconnect?: boolean;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  heartbeatTimeout?: number;
  heartbeatInterval?: number;
  connectionTimeout?: number;
  eventQueueSize?: number;
  enableCircuitBreaker?: boolean;
  enableMetrics?: boolean;
  enableDiagnostics?: boolean;
  jitterFactor?: number;
}

export interface SSEClientState {
  isConnected: boolean;
  isReconnecting: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'circuit-open';
  lastHeartbeat: Date | null;
  events: SSEEventData[];
  error: string | null;
  retryCount: number;
  connectionStartTime: Date | null;
  metrics: ConnectionMetrics;
  circuitBreaker: CircuitBreakerState;
  diagnostics: ConnectionDiagnostics;
  eventQueueOverflow: boolean;
}

export function useSSEClient(options: SSEClientOptions) {
  const {
    sessionId,
    autoReconnect = true,
    maxRetries = 10,
    initialRetryDelay = 1000,
    maxRetryDelay = 30000,
    heartbeatTimeout = 35000, // 35 seconds (backend sends every 30s)
    heartbeatInterval = 30000, // 30 seconds heartbeat interval
    connectionTimeout = 10000, // 10 seconds connection timeout
    eventQueueSize = 100, // Maximum events to keep in memory
    enableCircuitBreaker = true,
    enableMetrics = true,
    enableDiagnostics = false,
    jitterFactor = 0.1, // 10% jitter for backoff
  } = options;

  // State
  const [state, setState] = useState<SSEClientState>({
    isConnected: false,
    isReconnecting: false,
    connectionStatus: 'disconnected',
    lastHeartbeat: null,
    events: [],
    error: null,
    retryCount: 0,
    connectionStartTime: null,
    metrics: {
      uptime: 0,
      totalConnections: 0,
      reconnectionCount: 0,
      averageLatency: 0,
      eventProcessingTime: 0,
      errorRate: 0,
      connectionQuality: 'excellent'
    },
    circuitBreaker: {
      state: 'closed',
      failureCount: 0,
      lastFailureTime: 0,
      nextAttemptTime: 0
    },
    diagnostics: {
      latency: [],
      packetsLost: 0,
      networkType: 'unknown',
      effectiveBandwidth: 0,
      jitter: 0
    },
    eventQueueOverflow: false
  });

  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const eventTimestampsRef = useRef<number[]>([]);
  const latencyMeasurementsRef = useRef<{ start: number; end?: number }[]>([]);

  // Event handlers
  const eventHandlersRef = useRef<{
    onConnection?: (event: ConnectionEvent) => void;
    onHeartbeat?: (event: HeartbeatEvent) => void;
    onAgent?: (event: AgentEvent) => void;
    onResult?: (event: ResultEvent) => void;
    onError?: (event: ErrorEvent) => void;
    onRawEvent?: (event: MessageEvent) => void;
  }>({});

  // Update state helper
  const updateState = useCallback((updates: Partial<SSEClientState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Add event to history with memory management
  const addEvent = useCallback((event: SSEEventData) => {
    const eventProcessingStart = performance.now();
    
    setState(prev => {
      const maxEvents = eventQueueSize;
      const newEvents = [...prev.events, event];
      
      // Check for queue overflow
      let eventQueueOverflow = false;
      if (newEvents.length > maxEvents) {
        eventQueueOverflow = true;
        newEvents.splice(0, newEvents.length - maxEvents);
      }
      
      // Update metrics
      const eventProcessingTime = performance.now() - eventProcessingStart;
      const updatedMetrics = {
        ...prev.metrics,
        eventProcessingTime: (prev.metrics.eventProcessingTime + eventProcessingTime) / 2
      };
      
      return {
        ...prev,
        events: newEvents,
        eventQueueOverflow,
        metrics: updatedMetrics
      };
    });
  }, [eventQueueSize]);

  // Clear heartbeat timeout
  const clearHeartbeatTimeout = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Clear all timeouts
  const clearAllTimeouts = useCallback(() => {
    clearHeartbeatTimeout();
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
  }, []);

  // Set heartbeat timeout
  const setHeartbeatTimeout = useCallback(() => {
    clearHeartbeatTimeout();
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.warn('SSE heartbeat timeout - connection may be lost');
      updateState({ 
        error: 'Connection heartbeat timeout',
        connectionStatus: 'error'
      });
    }, heartbeatTimeout);
  }, [heartbeatTimeout, clearHeartbeatTimeout, updateState]);

  // Parse SSE event
  const parseSSEEvent = useCallback((event: MessageEvent): SSEEventData | null => {
    try {
      const data = JSON.parse(event.data);
      
      // Add sessionId if not present
      if (!data.sessionId && sessionId) {
        data.sessionId = sessionId;
      }

      return data as SSEEventData;
    } catch (error) {
      console.error('Failed to parse SSE event:', error, event.data);
      return null;
    }
  }, [sessionId]);

  // Handle SSE events
  const handleEvent = useCallback((event: MessageEvent) => {
    // Call raw event handler if provided
    eventHandlersRef.current.onRawEvent?.(event);

    const parsedEvent = parseSSEEvent(event);
    if (!parsedEvent) return;

    // Add to event history
    addEvent(parsedEvent);

    // Handle specific event types
    switch (parsedEvent.type) {
      case 'connection':
        eventHandlersRef.current.onConnection?.(parsedEvent);
        if (parsedEvent.status === 'connected') {
          updateState({ 
            isConnected: true, 
            connectionStatus: 'connected',
            error: null,
            retryCount: 0
          });
          setHeartbeatTimeout();
        }
        break;

      case 'heartbeat':
        eventHandlersRef.current.onHeartbeat?.(parsedEvent);
        updateState({ lastHeartbeat: new Date() });
        setHeartbeatTimeout();
        break;

      case 'agent_started':
      case 'agent_completed':
      case 'agent_progress':
        eventHandlersRef.current.onAgent?.(parsedEvent);
        break;

      case 'partial_result':
      case 'result_generated':
      case 'processing_complete':
        eventHandlersRef.current.onResult?.(parsedEvent);
        break;

      case 'error':
        eventHandlersRef.current.onError?.(parsedEvent);
        updateState({ error: parsedEvent.message });
        break;

      default:
        console.log('Unknown SSE event type:', parsedEvent.type, parsedEvent);
    }
  }, [parseSSEEvent, addEvent, updateState, setHeartbeatTimeout]);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected or connecting
    }

    isManualDisconnectRef.current = false;
    updateState({ 
      connectionStatus: 'connecting', 
      error: null 
    });

    try {
      console.log('Connecting to Google ADK SSE endpoint for session:', sessionId);
      
      // Use the new authenticated EventSource method
      const eventSource = apiClient.createAuthenticatedEventSource(sessionId);

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        clearHeartbeatTimeout();
      };

      eventSource.onmessage = handleEvent;

      eventSource.onerror = (error) => {
        console.error('Google ADK SSE connection error:', error);
        
        if (!isManualDisconnectRef.current) {
          updateState({ 
            isConnected: false,
            connectionStatus: 'error',
            error: 'Connection error occurred'
          });

          // Auto-reconnect if enabled
          if (autoReconnect && state.retryCount < maxRetries) {
            const delay = initialRetryDelay * Math.pow(2, state.retryCount); // Exponential backoff
            console.log(`Reconnecting to Google ADK in ${delay}ms (attempt ${state.retryCount + 1}/${maxRetries})`);
            
            updateState({ 
              isReconnecting: true, 
              connectionStatus: 'reconnecting',
              retryCount: state.retryCount + 1 
            });

            reconnectTimeoutRef.current = setTimeout(() => {
              disconnect();
              connect();
            }, delay);
          }
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      updateState({ 
        connectionStatus: 'error',
        error: 'Failed to establish connection'
      });
    }
  }, [sessionId, handleEvent, autoReconnect, maxRetries, initialRetryDelay, state.retryCount, updateState, clearHeartbeatTimeout]);

  // Disconnect from SSE endpoint
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    clearHeartbeatTimeout();

    updateState({
      isConnected: false,
      isReconnecting: false,
      connectionStatus: 'disconnected',
      error: null,
      retryCount: 0,
    });
  }, [clearHeartbeatTimeout, updateState]);

  // Register event handlers
  const on = useCallback((
    eventType: keyof typeof eventHandlersRef.current,
    handler: any
  ) => {
    eventHandlersRef.current[eventType] = handler;
  }, []);

  // Remove event handlers
  const off = useCallback((eventType: keyof typeof eventHandlersRef.current) => {
    delete eventHandlersRef.current[eventType];
  }, []);

  // Clear event history
  const clearEvents = useCallback(() => {
    setState(prev => ({ ...prev, events: [] }));
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Initialize connection on mount
  useEffect(() => {
    if (sessionId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId]); // Only reconnect when sessionId changes

  return {
    // State
    ...state,
    
    // Methods
    connect,
    disconnect,
    reconnect,
    on,
    off,
    clearEvents,
    
    // Utilities
    isHealthy: state.isConnected && !state.error,
    timeSinceLastHeartbeat: state.lastHeartbeat 
      ? Date.now() - state.lastHeartbeat.getTime() 
      : null,
  };
}

// ===== CONVENIENCE HOOKS =====

/**
 * Hook for monitoring agent network events
 */
export function useAgentNetwork(sessionId: string) {
  const sse = useSSEClient({ sessionId });
  const [agents, setAgents] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    const handleAgent = (event: AgentEvent) => {
      setAgents(prev => {
        const updated = new Map(prev);
        const current = updated.get(event.agentId) || {};
        
        updated.set(event.agentId, {
          ...current,
          id: event.agentId,
          type: event.agentType,
          status: event.type.replace('agent_', ''),
          lastUpdate: new Date(event.timestamp),
          data: event.data,
        });
        
        return updated;
      });
    };

    sse.on('onAgent', handleAgent);
    return () => sse.off('onAgent');
  }, [sse]);

  return {
    ...sse,
    agents: Array.from(agents.values()),
    agentMap: agents,
  };
}

/**
 * Hook for receiving research results
 */
export function useResearchResults(sessionId: string) {
  const sse = useSSEClient({ sessionId });
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    const handleResult = (event: ResultEvent) => {
      setResults(prev => [...prev, {
        id: event.resultId || `result-${Date.now()}`,
        type: event.type,
        content: event.content,
        timestamp: new Date(event.timestamp),
        data: event.data,
      }]);
    };

    sse.on('onResult', handleResult);
    return () => sse.off('onResult');
  }, [sse]);

  return {
    ...sse,
    results,
    clearResults: () => setResults([]),
  };
}

export default useSSEClient;