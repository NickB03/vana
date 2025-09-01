'use client';

import React, { 
  createContext, 
  useContext, 
  useMemo, 
  useState, 
  useCallback, 
  useEffect, 
  useRef 
} from 'react';
import type { DataUIPart } from 'ai';
import type { CustomUIDataTypes, ChatMessage } from '@/lib/types';
import { extractMessageContent, getMessageCreatedAt } from '@/lib/types';
import { 
  SSEConnectionError, 
  VanaBackendError, 
  StreamParsingError, 
  createVanaErrorFromResponse,
  calculateBackoffDelay 
} from '@/lib/errors';
import { toast } from './toast';

// Vana SSE Event Types
interface VanaSSEEvent {
  type: 'agent_response_start' | 'agent_response_chunk' | 'agent_response_complete' | 'agent_progress' | 'error' | 'message_delta' | 'message_complete' | 'task_complete';
  data: any;
  id?: string;
  retry?: number;
  timestamp?: number;
}

interface VanaAgentProgress {
  agent_id: string;
  task_id: string;
  progress: number; // 0-100
  status: 'initializing' | 'running' | 'completed' | 'failed' | 'paused';
  message?: string;
  step?: string;
  data?: any;
}

interface VanaDataStreamContextValue {
  // Compatible with existing DataStreamContext
  dataStream: DataUIPart<CustomUIDataTypes>[];
  setDataStream: React.Dispatch<React.SetStateAction<DataUIPart<CustomUIDataTypes>[]>>;
  
  // Stream provider properties (required by enhanced-chat.tsx)
  streamProvider: 'vercel' | 'vana' | 'hybrid';
  setStreamProvider: React.Dispatch<React.SetStateAction<'vercel' | 'vana' | 'hybrid'>>;
  
  // Vana-specific state
  isVanaConnected: boolean;
  currentTaskId: string | null;
  agentProgress: Map<string, VanaAgentProgress>;
  
  // Error handling state
  connectionState: 'connected' | 'disconnected' | 'reconnecting' | 'failed';
  lastError: Error | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  
  // Control functions
  startVanaStream: (chatId: string, message: ChatMessage, options?: VanaStreamOptions) => Promise<void>;
  stopVanaStream: () => void;
  clearDataStream: () => void;
  retryConnection: () => Promise<void>;
  
  // Event subscriptions
  onVanaEvent: (handler: (event: VanaSSEEvent) => void) => () => void;
  onAgentProgress: (handler: (progress: VanaAgentProgress) => void) => () => void;
  onConnectionStateChange: (handler: (state: 'connected' | 'disconnected' | 'reconnecting' | 'failed') => void) => () => void;
  onError: (handler: (error: Error) => void) => () => void;
}

