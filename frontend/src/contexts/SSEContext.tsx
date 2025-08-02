/**
 * SSEContext - Server-Sent Events management for Vana
 * 
 * Handles real-time communication with the ADK backend via Server-Sent Events.
 * Provides automatic reconnection, event buffering, and typed event handling.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  SSEState,
  SSEContextValue,
  SSEAction,
  SSEEvent,
  SSEConfiguration,
  DEFAULT_SSE_CONFIG,
  parseSSEEvent,
} from '@/types/sse';
import { useAuthState } from './AuthContext';
import { useNotifications } from './AppContext';

// Initial SSE state
const initialSSEState: SSEState = {
  connection: {
    readyState: 'CLOSED',
    reconnectAttempts: 0,
    url: '',
    autoReconnect: true,
    eventsReceived: 0,
  },
  config: DEFAULT_SSE_CONFIG,
  eventHandlers: new Map(),
  recentEvents: [],
  maxBufferSize: 100,
  enabled: true,
};

// SSE reducer
function sseReducer(state: SSEState, action: SSEAction): SSEState {
  switch (action.type) {
    case 'SSE_CONNECTING':
      return {
        ...state,
        connection: {
          ...state.connection,
          readyState: 'CONNECTING',
          url: action.payload.url,
          lastError: undefined,
        },
      };

    case 'SSE_CONNECTED':
      return {
        ...state,
        connection: {
          ...state.connection,
          readyState: 'OPEN',
          connectedAt: action.payload.timestamp,
          reconnectAttempts: 0,
          lastError: undefined,
        },
      };

    case 'SSE_DISCONNECTED':
      return {
        ...state,
        connection: {
          ...state.connection,
          readyState: 'CLOSED',
          lastError: action.payload.error,
        },
      };

    case 'SSE_ERROR':
      return {
        ...state,
        connection: {
          ...state.connection,
          lastError: action.payload.error,
        },
      };

    case 'SSE_EVENT_RECEIVED':
      const newEvent = action.payload.event;
      const updatedEvents = [newEvent, ...state.recentEvents].slice(0, state.maxBufferSize);
      
      return {
        ...state,
        connection: {
          ...state.connection,
          lastEventAt: newEvent.timestamp,
          eventsReceived: state.connection.eventsReceived + 1,
        },
        recentEvents: updatedEvents,
      };

    case 'SSE_RECONNECT_ATTEMPT':
      return {
        ...state,
        connection: {
          ...state.connection,
          reconnectAttempts: action.payload.attempt,
        },
      };

    case 'SSE_CONFIG_UPDATE':
      return {
        ...state,
        config: {
          ...state.config,
          ...action.payload.config,
        },
      };

    case 'SSE_ENABLED_SET':
      return {
        ...state,
        enabled: action.payload.enabled,
      };

    case 'SSE_EVENTS_CLEAR':
      return {
        ...state,
        recentEvents: [],
      };

    case 'SSE_HANDLER_ADD':
      const handlersMapAdd = new Map(state.eventHandlers);
      const existingHandlersAdd = handlersMapAdd.get(action.payload.eventType) || new Set();
      existingHandlersAdd.add(action.payload.handler);
      handlersMapAdd.set(action.payload.eventType, existingHandlersAdd);
      
      return {
        ...state,
        eventHandlers: handlersMapAdd,
      };

    case 'SSE_HANDLER_REMOVE':
      const handlersMapRemove = new Map(state.eventHandlers);
      const existingHandlersRemove = handlersMapRemove.get(action.payload.eventType);
      
      if (existingHandlersRemove) {
        existingHandlersRemove.delete(action.payload.handler);
        if (existingHandlersRemove.size === 0) {
          handlersMapRemove.delete(action.payload.eventType);
        } else {
          handlersMapRemove.set(action.payload.eventType, existingHandlersRemove);
        }
      }
      
      return {
        ...state,
        eventHandlers: handlersMapRemove,
      };

    default:
      return state;
  }
}

// Create contexts (split for performance)
const SSEStateContext = createContext<SSEState | null>(null);
const SSEActionsContext = createContext<Omit<SSEContextValue, keyof SSEState> | null>(null);

/**
 * SSEProvider component
 */
interface SSEProviderProps {
  children: React.ReactNode;
  /** Custom SSE configuration */
  config?: Partial<SSEConfiguration>;
}

