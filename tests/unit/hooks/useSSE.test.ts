import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { eventUtils } from '../../utils/testing-utils'
import React from 'react'

// Mock the useSSE hook (will be implemented by frontend dev)
const mockUseSSE = (url: string, options = {}) => {
  const [state, setState] = React.useState({
    isConnected: false,
    isReconnecting: false,
    error: null,
    messages: [],
    connectionAttempts: 0,
    lastEventId: null
  })
  
  const eventSourceRef = React.useRef<EventSource | null>(null)
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const maxReconnectAttempts = 5
  const reconnectInterval = 1000
  
  const connect = React.useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return // Already connected
    }
    
    try {
      const eventSource = new EventSource(url, {
        withCredentials: true,
        ...options
      })
      
      eventSourceRef.current = eventSource
      
      eventSource.onopen = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          error: null,
          connectionAttempts: 0
        }))
      }
      
      eventSource.onerror = () => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          error: 'Connection failed'
        }))
        
        handleReconnect()
      }
      
      eventSource.onmessage = (event) => {
        const message = {
          id: Date.now().toString(),
          type: 'message',
          data: event.data,
          timestamp: new Date(),
          lastEventId: event.lastEventId
        }
        
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, message],
          lastEventId: event.lastEventId
        }))
      }
      
      // Add custom event listeners
      const eventTypes = ['agent_progress', 'chat_message', 'system_status', 'error']
      eventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, (event) => {
          const message = {
            id: Date.now().toString(),
            type: eventType,
            data: event.data,
            timestamp: new Date(),
            lastEventId: event.lastEventId
          }
          
          setState(prev => ({
            ...prev,
            messages: [...prev.messages, message],
            lastEventId: event.lastEventId
          }))
        })
      })
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to create connection',
        isConnected: false
      }))
    }
  }, [url, options])
  
  const handleReconnect = React.useCallback(() => {
    setState(prev => {
      if (prev.connectionAttempts >= maxReconnectAttempts) {
        return {
          ...prev,
          error: 'Max reconnection attempts reached'
        }
      }
      
      return {
        ...prev,
        isReconnecting: true,
        connectionAttempts: prev.connectionAttempts + 1
      }
    })
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, reconnectInterval * Math.pow(2, state.connectionAttempts)) // Exponential backoff
  }, [connect, state.connectionAttempts])
  
  const disconnect = React.useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isReconnecting: false,
      connectionAttempts: 0
    }))
  }, [])
  
  const clearMessages = React.useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: []
    }))
  }, [])
  
  const getLastMessage = React.useCallback((type?: string) => {
    if (type) {
      const filtered = state.messages.filter(msg => msg.type === type)
      return filtered[filtered.length - 1] || null
    }
    return state.messages[state.messages.length - 1] || null
  }, [state.messages])
  
  const getMessagesByType = React.useCallback((type: string) => {
    return state.messages.filter(msg => msg.type === type)
  }, [state.messages])
  
  // Auto-connect on mount
  React.useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, [connect, disconnect])
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])
  
  return {
    ...state,
    connect,
    disconnect,
    clearMessages,
    getLastMessage,
    getMessagesByType,
    eventSource: eventSourceRef.current
  }
}

// Mock EventSource for testing
let mockEventSourceInstance: any = null

const MockEventSource = vi.fn().mockImplementation((url: string, options?: any) => {
  const instance = {
    url,
    readyState: EventSource.CONNECTING,
    onopen: null,
    onmessage: null,
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    close: vi.fn(() => {
      instance.readyState = EventSource.CLOSED
    }),
    CONNECTING: 0,
    OPEN: 1,
    CLOSED: 2
  }
  
  mockEventSourceInstance = instance
  
  // Simulate connection opening
  setTimeout(() => {
    instance.readyState = EventSource.OPEN
    instance.onopen?.()
  }, 10)
  
  return instance
})

// Assign static properties
MockEventSource.CONNECTING = 0
MockEventSource.OPEN = 1
MockEventSource.CLOSED = 2

