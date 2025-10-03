import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateSessionId } from '@/lib/utils'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
  isError?: boolean
  isEdited?: boolean
  agentId?: string
  citations?: string[]
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  status: 'active' | 'completed' | 'error'
}

export interface AgentStatus {
  id: string
  name: string
  status: 'idle' | 'thinking' | 'working' | 'completed' | 'error'
  progress?: number
  currentTask?: string
  details?: Record<string, unknown>
  estimatedTimeRemaining?: number
  tasksCompleted?: number
  totalTasks?: number
}

interface ChatState {
  // Core state
  isActive: boolean
  currentSession: string | null
  messages: ChatMessage[]
  agentStatus: AgentStatus[]
  isLoading: boolean
  error: string | null
  
  // Session history
  sessionHistory: ChatSession[]
  
  // Actions
  startChat: (prompt?: string, existingSessionId?: string) => void
  endChat: () => void
  resumeSession: (sessionId: string) => void
  sendMessage: (content: string) => Promise<void>
  addMessage: (message: ChatMessage) => void
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void
  removeMessage: (messageId: string) => void
  setAgentStatus: (agents: AgentStatus[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearMessages: () => void
  addToHistory: (session: ChatSession) => void
  updateHistory: (sessionId: string, updates: Partial<ChatSession>) => void
  removeFromHistory: (sessionId: string) => void
  
  // Computed values
  hasActiveConversation: () => boolean
  lastMessage: () => ChatMessage | null
  isStreaming: () => boolean
  activeAgents: () => AgentStatus[]
}

export const useChatState = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      isActive: false,
      currentSession: null,
      messages: [],
      agentStatus: [],
      isLoading: false,
      error: null,
      sessionHistory: [],
      
      // Actions
      startChat: (prompt = '', existingSessionId) => {
        const sessionId = existingSessionId || generateSessionId()
        
        set({ 
          isActive: true,
          currentSession: sessionId,
          messages: [],
          agentStatus: [],
          error: null,
          isLoading: false
        })
        
        // Add initial user message if prompt provided
        if (prompt.trim()) {
          const initialMessage: ChatMessage = {
            id: generateSessionId(),
            role: 'user',
            content: prompt.trim(),
            timestamp: new Date().toISOString()
          }
          
          set(state => ({
            messages: [initialMessage]
          }))
        }
      },
      
      endChat: () => {
        const state = get()
        
        // Save current session to history if it has messages
        if (state.currentSession && state.messages.length > 0) {
          const session: ChatSession = {
            id: state.currentSession,
            title: state.messages[0]?.content.slice(0, 50) + '...' || 'New conversation',
            createdAt: state.messages[0]?.timestamp || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: state.messages.length,
            status: state.error ? 'error' : 'completed'
          }
          
          state.addToHistory(session)
        }
        
        set({ 
          isActive: false,
          currentSession: null,
          messages: [],
          agentStatus: [],
          isLoading: false,
          error: null
        })
      },
      
      resumeSession: (sessionId: string) => {
        set({
          isActive: true,
          currentSession: sessionId,
          messages: [], // TODO: Load messages from storage/API
          agentStatus: [],
          error: null,
          isLoading: false
        })
      },
      
      addMessage: (message: ChatMessage) => {
        set(state => ({
          messages: [...state.messages, message]
        }))
      },
      
      updateMessage: (messageId: string, updates: Partial<ChatMessage>) => {
        set(state => ({
          messages: state.messages.map(msg => 
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        }))
      },
      
      removeMessage: (messageId: string) => {
        set(state => ({
          messages: state.messages.filter(msg => msg.id !== messageId)
        }))
      },
      
      setAgentStatus: (agents: AgentStatus[]) => {
        set({ agentStatus: agents })
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
      
      setError: (error: string | null) => {
        set({ error })
      },
      
      clearMessages: () => {
        set({ messages: [] })
      },
      
      addToHistory: (session: ChatSession) => {
        set(state => ({
          sessionHistory: [session, ...state.sessionHistory.filter(s => s.id !== session.id)]
        }))
      },
      
      updateHistory: (sessionId: string, updates: Partial<ChatSession>) => {
        set(state => ({
          sessionHistory: state.sessionHistory.map(session =>
            session.id === sessionId ? { ...session, ...updates } : session
          )
        }))
      },
      
      removeFromHistory: (sessionId: string) => {
        set(state => ({
          sessionHistory: state.sessionHistory.filter(s => s.id !== sessionId)
        }))
      },

      sendMessage: async (content: string) => {
        const state = get()
        if (!state.isActive || !state.currentSession) return
        
        // Add user message immediately
        const userMessage: ChatMessage = {
          id: generateSessionId(),
          role: 'user',
          content,
          timestamp: new Date().toISOString()
        }
        
        state.addMessage(userMessage)
        state.setLoading(true)
        
        // Simulate AI response (replace with actual API call)
        return new Promise((resolve) => {
          setTimeout(() => {
            const aiMessage: ChatMessage = {
              id: generateSessionId(),
              role: 'assistant',
              content: `I received your message: "${content}". This is a placeholder response from Vana's AI system. Soon this will connect to our multi-agent backend for intelligent responses.`,
              timestamp: new Date().toISOString()
            }
            
            state.addMessage(aiMessage)
            state.setLoading(false)
            resolve()
          }, 1000)
        })
      },
      
      // Computed values
      hasActiveConversation: () => {
        const state = get()
        return state.isActive && state.messages.length > 0
      },
      
      lastMessage: () => {
        const state = get()
        const messages = state.messages
        return messages.length > 0 ? messages[messages.length - 1] : null
      },
      
      isStreaming: () => {
        const state = get()
        return state.messages.some(msg => msg.isStreaming === true)
      },
      
      activeAgents: () => {
        const state = get()
        return state.agentStatus.filter(agent => agent.status !== 'idle')
      }
    }),
    {
      name: 'vana-chat-state',
      partialize: (state) => ({
        sessionHistory: state.sessionHistory,
        // Only persist session history, not active chat state for security
      })
    }
  )
)