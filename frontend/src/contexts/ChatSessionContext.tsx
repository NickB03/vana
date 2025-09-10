"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode, useRef } from 'react';
import { useSSEClient } from '../hooks/useSSEClient';
import { 
  ChatSession, 
  ResearchQuery, 
  AgentResponse, 
  ResearchResult, 
  CreateResearchQueryRequest,
  ChatState 
} from '../types/chat';

// ===== CONTEXT TYPES =====

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
  
  // Real-time Updates
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
  // Simplified - no events array
  
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

  // Initialize simplified SSE connection
  const {
    connectionState,
    isConnected,
    connect,
    disconnect
  } = useSSEClient();
  
  // Add placeholder functions that don't exist in simple client
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [disconnect, connect]);
  
  const sendQuery = useCallback(async (query: string, options?: Record<string, any>) => {
    console.log('Sending query to backend:', query, options);
    
    try {
      // Send POST request to backend SSE endpoint
      const response = await fetch('http://localhost:8000/run_sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          app_name: options?.appId || 'vana',
          new_message: {
            parts: [{ text: query }],
            role: 'user'
          },
          user_id: options?.userId || 'default-user',
          session_id: options?.sessionId || 'default-session',
          streaming: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('Query sent successfully to backend');
      return response;
    } catch (error) {
      console.error('Failed to send query to backend:', error);
      throw error;
    }
  }, []);

  // Simplified SSE handling
  function handleSSEEvent(event: SSEEvent) {
    console.log('Received SSE event:', event);
    
    switch (event.event) {
      case 'query_received':
        // Query was received and queued
        break;
        
      case 'processing_started':
        // Research processing began
        dispatch({ type: 'SET_LOADING', payload: true });
        break;
        
      case 'agent_started':
        // Specific agent started working
        break;
        
      case 'agent_completed':
        // Specific agent finished
        if (event.data.success && event.data.resultSummary) {
          const response: AgentResponse = {
            id: `${event.data.agentId}-${Date.now()}`,
            queryId: event.data.queryId,
            agentId: event.data.agentId,
            agentType: event.data.agentId.includes('leader') ? 'team_leader' : 'section_researcher',
            content: event.data.resultSummary,
            status: 'completed',
            confidence: event.data.confidence || 0.8,
            sources: [],
            createdAt: new Date(),
            processingTimeMs: event.data.processingTimeMs || 0,
            tokens: {
              inputTokens: 0,
              outputTokens: 0,
              totalTokens: event.data.tokensUsed || 0,
              cost: 0
            },
            metadata: {
              model: 'gemini-2.0-flash-exp',
              temperature: 0.7,
              maxTokens: 4000
            }
          };
          dispatch({ type: 'ADD_RESPONSE', payload: response });
        }
        break;
        
      case 'result_generated':
        // Final result is ready
        const result: ResearchResult = {
          id: event.data.resultId,
          queryId: event.data.queryId,
          title: 'Research Result',
          summary: event.data.summary || 'Research completed successfully',
          content: {
            sections: [],
            keyFindings: [],
            recommendations: [],
            limitations: [],
            methodology: 'Multi-agent research approach'
          },
          status: 'completed',
          quality: {
            overallScore: event.data.qualityScore || 0.85,
            completeness: 0.9,
            accuracy: 0.85,
            relevance: 0.9,
            sourceQuality: 0.8,
            coherence: 0.85
          },
          citations: [],
          generatedAt: new Date(),
          wordCount: event.data.wordCount || 0,
          readingTimeMinutes: event.data.readingTimeMinutes || 0,
          format: {
            structure: 'business',
            includeCharts: false,
            includeTables: false,
            citationStyle: 'APA'
          }
        };
        dispatch({ type: 'ADD_RESULT', payload: result });
        break;
        
      case 'processing_complete':
        // All processing finished
        dispatch({ type: 'SET_LOADING', payload: false });
        break;
        
      case 'error_occurred':
        // Error in processing
        dispatch({ type: 'SET_ERROR', payload: event.data.message });
        dispatch({ type: 'SET_LOADING', payload: false });
        break;
    }
  }

  // Session Management
  const createSession = useCallback(async (title?: string): Promise<ChatSession> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Create session with backend first
      const backendResponse = await fetch('http://localhost:8000/apps/vana/users/default-user/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });
      
      if (!backendResponse.ok) {
        throw new Error(`Failed to create backend session: ${backendResponse.statusText}`);
      }
      
      const backendSession = await backendResponse.json();
      
      const session: ChatSession = {
        id: backendSession.id, // Use backend session ID
        title: title || 'New Research Session',
        userId: 'default-user',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
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
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
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
    if (connectionState.status === 'error') {
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
        parameters: query.parameters
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit query';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  }, [state.currentSession, connectionState.status, sendQuery]);

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
    // clearSSEEvents(); // Not available in simple client
    dispatch({ type: 'CLEAR_EVENTS' });
  }, []);  // No clearSSEEvents dependency

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

  // Auto-connect SSE if enabled
  useEffect(() => {
    if (autoConnect && connectionState.status === 'disconnected') {
      console.log('Auto-connecting to SSE...');
      connect();
    }
  }, [autoConnect, connectionState.status, connect]);

  const value: ChatSessionContextValue = {
    state,
    currentSession: state.currentSession,
    createSession,
    loadSession,
    archiveSession,
    submitQuery,
    cancelQuery,
    connectionStatus: connectionState.status,
    // events: [], // Not available in simple client
    // lastEvent: null, // Not available in simple client
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