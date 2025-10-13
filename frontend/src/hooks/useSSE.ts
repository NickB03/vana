/**
 * useSSE Hook - Real-time Server-Sent Events integration for Vana
 * Handles EventSource connections with reconnection logic and error handling
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AgentNetworkEvent } from '@/lib/api/types';
import { apiClient } from '@/lib/api/client';
import { useStableCallback, createRenderCounter } from '@/lib/react-performance';

export type SSEConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

export interface SSEOptions {
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
  /** Custom event handlers */
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
}

export interface SSEHookReturn {
  /** Current connection state */
  connectionState: SSEConnectionState;
  /** Last received event */
  lastEvent: AgentNetworkEvent | null;
  /** All received events */
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
}

const DEFAULT_OPTIONS = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
  withCredentials: true,
  enabled: true,
} as const;

/**
 * Custom hook for managing Server-Sent Events connections
 */
export function useSSE(url: string, options: SSEOptions = {}): SSEHookReturn {
  // Performance tracking for development
  const renderCounter = createRenderCounter('useSSE');
  renderCounter();

  // Stabilize options object to prevent unnecessary re-renders
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
      // Note: Intentionally exclude callback functions from dependencies
      // They will be handled via refs to prevent unnecessary reconnections
    ]
  );
  
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [lastEvent, setLastEvent] = useState<AgentNetworkEvent | null>(null);
  const [events, setEvents] = useState<AgentNetworkEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cleaningUpRef = useRef(false); // IDEMPOTENCY FIX: Prevent duplicate cleanup

  // Store event handler references for cleanup
  const eventHandlersRef = useRef<{
    onOpen: (() => void) | null;
    onMessage: ((event: MessageEvent) => void) | null;
    onError: ((event: Event) => void) | null;
    customHandlers: Map<string, (event: MessageEvent) => void>;
  }>({
    onOpen: null,
    onMessage: null,
    onError: null,
    customHandlers: new Map()
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

  // Calculate exponential backoff delay - stabilized
  const getReconnectDelay = useStableCallback((attempt: number): number => {
    const delay = opts.reconnectDelay * Math.pow(2, attempt);
    return Math.min(delay, opts.maxReconnectDelay);
  }, [opts.reconnectDelay, opts.maxReconnectDelay]);

  // Build SSE URL through secure proxy (no token exposure) - stabilized
  // SECURITY ENHANCEMENT: This function was updated to prevent JWT token exposure
  // in browser URLs by routing through server-side proxy endpoints
  const buildSSEUrl = useStableCallback((): string => {
    // Use Next.js API route proxy to avoid exposing JWT tokens in URLs
    let proxyPath: string;
    
    if (url.startsWith('http')) {
      // For absolute URLs, encode the full URL for proxy forwarding
      const encodedUrl = encodeURIComponent(url);
      proxyPath = `/api/sse?path=${encodedUrl}`;
    } else {
      // For relative URLs, construct proxy path
      const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
      proxyPath = `/api/sse/${cleanUrl}`;
    }
    
    // Return relative proxy path - no tokens in URL
    return proxyPath;
  }, [url]);

  // Parse SSE event data
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

      // Parse JSON data
      const parsed = JSON.parse(trimmedData);

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
  }, []);

  // Store latest state values in refs to prevent re-render loops
  const stateRefs = useRef({
    setConnectionState,
    setError,
    setLastEvent,
    setEvents,
    setReconnectAttempt
  });

  // Update state setters on each render
  useEffect(() => {
    stateRefs.current = {
      setConnectionState,
      setError,
      setLastEvent,
      setEvents,
      setReconnectAttempt
    };
  }, [setConnectionState, setError, setLastEvent, setEvents, setReconnectAttempt]);

  // Connect to SSE stream with secure authentication - stable reference
  const connect = useCallback(() => {
    console.log('[useSSE] connect() called:', { enabled: opts.enabled, url, eventSourceExists: !!eventSourceRef.current, mounted: mountedRef.current });

    if (!opts.enabled || !url) {
      console.log('[useSSE] connect() aborting - enabled:', opts.enabled, 'url:', url);
      shouldReconnectRef.current = false;
      stateRefs.current.setConnectionState('disconnected');
      return;
    }

    if (eventSourceRef.current || !mountedRef.current) {
      console.log('[useSSE] connect() blocked:', {
        reason: eventSourceRef.current ? 'already connected' : 'not mounted',
        eventSourceRef: !!eventSourceRef.current,
        mounted: mountedRef.current
      });
      return;
    }

    stateRefs.current.setConnectionState('connecting');
    stateRefs.current.setError(null);

    try {
      const sseUrl = buildSSEUrl();
      console.log('[useSSE] Connecting to SSE:', sseUrl);

      // For proxy routes, use fetch with custom headers since EventSource doesn't support them
      if (sseUrl.startsWith('/api/sse')) {
        // SECURITY: Cookies are automatically sent with credentials: 'include'
        // No need to manually add auth headers - HttpOnly cookies handle authentication

        // Improved development mode detection
        const isDevelopment = process.env.NODE_ENV === 'development' ||
                              !process.env.NEXT_PUBLIC_API_URL?.includes('production');

        // Use fetch-based SSE for authenticated proxy requests
        // CRITICAL FIX: Store controller in ref for proper cleanup
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Build headers - no auth tokens, cookies handle authentication
        const headers: HeadersInit = {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        };

        console.log('[useSSE] Connection attempt:', {
          url: sseUrl,
          isDevelopment,
          NODE_ENV: process.env.NODE_ENV,
          enabled: opts.enabled,
          cookiesIncluded: opts.withCredentials
        });
        console.log('[useSSE] Fetching SSE stream with headers:', Object.keys(headers));

        fetch(sseUrl, {
          method: 'GET',
          headers,
          credentials: opts.withCredentials ? 'include' : 'omit', // Cookies sent automatically
          signal: controller.signal,
        }).then(response => {
          console.log('[useSSE] SSE fetch response:', response.status, response.statusText);
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
            let eventId: string | undefined;
            const dataLines: string[] = [];

            // Parse all SSE fields from the event block
            for (const rawLine of lines) {
              const line = rawLine.trim();
              if (!line) continue;

              if (line.startsWith('event:')) {
                const extractedType = line.slice(6).trim();
                if (extractedType) {
                  eventType = extractedType;
                }
              } else if (line.startsWith('id:')) {
                eventId = line.slice(3).trim();
              } else if (line.startsWith('data:')) {
                dataLines.push(line.slice(5).trim());
              }
            }

            // Validate we have data before processing
            if (!dataLines.length) {
              console.warn('[useSSE] Event block missing data, skipping:', block.substring(0, 100));
              return;
            }

            const payload = dataLines.join('\n');

            // Enhanced logging for debugging
            if (!eventType) {
              console.warn('[useSSE] Event block missing event type - raw block:', block.substring(0, 200));
              console.log('[useSSE] Received event: NO_EVENT_TYPE, payload length:', payload.length, 'id:', eventId);
            } else {
              console.log('[useSSE] Received event:', eventType, 'payload length:', payload.length, 'id:', eventId);
            }

            const parsedEvent = parseEventData(payload, eventType);
            if (parsedEvent) {
              console.log('[useSSE] Parsed event type:', parsedEvent.type);
              stateRefs.current.setLastEvent(parsedEvent);
              stateRefs.current.setEvents(prev => [...prev, parsedEvent]);
            } else {
              console.warn('[useSSE] Failed to parse event - eventType:', eventType, 'payload preview:', payload.substring(0, 100));
            }
          };

          const readStream = async () => {
            try {
              while (true) {
                // MEMORY LEAK FIX: Check if still mounted before processing
                if (!mountedRef.current || controller.signal.aborted) {
                  console.log('[useSSE] Stream reader exiting - component unmounted or aborted');
                  break;
                }

                const { done, value } = await reader.read();

                if (done) {
                  // IDEMPOTENCY FIX: Check if already cleaning up
                  if (cleaningUpRef.current) {
                    console.log('[useSSE] Cleanup already in progress, skipping duplicate');
                    break;
                  }
                  cleaningUpRef.current = true;

                  // CRITICAL FIX: Stream completed normally - clean up to allow reconnection
                  console.log('[useSSE] Stream completed normally, cleaning up connection state');
                  eventSourceRef.current = null;
                  abortControllerRef.current = null;

                  if (mountedRef.current) {
                    stateRefs.current.setConnectionState('disconnected');
                    callbacksRef.current.onDisconnect?.();
                  }

                  cleaningUpRef.current = false;
                  break;
                }

                // MEMORY LEAK FIX: Check mounted state before processing chunk
                if (!mountedRef.current || controller.signal.aborted) {
                  console.log('[useSSE] Stream reader stopping - unmounted during read');
                  break;
                }

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

              if (buffer.trim() && mountedRef.current) {
                processEventBlock(buffer);
                buffer = '';
              }
            } catch (error) {
              // IDEMPOTENCY FIX: Prevent duplicate error handling
              if (cleaningUpRef.current) {
                console.log('[useSSE] Cleanup already in progress, skipping error handler');
                return;
              }

              if (!controller.signal.aborted) {
                cleaningUpRef.current = true;
                console.error('SSE stream error:', error);

                if (mountedRef.current) {
                  stateRefs.current.setError(error instanceof Error ? error.message : 'Stream error');
                  stateRefs.current.setConnectionState('error');
                }

                // CRITICAL FIX: Clean up connection state on error
                eventSourceRef.current = null;
                abortControllerRef.current = null;

                // Attempt reconnection if enabled
                if (opts.autoReconnect && shouldReconnectRef.current && reconnectAttempt < opts.maxReconnectAttempts && mountedRef.current) {
                  cleaningUpRef.current = false;
                  reconnect();
                } else {
                  if (mountedRef.current) {
                    stateRefs.current.setConnectionState('disconnected');
                    callbacksRef.current.onDisconnect?.();
                  }
                  cleaningUpRef.current = false;
                }
              } else {
                // IDEMPOTENCY FIX: Single cleanup on abort
                if (!cleaningUpRef.current) {
                  cleaningUpRef.current = true;
                  console.log('[useSSE] Stream aborted, cleaning up connection state');
                  eventSourceRef.current = null;
                  abortControllerRef.current = null;

                  if (mountedRef.current) {
                    stateRefs.current.setConnectionState('disconnected');
                    callbacksRef.current.onDisconnect?.();
                  }
                  cleaningUpRef.current = false;
                }
              }
            }
          };

          console.log('[useSSE] Starting SSE stream reader');
          // MEMORY LEAK FIX: Start read stream but don't await (runs in background)
          // The stream will self-terminate on unmount via controller.signal checks
          readStream().catch(err => {
            console.error('[useSSE] Unhandled readStream error:', err);
          });
          stateRefs.current.setConnectionState('connected');
          stateRefs.current.setReconnectAttempt(0);
          stateRefs.current.setError(null);
          shouldReconnectRef.current = true;
          console.log('[useSSE] SSE connection established successfully');
          callbacksRef.current.onConnect?.();
          
          // Store cleanup function
          eventSourceRef.current = {
            close: () => controller.abort(),
            readyState: 1, // OPEN
          } as any;
          
        }).catch(error => {
          console.error('SSE fetch error:', error);
          stateRefs.current.setError(error instanceof Error ? error.message : 'Connection failed');
          stateRefs.current.setConnectionState('error');

          if (opts.autoReconnect && shouldReconnectRef.current && reconnectAttempt < opts.maxReconnectAttempts) {
            reconnect();
          } else {
            stateRefs.current.setConnectionState('disconnected');
          }
        });
        
        return; // Skip standard EventSource setup for proxy routes
      }

      // Use standard EventSource for non-proxy routes
      // MEMORY LEAK FIX: Clean up old event handlers before creating new EventSource
      if (eventSourceRef.current) {
        try {
          const currentEventSource = eventSourceRef.current as EventSource;
          eventHandlersRef.current.customHandlers.forEach((handler, eventType) => {
            currentEventSource.removeEventListener(eventType, handler);
          });
          eventHandlersRef.current.customHandlers.clear();
          currentEventSource.close();
        } catch (error) {
          console.warn('[useSSE] Error cleaning up old EventSource:', error);
        }
      }

      const eventSource = new EventSource(sseUrl, {
        withCredentials: opts.withCredentials,
      });

      eventSourceRef.current = eventSource;

      // Create named handlers for cleanup
      const handleOpen = () => {
        if (!mountedRef.current) return;

        console.log('[useSSE] EventSource opened successfully');
        stateRefs.current.setConnectionState('connected');
        stateRefs.current.setReconnectAttempt(0);
        stateRefs.current.setError(null);
        shouldReconnectRef.current = true;

        // SSE connection established - use proper logger if needed
        callbacksRef.current.onConnect?.();
      };

      const handleMessage = (event: MessageEvent) => {
        if (!mountedRef.current) return;

        const parsedEvent = parseEventData(event.data);
        if (parsedEvent) {
          stateRefs.current.setLastEvent(parsedEvent);
          stateRefs.current.setEvents(prev => [...prev, parsedEvent]);
        }
      };

      // Store handler references
      eventHandlersRef.current.onOpen = handleOpen;
      eventHandlersRef.current.onMessage = handleMessage;

      // Attach handlers
      eventSource.onopen = handleOpen;
      eventSource.onmessage = handleMessage;

      // Handle specific event types
      const eventTypes = [
        'agent_network_update',
        'agent_network_snapshot',
        'agent_start',
        'agent_complete',
        'agent_network_connection',
        'connection',
        'keepalive',
        'error',
        'research_started',
        'research_update',
        'research_progress',
        'research_complete',
        'message_edited',
        'message_deleted',
        'feedback_received',
        'regeneration_progress'
      ];

      // Create named handlers for custom event types
      eventTypes.forEach(eventType => {
        const handler = (event: MessageEvent) => {
          if (!mountedRef.current) return;

          const parsedEvent = parseEventData(event.data);
          if (parsedEvent) {
            parsedEvent.type = eventType as any;
            stateRefs.current.setLastEvent(parsedEvent);
            stateRefs.current.setEvents(prev => [...prev, parsedEvent]);
          }
        };

        // Store handler reference for cleanup
        eventHandlersRef.current.customHandlers.set(eventType, handler);
        
        // Attach handler
        eventSource.addEventListener(eventType, handler);
      });

      // Create named error handler
      const handleError = (event: Event) => {
        if (!mountedRef.current) return;

        console.error('SSE connection error:', event);

        const errorMessage = 'SSE connection failed';
        stateRefs.current.setError(errorMessage);
        stateRefs.current.setConnectionState('error');

        callbacksRef.current.onError?.(event);

        // Attempt reconnection if enabled
        if (opts.autoReconnect && shouldReconnectRef.current && reconnectAttempt < opts.maxReconnectAttempts) {
          reconnect();
        } else {
          stateRefs.current.setConnectionState('disconnected');
        }
      };

      // Store error handler reference and attach
      eventHandlersRef.current.onError = handleError;
      eventSource.onerror = handleError;

    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      stateRefs.current.setError(error instanceof Error ? error.message : 'Connection failed');
      stateRefs.current.setConnectionState('error');
    }
  }, [buildSSEUrl, opts, parseEventData]); // Removed reconnectAttempt dependency

  // Disconnect from SSE stream - stable reference with no dependencies
  const disconnect = useCallback(() => {
    // IDEMPOTENCY FIX: Prevent duplicate disconnect operations
    if (cleaningUpRef.current) {
      console.log('[useSSE] disconnect() called but cleanup already in progress');
      return;
    }
    cleaningUpRef.current = true;

    shouldReconnectRef.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // CRITICAL FIX: Abort fetch controller if exists
    if (abortControllerRef.current) {
      console.log('[useSSE] Aborting fetch controller');
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        console.warn('[useSSE] Error aborting controller:', error);
      }
      abortControllerRef.current = null;
    }

    if (eventSourceRef.current) {
      const currentEventSource = eventSourceRef.current;

      // Remove all custom event listeners using stored references
      try {
        eventHandlersRef.current.customHandlers.forEach((handler, eventType) => {
          currentEventSource.removeEventListener?.(eventType, handler);
        });
      } catch (error) {
        console.warn('[useSSE] Error removing event listeners:', error);
      }

      // Clear standard event handlers
      currentEventSource.onopen = null;
      currentEventSource.onmessage = null;
      currentEventSource.onerror = null;

      // Close the connection
      try {
        if (typeof currentEventSource.close === 'function') {
          currentEventSource.close();
        }
      } catch (error) {
        console.warn('[useSSE] Error closing EventSource:', error);
      }
      eventSourceRef.current = null;
    }

    // Clear all handler references
    eventHandlersRef.current = {
      onOpen: null,
      onMessage: null,
      onError: null,
      customHandlers: new Map()
    };

    if (mountedRef.current) {
      stateRefs.current.setConnectionState('disconnected');
      callbacksRef.current.onDisconnect?.();
    }

    // IDEMPOTENCY FIX: Reset cleanup flag
    cleaningUpRef.current = false;
  }, []); // No dependencies - all state accessed via refs

  // Store reconnectAttempt in ref for stable access
  const reconnectAttemptRef = useRef(0);
  useEffect(() => {
    reconnectAttemptRef.current = reconnectAttempt;
  }, [reconnectAttempt]);

  // Reconnect to SSE stream - stable reference
  const reconnect = useCallback(() => {
    if (!shouldReconnectRef.current || reconnectAttemptRef.current >= opts.maxReconnectAttempts) {
      return;
    }

    disconnect();

    const newAttempt = reconnectAttemptRef.current + 1;
    stateRefs.current.setReconnectAttempt(newAttempt);
    stateRefs.current.setConnectionState('reconnecting');

    const delay = getReconnectDelay(newAttempt - 1);

    // SSE reconnection attempt - use proper logger if needed
    callbacksRef.current.onReconnect?.(newAttempt);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (shouldReconnectRef.current && mountedRef.current) {
        connect();
      }
    }, delay);
  }, [disconnect, connect, opts.maxReconnectAttempts, getReconnectDelay]); // Removed reconnectAttempt

  // Clear all events - stable reference
  const clearEvents = useCallback(() => {
    stateRefs.current.setEvents([]);
    stateRefs.current.setLastEvent(null);
    stateRefs.current.setError(null);
  }, []);

  // Store url and enabled in refs for stable access
  const urlRef = useRef(url);
  const enabledRef = useRef(opts.enabled);

  useEffect(() => {
    urlRef.current = url;
    enabledRef.current = opts.enabled;
  }, [url, opts.enabled]);

  // Auto-connect on mount if URL is provided - single cleanup effect
  useEffect(() => {
    mountedRef.current = true;  // Set mounted flag when effect runs
    const isEnabled = Boolean(urlRef.current) && enabledRef.current;

    if (isEnabled) {
      connect();
    } else {
      disconnect();
      stateRefs.current.setConnectionState('disconnected');
    }

    // Single cleanup on unmount
    return () => {
      mountedRef.current = false;

      // MEMORY LEAK FIX: Clear reconnection timeout to prevent state updates after unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      disconnect();
    };
  }, [connect, disconnect]); // Stable dependencies only

  return useMemo(() => ({
    connectionState,
    lastEvent,
    events,
    error,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
    reconnect,
    clearEvents,
    reconnectAttempt,
  }), [
    connectionState,
    lastEvent,
    events,
    error,
    connect,
    disconnect,
    reconnect,
    clearEvents,
    reconnectAttempt,
  ]);
}

