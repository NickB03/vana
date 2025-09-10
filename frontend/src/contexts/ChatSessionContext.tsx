"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useSSEClient, useAgentNetwork, useResearchResults } from '../../hooks/useSSEClient';
import { apiClient } from '../lib/api-client';
import { 
  ChatSession, 
  ResearchQuery, 
  AgentResponse, 
  ResearchResult, 
  CreateResearchQueryRequest,
  ChatState 
} from '../types/chat';

// ===== CONTEXT TYPES =====

interface SendQueryOptions {
  queryId?: string;
  sessionId?: string;
  appId?: string;
  userId?: string;
  type?: string;
  parameters?: Record<string, string | number | boolean>;
}

interface AdkAgentEvent {
  type: 'agent_started' | 'agent_completed' | 'agent_progress' | 'result_generated' | 'processing_complete' | 'error';
  sessionId: string;
  agentId?: string;
  agentType?: string;
  content?: string;
  resultId?: string;
  summary?: string;
  qualityScore?: number;
  wordCount?: number;
  readingTimeMinutes?: number;
  message?: string;
  timestamp: string;
  data?: any;
}

interface ChatSessionContextValue {
  // State
  state: ChatState;
  
  // Session Management
  currentSession: ChatSession | null;
  createSession: (title?: string) => Promise<ChatSession>;
  loadSession: (sessionId: string) => Promise<void>;
  archiveSession: (sessionId: string) => Promise<void>;
  
  // Query Management
  submitQuery: (request: CreateResearchQueryRequest) => Promise<void>;
  cancelQuery: (queryId?: string) => Promise<void>;
  
  // Real-time Updates via Google ADK SSE
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
  events: any[];
  agents: any[];
  results: any[];
  
  // Utility Functions
  clearEvents: () => void;
  reconnectSSE: () => void;
  connectSSE: () => void;
  disconnectSSE: () => void;
}

// ===== STATE MANAGEMENT =====

type ChatAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_SESSION'; payload: ChatSession | null }
  | { type: 'SET_SESSIONS'; payload: ChatSession[] }
  | { type: 'ADD_SESSION'; payload: ChatSession }
  | { type: 'UPDATE_SESSION'; payload: ChatSession }
  | { type: 'SET_CURRENT_QUERY'; payload: ResearchQuery | null }
  | { type: 'ADD_QUERY'; payload: ResearchQuery }
  | { type: 'ADD_RESPONSE'; payload: AgentResponse }
  | { type: 'ADD_RESULT'; payload: ResearchResult }
  | { type: 'CLEAR_EVENTS' };

const initialState: ChatState = {
  currentSession: null,
  sessions: [],
  currentQuery: null,
  queries: [],
  responses: [],
  results: [],
  progressUpdates: [],
  isLoading: false,
  error: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
      
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };
      
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
      
    case 'ADD_SESSION':
      return { 
        ...state, 
        sessions: [...state.sessions, action.payload],
        currentSession: action.payload
      };
      
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.payload.id ? action.payload : s),
        currentSession: state.currentSession?.id === action.payload.id ? action.payload : state.currentSession
      };
      
    case 'SET_CURRENT_QUERY':
      return { ...state, currentQuery: action.payload };
      
    case 'ADD_QUERY':
      return { 
        ...state, 
        queries: [...state.queries, action.payload],
        currentQuery: action.payload
      };
      
    case 'ADD_RESPONSE':
      return { 
        ...state, 
        responses: [...state.responses, action.payload]
      };
      
    case 'ADD_RESULT':
      return { 
        ...state, 
        results: [...state.results, action.payload]
      };
      
    case 'CLEAR_EVENTS':
      return { ...state, progressUpdates: [] };
      
    default:
      return state;
  }
}

// ===== CONTEXT CREATION =====

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

// ===== PROVIDER COMPONENT =====

interface ChatSessionProviderProps {
  children: ReactNode;
  initialSessionId?: string;
  autoConnect?: boolean;
}

