/**
 * useSSE Hook - Real-time Server-Sent Events integration for Vana
 * Handles EventSource connections with reconnection logic and error handling
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AgentNetworkEvent } from '@/lib/api/types';
import { apiClient } from '@/lib/api/client';
import { useStableCallback, createRenderCounter } from '@/lib/react-performance';
import { getCsrfToken } from '@/lib/csrf';
import { isAdkCanonicalStreamEnabled } from '@/lib/env';
import { parseAdkEventSSE, type ParsedAdkEvent } from '@/lib/streaming/adk';

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
  /** HTTP method for SSE request (Phase 3.3: POST for canonical mode) */
  method?: 'GET' | 'POST';
  /** Request body for POST SSE requests (Phase 3.3 canonical mode) */
  requestBody?: Record<string, any>;
  /** Custom event handlers */
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
}

export interface SSEHookReturn {
  /** Current connection state */
  connectionState: SSEConnectionState;
  /** Synchronous connection state ref (for immediate access without waiting for re-render) */
  connectionStateRef: React.MutableRefObject<SSEConnectionState>;
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
  /** Last parsed ADK event (Phase 3 - only populated when feature flag enabled) */
  lastAdkEvent: ParsedAdkEvent | null;
  /** Update request body for POST SSE (Phase 3.3 - canonical mode) */
  updateRequestBody: (body: Record<string, any>) => void;
}

/**
 * P1-001 FIX: Maximum number of events to retain in memory
 *
 * Implements a circular buffer to prevent unbounded memory growth in long-running SSE sessions.
 * When the events array exceeds this limit, oldest events are automatically removed (FIFO).
 *
 * Memory Impact:
 * - Before: Unbounded growth (50MB+ in long sessions)
 * - After: ~5-10MB max (1000 events × 5-10KB each)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
 */
