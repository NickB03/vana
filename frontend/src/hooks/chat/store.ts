/**
 * Zustand store for chat session management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '../../lib/api/types';
import { config } from '@/lib/env';
import { ChatStreamState, ChatSession } from './types';

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
          editingMessageId: null,
          messagesFeedback: {},
          thoughtProcesses: {},
          regeneratingMessageId: null,
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
                thoughtProcesses: existing.thoughtProcesses || session.thoughtProcesses || {},
                regeneratingMessageId: existing.regeneratingMessageId || session.regeneratingMessageId || null,
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
                editingMessageId: session.editingMessageId ?? null,
                messagesFeedback: session.messagesFeedback ?? {},
                thoughtProcesses: session.thoughtProcesses ?? {},
                regeneratingMessageId: session.regeneratingMessageId ?? null,
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

      updateAgents: (sessionId: string, agents) => {
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

      updateProgress: (sessionId: string, progress) => {
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

      deleteSession: (sessionId: string) => {
        set(state => {
          if (!state.sessions[sessionId]) {
            return state;
          }

          const remainingSessions = { ...state.sessions };
          delete remainingSessions[sessionId];

          // If deleted session was current, select the most recent session
          let newCurrentSessionId = state.currentSessionId;
          if (state.currentSessionId === sessionId) {
            const sortedSessions = Object.values(remainingSessions)
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            newCurrentSessionId = sortedSessions[0]?.id || null;
          }

          return {
            sessions: remainingSessions,
            currentSessionId: newCurrentSessionId,
          };
        });
      },

      // Chat actions for editing and feedback
      setEditingMessage: (sessionId: string, messageId: string | null) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                editingMessageId: messageId,
                updated_at: new Date().toISOString(),
              },
            },
          };
        });
      },

      updateMessageContent: (sessionId: string, messageId: string, newContent: string) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const messages = session.messages.map(msg =>
            msg.id === messageId
              ? { ...msg, content: newContent, timestamp: new Date().toISOString() }
              : msg
          );

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messages,
                editingMessageId: null,
                updated_at: new Date().toISOString(),
              },
            },
          };
        });
      },

      deleteMessage: (sessionId: string, messageId: string) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const messageIndex = session.messages.findIndex(msg => msg.id === messageId);
          if (messageIndex === -1) return state;

          // Remove the message and all subsequent messages
          const messages = session.messages.slice(0, messageIndex);

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

      setMessageFeedback: (sessionId: string, messageId: string, feedback: 'upvote' | 'downvote' | null) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const currentFeedback = session.messagesFeedback || {};
          const updatedFeedback = {
            ...currentFeedback,
            [messageId]: feedback,
          };

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messagesFeedback: updatedFeedback,
                updated_at: new Date().toISOString(),
              },
            },
          };
        });
      },

      deleteMessageAndSubsequent: (sessionId: string, messageId: string) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const messageIndex = session.messages.findIndex(msg => msg.id === messageId);
          if (messageIndex === -1) return state;

          // Remove the message and all subsequent messages
          const messages = session.messages.slice(0, messageIndex);

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

      updateFeedback: (sessionId: string, messageId: string, feedback: 'upvote' | 'downvote' | null) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const currentFeedback = session.messagesFeedback || {};
          const updatedFeedback = {
            ...currentFeedback,
            [messageId]: feedback,
          };

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                messagesFeedback: updatedFeedback,
                updated_at: new Date().toISOString(),
              },
            },
          };
        });
      },

      updateThoughtProcess: (sessionId: string, messageId: string, thoughtProcess: string) => {
        set(state => {
          const session = state.sessions[sessionId];
          if (!session) return state;

          const currentThoughtProcesses = session.thoughtProcesses || {};
          const updatedThoughtProcesses = {
            ...currentThoughtProcesses,
            [messageId]: thoughtProcess,
          };

          return {
            sessions: {
              ...state.sessions,
              [sessionId]: {
                ...session,
                thoughtProcesses: updatedThoughtProcesses,
                updated_at: new Date().toISOString(),
              },
            },
          };
        });
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
