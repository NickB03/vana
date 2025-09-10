/**
 * Enhanced SSE Client Hook with Enterprise-Grade Connection Resilience
 * Provides comprehensive connection management, performance monitoring, and fault tolerance
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiClient } from '../src/lib/api-client';

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

// ===== ENHANCED SSE CLIENT TYPES =====

export interface EnhancedSSEClientOptions {
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

export interface EnhancedSSEClientState {
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

export function useEnhancedSSEClient(options: EnhancedSSEClientOptions) {
  const {
    sessionId,
    autoReconnect = true,
    maxRetries = 10,
    initialRetryDelay = 1000,
    maxRetryDelay = 30000,
    heartbeatTimeout = 35000,
    heartbeatInterval = 30000,
    connectionTimeout = 10000,
    eventQueueSize = 100,
    enableCircuitBreaker = true,
    enableMetrics = true,
    enableDiagnostics = false,
    jitterFactor = 0.1,
  } = options;

  // State
  const [state, setState] = useState<EnhancedSSEClientState>({
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

  // Refs for managing timers and connections
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
    onConnectionQualityChange?: (quality: ConnectionMetrics['connectionQuality']) => void;
    onCircuitBreakerStateChange?: (state: CircuitBreakerState['state']) => void;
  }>({});

  // Update state helper
  const updateState = useCallback((updates: Partial<EnhancedSSEClientState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Clear all timeouts and intervals
  const clearAllTimeouts = useCallback(() => {
    [heartbeatTimeoutRef, heartbeatIntervalRef, connectionTimeoutRef, 
     reconnectTimeoutRef, metricsIntervalRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        clearInterval(ref.current);
        ref.current = null;
      }
    });
  }, []);

  // Exponential backoff with jitter calculation
  const calculateBackoffDelay = useCallback((attempt: number): number => {
    const exponentialDelay = Math.min(initialRetryDelay * Math.pow(2, attempt), maxRetryDelay);
    const jitter = exponentialDelay * jitterFactor * Math.random();
    return Math.floor(exponentialDelay + jitter);
  }, [initialRetryDelay, maxRetryDelay, jitterFactor]);

  // Circuit breaker evaluation and management
  const evaluateCircuitBreaker = useCallback((isFailure: boolean = false) => {
    if (!enableCircuitBreaker) return true;
    
    setState(prev => {
      const now = Date.now();
      let newCircuitState = { ...prev.circuitBreaker };
      let shouldAllowConnection = true;
      
      if (isFailure) {
        newCircuitState.failureCount++;
        newCircuitState.lastFailureTime = now;
        
        // Open circuit if too many failures
        if (newCircuitState.failureCount >= 5 && newCircuitState.state === 'closed') {
          newCircuitState.state = 'open';
          newCircuitState.nextAttemptTime = now + 30000; // 30 second timeout
          console.warn('Circuit breaker opened due to repeated failures');
          eventHandlersRef.current.onCircuitBreakerStateChange?.('open');
          shouldAllowConnection = false;
        }
      } else {
        // Reset failure count on success
        if (newCircuitState.state === 'half-open') {
          newCircuitState.state = 'closed';
          newCircuitState.failureCount = 0;
          console.log('Circuit breaker closed - connection stable');
          eventHandlersRef.current.onCircuitBreakerStateChange?.('closed');
        }
      }
      
      // Check if circuit should move to half-open
      if (newCircuitState.state === 'open' && now >= newCircuitState.nextAttemptTime) {
        newCircuitState.state = 'half-open';
        console.log('Circuit breaker half-open - attempting connection');
        eventHandlersRef.current.onCircuitBreakerStateChange?.('half-open');
        shouldAllowConnection = true;
      }
      
      const newConnectionStatus = newCircuitState.state === 'open' ? 'circuit-open' : prev.connectionStatus;
      
      return {
        ...prev,
        circuitBreaker: newCircuitState,
        connectionStatus: newConnectionStatus
      };
    });
    
    return state.circuitBreaker.state !== 'open';
  }, [enableCircuitBreaker, state.circuitBreaker.state]);

  // Update connection quality based on performance metrics
  const updateConnectionQuality = useCallback(() => {
    if (!enableMetrics) return;
    
    setState(prev => {
      const avgLatency = prev.diagnostics.latency.reduce((sum, l) => sum + l, 0) / 
                        Math.max(prev.diagnostics.latency.length, 1);
      
      let quality: ConnectionMetrics['connectionQuality'] = 'excellent';
      if (avgLatency > 1000) quality = 'poor';
      else if (avgLatency > 500) quality = 'fair';
      else if (avgLatency > 200) quality = 'good';
      
      const errorRate = prev.circuitBreaker.failureCount / Math.max(prev.metrics.totalConnections, 1);
      if (errorRate > 0.1) quality = 'poor';
      else if (errorRate > 0.05) quality = 'fair';
      
      // Notify if quality changed
      if (quality !== prev.metrics.connectionQuality) {
        eventHandlersRef.current.onConnectionQualityChange?.(quality);
      }
      
      return {
        ...prev,
        metrics: {
          ...prev.metrics,
          averageLatency: avgLatency,
          errorRate,
          connectionQuality: quality,
          uptime: prev.connectionStartTime ? 
            Date.now() - prev.connectionStartTime.getTime() : 0
        }
      };
    });
  }, [enableMetrics]);

  // Update connection metrics and diagnostics
  const updateConnectionMetrics = useCallback(() => {
    updateConnectionQuality();
    
    // Collect network diagnostics if enabled and available
    if (enableDiagnostics && typeof navigator !== 'undefined' && 'connection' in navigator) {
      setState(prev => ({
        ...prev,
        diagnostics: {
          ...prev.diagnostics,
          networkType: (navigator as any).connection?.effectiveType || 'unknown',
          effectiveBandwidth: (navigator as any).connection?.downlink || 0
        }
      }));
    }
  }, [enableDiagnostics, updateConnectionQuality]);

  // Add event to history with memory management and performance tracking
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
      
      // Update processing time metrics
      const processingTime = performance.now() - eventProcessingStart;
      const updatedMetrics = {
        ...prev.metrics,
        eventProcessingTime: (prev.metrics.eventProcessingTime + processingTime) / 2
      };
      
      return {
        ...prev,
        events: newEvents,
        eventQueueOverflow,
        metrics: updatedMetrics
      };
    });
    
    // Track event timestamps for diagnostics
    if (enableDiagnostics) {
      eventTimestampsRef.current = [...eventTimestampsRef.current.slice(-19), Date.now()];
    }
  }, [eventQueueSize, enableDiagnostics]);

  // Set comprehensive heartbeat and health monitoring
  const setHeartbeatMonitoring = useCallback(() => {
    clearAllTimeouts();
    
    // Heartbeat timeout (detect missing heartbeats)
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.warn('SSE heartbeat timeout - connection may be lost');
      updateState({ 
        error: 'Connection heartbeat timeout',
        connectionStatus: 'error'
      });
      evaluateCircuitBreaker(true);
    }, heartbeatTimeout);
    
    // Connection quality monitoring
    if (enableMetrics) {
      metricsIntervalRef.current = setInterval(() => {
        updateConnectionMetrics();
      }, 10000); // Update metrics every 10 seconds
    }
  }, [heartbeatTimeout, enableMetrics, clearAllTimeouts, updateState, evaluateCircuitBreaker, updateConnectionMetrics]);

  // Parse SSE event with error handling
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
      evaluateCircuitBreaker(true);
      return null;
    }
  }, [sessionId, evaluateCircuitBreaker]);

  // Enhanced event handling with performance monitoring
  const handleEvent = useCallback((event: MessageEvent) => {
    const eventStart = performance.now();
    
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
          setHeartbeatMonitoring();
          evaluateCircuitBreaker(false);
        }
        break;

      case 'heartbeat':
        eventHandlersRef.current.onHeartbeat?.(parsedEvent);
        updateState({ lastHeartbeat: new Date() });
        setHeartbeatMonitoring();
        
        // Measure heartbeat latency if enabled
        if (enableDiagnostics) {
          const heartbeatLatency = performance.now() - eventStart;
          setState(prev => ({
            ...prev,
            diagnostics: {
              ...prev.diagnostics,
              latency: [...prev.diagnostics.latency.slice(-19), heartbeatLatency]
            }
          }));
        }
        
        // Update connection quality
        if (enableMetrics) {
          updateConnectionQuality();
        }
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
        evaluateCircuitBreaker(true);
        break;

      default:
        console.log('Unknown SSE event type:', parsedEvent.type, parsedEvent);
    }
  }, [parseSSEEvent, addEvent, updateState, setHeartbeatMonitoring, evaluateCircuitBreaker, 
      enableDiagnostics, enableMetrics, updateConnectionQuality]);

  // Enhanced connection with timeout and latency measurement
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected or connecting
    }

    // Check circuit breaker
    if (!evaluateCircuitBreaker()) {
      console.warn('Connection blocked by circuit breaker');
      return;
    }

    isManualDisconnectRef.current = false;
    updateState({ 
      connectionStatus: 'connecting', 
      error: null 
    });

    // Start latency measurement
    const connectionStart = performance.now();
    latencyMeasurementsRef.current.push({ start: connectionStart });

    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      console.error('Connection timeout');
      evaluateCircuitBreaker(true);
      updateState({
        connectionStatus: 'error',
        error: 'Connection timeout'
      });
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }, connectionTimeout);

    try {
      console.log('Connecting to Google ADK SSE endpoint for session:', sessionId);
      
      // Use the authenticated EventSource method
      const eventSource = apiClient.createAuthenticatedEventSource(sessionId);

      eventSource.onopen = () => {
        console.log('SSE connection opened');
        const connectionTime = Date.now();
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        // Measure connection latency
        const latencyMeasurement = latencyMeasurementsRef.current.find(m => !m.end);
        if (latencyMeasurement) {
          latencyMeasurement.end = connectionTime;
          const latency = latencyMeasurement.end - latencyMeasurement.start;
          
          setState(prev => ({
            ...prev,
            diagnostics: {
              ...prev.diagnostics,
              latency: [...prev.diagnostics.latency.slice(-19), latency]
            }
          }));
        }
        
        // Reset circuit breaker and update metrics
        evaluateCircuitBreaker(false);
        updateState({
          connectionStartTime: new Date(connectionTime),
          metrics: {
            ...state.metrics,
            totalConnections: state.metrics.totalConnections + 1,
            reconnectionCount: state.retryCount > 0 ? 
              state.metrics.reconnectionCount + 1 : state.metrics.reconnectionCount
          }
        });
        
        setHeartbeatMonitoring();
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

          // Auto-reconnect with enhanced backoff and circuit breaker
          if (autoReconnect && state.retryCount < maxRetries && evaluateCircuitBreaker(true)) {
            const delay = calculateBackoffDelay(state.retryCount);
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
          } else if (state.circuitBreaker.state === 'open') {
            console.warn('Circuit breaker open - connection attempts suspended');
            updateState({
              connectionStatus: 'circuit-open',
              error: 'Circuit breaker open - too many connection failures'
            });
          }
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      evaluateCircuitBreaker(true);
      updateState({ 
        connectionStatus: 'error',
        error: 'Failed to establish connection'
      });
    }
  }, [sessionId, handleEvent, autoReconnect, maxRetries, state.retryCount, state.metrics, state.circuitBreaker.state,
      updateState, evaluateCircuitBreaker, calculateBackoffDelay, connectionTimeout, setHeartbeatMonitoring]);

  // Enhanced disconnect with cleanup
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    clearAllTimeouts();

    updateState({
      isConnected: false,
      isReconnecting: false,
      connectionStatus: 'disconnected',
      error: null,
      retryCount: 0,
      connectionStartTime: null
    });
  }, [clearAllTimeouts, updateState]);

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
    setState(prev => ({ ...prev, events: [], eventQueueOverflow: false }));
  }, []);

  // Manual reconnect with circuit breaker check
  const reconnect = useCallback(() => {
    if (state.circuitBreaker.state === 'open') {
      console.warn('Cannot reconnect - circuit breaker is open');
      return;
    }
    
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect, state.circuitBreaker.state]);

  // Force reconnect (bypass circuit breaker for manual intervention)
  const forceReconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      circuitBreaker: {
        ...prev.circuitBreaker,
        state: 'closed',
        failureCount: 0
      }
    }));
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  // Get connection diagnostics
  const getDiagnostics = useCallback(() => {
    return {
      ...state.diagnostics,
      eventProcessingTime: state.metrics.eventProcessingTime,
      connectionUptime: state.connectionStartTime ? 
        Date.now() - state.connectionStartTime.getTime() : 0,
      queueOverflow: state.eventQueueOverflow,
      circuitBreakerState: state.circuitBreaker.state
    };
  }, [state]);

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
    forceReconnect,
    on,
    off,
    clearEvents,
    getDiagnostics,
    
    // Utilities
    isHealthy: state.isConnected && !state.error,
    timeSinceLastHeartbeat: state.lastHeartbeat 
      ? Date.now() - state.lastHeartbeat.getTime() 
      : null,
    canReconnect: state.circuitBreaker.state !== 'open',
    connectionQuality: state.metrics.connectionQuality,
  };
}

export default useEnhancedSSEClient;