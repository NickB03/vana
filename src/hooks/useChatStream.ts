/**
 * useChatStream Hook - Chat message streaming with SSE integration
 * Connects PromptInput to backend research endpoints with real-time updates
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  ResearchRequest, 
  ResearchResponse, 
  AgentStatus, 
  ResearchProgress,
  ChatMessage,
  StreamingResponse 
} from '../lib/api/types';
import { apiClient } from '../lib/api/client';
import { useResearchSSE, useAgentNetworkSSE } from './useSSE';
import { useAuth } from './useAuth';

interface ChatStreamState {
  // Session management
  currentSessionId: string | null;
  sessions: Record<string, ChatSession>;
  
  // Actions
  createSession: () => string;
  setCurrentSession: (sessionId: string) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateStreamingMessage: (sessionId: string, messageId: string, content: string) => void;
  completeStreamingMessage: (sessionId: string, messageId: string) => void;
  updateAgents: (sessionId: string, agents: AgentStatus[]) => void;
  clearSession: (sessionId: string) => void;
  clearAllSessions: () => void;
}

interface ChatSession {
  id: string;
  messages: ChatMessage[];
  agents: AgentStatus[];
  progress: ResearchProgress | null;
  isStreaming: boolean;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Zustand store for chat sessions
 */
export const useChatStore = create<ChatStreamState>((set, get) => ({
  currentSessionId: null,
  sessions: {},

  createSession: () => {
    const sessionId = `session_${uuidv4()}`;
    const now = new Date().toISOString();
    
    const newSession: ChatSession = {
      id: sessionId,
      messages: [],
      agents: [],
      progress: null,
      isStreaming: false,
      error: null,
      created_at: now,
      updated_at: now,
    };

    set(state => ({
      sessions: { ...state.sessions, [sessionId]: newSession },
      currentSessionId: sessionId,
    }));

    return sessionId;
  },

  setCurrentSession: (sessionId: string) => {
    set({ currentSessionId: sessionId });
  },

  addMessage: (sessionId: string, message: ChatMessage) => {
    set(state => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages: [...session.messages, message],
            updated_at: new Date().toISOString(),
          },
        },
      };
    });
  },

  updateStreamingMessage: (sessionId: string, messageId: string, content: string) => {
    set(state => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      const messages = session.messages.map(msg => 
        msg.id === messageId 
          ? { ...msg, content, timestamp: new Date().toISOString() }
          : msg
      );

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            messages,
            updated_at: new Date().toISOString(),
          },
        },
      };
    });
  },

  completeStreamingMessage: (sessionId: string, messageId: string) => {
    set(state => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            isStreaming: false,
            updated_at: new Date().toISOString(),
          },
        },
      };
    });
  },

  updateAgents: (sessionId: string, agents: AgentStatus[]) => {
    set(state => {
      const session = state.sessions[sessionId];
      if (!session) return state;

      return {
        sessions: {
          ...state.sessions,
          [sessionId]: {
            ...session,
            agents: agents,
            updated_at: new Date().toISOString(),
          },
        },
      };
    });
  },

  clearSession: (sessionId: string) => {
    set(state => {
      const { [sessionId]: removed, ...remainingSessions } = state.sessions;
      return {
        sessions: remainingSessions,
        currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
      };
    });
  },

  clearAllSessions: () => {
    set({ sessions: {}, currentSessionId: null });
  },
}));

export interface ChatStreamOptions {
  /** Whether to auto-create a session if none exists */
  autoCreateSession?: boolean;
  /** Maximum number of messages to keep in memory */
  maxMessages?: number;
  /** Whether to persist sessions to localStorage */
  persistSessions?: boolean;
}

export interface ChatStreamReturn {
  // Session state
  currentSession: ChatSession | null;
  sessionId: string | null;
  isStreaming: boolean;
  
  // Messages
  messages: ChatMessage[];
  
  // Agent coordination
  agents: AgentStatus[];
  progress: ResearchProgress | null;
  
  // SSE connection state
  connectionState: string;
  isConnected: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  createNewSession: () => string;
  switchSession: (sessionId: string) => void;
  clearCurrentSession: () => void;
  retryLastMessage: () => Promise<void>;
  
  // Connection management
  connect: () => void;
  disconnect: () => void;
  
  // Helpers
  getAllSessions: () => ChatSession[];
  getSessionById: (sessionId: string) => ChatSession | null;
}

/**
 * Main chat streaming hook
 */