describe('useSSE', () => {
  const testUrl = 'http://localhost:8000/sse'
  
  beforeEach(() => {
    vi.clearAllMocks()
    global.EventSource = MockEventSource as any
    mockEventSourceInstance = null
  })
  
  afterEach(() => {
    vi.clearAllTimers()
  })
  
  describe('Connection Management', () => {
    it('establishes SSE connection on mount', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      expect(MockEventSource).toHaveBeenCalledWith(testUrl, {
        withCredentials: true
      })
      
      // Wait for connection to open
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      expect(result.current.isConnected).toBe(true)
      expect(result.current.isReconnecting).toBe(false)
      expect(result.current.error).toBe(null)
    })
    
    it('passes custom options to EventSource', () => {
      const customOptions = {
        withCredentials: false,
        headers: { 'Custom-Header': 'value' }
      }
      
      renderHook(() => mockUseSSE(testUrl, customOptions))
      
      expect(MockEventSource).toHaveBeenCalledWith(testUrl, {
        withCredentials: true,
        ...customOptions
      })
    })
    
    it('disconnects when component unmounts', () => {
      const { unmount } = renderHook(() => mockUseSSE(testUrl))
      
      expect(mockEventSourceInstance).toBeTruthy()
      const closeSpy = vi.spyOn(mockEventSourceInstance, 'close')
      
      unmount()
      
      expect(closeSpy).toHaveBeenCalled()
    })
    
    it('manually connects and disconnects', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      // Wait for initial connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      expect(result.current.isConnected).toBe(true)
      
      // Manual disconnect
      act(() => {
        result.current.disconnect()
      })
      
      expect(result.current.isConnected).toBe(false)
      
      // Manual reconnect
      act(() => {
        result.current.connect()
      })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      expect(result.current.isConnected).toBe(true)
    })
  })
  
  describe('Message Handling', () => {
    it('receives and stores regular messages', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      // Simulate receiving a message
      act(() => {
        mockEventSourceInstance.onmessage({
          data: JSON.stringify({ text: 'Hello from server' }),
          lastEventId: 'event-1'
        })
      })
      
      expect(result.current.messages).toHaveLength(1)
      expect(result.current.messages[0].type).toBe('message')
      expect(result.current.messages[0].data).toBe(JSON.stringify({ text: 'Hello from server' }))
      expect(result.current.messages[0].lastEventId).toBe('event-1')
    })
    
    it('receives and stores custom event types', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      // Simulate receiving custom events
      const customEvents = [
        { type: 'agent_progress', data: JSON.stringify({ agentId: 'agent-1', progress: 50 }) },
        { type: 'chat_message', data: JSON.stringify({ message: 'AI response', role: 'assistant' }) },
        { type: 'system_status', data: JSON.stringify({ status: 'healthy' }) }
      ]
      
      customEvents.forEach((event, index) => {
        act(() => {
          const mockEvent = {
            data: event.data,
            lastEventId: `event-${index + 1}`
          }
          
          // Find the event listener for this type
          const addEventListenerCalls = mockEventSourceInstance.addEventListener.mock.calls
          const eventListener = addEventListenerCalls.find(call => call[0] === event.type)?.[1]
          
          if (eventListener) {
            eventListener(mockEvent)
          }
        })
      })
      
      expect(result.current.messages).toHaveLength(3)
      expect(result.current.messages[0].type).toBe('agent_progress')
      expect(result.current.messages[1].type).toBe('chat_message')
      expect(result.current.messages[2].type).toBe('system_status')
    })
    
    it('maintains message order', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      // Send multiple messages in sequence
      const messages = [
        { data: 'Message 1', lastEventId: 'event-1' },
        { data: 'Message 2', lastEventId: 'event-2' },
        { data: 'Message 3', lastEventId: 'event-3' }
      ]
      
      messages.forEach(msg => {
        act(() => {
          mockEventSourceInstance.onmessage(msg)
        })
      })
      
      expect(result.current.messages).toHaveLength(3)
      expect(result.current.messages[0].data).toBe('Message 1')
      expect(result.current.messages[1].data).toBe('Message 2')
      expect(result.current.messages[2].data).toBe('Message 3')
    })
    
    it('clears messages when requested', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      // Add some messages
      act(() => {
        mockEventSourceInstance.onmessage({ data: 'Test message 1' })
        mockEventSourceInstance.onmessage({ data: 'Test message 2' })
      })
      
      expect(result.current.messages).toHaveLength(2)
      
      // Clear messages
      act(() => {
        result.current.clearMessages()
      })
      
      expect(result.current.messages).toHaveLength(0)
    })
  })
  
  describe('Message Retrieval Utilities', () => {
    it('gets last message of any type', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      act(() => {
        mockEventSourceInstance.onmessage({ data: 'First message' })
        mockEventSourceInstance.onmessage({ data: 'Last message' })
      })
      
      const lastMessage = result.current.getLastMessage()
      expect(lastMessage?.data).toBe('Last message')
    })
    
    it('gets last message of specific type', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      // Add regular message
      act(() => {
        mockEventSourceInstance.onmessage({ data: 'Regular message' })
      })
      
      // Add agent progress message
      act(() => {
        const addEventListenerCalls = mockEventSourceInstance.addEventListener.mock.calls
        const eventListener = addEventListenerCalls.find(call => call[0] === 'agent_progress')?.[1]
        
        if (eventListener) {
          eventListener({ data: 'Agent progress data' })
        }
      })
      
      const lastAgentMessage = result.current.getLastMessage('agent_progress')
      expect(lastAgentMessage?.type).toBe('agent_progress')
      expect(lastAgentMessage?.data).toBe('Agent progress data')
      
      const lastRegularMessage = result.current.getLastMessage('message')
      expect(lastRegularMessage?.type).toBe('message')
      expect(lastRegularMessage?.data).toBe('Regular message')
    })
    
    it('gets all messages by type', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      // Add multiple messages of different types
      act(() => {
        mockEventSourceInstance.onmessage({ data: 'Regular message 1' })
        mockEventSourceInstance.onmessage({ data: 'Regular message 2' })
      })
      
      // Add agent progress messages
      act(() => {
        const addEventListenerCalls = mockEventSourceInstance.addEventListener.mock.calls
        const eventListener = addEventListenerCalls.find(call => call[0] === 'agent_progress')?.[1]
        
        if (eventListener) {
          eventListener({ data: 'Progress 1' })
          eventListener({ data: 'Progress 2' })
          eventListener({ data: 'Progress 3' })
        }
      })
      
      const regularMessages = result.current.getMessagesByType('message')
      const progressMessages = result.current.getMessagesByType('agent_progress')
      
      expect(regularMessages).toHaveLength(2)
      expect(progressMessages).toHaveLength(3)
    })
  })
  
  describe('Error Handling and Reconnection', () => {
    it('handles connection errors', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      // Simulate connection error
      act(() => {
        mockEventSourceInstance.onerror()
      })
      
      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Connection failed')
    })
    
    it('attempts reconnection after connection failure', async () => {
      vi.useFakeTimers()
      
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      // Clear initial connection call
      MockEventSource.mockClear()
      
      // Simulate connection error
      act(() => {
        mockEventSourceInstance.onerror()
      })
      
      expect(result.current.isReconnecting).toBe(true)
      expect(result.current.connectionAttempts).toBe(1)
      
      // Fast-forward time to trigger reconnection
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      
      // Should attempt to reconnect
      expect(MockEventSource).toHaveBeenCalledTimes(1)
      
      vi.useRealTimers()
    })
    
    it('implements exponential backoff for reconnection', async () => {
      vi.useFakeTimers()
      
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      MockEventSource.mockClear()
      
      // Simulate multiple connection failures
      for (let i = 1; i <= 3; i++) {
        act(() => {
          mockEventSourceInstance.onerror()
        })
        
        expect(result.current.connectionAttempts).toBe(i)
        
        // Should wait exponentially longer each time
        const expectedDelay = 1000 * Math.pow(2, i - 1)
        
        act(() => {
          vi.advanceTimersByTime(expectedDelay)
        })
      }
      
      // Should have made 3 reconnection attempts
      expect(MockEventSource).toHaveBeenCalledTimes(3)
      
      vi.useRealTimers()
    })
    
    it('stops reconnection after max attempts', async () => {
      vi.useFakeTimers()
      
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      MockEventSource.mockClear()
      
      // Simulate max reconnection attempts (5)
      for (let i = 1; i <= 6; i++) {
        act(() => {
          mockEventSourceInstance.onerror()
        })
        
        if (i <= 5) {
          const expectedDelay = 1000 * Math.pow(2, i - 1)
          act(() => {
            vi.advanceTimersByTime(expectedDelay)
          })
        }
      }
      
      expect(result.current.error).toBe('Max reconnection attempts reached')
      expect(MockEventSource).toHaveBeenCalledTimes(5) // Should stop at max attempts
      
      vi.useRealTimers()
    })
  })
  
  describe('Performance and Memory Management', () => {
    it('handles high-frequency messages efficiently', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      const startTime = performance.now()
      
      // Simulate receiving many messages quickly
      act(() => {
        for (let i = 0; i < 1000; i++) {
          mockEventSourceInstance.onmessage({
            data: `Message ${i}`,
            lastEventId: `event-${i}`
          })
        }
      })
      
      const processingTime = performance.now() - startTime
      
      expect(result.current.messages).toHaveLength(1000)
      expect(processingTime).toBeLessThan(100) // Should process quickly
    })
    
    it('prevents memory leaks with proper cleanup', () => {
      const { unmount } = renderHook(() => mockUseSSE(testUrl))
      
      expect(mockEventSourceInstance).toBeTruthy()
      const closeSpy = vi.spyOn(mockEventSourceInstance, 'close')
      
      unmount()
      
      expect(closeSpy).toHaveBeenCalled()
    })
  })
  
  describe('Real-world Scenarios', () => {
    it('handles network interruption and recovery', async () => {
      vi.useFakeTimers()
      
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      // Initial connection
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      expect(result.current.isConnected).toBe(true)
      
      // Network interruption
      act(() => {
        mockEventSourceInstance.onerror()
      })
      
      expect(result.current.isConnected).toBe(false)
      expect(result.current.isReconnecting).toBe(true)
      
      // Recovery after delay
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      expect(result.current.isConnected).toBe(true)
      expect(result.current.isReconnecting).toBe(false)
      
      vi.useRealTimers()
    })
    
    it('maintains last event ID across reconnections', async () => {
      const { result } = renderHook(() => mockUseSSE(testUrl))
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
      })
      
      // Receive message with event ID
      act(() => {
        mockEventSourceInstance.onmessage({
          data: 'Test message',
          lastEventId: 'event-123'
        })
      })
      
      expect(result.current.lastEventId).toBe('event-123')
      
      // Connection drops and reconnects
      act(() => {
        mockEventSourceInstance.onerror()
      })
      
      // Last event ID should be preserved
      expect(result.current.lastEventId).toBe('event-123')
    })
  })
})