'use client';

import { create } from 'zustand';
import { subscribeWithSelector, devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { safeLocalStorage } from '@/lib/ssr-utils';
import { getDefaultPersonality } from '@/lib/agent-defaults';

// Import existing types
import type { AuthState, LoginCredentials, RegisterCredentials } from '@/types/auth';
import type { SessionState, ChatSession, ChatMessage, SSEAgentEvent } from '@/types/session';
import type { Agent, AgentRole, AgentConversation } from '@/types/agents';
import type { CanvasContent, CanvasMode, CollaborativeSession, AgentSuggestion } from '@/types/canvas';

// New store slice types for the unified architecture
export interface ChatStore {
  // State
  activeConversation: string | null;
  conversations: Record<string, AgentConversation>;
  messageQueue: ChatMessage[];
  isProcessing: boolean;
  streamingMessage: Partial<ChatMessage> | null;
  
  // Actions
  startConversation: (agents: Agent[]) => string;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateStreamingMessage: (content: string) => void;
  finalizeStreamingMessage: () => void;
  clearMessageQueue: () => void;
  setProcessing: (processing: boolean) => void;
  getConversation: (id: string) => AgentConversation | undefined;
}

export interface CanvasStore {
  // State
  currentMode: CanvasMode;
  content: CanvasContent;
  isEditing: boolean;
  isDirty: boolean;
  lastSaved: number | null;
  collaborativeSession: CollaborativeSession | null;
  agentSuggestions: AgentSuggestion[];
  
  // Actions
  setMode: (mode: CanvasMode) => void;
  updateContent: (content: string) => void;
  setTitle: (title: string) => void;
  setEditing: (editing: boolean) => void;
  saveContent: () => void;
  addAgentSuggestion: (suggestion: AgentSuggestion) => void;
  removeAgentSuggestion: (suggestionId: string) => void;
  acceptSuggestion: (suggestionId: string) => void;
  startCollaboration: (agents: Agent[]) => void;
  endCollaboration: () => void;
}

export interface AgentDeckStore {
  // State
  availableAgents: Agent[];
  selectedAgents: string[];
  activeAgents: Record<string, Agent>;
  agentStatus: Record<string, Agent['status']>;
  agentMetrics: Record<string, { responseTime: number; successRate: number; }>;
  
  // Actions
  loadAgents: () => void;
  selectAgent: (agentId: string) => void;
  deselectAgent: (agentId: string) => void;
  updateAgentStatus: (agentId: string, status: Agent['status']) => void;
  updateAgentMetrics: (agentId: string, metrics: { responseTime: number; successRate: number; }) => void;
  getAgent: (agentId: string) => Agent | undefined;
  getSelectedAgents: () => Agent[];
}

export interface UploadStore {
  // State
  uploads: Record<string, UploadItem>;
  isUploading: boolean;
  progress: Record<string, number>;
  errors: Record<string, string>;
  
  // Actions
  addUpload: (file: File) => string;
  updateProgress: (uploadId: string, progress: number) => void;
  completeUpload: (uploadId: string, result: any) => void;
  failUpload: (uploadId: string, error: string) => void;
  removeUpload: (uploadId: string) => void;
  clearCompleted: () => void;
}

export interface UploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  result?: any;
  error?: string;
  timestamp: number;
}

export interface UIStore {
  // Theme
  theme: 'light' | 'dark' | 'system';
  
  // Layout
  sidebarOpen: boolean;
  sidebarWidth: number;
  
  // Chat UI
  chatInputHeight: number;
  showTyping: boolean;
  
  // Modals and overlays
  activeModal: string | null;
  
  // Tool selection
  selectedTools: string[];
  
  // Preferences
  preferences: {
    fontSize: 'sm' | 'base' | 'lg';
    codeTheme: 'dark' | 'light';
    autoSave: boolean;
    notifications: boolean;
  };
  
