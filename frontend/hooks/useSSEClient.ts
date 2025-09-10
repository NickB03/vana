/**
 * SSE Client Hook
 * 
 * This hook provides a robust Server-Sent Events client with automatic
 * reconnection, exponential backoff, and comprehensive event handling
 * for the Vana research platform's real-time updates.
 * 
 * Based on contracts/sse-events.yaml specifications
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  SSEConfig,
  SSEConnectionStatus,
  SSEEventHandlers,
  SSEEvent,
  ConnectionEstablishedEvent,
  HeartbeatEvent,
  ConnectionErrorEvent,
  QueryReceivedEvent,
  ProcessingStartedEvent,
  AgentStartedEvent,
  AgentProgressEvent,
  AgentCompletedEvent,
  PartialResultEvent,
  QualityCheckEvent,
  ResultGeneratedEvent,
  ProcessingCompleteEvent,
  ErrorOccurredEvent,
  TimeoutWarningEvent,
  UserCancelledEvent,
} from '../types/chat';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_SSE_CONFIG: SSEConfig = {
  url: 'http://localhost:8000/api/run_sse',
  reconnect: true,
  maxRetries: 10,
  retryDelay: 1000,
  heartbeatTimeout: 45000, // 45 seconds (server sends every 30)
};

// =============================================================================
// HOOK INTERFACE
// =============================================================================

export interface UseSSEClientOptions {
  config?: Partial<SSEConfig>;
  handlers?: SSEEventHandlers;
  autoConnect?: boolean;
  token?: string;
}

export interface UseSSEClientReturn {
  connectionStatus: SSEConnectionStatus;
  connect: (queryContent?: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  lastError: string | null;
  retryCount: number;
  connectionId: string | null;
}

// =============================================================================
// EXPONENTIAL BACKOFF UTILITY
// =============================================================================

class ExponentialBackoff {
  private attempt = 0;
  private readonly initialDelay: number;
  private readonly maxDelay: number;
  private readonly multiplier: number;
  private readonly maxAttempts: number;

  constructor(
    initialDelay = 1000,
    maxDelay = 30000,
    multiplier = 2,
    maxAttempts = 10
  ) {
    this.initialDelay = initialDelay;
    this.maxDelay = maxDelay;
    this.multiplier = multiplier;
    this.maxAttempts = maxAttempts;
  }

  next(): number | null {
    if (this.attempt >= this.maxAttempts) {
      return null;
    }

    const delay = Math.min(
      this.initialDelay * Math.pow(this.multiplier, this.attempt),
      this.maxDelay
    );

    this.attempt++;
    return delay;
  }

  reset(): void {
    this.attempt = 0;
  }

  get currentAttempt(): number {
    return this.attempt;
  }
}

// =============================================================================
// SSE CLIENT HOOK
// =============================================================================

export function useSSEClient(options: UseSSEClientOptions = {}): UseSSEClientReturn {
  const {
    config: userConfig = {},
    handlers = {},
    autoConnect = false,
    token,
  } = options;

  const config = { ...DEFAULT_SSE_CONFIG, ...userConfig };
  
  // State
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  // Refs for persistent data
  const eventSourceRef = useRef<EventSource | null>(null);
  const backoffRef = useRef<ExponentialBackoff>(
    new ExponentialBackoff(config.retryDelay, 30000, 2, config.maxRetries)
  );
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const queryContentRef = useRef<string | null>(null);

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  const handleConnectionEstablished = useCallback((data: ConnectionEstablishedEvent) => {
    console.log('[SSE] Connection established:', data);
    setConnectionStatus('connected');
    setConnectionId(data.connectionId);
    setLastError(null);
    backoffRef.current.reset();
    
    // Set up heartbeat monitoring
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.warn('[SSE] Heartbeat timeout - connection may be stale');
      setConnectionStatus('reconnecting');
      reconnect();
    }, config.heartbeatTimeout);

    handlers.onConnectionEstablished?.({ event: 'connection_established', data });
  }, [handlers.onConnectionEstablished, config.heartbeatTimeout]);

  const handleHeartbeat = useCallback((data: HeartbeatEvent) => {
    // Reset heartbeat timeout on each heartbeat
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    heartbeatTimeoutRef.current = setTimeout(() => {
      console.warn('[SSE] Heartbeat timeout - connection may be stale');
      setConnectionStatus('reconnecting');
      reconnect();
    }, config.heartbeatTimeout);

    handlers.onHeartbeat?.({ event: 'heartbeat', data });
  }, [handlers.onHeartbeat, config.heartbeatTimeout]);

  const handleConnectionError = useCallback((data: ConnectionErrorEvent) => {
    console.error('[SSE] Connection error:', data);
    setLastError(data.message);
    setConnectionStatus('error');
    
    if (data.reconnectAllowed && config.reconnect) {
      const delay = data.retryAfter * 1000 || backoffRef.current.next();
      if (delay) {
        setTimeout(() => reconnect(), delay);
      }
    }

    handlers.onConnectionError?.({ event: 'connection_error', data });
  }, [handlers.onConnectionError, config.reconnect]);

  // Research event handlers
  const handleQueryReceived = useCallback((data: QueryReceivedEvent) => {
    handlers.onQueryReceived?.({ event: 'query_received', data });
  }, [handlers.onQueryReceived]);

  const handleProcessingStarted = useCallback((data: ProcessingStartedEvent) => {
    handlers.onProcessingStarted?.({ event: 'processing_started', data });
  }, [handlers.onProcessingStarted]);

  const handleAgentStarted = useCallback((data: AgentStartedEvent) => {
    handlers.onAgentStarted?.({ event: 'agent_started', data });
  }, [handlers.onAgentStarted]);

  const handleAgentProgress = useCallback((data: AgentProgressEvent) => {
    handlers.onAgentProgress?.({ event: 'agent_progress', data });
  }, [handlers.onAgentProgress]);

  const handleAgentCompleted = useCallback((data: AgentCompletedEvent) => {
    handlers.onAgentCompleted?.({ event: 'agent_completed', data });
  }, [handlers.onAgentCompleted]);

  const handlePartialResult = useCallback((data: PartialResultEvent) => {
    handlers.onPartialResult?.({ event: 'partial_result', data });
  }, [handlers.onPartialResult]);

  const handleQualityCheck = useCallback((data: QualityCheckEvent) => {
    handlers.onQualityCheck?.({ event: 'quality_check', data });
  }, [handlers.onQualityCheck]);

  const handleResultGenerated = useCallback((data: ResultGeneratedEvent) => {
    handlers.onResultGenerated?.({ event: 'result_generated', data });
  }, [handlers.onResultGenerated]);

  const handleProcessingComplete = useCallback((data: ProcessingCompleteEvent) => {
    handlers.onProcessingComplete?.({ event: 'processing_complete', data });
  }, [handlers.onProcessingComplete]);

  const handleErrorOccurred = useCallback((data: ErrorOccurredEvent) => {
    console.error('[SSE] Processing error:', data);
    setLastError(data.message);
    handlers.onErrorOccurred?.({ event: 'error_occurred', data });
  }, [handlers.onErrorOccurred]);

  const handleTimeoutWarning = useCallback((data: TimeoutWarningEvent) => {
    console.warn('[SSE] Timeout warning:', data);
    handlers.onTimeoutWarning?.({ event: 'timeout_warning', data });
  }, [handlers.onTimeoutWarning]);

  const handleUserCancelled = useCallback((data: UserCancelledEvent) => {
    handlers.onUserCancelled?.({ event: 'user_cancelled', data });
  }, [handlers.onUserCancelled]);

  // =============================================================================
  // CONNECTION MANAGEMENT
  // =============================================================================

  const disconnect = useCallback(() => {
    console.log('[SSE] Disconnecting...');
    
    // Clear all timeouts
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close EventSource
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setConnectionStatus('disconnected');
    setConnectionId(null);
    backoffRef.current.reset();
  }, []);

  const connect = useCallback((queryContent?: string) => {
    // Store query content for reconnections
    if (queryContent !== undefined) {
      queryContentRef.current = queryContent;
    }

    // Don't connect if already connected
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
      return;
    }

    console.log('[SSE] Connecting to:', config.url);
    setConnectionStatus('connecting');
    setLastError(null);

    try {
      // Build URL with query parameters
      const url = new URL(config.url);
      if (queryContentRef.current) {
        url.searchParams.set('query', queryContentRef.current);
      }

      // Create EventSource with auth headers if available
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      // Set up event listeners
      eventSource.onopen = () => {
        console.log('[SSE] Connection opened');
      };

      eventSource.onerror = (event) => {
        console.error('[SSE] Connection error:', event);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          setConnectionStatus('disconnected');
          
          if (config.reconnect) {
            const delay = backoffRef.current.next();
            if (delay) {
              console.log(`[SSE] Reconnecting in ${delay}ms...`);
              setConnectionStatus('reconnecting');
              reconnectTimeoutRef.current = setTimeout(() => {
                connect();
              }, delay);
            } else {
              console.error('[SSE] Max reconnection attempts reached');
              setConnectionStatus('error');
              setLastError('Maximum reconnection attempts exceeded');
            }
          }
        }
      };

      // Message handler for all SSE events
      eventSource.onmessage = (event) => {
        try {
          const eventData: SSEEvent = JSON.parse(event.data);
          setLastEvent(eventData);

          // Route to specific handlers based on event type
          switch (eventData.event) {
            case 'connection_established':
              handleConnectionEstablished(eventData.data);
              break;
            case 'heartbeat':
              handleHeartbeat(eventData.data);
              break;
            case 'connection_error':
              handleConnectionError(eventData.data);
              break;
            case 'query_received':
              handleQueryReceived(eventData.data);
              break;
            case 'processing_started':
              handleProcessingStarted(eventData.data);
              break;
            case 'agent_started':
              handleAgentStarted(eventData.data);
              break;
            case 'agent_progress':
              handleAgentProgress(eventData.data);
              break;
            case 'agent_completed':
              handleAgentCompleted(eventData.data);
              break;
            case 'partial_result':
              handlePartialResult(eventData.data);
              break;
            case 'quality_check':
              handleQualityCheck(eventData.data);
              break;
            case 'result_generated':
              handleResultGenerated(eventData.data);
              break;
            case 'processing_complete':
              handleProcessingComplete(eventData.data);
              break;
            case 'error_occurred':
              handleErrorOccurred(eventData.data);
              break;
            case 'timeout_warning':
              handleTimeoutWarning(eventData.data);
              break;
            case 'user_cancelled':
              handleUserCancelled(eventData.data);
              break;
            default:
              console.warn('[SSE] Unhandled event type:', eventData.event);
          }
        } catch (error) {
          console.error('[SSE] Failed to parse event data:', error);
        }
      };

    } catch (error) {
      console.error('[SSE] Failed to create EventSource:', error);
      setConnectionStatus('error');
      setLastError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [
    config.url,
    config.reconnect,
    connectionStatus,
    handleConnectionEstablished,
    handleHeartbeat,
    handleConnectionError,
    handleQueryReceived,
    handleProcessingStarted,
    handleAgentStarted,
    handleAgentProgress,
    handleAgentCompleted,
    handlePartialResult,
    handleQualityCheck,
    handleResultGenerated,
    handleProcessingComplete,
    handleErrorOccurred,
    handleTimeoutWarning,
    handleUserCancelled,
  ]);

  const reconnect = useCallback(() => {
    console.log('[SSE] Reconnecting...');
    disconnect();
    setTimeout(() => connect(), 100); // Brief delay before reconnection
  }, [disconnect, connect]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Handle visibility changes to manage connection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - pause heartbeat monitoring
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
          heartbeatTimeoutRef.current = null;
        }
      } else {
        // Page is visible - resume heartbeat monitoring if connected
        if (connectionStatus === 'connected') {
          heartbeatTimeoutRef.current = setTimeout(() => {
            console.warn('[SSE] Heartbeat timeout after visibility change');
            reconnect();
          }, config.heartbeatTimeout);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [connectionStatus, config.heartbeatTimeout, reconnect]);

  // =============================================================================
  // RETURN INTERFACE
  // =============================================================================

  return {
    connectionStatus,
    connect,
    disconnect,
    reconnect,
    isConnected: connectionStatus === 'connected',
    lastEvent,
    lastError,
    retryCount: backoffRef.current.currentAttempt,
    connectionId,
  };
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook for simplified research query submission with SSE
 */
export function useResearchQuery() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [partialResults, setPartialResults] = useState<string[]>([]);

  const sseClient = useSSEClient({
    handlers: {
      onProcessingStarted: () => {
        setIsProcessing(true);
        setProgress(0);
        setPartialResults([]);
      },
      onAgentStarted: ({ data }) => {
        setCurrentAgent(data.task);
      },
      onAgentProgress: ({ data }) => {
        setProgress(data.progress);
      },
      onPartialResult: ({ data }) => {
        setPartialResults(prev => [...prev, data.content]);
      },
      onProcessingComplete: () => {
        setIsProcessing(false);
        setProgress(100);
        setCurrentAgent(null);
      },
      onErrorOccurred: () => {
        setIsProcessing(false);
        setCurrentAgent(null);
      },
    },
  });

  const submitQuery = useCallback((query: string) => {
    sseClient.connect(query);
  }, [sseClient]);

  return {
    ...sseClient,
    submitQuery,
    isProcessing,
    progress,
    currentAgent,
    partialResults,
  };
}