export function ChatSessionProvider({ 
  children, 
  initialSessionId,
  autoConnect = true 
}: ChatSessionProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const initializedRef = useRef(false);

  // Initialize Google ADK SSE connection
  const sessionId = state.currentSession?.id || 'temp-session';
  
  const {
    isConnected,
    connectionStatus,
    events,
    connect,
    disconnect,
    reconnect,
    clearEvents: clearSSEEvents,
    on,
    off
  } = useSSEClient({ 
    sessionId,
    autoReconnect: true,
    maxRetries: 5,
    maxRetryDelay: 1000
  });
  
  // Use specialized hooks for agent monitoring
  const { agents } = useAgentNetwork(sessionId);
  const { results } = useResearchResults(sessionId);
  
  const sendQuery = useCallback(async (query: string, options?: SendQueryOptions) => {
    console.log('Sending query to Google ADK backend:', query, options);
    
    try {
      // Use the Google ADK API endpoint for research
      const result = await apiClient.startAdkResearch(query, options?.sessionId || sessionId, {
        type: options?.type || 'research',
        priority: 'medium',
        maxDuration: 300,
        outputFormat: 'structured'
      });
      
      console.log('Query sent successfully to Google ADK:', result);
      return result;
    } catch (error) {
      console.error('Failed to send query to Google ADK backend:', error);
      throw error;
    }
  }, [sessionId]);

  // Handle Google ADK events through SSE
  useEffect(() => {
    const handleAgentEvent = (event: any) => {
      console.log('Received Google ADK agent event:', event);
      
      switch (event.type) {
        case 'agent_started':
          dispatch({ type: 'SET_LOADING', payload: true });
          break;
          
        case 'agent_completed':
          if (event.data && event.content) {
            const response: AgentResponse = {
              id: `${event.agentId}-${Date.now()}`,
              queryId: state.currentQuery?.id || 'unknown',
              agentId: event.agentId,
              agentType: event.agentType || 'section_researcher',
              content: event.content,
              status: 'completed',
              confidence: event.data?.confidence || 0.8,
              sources: event.data?.sources || [],
              createdAt: new Date(event.timestamp),
              processingTimeMs: event.data?.processingTimeMs || 0,
              tokens: {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: event.data?.tokensUsed || 0,
                cost: 0
              },
              metadata: {
                model: 'gemini-2.5-pro',
                temperature: 0.7,
                maxTokens: 4000
              }
            };
            dispatch({ type: 'ADD_RESPONSE', payload: response });
          }
          break;
          
        case 'result_generated':
          if (event.resultId && event.summary) {
            const result: ResearchResult = {
              id: event.resultId,
              queryId: state.currentQuery?.id || 'unknown',
              title: 'Research Result',
              summary: event.summary,
              content: {
                sections: event.data?.sections || [],
                keyFindings: event.data?.keyFindings || [],
                recommendations: event.data?.recommendations || [],
                limitations: event.data?.limitations || [],
                methodology: 'Multi-agent research approach'
              },
              status: 'completed',
              quality: {
                overallScore: event.qualityScore || 0.85,
                completeness: 0.9,
                accuracy: 0.85,
                relevance: 0.9,
                sourceQuality: 0.8,
                coherence: 0.85
              },
              citations: event.data?.citations || [],
              generatedAt: new Date(event.timestamp),
              wordCount: event.wordCount || 0,
              readingTimeMinutes: event.readingTimeMinutes || 0,
              format: {
                structure: 'business',
                includeCharts: false,
                includeTables: false,
                citationStyle: 'APA'
              }
            };
            dispatch({ type: 'ADD_RESULT', payload: result });
          }
          break;
          
        case 'processing_complete':
          dispatch({ type: 'SET_LOADING', payload: false });
          break;
          
        case 'error':
          dispatch({ type: 'SET_ERROR', payload: event.message || 'Processing error occurred' });
          dispatch({ type: 'SET_LOADING', payload: false });
          break;
      }
    };
    
    const handleResultEvent = (event: any) => {
      console.log('Received Google ADK result event:', event);
      // Handle result events from useResearchResults hook
    };
    
    // Register event handlers
    on('onAgent', handleAgentEvent);
    on('onResult', handleResultEvent);
    
    return () => {
      off('onAgent');
      off('onResult');
    };
  }, [on, off, state.currentQuery?.id]);

  // Session Management with Google ADK
  const createSession = useCallback(async (title?: string): Promise<ChatSession> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      console.log('Creating Google ADK session...');
      
      // Create session via Google ADK API
      const adkSession = await apiClient.createAdkSession('vana', 'current');
      console.log('Google ADK session created:', adkSession);
      
      const session: ChatSession = {
        id: adkSession.session_id,
        title: title || 'New Research Session',
        userId: 'current',
        createdAt: new Date(adkSession.created_at),
        updatedAt: new Date(),
        status: adkSession.status === 'active' ? 'active' : 'archived',
        messageCount: 0,
        settings: {
          theme: 'system',
          autoScroll: true,
          notifications: true,
          streamingEnabled: true
        },
        metadata: {
          userAgent: navigator.userAgent,
          lastIpAddress: '127.0.0.1',
          researchContext: undefined,
          agentPreferences: []
        }
      };
      
      dispatch({ type: 'ADD_SESSION', payload: session });
      console.log('Session created and ready for SSE connection:', session.id);
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create Google ADK session';
      console.error('Session creation failed:', errorMessage);
      
      // For development: Don't throw error, just set error state and continue
      if (process.env.NODE_ENV === 'development') {
        dispatch({ type: 'SET_ERROR', payload: `Backend unavailable: ${errorMessage}` });
        console.warn('Development mode: Creating mock session due to backend unavailability');
        // Return a mock session for development
        const mockSession: ChatSession = {
          id: `mock-session-${Date.now()}`,
          title: title || 'Demo Session (Backend Offline)',
          userId: 'demo-user',
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active',
          messageCount: 0,
          settings: {
            theme: 'system',
            autoScroll: true,
            soundEnabled: false
          }
        };
        dispatch({ type: 'ADD_SESSION', payload: mockSession });
        dispatch({ type: 'SET_CURRENT_SESSION', payload: mockSession });
        return mockSession;
      }
      
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // In a real app, this would fetch from an API
      const session = state.sessions.find(s => s.id === sessionId);
      if (session) {
        dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
      } else {
        throw new Error(`Session ${sessionId} not found`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load session';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.sessions]);

  const archiveSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const session = state.sessions.find(s => s.id === sessionId);
      if (session) {
        const archivedSession = { ...session, status: 'archived' as const };
        dispatch({ type: 'UPDATE_SESSION', payload: archivedSession });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to archive session';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, [state.sessions]);

  // Query Management
  const submitQuery = useCallback(async (request: CreateResearchQueryRequest): Promise<void> => {
    if (!state.currentSession) {
      throw new Error('No active session. Please create a session first.');
    }
    
    // Allow submission even if not fully connected - connection will be established during query
    // This prevents blocking the user when the connection is initializing
    if (connectionStatus === 'error') {
      console.warn('Connection in error state, attempting to reconnect...');
      reconnect();
      // Don't throw error, allow the query to proceed
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const query: ResearchQuery = {
        id: `query-${Date.now()}`,
        sessionId: state.currentSession.id,
        content: request.content,
        type: request.type,
        priority: request.priority || 'medium',
        createdAt: new Date(),
        processedAt: undefined,
        estimatedDuration: request.parameters?.maxDuration,
        attachments: request.attachments?.map((file, index) => ({
          id: `attachment-${index}`,
          filename: file.name,
          contentType: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          metadata: {}
        })) || [],
        parameters: {
          maxDuration: request.parameters?.maxDuration || 300,
          agentSelection: request.parameters?.agentSelection || [],
          outputFormat: request.parameters?.outputFormat || 'structured',
          detailLevel: request.parameters?.detailLevel || 'detailed',
          sourcesRequired: request.parameters?.sourcesRequired ?? true
        }
      };

      dispatch({ type: 'ADD_QUERY', payload: query });

      // Send query via SSE
      await sendQuery(request.content, {
        queryId: query.id,
        sessionId: state.currentSession.id,
        type: request.type,
        parameters: query.parameters as unknown as Record<string, string | number | boolean>
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit query';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  }, [state.currentSession, connectionStatus, sendQuery, reconnect]);

  const cancelQuery = useCallback(async (queryId?: string): Promise<void> => {
    try {
      // In a real app, this would send a cancellation request to the backend
      if (queryId) {
        console.log(`Cancelling query: ${queryId}`);
      }
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_CURRENT_QUERY', payload: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel query';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  const clearEvents = useCallback(() => {
    clearSSEEvents();
    dispatch({ type: 'CLEAR_EVENTS' });
  }, [clearSSEEvents]);

  // Auto-create initial session (only once)
  useEffect(() => {
    if (!initializedRef.current && !state.currentSession && !state.isLoading) {
      initializedRef.current = true;
      if (initialSessionId) {
        loadSession(initialSessionId);
      } else {
        createSession();
      }
    }
  }, [state.currentSession, state.isLoading, initialSessionId, createSession, loadSession]);

  // Auto-connect Google ADK SSE when session is ready
  useEffect(() => {
    if (autoConnect && state.currentSession && connectionStatus === 'disconnected') {
      console.log('Auto-connecting to Google ADK SSE for session:', state.currentSession.id);
      connect();
    }
  }, [autoConnect, state.currentSession, connectionStatus, connect]);

  const value: ChatSessionContextValue = {
    state,
    currentSession: state.currentSession,
    createSession,
    loadSession,
    archiveSession,
    submitQuery,
    cancelQuery,
    connectionStatus: connectionStatus === 'circuit-open' ? 'error' : connectionStatus,
    events,
    agents,
    results,
    clearEvents,
    reconnectSSE: reconnect,
    connectSSE: connect,
    disconnectSSE: disconnect,
  };

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
}

// ===== HOOK FOR CONSUMING CONTEXT =====

export function useChatSession() {
  const context = useContext(ChatSessionContext);
  if (!context) {
    throw new Error('useChatSession must be used within a ChatSessionProvider');
  }
  return context;
}

export default ChatSessionContext;