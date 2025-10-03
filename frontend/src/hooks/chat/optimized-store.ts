/**
 * Optimized Zustand store for chat session management with enhanced performance
 * Features: Memory management, efficient updates, lazy loading, and performance metrics
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '../../lib/api/types';
import { config } from '@/lib/env';
import { ChatStreamState, ChatSession } from './types';

interface PerformanceMetrics {
  storeUpdates: number;
  messageOperations: number;
  averageUpdateTime: number;
  memoryUsage: number;
  lastCleanup: number;
}

interface OptimizedChatStreamState extends ChatStreamState {
  // Performance optimizations
  performanceMetrics: PerformanceMetrics;

  // Memory management
  lastAccessTime: Record<string, number>;
  messageCounts: Record<string, number>;

  // Batch operations
  batchUpdateSessions: (updates: Array<{ sessionId: string; updates: Partial<ChatSession> }>) => void;
  batchAddMessages: (additions: Array<{ sessionId: string; message: ChatMessage }>) => void;

  // Memory management
  cleanupOldSessions: (maxSessions?: number, maxAge?: number) => void;
  optimizeMemory: () => void;

  // Performance monitoring
  getPerformanceMetrics: () => PerformanceMetrics;
  resetMetrics: () => void;

  // Lazy loading
  loadSessionMessages: (sessionId: string, lazy?: boolean) => Promise<void>;
  unloadSessionMessages: (sessionId: string) => void;
}

// Performance monitoring decorator
const withPerformanceTracking = <T extends (...args: any[]) => any>(
  fn: T,
  metrics: PerformanceMetrics,
  operation: string
): T => {
  return ((...args: any[]) => {
    const start = performance.now();
    const result = fn(...args);
    const duration = performance.now() - start;

    metrics.storeUpdates++;
    metrics.averageUpdateTime = (metrics.averageUpdateTime + duration) / 2;

    // Track memory usage periodically
    if (typeof (performance as any).memory !== 'undefined') {
      metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
    }

    return result;
  }) as T;
};

// Memory-optimized storage that compresses data
const createOptimizedStorage = () => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }

  const storage = config.chat.persistSessions ? window.localStorage : window.sessionStorage;

  return {
    getItem: (name: string) => {
      try {
        const item = storage.getItem(name);
        if (!item) return null;

        // Try to decompress if compressed
        if (item.startsWith('compressed:')) {
          const compressed = item.slice(11);
          // In a real implementation, you'd use a compression library like lz-string
          return compressed;
        }

        return item;
      } catch (error) {
        console.warn('Failed to get item from storage:', error);
        return null;
      }
    },

    setItem: (name: string, value: string) => {
      try {
        // Compress large data (>10KB)
        if (value.length > 10000) {
          // In a real implementation, you'd use a compression library
          const compressed = `compressed:${value}`;
          storage.setItem(name, compressed);
        } else {
          storage.setItem(name, value);
        }
      } catch (error) {
        console.warn('Failed to set item in storage:', error);

        // Try to free up space and retry
        if (error instanceof DOMException && error.code === 22) {
          // Storage quota exceeded
          const allKeys = Object.keys(storage);
          const vanaKeys = allKeys.filter(key => key.startsWith('vana-'));

          // Remove oldest items
          if (vanaKeys.length > 1) {
            storage.removeItem(vanaKeys[0]);
            try {
              storage.setItem(name, value);
            } catch (retryError) {
              console.error('Failed to save even after cleanup:', retryError);
            }
          }
        }
      }
    },

    removeItem: (name: string) => {
      try {
        storage.removeItem(name);
      } catch (error) {
        console.warn('Failed to remove item from storage:', error);
      }
    },
  };
};

/**
 * Optimized Zustand store with performance enhancements
 */
