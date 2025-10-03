'use client'

/**
 * Enhanced SSE Hook with Comprehensive Error Handling
 * 
 * Provides robust Server-Sent Events connection management with:
 * - Automatic reconnection with exponential backoff
 * - Comprehensive error handling and categorization
 * - Connection health monitoring
 * - Memory leak prevention
 * - TypeScript support
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// Error types and interfaces
interface SSEError extends Error {
  code?: string
  reconnectable?: boolean
  sessionId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  retryAfter?: number
}

interface MessageRecord {
  id: string
  type: string
  data: unknown
  timestamp: Date
  lastEventId: string | null
}

interface SSEState {
  isConnected: boolean
  isReconnecting: boolean
  error: SSEError | null
  messages: MessageRecord[]
  connectionAttempts: number
  lastEventId: string | null
  connectionHealth: 'healthy' | 'degraded' | 'critical' | 'disconnected'
  latency: number | null
}

interface SSEOptions {
  withCredentials?: boolean
  headers?: Record<string, string>
  maxRetries?: number
  retryDelay?: number
  heartbeatInterval?: number
  connectionTimeout?: number
  onError?: (error: SSEError) => void
  onReconnect?: () => void
  onMessage?: (message: MessageRecord) => void
}

interface UseSSEReturn extends SSEState {
  connect: () => void
  disconnect: () => void
  clearMessages: () => void
  clearError: () => void
  retryConnection: () => void
  getConnectionStatus: () => string
}

const DEFAULT_OPTIONS: Required<SSEOptions> = {
  withCredentials: true,
  headers: {},
  maxRetries: 5,
  retryDelay: 1000,
  heartbeatInterval: 30000,
  connectionTimeout: 10000,
  onError: () => {},
  onReconnect: () => {},
  onMessage: () => {}
}

export function useSSEWithErrorHandling(
  url: string, 
  options: SSEOptions = {}
): UseSSEReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options }
  
  const [state, setState] = useState<SSEState>({
    isConnected: false,
    isReconnecting: false,
    error: null,
    messages: [],
    connectionAttempts: 0,
    lastEventId: null,
    connectionHealth: 'disconnected',
    latency: null
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const latencyStartRef = useRef<number | null>(null)
  const isManualDisconnectRef = useRef(false)

  // Create SSE error with proper categorization
  const createSSEError = useCallback((
    message: string, 
    code?: string, 
    reconnectable: boolean = true,
    severity: SSEError['severity'] = 'medium'
  ): SSEError => {
    const error = new Error(message) as SSEError
    error.name = 'SSEError'
    error.code = code
    error.reconnectable = reconnectable
    error.severity = severity
    return error
  }, [])

  // Update connection health based on various factors
  const updateConnectionHealth = useCallback((
    connected: boolean, 
    latency: number | null, 
    errorCount: number
  ) => {
    let health: SSEState['connectionHealth']
    
    if (!connected) {
      health = 'disconnected'
    } else if (errorCount > 3) {
      health = 'critical'
    } else if (latency && latency > 5000) {
      health = 'degraded'
    } else if (errorCount > 1) {
      health = 'degraded'
    } else {
      health = 'healthy'
    }
    
    setState(prev => ({ ...prev, connectionHealth: health }))
  }, [])

  // Clear all timeouts
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current)
      connectionTimeoutRef.current = null
    }
  }, [])

  // Handle heartbeat to monitor connection health
  const scheduleHeartbeat = useCallback(() => {
    heartbeatTimeoutRef.current = setTimeout(() => {
      if (eventSourceRef.current?.readyState === EventSource.OPEN) {
        // Connection is still alive, schedule next heartbeat
        scheduleHeartbeat()
      } else {
        // Connection appears dead, try to reconnect
        const error = createSSEError(
          'Heartbeat failed - connection appears dead',
          'HEARTBEAT_FAILED',
          true,
          'medium'
        )
        handleConnectionError(error)
      }
    }, mergedOptions.heartbeatInterval)
  }, [mergedOptions.heartbeatInterval])

  // Handle connection errors with categorization
  const handleConnectionError = useCallback((error: SSEError) => {
    setState(prev => {
      const newAttempts = prev.connectionAttempts + 1
      updateConnectionHealth(false, prev.latency, newAttempts)
      
      return {
        ...prev,
        isConnected: false,
        error,
        connectionAttempts: newAttempts
      }
    })
    
    mergedOptions.onError(error)
    
    // Attempt reconnection if allowed and not manually disconnected
    if (error.reconnectable && 
        state.connectionAttempts < mergedOptions.maxRetries &&
        !isManualDisconnectRef.current) {
      attemptReconnect()
    }
  }, [state.connectionAttempts, mergedOptions.maxRetries, mergedOptions.onError])

  // Attempt reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    setState(prev => ({ ...prev, isReconnecting: true }))
    
    // Calculate exponential backoff delay
    const delay = mergedOptions.retryDelay * Math.pow(2, state.connectionAttempts)
    const maxDelay = 30000 // Maximum 30 seconds
    const finalDelay = Math.min(delay, maxDelay)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, finalDelay)
  }, [state.connectionAttempts, mergedOptions.retryDelay])

  // Connect to SSE endpoint
  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return // Already connected
    }

    clearTimeouts()
    isManualDisconnectRef.current = false

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }

      // Create new EventSource with options
      const eventSourceInit: EventSourceInit = {
        withCredentials: mergedOptions.withCredentials
      }

      const source = new EventSource(url, eventSourceInit)
      eventSourceRef.current = source
      latencyStartRef.current = Date.now()

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        const error = createSSEError(
          'Connection timeout',
          'CONNECTION_TIMEOUT',
          true,
          'medium'
        )
        handleConnectionError(error)
      }, mergedOptions.connectionTimeout)

      // Handle connection open
      source.onopen = () => {
        clearTimeout(connectionTimeoutRef.current!)
        
        const latency = latencyStartRef.current ? Date.now() - latencyStartRef.current : null
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          error: null,
          connectionAttempts: 0,
          latency
        }))

        updateConnectionHealth(true, latency, 0)
        scheduleHeartbeat()
        
        if (state.connectionAttempts > 0) {
          mergedOptions.onReconnect()
        }
      }

      // Handle incoming messages
      source.onmessage = (event) => {
        const record: MessageRecord = {
          id: event.lastEventId || Date.now().toString(),
          type: 'message',
          data: event.data,
          timestamp: new Date(),
          lastEventId: event.lastEventId || null
        }

        setState(prev => ({
          ...prev,
          messages: [...prev.messages, record],
          lastEventId: record.lastEventId
        }))

        mergedOptions.onMessage(record)
      }

      // Handle connection errors
      source.onerror = () => {
        let error: SSEError

        switch (source.readyState) {
          case EventSource.CONNECTING:
            error = createSSEError(
              'Failed to establish connection',
              'CONNECTION_FAILED',
              true,
              'medium'
            )
            break
          case EventSource.CLOSED:
            error = createSSEError(
              'Connection was closed',
              'CONNECTION_CLOSED',
              true,
              'medium'
            )
            break
          default:
            error = createSSEError(
              'Unknown connection error',
              'UNKNOWN_ERROR',
              true,
              'high'
            )
        }

        handleConnectionError(error)
      }

    } catch (error) {
      const sseError = createSSEError(
        `Failed to create EventSource: ${error}`,
        'CREATION_FAILED',
        false,
        'high'
      )
      handleConnectionError(sseError)
    }
  }, [url, mergedOptions, handleConnectionError, scheduleHeartbeat, updateConnectionHealth])

  // Disconnect from SSE endpoint
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true
    clearTimeouts()
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isReconnecting: false,
      connectionHealth: 'disconnected'
    }))
  }, [clearTimeouts])

  // Clear all messages
  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, messages: [] }))
  }, [])

  // Clear current error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  // Manual retry connection
  const retryConnection = useCallback(() => {
    setState(prev => ({ ...prev, connectionAttempts: 0 }))
    connect()
  }, [connect])

  // Get human-readable connection status
  const getConnectionStatus = useCallback((): string => {
    if (state.isReconnecting) {
      return `Reconnecting (attempt ${state.connectionAttempts}/${mergedOptions.maxRetries})`
    }
    if (state.isConnected) {
      return `Connected (${state.connectionHealth})`
    }
    if (state.error) {
      return `Error: ${state.error.message}`
    }
    return 'Disconnected'
  }, [state, mergedOptions.maxRetries])

  // Auto-connect on mount
  useEffect(() => {
    connect()
    
    return () => {
      disconnect()
    }
  }, []) // Only run on mount/unmount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts()
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [clearTimeouts])

  return {
    ...state,
    connect,
    disconnect,
    clearMessages,
    clearError,
    retryConnection,
    getConnectionStatus
  }
}