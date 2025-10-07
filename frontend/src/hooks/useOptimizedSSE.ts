/**
 * Optimized SSE Hook - Enhanced performance with connection pooling, intelligent reconnection, and memory management
 * Addresses performance bottlenecks identified in the original SSE implementation
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AgentNetworkEvent } from '@/lib/api/types';
import { optimizedApiClient } from '@/lib/api/optimized-client';
import { useStableCallback, createRenderCounter, useDebouncedState } from '@/lib/react-performance';

export type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export interface OptimizedSSEOptions {
  /** Session ID for targeted SSE streams */
  sessionId?: string;
  /** Whether to automatically reconnect on connection loss */
  autoReconnect?: boolean;
  /** Whether the SSE connection should be active */
  enabled?: boolean;
  /** Maximum number of reconnection attempts */
  maxReconnectAttempts?: number;
  /** Initial reconnection delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelay?: number;
  /** Whether to include credentials in the request */
  withCredentials?: boolean;
  /** Event buffer size to prevent memory leaks */
  maxEvents?: number;
  /** Enable intelligent reconnection based on network conditions */
  intelligentReconnect?: boolean;
  /** Connection timeout before fallback */
  connectionTimeout?: number;
  /** Custom event handlers */
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
}

export interface OptimizedSSEHookReturn {
  /** Current connection state */
  connectionState: SSEConnectionState;
  /** Last received event */
  lastEvent: AgentNetworkEvent | null;
  /** All received events (limited by maxEvents) */
  events: AgentNetworkEvent[];
  /** Connection error if any */
  error: string | null;
  /** Whether currently connected */
  isConnected: boolean;
  /** Manually connect to SSE stream */
  connect: () => void;
  /** Manually disconnect from SSE stream */
  disconnect: () => void;
  /** Reconnect to SSE stream */
  reconnect: () => void;
  /** Clear all events */
  clearEvents: () => void;
  /** Current reconnection attempt count */
  reconnectAttempt: number;
  /** Performance metrics */
  metrics: {
    totalEvents: number;
    reconnections: number;
    connectionUptime: number;
    averageLatency: number;
  };
}

// Connection pool for managing SSE connections
class SSEConnectionPool {
  private static instance: SSEConnectionPool;
  private connections = new Map<string, {
    eventSource: EventSource | null;
    subscribers: Set<string>;
    lastActivity: number;
    metrics: {
      events: number;
      reconnections: number;
      startTime: number;
      latencies: number[];
    };
  }>();

  static getInstance(): SSEConnectionPool {
    if (!SSEConnectionPool.instance) {
      SSEConnectionPool.instance = new SSEConnectionPool();
    }
    return SSEConnectionPool.instance;
  }

  addSubscriber(url: string, subscriberId: string): void {
    if (!this.connections.has(url)) {
      this.connections.set(url, {
        eventSource: null,
        subscribers: new Set(),
        lastActivity: Date.now(),
        metrics: {
          events: 0,
          reconnections: 0,
          startTime: Date.now(),
          latencies: [],
        },
      });
    }

    const connection = this.connections.get(url)!;
    connection.subscribers.add(subscriberId);
  }

  removeSubscriber(url: string, subscriberId: string): void {
    const connection = this.connections.get(url);
    if (!connection) return;

    connection.subscribers.delete(subscriberId);

    // Clean up connection if no subscribers
    if (connection.subscribers.size === 0) {
      if (connection.eventSource) {
        connection.eventSource.close();
      }
      this.connections.delete(url);
    }
  }

  getConnection(url: string): EventSource | null {
    return this.connections.get(url)?.eventSource || null;
  }

  setConnection(url: string, eventSource: EventSource): void {
    const connection = this.connections.get(url);
    if (connection) {
      connection.eventSource = eventSource;
      connection.lastActivity = Date.now();
    }
  }

  updateActivity(url: string): void {
    const connection = this.connections.get(url);
    if (connection) {
      connection.lastActivity = Date.now();
      connection.metrics.events++;
    }
  }

  recordLatency(url: string, latency: number): void {
    const connection = this.connections.get(url);
    if (connection) {
      connection.metrics.latencies.push(latency);
      // Keep only last 100 latencies
      if (connection.metrics.latencies.length > 100) {
        connection.metrics.latencies = connection.metrics.latencies.slice(-100);
      }
    }
  }

  getMetrics(url: string) {
    const connection = this.connections.get(url);
    if (!connection) return null;

    const uptime = Date.now() - connection.metrics.startTime;
    const averageLatency = connection.metrics.latencies.length > 0
      ? connection.metrics.latencies.reduce((sum, lat) => sum + lat, 0) / connection.metrics.latencies.length
      : 0;

    return {
      totalEvents: connection.metrics.events,
      reconnections: connection.metrics.reconnections,
      connectionUptime: uptime,
      averageLatency,
      subscriberCount: connection.subscribers.size,
    };
  }
}

