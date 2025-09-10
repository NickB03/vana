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
  ChatState,
  ResponseSource
} from '../types/chat';
import { googleAdkEventProcessor, ProcessedEvent, AgentProgressUpdate } from '../utils/eventProcessor';
import { googleAdkAgentMapper } from '../utils/agentMapper';
import { researchSourceHandler, ProcessedSource } from '../utils/sourceHandler';
import { progressCalculator, ProgressCalculation, ProgressContext, ResearchPhase } from '../utils/progressCalculator';
import { researchResultFormatter, FormattedResult } from '../utils/resultFormatter';

// ===== ENHANCED CONTEXT TYPES =====

interface SendQueryOptions {
  queryId?: string;
  sessionId?: string;
  appId?: string;
  userId?: string;
  type?: string;
  parameters?: Record<string, string | number | boolean>;
}

interface EnhancedChatSessionContextValue {
  // Base State
  state: EnhancedChatState;
  
  // Session Management
  currentSession: ChatSession | null;
  createSession: (title?: string) => Promise<ChatSession>;
  loadSession: (sessionId: string) => Promise<void>;
  archiveSession: (sessionId: string) => Promise<void>;
  
  // Query Management
  submitQuery: (request: CreateResearchQueryRequest) => Promise<void>;
  cancelQuery: (queryId?: string) => Promise<void>;
  
  // Real-time Updates via Google ADK SSE with Enhanced Processing
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
  events: ProcessedEvent[];
  agents: AgentProgressUpdate[];
  sources: ProcessedSource[];
  results: FormattedResult[];
  
  // Enhanced Progress Tracking
  progressMetrics: ProgressCalculation | null;
  currentPhase: ResearchPhase;
  overallProgress: number;
  estimatedTimeRemaining: number;
  
  // Event Processing Control
  processedEventCount: number;
  eventProcessingErrors: string[];
  
  // Utility Functions
  clearEvents: () => void;
  reconnectSSE: () => void;
  connectSSE: () => void;
  disconnectSSE: () => void;
  resetEventProcessors: () => void;
  getSourceStatistics: () => any;
  getAgentMetrics: () => any;
}

interface EnhancedChatState extends ChatState {
  // Enhanced properties
  processedEvents: ProcessedEvent[];
  agentUpdates: AgentProgressUpdate[];
  discoveredSources: ProcessedSource[];
  formattedResults: FormattedResult[];
  progressCalculation: ProgressCalculation | null;
  eventProcessingStats: {
    totalProcessed: number;
    successfullyProcessed: number;
    errors: number;
    lastProcessedAt: Date | null;
  };
  researchMetrics: {
    startTime: Date | null;
    queryComplexity: 'simple' | 'moderate' | 'complex' | 'expert';
    researchType: 'factual' | 'analytical' | 'comparative' | 'comprehensive';
    currentPhase: ResearchPhase;
    phaseTransitions: Array<{
      from: ResearchPhase;
      to: ResearchPhase;
      timestamp: Date;
    }>;
  };
}

// ===== ENHANCED STATE MANAGEMENT =====

type EnhancedChatAction = 
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
  | { type: 'ADD_PROCESSED_EVENT'; payload: ProcessedEvent }
  | { type: 'ADD_AGENT_UPDATE'; payload: AgentProgressUpdate }
  | { type: 'ADD_SOURCE'; payload: ProcessedSource }
  | { type: 'ADD_FORMATTED_RESULT'; payload: FormattedResult }
  | { type: 'UPDATE_PROGRESS_CALCULATION'; payload: ProgressCalculation }
  | { type: 'UPDATE_RESEARCH_PHASE'; payload: ResearchPhase }
  | { type: 'UPDATE_EVENT_PROCESSING_STATS'; payload: Partial<EnhancedChatState['eventProcessingStats']> }
  | { type: 'CLEAR_EVENTS' }
  | { type: 'RESET_PROCESSORS' };

const initialEnhancedState: EnhancedChatState = {
  // Base state
  currentSession: null,
  sessions: [],
  currentQuery: null,
  queries: [],
  responses: [],
  results: [],
  progressUpdates: [],
  isLoading: false,
  error: null,
  
  // Enhanced state
  processedEvents: [],
  agentUpdates: [],
  discoveredSources: [],
  formattedResults: [],
  progressCalculation: null,
  eventProcessingStats: {
    totalProcessed: 0,
    successfullyProcessed: 0,
    errors: 0,
    lastProcessedAt: null
  },
  researchMetrics: {
    startTime: null,
    queryComplexity: 'moderate',
    researchType: 'comprehensive',
    currentPhase: 'initialization',
    phaseTransitions: []
  }
};