const MAX_EVENTS = 1000;

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
      // NOTE: options.sessionId intentionally omitted - already embedded in URL
      options.method, // PHASE 3.3: Include method for canonical mode
      // Note: Intentionally exclude callback functions and requestBody from dependencies
      // Callbacks handled via refs, requestBody handled via separate ref + effect
    ]
  );
  
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [lastEvent, setLastEvent] = useState<AgentNetworkEvent | null>(null);
  const [events, setEvents] = useState<AgentNetworkEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  // Phase 3: ADK canonical event storage (feature flag gated)
  const [lastAdkEvent, setLastAdkEvent] = useState<ParsedAdkEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cleaningUpRef = useRef(false); // IDEMPOTENCY FIX: Prevent duplicate cleanup
  // CRITICAL FIX: Track connection state synchronously in ref for immediate visibility
  // This allows waitForSSEState to see state changes immediately without waiting for React re-render
  const connectionStateRef = useRef<SSEConnectionState>('disconnected');

  // PHASE 3.3: Ref for dynamic request body injection (canonical mode)
  // Allows updating body after hook creation but before connection
  const requestBodyRef = useRef<Record<string, any> | undefined>(options.requestBody);

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

  // PHASE 3.3: Update request body ref when options change
  useEffect(() => {
    requestBodyRef.current = options.requestBody;
  }, [options.requestBody]);

  // CRITICAL FIX: Sync connectionStateRef with connectionState
  // This ensures the ref always reflects the latest state for synchronous access
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  // CRITICAL FIX: Helper to update both state and ref synchronously
  // This ensures waitForSSEState can see state changes immediately
  const updateConnectionState = useCallback((newState: SSEConnectionState) => {
    connectionStateRef.current = newState; // SYNC update
    stateRefs.current.setConnectionState(newState); // ASYNC update
  }, []);

  // Calculate exponential backoff delay - stabilized
  const getReconnectDelay = useStableCallback((attempt: number): number => {
    const delay = opts.reconnectDelay * Math.pow(2, attempt);
    return Math.min(delay, opts.maxReconnectDelay);
  }, [opts.reconnectDelay, opts.maxReconnectDelay]);

  // Build SSE URL through secure proxy (no token exposure) - stabilized
  // SECURITY ENHANCEMENT: This function was updated to prevent JWT token exposure
  // in browser URLs by routing through server-side proxy endpoints
  const buildSSEUrl = useStableCallback((targetUrl?: string): string => {
    // PHASE 3.3 FIX: Accept targetUrl parameter to support dynamic URL construction
    const effectiveUrl = targetUrl ?? url;

    // Use Next.js API route proxy to avoid exposing JWT tokens in URLs

    // PHASE 3.3 FIX: If URL already starts with /api/sse/, it's already a proxy path
    if (effectiveUrl.startsWith('/api/sse/')) {
      return effectiveUrl;
    }

    let proxyPath: string;

    if (effectiveUrl.startsWith('http')) {
      // For absolute URLs, encode the full URL for proxy forwarding
      const encodedUrl = encodeURIComponent(effectiveUrl);
      proxyPath = `/api/sse?path=${encodedUrl}`;
    } else {
      // For relative URLs, construct proxy path
      const cleanUrl = effectiveUrl.startsWith('/') ? effectiveUrl.slice(1) : effectiveUrl;
      proxyPath = `/api/sse/${cleanUrl}`;
    }

    // Return relative proxy path - no tokens in URL
    return proxyPath;
  }, [url]);

  // Parse SSE event data with feature flag routing
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

      // PHASE 3: Feature flag routing for ADK canonical events
      if (isAdkCanonicalStreamEnabled()) {
        // Detect if this looks like an ADK event before attempting to parse
        // ADK events must have: id, author, and invocationId
        try {
          const possibleEvent = JSON.parse(trimmedData);
          const hasAdkStructure = possibleEvent &&
            typeof possibleEvent === 'object' &&
            (possibleEvent.id || possibleEvent.author || possibleEvent.invocationId);

          if (hasAdkStructure) {
            console.log('[useSSE] Detected ADK event structure - parsing as canonical');
            const adkResult = parseAdkEventSSE(trimmedData, fallbackType);

            if (adkResult.success && adkResult.event) {
              // Store ADK event for Phase 3 consumers
              setLastAdkEvent(adkResult.event);

              // Convert to legacy AgentNetworkEvent for backward compatibility
              // FIX: Include content, usageMetadata, partial, and invocationId for Fix 2
              return {
                type: (fallbackType as AgentNetworkEvent['type']) || 'message',
                data: {
                  timestamp: new Date(adkResult.event.rawEvent.timestamp * 1000).toISOString(),
                  author: adkResult.event.author,
                  messageId: adkResult.event.messageId,
                  textParts: adkResult.event.textParts,
                  thoughtParts: adkResult.event.thoughtParts,
                  functionCalls: adkResult.event.functionCalls,
                  functionResponses: adkResult.event.functionResponses,
                  isAgentTransfer: adkResult.event.isAgentTransfer,
                  transferTargetAgent: adkResult.event.transferTargetAgent,
                  isFinalResponse: adkResult.event.isFinalResponse,
                  _raw: adkResult.event.rawEvent,
                  // FIX 2: Add fields needed by sse-event-handlers.ts for completion detection
                  content: adkResult.event.rawEvent.content,
                  usageMetadata: adkResult.event.rawEvent.usageMetadata,
                  partial: adkResult.event.rawEvent.partial,
                  invocationId: adkResult.event.rawEvent.invocationId,
                }
              };
            }
          } else {
            console.log('[useSSE] Legacy event structure detected - skipping ADK parser');
          }
        } catch (error) {
          console.log('[useSSE] Event detection failed - using legacy parser:', error);
          // Fall through to legacy parsing
        }
      }

      // LEGACY: Parse flattened events (backward compatibility)
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
        console.warn('[useSSE] Failed to parse SSE event data:', data, error);
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
    setReconnectAttempt,
    setLastAdkEvent,
  });

  // Update state setters on each render
  useEffect(() => {
    stateRefs.current = {
      setConnectionState,
      setError,
      setLastEvent,
      setEvents,
      setReconnectAttempt,
      setLastAdkEvent,
    };
  }, [setConnectionState, setError, setLastEvent, setEvents, setReconnectAttempt, setLastAdkEvent]);

  // Connect to SSE stream with secure authentication - stable reference
  const connect = useCallback(() => {
    // PHASE 3.3 FIX: For POST requests with a body, allow connection even if enabled is false
    // This handles the race condition where sessionId hasn't propagated to the URL yet
    const hasPostBody = opts.method === 'POST' && requestBodyRef.current;
    const canConnect = opts.enabled || hasPostBody;

    console.log('[useSSE] connect() called:', {
      enabled: opts.enabled,
      url,
      method: opts.method,
      hasPostBody,
      canConnect,
      eventSourceExists: !!eventSourceRef.current,
      mounted: mountedRef.current
    });

    if (!canConnect) {
      console.log('[useSSE] connect() aborting - enabled:', opts.enabled, 'hasPostBody:', hasPostBody);
      shouldReconnectRef.current = false;
      updateConnectionState('disconnected');
      return;
    }

    // For POST requests with body but no URL, build URL dynamically from body.sessionId
    let effectiveUrl = url;
    if (!effectiveUrl && hasPostBody && requestBodyRef.current?.sessionId) {
      const { appName, userId, sessionId } = requestBodyRef.current;
      if (opts.method === 'POST' && url === '') {
        // Use the canonical POST endpoint
        effectiveUrl = '/api/sse/run_sse';
        console.log('[useSSE] Built dynamic URL from request body:', effectiveUrl);
      }
    }

    if (!effectiveUrl) {
      console.log('[useSSE] connect() aborting - no effective URL available');
      shouldReconnectRef.current = false;
      updateConnectionState('disconnected');
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

    updateConnectionState('connecting');
    stateRefs.current.setError(null);

    try {
      // PHASE 3.3 FIX: Use effectiveUrl instead of url for buildSSEUrl
      // This ensures we use the dynamically built URL when available
      const sseUrl = buildSSEUrl(effectiveUrl);
      console.log('[useSSE] Connecting to SSE:', sseUrl, '(effectiveUrl:', effectiveUrl, ')');

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
        // SECURITY: Add CSRF token for CSRF protection
        const csrfToken = getCsrfToken();
        const headers: HeadersInit = {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        };

        // Add CSRF token if available
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
          console.log('[useSSE] Added CSRF token to request headers');
        } else {
          console.warn('[useSSE] No CSRF token available - request may fail in production');
        }

        console.log('[useSSE] Connection attempt:', {
          url: sseUrl,
          isDevelopment,
          NODE_ENV: process.env.NODE_ENV,
          enabled: opts.enabled,
          cookiesIncluded: opts.withCredentials,
          hasCsrfToken: !!csrfToken
        });
        console.log('[useSSE] Fetching SSE stream with headers:', Object.keys(headers));

        // PHASE 3.3: Dynamic method and body support for canonical mode
        const method = opts.method || 'GET';
        console.log('[useSSE] Method:', method, 'requestBodyRef:', !!requestBodyRef.current);

        const fetchOptions: RequestInit = {
          method,
          headers,
          credentials: opts.withCredentials ? 'include' : 'omit',
          signal: controller.signal,
        };

        // Add body for POST requests (canonical mode)
        if (method === 'POST' && requestBodyRef.current) {
          headers['Content-Type'] = 'application/json';
          fetchOptions.body = JSON.stringify(requestBodyRef.current);
          console.log('[useSSE] POST request with body:', Object.keys(requestBodyRef.current));
        } else if (method === 'POST') {
          console.warn('[useSSE] POST method but no requestBodyRef.current');
        }

        fetch(sseUrl, fetchOptions).then(response => {
          console.log('[useSSE] SSE fetch response:', response.status, response.statusText);
          if (!response.ok) {
            throw new Error(`SSE request failed: ${response.status}`);
          }

          if (!response.body) {
            throw new Error('No response body');
          }

          // CRITICAL FIX: Set state to 'connected' immediately after validating response
          // This must happen BEFORE setting up stream reader so waitForSSEConnection() works
          // Update both state (async, for React renders) and ref (sync, for immediate access)
          connectionStateRef.current = 'connected'; // SYNC update - visible immediately
          stateRefs.current.setConnectionState('connected'); // ASYNC update - triggers re-render
          stateRefs.current.setReconnectAttempt(0);
          stateRefs.current.setError(null);
          shouldReconnectRef.current = true;
          console.log('[useSSE] SSE connection established successfully (response OK, state=' + connectionStateRef.current + ')');
          callbacksRef.current.onConnect?.();

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          let buffer = '';
          let hasReceivedCompletionEvent = false; // Track if we've seen ADK final response

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

            // FIX 2: Check if this is an ADK completion event (usageMetadata + role:model + NOT partial)
            if (payload.includes('"usageMetadata"') &&
                payload.includes('"role":"model"') &&
                !payload.includes('"partial":true')) {
              hasReceivedCompletionEvent = true;
              console.log('[useSSE] Detected ADK completion event (usageMetadata present, not partial)');
            }

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
              // P1-001 FIX: Circular buffer implementation (see MAX_EVENTS constant)
              stateRefs.current.setEvents(prev => {
                const newEvents = [...prev, parsedEvent];
                if (newEvents.length > MAX_EVENTS) {
                  return newEvents.slice(-MAX_EVENTS); // Keep most recent events
                }
                return newEvents;
              });
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

                  // DEBUG: Log buffer contents and completion flag at stream end
                  console.log('[useSSE] Stream ended, buffer contents:', buffer.length > 0 ? buffer.substring(0, 500) : '(empty)');
                  console.log('[useSSE] Stream ended, hasReceivedCompletionEvent:', hasReceivedCompletionEvent);

                  // P1-002 FIX: Smart stream termination detection
                  // Distinguish between expected completion (with markers) vs unexpected termination (network loss)
                  // FIX 2: Check both buffer markers AND the completion flag set during event processing
                  const hasExpectedCompletion =
                    hasReceivedCompletionEvent ||  // Flag set when ADK final event was processed
                    buffer.includes('[DONE]') ||
                    buffer.includes('"status":"complete"') ||
                    buffer.includes('"status":"done"') ||
                    buffer.includes('"type":"stream_complete"') ||
                    // Fallback: check buffer for ADK completion pattern
                    (buffer.includes('"usageMetadata"') &&
                     buffer.includes('"role":"model"') &&
                     !buffer.includes('"partial":true'));

                  if (hasExpectedCompletion) {
                    // Expected termination - stream completed successfully with completion marker
                    console.log('[useSSE] Stream completed with completion marker - clean disconnect');
                    eventSourceRef.current = null;
                    abortControllerRef.current = null;

                    if (mountedRef.current) {
                      stateRefs.current.setConnectionState('disconnected');
                      callbacksRef.current.onDisconnect?.();
                    }
                  } else {
                    // Unexpected termination - no completion marker found (network issue, server crash, etc.)
                    console.warn('[useSSE] Stream terminated unexpectedly without completion marker');
                    eventSourceRef.current = null;
                    abortControllerRef.current = null;

                    if (mountedRef.current) {
                      // Check if we should attempt reconnection
                      const currentReconnectAttempt = reconnectAttemptRef.current;
                      if (
                        shouldReconnectRef.current &&
                        opts.autoReconnect &&
                        currentReconnectAttempt < opts.maxReconnectAttempts
                      ) {
                        console.log(`[useSSE] Attempting reconnection (${currentReconnectAttempt + 1}/${opts.maxReconnectAttempts})`);
                        stateRefs.current.setError('Stream terminated unexpectedly - reconnecting...');
                        cleaningUpRef.current = false;
                        reconnect();
                      } else {
                        // Max reconnection attempts reached or auto-reconnect disabled
                        const errorMessage = currentReconnectAttempt >= opts.maxReconnectAttempts
                          ? 'Stream terminated unexpectedly - max reconnection attempts reached'
                          : 'Stream terminated unexpectedly';

                        console.error(`[useSSE] ${errorMessage}`);
                        stateRefs.current.setError(errorMessage);
                        stateRefs.current.setConnectionState('error');
                        callbacksRef.current.onError?.(new Error(errorMessage) as any);
                        callbacksRef.current.onDisconnect?.();
                      }
                    }
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
          // P1-001 FIX: Circular buffer implementation (see MAX_EVENTS constant)
          stateRefs.current.setEvents(prev => {
            const newEvents = [...prev, parsedEvent];
            if (newEvents.length > MAX_EVENTS) {
              return newEvents.slice(-MAX_EVENTS); // Keep most recent events
            }
            return newEvents;
          });
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
            // P1-001 FIX: Circular buffer implementation (see MAX_EVENTS constant)
            stateRefs.current.setEvents(prev => {
              const newEvents = [...prev, parsedEvent];
              if (newEvents.length > MAX_EVENTS) {
                return newEvents.slice(-MAX_EVENTS); // Keep most recent events
              }
              return newEvents;
            });
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
      updateConnectionState('disconnected');
      callbacksRef.current.onDisconnect?.();
    }

    // IDEMPOTENCY FIX: Reset cleanup flag
    cleaningUpRef.current = false;
  }, [updateConnectionState]); // Include updateConnectionState dependency

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
    updateConnectionState('reconnecting');

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
    stateRefs.current.setLastAdkEvent(null);
    stateRefs.current.setError(null);
  }, []);

  // PHASE 3.3: Update request body dynamically (for canonical POST SSE)
  // Allows injecting body after hook creation but before connection
  const updateRequestBody = useCallback((body: Record<string, any>) => {
    requestBodyRef.current = body;
    console.log('[useSSE] Request body updated for next connection:', Object.keys(body));
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
    connectionStateRef, // CRITICAL FIX: Expose ref for synchronous state access
    lastEvent,
    events,
    error,
    isConnected: connectionState === 'connected',
    connect,
    disconnect,
    reconnect,
    clearEvents,
    reconnectAttempt,
    lastAdkEvent,
    updateRequestBody, // PHASE 3.3: Expose body update method
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
    lastAdkEvent,
    updateRequestBody, // PHASE 3.3: Include in dependencies
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
 *
 * PHASE 3.3: Feature flag routing between legacy and canonical modes
 *
 * **Legacy Mode** (NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=false):
 * - Uses GET /apps/{appName}/users/{userId}/sessions/{sessionId}/run
 * - Message already persisted by apiClient.startResearch()
 * - Backend converts canonical ADK events to legacy format
 * - Triggers LegacyEventHandler in frontend
 *
 * **Canonical Mode** (NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true):
 * - Uses POST /api/sse/run_sse with request body
 * - Direct streaming from ADK without conversion
 * - Triggers AdkEventHandler in frontend
 * - Populates rawAdkEvents in store
 *
 * @param sessionId - Session identifier
 * @param options - SSE connection options
 * @returns SSE hook with connection management
 */
export function useResearchSSE(
  sessionId: string,
  options: Omit<SSEOptions, 'sessionId' | 'enabled'> = {}  // CRITICAL: Remove 'enabled' from parent control
) {
  // PHASE 3.3: Feature flag routing (memoized to prevent unnecessary re-computations)
  const isCanonicalMode = useMemo(() => isAdkCanonicalStreamEnabled(), []);
  const ADK_APP_NAME = process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana';
  const ADK_DEFAULT_USER = process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default';

  // CRITICAL FIX: Memoize URL and method to prevent hook recreation
  const { url, method } = useMemo(() => {
    // Guard against empty sessionId to prevent race condition
    if (!sessionId || sessionId.trim() === '') {
      return { url: '', method: 'GET' as const };
    }

    if (isCanonicalMode) {
      // CANONICAL MODE: POST /api/sse/run_sse (Phase 3.3)
      // Request body will be injected by message handlers via updateRequestBody()
      console.log('[useResearchSSE] Canonical mode enabled - using POST /api/sse/run_sse');
      return { url: '/api/sse/run_sse', method: 'POST' as const };
    } else {
      // LEGACY MODE: GET /apps/{appName}/users/{userId}/sessions/{sessionId}/run
      const legacyUrl = `/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions/${sessionId}/run`;
      console.log('[useResearchSSE] Legacy mode - using GET', legacyUrl);
      return { url: legacyUrl, method: 'GET' as const };
    }
  }, [sessionId, isCanonicalMode, ADK_APP_NAME, ADK_DEFAULT_USER]);

  // CRITICAL FIX: Memoize options object to prevent unnecessary hook recreations
  // Extract specific option values to ensure stable dependencies
  const {
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    maxReconnectDelay,
    withCredentials,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  } = options;

  const sseOptions = useMemo(() => {
    // CRITICAL FIX (Phase 3.3): Disable auto-connect for POST canonical mode
    // POST requires request body, which is injected later by sendMessage
    // Only auto-connect for GET legacy mode (no body required)
    const shouldEnable = url !== '' && method === 'GET';

    if (url && method === 'POST') {
      console.log('[useResearchSSE] POST mode detected - disabling auto-connect, waiting for sendMessage with body');
    }

    return {
      enabled: shouldEnable,
      autoReconnect,
      maxReconnectAttempts,
      reconnectDelay,
      maxReconnectDelay,
      withCredentials,
      // NOTE: sessionId intentionally omitted - it's already embedded in the URL
      method,
      onConnect,
      onDisconnect,
      onError,
      onReconnect,
    };
  }, [
    url,  // enabled depends on url (and url changes with sessionId)
    method,  // CRITICAL: also depends on method (POST vs GET)
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    maxReconnectDelay,
    withCredentials,
    // NOTE: sessionId removed from deps - prevents hook recreation on session change
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  ]);

  return useSSE(url, sseOptions);
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