  // Actions
  setTheme: (theme: UIStore['theme']) => void;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setChatInputHeight: (height: number) => void;
  setShowTyping: (show: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  toggleTool: (toolId: string) => void;
  setSelectedTools: (tools: string[]) => void;
  updatePreferences: (preferences: Partial<UIStore['preferences']>) => void;
  reset: () => void;
}

// Unified store interface combining all slices
export interface UnifiedStore {
  // Store slices
  auth: AuthState & {
    // Auth actions
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (credentials: RegisterCredentials) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    handleGoogleCallback: (code: string, state: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshToken: () => Promise<void>;
    checkAuth: () => Promise<void>;
    clearError: () => void;
    setLoading: (loading: boolean) => void;
  };
  
  session: SessionState & {
    // Session actions  
    createSession: (title?: string) => ChatSession;
    deleteSession: (sessionId: string) => void;
    selectSession: (sessionId: string) => void;
    addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
    updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
    updateSessionTitle: (sessionId: string, title: string) => void;
    clearSessions: () => void;
    exportSession: (sessionId: string) => ChatSession | null;
    importSession: (session: ChatSession) => void;
    handleSSEEvent: (event: SSEAgentEvent) => void;
  };
  
  chat: ChatStore;
  canvas: CanvasStore;
  agentDeck: AgentDeckStore;
  upload: UploadStore;
  ui: UIStore;
  
  // Global actions
  resetAll: () => void;
  getState: () => UnifiedStore;
}

// Utility functions
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function generateSessionTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    return firstUserMessage.content.slice(0, 50) + (firstUserMessage.content.length > 50 ? '...' : '');
  }
  return `Chat Session ${new Date().toLocaleDateString()}`;
}