const DEFAULT_OPTIONS = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  withCredentials: true,
  enabled: true,
  maxEvents: 1000,
  intelligentReconnect: true,
  connectionTimeout: 10000,
} as const;

/**
 * Optimized SSE hook with enhanced performance features
 */
export function useOptimizedSSE(url: string, options: OptimizedSSEOptions = {}): OptimizedSSEHookReturn {
  // Performance tracking
  const renderCounter = createRenderCounter('useOptimizedSSE');
  renderCounter();

  // Stabilize options
  const opts = useMemo(
    () => ({
      ...DEFAULT_OPTIONS,
      ...options,
    }),
    [
      options.autoReconnect,
      options.enabled,
      options.maxReconnectAttempts,
      options.reconnectDelay,
      options.maxReconnectDelay,
      options.withCredentials,
      options.sessionId,
      options.maxEvents,
      options.intelligentReconnect,
      options.connectionTimeout,
    ]
  );

  // State management with debouncing for high-frequency updates
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [lastEvent, setLastEvent] = useState<AgentNetworkEvent | null>(null);
  const [events, setEvents] = useState<AgentNetworkEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Use debounced state for error to prevent rapid re-renders
  const [debouncedError] = useDebouncedState(error, 100);

  // Refs for stable references
  const subscriberIdRef = useRef(`subscriber_${Date.now()}_${Math.random()}`);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const mountedRef = useRef(true);
  const connectionPoolRef = useRef(SSEConnectionPool.getInstance());
  const lastEventTimeRef = useRef<number>(0);
  const networkStateRef = useRef({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastDisconnect: 0,
    consecutiveFailures: 0,
  });

  // Store callback refs to prevent unnecessary reconnections
  const callbacksRef = useRef({
    onConnect: options.onConnect,
    onDisconnect: options.onDisconnect,
    onError: options.onError,
    onReconnect: options.onReconnect,
  });

  // Update callback refs when options change
  useEffect(() => {
    callbacksRef.current = {
      onConnect: options.onConnect,
      onDisconnect: options.onDisconnect,
      onError: options.onError,
      onReconnect: options.onReconnect,
    };
  }, [options.onConnect, options.onDisconnect, options.onError, options.onReconnect]);

  // Network state monitoring for intelligent reconnection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      networkStateRef.current.isOnline = true;
      networkStateRef.current.consecutiveFailures = 0;

      if (opts.intelligentReconnect && shouldReconnectRef.current) {
        // Attempt immediate reconnection when network comes back
        setTimeout(() => {
          if (connectionState === 'disconnected' || connectionState === 'error') {
            connect();
          }
        }, 1000);
      }
    };

    const handleOffline = () => {
      networkStateRef.current.isOnline = false;
      networkStateRef.current.lastDisconnect = Date.now();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionState, opts.intelligentReconnect]);

  // Calculate intelligent reconnection delay
  const getIntelligentReconnectDelay = useStableCallback((attempt: number): number => {
    const baseDelay = opts.reconnectDelay;
    const maxDelay = opts.maxReconnectDelay;

    if (!opts.intelligentReconnect) {
      return Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    }

    // Consider network conditions
    const { isOnline, lastDisconnect, consecutiveFailures } = networkStateRef.current;

    if (!isOnline) {
      // Wait longer if offline
      return Math.min(baseDelay * 4, maxDelay);
    }

    // Adaptive delay based on failure pattern
    const timeSinceLastDisconnect = Date.now() - lastDisconnect;
    const failurePenalty = Math.min(consecutiveFailures * 1000, 10000);
    const adaptiveDelay = baseDelay * Math.pow(1.5, attempt) + failurePenalty;

    // If we were recently disconnected, wait a bit longer
    if (timeSinceLastDisconnect < 60000) {
      return Math.min(adaptiveDelay * 1.5, maxDelay);
    }

    return Math.min(adaptiveDelay, maxDelay);
  }, [opts.reconnectDelay, opts.maxReconnectDelay, opts.intelligentReconnect]);

  // Build SSE URL with security
  const buildSSEUrl = useStableCallback((): string => {
    let proxyPath: string;

    if (url.startsWith('http')) {
      const encodedUrl = encodeURIComponent(url);
      proxyPath = `/api/sse?path=${encodedUrl}`;
    } else {
      const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
      proxyPath = `/api/sse/${cleanUrl}`;
    }

    return proxyPath;
  }, [url]);

  // Optimized event parsing with error handling
  const parseEventData = useCallback((data: string, fallbackType?: string): AgentNetworkEvent | null => {
    try {
      const trimmedData = data.trim();

      // Handle empty data
      if (!trimmedData) return null;

      // Handle [DONE] termination marker
      if (trimmedData === '[DONE]') {
        return {
          type: 'stream_complete',
          data: {
            timestamp: new Date().toISOString(),
            status: 'done'
          }
        };
      }

      // Handle SSE comments (lines starting with :)
      if (trimmedData.startsWith(':')) {
        return null;
      }

      const eventTime = Date.now();
      const parsed = JSON.parse(trimmedData);

      // Record latency if timestamp is available
      if (parsed.timestamp) {
        const serverTime = new Date(parsed.timestamp).getTime();
        const latency = eventTime - serverTime;
        if (latency > 0 && latency < 60000) { // Reasonable latency range
          connectionPoolRef.current.recordLatency(buildSSEUrl(), latency);
        }
      }

      // If data has type and nested data field (new format), use it
      if (parsed.type && parsed.data) {
        return {
          type: parsed.type,
          data: {
            timestamp: new Date().toISOString(),
            ...parsed.data
          }
        };
      }

      // Otherwise, type comes from SSE event field (current backend format)
      return {
        type: (fallbackType as AgentNetworkEvent['type']) || 'connection',
        data: {
          timestamp: new Date().toISOString(),
          ...parsed  // Spread all fields from the flat data
        }
      };
    } catch (error) {
      // Only warn for non-trivial parsing failures
      if (data.trim().length > 0) {
        console.warn('Failed to parse SSE event data:', data, error);
      }
      return null;
    }
  }, [buildSSEUrl]);

  // Event handler with memory management
  const handleEvent = useCallback((event: AgentNetworkEvent) => {
    const eventTime = Date.now();
    lastEventTimeRef.current = eventTime;

    setLastEvent(event);
    setEvents(prev => {
      const newEvents = [...prev, event];
      // Limit events to prevent memory leaks
      if (newEvents.length > opts.maxEvents) {
        return newEvents.slice(-opts.maxEvents);
      }
      return newEvents;
    });

    connectionPoolRef.current.updateActivity(buildSSEUrl());
  }, [opts.maxEvents, buildSSEUrl]);

  // Connect to SSE stream with pooling
  const connect = useCallback(() => {
    if (!opts.enabled || !url) {
      shouldReconnectRef.current = false;
      setConnectionState('disconnected');
      return;
    }

    if (!mountedRef.current) return;

    setConnectionState('connecting');
    setError(null);

    try {
      const sseUrl = buildSSEUrl();
      const subscriberId = subscriberIdRef.current;

      // Add to connection pool
      connectionPoolRef.current.addSubscriber(sseUrl, subscriberId);

      // Check if connection already exists in pool
      const existingConnection = connectionPoolRef.current.getConnection(sseUrl);
      if (existingConnection && existingConnection.readyState === EventSource.OPEN) {
        setConnectionState('connected');
        setReconnectAttempt(0);
        setError(null);
        shouldReconnectRef.current = true;
        callbacksRef.current.onConnect?.();
        return;
      }

      // Create new connection with timeout
      const accessToken = optimizedApiClient.getAccessToken();

      if (!accessToken) {
        setError('No authentication token available');
        setConnectionState('error');
        return;
      }

      // Use fetch-based SSE for authenticated proxy requests
      const controller = new AbortController();
      const connectionTimeout = setTimeout(() => {
        controller.abort();
        setError('Connection timeout');
        setConnectionState('error');

        if (opts.autoReconnect && shouldReconnectRef.current && reconnectAttempt < opts.maxReconnectAttempts) {
          networkStateRef.current.consecutiveFailures++;
          reconnect();
        }
      }, opts.connectionTimeout);

      fetch(sseUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'x-auth-token': accessToken,
        },
        credentials: opts.withCredentials ? 'include' : 'omit',
        signal: controller.signal,
      }).then(response => {
        clearTimeout(connectionTimeout);

        if (!response.ok) {
          throw new Error(`SSE request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processEventBlock = (block: string) => {
          const lines = block.split('\n');
          let eventType: string | undefined;
          const dataLines: string[] = [];

          for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;

            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim() || undefined;
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trim());
            }
          }

          if (!dataLines.length) return;

          const payload = dataLines.join('\n');
          const parsedEvent = parseEventData(payload, eventType);
          if (parsedEvent && mountedRef.current) {
            handleEvent(parsedEvent);
          }
        };

        const readStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;

              let separatorIndex = buffer.indexOf('\n\n');
              while (separatorIndex !== -1) {
                const rawEvent = buffer.slice(0, separatorIndex);
                buffer = buffer.slice(separatorIndex + 2);
                if (rawEvent.trim()) {
                  processEventBlock(rawEvent);
                }
                separatorIndex = buffer.indexOf('\n\n');
              }
            }

            if (buffer.trim()) {
              processEventBlock(buffer);
            }
          } catch (error) {
            if (!controller.signal.aborted && mountedRef.current) {
              console.error('SSE stream error:', error);
              setError(error instanceof Error ? error.message : 'Stream error');
              setConnectionState('error');

              networkStateRef.current.consecutiveFailures++;

              if (opts.autoReconnect && shouldReconnectRef.current && reconnectAttempt < opts.maxReconnectAttempts) {
                reconnect();
              } else {
                setConnectionState('disconnected');
              }
            }
          }
        };

        readStream();

        if (mountedRef.current) {
          setConnectionState('connected');
          setReconnectAttempt(0);
          setError(null);
          shouldReconnectRef.current = true;
          networkStateRef.current.consecutiveFailures = 0;
          callbacksRef.current.onConnect?.();
        }

        // Store in pool (mock EventSource interface)
        const mockEventSource = {
          close: () => controller.abort(),
          readyState: 1, // OPEN
        } as EventSource;

        connectionPoolRef.current.setConnection(sseUrl, mockEventSource);

      }).catch(error => {
        clearTimeout(connectionTimeout);

        if (mountedRef.current) {
          console.error('SSE fetch error:', error);
          setError(error instanceof Error ? error.message : 'Connection failed');
          setConnectionState('error');

          networkStateRef.current.consecutiveFailures++;

          if (opts.autoReconnect && shouldReconnectRef.current && reconnectAttempt < opts.maxReconnectAttempts) {
            reconnect();
          } else {
            setConnectionState('disconnected');
          }
        }
      });

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setError(error instanceof Error ? error.message : 'Connection failed');
      setConnectionState('error');
      networkStateRef.current.consecutiveFailures++;
    }
  }, [
    buildSSEUrl,
    opts,
    parseEventData,
    handleEvent,
    reconnectAttempt,
    url
  ]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const sseUrl = buildSSEUrl();
    const subscriberId = subscriberIdRef.current;

    // Remove from connection pool
    connectionPoolRef.current.removeSubscriber(sseUrl, subscriberId);

    if (mountedRef.current) {
      setConnectionState('disconnected');
      callbacksRef.current.onDisconnect?.();
    }
  }, [buildSSEUrl]);

  // Intelligent reconnect with adaptive delays
  const reconnect = useCallback(() => {
    if (!shouldReconnectRef.current || reconnectAttempt >= opts.maxReconnectAttempts) {
      return;
    }

    disconnect();

    const newAttempt = reconnectAttempt + 1;
    setReconnectAttempt(newAttempt);
    setConnectionState('reconnecting');

    const delay = getIntelligentReconnectDelay(newAttempt - 1);

    callbacksRef.current.onReconnect?.(newAttempt);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (shouldReconnectRef.current && mountedRef.current) {
        connect();
      }
    }, delay);
  }, [disconnect, connect, reconnectAttempt, opts.maxReconnectAttempts, getIntelligentReconnectDelay]);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
    setError(null);
  }, []);

  // Auto-connect on mount if URL is provided
  useEffect(() => {
    const isEnabled = Boolean(url) && opts.enabled;

    if (isEnabled) {
      connect();
    } else {
      disconnect();
      setConnectionState('disconnected');
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [url, opts.enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  // Get performance metrics
  const metrics = useMemo(() => {
    const poolMetrics = connectionPoolRef.current.getMetrics(buildSSEUrl());
    return poolMetrics || {
      totalEvents: events.length,
      reconnections: reconnectAttempt,
      connectionUptime: 0,
      averageLatency: 0,
    };
  }, [buildSSEUrl, events.length, reconnectAttempt]);

  return useMemo(() => ({
    connectionState,
    lastEvent,
    events,
    error: debouncedError,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
    reconnect,
    clearEvents,
    reconnectAttempt,
    metrics,
  }), [
    connectionState,
    lastEvent,
    events,
    debouncedError,
    connect,
    disconnect,
    reconnect,
    clearEvents,
    reconnectAttempt,
    metrics,
  ]);
}

/**
 * Optimized hook specifically for agent network SSE streams
 */
export function useOptimizedAgentNetworkSSE(sessionId: string, options: Omit<OptimizedSSEOptions, 'sessionId'> = {}) {
  const url = `/api/sse/agent_network_sse/${sessionId}`;
  return useOptimizedSSE(url, { ...options, sessionId });
}

/**
 * Optimized hook specifically for research task SSE streams
 * Uses ADK-compliant endpoint: /apps/{appName}/users/{userId}/sessions/{sessionId}/run
 */
export function useOptimizedResearchSSE(sessionId: string, options: Omit<OptimizedSSEOptions, 'sessionId'> = {}) {
  // ADK-compliant endpoint structure with Next.js proxy prefix
  const ADK_APP_NAME = process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana';
  const ADK_DEFAULT_USER = process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default';
  const url = `/api/sse/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions/${sessionId}/run`;
  return useOptimizedSSE(url, { ...options, sessionId });
}