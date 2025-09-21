/**
 * useChatStream Hook - Chat message streaming with SSE integration
 * Connects PromptInput to backend research endpoints with real-time updates
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  ResearchRequest,
  AgentStatus,
  ResearchProgress,
  ChatMessage,
  SessionSummary,
} from '../lib/api/types';
import { apiClient } from '../lib/api/client';
import { useResearchSSE, useAgentNetworkSSE } from './useSSE';
import { useAuth } from './useAuth';
import { config } from '@/lib/env';

interface ChatStreamState {
  // Session management
  currentSessionId: string | null;
  sessions: Record<string, ChatSession>;
  
  // Actions
  createSession: () => string;
  setCurrentSession: (sessionId: string | null) => void;
  hydrateSessions: (sessions: ChatSession[]) => void;
  replaceMessages: (sessionId: string, messages: ChatMessage[]) => void;
  updateSessionMeta: (sessionId: string, updates: Partial<ChatSession>) => void;
  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, updater: (message: ChatMessage) => ChatMessage) => void;
  updateStreamingMessage: (sessionId: string, messageId: string, content: string) => void;
  completeStreamingMessage: (sessionId: string, messageId: string) => void;
  updateAgents: (sessionId: string, agents: AgentStatus[]) => void;
  updateProgress: (sessionId: string, progress: ResearchProgress) => void;
  setSessionStreaming: (sessionId: string, streaming: boolean) => void;
  setSessionError: (sessionId: string, error: string | null) => void;
  clearSession: (sessionId: string) => void;
  clearAllSessions: () => void;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  agents: AgentStatus[];
  progress: ResearchProgress | null;
  isStreaming: boolean;
  error: string | null;
  created_at: string;
  updated_at: string;
  status?: string;
  title?: string | null;
  historyLoaded: boolean;
  user_id?: number | null;
  final_report?: string | null;
  current_phase?: string | null;
  overallProgress?: number | null;
}

function summaryToChatSession(summary: SessionSummary): ChatSession {
  return {
    id: summary.id,
    messages: [],
    agents: [],
    progress: null,
    isStreaming: false,
    error: summary.error ?? null,
    created_at: summary.created_at,
    updated_at: summary.updated_at,
    status: summary.status,
    title: summary.title ?? null,
    historyLoaded: false,
    user_id: summary.user_id ?? null,
    final_report: summary.final_report ?? null,
    current_phase: summary.current_phase ?? null,
    overallProgress: summary.progress ?? null,
  };
}

const chatStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  return config.chat.persistSessions ? window.localStorage : window.sessionStorage;
};

/**
 * Zustand store for chat sessions
 */
