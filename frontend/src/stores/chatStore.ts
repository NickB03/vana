/**
 * Zustand store for chat state management
 * Handles messages, streaming, agents, and UI state
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  ChatMessage,
  ChatSession,
  StreamingState,
  ChatError,
  ChatUIState,
  MessageToken,
  ResearchSource,
  AutoScrollConfig,
  UserMessage,
  AssistantMessage,
} from '../types/chat';

interface ChatStore {
  // Core state
  currentSession: ChatSession | null;
  sessions: ChatSession[];
  streamingState: StreamingState;
  errors: ChatError[];
  uiState: ChatUIState;
  autoScrollConfig: AutoScrollConfig;
  
  // Connection state
  isConnected: boolean;
  sessionId: string | null;
  reconnectAttempts: number;
  
  // Actions - Session Management
  createSession: (title?: string) => ChatSession;
  loadSession: (sessionId: string) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  deleteSession: (sessionId: string) => void;
  clearCurrentSession: () => void;
  
  // Actions - Message Management
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => ChatMessage;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, newContent: string) => void;
  
  // Actions - Streaming
  startStreaming: (messageId: string, agentId?: string) => void;
  addStreamingToken: (token: MessageToken) => void;
  completeStreaming: (messageId: string, success: boolean) => void;
  stopStreaming: () => void;
  
  // Actions - Research & Agent
  addResearchSources: (messageId: string, sources: ResearchSource[]) => void;
  setCurrentAgent: (agentId: string, agentName: string, agentType: string) => void;
  
  // Actions - UI State
  setInputFocused: (focused: boolean) => void;
  setScrolledToBottom: (isAtBottom: boolean) => void;
  toggleResearchSources: () => void;
  toggleAgentInfo: () => void;
  selectMessage: (messageId?: string) => void;
  setSearchQuery: (query?: string) => void;
  setAgentFilter: (agentId?: string) => void;
  
  // Actions - Auto-scroll
  updateAutoScrollConfig: (config: Partial<AutoScrollConfig>) => void;
  setUserScrollOverride: (override: boolean) => void;
  
  // Actions - Connection
  setConnectionState: (connected: boolean, sessionId?: string) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  
  // Actions - Error Handling
  addError: (error: Omit<ChatError, 'id' | 'timestamp'>) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;
  
  // Computed getters
  getMessageById: (messageId: string) => ChatMessage | undefined;
  getMessagesByAgent: (agentId: string) => ChatMessage[];
  getFilteredMessages: () => ChatMessage[];
  hasActiveStream: () => boolean;
  getCurrentStreamingMessage: () => AssistantMessage | undefined;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const initialUIState: ChatUIState = {
  isInputFocused: false,
  isScrolledToBottom: true,
  showResearchSources: true,
  showAgentInfo: false,
};

const initialAutoScrollConfig: AutoScrollConfig = {
  enabled: true,
  threshold: 100,
  smoothness: 'smooth',
  userOverride: false,
};

const initialStreamingState: StreamingState = {
  isStreaming: false,
  queuedTokens: [],
  buffer: '',
};

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      currentSession: null,
      sessions: [],
      streamingState: initialStreamingState,
      errors: [],
      uiState: initialUIState,
      autoScrollConfig: initialAutoScrollConfig,
      isConnected: false,
      sessionId: null,
      reconnectAttempts: 0,
      
      // Session Management
      createSession: (title = 'New Chat') => {
        const session: ChatSession = {
          id: generateId(),
          title,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        set((state) => {
          state.sessions.push(session);
          state.currentSession = session;
        });
        
        return session;
      },
      
      loadSession: (sessionId: string) => {
        set((state) => {
          const session = state.sessions.find(s => s.id === sessionId);
          if (session) {
            state.currentSession = session;
            state.streamingState = { ...initialStreamingState };
            state.errors = [];
          }
        });
      },
      
      updateSessionTitle: (sessionId: string, title: string) => {
        set((state) => {
          const session = state.sessions.find(s => s.id === sessionId);
          if (session) {
            session.title = title;
            session.updatedAt = Date.now();
            if (state.currentSession?.id === sessionId) {
              state.currentSession.title = title;
            }
          }
        });
      },
      
      deleteSession: (sessionId: string) => {
        set((state) => {
          state.sessions = state.sessions.filter(s => s.id !== sessionId);
          if (state.currentSession?.id === sessionId) {
            state.currentSession = null;
          }
        });
      },
      
      clearCurrentSession: () => {
        set((state) => {
          if (state.currentSession) {
            state.currentSession.messages = [];
            state.currentSession.updatedAt = Date.now();
          }
          state.streamingState = { ...initialStreamingState };
          state.errors = [];
        });
      },
      
      // Message Management
      addMessage: (messageData) => {
        const message: ChatMessage = {
          ...messageData,
          id: generateId(),
          timestamp: Date.now(),
        };
        
        set((state) => {
          if (state.currentSession) {
            state.currentSession.messages.push(message);
            state.currentSession.updatedAt = Date.now();
          }
        });
        
        return message;
      },
      
      updateMessage: (messageId: string, updates: Partial<ChatMessage>) => {
        set((state) => {
          if (state.currentSession) {
            const messageIndex = state.currentSession.messages.findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
              Object.assign(state.currentSession.messages[messageIndex], updates);
              state.currentSession.updatedAt = Date.now();
            }
          }
        });
      },
      
      deleteMessage: (messageId: string) => {
        set((state) => {
          if (state.currentSession) {
            state.currentSession.messages = state.currentSession.messages.filter(m => m.id !== messageId);
            state.currentSession.updatedAt = Date.now();
          }
        });
      },
      
      editMessage: (messageId: string, newContent: string) => {
        set((state) => {
          if (state.currentSession) {
            const message = state.currentSession.messages.find(m => m.id === messageId) as UserMessage;
            if (message && message.role === 'user') {
              message.originalContent = message.content;
              message.content = newContent;
              message.isEditing = false;
              state.currentSession.updatedAt = Date.now();
            }
          }
        });
      },
      
      // Streaming Management
      startStreaming: (messageId: string, agentId?: string) => {
        set((state) => {
          state.streamingState = {
            isStreaming: true,
            currentMessageId: messageId,
            currentAgentId: agentId,
            queuedTokens: [],
            buffer: '',
          };
        });
      },
      
      addStreamingToken: (token: MessageToken) => {
        set((state) => {
          if (state.streamingState.isStreaming && 
              state.streamingState.currentMessageId === token.messageId) {
            
            // Add to buffer
            state.streamingState.buffer += token.content;
            state.streamingState.queuedTokens.push(token);
            
            // Update the message with streaming content
            if (state.currentSession) {
              const message = state.currentSession.messages.find(m => m.id === token.messageId) as AssistantMessage;
              if (message) {
                message.streamingContent = state.streamingState.buffer;
                if (!message.tokens) message.tokens = [];
                message.tokens.push(token);
              }
            }
          }
        });
      },
      
      completeStreaming: (messageId: string, success: boolean) => {
        set((state) => {
          if (state.streamingState.currentMessageId === messageId) {
            // Finalize the message
            if (state.currentSession) {
              const message = state.currentSession.messages.find(m => m.id === messageId);
              if (message) {
                if (success && state.streamingState.buffer) {
                  message.content = state.streamingState.buffer;
                }
                message.status = success ? 'complete' : 'error';
                if (message.role === 'assistant') {
                  delete (message as AssistantMessage).streamingContent;
                }
              }
            }
            
            // Reset streaming state
            state.streamingState = { ...initialStreamingState };
          }
        });
      },
      
      stopStreaming: () => {
        set((state) => {
          state.streamingState = { ...initialStreamingState };
        });
      },
      
      // Research & Agent Management
      addResearchSources: (messageId: string, sources: ResearchSource[]) => {
        set((state) => {
          if (state.currentSession) {
            const message = state.currentSession.messages.find(m => m.id === messageId) as AssistantMessage;
            if (message && message.role === 'assistant') {
              message.researchSources = sources;
            }
          }
        });
      },
      
      setCurrentAgent: (agentId: string, agentName: string, agentType: string) => {
        set((state) => {
          if (state.streamingState.isStreaming) {
            state.streamingState.currentAgentId = agentId;
            
            // Update current streaming message with agent info
            if (state.currentSession && state.streamingState.currentMessageId) {
              const message = state.currentSession.messages.find(
                m => m.id === state.streamingState.currentMessageId
              ) as AssistantMessage;
              if (message && message.role === 'assistant') {
                message.agentId = agentId;
                message.agentName = agentName;
                message.agentType = agentType;
              }
            }
          }
        });
      },
      
      // UI State Management
      setInputFocused: (focused: boolean) => {
        set((state) => {
          state.uiState.isInputFocused = focused;
        });
      },
      
      setScrolledToBottom: (isAtBottom: boolean) => {
        set((state) => {
          state.uiState.isScrolledToBottom = isAtBottom;
          if (isAtBottom) {
            state.autoScrollConfig.userOverride = false;
          }
        });
      },
      
      toggleResearchSources: () => {
        set((state) => {
          state.uiState.showResearchSources = !state.uiState.showResearchSources;
        });
      },
      
      toggleAgentInfo: () => {
        set((state) => {
          state.uiState.showAgentInfo = !state.uiState.showAgentInfo;
        });
      },
      
      selectMessage: (messageId?: string) => {
        set((state) => {
          state.uiState.selectedMessageId = messageId;
        });
      },
      
      setSearchQuery: (query?: string) => {
        set((state) => {
          state.uiState.searchQuery = query;
        });
      },
      
      setAgentFilter: (agentId?: string) => {
        set((state) => {
          state.uiState.filterByAgent = agentId;
        });
      },
      
      // Auto-scroll Management
      updateAutoScrollConfig: (config: Partial<AutoScrollConfig>) => {
        set((state) => {
          Object.assign(state.autoScrollConfig, config);
        });
      },
      
      setUserScrollOverride: (override: boolean) => {
        set((state) => {
          state.autoScrollConfig.userOverride = override;
        });
      },
      
      // Connection Management
      setConnectionState: (connected: boolean, sessionId?: string) => {
        set((state) => {
          state.isConnected = connected;
          if (sessionId) state.sessionId = sessionId;
          if (connected) state.reconnectAttempts = 0;
        });
      },
      
      incrementReconnectAttempts: () => {
        set((state) => {
          state.reconnectAttempts += 1;
        });
      },
      
      resetReconnectAttempts: () => {
        set((state) => {
          state.reconnectAttempts = 0;
        });
      },
      
      // Error Management
      addError: (errorData) => {
        const error: ChatError = {
          ...errorData,
          id: generateId(),
          timestamp: Date.now(),
        };
        
        set((state) => {
          state.errors.push(error);
        });
      },
      
      removeError: (errorId: string) => {
        set((state) => {
          state.errors = state.errors.filter(e => e.id !== errorId);
        });
      },
      
      clearErrors: () => {
        set((state) => {
          state.errors = [];
        });
      },
      
      // Computed getters
      getMessageById: (messageId: string) => {
        const state = get();
        return state.currentSession?.messages.find(m => m.id === messageId);
      },
      
      getMessagesByAgent: (agentId: string) => {
        const state = get();
        return state.currentSession?.messages.filter(
          m => m.role === 'assistant' && (m as AssistantMessage).agentId === agentId
        ) || [];
      },
      
      getFilteredMessages: () => {
        const state = get();
        if (!state.currentSession) return [];
        
        let messages = state.currentSession.messages;
        
        // Filter by agent
        if (state.uiState.filterByAgent) {
          messages = messages.filter(m => 
            m.role !== 'assistant' || (m as AssistantMessage).agentId === state.uiState.filterByAgent
          );
        }
        
        // Filter by search query
        if (state.uiState.searchQuery) {
          const query = state.uiState.searchQuery.toLowerCase();
          messages = messages.filter(m => 
            m.content.toLowerCase().includes(query)
          );
        }
        
        return messages;
      },
      
      hasActiveStream: () => {
        const state = get();
        return state.streamingState.isStreaming;
      },
      
      getCurrentStreamingMessage: () => {
        const state = get();
        if (!state.streamingState.isStreaming || !state.streamingState.currentMessageId) {
          return undefined;
        }
        
        return state.currentSession?.messages.find(
          m => m.id === state.streamingState.currentMessageId
        ) as AssistantMessage;
      },
    }))
  )
);

// Selectors for performance optimization
export const useCurrentSession = () => useChatStore(state => state.currentSession);
export const useMessages = () => useChatStore(state => state.getFilteredMessages());
export const useStreamingState = () => useChatStore(state => state.streamingState);
export const useUIState = () => useChatStore(state => state.uiState);
export const useErrors = () => useChatStore(state => state.errors);
export const useConnectionState = () => useChatStore(state => ({
  isConnected: state.isConnected,
  sessionId: state.sessionId,
  reconnectAttempts: state.reconnectAttempts,
}));