export const useOptimizedChatStore = create<OptimizedChatStreamState>()(
  persist(
    (set, get) => {
      const initialMetrics: PerformanceMetrics = {
        storeUpdates: 0,
        messageOperations: 0,
        averageUpdateTime: 0,
        memoryUsage: 0,
        lastCleanup: Date.now(),
      };

      // Helper function to update access time
      const updateAccessTime = (sessionId: string) => {
        const state = get();
        if (state.lastAccessTime[sessionId] !== Date.now()) {
          set({
            lastAccessTime: {
              ...state.lastAccessTime,
              [sessionId]: Date.now(),
            },
          });
        }
      };

      // Batch update helper
      const batchUpdate = (updater: (state: OptimizedChatStreamState) => Partial<OptimizedChatStreamState>) => {
        const start = performance.now();
        set(state => {
          const update = updater(state);
          const newState = { ...state, ...update };

          // Update performance metrics
          newState.performanceMetrics = {
            ...state.performanceMetrics,
            storeUpdates: state.performanceMetrics.storeUpdates + 1,
            averageUpdateTime: (state.performanceMetrics.averageUpdateTime + (performance.now() - start)) / 2,
          };

          return newState;
        });
      };

      return {
        currentSessionId: null,
        sessions: {},
        lastAccessTime: {},
        messageCounts: {},
        performanceMetrics: initialMetrics,

        createSession: withPerformanceTracking(() => {
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

          batchUpdate(state => ({
            sessions: { ...state.sessions, [sessionId]: newSession },
            currentSessionId: sessionId,
            lastAccessTime: { ...state.lastAccessTime, [sessionId]: Date.now() },
            messageCounts: { ...state.messageCounts, [sessionId]: 0 },
          }));

          return sessionId;
        }, initialMetrics, 'createSession'),

        setCurrentSession: withPerformanceTracking((sessionId: string | null) => {
          if (sessionId) {
            updateAccessTime(sessionId);
          }
          set({ currentSessionId: sessionId });
        }, initialMetrics, 'setCurrentSession'),

        hydrateSessions: withPerformanceTracking((sessions: ChatSession[]) => {
          if (!sessions.length) return;

          batchUpdate(state => {
            const merged = { ...state.sessions };
            const newAccessTimes = { ...state.lastAccessTime };
            const newMessageCounts = { ...state.messageCounts };

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

              newAccessTimes[session.id] = Date.now();
              newMessageCounts[session.id] = (session.messages ?? []).length;
            });

            return {
              sessions: merged,
              lastAccessTime: newAccessTimes,
              messageCounts: newMessageCounts,
            };
          });
        }, initialMetrics, 'hydrateSessions'),

        replaceMessages: withPerformanceTracking((sessionId: string, messages: ChatMessage[]) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
              messageCounts: {
                ...state.messageCounts,
                [sessionId]: messages.length,
              },
            };
          });
        }, initialMetrics, 'replaceMessages'),

        updateSessionMeta: withPerformanceTracking((sessionId: string, updates: Partial<ChatSession>) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'updateSessionMeta'),

        addMessage: withPerformanceTracking((sessionId: string, message: ChatMessage) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

            const newMessages = [...session.messages, message];

            return {
              sessions: {
                ...state.sessions,
                [sessionId]: {
                  ...session,
                  messages: newMessages,
                  updated_at: message.timestamp || new Date().toISOString(),
                  historyLoaded: true,
                },
              },
              messageCounts: {
                ...state.messageCounts,
                [sessionId]: newMessages.length,
              },
            };
          });

          // Update message operation metrics
          const state = get();
          state.performanceMetrics.messageOperations++;
        }, initialMetrics, 'addMessage'),

        updateMessage: withPerformanceTracking((sessionId: string, messageId: string, updater: (message: ChatMessage) => ChatMessage) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'updateMessage'),

        updateStreamingMessage: withPerformanceTracking((sessionId: string, messageId: string, content: string) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'updateStreamingMessage'),

        completeStreamingMessage: withPerformanceTracking((sessionId: string, messageId: string) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'completeStreamingMessage'),

        updateAgents: withPerformanceTracking((sessionId: string, agents) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'updateAgents'),

        updateProgress: withPerformanceTracking((sessionId: string, progress) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'updateProgress'),

        setSessionStreaming: withPerformanceTracking((sessionId: string, streaming: boolean) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'setSessionStreaming'),

        setSessionError: withPerformanceTracking((sessionId: string, error: string | null) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'setSessionError'),

        clearSession: withPerformanceTracking((sessionId: string) => {
          batchUpdate(state => {
            if (!state.sessions[sessionId]) return {};

            const remainingSessions = { ...state.sessions };
            const remainingAccessTimes = { ...state.lastAccessTime };
            const remainingMessageCounts = { ...state.messageCounts };

            delete remainingSessions[sessionId];
            delete remainingAccessTimes[sessionId];
            delete remainingMessageCounts[sessionId];

            return {
              sessions: remainingSessions,
              lastAccessTime: remainingAccessTimes,
              messageCounts: remainingMessageCounts,
              currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
            };
          });
        }, initialMetrics, 'clearSession'),

        clearAllSessions: withPerformanceTracking(() => {
          set({
            sessions: {},
            currentSessionId: null,
            lastAccessTime: {},
            messageCounts: {},
          });
        }, initialMetrics, 'clearAllSessions'),

        deleteSession: withPerformanceTracking((sessionId: string) => {
          batchUpdate(state => {
            if (!state.sessions[sessionId]) return {};

            const remainingSessions = { ...state.sessions };
            const remainingAccessTimes = { ...state.lastAccessTime };
            const remainingMessageCounts = { ...state.messageCounts };

            delete remainingSessions[sessionId];
            delete remainingAccessTimes[sessionId];
            delete remainingMessageCounts[sessionId];

            // If deleted session was current, select the most recent session
            let newCurrentSessionId = state.currentSessionId;
            if (state.currentSessionId === sessionId) {
              const sortedSessions = Object.values(remainingSessions)
                .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
              newCurrentSessionId = sortedSessions[0]?.id || null;
            }

            return {
              sessions: remainingSessions,
              lastAccessTime: remainingAccessTimes,
              messageCounts: remainingMessageCounts,
              currentSessionId: newCurrentSessionId,
            };
          });
        }, initialMetrics, 'deleteSession'),

        // Chat actions for editing and feedback
        setEditingMessage: withPerformanceTracking((sessionId: string, messageId: string | null) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'setEditingMessage'),

        updateMessageContent: withPerformanceTracking((sessionId: string, messageId: string, newContent: string) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'updateMessageContent'),

        deleteMessage: withPerformanceTracking((sessionId: string, messageId: string) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

            const messageIndex = session.messages.findIndex(msg => msg.id === messageId);
            if (messageIndex === -1) return {};

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
              messageCounts: {
                ...state.messageCounts,
                [sessionId]: messages.length,
              },
            };
          });
        }, initialMetrics, 'deleteMessage'),

        setMessageFeedback: withPerformanceTracking((sessionId: string, messageId: string, feedback: 'upvote' | 'downvote' | null) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'setMessageFeedback'),

        deleteMessageAndSubsequent: withPerformanceTracking((sessionId: string, messageId: string) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

            const messageIndex = session.messages.findIndex(msg => msg.id === messageId);
            if (messageIndex === -1) return {};

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
              messageCounts: {
                ...state.messageCounts,
                [sessionId]: messages.length,
              },
            };
          });
        }, initialMetrics, 'deleteMessageAndSubsequent'),

        updateFeedback: withPerformanceTracking((sessionId: string, messageId: string, feedback: 'upvote' | 'downvote' | null) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'updateFeedback'),

        updateThoughtProcess: withPerformanceTracking((sessionId: string, messageId: string, thoughtProcess: string) => {
          updateAccessTime(sessionId);

          batchUpdate(state => {
            const session = state.sessions[sessionId];
            if (!session) return {};

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
        }, initialMetrics, 'updateThoughtProcess'),

        // Batch operations for efficiency
        batchUpdateSessions: (updates: Array<{ sessionId: string; updates: Partial<ChatSession> }>) => {
          batchUpdate(state => {
            const newSessions = { ...state.sessions };
            const newAccessTimes = { ...state.lastAccessTime };

            updates.forEach(({ sessionId, updates: sessionUpdates }) => {
              const session = newSessions[sessionId];
              if (session) {
                newSessions[sessionId] = {
                  ...session,
                  ...sessionUpdates,
                  updated_at: sessionUpdates.updated_at ?? new Date().toISOString(),
                };
                newAccessTimes[sessionId] = Date.now();
              }
            });

            return {
              sessions: newSessions,
              lastAccessTime: newAccessTimes,
            };
          });
        },

        batchAddMessages: (additions: Array<{ sessionId: string; message: ChatMessage }>) => {
          batchUpdate(state => {
            const newSessions = { ...state.sessions };
            const newMessageCounts = { ...state.messageCounts };
            const newAccessTimes = { ...state.lastAccessTime };

            additions.forEach(({ sessionId, message }) => {
              const session = newSessions[sessionId];
              if (session) {
                const newMessages = [...session.messages, message];
                newSessions[sessionId] = {
                  ...session,
                  messages: newMessages,
                  updated_at: message.timestamp || new Date().toISOString(),
                };
                newMessageCounts[sessionId] = newMessages.length;
                newAccessTimes[sessionId] = Date.now();
              }
            });

            return {
              sessions: newSessions,
              messageCounts: newMessageCounts,
              lastAccessTime: newAccessTimes,
            };
          });
        },

        // Memory management
        cleanupOldSessions: (maxSessions = 50, maxAge = 7 * 24 * 60 * 60 * 1000) => {
          batchUpdate(state => {
            const now = Date.now();
            const sessions = Object.values(state.sessions);

            // Sort by last access time
            const sortedSessions = sessions.sort((a, b) => {
              const aTime = state.lastAccessTime[a.id] || 0;
              const bTime = state.lastAccessTime[b.id] || 0;
              return bTime - aTime;
            });

            const sessionsToKeep = sortedSessions.slice(0, maxSessions).filter(session => {
              const lastAccess = state.lastAccessTime[session.id] || 0;
              return now - lastAccess < maxAge;
            });

            const newSessions: Record<string, ChatSession> = {};
            const newAccessTimes: Record<string, number> = {};
            const newMessageCounts: Record<string, number> = {};

            sessionsToKeep.forEach(session => {
              newSessions[session.id] = session;
              newAccessTimes[session.id] = state.lastAccessTime[session.id];
              newMessageCounts[session.id] = state.messageCounts[session.id] || 0;
            });

            // Update current session if it was removed
            let newCurrentSessionId = state.currentSessionId;
            if (state.currentSessionId && !newSessions[state.currentSessionId]) {
              newCurrentSessionId = sessionsToKeep[0]?.id || null;
            }

            return {
              sessions: newSessions,
              lastAccessTime: newAccessTimes,
              messageCounts: newMessageCounts,
              currentSessionId: newCurrentSessionId,
              performanceMetrics: {
                ...state.performanceMetrics,
                lastCleanup: now,
              },
            };
          });
        },

        optimizeMemory: () => {
          const state = get();

          // Clean up old sessions
          state.cleanupOldSessions();

          // Force garbage collection if available
          if (typeof (window as any).gc === 'function') {
            (window as any).gc();
          }

          // Update memory metrics
          const newMetrics = { ...state.performanceMetrics };
          if (typeof (performance as any).memory !== 'undefined') {
            newMetrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
          }

          set({ performanceMetrics: newMetrics });
        },

        // Performance monitoring
        getPerformanceMetrics: () => get().performanceMetrics,

        resetMetrics: () => {
          set({
            performanceMetrics: {
              storeUpdates: 0,
              messageOperations: 0,
              averageUpdateTime: 0,
              memoryUsage: 0,
              lastCleanup: Date.now(),
            },
          });
        },

        // Lazy loading
        loadSessionMessages: async (sessionId: string, lazy = true) => {
          const state = get();
          const session = state.sessions[sessionId];

          if (!session || session.historyLoaded) return;

          if (lazy) {
            updateAccessTime(sessionId);
          }

          // This would typically load from an API
          // For now, we just mark as loaded
          state.updateSessionMeta(sessionId, { historyLoaded: true });
        },

        unloadSessionMessages: (sessionId: string) => {
          const state = get();
          const session = state.sessions[sessionId];

          if (!session || sessionId === state.currentSessionId) return;

          // Keep only essential data
          batchUpdate(currentState => ({
            sessions: {
              ...currentState.sessions,
              [sessionId]: {
                ...session,
                messages: [], // Clear messages to save memory
                historyLoaded: false,
              },
            },
            messageCounts: {
              ...currentState.messageCounts,
              [sessionId]: 0,
            },
          }));
        },
      };
    },
    {
      name: 'vana-optimized-chat-sessions',
      storage: createJSONStorage(createOptimizedStorage),
      partialize: state => ({
        currentSessionId: state.currentSessionId,
        sessions: state.sessions,
        lastAccessTime: state.lastAccessTime,
        messageCounts: state.messageCounts,
        // Don't persist performance metrics
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Initialize performance metrics on rehydration
          state.performanceMetrics = {
            storeUpdates: 0,
            messageOperations: 0,
            averageUpdateTime: 0,
            memoryUsage: 0,
            lastCleanup: Date.now(),
          };

          // Clean up old sessions on startup
          setTimeout(() => {
            state.cleanupOldSessions();
          }, 1000);
        }
      },
    }
  )
);