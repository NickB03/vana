/**
 * Custom hook for managing SSE (Server-Sent Events) connections
 * Handles connection, reconnection, and event processing for real-time chat
 */

import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import type { 
  SSEEvent, 
  ConnectionEvent, 
  MessageTokenEvent, 
  MessageCompleteEvent,
  AgentStartEvent,
  AgentCompleteEvent,
  ResearchSourcesEvent,
  ErrorEvent,
  HeartbeatEvent,
  SSEConnectionOptions,
  ReconnectionConfig
} from '../../lib/sse/types';

const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig = {
  maxAttempts: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  multiplier: 2,
  jitter: true,
};

const DEFAULT_HEARTBEAT_TIMEOUT = 30000; // 30 seconds

interface UseSSEConnectionOptions extends SSEConnectionOptions {
  url: string;
  autoReconnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export const useSSEConnection = (options: UseSSEConnectionOptions) => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  
  const {
    url,
    autoReconnect = true,
    withCredentials = true,
    headers = {},
    reconnection = {},
    heartbeatTimeout = DEFAULT_HEARTBEAT_TIMEOUT,
    onConnect,
    onDisconnect,
    onError,
  } = options;
  
  const reconnectionConfig = { ...DEFAULT_RECONNECTION_CONFIG, ...reconnection };
  
  // Store actions
  const {
    setConnectionState,
    incrementReconnectAttempts,
    resetReconnectAttempts,
    addError,
    addMessage,
    updateMessage,
    startStreaming,
    addStreamingToken,
    completeStreaming,
    setCurrentAgent,
    addResearchSources,
  } = useChatStore();
  