export const useChatStore = create<ChatStreamState>()(
  persist(
    (set) => ({
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
          historyLoaded: true,
          status: 'pending',
        };

        set(state => ({
          sessions: { ...state.sessions, [sessionId]: newSession },
          currentSessionId: sessionId,
        }));

        return sessionId;
      },

      setCurrentSession: (sessionId: string | null) => {
        set({ currentSessionId: sessionId });
      },

      hydrateSessions: (sessions: ChatSession[]) => {
        if (!sessions.length) return;

        set(state => {
          const merged = { ...state.sessions };
          sessions.forEach(session => {
            const existing = merged[session.id];
            if (existing) {
              merged[session.id] = {
                ...existing,
                ...session,
                messages: existing.messages.length ? existing.messages : session.messages ?? [],
                historyLoaded: existing.historyLoaded || Boolean(session.historyLoaded),
              };
            } else {
              merged[session.id] = {
                ...session,
                agents: session.agents ?? [],
                progress: session.progress ?? null,
                messages: session.messages ?? [],
                isStreaming: false,
                error: session.error ?? null,
                historyLoaded: Boolean(session.historyLoaded),
              };
            }
          });

          return { sessions: merged };
        });
      },

      replaceMessages: (sessionId: string, messages: ChatMessage[]) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const updated_at = messages.length
            ? messages[messages.length - 1].timestamp
            : new Date().toISOString();

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messages,
                historyLoaded: true,
                updated_at,
              },
            },
          };
        });
      },

      updateSessionMeta: (sessionId: string, updates: Partial<ChatSession>) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const nextUpdatedAt = updates.updated_at ?? session.updated_at;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                ...updates,
                updated_at: nextUpdatedAt,
              },
            },
          };
        });
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
                updated_at: message.timestamp || new Date().toISOString(),
                historyLoaded: true,
              },
            },
          };
        });
      },

      updateMessage: (sessionId: string, messageId: string, updater: (message: ChatMessage) => ChatMessage) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const messages = session.messages.map(msg => (msg.id === messageId ? updater(msg) : msg));

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

      updateStreamingMessage: (sessionId: string, messageId: string, content: string) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const timestamp = new Date().toISOString();
          const messages = session.messages.map(msg =>
            msg.id === messageId ? { ...msg, content, timestamp } : msg
          );

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messages,
                updated_at: timestamp,
              },
            },
          };
        });
      },

      completeStreamingMessage: (sessionId: string, messageId: string) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const timestamp = new Date().toISOString();
          const messages = session.messages.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  metadata: { ...msg.metadata, completed: true },
                  timestamp,
                }
              : msg
          );

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messages,
                isStreaming: false,
                updated_at: timestamp,
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
                agents,
                updated_at: new Date().toISOString(),
              },
            },
          };
        });
      },

      updateProgress: (sessionId: string, progress: ResearchProgress) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                progress,
                overallProgress: progress.overall_progress,
                current_phase: progress.current_phase,
                updated_at: new Date().toISOString(),
              },
            },
          };
        });
      },

      setSessionStreaming: (sessionId: string, streaming: boolean) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                isStreaming: streaming,
                updated_at: new Date().toISOString(),
              },
            },
          };
        });
      },

      setSessionError: (sessionId: string, error: string | null) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                error,
                updated_at: new Date().toISOString(),
              },
            },
          };
        });
      },

      clearSession: (sessionId: string) => {
        set(state => {
          if (!state.sessions[sessionId]) {
            return state;
          }

          const remainingSessions = { ...state.sessions };
          delete remainingSessions[sessionId];
          return {
            sessions: remainingSessions,
            currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
          };
        });
      },

      clearAllSessions: () => {
        set({ sessions: {}, currentSessionId: null });
      },
    }),
    {
      name: 'vana-chat-sessions',
      storage: createJSONStorage(chatStorage),
      partialize: state => ({
        currentSessionId: state.currentSessionId,
        sessions: state.sessions,
      }),
    }
  )
);

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
  switchSession: (sessionId: string | null) => void;
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
  const { autoCreateSession = false } = options;

  const { isAuthenticated } = useAuth();
  const hasAuthToken = isAuthenticated && apiClient.isAuthenticated();
  const currentSessionId = useChatStore(state => state.currentSessionId);
  const sessions = useChatStore(state => state.sessions);
  const createSessionInStore = useChatStore(state => state.createSession);
  const setCurrentSessionInStore = useChatStore(state => state.setCurrentSession);
  const hydrateSessionsInStore = useChatStore(state => state.hydrateSessions);
  const replaceMessagesInStore = useChatStore(state => state.replaceMessages);
  const updateSessionMetaInStore = useChatStore(state => state.updateSessionMeta);
  const addMessageInStore = useChatStore(state => state.addMessage);
  const updateStreamingMessageInStore = useChatStore(state => state.updateStreamingMessage);
  const completeStreamingMessageInStore = useChatStore(state => state.completeStreamingMessage);
  const updateAgentsInStore = useChatStore(state => state.updateAgents);
  const updateProgressInStore = useChatStore(state => state.updateProgress);
  const setSessionStreamingInStore = useChatStore(state => state.setSessionStreaming);
  const setSessionErrorInStore = useChatStore(state => state.setSessionError);
  const clearSessionInStore = useChatStore(state => state.clearSession);

  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedServerSessions, setHasLoadedServerSessions] = useState(false);

  const currentSession = currentSessionId ? sessions[currentSessionId] : null;

  const ensureSessionHistory = useCallback(
    async (sessionId: string) => {
      const state = useChatStore.getState();
      const session = state.sessions[sessionId];
      if (!session || session.historyLoaded || session.messages.length > 0) {
        return;
      }

      try {
        const detail = await apiClient.getSession(sessionId);
        const messages = (detail.messages ?? []).map(message => ({
          ...message,
          sessionId,
        }));

        replaceMessagesInStore(sessionId, messages);
        updateSessionMetaInStore(sessionId, {
          title: detail.title ?? session.title ?? null,
          status: detail.status ?? session.status,
          final_report: detail.final_report ?? session.final_report,
          current_phase: detail.current_phase ?? session.current_phase,
          overallProgress: detail.progress ?? session.overallProgress ?? null,
          user_id: detail.user_id ?? session.user_id,
          updated_at: detail.updated_at ?? session.updated_at,
          created_at: detail.created_at ?? session.created_at,
          historyLoaded: true,
        });
      } catch (err) {
        console.warn(`Failed to load history for session ${sessionId}`, err);
        updateSessionMetaInStore(sessionId, { historyLoaded: true });
      }
    },
    [replaceMessagesInStore, updateSessionMetaInStore]
  );
  
  // Auto-create session if needed
  useEffect(() => {
    if (autoCreateSession && !currentSessionId) {
      createSessionInStore();
    }
  }, [autoCreateSession, currentSessionId, createSessionInStore]);

  useEffect(() => {
    if (hasLoadedServerSessions || !isAuthenticated) {
      return;
    }

    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const loadSessions = async () => {
      try {
        if (!apiClient.isAuthenticated()) {
          return;
        }

        const summaries = await apiClient.listSessions();
        if (!cancelled) {
          hydrateSessionsInStore(summaries.map(summaryToChatSession));
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('Failed to load session history from API', err);
        }
      } finally {
        if (!cancelled) {
          setHasLoadedServerSessions(true);
        }
      }
    };

    const invokeLoad = () => {
      if (!cancelled) {
        void loadSessions();
      }
    };

    if (typeof window === 'undefined') {
      invokeLoad();
      return () => {
        cancelled = true;
      };
    }

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleHandle = idleWindow.requestIdleCallback(() => {
        idleHandle = null;
        invokeLoad();
      }, { timeout: 1500 });
    } else {
      timeoutHandle = window.setTimeout(() => {
        timeoutHandle = null;
        invokeLoad();
      }, 0);
    }

    return () => {
      cancelled = true;
      if (idleHandle !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
      }
    };
  }, [hasLoadedServerSessions, hydrateSessionsInStore, isAuthenticated]);

  // Memoize SSE options to prevent infinite re-renders
  const sseOptions = useMemo(() => ({
    autoReconnect: true,
    maxReconnectAttempts: 5,
    enabled: Boolean(currentSessionId) && hasAuthToken,
  }), [currentSessionId, hasAuthToken]);

  // SSE connections for research and agent updates
  const researchSSE = useResearchSSE(currentSessionId || '', sseOptions);
  const agentSSE = useAgentNetworkSSE(currentSessionId || '', sseOptions);

  // Use refs to avoid dependency issues in cleanup
  const researchSSERef = useRef(researchSSE);
  const agentSSERef = useRef(agentSSE);
  researchSSERef.current = researchSSE;
  agentSSERef.current = agentSSE;

  // Cleanup SSE connections on unmount or sessionId change
  useEffect(() => {
    return () => {
      researchSSERef.current.disconnect();
      agentSSERef.current.disconnect();
    };
  }, [currentSessionId]);

  useEffect(() => {
    if (currentSessionId) {
      void ensureSessionHistory(currentSessionId);
    }
  }, [currentSessionId, ensureSessionHistory]);
  // Handle SSE events for research progress
  useEffect(() => {
    if (!researchSSE.lastEvent || !currentSessionId) return;

    const { type, data } = researchSSE.lastEvent;
    const payload = (data ?? {}) as Record<string, any>;
    const session = currentSession;
    if (!session) return;

    const progressMessage = session.messages.find(
      msg => msg.role === 'assistant' && msg.metadata?.kind === 'assistant-progress'
    );

    const ensureProgressMessage = () => {
      if (progressMessage) return progressMessage.id;

      const messageId = `msg_${uuidv4()}_assistant_progress`;
      const placeholder: ChatMessage = {
        id: messageId,
        content: 'Preparing research response...'
          ,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
        metadata: { kind: 'assistant-progress' },
      };
      addMessageInStore(currentSessionId, placeholder);
      return messageId;
    };

    const formatProgressContent = () => {
      const phase = payload.current_phase ?? session.progress?.current_phase ?? 'Processing';
      const progressValue = typeof payload.overall_progress === 'number'
        ? Math.round((payload.overall_progress <= 1 ? payload.overall_progress * 100 : payload.overall_progress))
        : undefined;

      const lines: string[] = [`**${phase}**`];
      if (typeof progressValue === 'number') {
        lines.push(`Progress: ${Math.min(100, Math.max(0, progressValue))}%`);
      }

      if (payload && typeof payload.partial_results === 'object' && payload.partial_results !== null) {
        const previewEntries = Object.entries(payload.partial_results).slice(0, 2);
        if (previewEntries.length > 0) {
          lines.push(
            previewEntries
              .map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
              .join('\n')
          );
        }
      }

      return lines.join('\n\n');
    };

    const mergeProgressSnapshot = (overrides: Partial<ResearchProgress>) => {
      const previous = session.progress;
      const progress: ResearchProgress = {
        session_id: currentSessionId,
        status: overrides.status ?? previous?.status ?? 'running',
        overall_progress: overrides.overall_progress ?? previous?.overall_progress ?? 0,
        current_phase: overrides.current_phase ?? previous?.current_phase ?? 'Processing',
        agents: overrides.agents ?? previous?.agents ?? [],
        partial_results: overrides.partial_results ?? previous?.partial_results,
        final_report: overrides.final_report ?? previous?.final_report,
        error: overrides.error ?? previous?.error,
        started_at: previous?.started_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      updateProgressInStore(currentSessionId, progress);
      updateSessionMetaInStore(currentSessionId, {
        status: progress.status,
        current_phase: progress.current_phase,
        overallProgress: progress.overall_progress,
        final_report: progress.final_report ?? session.final_report ?? null,
        error: progress.error ?? session.error ?? null,
      });
    };

    switch (type) {
      case 'research_started': {
        const messageId = ensureProgressMessage();
        updateStreamingMessageInStore(
          currentSessionId,
          messageId,
          'Research session acknowledged. Coordinating agent network...'
        );
        setSessionStreamingInStore(currentSessionId, true);
        break;
      }
      case 'research_progress': {
        const messageId = ensureProgressMessage();
        updateStreamingMessageInStore(currentSessionId, messageId, formatProgressContent());

        mergeProgressSnapshot({
          status: payload.status ?? 'running',
          overall_progress: typeof payload.overall_progress === 'number'
            ? (payload.overall_progress <= 1 ? payload.overall_progress : payload.overall_progress / 100)
            : undefined,
          current_phase: payload.current_phase,
          partial_results: payload.partial_results,
          agents: Array.isArray(payload.agents) ? payload.agents : undefined,
        });

        setSessionStreamingInStore(currentSessionId, true);
        break;
      }
      case 'research_complete': {
        const messageId = ensureProgressMessage();
        const finalReport = payload.final_report || 'Research complete. (No report returned)';

        updateStreamingMessageInStore(currentSessionId, messageId, finalReport);
        completeStreamingMessageInStore(currentSessionId, messageId);
        setSessionStreamingInStore(currentSessionId, false);
        mergeProgressSnapshot({
          status: 'completed',
          overall_progress: 1,
          current_phase: payload.current_phase ?? 'Research complete',
          final_report: finalReport,
        });
        setIsStreaming(false);
        break;
      }
      case 'error': {
        const messageId = ensureProgressMessage();
        const message = payload.message || payload.error || 'An error occurred during research.';
        updateStreamingMessageInStore(currentSessionId, messageId, `Error: ${message}`);
        completeStreamingMessageInStore(currentSessionId, messageId);
        setSessionStreamingInStore(currentSessionId, false);
        mergeProgressSnapshot({ status: 'error', error: message });
        setError(message);
        setIsStreaming(false);
        break;
      }
      case 'connection': {
        if (payload.status === 'disconnected') {
          setSessionStreamingInStore(currentSessionId, false);
          setIsStreaming(false);
        }
        break;
      }
      default:
        break;
    }
  }, [
    researchSSE.lastEvent,
    currentSessionId,
    currentSession,
    addMessageInStore,
    updateProgressInStore,
    updateSessionMetaInStore,
    updateStreamingMessageInStore,
    setSessionStreamingInStore,
    completeStreamingMessageInStore,
    setSessionErrorInStore,
  ]);

  // Handle SSE events for agent coordination
  useEffect(() => {
    if (!agentSSE.lastEvent || !currentSessionId) return;

    const event = agentSSE.lastEvent;
    
    if (event.type === 'agent_network_update' && event.data.agents) {
      // Update agent status in current session using store action
      updateAgentsInStore(currentSessionId, event.data.agents);
    }
  }, [agentSSE.lastEvent, currentSessionId]);

  // Send message and start research
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSessionId || !content.trim()) return;

    setError(null);

    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: `msg_${uuidv4()}_user`,
        content: content.trim(),
        role: 'user',
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
      };

      addMessageInStore(currentSessionId, userMessage);

      // Add initial assistant message for streaming
      const assistantMessageId = `msg_${uuidv4()}_assistant`;
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        content: 'Initializing research pipeline...',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
        metadata: { kind: 'assistant-progress' },
      };

      addMessageInStore(currentSessionId, assistantMessage);
      updateSessionMetaInStore(currentSessionId, {
        title: currentSession?.title ?? userMessage.content.slice(0, 60),
        status: 'running',
      });
      setSessionStreamingInStore(currentSessionId, true);
      setIsStreaming(true);
      setSessionErrorInStore(currentSessionId, null);

      // Start research via API
      const researchRequest: ResearchRequest = {
        query: content,
        message: content,
      };

      if (!apiClient.isAuthenticated()) {
        // Fallback to local response when not authenticated
        setTimeout(() => {
          updateStreamingMessageInStore(
            currentSessionId,
            assistantMessageId,
            `I received your request: "${content}". Connect your Vana backend to stream live multi-agent research results.`
          );
          completeStreamingMessageInStore(currentSessionId, assistantMessageId);
          setSessionStreamingInStore(currentSessionId, false);
          setIsStreaming(false);
        }, 600);
        return;
      }

      try {
        await apiClient.appendSessionMessage(currentSessionId, userMessage);
      } catch (appendError) {
        console.warn('Failed to persist user message', appendError);
      }

      const response = await apiClient.startResearch(currentSessionId, researchRequest);
      
      if (!response.success) {
        throw new Error(response.message || 'Failed to start research');
      }

      console.log('Research started:', response);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setIsStreaming(false);
      setSessionErrorInStore(currentSessionId, errorMessage);
      
      // Add error message
      const errorMsg: ChatMessage = {
        id: `msg_${uuidv4()}_error`,
        content: `Error: ${errorMessage}`,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
      };

      addMessageInStore(currentSessionId, errorMsg);
      setSessionStreamingInStore(currentSessionId, false);
    }
  }, [
    currentSessionId,
    addMessageInStore,
    setSessionStreamingInStore,
    setSessionErrorInStore,
    updateSessionMetaInStore,
  ]);

  // Create new session
  const createNewSession = useCallback(() => {
    return createSessionInStore();
  }, [createSessionInStore]);

  // Switch to different session
  const switchSession = useCallback((sessionId: string | null) => {
    setCurrentSessionInStore(sessionId);
    if (sessionId) {
      void ensureSessionHistory(sessionId);
    }
  }, [setCurrentSessionInStore, ensureSessionHistory]);

  // Clear current session
  const clearCurrentSession = useCallback(() => {
    if (currentSessionId) {
      clearSessionInStore(currentSessionId);
    }
  }, [currentSessionId, clearSessionInStore]);

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
    return Object.values(sessions).sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [sessions]);

  // Get session by ID
  const getSessionById = useCallback((sessionId: string) => {
    return sessions[sessionId] || null;
  }, [sessions]);

  // Memoize connection management functions
  const connectSSE = useCallback(() => {
    researchSSE.connect();
    agentSSE.connect();
  }, [researchSSE.connect, agentSSE.connect]);

  const disconnectSSE = useCallback(() => {
    researchSSE.disconnect();
    agentSSE.disconnect();
  }, [researchSSE.disconnect, agentSSE.disconnect]);

  return useMemo(() => ({
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
    connect: connectSSE,
    disconnect: disconnectSSE,
    
    // Helpers
    getAllSessions,
    getSessionById,
  }), [
    currentSession,
    currentSessionId,
    isStreaming,
    researchSSE.connectionState,
    researchSSE.isConnected,
    researchSSE.error,
    agentSSE.isConnected,
    agentSSE.error,
    error,
    sendMessage,
    createNewSession,
    switchSession,
    clearCurrentSession,
    retryLastMessage,
    getAllSessions,
    getSessionById,
    connectSSE,
    disconnectSSE,
  ]);
}