function enhancedChatReducer(state: EnhancedChatState, action: EnhancedChatAction): EnhancedChatState {
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
        currentQuery: action.payload,
        researchMetrics: {
          ...state.researchMetrics,
          startTime: new Date(),
          currentPhase: 'initialization'
        }
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

    case 'ADD_PROCESSED_EVENT':
      return {
        ...state,
        processedEvents: [...state.processedEvents.slice(-99), action.payload], // Keep last 100 events
        eventProcessingStats: {
          ...state.eventProcessingStats,
          totalProcessed: state.eventProcessingStats.totalProcessed + 1,
          successfullyProcessed: action.payload.processed ? 
            state.eventProcessingStats.successfullyProcessed + 1 : 
            state.eventProcessingStats.successfullyProcessed,
          errors: action.payload.errors?.length ? 
            state.eventProcessingStats.errors + 1 : 
            state.eventProcessingStats.errors,
          lastProcessedAt: new Date()
        }
      };

    case 'ADD_AGENT_UPDATE':
      return {
        ...state,
        agentUpdates: state.agentUpdates.some(a => a.agentId === action.payload.agentId) ?
          state.agentUpdates.map(a => a.agentId === action.payload.agentId ? action.payload : a) :
          [...state.agentUpdates, action.payload]
      };

    case 'ADD_SOURCE':
      return {
        ...state,
        discoveredSources: state.discoveredSources.some(s => s.id === action.payload.id) ?
          state.discoveredSources.map(s => s.id === action.payload.id ? action.payload : s) :
          [...state.discoveredSources, action.payload]
      };

    case 'ADD_FORMATTED_RESULT':
      return {
        ...state,
        formattedResults: [...state.formattedResults, action.payload]
      };

    case 'UPDATE_PROGRESS_CALCULATION':
      return {
        ...state,
        progressCalculation: action.payload
      };

    case 'UPDATE_RESEARCH_PHASE':
      const newPhase = action.payload;
      const currentPhase = state.researchMetrics.currentPhase;
      
      return {
        ...state,
        researchMetrics: {
          ...state.researchMetrics,
          currentPhase: newPhase,
          phaseTransitions: newPhase !== currentPhase ? [
            ...state.researchMetrics.phaseTransitions.slice(-9), // Keep last 10 transitions
            { from: currentPhase, to: newPhase, timestamp: new Date() }
          ] : state.researchMetrics.phaseTransitions
        }
      };

    case 'UPDATE_EVENT_PROCESSING_STATS':
      return {
        ...state,
        eventProcessingStats: {
          ...state.eventProcessingStats,
          ...action.payload
        }
      };
      
    case 'CLEAR_EVENTS':
      return { 
        ...state, 
        processedEvents: [],
        eventProcessingStats: {
          ...state.eventProcessingStats,
          totalProcessed: 0,
          successfullyProcessed: 0,
          errors: 0
        }
      };

    case 'RESET_PROCESSORS':
      return {
        ...state,
        processedEvents: [],
        agentUpdates: [],
        discoveredSources: [],
        formattedResults: [],
        progressCalculation: null,
        eventProcessingStats: initialEnhancedState.eventProcessingStats
      };
      
    default:
      return state;
  }
}

// ===== ENHANCED CONTEXT CREATION =====

const EnhancedChatSessionContext = createContext<EnhancedChatSessionContextValue | null>(null);

// ===== ENHANCED PROVIDER COMPONENT =====

interface EnhancedChatSessionProviderProps {
  children: ReactNode;
  initialSessionId?: string;
  autoConnect?: boolean;
  queryComplexity?: 'simple' | 'moderate' | 'complex' | 'expert';
  researchType?: 'factual' | 'analytical' | 'comparative' | 'comprehensive';
}