  // Clear timeouts helper
  const clearTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = undefined;
    }
  }, []);
  
  // Handle heartbeat timeout
  const handleHeartbeatTimeout = useCallback(() => {
    console.warn('SSE heartbeat timeout - connection may be stale');
    addError({
      message: 'Connection heartbeat timeout',
      type: 'network',
      retryable: true,
    });
    
    // Force reconnection
    if (autoReconnect && eventSourceRef.current) {
      eventSourceRef.current.close();
    }
  }, [addError, autoReconnect]);
  
  // Reset heartbeat timer
  const resetHeartbeatTimer = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    heartbeatTimeoutRef.current = setTimeout(handleHeartbeatTimeout, heartbeatTimeout);
  }, [handleHeartbeatTimeout, heartbeatTimeout]);
  
  // Calculate reconnection delay with jitter
  const getReconnectionDelay = useCallback((attempt: number) => {
    const delay = Math.min(
      reconnectionConfig.initialDelay * Math.pow(reconnectionConfig.multiplier, attempt),
      reconnectionConfig.maxDelay
    );
    
    if (reconnectionConfig.jitter) {
      return delay + Math.random() * 1000; // Add up to 1s jitter
    }
    
    return delay;
  }, [reconnectionConfig]);
  
  // Process SSE events
  const processEvent = useCallback((event: SSEEvent) => {
    switch (event.type) {
      case 'connection': {
        const connEvent = event as ConnectionEvent;
        setConnectionState(connEvent.status === 'connected', connEvent.sessionId);
        resetReconnectAttempts();
        
        if (connEvent.status === 'connected') {
          console.log('SSE connected:', connEvent.sessionId);
          onConnect?.();
        } else {
          console.log('SSE disconnected');
          onDisconnect?.();
        }
        break;
      }
      
      case 'heartbeat': {
        const heartbeat = event as HeartbeatEvent;
        console.debug('SSE heartbeat:', heartbeat.server_time);
        resetHeartbeatTimer();
        break;
      }
      
      case 'message_token': {
        const tokenEvent = event as MessageTokenEvent;
        addStreamingToken({
          id: `${tokenEvent.messageId}-${tokenEvent.timestamp}`,
          content: tokenEvent.token,
          timestamp: tokenEvent.timestamp,
          messageId: tokenEvent.messageId,
        });
        break;
      }
      
      case 'complete': {
        const completeEvent = event as MessageCompleteEvent;
        completeStreaming(completeEvent.messageId, completeEvent.success);
        
        if (!completeEvent.success && completeEvent.error) {
          addError({
            message: completeEvent.error,
            type: 'server',
            retryable: false,
          });
        }
        break;
      }
      
      case 'agent_start': {
        const agentEvent = event as AgentStartEvent;
        setCurrentAgent(agentEvent.agentId, agentEvent.agentName, agentEvent.agentType);
        
        // Create system message for agent start
        addMessage({
          role: 'system',
          content: `${agentEvent.agentName} (${agentEvent.agentType}) is now active`,
          status: 'complete',
          severity: 'info',
        });
        break;
      }
      
      case 'agent_complete': {
        const agentEvent = event as AgentCompleteEvent;
        
        if (!agentEvent.success && agentEvent.error) {
          addError({
            message: `Agent ${agentEvent.agentName} failed: ${agentEvent.error}`,
            type: 'server',
            retryable: true,
          });
        }
        break;
      }
      
      case 'research_sources': {
        const sourcesEvent = event as ResearchSourcesEvent;
        
        // Find the most recent assistant message to attach sources
        const messages = useChatStore.getState().currentSession?.messages || [];
        const lastAssistantMessage = messages
          .slice()
          .reverse()
          .find(m => m.role === 'assistant');
        
        if (lastAssistantMessage) {
          addResearchSources(lastAssistantMessage.id, sourcesEvent.sources);
        }
        break;
      }
      
      case 'error': {
        const errorEvent = event as ErrorEvent;
        addError({
          message: errorEvent.error,
          type: 'server',
          details: errorEvent.details,
          retryable: true,
        });
        break;
      }
      
      default:
        console.debug('Unhandled SSE event:', event);
    }
  }, [
    setConnectionState,
    resetReconnectAttempts,
    addStreamingToken,
    completeStreaming,
    setCurrentAgent,
    addMessage,
    addResearchSources,
    addError,
    resetHeartbeatTimer,
    onConnect,
    onDisconnect,
  ]);
  
  // Connect to SSE endpoint
  const connect = useCallback(() => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    console.log('Connecting to SSE:', url);
    
    try {
      const eventSource = new EventSource(url, {
        withCredentials,
      });
      
      eventSourceRef.current = eventSource;
      
      // Set up event listeners
      eventSource.onopen = () => {
        console.log('SSE connection opened');
        resetReconnectAttempts();
        resetHeartbeatTimer();
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent;
          processEvent(data);
        } catch (error) {
          console.error('Failed to parse SSE event:', error, event.data);
          addError({
            message: 'Failed to parse server message',
            type: 'validation',
            retryable: false,
            details: { data: event.data, error: error.message },
          });
        }
      };
      
      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        
        const error = new Error(`SSE connection error: ${eventSource.readyState}`);
        onError?.(error);
        
        addError({
          message: 'Connection error occurred',
          type: 'network',
          retryable: autoReconnect,
          details: { readyState: eventSource.readyState },
        });
        
        setConnectionState(false);
        clearTimeouts();
        
        // Attempt reconnection if enabled
        if (autoReconnect && reconnectAttemptsRef.current < reconnectionConfig.maxAttempts) {
          const delay = getReconnectionDelay(reconnectAttemptsRef.current);
          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${reconnectionConfig.maxAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            incrementReconnectAttempts();
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= reconnectionConfig.maxAttempts) {
          console.error('Max reconnection attempts reached');
          addError({
            message: 'Maximum reconnection attempts exceeded',
            type: 'network',
            retryable: false,
          });
        }
      };
      
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      onError?.(error as Error);
      
      addError({
        message: 'Failed to establish connection',
        type: 'network',
        retryable: true,
        details: { url, error: error.message },
      });
    }
  }, [
    url,
    withCredentials,
    autoReconnect,
    reconnectionConfig,
    processEvent,
    resetReconnectAttempts,
    incrementReconnectAttempts,
    setConnectionState,
    addError,
    resetHeartbeatTimer,
    clearTimeouts,
    getReconnectionDelay,
    onError,
  ]);
  
  // Disconnect from SSE
  const disconnect = useCallback(() => {
    clearTimeouts();
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setConnectionState(false);
    reconnectAttemptsRef.current = 0;
    
    console.log('SSE connection closed');
    onDisconnect?.();
  }, [clearTimeouts, setConnectionState, onDisconnect]);
  
  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    resetReconnectAttempts();
    connect();
  }, [connect, resetReconnectAttempts]);
  
  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);
  
  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && autoReconnect) {
        // Reconnect when page becomes visible
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          connect();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connect, autoReconnect]);
  
  // Return connection controls
  return {
    connect,
    disconnect,
    reconnect,
    isConnected: eventSourceRef.current?.readyState === EventSource.OPEN,
    readyState: eventSourceRef.current?.readyState,
  };
};