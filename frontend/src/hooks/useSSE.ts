/**
 * SSE React Hooks
 * Provides React hooks for SSE integration with Zustand store
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { SSEClient } from '@/lib/sse/client';
import {
  SSEConfig,
  SSEConnectionState,
  SSEEvent,
  SSEEventType,
  SSEError,
  SSEHealthStatus,
  MessagePayload,
  AgentUpdatePayload,
  ProgressPayload
} from '@/lib/sse/types';
import { useAuth, useSession, useChat } from '@/store';

// Main SSE Hook
export function useSSE(config?: Partial<SSEConfig>) {
  const [state, setState] = useState<SSEConnectionState>(SSEConnectionState.IDLE);
  const [health, setHealth] = useState<SSEHealthStatus | null>(null);
  const [error, setError] = useState<SSEError | null>(null);
  const clientRef = useRef<SSEClient | null>(null);
  
  // Get auth token from store
  const { tokens } = useAuth();
  const { currentSession } = useSession();
  
  // Initialize SSE client
  useEffect(() => {
    if (!currentSession?.id) return;
    
    const baseUrl = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:8000';
    const sseUrl = `${baseUrl}/api/sse/stream`;
    
    const sseConfig: SSEConfig = {
      url: sseUrl,
      withCredentials: true,
      headers: {
        'X-Session-ID': currentSession.id,
        ...(tokens?.access_token && { 'Authorization': `Bearer ${tokens.access_token}` })
      },
      reconnect: true,
      reconnectAttempts: 3,
      reconnectDelay: 1000,
      reconnectBackoff: 2,
      heartbeatInterval: 30000,
      pollingFallback: true,
      onOpen: () => {
        console.log('[useSSE] Connection opened');
        setState(SSEConnectionState.CONNECTED);
      },
      onMessage: (event: SSEEvent) => {
        console.log('[useSSE] Message received:', event.type);
      },
      onError: (error: SSEError) => {
        console.error('[useSSE] Error:', error);
        setError(error);
      },
      onClose: () => {
        console.log('[useSSE] Connection closed');
        setState(SSEConnectionState.CLOSED);
      },
      onReconnecting: (attempt: number) => {
        console.log(`[useSSE] Reconnecting... Attempt ${attempt}`);
        setState(SSEConnectionState.RECONNECTING);
      },
      ...config
    };
    
    const client = new SSEClient(sseConfig);
    clientRef.current = client;
    
    // Register state change handler
    const unsubscribe = client.onStateChange((newState) => {
      setState(newState);
    });
    
    // Connect automatically
    client.connect();
    
    // Update health status periodically
    const healthInterval = setInterval(() => {
      if (clientRef.current) {
        setHealth(clientRef.current.getHealth());
      }
    }, 5000);
    
    return () => {
      unsubscribe();
      clearInterval(healthInterval);
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [currentSession?.id, tokens?.access_token, config]);
  
  // Connect manually
  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.connect();
    }
  }, []);
  
  // Disconnect manually
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);
  
  // Subscribe to events
  const subscribe = useCallback((eventType: string, handler: (event: SSEEvent) => void) => {
    if (clientRef.current) {
      clientRef.current.on(eventType, handler);
      return () => {
        if (clientRef.current) {
          clientRef.current.off(eventType);
        }
      };
    }
    return () => {};
  }, []);
  
  return {
    state,
    health,
    error,
    connect,
    disconnect,
    subscribe,
    isConnected: state === SSEConnectionState.CONNECTED,
    isConnecting: state === SSEConnectionState.CONNECTING,
    isReconnecting: state === SSEConnectionState.RECONNECTING,
    isError: state === SSEConnectionState.ERROR
  };
}

// Hook for subscribing to specific event types
export function useSSEEvent<T = any>(
  eventType: SSEEventType | string,
  handler: (data: T) => void,
  deps: any[] = []
) {
  const { subscribe } = useSSE();
  
  useEffect(() => {
    const unsubscribe = subscribe(eventType, (event: SSEEvent<T>) => {
      handler(event.data);
    });
    
    return unsubscribe;
  }, [eventType, subscribe, ...deps]);
}

// Hook for message events
export function useSSEMessages(onMessage: (message: MessagePayload) => void) {
  const { addMessage, activeConversation } = useChat();
  
  useSSEEvent<MessagePayload>(
    SSEEventType.MESSAGE,
    (data) => {
      // Add to store if there's an active conversation
      if (activeConversation) {
        addMessage(activeConversation, {
          id: data.id,
          content: data.content,
          role: data.role,
          timestamp: Date.now(),
          metadata: data.metadata
        });
      }
      
      // Call handler
      onMessage(data);
    }
  );
}

// Hook for agent updates
export function useSSEAgentUpdates(onUpdate?: (update: AgentUpdatePayload) => void) {
  const [agentStates, setAgentStates] = useState<Record<string, AgentUpdatePayload>>({});
  
  useSSEEvent<AgentUpdatePayload>(
    SSEEventType.AGENT_UPDATE,
    (data) => {
      setAgentStates(prev => ({
        ...prev,
        [data.agentId]: data
      }));
      
      if (onUpdate) {
        onUpdate(data);
      }
    }
  );
  
  return agentStates;
}

// Hook for progress events
export function useSSEProgress(taskId?: string) {
  const [progress, setProgress] = useState<Record<string, ProgressPayload>>({});
  
  useSSEEvent<ProgressPayload>(
    SSEEventType.PROGRESS,
    (data) => {
      if (!taskId || data.taskId === taskId) {
        setProgress(prev => ({
          ...prev,
          [data.taskId]: data
        }));
      }
    }
  );
  
  return taskId ? progress[taskId] : progress;
}

// Hook for connection status
export function useSSEConnection() {
  const { state, health, error, connect, disconnect, isConnected } = useSSE();
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    if (state === SSEConnectionState.RECONNECTING) {
      setRetryCount(prev => prev + 1);
    } else if (state === SSEConnectionState.CONNECTED) {
      setRetryCount(0);
    }
  }, [state]);
  
  return {
    state,
    health,
    error,
    retryCount,
    connect,
    disconnect,
    isConnected,
    isHealthy: health?.connected && !error
  };
}

// Hook for SSE health monitoring
export function useSSEHealth(alertThreshold = 60000) {
  const { health } = useSSE();
  const [isStale, setIsStale] = useState(false);
  
  useEffect(() => {
    if (health?.lastHeartbeat) {
      const timeSinceHeartbeat = Date.now() - health.lastHeartbeat;
      setIsStale(timeSinceHeartbeat > alertThreshold);
    }
  }, [health, alertThreshold]);
  
  return {
    health,
    isStale,
    metrics: health?.metrics,
    latency: health?.latency,
    uptime: health?.metrics?.uptime
  };
}