// Create the unified store with all middleware
export const useUnifiedStore = create<UnifiedStore>()(
  subscribeWithSelector(
    devtools(
      persist(
        immer((set, get) => ({
          // Auth slice
          auth: {
            user: null,
            tokens: null,
            isLoading: false,
            error: null,
            
            setLoading: (loading: boolean) => {
              set((state) => {
                state.auth.isLoading = loading;
              });
            },
            
            clearError: () => {
              set((state) => {
                state.auth.error = null;
              });
            },
            
            login: async (credentials: LoginCredentials) => {
              try {
                set((state) => {
                  state.auth.isLoading = true;
                  state.auth.error = null;
                });
                
                // Import AuthAPI dynamically to avoid SSR issues
                const authModule = await import('@/lib/auth');
                const { AuthAPI, tokenManager } = authModule;
                const response = await AuthAPI.login(credentials);
                
                tokenManager.setTokens(response.tokens);
                set((state) => {
                  state.auth.user = response.user;
                  state.auth.tokens = response.tokens;
                  state.auth.isLoading = false;
                  state.auth.error = null;
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Login failed';
                set((state) => {
                  state.auth.user = null;
                  state.auth.tokens = null;
                  state.auth.isLoading = false;
                  state.auth.error = message;
                });
                throw error;
              }
            },
            
            register: async (credentials: RegisterCredentials) => {
              try {
                set((state) => {
                  state.auth.isLoading = true;
                  state.auth.error = null;
                });
                
                const authModule = await import('@/lib/auth');
                const { AuthAPI, tokenManager } = authModule;
                const response = await AuthAPI.register(credentials);
                
                tokenManager.setTokens(response.tokens);
                set((state) => {
                  state.auth.user = response.user;
                  state.auth.tokens = response.tokens;
                  state.auth.isLoading = false;
                  state.auth.error = null;
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Registration failed';
                set((state) => {
                  state.auth.user = null;
                  state.auth.tokens = null;
                  state.auth.isLoading = false;
                  state.auth.error = message;
                });
                throw error;
              }
            },
            
            loginWithGoogle: async () => {
              try {
                set((state) => {
                  state.auth.isLoading = true;
                  state.auth.error = null;
                });
                
                const authModule = await import('@/lib/auth');
                const { AuthAPI } = authModule;
                const ssrModule = await import('@/lib/ssr-utils');
                const { safeWindow } = ssrModule;
                
                const authUrl = await AuthAPI.loginWithGoogle();
                const win = safeWindow();
                
                if (win) {
                  win.location.href = authUrl;
                }
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Google login failed';
                set((state) => {
                  state.auth.isLoading = false;
                  state.auth.error = message;
                });
                throw error;
              }
            },
            
            handleGoogleCallback: async (code: string, state: string) => {
              try {
                set((authState) => {
                  authState.auth.isLoading = true;
                  authState.auth.error = null;
                });
                
                const authModule = await import('@/lib/auth');
                const { AuthAPI, tokenManager } = authModule;
                const response = await AuthAPI.handleGoogleCallback(code, state);
                
                tokenManager.setTokens(response.tokens);
                set((authState) => {
                  authState.auth.user = response.user;
                  authState.auth.tokens = response.tokens;
                  authState.auth.isLoading = false;
                  authState.auth.error = null;
                });
              } catch (error) {
                const message = error instanceof Error ? error.message : 'Google callback failed';
                set((state) => {
                  state.auth.user = null;
                  state.auth.tokens = null;
                  state.auth.isLoading = false;
                  state.auth.error = message;
                });
                throw error;
              }
            },
            
            refreshToken: async () => {
              try {
                const authModule = await import('@/lib/auth');
                const { AuthAPI, tokenManager } = authModule;
                const newTokens = await AuthAPI.refreshToken();
                
                tokenManager.setTokens(newTokens);
                set((state) => {
                  state.auth.tokens = newTokens;
                  state.auth.error = null;
                });
              } catch (error) {
                // If refresh fails, logout
                await get().auth.logout();
                throw error;
              }
            },
            
            logout: async () => {
              try {
                set((state) => {
                  state.auth.isLoading = true;
                });
                
                const authModule = await import('@/lib/auth');
                const { AuthAPI, tokenManager } = authModule;
                await AuthAPI.logout();
                tokenManager.clearTokens();
              } catch (error) {
                console.error('Logout error:', error);
              } finally {
                set((state) => {
                  state.auth.user = null;
                  state.auth.tokens = null;
                  state.auth.isLoading = false;
                  state.auth.error = null;
                });
              }
            },
            
            checkAuth: async () => {
              try {
                const currentState = get();
                if (currentState.auth.isLoading) return;
                
                const shouldShowLoading = !!currentState.auth.user;
                
                if (shouldShowLoading) {
                  set((state) => {
                    state.auth.isLoading = true;
                    state.auth.error = null;
                  });
                }
                
                const authModule = await import('@/lib/auth');
                const { AuthAPI, tokenManager } = authModule;
                const token = await tokenManager.ensureValidToken();
                
                if (!token) {
                  set((state) => {
                    state.auth.isLoading = false;
                    state.auth.user = null;
                    state.auth.tokens = null;
                  });
                  return;
                }
                
                const user = await AuthAPI.getCurrentUser();
                const tokens = {
                  access_token: token,
                  refresh_token: tokenManager.storage.getRefreshToken() || '',
                  token_type: 'bearer',
                  expires_in: 3600,
                  issued_at: Math.floor(Date.now() / 1000)
                };
                
                set((state) => {
                  state.auth.user = user;
                  state.auth.tokens = tokens;
                  state.auth.isLoading = false;
                  state.auth.error = null;
                });
              } catch (error) {
                console.error('Auth check failed:', error);
                const { tokenManager } = await import('@/lib/auth');
                tokenManager.clearTokens();
                
                set((state) => {
                  state.auth.user = null;
                  state.auth.tokens = null;
                  state.auth.isLoading = false;
                  state.auth.error = null;
                });
              }
            }
          },
          
          // Session slice
          session: {
            sessions: [],
            currentSession: null,
            isLoading: false,
            error: null,
            
            createSession: (title?: string) => {
              const newSession: ChatSession = {
                id: generateId(),
                title: title || 'New Chat',
                messages: [],
                created_at: Date.now(),
                updated_at: Date.now(),
              };
              
              set((state) => {
                state.session.sessions = [newSession, ...state.session.sessions];
                state.session.currentSession = newSession;
              });
              
              return newSession;
            },
            
            deleteSession: (sessionId: string) => {
              set((state) => {
                const filteredSessions = state.session.sessions.filter(s => s.id !== sessionId);
                const currentSession = state.session.currentSession?.id === sessionId 
                  ? (filteredSessions[0] || null)
                  : state.session.currentSession;
                
                state.session.sessions = filteredSessions;
                state.session.currentSession = currentSession;
              });
            },
            
            selectSession: (sessionId: string) => {
              set((state) => {
                const session = state.session.sessions.find(s => s.id === sessionId);
                if (session) {
                  state.session.currentSession = session;
                }
              });
            },
            
            addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
              const newMessage: ChatMessage = {
                ...message,
                id: generateId(),
                timestamp: Date.now(),
              };
              
              set((state) => {
                if (!state.session.currentSession) return;
                
                const updatedSession: ChatSession = {
                  ...state.session.currentSession,
                  messages: [...state.session.currentSession.messages, newMessage],
                  updated_at: Date.now(),
                };
                
                if (newMessage.role === 'user' && updatedSession.messages.length === 1) {
                  updatedSession.title = generateSessionTitle([newMessage]);
                }
                
                state.session.sessions = state.session.sessions.map(s => 
                  s.id === updatedSession.id ? updatedSession : s
                );
                state.session.currentSession = updatedSession;
              });
            },
            
            updateMessage: (messageId: string, updates: Partial<ChatMessage>) => {
              set((state) => {
                if (!state.session.currentSession) return;
                
                const updatedMessages = state.session.currentSession.messages.map(msg =>
                  msg.id === messageId ? { ...msg, ...updates } : msg
                );
                
                const updatedSession: ChatSession = {
                  ...state.session.currentSession,
                  messages: updatedMessages,
                  updated_at: Date.now(),
                };
                
                state.session.sessions = state.session.sessions.map(s =>
                  s.id === updatedSession.id ? updatedSession : s
                );
                state.session.currentSession = updatedSession;
              });
            },
            
            updateSessionTitle: (sessionId: string, title: string) => {
              set((state) => {
                state.session.sessions = state.session.sessions.map(s =>
                  s.id === sessionId ? { ...s, title, updated_at: Date.now() } : s
                );
                
                if (state.session.currentSession?.id === sessionId) {
                  state.session.currentSession = {
                    ...state.session.currentSession,
                    title,
                    updated_at: Date.now()
                  };
                }
              });
            },
            
            clearSessions: () => {
              set((state) => {
                state.session.sessions = [];
                state.session.currentSession = null;
              });
            },
            
            exportSession: (sessionId: string) => {
              const session = get().session.sessions.find(s => s.id === sessionId);
              return session || null;
            },
            
            importSession: (session: ChatSession) => {
              set((state) => {
                if (state.session.sessions.some(s => s.id === session.id)) {
                  return; // Don't import duplicates
                }
                
                state.session.sessions = [session, ...state.session.sessions];
              });
            },
            
            handleSSEEvent: (event: SSEAgentEvent) => {
              set(() => {
                // Handle various SSE events and update session state accordingly
                // TODO: Implement event handlers when needed
                switch (event.type) {
                  case 'agent_network_update':
                    // Update agent network state
                    break;
                  case 'connection':
                    // Handle connection status changes
                    break;
                  // Add more event handlers as needed
                }
              });
            }
          },
          
          // Chat slice
          chat: {
            activeConversation: null,
            conversations: {},
            messageQueue: [],
            isProcessing: false,
            streamingMessage: null,
            
            startConversation: (agents: Agent[]) => {
              const conversationId = generateId();
              const conversation: AgentConversation = {
                id: conversationId,
                sessionId: get().session.currentSession?.id || '',
                participants: agents,
                threads: [{
                  id: generateId(),
                  title: 'Main Thread',
                  participants: agents.map(a => a.id),
                  messages: [],
                  status: 'active',
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                }],
                lastActivity: Date.now()
              };
              
              set((state) => {
                state.chat.conversations[conversationId] = conversation;
                state.chat.activeConversation = conversationId;
              });
              
              return conversationId;
            },
            
            addMessage: (conversationId: string, message: ChatMessage) => {
              set((state) => {
                const conversation = state.chat.conversations[conversationId];
                if (conversation && conversation.threads[0]) {
                  // Create an AgentMessage from the ChatMessage
                  const agentMessage = {
                    ...message,
                    agentId: message.role === 'user' ? 'user' : 'assistant',
                    agentRole: (message.role === 'user' ? 'coordinator' : 'assistant') as AgentRole,
                    personality: getDefaultPersonality(message.role)
                  };
                  
                  conversation.threads[0].messages.push(agentMessage);
                  conversation.lastActivity = Date.now();
                  conversation.threads[0].updatedAt = Date.now();
                }
              });
            },
            
            updateStreamingMessage: (content: string) => {
              set((state) => {
                state.chat.streamingMessage = {
                  id: generateId(),
                  content,
                  role: 'assistant',
                  timestamp: Date.now()
                };
              });
            },
            
            finalizeStreamingMessage: () => {
              const streamingMessage = get().chat.streamingMessage;
              if (streamingMessage && get().chat.activeConversation) {
                get().chat.addMessage(get().chat.activeConversation!, streamingMessage as ChatMessage);
                set((state) => {
                  state.chat.streamingMessage = null;
                });
              }
            },
            
            clearMessageQueue: () => {
              set((state) => {
                state.chat.messageQueue = [];
              });
            },
            
            setProcessing: (processing: boolean) => {
              set((state) => {
                state.chat.isProcessing = processing;
              });
            },
            
            getConversation: (id: string) => {
              return get().chat.conversations[id];
            }
          },
          
          // Canvas slice
          canvas: {
            currentMode: 'markdown' as CanvasMode,
            content: {
              id: generateId(),
              mode: 'markdown' as CanvasMode,
              title: 'Untitled',
              content: '',
              lastModified: new Date()
            },
            isEditing: false,
            isDirty: false,
            lastSaved: null,
            collaborativeSession: null,
            agentSuggestions: [],
            
            setMode: (mode: CanvasMode) => {
              set((state) => {
                state.canvas.currentMode = mode;
                state.canvas.content.mode = mode;
                state.canvas.isDirty = true;
              });
            },
            
            updateContent: (content: string) => {
              set((state) => {
                state.canvas.content.content = content;
                state.canvas.content.lastModified = new Date();
                state.canvas.isDirty = true;
              });
            },
            
            setTitle: (title: string) => {
              set((state) => {
                state.canvas.content.title = title;
                state.canvas.isDirty = true;
              });
            },
            
            setEditing: (editing: boolean) => {
              set((state) => {
                state.canvas.isEditing = editing;
              });
            },
            
            saveContent: () => {
              set((state) => {
                state.canvas.isDirty = false;
                state.canvas.lastSaved = Date.now();
              });
            },
            
            addAgentSuggestion: (suggestion: AgentSuggestion) => {
              set((state) => {
                state.canvas.agentSuggestions.push(suggestion);
              });
            },
            
            removeAgentSuggestion: (suggestionId: string) => {
              set((state) => {
                state.canvas.agentSuggestions = state.canvas.agentSuggestions.filter(
                  s => s.id !== suggestionId
                );
              });
            },
            
            acceptSuggestion: (suggestionId: string) => {
              set((state) => {
                const suggestion = state.canvas.agentSuggestions.find(s => s.id === suggestionId);
                if (suggestion && suggestion.suggestedText) {
                  state.canvas.content.content = suggestion.suggestedText;
                  state.canvas.content.lastModified = new Date();
                  state.canvas.isDirty = true;
                  suggestion.status = 'implemented';
                }
              });
            },
            
            startCollaboration: (agents: Agent[]) => {
              set((state) => {
                state.canvas.collaborativeSession = {
                  id: generateId(),
                  canvasId: state.canvas.content.id,
                  agents: agents.map(agent => ({
                    id: agent.id,
                    name: agent.name,
                    type: agent.role as any,
                    color: agent.personality.colors.primary,
                    avatar: agent.avatar,
                    capabilities: agent.capabilities,
                    status: (agent.status === 'error' ? 'offline' : agent.status === 'busy' || agent.status === 'thinking' ? 'working' : agent.status) as 'active' | 'idle' | 'working' | 'offline',
                    lastActivity: new Date(agent.lastActivity || Date.now())
                  })),
                  cursors: {},
                  suggestions: [],
                  activities: [],
                  createdAt: new Date(),
                  lastActivity: new Date()
                };
              });
            },
            
            endCollaboration: () => {
              set((state) => {
                state.canvas.collaborativeSession = null;
              });
            }
          },
          
          // Agent Deck slice
          agentDeck: {
            availableAgents: [],
            selectedAgents: [],
            activeAgents: {},
            agentStatus: {},
            agentMetrics: {},
            
            loadAgents: () => {
              // Import agents from the existing agent presets
              import('@/types/agents').then(({ AGENT_PRESETS }) => {
                const agents: Agent[] = Object.values(AGENT_PRESETS).map((preset, index) => ({
                  ...preset,
                  id: `agent_${preset.role}_${Date.now()}_${index}`,
                  status: 'idle' as const,
                  lastActivity: Date.now(),
                  messageCount: 0,
                  isTyping: false
                }));
                
                set((state) => {
                  state.agentDeck.availableAgents = agents;
                  // Initialize status and metrics for all agents
                  agents.forEach(agent => {
                    state.agentDeck.agentStatus[agent.id] = agent.status;
                    state.agentDeck.agentMetrics[agent.id] = {
                      responseTime: 1000,
                      successRate: 0.85
                    };
                  });
                });
              });
            },
            
            selectAgent: (agentId: string) => {
              set((state) => {
                if (!state.agentDeck.selectedAgents.includes(agentId)) {
                  state.agentDeck.selectedAgents.push(agentId);
                  const agent = state.agentDeck.availableAgents.find(a => a.id === agentId);
                  if (agent) {
                    state.agentDeck.activeAgents[agentId] = agent;
                  }
                }
              });
            },
            
            deselectAgent: (agentId: string) => {
              set((state) => {
                state.agentDeck.selectedAgents = state.agentDeck.selectedAgents.filter(
                  id => id !== agentId
                );
                delete state.agentDeck.activeAgents[agentId];
              });
            },
            
            updateAgentStatus: (agentId: string, status: Agent['status']) => {
              set((state) => {
                state.agentDeck.agentStatus[agentId] = status;
                if (state.agentDeck.activeAgents[agentId]) {
                  state.agentDeck.activeAgents[agentId].status = status;
                  state.agentDeck.activeAgents[agentId].lastActivity = Date.now();
                }
                // Update in available agents as well
                const agentIndex = state.agentDeck.availableAgents.findIndex(a => a.id === agentId);
                if (agentIndex >= 0 && state.agentDeck.availableAgents[agentIndex]) {
                  state.agentDeck.availableAgents[agentIndex].status = status;
                  state.agentDeck.availableAgents[agentIndex].lastActivity = Date.now();
                }
              });
            },
            
            updateAgentMetrics: (agentId: string, metrics: { responseTime: number; successRate: number; }) => {
              set((state) => {
                state.agentDeck.agentMetrics[agentId] = metrics;
              });
            },
            
            getAgent: (agentId: string) => {
              return get().agentDeck.availableAgents.find(a => a.id === agentId);
            },
            
            getSelectedAgents: () => {
              const state = get();
              return state.agentDeck.selectedAgents
                .map(id => state.agentDeck.availableAgents.find(a => a.id === id))
                .filter((agent): agent is Agent => agent !== undefined);
            }
          },
          
          // Upload slice
          upload: {
            uploads: {},
            isUploading: false,
            progress: {},
            errors: {},
            
            addUpload: (file: File) => {
              const uploadId = generateId();
              const upload: UploadItem = {
                id: uploadId,
                file,
                status: 'pending',
                progress: 0,
                timestamp: Date.now()
              };
              
              set((state) => {
                state.upload.uploads[uploadId] = upload;
                state.upload.progress[uploadId] = 0;
              });
              
              return uploadId;
            },
            
            updateProgress: (uploadId: string, progress: number) => {
              set((state) => {
                state.upload.progress[uploadId] = Math.max(0, Math.min(100, progress));
                if (state.upload.uploads[uploadId]) {
                  state.upload.uploads[uploadId].progress = progress;
                  state.upload.uploads[uploadId].status = progress < 100 ? 'uploading' : 'completed';
                }
                
                // Update global uploading state
                state.upload.isUploading = Object.values(state.upload.uploads).some(
                  u => u.status === 'uploading' || u.status === 'pending'
                );
              });
            },
            
            completeUpload: (uploadId: string, result: any) => {
              set((state) => {
                if (state.upload.uploads[uploadId]) {
                  state.upload.uploads[uploadId].status = 'completed';
                  state.upload.uploads[uploadId].result = result;
                  state.upload.uploads[uploadId].progress = 100;
                  state.upload.progress[uploadId] = 100;
                }
                
                // Update global uploading state
                state.upload.isUploading = Object.values(state.upload.uploads).some(
                  u => u.status === 'uploading' || u.status === 'pending'
                );
              });
            },
            
            failUpload: (uploadId: string, error: string) => {
              set((state) => {
                if (state.upload.uploads[uploadId]) {
                  state.upload.uploads[uploadId].status = 'failed';
                  state.upload.uploads[uploadId].error = error;
                  state.upload.errors[uploadId] = error;
                }
                
                // Update global uploading state
                state.upload.isUploading = Object.values(state.upload.uploads).some(
                  u => u.status === 'uploading' || u.status === 'pending'
                );
              });
            },
            
            removeUpload: (uploadId: string) => {
              set((state) => {
                delete state.upload.uploads[uploadId];
                delete state.upload.progress[uploadId];
                delete state.upload.errors[uploadId];
                
                // Update global uploading state
                state.upload.isUploading = Object.values(state.upload.uploads).some(
                  u => u.status === 'uploading' || u.status === 'pending'
                );
              });
            },
            
            clearCompleted: () => {
              set((state) => {
                Object.keys(state.upload.uploads).forEach(uploadId => {
                  const upload = state.upload.uploads[uploadId];
                  if (upload && upload.status === 'completed') {
                    delete state.upload.uploads[uploadId];
                    delete state.upload.progress[uploadId];
                    delete state.upload.errors[uploadId];
                  }
                });
              });
            }
          },
          
          // UI slice
          ui: {
            theme: 'dark',
            sidebarOpen: true,
            sidebarWidth: 300,
            chatInputHeight: 100,
            showTyping: false,
            activeModal: null,
            selectedTools: [],
            preferences: {
              fontSize: 'base',
              codeTheme: 'dark',
              autoSave: true,
              notifications: true,
            },
            
            setTheme: (theme: UIStore['theme']) => {
              set((state) => {
                state.ui.theme = theme;
              });
              
              // Apply theme to DOM
              if (typeof window !== 'undefined') {
                const { safeDOMClassList, safePrefersDark } = require('@/lib/ssr-utils');
                const rootClasses = safeDOMClassList('html');
                
                if (theme === 'dark') {
                  rootClasses.add('dark');
                } else if (theme === 'light') {
                  rootClasses.remove('dark');
                } else {
                  const prefersDark = safePrefersDark();
                  if (prefersDark) {
                    rootClasses.add('dark');
                  } else {
                    rootClasses.remove('dark');
                  }
                }
              }
            },
            
            toggleTheme: () => {
              const currentTheme = get().ui.theme;
              const newTheme = currentTheme === 'light' ? 'dark' : 'light';
              get().ui.setTheme(newTheme);
            },
            
            toggleSidebar: () => {
              set((state) => {
                state.ui.sidebarOpen = !state.ui.sidebarOpen;
              });
            },
            
            setSidebarOpen: (open: boolean) => {
              set((state) => {
                state.ui.sidebarOpen = open;
              });
            },
            
            setSidebarWidth: (width: number) => {
              set((state) => {
                state.ui.sidebarWidth = Math.max(200, Math.min(600, width));
              });
            },
            
            setChatInputHeight: (height: number) => {
              set((state) => {
                state.ui.chatInputHeight = Math.max(60, Math.min(300, height));
              });
            },
            
            setShowTyping: (show: boolean) => {
              set((state) => {
                state.ui.showTyping = show;
              });
            },
            
            openModal: (modalId: string) => {
              set((state) => {
                state.ui.activeModal = modalId;
              });
            },
            
            closeModal: () => {
              set((state) => {
                state.ui.activeModal = null;
              });
            },
            
            toggleTool: (toolId: string) => {
              set((state) => {
                const isSelected = state.ui.selectedTools.includes(toolId);
                if (isSelected) {
                  state.ui.selectedTools = state.ui.selectedTools.filter(id => id !== toolId);
                } else {
                  state.ui.selectedTools.push(toolId);
                }
              });
            },
            
            setSelectedTools: (tools: string[]) => {
              set((state) => {
                state.ui.selectedTools = tools;
              });
            },
            
            updatePreferences: (preferences: Partial<UIStore['preferences']>) => {
              set((state) => {
                state.ui.preferences = { ...state.ui.preferences, ...preferences };
              });
            },
            
            reset: () => {
              set((state) => {
                state.ui.theme = 'dark';
                state.ui.sidebarOpen = true;
                state.ui.sidebarWidth = 300;
                state.ui.chatInputHeight = 100;
                state.ui.showTyping = false;
                state.ui.activeModal = null;
                state.ui.selectedTools = [];
                state.ui.preferences = {
                  fontSize: 'base',
                  codeTheme: 'dark',
                  autoSave: true,
                  notifications: true,
                };
              });
            }
          },
          
          // Global actions
          resetAll: () => {
            set((state) => {
              // Reset all slices to initial state
              state.auth = {
                user: null,
                tokens: null,
                isLoading: false,
                error: null,
              } as any;
              
              state.session = {
                sessions: [],
                currentSession: null,
                isLoading: false,
                error: null,
              } as any;
              
              state.chat = {
                activeConversation: null,
                conversations: {},
                messageQueue: [],
                isProcessing: false,
                streamingMessage: null,
              } as any;
              
              state.canvas = {
                currentMode: 'markdown',
                content: {
                  id: generateId(),
                  mode: 'markdown',
                  title: 'Untitled',
                  content: '',
                  lastModified: new Date()
                },
                isEditing: false,
                isDirty: false,
                lastSaved: null,
                collaborativeSession: null,
                agentSuggestions: [],
              } as any;
              
              state.agentDeck = {
                availableAgents: [],
                selectedAgents: [],
                activeAgents: {},
                agentStatus: {},
                agentMetrics: {},
              } as any;
              
              state.upload = {
                uploads: {},
                isUploading: false,
                progress: {},
                errors: {},
              } as any;
              
              get().ui.reset();
            });
          },
          
          getState: () => get()
        })),
        {
          name: 'vana-unified-store',
          storage: createJSONStorage(() => safeLocalStorage()),
          // Selective persistence - only persist UI and session data
          partialize: (state) => ({
            ui: {
              theme: state.ui.theme,
              sidebarWidth: state.ui.sidebarWidth,
              preferences: state.ui.preferences,
              selectedTools: state.ui.selectedTools,
            },
            session: {
              sessions: state.session.sessions,
              currentSession: state.session.currentSession,
            },
            auth: {
              // Only persist user, not tokens (tokens are in localStorage via tokenManager)
              user: state.auth.user,
            }
          }),
          onRehydrateStorage: () => (state) => {
            // Initialize agents when store is rehydrated
            if (state?.agentDeck.availableAgents.length === 0) {
              state.agentDeck.loadAgents();
            }
            
            // Initialize theme
            if (state?.ui.theme) {
              state.ui.setTheme(state.ui.theme);
            }
          },
        }
      ),
      {
        name: 'unified-store'
      }
    )
  )
);

// Export individual selectors for optimal performance
export const useAuth = () => useUnifiedStore((state) => state.auth);
export const useSession = () => useUnifiedStore((state) => state.session);
export const useChat = () => useUnifiedStore((state) => state.chat);
export const useCanvas = () => useUnifiedStore((state) => state.canvas);
export const useAgentDeck = () => useUnifiedStore((state) => state.agentDeck);
export const useUpload = () => useUnifiedStore((state) => state.upload);
export const useUI = () => useUnifiedStore((state) => state.ui);

// Performance monitoring hook
export const useStorePerformance = () => {
  const [metrics, setMetrics] = React.useState({
    lastUpdateTime: 0,
    updateDuration: 0,
    updateCount: 0
  });

  React.useEffect(() => {
    const unsubscribe = useUnifiedStore.subscribe(
      (state) => state, // Watch entire state for any changes
      (_state, _prevState) => {
        const startTime = performance.now();
        
        // Measure update time
        const updateDuration = performance.now() - startTime;
        
        setMetrics(prev => ({
          lastUpdateTime: Date.now(),
          updateDuration,
          updateCount: prev.updateCount + 1
        }));
        
        // Warn if update takes longer than 50ms
        if (updateDuration > 50) {
          console.warn(`Store update took ${updateDuration.toFixed(2)}ms - exceeds 50ms target`);
        }
      }
    );
    
    return unsubscribe;
  }, []);
  
  return metrics;
};

// Import React for hooks
import * as React from 'react';