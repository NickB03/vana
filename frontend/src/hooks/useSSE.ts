import { useEffect, useState, useCallback } from 'react';
import { sseClient } from '../services/sse-client';
import type { ThinkingUpdate, MessageUpdate, NewMessage } from '../types/adk-events';

/**
 * Hook for SSE connection - maintains same interface as useWebSocket
 * This is a drop-in replacement that requires minimal changes in components
 */
// Track connection state globally to prevent duplicate connections
let globalConnectionPromise: Promise<void> | null = null;
let globalSessionId: string | null = null;
let globalUserId: string = 'default_user';

export function useSSE() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  useEffect(() => {
    console.log('[useSSE] Hook initializing');
    // Connect on mount with default user/session
    const userId = globalUserId;
    
    // Use global session ID if available, otherwise create new one
    if (!globalSessionId) {
      globalSessionId = `session_${Date.now()}`;
    }
    
    // Prevent duplicate connections in StrictMode
    if (!globalConnectionPromise) {
      console.log('[useSSE] Creating new connection with session:', globalSessionId);
      globalConnectionPromise = sseClient.connect(userId, globalSessionId)
        .then(() => {
          console.log('[useSSE] Connected successfully');
        })
        .catch((err) => {
          setError(err);
          console.error('[useSSE] Failed to connect SSE:', err);
          globalConnectionPromise = null; // Reset on error
          globalSessionId = null; // Reset session ID on error
        });
    } else {
      console.log('[useSSE] Reusing existing connection promise with session:', globalSessionId);
    }

    // Set up listeners
    const handleConnection = (data: { status: 'connected' | 'disconnected' | 'reconnecting' }) => {
      setConnectionStatus(data.status);
      setIsConnected(data.status === 'connected');
      if (data.status === 'connected') {
        setError(null);
      }
    };

    const handleError = (data: { message: string }) => {
      setError(new Error(data.message));
    };

    sseClient.on('connection', handleConnection);
    sseClient.on('error', handleError);

    // Cleanup
    return () => {
      sseClient.off('connection', handleConnection);
      sseClient.off('error', handleError);
      // Don't disconnect in cleanup as other components might still be using it
      // sseClient.disconnect();
    };
  }, []);

  const sendMessage = useCallback((message: string, messageId?: string) => {
    console.log('[useSSE] sendMessage called with:', message);
    console.log('[useSSE] isConnected:', isConnected);
    
    if (!isConnected) {
      console.error('[useSSE] Cannot send message: Not connected');
      return;
    }
    
    console.log('[useSSE] Sending message via SSE client');
    sseClient.sendMessage(message, messageId).catch((err) => {
      setError(err);
      console.error('[useSSE] Failed to send message:', err);
    });
  }, [isConnected]);

  const onThinkingUpdate = useCallback((callback: (update: ThinkingUpdate) => void) => {
    sseClient.on('thinking_update', callback);
    return () => sseClient.off('thinking_update', callback);
  }, []);

  const onMessageUpdate = useCallback((callback: (update: MessageUpdate) => void) => {
    sseClient.on('message_update', callback);
    return () => sseClient.off('message_update', callback);
  }, []);

  const onNewMessage = useCallback((callback: (message: NewMessage) => void) => {
    sseClient.on('new_message', callback);
    return () => sseClient.off('new_message', callback);
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
    onThinkingUpdate,
    onMessageUpdate,
    onNewMessage,
    connectionStatus,
  };
}

// For backwards compatibility - components can import this instead of useWebSocket
export { useSSE as useWebSocket };