import { useEffect, useState, useCallback } from 'react'
import { wsService } from '../services/websocket'
import type { ThinkingUpdate, MessageUpdate } from '../services/websocket'

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Connect on mount
    wsService.connect()

    // Set up listeners
    const handleConnected = (connected: boolean) => {
      setIsConnected(connected)
      if (connected) {
        setError(null)
      }
    }

    const handleError = (err: Error) => {
      setError(err)
    }

    wsService.on('connected', handleConnected)
    wsService.on('error', handleError)

    // Cleanup
    return () => {
      wsService.off('connected', handleConnected)
      wsService.off('error', handleError)
    }
  }, [])

  const sendMessage = useCallback((message: string) => {
    wsService.sendMessage(message)
  }, [])

  const onThinkingUpdate = useCallback((callback: (update: ThinkingUpdate) => void) => {
    wsService.on('thinking_update', callback)
    return () => wsService.off('thinking_update', callback)
  }, [])

  const onMessageUpdate = useCallback((callback: (update: MessageUpdate) => void) => {
    wsService.on('message_update', callback)
    return () => wsService.off('message_update', callback)
  }, [])

  return {
    isConnected,
    error,
    sendMessage,
    onThinkingUpdate,
    onMessageUpdate,
  }
}