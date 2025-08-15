'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatSession, ChatMessage, SessionState } from '@/types/session';

interface SessionStore extends SessionState {
  // Actions
  createSession: (title?: string) => ChatSession;
  deleteSession: (sessionId: string) => void;
  selectSession: (sessionId: string) => void;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  updateSessionTitle: (sessionId: string, title: string) => void;
  clearSessions: () => void;
  exportSession: (sessionId: string) => ChatSession | null;
  importSession: (session: ChatSession) => void;
}

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

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      sessions: [],
      currentSession: null,
      isLoading: false,
      error: null,
      
      // Actions
      createSession: (title?: string) => {
        const newSession: ChatSession = {
          id: generateId(),
          title: title || 'New Chat',
          messages: [],
          created_at: Date.now(),
          updated_at: Date.now(),
        };
        
        set(state => ({
          sessions: [newSession, ...state.sessions],
          currentSession: newSession,
        }));
        
        return newSession;
      },
      
      deleteSession: (sessionId: string) => {
        set(state => {
          const filteredSessions = state.sessions.filter(s => s.id !== sessionId);
          const currentSession = state.currentSession?.id === sessionId 
            ? (filteredSessions[0] || null)
            : state.currentSession;
            
          return {
            sessions: filteredSessions,
            currentSession,
          };
        });
      },
      
      selectSession: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId);
        if (session) {
          set({ currentSession: session });
        }
      },
      
      addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        const newMessage: ChatMessage = {
          ...message,
          id: generateId(),
          timestamp: Date.now(),
        };
        
        set(state => {
          if (!state.currentSession) return state;
          
          const updatedSession: ChatSession = {
            ...state.currentSession,
            messages: [...state.currentSession.messages, newMessage],
            updated_at: Date.now(),
          };
          
          // Update title if this is the first user message
          if (newMessage.role === 'user' && updatedSession.messages.length === 1) {
            updatedSession.title = generateSessionTitle([newMessage]);
          }
          
          const updatedSessions = state.sessions.map(s => 
            s.id === updatedSession.id ? updatedSession : s
          );
          
          return {
            sessions: updatedSessions,
            currentSession: updatedSession,
          };
        });
      },
      
      updateMessage: (messageId: string, updates: Partial<ChatMessage>) => {
        set(state => {
          if (!state.currentSession) return state;
          
          const updatedMessages = state.currentSession.messages.map(msg =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          );
          
          const updatedSession: ChatSession = {
            ...state.currentSession,
            messages: updatedMessages,
            updated_at: Date.now(),
          };
          
          const updatedSessions = state.sessions.map(s =>
            s.id === updatedSession.id ? updatedSession : s
          );
          
          return {
            sessions: updatedSessions,
            currentSession: updatedSession,
          };
        });
      },
      
      updateSessionTitle: (sessionId: string, title: string) => {
        set(state => {
          const updatedSessions = state.sessions.map(s =>
            s.id === sessionId ? { ...s, title, updated_at: Date.now() } : s
          );
          
          const updatedCurrentSession = state.currentSession?.id === sessionId
            ? { ...state.currentSession, title, updated_at: Date.now() }
            : state.currentSession;
          
          return {
            sessions: updatedSessions,
            currentSession: updatedCurrentSession,
          };
        });
      },
      
      clearSessions: () => {
        set({
          sessions: [],
          currentSession: null,
        });
      },
      
      exportSession: (sessionId: string) => {
        const session = get().sessions.find(s => s.id === sessionId);
        return session || null;
      },
      
      importSession: (session: ChatSession) => {
        set(state => {
          // Check if session already exists
          if (state.sessions.some(s => s.id === session.id)) {
            return state; // Don't import duplicates
          }
          
          return {
            sessions: [session, ...state.sessions],
          };
        });
      },
    }),
    {
      name: 'vana-session-store',
    }
  )
);