export function useChatStream(options: ChatStreamOptions = {}): ChatStreamReturn {
  const { 
    autoCreateSession = true,
    maxMessages = 100,
    persistSessions = true 
  } = options;

  const { isAuthenticated } = useAuth();
  const store = useChatStore();
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const currentSessionId = store.currentSessionId;
  const currentSession = currentSessionId ? store.sessions[currentSessionId] : null;
  
  // Auto-create session if needed
  useEffect(() => {
    if (autoCreateSession && !currentSessionId && isAuthenticated) {
      store.createSession();
    }
  }, [autoCreateSession, currentSessionId, isAuthenticated, store]);

  // SSE connections for research and agent updates
  const researchSSE = useResearchSSE(currentSessionId || '', {
    autoReconnect: true,
    maxReconnectAttempts: 5,
  });

  const agentSSE = useAgentNetworkSSE(currentSessionId || '', {
    autoReconnect: true,
    maxReconnectAttempts: 5,
  });

  // Cleanup SSE connections on unmount or sessionId change
  useEffect(() => {
    return () => {
      researchSSE.disconnect();
      agentSSE.disconnect();
    };
  }, [currentSessionId]);
  // Handle SSE events for research progress
  useEffect(() => {
    if (!researchSSE.lastEvent || !currentSessionId) return;

    const event = researchSSE.lastEvent;
    
    if (event.type === 'message_chunk' && event.data.chunk) {
      // Update streaming message content
      const streamingMessage = currentSession?.messages.find(msg => msg.role === 'assistant' && msg.content.endsWith('...'));
      if (streamingMessage) {
        const newContent = streamingMessage.content.replace('...', '') + event.data.chunk;
        store.updateStreamingMessage(currentSessionId, streamingMessage.id, newContent);
      }
    } else if (event.type === 'message_complete') {
      // Complete streaming message
      const streamingMessage = currentSession?.messages.find(msg => msg.role === 'assistant' && msg.content.endsWith('...'));
      if (streamingMessage) {
        const finalContent = streamingMessage.content.replace('...', '');
        store.updateStreamingMessage(currentSessionId, streamingMessage.id, finalContent);
        store.completeStreamingMessage(currentSessionId, streamingMessage.id);
      }
      setIsStreaming(false);
    } else if (event.type === 'error') {
      setError(event.data.message || 'An error occurred');
      setIsStreaming(false);
    }
  }, [researchSSE.lastEvent, currentSessionId, currentSession, store]);

  // Handle SSE events for agent coordination
  useEffect(() => {
    if (!agentSSE.lastEvent || !currentSessionId) return;

    const event = agentSSE.lastEvent;
    
    if (event.type === 'agent_network_update' && event.data.agents) {
      // Update agent status in current session using store action
      store.updateAgents(currentSessionId, event.data.agents);
    }
  }, [agentSSE.lastEvent, currentSessionId]);

  // Send message and start research
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSessionId || !content.trim()) return;

    setError(null);
    setIsStreaming(true);

    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: `msg_${uuidv4()}_user`,
        content: content.trim(),
        role: 'user',
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
      };

      store.addMessage(currentSessionId, userMessage);

      // Add initial assistant message for streaming
      const assistantMessage: ChatMessage = {
        id: `msg_${uuidv4()}_assistant`,
        content: 'Thinking...',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
      };

      store.addMessage(currentSessionId, assistantMessage);

      // Start research via API
      const researchRequest: ResearchRequest = {
        query: content,
        message: content,
      };

      const response = await apiClient.startResearch(currentSessionId, researchRequest);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to start research');
      }

      console.log('Research started:', response);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setIsStreaming(false);
      
      // Add error message
      const errorMsg: ChatMessage = {
        id: `msg_${uuidv4()}_error`,
        content: `Error: ${errorMessage}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
      };

      store.addMessage(currentSessionId, errorMsg);
    }
  }, [currentSessionId, store]);

  // Create new session
  const createNewSession = useCallback(() => {
    return store.createSession();
  }, [store]);

  // Switch to different session
  const switchSession = useCallback((sessionId: string) => {
    store.setCurrentSession(sessionId);
  }, [store]);

  // Clear current session
  const clearCurrentSession = useCallback(() => {
    if (currentSessionId) {
      store.clearSession(currentSessionId);
    }
  }, [currentSessionId, store]);

  // Retry last message
  const retryLastMessage = useCallback(async () => {
    if (!currentSession) return;

    const lastUserMessage = [...currentSession.messages]
      .reverse()
      .find(msg => msg.role === 'user');

    if (lastUserMessage) {
      await sendMessage(lastUserMessage.content);
    }
  }, [currentSession, sendMessage]);

  // Get all sessions
  const getAllSessions = useCallback(() => {
    return Object.values(store.sessions);
  }, [store.sessions]);

  // Get session by ID
  const getSessionById = useCallback((sessionId: string) => {
    return store.sessions[sessionId] || null;
  }, [store.sessions]);

  return {
    // Session state
    currentSession,
    sessionId: currentSessionId,
    isStreaming: isStreaming || currentSession?.isStreaming || false,
    
    // Messages
    messages: currentSession?.messages || [],
    
    // Agent coordination
    agents: currentSession?.agents || [],
    progress: currentSession?.progress || null,
    
    // SSE connection state
    connectionState: researchSSE.connectionState,
    isConnected: researchSSE.isConnected && agentSSE.isConnected,
    
    // Error state
    error: error || researchSSE.error || agentSSE.error || currentSession?.error || null,
    
    // Actions
    sendMessage,
    createNewSession,
    switchSession,
    clearCurrentSession,
    retryLastMessage,
    
    // Connection management
    connect: () => {
      researchSSE.connect();
      agentSSE.connect();
    },
    disconnect: () => {
      researchSSE.disconnect();
      agentSSE.disconnect();
    },
    
    // Helpers
    getAllSessions,
    getSessionById,
  };
}