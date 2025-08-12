import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: number
  agentName?: string
  sources?: Array<{
    title: string
    url: string
    domain: string
    confidence: number
  }>
}

export interface Session {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: Message[]
  canvasState?: {
    isOpen: boolean
    activeType: 'markdown' | 'code' | 'web' | 'sandbox'
    content: string
  }
  origin: 'homepage' | 'tool'
}

interface SessionStore {
  currentSessionId: string | null
  sessions: Session[]
  
  createSession: (origin: 'homepage' | 'tool', initialPrompt?: string) => Session
  loadSession: (sessionId: string) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  deleteSession: (sessionId: string) => void
  getHomepageSessions: () => Session[]
  addMessage: (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>) => void
}

const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useSessionStore = create<SessionStore>()(
  persist(
    immer((set, get) => ({
      currentSessionId: null,
      sessions: [],
      
      createSession: (origin, initialPrompt) => {
        const session: Session = {
          id: generateSessionId(),
          title: initialPrompt ? initialPrompt.slice(0, 50) + (initialPrompt.length > 50 ? '...' : '') : 'New Chat',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [],
          origin,
        }
        
        set((state) => {
          state.sessions.push(session)
          state.currentSessionId = session.id
        })
        
        return session
      },
      
      loadSession: (sessionId) => {
        set((state) => {
          state.currentSessionId = sessionId
        })
      },
      
      updateSessionTitle: (sessionId, title) => {
        set((state) => {
          const session = state.sessions.find(s => s.id === sessionId)
          if (session) {
            session.title = title
            session.updatedAt = Date.now()
          }
        })
      },
      
      deleteSession: (sessionId) => {
        set((state) => {
          state.sessions = state.sessions.filter(s => s.id !== sessionId)
          if (state.currentSessionId === sessionId) {
            state.currentSessionId = null
          }
        })
      },
      
      getHomepageSessions: () => {
        return get().sessions
          .filter(s => s.origin === 'homepage')
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 20) // Keep most recent 20
      },
      
      addMessage: (sessionId, messageData) => {
        set((state) => {
          const session = state.sessions.find(s => s.id === sessionId)
          if (session) {
            const message: Message = {
              ...messageData,
              id: generateMessageId(),
              timestamp: Date.now(),
            }
            session.messages.push(message)
            session.updatedAt = Date.now()
            
            // Auto-update session title from first user message
            if (session.messages.length === 1 && message.role === 'user') {
              session.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
            }
          }
        })
      },
    })),
    {
      name: 'session-storage',
      partialize: (state) => ({
        sessions: state.sessions.slice(-20), // Keep last 20 sessions
      }),
    }
  )
)