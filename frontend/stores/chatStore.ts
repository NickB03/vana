/**
 * Chat Store - Manages chat state, messages, and SSE streaming
 * Handles message sending, streaming, and research sources integration
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { ChatStore, EnhancedMessage, Session, ResearchSource } from '@/types'
import { apiClient } from '@/lib/api/client'

const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const useChatStore = create<ChatStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      currentSession: null,
      messages: [],
      isStreaming: false,
      streamingMessage: '',
      isLoading: false,
      error: null,
      researchSources: [],

      // Actions
      sendMessage: async (content: string, files?: File[]) => {
        const state = get()
        
        set(draft => {
          draft.isLoading = true
          draft.error = null
        })

        try {
          // Create session if needed
          let sessionId = state.currentSession?.id
          if (!sessionId) {
            const sessionResponse = await apiClient.createSession({
              prompt: content,
              files,
              origin: 'homepage'
            })
            sessionId = sessionResponse.data.session_id
            
            // Update current session
            set(draft => {
              draft.currentSession = {
                id: sessionId!,
                title: content.substring(0, 50),
                messages: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
                origin: 'homepage'
              }
            })
          }

          // Add user message immediately
          const userMessage: EnhancedMessage = {
            id: generateId(),
            role: 'user',
            content,
            timestamp: Date.now()
          }

          get().addMessage(userMessage)

          // Send message to real API
          const response = await apiClient.sendMessage({
            sessionId,
            content,
            files
          })

          // Start streaming response
          set(draft => {
            draft.isStreaming = true
            draft.streamingMessage = ''
            draft.isLoading = false
          })

          // Connect to SSE for real-time updates
          connectToSSE(sessionId)

        } catch (error) {
          set(draft => {
            draft.error = error instanceof Error ? error.message : 'Failed to send message'
            draft.isLoading = false
          })
          throw error
        }
      },

      addMessage: (messageData) => {
        set(state => {
          const message: EnhancedMessage = {
            ...messageData,
            id: generateId(),
            timestamp: Date.now()
          }
          state.messages.push(message)

          // Update current session if exists
          if (state.currentSession) {
            state.currentSession.messages.push(message)
            state.currentSession.updatedAt = Date.now()
          }
        })
      },

      updateStreamingMessage: (content: string) => {
        set(state => {
          state.streamingMessage = content
        })
      },

      setStreaming: (streaming: boolean) => {
        set(state => {
          state.isStreaming = streaming
          
          if (!streaming && state.streamingMessage) {
            // Convert streaming message to permanent message
            const assistantMessage: EnhancedMessage = {
              id: generateId(),
              role: 'assistant',
              content: state.streamingMessage,
              timestamp: Date.now(),
              agentName: 'Vana Agent',
              sources: state.researchSources,
              status: 'complete'
            }
            
            state.messages.push(assistantMessage)
            
            if (state.currentSession) {
              state.currentSession.messages.push(assistantMessage)
              state.currentSession.updatedAt = Date.now()
            }
            
            state.streamingMessage = ''
            state.researchSources = []
          }
        })
      },

      addResearchSources: (sources: ResearchSource[]) => {
        set(state => {
          state.researchSources = sources
        })
      },

      clearChat: () => {
        set(state => {
          state.messages = []
          state.isStreaming = false
          state.streamingMessage = ''
          state.researchSources = []
          state.error = null
        })
      },

      setError: (error: string | null) => {
        set(state => {
          state.error = error
        })
      }
    }))
  )
)

// SSE Connection for real-time streaming
let eventSource: EventSource | null = null

function connectToSSE(sessionId: string) {
  // Close existing connection if any
  if (eventSource) {
    eventSource.close()
  }

  const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/agent_network_sse/${sessionId}`
  eventSource = new EventSource(sseUrl)

  eventSource.addEventListener('agent_start', (event) => {
    const data = JSON.parse(event.data)
    console.log('Agent started:', data)
    
    // Start streaming state
    useChatStore.getState().setStreaming(true)
  })

  eventSource.addEventListener('agent_message', (event) => {
    const data = JSON.parse(event.data)
    
    // Update streaming message content
    useChatStore.getState().updateStreamingMessage(data.content)
  })

  eventSource.addEventListener('research_sources', (event) => {
    const data = JSON.parse(event.data)
    
    // Add research sources
    if (data.sources && data.sources.length > 0) {
      useChatStore.getState().addResearchSources(data.sources)
    }
  })

  eventSource.addEventListener('agent_complete', (event) => {
    const data = JSON.parse(event.data)
    console.log('Agent complete:', data)
    
    // Finalize the streaming message
    const state = useChatStore.getState()
    if (state.streamingMessage) {
      state.finalizeStreamingMessage()
    }
    
    // End streaming
    useChatStore.getState().setStreaming(false)
  })

  eventSource.addEventListener('error', (event) => {
    console.error('SSE Error:', event)
    useChatStore.getState().setError('Connection lost. Retrying...')
    
    // Attempt reconnection after 3 seconds
    setTimeout(() => {
      if (sessionId) {
        connectToSSE(sessionId)
      }
    }, 3000)
  })

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error)
    useChatStore.getState().setStreaming(false)
  }
}

// Cleanup function for SSE
export function disconnectSSE() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
}

// Selectors for component use
export const useCurrentMessages = () => useChatStore(state => state.messages)
export const useStreamingState = () => useChatStore(state => ({
  isStreaming: state.isStreaming,
  streamingMessage: state.streamingMessage
}))
export const useResearchSources = () => useChatStore(state => state.researchSources)
export const useChatError = () => useChatStore(state => state.error)
export const useChatLoading = () => useChatStore(state => state.isLoading)