/**
 * DEPRECATED: useAgentNetworkSSE hook removed
 *
 * Following Google ADK best practices, all events (research + agent status)
 * now flow through a single SSE stream via useResearchSSE.
 *
 * The /agent_network_sse endpoint has been removed. Use useResearchSSE instead.
 */

/**
 * Hook specifically for research task SSE streams
 * Uses ADK-compliant endpoint: /apps/{appName}/users/{userId}/sessions/{sessionId}/run
 */
export function useResearchSSE(sessionId: string, options: Omit<SSEOptions, 'sessionId'> = {}) {
  // Guard against empty sessionId to prevent race condition
  // This prevents attempting connection with URL like "/apps/vana/users/default/sessions//run"
  if (!sessionId || sessionId.trim() === '') {
    return useSSE('', { ...options, enabled: false, sessionId: '' });
  }

  // ADK-compliant endpoint structure
  const ADK_APP_NAME = process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana';
  const ADK_DEFAULT_USER = process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default';
  const url = `/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions/${sessionId}/run`;
  return useSSE(url, { ...options, sessionId });
}

/**
 * ========================================================================
 * SECURITY DOCUMENTATION - SSE JWT Token Protection
 * ========================================================================
 * 
 * VULNERABILITY FIXED: JWT Token Exposure in Browser URLs
 * 
 * BEFORE (VULNERABLE):
 * - JWT tokens were added directly to SSE URLs as query parameters
 * - URLs like: https://api.example.com/sse?token=eyJhbGciOiJIUzI1NiIs...
 * - Tokens visible in browser history, logs, referrer headers
 * - High risk of credential theft through various attack vectors
 * 
 * AFTER (SECURE):
 * - SSE connections route through Next.js proxy endpoints (/api/sse/)
 * - JWT tokens extracted from secure HTTP-only cookies server-side
 * - Fallback to x-auth-token header for client-side authentication
 * - No tokens ever appear in browser-visible URLs
 * 
 * SECURITY ARCHITECTURE:
 * 
 * 1. Client Request Flow:
 *    Browser → EventSource(/api/sse/endpoint) → Next.js API Route
 * 
 * 2. Server-Side Authentication:
 *    Next.js API → Extract token from cookies → Forward with Authorization header
 * 
 * 3. Upstream Connection:
 *    Proxy → Backend SSE (https://backend/sse?auth=Bearer token)
 * 
 * ATTACK VECTORS PREVENTED:
 * 
 * 1. Browser History Leakage
 *    - Tokens no longer stored in browser history
 *    - Safe for shared computers and forensic analysis
 * 
 * 2. Server Log Exposure
 *    - URLs without tokens won't leak credentials in access logs
 *    - Safer for log aggregation and monitoring
 * 
 * 3. Referrer Header Leakage
 *    - External sites won't receive tokens via Referer header
 *    - Protection against cross-site information disclosure
 * 
 * 4. XSS Token Harvesting
 *    - Tokens in HttpOnly cookies can't be accessed by malicious scripts
 *    - Reduced impact of XSS vulnerabilities
 * 
 * 5. MITM/Network Sniffing
 *    - Tokens transmitted in Authorization headers (HTTPS protected)
 *    - Not visible in URL-based network traffic analysis
 * 
 * IMPLEMENTATION DETAILS:
 * 
 * 1. Proxy Endpoints:
 *    - /api/sse/[...route]/route.ts - Dynamic route matching
 *    - /api/sse/route.ts - Query parameter based routing
 * 
 * 2. Authentication Methods:
 *    - Primary: HTTP-only cookies (vana_access_token)
 *    - Fallback: x-auth-token header for SPA scenarios
 * 
 * 3. Token Handling:
 *    - Server-side extraction and validation
 *    - Automatic Authorization header injection
 *    - Proper error handling for authentication failures
 * 
 * COMPLIANCE & STANDARDS:
 * 
 * - OWASP Top 10: Prevents Broken Authentication (A07)
 * - RFC 6750: Proper Bearer token handling
 * - NIST Cybersecurity Framework: Protect function implementation
 * 
 * MONITORING & DETECTION:
 * 
 * - Failed authentication attempts logged server-side
 * - No sensitive data in client-side error messages
 * - Proper HTTP status codes for different failure scenarios
 * 
 * This implementation provides defense-in-depth security for SSE authentication
 * while maintaining backward compatibility and developer experience.
 * ========================================================================
 */