export function SSEProvider({ children, config: customConfig }: SSEProviderProps) {
  const [state, dispatch] = useReducer(sseReducer, initialSSEState, (initial) => ({
    ...initial,
    config: { ...initial.config, ...customConfig },
  }));

  const { user } = useAuthState();
  const { notifyError, notifyInfo } = useNotifications();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle incoming SSE events
  const handleSSEEvent = useCallback((event: SSEEvent) => {
    dispatch({ type: 'SSE_EVENT_RECEIVED', payload: { event } });

    // Call registered event handlers
    const handlers = state.eventHandlers.get(event.event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[SSE] Error in event handler for ${event.event}:`, error);
        }
      });
    }

    // Call wildcard handlers
    const wildcardHandlers = state.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('[SSE] Error in wildcard event handler:', error);
        }
      });
    }
  }, [state.eventHandlers]);

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (!state.enabled || !user || state.connection.readyState === 'CONNECTING') {
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Build SSE URL
    const baseUrl = state.config.url || (import.meta.env.DEV 
      ? 'http://localhost:8081/sse' 
      : '/sse'
    );
    
    const url = new URL(baseUrl, window.location.origin);
    
    // Add authentication if user is available
    if (user && !user.isGuest) {
      url.searchParams.set('userId', user.id);
    }

    dispatch({ type: 'SSE_CONNECTING', payload: { url: url.toString() } });

    try {
      const eventSource = new EventSource(url.toString(), {
        withCredentials: state.config.withCredentials,
      });

      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[SSE] Connected to:', url.toString());
        dispatch({ 
          type: 'SSE_CONNECTED', 
          payload: { timestamp: new Date().toISOString() } 
        });
        
        notifyInfo('Connected', 'Real-time updates enabled');
      };

      eventSource.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        
        const errorMessage = eventSource.readyState === EventSource.CLOSED 
          ? 'Connection closed by server'
          : 'Connection error occurred';

        dispatch({ 
          type: 'SSE_ERROR', 
          payload: { error: errorMessage } 
        });

        // Handle reconnection
        if (state.config.autoReconnect && 
            state.connection.reconnectAttempts < state.config.maxReconnectAttempts) {
          
          const attempt = state.connection.reconnectAttempts + 1;
          const delay = Math.min(
            state.config.reconnectDelay * Math.pow(2, attempt - 1),
            30000 // Max 30 seconds
          );

          dispatch({ 
            type: 'SSE_RECONNECT_ATTEMPT', 
            payload: { attempt } 
          });

          console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${attempt})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          dispatch({ 
            type: 'SSE_DISCONNECTED', 
            payload: { error: errorMessage } 
          });
          
          notifyError('Connection Lost', 'Real-time updates disabled');
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            event: 'message',
            data: JSON.parse(event.data),
            timestamp: new Date().toISOString(),
          };
          
          handleSSEEvent(sseEvent);
        } catch (error) {
          console.error('[SSE] Failed to parse message event:', error);
        }
      };

      // Add custom event listeners for ADK events
      const adkEventTypes = [
        'agent.started', 'agent.stopped', 'agent.error',
        'research.started', 'research.progress', 'research.completed',
        'agent.message', 'timeline.event', 'system.status'
      ];

      adkEventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, (event) => {
          try {
            const sseEvent: SSEEvent = {
              id: (event as any).lastEventId,
              event: eventType,
              data: JSON.parse((event as any).data),
              timestamp: new Date().toISOString(),
            };
            
            handleSSEEvent(sseEvent);
          } catch (error) {
            console.error(`[SSE] Failed to parse ${eventType} event:`, error);
          }
        });
      });

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      dispatch({ 
        type: 'SSE_ERROR', 
        payload: { error: 'Failed to establish connection' } 
      });
      
      notifyError('Connection Failed', 'Could not connect to server');
    }
  }, [state.enabled, state.config, state.connection.reconnectAttempts, user, handleSSEEvent, notifyError, notifyInfo]);

  // Disconnect from SSE endpoint
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    dispatch({ type: 'SSE_DISCONNECTED', payload: {} });
  }, []);

  // Reconnect to SSE endpoint (manual)
  const reconnect = useCallback(() => {
    disconnect();
    // Reset reconnect attempts for manual reconnection
    dispatch({ type: 'SSE_RECONNECT_ATTEMPT', payload: { attempt: 0 } });
    connect();
  }, [disconnect, connect]);

  // Subscribe to event type
  const subscribe = useCallback((eventType: string, handler: (event: SSEEvent) => void) => {
    dispatch({ 
      type: 'SSE_HANDLER_ADD', 
      payload: { eventType, handler } 
    });

    // Return unsubscribe function
    return () => {
      dispatch({ 
        type: 'SSE_HANDLER_REMOVE', 
        payload: { eventType, handler } 
      });
    };
  }, []);

  // Unsubscribe from event type
  const unsubscribe = useCallback((eventType: string, handler: (event: SSEEvent) => void) => {
    dispatch({ 
      type: 'SSE_HANDLER_REMOVE', 
      payload: { eventType, handler } 
    });
  }, []);

  // Update SSE configuration
  const updateConfig = useCallback((config: Partial<SSEConfiguration>) => {
    dispatch({ 
      type: 'SSE_CONFIG_UPDATE', 
      payload: { config } 
    });
  }, []);

  // Enable/disable SSE
  const setEnabled = useCallback((enabled: boolean) => {
    dispatch({ 
      type: 'SSE_ENABLED_SET', 
      payload: { enabled } 
    });

    if (!enabled) {
      disconnect();
    } else if (user) {
      connect();
    }
  }, [disconnect, connect, user]);

  // Clear events buffer
  const clearEvents = useCallback(() => {
    dispatch({ type: 'SSE_EVENTS_CLEAR' });
  }, []);

  // Get events by type
  const getEventsByType = useCallback((eventType: string) => {
    return state.recentEvents.filter(event => event.event === eventType);
  }, [state.recentEvents]);

  // Auto-connect when user is authenticated and SSE is enabled
  useEffect(() => {
    if (user && !user.isGuest && state.enabled && state.connection.readyState === 'CLOSED') {
      connect();
    } else if ((!user || user.isGuest) && state.connection.readyState !== 'CLOSED') {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user, state.enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Memoize actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      connect,
      disconnect,
      reconnect,
      subscribe,
      unsubscribe,
      updateConfig,
      setEnabled,
      clearEvents,
      getEventsByType,
    }),
    [
      connect,
      disconnect,
      reconnect,
      subscribe,
      unsubscribe,
      updateConfig,
      setEnabled,
      clearEvents,
      getEventsByType,
    ]
  );

  return (
    <SSEStateContext.Provider value={state}>
      <SSEActionsContext.Provider value={actions}>
        {children}
      </SSEActionsContext.Provider>
    </SSEStateContext.Provider>
  );
}

/**
 * Hook to access SSE state
 */
export function useSSEState(): SSEState {
  const context = useContext(SSEStateContext);
  if (!context) {
    throw new Error('useSSEState must be used within an SSEProvider');
  }
  return context;
}

/**
 * Hook to access SSE actions
 */
export function useSSEActions(): Omit<SSEContextValue, keyof SSEState> {
  const context = useContext(SSEActionsContext);
  if (!context) {
    throw new Error('useSSEActions must be used within an SSEProvider');
  }
  return context;
}

/**
 * Hook to access both SSE state and actions
 */
export function useSSE(): SSEContextValue {
  const state = useSSEState();
  const actions = useSSEActions();
  
  return {
    ...state,
    ...actions,
  };
}

/**
 * Convenience hook for subscribing to specific event types
 */
export function useSSESubscription(
  eventType: string,
  handler: (event: SSEEvent) => void,
  deps: React.DependencyList = []
) {
  const { subscribe } = useSSEActions();
  
  useEffect(() => {
    const unsubscribe = subscribe(eventType, handler);
    return unsubscribe;
  }, [eventType, subscribe, ...deps]);
}

/**
 * Hook for subscribing to multiple event types
 */
export function useSSESubscriptions(
  subscriptions: Record<string, (event: SSEEvent) => void>,
  deps: React.DependencyList = []
) {
  const { subscribe } = useSSEActions();
  
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    
    Object.entries(subscriptions).forEach(([eventType, handler]) => {
      const unsubscribe = subscribe(eventType, handler);
      unsubscribers.push(unsubscribe);
    });
    
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe, ...deps]);
}