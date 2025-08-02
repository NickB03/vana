/**
 * SessionContext - Research session management for Vana
 * 
 * Handles ADK integration, WebSocket communication, and session state management.
 * Optimized for performance with split contexts and proper memoization.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  SessionState,
  SessionContextValue,
  SessionAction,
  ResearchSession,
  ResearchConfig,
  AgentMessage,
  TimelineEvent,
  ConnectionStatus,
  WebSocketMessage,
} from '@/types/session';
import { useAuthState } from './AuthContext';

// Initial session state
const initialSessionState: SessionState = {
  currentSession: null,
  sessions: [],
  isLoading: false,
  isProcessing: false,
  connection: {
    isConnected: false,
    reconnectAttempts: 0,
  },
  error: null,
};

// Session reducer
function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'SESSION_LOADING_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'SESSION_LOADING_END':
      return {
        ...state,
        isLoading: false,
      };

    case 'SESSION_PROCESSING_START':
      return {
        ...state,
        isProcessing: true,
        error: null,
      };

    case 'SESSION_PROCESSING_END':
      return {
        ...state,
        isProcessing: false,
      };

    case 'SESSION_CREATE_SUCCESS':
      return {
        ...state,
        isLoading: false,
        currentSession: action.payload.session,
        sessions: [action.payload.session, ...state.sessions],
        error: null,
      };

    case 'SESSION_LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        currentSession: action.payload.session,
        error: null,
      };

    case 'SESSION_UPDATE_SUCCESS':
      const updatedSession = action.payload.session;
      return {
        ...state,
        isLoading: false,
        currentSession: state.currentSession?.id === updatedSession.id ? updatedSession : state.currentSession,
        sessions: state.sessions.map(session =>
          session.id === updatedSession.id ? updatedSession : session
        ),
        error: null,
      };

    case 'SESSION_DELETE_SUCCESS':
      return {
        ...state,
        isLoading: false,
        currentSession: state.currentSession?.id === action.payload.sessionId ? null : state.currentSession,
        sessions: state.sessions.filter(session => session.id !== action.payload.sessionId),
        error: null,
      };

    case 'SESSION_MESSAGE_ADD':
      if (!state.currentSession) return state;
      
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          messages: [...state.currentSession.messages, action.payload.message],
          updatedAt: new Date().toISOString(),
        },
      };

    case 'SESSION_TIMELINE_UPDATE':
      if (!state.currentSession) return state;
      
      const existingEventIndex = state.currentSession.timeline.findIndex(
        event => event.id === action.payload.event.id
      );
      
      let updatedTimeline;
      if (existingEventIndex >= 0) {
        updatedTimeline = [...state.currentSession.timeline];
        updatedTimeline[existingEventIndex] = action.payload.event;
      } else {
        updatedTimeline = [...state.currentSession.timeline, action.payload.event];
      }
      
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          timeline: updatedTimeline,
          updatedAt: new Date().toISOString(),
        },
      };

    case 'SESSION_STATUS_UPDATE':
      if (!state.currentSession || state.currentSession.id !== action.payload.sessionId) {
        return state;
      }
      
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          status: action.payload.status,
          updatedAt: new Date().toISOString(),
          ...(action.payload.status === 'completed' && {
            completedAt: new Date().toISOString(),
          }),
        },
      };

    case 'SESSIONS_LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        sessions: action.payload.sessions,
        error: null,
      };

    case 'SESSION_ERROR':
      return {
        ...state,
        isLoading: false,
        isProcessing: false,
        error: action.payload.error,
      };

    case 'SESSION_ERROR_CLEAR':
      return {
        ...state,
        error: null,
      };

    case 'SESSION_CLEAR_CURRENT':
      return {
        ...state,
        currentSession: null,
      };

    case 'CONNECTION_STATUS_UPDATE':
      return {
        ...state,
        connection: action.payload.connection,
      };

    default:
      return state;
  }
}

// Create contexts (split for performance)
const SessionStateContext = createContext<SessionState | null>(null);
const SessionActionsContext = createContext<Omit<SessionContextValue, keyof SessionState> | null>(null);

/**
 * SessionProvider component
 */
interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const [state, dispatch] = useReducer(sessionReducer, initialSessionState);
  const { user } = useAuthState();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!user || state.connection.isConnected) return;

    try {
      // Use different URLs for development and production
      const wsUrl = import.meta.env.DEV 
        ? 'ws://localhost:8081/ws'
        : `wss://${window.location.host}/ws`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('[SessionContext] WebSocket connected');
        dispatch({
          type: 'CONNECTION_STATUS_UPDATE',
          payload: {
            connection: {
              isConnected: true,
              reconnectAttempts: 0,
            },
          },
        });

        // Start ping/pong for connection health
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('[SessionContext] Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('[SessionContext] WebSocket disconnected:', event.code, event.reason);
        
        dispatch({
          type: 'CONNECTION_STATUS_UPDATE',
          payload: {
            connection: {
              isConnected: false,
              reconnectAttempts: state.connection.reconnectAttempts + 1,
              lastError: event.reason || 'Connection closed',
            },
          },
        });

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt reconnection if not intentional disconnect
        if (event.code !== 1000 && state.connection.reconnectAttempts < 5) {
          const delay = Math.min(1000 * Math.pow(2, state.connection.reconnectAttempts), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('[SessionContext] WebSocket error:', error);
        dispatch({
          type: 'CONNECTION_STATUS_UPDATE',
          payload: {
            connection: {
              ...state.connection,
              lastError: 'Connection error',
            },
          },
        });
      };
    } catch (error) {
      console.error('[SessionContext] Failed to create WebSocket connection:', error);
      dispatch({
        type: 'SESSION_ERROR',
        payload: { error: 'Failed to connect to server' },
      });
    }
  }, [user, state.connection.isConnected, state.connection.reconnectAttempts]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'message':
        dispatch({
          type: 'SESSION_MESSAGE_ADD',
          payload: { message: message.payload as AgentMessage },
        });
        break;

      case 'timeline_event':
        dispatch({
          type: 'SESSION_TIMELINE_UPDATE',
          payload: { event: message.payload as TimelineEvent },
        });
        break;

      case 'status_change':
        if (message.sessionId) {
          dispatch({
            type: 'SESSION_STATUS_UPDATE',
            payload: {
              sessionId: message.sessionId,
              status: (message.payload as any).status,
            },
          });
        }
        break;

      case 'error':
        dispatch({
          type: 'SESSION_ERROR',
          payload: { error: (message.payload as any).message || 'Server error' },
        });
        break;

      default:
        console.log('[SessionContext] Unknown message type:', message.type);
    }
  }, []);

  // Initialize WebSocket connection when user is authenticated
  useEffect(() => {
    if (user && !user.isGuest) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [user, connectWebSocket]);

  // Load user sessions when authenticated
  useEffect(() => {
    if (user && !state.sessions.length) {
      refreshSessions();
    }
  }, [user]);

  // Session actions
  const createSession = useCallback(async (config: ResearchConfig): Promise<ResearchSession> => {
    if (!user) throw new Error('User must be authenticated');

    dispatch({ type: 'SESSION_LOADING_START' });

    try {
      // TODO: Replace with actual API call
      const session: ResearchSession = {
        id: `session_${Date.now()}`,
        userId: user.id,
        title: config.topic,
        config,
        status: 'draft',
        messages: [],
        timeline: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      dispatch({ type: 'SESSION_CREATE_SUCCESS', payload: { session } });
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      dispatch({ type: 'SESSION_ERROR', payload: { error: errorMessage } });
      throw error;
    }
  }, [user]);

  const loadSession = useCallback(async (sessionId: string) => {
    dispatch({ type: 'SESSION_LOADING_START' });

    try {
      // TODO: Replace with actual API call
      const existingSession = state.sessions.find(s => s.id === sessionId);
      if (!existingSession) {
        throw new Error('Session not found');
      }

      dispatch({ type: 'SESSION_LOAD_SUCCESS', payload: { session: existingSession } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load session';
      dispatch({ type: 'SESSION_ERROR', payload: { error: errorMessage } });
    }
  }, [state.sessions]);

  const updateSession = useCallback(async (sessionId: string, updates: Partial<ResearchSession>) => {
    dispatch({ type: 'SESSION_LOADING_START' });

    try {
      const existingSession = state.sessions.find(s => s.id === sessionId);
      if (!existingSession) {
        throw new Error('Session not found');
      }

      const updatedSession: ResearchSession = {
        ...existingSession,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));

      dispatch({ type: 'SESSION_UPDATE_SUCCESS', payload: { session: updatedSession } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update session';
      dispatch({ type: 'SESSION_ERROR', payload: { error: errorMessage } });
    }
  }, [state.sessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    dispatch({ type: 'SESSION_LOADING_START' });

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));

      dispatch({ type: 'SESSION_DELETE_SUCCESS', payload: { sessionId } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete session';
      dispatch({ type: 'SESSION_ERROR', payload: { error: errorMessage } });
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!state.currentSession) throw new Error('No active session');

    dispatch({ type: 'SESSION_PROCESSING_START' });

    try {
      const message: AgentMessage = {
        id: `msg_${Date.now()}`,
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
      };

      // Send via WebSocket if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'user_message',
          sessionId: state.currentSession.id,
          payload: message,
        }));
      }

      dispatch({ type: 'SESSION_MESSAGE_ADD', payload: { message } });
      dispatch({ type: 'SESSION_PROCESSING_END' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      dispatch({ type: 'SESSION_ERROR', payload: { error: errorMessage } });
    }
  }, [state.currentSession]);

  const startResearch = useCallback(async () => {
    if (!state.currentSession) throw new Error('No active session');

    dispatch({ type: 'SESSION_PROCESSING_START' });

    try {
      // Send start research command via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'start_research',
          sessionId: state.currentSession.id,
          payload: state.currentSession.config,
        }));
      }

      dispatch({
        type: 'SESSION_STATUS_UPDATE',
        payload: {
          sessionId: state.currentSession.id,
          status: 'planning',
        },
      });

      dispatch({ type: 'SESSION_PROCESSING_END' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start research';
      dispatch({ type: 'SESSION_ERROR', payload: { error: errorMessage } });
    }
  }, [state.currentSession]);

  const stopResearch = useCallback(async () => {
    if (!state.currentSession) return;

    try {
      // Send stop research command via WebSocket
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'stop_research',
          sessionId: state.currentSession.id,
        }));
      }

      dispatch({ type: 'SESSION_PROCESSING_END' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop research';
      dispatch({ type: 'SESSION_ERROR', payload: { error: errorMessage } });
    }
  }, [state.currentSession]);

  const clearError = useCallback(() => {
    dispatch({ type: 'SESSION_ERROR_CLEAR' });
  }, []);

  const refreshSessions = useCallback(async () => {
    if (!user) return;

    dispatch({ type: 'SESSION_LOADING_START' });

    try {
      // TODO: Replace with actual API call
      const sessions: ResearchSession[] = [];

      dispatch({ type: 'SESSIONS_LOAD_SUCCESS', payload: { sessions } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load sessions';
      dispatch({ type: 'SESSION_ERROR', payload: { error: errorMessage } });
    }
  }, [user]);

  const clearCurrentSession = useCallback(() => {
    dispatch({ type: 'SESSION_CLEAR_CURRENT' });
  }, []);

  // Memoize actions to prevent unnecessary re-renders
  const actions = useMemo(
    () => ({
      createSession,
      loadSession,
      updateSession,
      deleteSession,
      sendMessage,
      startResearch,
      stopResearch,
      clearError,
      refreshSessions,
      clearCurrentSession,
    }),
    [
      createSession,
      loadSession,
      updateSession,
      deleteSession,
      sendMessage,
      startResearch,
      stopResearch,
      clearError,
      refreshSessions,
      clearCurrentSession,
    ]
  );

  return (
    <SessionStateContext.Provider value={state}>
      <SessionActionsContext.Provider value={actions}>
        {children}
      </SessionActionsContext.Provider>
    </SessionStateContext.Provider>
  );
}

/**
 * Hook to access session state
 */
export function useSessionState(): SessionState {
  const context = useContext(SessionStateContext);
  if (!context) {
    throw new Error('useSessionState must be used within a SessionProvider');
  }
  return context;
}

/**
 * Hook to access session actions
 */
export function useSessionActions(): Omit<SessionContextValue, keyof SessionState> {
  const context = useContext(SessionActionsContext);
  if (!context) {
    throw new Error('useSessionActions must be used within a SessionProvider');
  }
  return context;
}

/**
 * Hook to access both session state and actions
 */
export function useSession(): SessionContextValue {
  const state = useSessionState();
  const actions = useSessionActions();
  
  return {
    ...state,
    ...actions,
  };
}