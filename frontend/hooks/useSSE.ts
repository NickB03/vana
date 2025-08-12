/**
 * Hook for managing SSE connections and real-time updates
 */

import { useEffect, useCallback, useRef } from 'react'
import type { SSEEvent } from '@/types'
import { useAgentDeckStore } from '@/stores/agentDeckStore'

interface UseSSEOptions {
  url: string
  reconnect?: boolean
  reconnectInterval?: number
  onEvent?: (event: SSEEvent) => void
  onError?: (error: Event) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export function useSSE({
  url,
  reconnect = true,
  reconnectInterval = 5000,
  onEvent,
  onError,
  onConnect,
  onDisconnect
}: UseSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const handleSSEEvent = useAgentDeckStore(state => state.handleSSEEvent)

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return // Already connected
    }

    try {
      const eventSource = new EventSource(url)
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.debug('SSE connection opened:', url)
        onConnect?.()
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent
          
          // Handle the event in the store
          handleSSEEvent(data)
          
          // Call custom event handler if provided
          onEvent?.(data)
        } catch (error) {
          console.error('Failed to parse SSE event data:', error)
        }
      }

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        
        onError?.(error)
        onDisconnect?.()

        // Close the connection to trigger reconnect
        eventSource.close()

        if (reconnect && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null
            connect()
          }, reconnectInterval)
        }
      }
    } catch (error) {
      console.error('Failed to create SSE connection:', error)
    }
  }, [url, handleSSEEvent, onEvent, onError, onConnect, onDisconnect, reconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      onDisconnect?.()
    }
  }, [onDisconnect])

  // Connect on mount
  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  const connectionState = eventSourceRef.current?.readyState

  return {
    connect,
    disconnect,
    isConnected: connectionState === EventSource.OPEN,
    isConnecting: connectionState === EventSource.CONNECTING,
    connectionState
  }
}

/**
 * Hook for simplified SSE connection with default backend URL
 */
export function useAgentSSE(options?: Omit<UseSSEOptions, 'url'>) {
  const sseUrl = process.env.NEXT_PUBLIC_API_URL 
    ? `${process.env.NEXT_PUBLIC_API_URL}/stream`
    : 'http://localhost:8000/stream'

  return useSSE({
    url: sseUrl,
    ...options
  })
}