export function EnhancedChatSessionProvider({ 
  children, 
  initialSessionId,
  autoConnect = true,
  queryComplexity = 'moderate',
  researchType = 'comprehensive'
}: EnhancedChatSessionProviderProps) {
  const [state, dispatch] = useReducer(enhancedChatReducer, {
    ...initialEnhancedState,
    researchMetrics: {
      ...initialEnhancedState.researchMetrics,
      queryComplexity,
      researchType
    }
  });
  
  const initializedRef = useRef(false);
  const eventProcessorRef = useRef(googleAdkEventProcessor);
  const sourceHandlerRef = useRef(researchSourceHandler);
  const resultFormatterRef = useRef(researchResultFormatter);

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

  // ===== ENHANCED EVENT PROCESSING =====

  const processRawEvent = useCallback((rawEvent: any) => {
    try {
      const processedEvents = eventProcessorRef.current.processEvent({
        event: rawEvent.event || rawEvent.type,
        data: rawEvent.data || rawEvent,
        id: rawEvent.id,
        timestamp: rawEvent.timestamp
      });

      for (const processedEvent of processedEvents) {
        dispatch({ type: 'ADD_PROCESSED_EVENT', payload: processedEvent });

        // Handle specific event types
        switch (processedEvent.type) {
          case 'agent_progress_update':
            dispatch({ type: 'ADD_AGENT_UPDATE', payload: processedEvent.data as AgentProgressUpdate });
            break;

          case 'research_source_discovered':
            const sourceData = sourceHandlerRef.current.addSource({
              id: processedEvent.data.id,
              url: processedEvent.data.url,
              title: processedEvent.data.title,
              excerpt: processedEvent.data.excerpt,
              relevance: processedEvent.data.relevanceScore,
              credibility: processedEvent.data.credibilityScore,
              accessedAt: processedEvent.data.accessedAt?.toISOString(),
              agentId: processedEvent.data.agentId
            });
            dispatch({ type: 'ADD_SOURCE', payload: sourceData });
            break;

          case 'research_result_ready':
            const formattedResult = resultFormatterRef.current.formatResult({
              resultId: processedEvent.data.id,
              queryId: processedEvent.data.queryId,
              title: processedEvent.data.title,
              summary: processedEvent.data.summary,
              content: processedEvent.data.content,
              citations: processedEvent.data.citations,
              qualityMetrics: processedEvent.data.quality,
              wordCount: processedEvent.data.wordCount,
              readingTimeMinutes: processedEvent.data.readingTimeMinutes,
              timestamp: processedEvent.data.generatedAt?.toISOString()
            });
            dispatch({ type: 'ADD_FORMATTED_RESULT', payload: formattedResult });
            break;

          case 'research_processing_complete':
            dispatch({ type: 'UPDATE_RESEARCH_PHASE', payload: 'completed' });
            dispatch({ type: 'SET_LOADING', payload: false });
            break;

          case 'research_error_occurred':
            dispatch({ type: 'SET_ERROR', payload: processedEvent.data.details || 'Processing error occurred' });
            break;
        }
      }

      // Calculate progress metrics
      updateProgressMetrics();

    } catch (error) {
      console.error('Failed to process event:', error, rawEvent);
      dispatch({ 
        type: 'UPDATE_EVENT_PROCESSING_STATS', 
        payload: { errors: state.eventProcessingStats.errors + 1 }
      });
    }
  }, [state.eventProcessingStats.errors]);

  const updateProgressMetrics = useCallback(() => {
    if (state.agentUpdates.length === 0) return;

    try {
      const context: ProgressContext = {
        agents: state.agentUpdates,
        currentPhase: state.researchMetrics.currentPhase,
        startTime: state.researchMetrics.startTime,
        queryComplexity: state.researchMetrics.queryComplexity,
        researchType: state.researchMetrics.researchType
      };

      const calculation = progressCalculator.calculateProgress(context);
      dispatch({ type: 'UPDATE_PROGRESS_CALCULATION', payload: calculation });

      // Update phase if changed
      const detectedPhase = googleAdkAgentMapper.getCurrentPhase(state.agentUpdates);
      if (detectedPhase !== state.researchMetrics.currentPhase) {
        dispatch({ type: 'UPDATE_RESEARCH_PHASE', payload: detectedPhase });
      }
    } catch (error) {
      console.error('Failed to calculate progress metrics:', error);
    }
  }, [state.agentUpdates, state.researchMetrics]);

  // Handle Google ADK events through SSE with enhanced processing
  useEffect(() => {
    const handleAgentEvent = (event: any) => {
      console.log('Received Google ADK agent event:', event);
      processRawEvent(event);
    };
    
    const handleResultEvent = (event: any) => {
      console.log('Received Google ADK result event:', event);
      processRawEvent(event);
    };
    
    // Register event handlers
    on('onAgent', handleAgentEvent);
    on('onResult', handleResultEvent);
    
    return () => {
      off('onAgent');
      off('onResult');
    };
  }, [on, off, processRawEvent]);

  // ===== SESSION AND QUERY MANAGEMENT =====

  const sendQuery = useCallback(async (query: string, options?: SendQueryOptions) => {
    console.log('Sending query to Google ADK backend:', query, options);
    
    try {
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

  const createSession = useCallback(async (title?: string): Promise<ChatSession> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      console.log('Creating Google ADK session...');
      
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
      console.log('Session created and ready for enhanced SSE connection:', session.id);
      return session;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create Google ADK session';
      console.error('Session creation failed:', errorMessage);
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const loadSession = useCallback(async (sessionId: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
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

  const submitQuery = useCallback(async (request: CreateResearchQueryRequest): Promise<void> => {
    if (!state.currentSession) {
      throw new Error('No active session. Please create a session first.');
    }
    
    if (connectionStatus === 'error') {
      console.warn('Connection in error state, attempting to reconnect...');
      reconnect();
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

      // Reset processors for new query
      eventProcessorRef.current.reset();
      sourceHandlerRef.current.clear();
      dispatch({ type: 'RESET_PROCESSORS' });

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
  }, [state.currentSession, connectionStatus, sendQuery, reconnect]);

  const cancelQuery = useCallback(async (queryId?: string): Promise<void> => {
    try {
      if (queryId) {
        console.log(`Cancelling query: ${queryId}`);
      }
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_CURRENT_QUERY', payload: null });
      dispatch({ type: 'UPDATE_RESEARCH_PHASE', payload: 'completed' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel query';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      throw error;
    }
  }, []);

  // ===== UTILITY FUNCTIONS =====

  const clearEvents = useCallback(() => {
    clearSSEEvents();
    dispatch({ type: 'CLEAR_EVENTS' });
  }, [clearSSEEvents]);

  const resetEventProcessors = useCallback(() => {
    eventProcessorRef.current.reset();
    sourceHandlerRef.current.clear();
    progressCalculator.reset();
    dispatch({ type: 'RESET_PROCESSORS' });
  }, []);

  const getSourceStatistics = useCallback(() => {
    return sourceHandlerRef.current.getStatistics();
  }, []);

  const getAgentMetrics = useCallback(() => {
    return googleAdkAgentMapper.getAgentMetrics();
  }, []);

  // Auto-create initial session
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
      console.log('Auto-connecting to enhanced Google ADK SSE for session:', state.currentSession.id);
      connect();
    }
  }, [autoConnect, state.currentSession, connectionStatus, connect]);

  // Calculate derived values
  const currentPhase = state.researchMetrics.currentPhase;
  const overallProgress = state.progressCalculation?.overallProgress || 0;
  const estimatedTimeRemaining = state.progressCalculation?.estimatedTimeRemaining || 0;
  const processedEventCount = state.eventProcessingStats.totalProcessed;
  const eventProcessingErrors = state.processedEvents
    .filter(e => e.errors && e.errors.length > 0)
    .map(e => e.errors!.join(', '));

  const value: EnhancedChatSessionContextValue = {
    state,
    currentSession: state.currentSession,
    createSession,
    loadSession,
    archiveSession,
    submitQuery,
    cancelQuery,
    connectionStatus,
    events: state.processedEvents,
    agents: state.agentUpdates,
    sources: state.discoveredSources,
    results: state.formattedResults,
    progressMetrics: state.progressCalculation,
    currentPhase,
    overallProgress,
    estimatedTimeRemaining,
    processedEventCount,
    eventProcessingErrors,
    clearEvents,
    reconnectSSE: reconnect,
    connectSSE: connect,
    disconnectSSE: disconnect,
    resetEventProcessors,
    getSourceStatistics,
    getAgentMetrics
  };

  return (
    <EnhancedChatSessionContext.Provider value={value}>
      {children}
    </EnhancedChatSessionContext.Provider>
  );
}

// ===== HOOK FOR CONSUMING ENHANCED CONTEXT =====

export function useEnhancedChatSession() {
  const context = useContext(EnhancedChatSessionContext);
  if (!context) {
    throw new Error('useEnhancedChatSession must be used within an EnhancedChatSessionProvider');
  }
  return context;
}

export default EnhancedChatSessionContext;