interface VanaStreamOptions {
  model?: string;
  baseUrl?: string;
  onData?: (dataPart: DataUIPart<CustomUIDataTypes>) => void;
  onProgress?: (progress: VanaAgentProgress) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

const VanaDataStreamContext = createContext<VanaDataStreamContextValue | null>(null);

interface VanaDataStreamProviderProps {
  children: React.ReactNode;
  baseUrl?: string;
  enableReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export function VanaDataStreamProvider({
  children,
  baseUrl = process.env.NEXT_PUBLIC_VANA_BASE_URL || 'http://localhost:8000',
  enableReconnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000,
}: VanaDataStreamProviderProps) {
  // Core state compatible with DataStreamProvider
  const [dataStream, setDataStream] = useState<DataUIPart<CustomUIDataTypes>[]>([]);
  
  // Stream provider state
  const [streamProvider, setStreamProvider] = useState<'vercel' | 'vana' | 'hybrid'>('vana');
  
  // Vana-specific state
  const [isVanaConnected, setIsVanaConnected] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [agentProgress, setAgentProgress] = useState<Map<string, VanaAgentProgress>>(new Map());
  
  // Enhanced error handling state
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting' | 'failed'>('disconnected');
  const [lastError, setLastError] = useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Internal state for connection management
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventHandlersRef = useRef<Set<(event: VanaSSEEvent) => void>>(new Set());
  const progressHandlersRef = useRef<Set<(progress: VanaAgentProgress) => void>>(new Set());
  const connectionStateHandlersRef = useRef<Set<(state: 'connected' | 'disconnected' | 'reconnecting' | 'failed') => void>>(new Set());
  const errorHandlersRef = useRef<Set<(error: Error) => void>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentStreamOptionsRef = useRef<VanaStreamOptions | null>(null);
  const currentChatIdRef = useRef<string | null>(null);
  const currentMessageRef = useRef<ChatMessage | null>(null);

  /**
   * Convert Vana SSE events to AI SDK DataUIPart format
   * This ensures compatibility with existing Messages component
   */
  const convertVanaEventToDataPart = useCallback((event: VanaSSEEvent): DataUIPart<CustomUIDataTypes> | null => {
    switch (event.type) {
      case 'agent_response_start':
        // Initialize a new message
        return {
          type: 'data-appendMessage',
          data: JSON.stringify({
            id: event.data.message_id || `msg-${Date.now()}`,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
            metadata: {
              agent_id: event.data.agent_id,
              task_id: event.data.task_id,
              type: 'agent_response',
            },
          }),
        };
      
      case 'agent_response_chunk':
      case 'message_delta':
        // Stream text content
        return {
          type: 'data-textDelta',
          data: event.data.content || event.data.delta || '',
        };
      
      case 'agent_response_complete':
      case 'message_complete':
        // Mark message as complete
        return {
          type: 'data-finish',
          data: null,
        };
      
      case 'agent_progress': {
        // Convert progress updates to visible messages
        const progress = event.data as VanaAgentProgress;
        return {
          type: 'data-appendMessage',
          data: JSON.stringify({
            id: `progress-${progress.task_id}-${progress.agent_id}-${Date.now()}`,
            role: 'assistant',
            content: `🤖 **${progress.agent_id}**: ${progress.message || progress.step || 'Processing...'}`,
            createdAt: new Date().toISOString(),
            metadata: {
              type: 'agent_progress',
              agent_id: progress.agent_id,
              task_id: progress.task_id,
              progress: progress.progress,
              status: progress.status,
            },
          }),
        };
      }
      
      case 'task_complete':
        // Task completion
        return {
          type: 'data-appendMessage',
          data: JSON.stringify({
            id: `complete-${event.data.task_id}`,
            role: 'assistant',
            content: '✅ Task completed successfully.',
            createdAt: new Date().toISOString(),
            metadata: {
              type: 'task_complete',
              task_id: event.data.task_id,
            },
          }),
        };
      
      case 'error':
        // Handle errors
        return {
          type: 'data-appendMessage',
          data: JSON.stringify({
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `❌ Error: ${event.data.message || 'Unknown error occurred'}`,
            createdAt: new Date().toISOString(),
            metadata: {
              type: 'error',
              error: event.data,
            },
          }),
        };
      
      default:
        console.warn('Unknown Vana event type:', event.type, event);
        return null;
    }
  }, []);

  /**
   * Handle incoming SSE events from Vana backend with error handling
   */
  const handleVanaEvent = useCallback((event: VanaSSEEvent, options: VanaStreamOptions) => {
    try {
      // Convert to DataUIPart for compatibility
      const dataPart = convertVanaEventToDataPart(event);
      if (dataPart) {
        setDataStream(prev => [...prev, dataPart]);
        
        // Call custom onData handler if provided
        if (options.onData) {
          options.onData(dataPart);
        }
      }

      // Handle agent progress updates
      if (event.type === 'agent_progress') {
        const progress = event.data as VanaAgentProgress;
        setAgentProgress(prev => new Map(prev.set(progress.agent_id, progress)));
        
        // Notify progress handlers
        progressHandlersRef.current.forEach(handler => {
          try {
            handler(progress);
          } catch (error) {
            console.warn('Progress handler error:', error);
          }
        });
        
        if (options.onProgress) {
          try {
            options.onProgress(progress);
          } catch (error) {
            console.warn('Progress callback error:', error);
          }
        }
      }

      // Handle error events from VANA
      if (event.type === 'error') {
        const errorData = event.data;
        const vanaError = new VanaBackendError(
          errorData.message || 'VANA backend error',
          errorData.code || 'UNKNOWN_ERROR',
          errorData.status || 500,
          { retryable: errorData.retryable !== false, details: errorData }
        );
        
        handleError(vanaError, options);
        return; // Don't process further
      }

      // Notify event handlers with error handling
      eventHandlersRef.current.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.warn('Event handler error:', error);
        }
      });

      // Handle completion
      if (event.type === 'task_complete') {
        setIsVanaConnected(false);
        setCurrentTaskId(null);
        setConnectionState('disconnected');
        
        if (options.onComplete) {
          try {
            options.onComplete();
          } catch (error) {
            console.warn('Completion callback error:', error);
          }
        }
      }
    } catch (error) {
      const handlingError = error instanceof Error 
        ? error 
        : new Error('Failed to handle VANA event');
      
      handleError(handlingError, options);
    }
  }, [convertVanaEventToDataPart]);

  /**
   * Enhanced error handling function
   */
  const handleError = useCallback((error: Error, options?: VanaStreamOptions) => {
    setLastError(error);
    errorHandlersRef.current.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.warn('Error handler callback error:', err);
      }
    });

    // Call user error handler
    if (options?.onError) {
      try {
        options.onError(error);
      } catch (err) {
        console.warn('User error callback error:', err);
      }
    }

    // Determine connection state based on error type
    if (error instanceof SSEConnectionError) {
      setConnectionState('disconnected');
      setIsVanaConnected(false);
      
      // Auto-retry for retryable SSE errors
      if (error.retryable && reconnectAttempts < maxReconnectAttempts) {
        scheduleReconnection();
      } else {
        setConnectionState('failed');
        toast({
          type: 'error',
          description: 'Connection failed after multiple attempts. Please refresh the page.',
        });
      }
    } else if (error instanceof VanaBackendError) {
      if (error.retryable && reconnectAttempts < maxReconnectAttempts) {
        setConnectionState('reconnecting');
        scheduleReconnection();
      } else {
        setConnectionState('failed');
        setIsVanaConnected(false);
      }
    } else {
      setConnectionState('failed');
      setIsVanaConnected(false);
      
      toast({
        type: 'error',
        description: 'An unexpected error occurred. Please refresh the page.',
      });
    }
  }, [reconnectAttempts, maxReconnectAttempts]);

  /**
   * Schedule reconnection with exponential backoff
   */
  const scheduleReconnection = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = calculateBackoffDelay(reconnectAttempts, reconnectDelay);
    setConnectionState('reconnecting');
    setReconnectAttempts(prev => prev + 1);

    toast({
      type: 'warning',
      description: `Connection lost. Retrying in ${Math.round(delay / 1000)}s... (${reconnectAttempts + 1}/${maxReconnectAttempts})`,
    });

    reconnectTimeoutRef.current = setTimeout(async () => {
      if (currentChatIdRef.current && currentMessageRef.current && currentStreamOptionsRef.current) {
        try {
          await startVanaStream(
            currentChatIdRef.current,
            currentMessageRef.current,
            currentStreamOptionsRef.current
          );
        } catch (error) {
          console.error('Reconnection failed:', error);
          handleError(error instanceof Error ? error : new Error('Reconnection failed'));
        }
      }
    }, delay);
  }, [reconnectAttempts, reconnectDelay, maxReconnectAttempts]);

  /**
   * Retry connection manually
   */
  const retryConnection = useCallback(async () => {
    if (currentChatIdRef.current && currentMessageRef.current && currentStreamOptionsRef.current) {
      setReconnectAttempts(0);
      setLastError(null);
      
      try {
        await startVanaStream(
          currentChatIdRef.current,
          currentMessageRef.current,
          currentStreamOptionsRef.current
        );
      } catch (error) {
        const retryError = error instanceof Error ? error : new Error('Manual retry failed');
        handleError(retryError);
        throw retryError;
      }
    } else {
      throw new Error('No previous connection to retry');
    }
  }, []);

  /**
   * Start Vana stream connection with comprehensive error handling
   */
  const startVanaStream = useCallback(async (
    chatId: string, 
    message: ChatMessage, 
    options: VanaStreamOptions = {}
  ) => {
    const finalBaseUrl = options.baseUrl || baseUrl;
    
    // Store current parameters for reconnection
    currentChatIdRef.current = chatId;
    currentMessageRef.current = message;
    currentStreamOptionsRef.current = options;
    
    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setIsVanaConnected(false);
      setCurrentTaskId(null);
      setConnectionState('connecting' as any);
      setLastError(null);
      
      // Send message to Vana backend with timeout
      console.log('Starting Vana stream for chat:', chatId);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
      
      let response: Response;
      try {
        response = await fetch(`${finalBaseUrl}/chat/${chatId}/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            message: extractMessageContent(message),
            message_id: message.id,
            model: options.model || 'gemini-pro',
            metadata: {
              role: message.role,
              created_at: getMessageCreatedAt(message),
            },
          }),
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const vanaError = await createVanaErrorFromResponse(response);
        throw vanaError;
      }

      let result: any;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new StreamParsingError(
          'Failed to parse VANA response',
          await response.text(),
          'json',
          parseError instanceof Error ? parseError : undefined
        );
      }

      if (!result.task_id) {
        throw new VanaBackendError(
          'Invalid VANA response: missing task_id',
          'INVALID_RESPONSE',
          400,
          { retryable: false, details: result }
        );
      }

      const taskId = result.task_id;
      setCurrentTaskId(taskId);

      // Establish SSE connection with comprehensive error handling
      const sseUrl = `${finalBaseUrl}/chat/${chatId}/stream?task_id=${taskId}`;
      console.log('Connecting to Vana SSE:', sseUrl);
      
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      // Set up connection timeout
      const connectionTimeoutId = setTimeout(() => {
        const timeoutError = new SSEConnectionError(
          'SSE connection timeout',
          { retryable: true, reconnectAttempt: reconnectAttempts }
        );
        handleError(timeoutError, options);
      }, 15000); // 15s timeout

      eventSource.onopen = () => {
        clearTimeout(connectionTimeoutId);
        console.log('Vana SSE connection established');
        setIsVanaConnected(true);
        setConnectionState('connected');
        setReconnectAttempts(0);
        
        // Notify connection state handlers
        connectionStateHandlersRef.current.forEach(handler => {
          try {
            handler('connected');
          } catch (error) {
            console.warn('Connection state handler error:', error);
          }
        });

        toast({
          type: 'success',
          description: 'Connected to VANA backend successfully.',
        });
      };

      eventSource.onmessage = (sseEvent) => {
        try {
          const vanaEvent: VanaSSEEvent = JSON.parse(sseEvent.data);
          vanaEvent.timestamp = Date.now();
          handleVanaEvent(vanaEvent, options);
        } catch (error) {
          const parseError = new StreamParsingError(
            'Failed to parse SSE event',
            sseEvent.data,
            'event',
            error instanceof Error ? error : undefined
          );
          handleError(parseError, options);
        }
      };

      eventSource.onerror = (errorEvent) => {
        clearTimeout(connectionTimeoutId);
        console.error('Vana SSE connection error:', errorEvent);
        
        const sseError = new SSEConnectionError(
          'SSE connection failed',
          { 
            retryable: enableReconnect && reconnectAttempts < maxReconnectAttempts,
            reconnectAttempt: reconnectAttempts
          }
        );
        
        handleError(sseError, options);
      };

      // Handle specific SSE event types with error handling
      eventSource.addEventListener('agent_response_start', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleVanaEvent({ type: 'agent_response_start', data }, options);
        } catch (error) {
          const parseError = new StreamParsingError(
            'Failed to parse agent_response_start event',
            event.data,
            'event',
            error instanceof Error ? error : undefined
          );
          handleError(parseError, options);
        }
      });

      eventSource.addEventListener('agent_response_chunk', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleVanaEvent({ type: 'agent_response_chunk', data }, options);
        } catch (error) {
          const parseError = new StreamParsingError(
            'Failed to parse agent_response_chunk event',
            event.data,
            'event',
            error instanceof Error ? error : undefined
          );
          handleError(parseError, options);
        }
      });

      eventSource.addEventListener('agent_response_complete', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleVanaEvent({ type: 'agent_response_complete', data }, options);
        } catch (error) {
          const parseError = new StreamParsingError(
            'Failed to parse agent_response_complete event',
            event.data,
            'event',
            error instanceof Error ? error : undefined
          );
          handleError(parseError, options);
        }
      });

      eventSource.addEventListener('agent_progress', (event) => {
        try {
          const data = JSON.parse(event.data);
          handleVanaEvent({ type: 'agent_progress', data }, options);
        } catch (error) {
          const parseError = new StreamParsingError(
            'Failed to parse agent_progress event',
            event.data,
            'event',
            error instanceof Error ? error : undefined
          );
          handleError(parseError, options);
        }
      });

      eventSource.addEventListener('error', (event) => {
        try {
          const messageEvent = event as MessageEvent;
          const data = JSON.parse(messageEvent.data);
          handleVanaEvent({ type: 'error', data }, options);
        } catch (error) {
          const parseError = new StreamParsingError(
            'Failed to parse error event',
            (event as MessageEvent).data,
            'event',
            error instanceof Error ? error : undefined
          );
          handleError(parseError, options);
        }
      });

    } catch (error) {
      console.error('Failed to start Vana stream:', error);
      
      const streamError = error instanceof Error 
        ? error 
        : new VanaBackendError('Failed to start VANA stream', 'STREAM_START_FAILED', 500);
      
      handleError(streamError, options);
      throw streamError;
    }
  }, [baseUrl, enableReconnect, maxReconnectAttempts, reconnectDelay, handleVanaEvent, handleError, reconnectAttempts]);

  /**
   * Enhanced stop function with cleanup
   */
  const stopVanaStream = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsVanaConnected(false);
    setCurrentTaskId(null);
    setConnectionState('disconnected');
    setReconnectAttempts(0);
    setLastError(null);
    
    // Clear stored parameters
    currentChatIdRef.current = null;
    currentMessageRef.current = null;
    currentStreamOptionsRef.current = null;

    // Notify connection state handlers
    connectionStateHandlersRef.current.forEach(handler => {
      try {
        handler('disconnected');
      } catch (error) {
        console.warn('Connection state handler error:', error);
      }
    });
  }, []);

  /**
   * Subscribe to connection state changes
   */
  const onConnectionStateChange = useCallback((handler: (state: 'connected' | 'disconnected' | 'reconnecting' | 'failed') => void) => {
    connectionStateHandlersRef.current.add(handler);
    return () => connectionStateHandlersRef.current.delete(handler);
  }, []);

  /**
   * Subscribe to error events
   */
  const onError = useCallback((handler: (error: Error) => void) => {
    errorHandlersRef.current.add(handler);
    return () => errorHandlersRef.current.delete(handler);
  }, []);

  /**
   * Clear data stream and reset state
   */
  const clearDataStream = useCallback(() => {
    setDataStream([]);
    setAgentProgress(new Map());
  }, []);

  /**
   * Subscribe to Vana events
   */
  const onVanaEvent = useCallback((handler: (event: VanaSSEEvent) => void) => {
    eventHandlersRef.current.add(handler);
    return () => eventHandlersRef.current.delete(handler);
  }, []);

  /**
   * Subscribe to agent progress updates
   */
  const onAgentProgress = useCallback((handler: (progress: VanaAgentProgress) => void) => {
    progressHandlersRef.current.add(handler);
    return () => progressHandlersRef.current.delete(handler);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVanaStream();
    };
  }, [stopVanaStream]);

  // Context value
  const value = useMemo(() => ({
    // Compatible with existing DataStreamProvider
    dataStream,
    setDataStream,
    
    // Stream provider properties
    streamProvider,
    setStreamProvider,
    
    // Vana-specific features
    isVanaConnected,
    currentTaskId,
    agentProgress,
    
    // Error handling state
    connectionState,
    lastError,
    reconnectAttempts,
    maxReconnectAttempts,
    
    // Control functions
    startVanaStream,
    stopVanaStream,
    clearDataStream,
    retryConnection,
    
    // Event subscriptions
    onVanaEvent,
    onAgentProgress,
    onConnectionStateChange,
    onError,
  }), [
    dataStream,
    streamProvider,
    isVanaConnected,
    currentTaskId,
    agentProgress,
    connectionState,
    lastError,
    reconnectAttempts,
    maxReconnectAttempts,
    startVanaStream,
    stopVanaStream,
    clearDataStream,
    retryConnection,
    onVanaEvent,
    onAgentProgress,
    onConnectionStateChange,
    onError,
  ]);

  return (
    <VanaDataStreamContext.Provider value={value}>
      {children}
    </VanaDataStreamContext.Provider>
  );
}

/**
 * Hook to access Vana data stream context
 */
export function useVanaDataStream() {
  const context = useContext(VanaDataStreamContext);
  if (!context) {
    throw new Error('useVanaDataStream must be used within a VanaDataStreamProvider');
  }
  return context;
}

/**
 * Backward compatibility hook that provides the same interface as useDataStream
 * This allows existing components to work without changes
 */
export function useDataStream() {
  const context = useContext(VanaDataStreamContext);
  if (!context) {
    throw new Error('useDataStream must be used within a VanaDataStreamProvider');
  }
  return {
    dataStream: context.dataStream,
    setDataStream: context.setDataStream,
  };
}

export default VanaDataStreamProvider;