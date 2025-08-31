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
  
  // Vana-specific state
  isVanaConnected: boolean;
  currentTaskId: string | null;
  agentProgress: Map<string, VanaAgentProgress>;
  
  // Control functions
  startVanaStream: (chatId: string, message: ChatMessage, options?: VanaStreamOptions) => Promise<void>;
  stopVanaStream: () => void;
  clearDataStream: () => void;
  
  // Event subscriptions
  onVanaEvent: (handler: (event: VanaSSEEvent) => void) => () => void;
  onAgentProgress: (handler: (progress: VanaAgentProgress) => void) => () => void;
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
  baseUrl = 'http://localhost:8000',
  enableReconnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 1000,
}: VanaDataStreamProviderProps) {
  // Core state compatible with DataStreamProvider
  const [dataStream, setDataStream] = useState<DataUIPart<CustomUIDataTypes>[]>([]);
  
  // Vana-specific state
  const [isVanaConnected, setIsVanaConnected] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [agentProgress, setAgentProgress] = useState<Map<string, VanaAgentProgress>>(new Map());
  
  // Internal state for connection management
  const eventSourceRef = useRef<EventSource | null>(null);
  const eventHandlersRef = useRef<Set<(event: VanaSSEEvent) => void>>(new Set());
  const progressHandlersRef = useRef<Set<(progress: VanaAgentProgress) => void>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      
      case 'agent_progress':
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
   * Handle incoming SSE events from Vana backend
   */
  const handleVanaEvent = useCallback((event: VanaSSEEvent, options: VanaStreamOptions) => {
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
      progressHandlersRef.current.forEach(handler => handler(progress));
      
      if (options.onProgress) {
        options.onProgress(progress);
      }
    }

    // Notify event handlers
    eventHandlersRef.current.forEach(handler => handler(event));

    // Handle completion
    if (event.type === 'task_complete') {
      setIsVanaConnected(false);
      setCurrentTaskId(null);
      if (options.onComplete) {
        options.onComplete();
      }
    }
  }, [convertVanaEventToDataPart]);

  /**
   * Start Vana stream connection
   */
  const startVanaStream = useCallback(async (
    chatId: string, 
    message: ChatMessage, 
    options: VanaStreamOptions = {}
  ) => {
    const finalBaseUrl = options.baseUrl || baseUrl;
    
    try {
      // Close any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setIsVanaConnected(false);
      setCurrentTaskId(null);
      
      // Send message to Vana backend
      console.log('Starting Vana stream for chat:', chatId);
      const response = await fetch(`${finalBaseUrl}/chat/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          message: message.content,
          message_id: message.id,
          model: options.model || 'gemini-pro',
          metadata: {
            role: message.role,
            created_at: message.createdAt || new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Vana API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const taskId = result.task_id;
      setCurrentTaskId(taskId);

      // Establish SSE connection
      const sseUrl = `${finalBaseUrl}/chat/${chatId}/stream?task_id=${taskId}`;
      console.log('Connecting to Vana SSE:', sseUrl);
      
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('Vana SSE connection established');
        setIsVanaConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (sseEvent) => {
        try {
          const vanaEvent: VanaSSEEvent = JSON.parse(sseEvent.data);
          vanaEvent.timestamp = Date.now();
          handleVanaEvent(vanaEvent, options);
        } catch (error) {
          console.error('Error parsing Vana SSE event:', error);
          if (options.onError) {
            options.onError(new Error(`Failed to parse SSE event: ${error.message}`));
          }
        }
      };

      eventSource.onerror = (error) => {
        console.error('Vana SSE connection error:', error);
        setIsVanaConnected(false);
        
        // Handle reconnection if enabled
        if (enableReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current); // Exponential backoff
          reconnectAttemptsRef.current++;
          
          console.log(`Attempting to reconnect to Vana SSE (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            startVanaStream(chatId, message, options);
          }, delay);
        } else if (options.onError) {
          options.onError(new Error('Vana SSE connection failed'));
        }
      };

      // Handle specific SSE event types
      eventSource.addEventListener('agent_response_start', (event) => {
        const data = JSON.parse(event.data);
        handleVanaEvent({ type: 'agent_response_start', data }, options);
      });

      eventSource.addEventListener('agent_response_chunk', (event) => {
        const data = JSON.parse(event.data);
        handleVanaEvent({ type: 'agent_response_chunk', data }, options);
      });

      eventSource.addEventListener('agent_response_complete', (event) => {
        const data = JSON.parse(event.data);
        handleVanaEvent({ type: 'agent_response_complete', data }, options);
      });

      eventSource.addEventListener('agent_progress', (event) => {
        const data = JSON.parse(event.data);
        handleVanaEvent({ type: 'agent_progress', data }, options);
      });

      eventSource.addEventListener('error', (event) => {
        const data = JSON.parse(event.data);
        handleVanaEvent({ type: 'error', data }, options);
      });

    } catch (error) {
      console.error('Failed to start Vana stream:', error);
      setIsVanaConnected(false);
      setCurrentTaskId(null);
      
      if (options.onError) {
        options.onError(error as Error);
      }
      throw error;
    }
  }, [baseUrl, enableReconnect, maxReconnectAttempts, reconnectDelay, handleVanaEvent]);

  /**
   * Stop Vana stream connection
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
    reconnectAttemptsRef.current = 0;
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
    
    // Vana-specific features
    isVanaConnected,
    currentTaskId,
    agentProgress,
    
    // Control functions
    startVanaStream,
    stopVanaStream,
    clearDataStream,
    
    // Event subscriptions
    onVanaEvent,
    onAgentProgress,
  }), [
    dataStream,
    isVanaConnected,
    currentTaskId,
    agentProgress,
    startVanaStream,
    stopVanaStream,
    clearDataStream,
    onVanaEvent,
    onAgentProgress,
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