/**
 * ADK Service Layer - Usage Examples
 * Demonstrates how to integrate the new service layer with React components
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  setupADK, 
  createADKServices, 
  getDefaultADKConfig,
  type IADKClient,
  type ConnectionInfo,
  type ThinkingUpdate,
  type MessageUpdate,
  type WorkflowUpdate
} from './index';

// =============================================================================
// Context Provider Example
// =============================================================================

interface ADKContextValue {
  client: IADKClient | null;
  isConnected: boolean;
  connectionInfo: ConnectionInfo | null;
  sendMessage: (content: string) => Promise<void>;
  disconnect: () => void;
}

const ADKContext = createContext<ADKContextValue | null>(null);

export const ADKProvider: React.FC<{ 
  children: React.ReactNode;
  userId?: string;
  apiUrl?: string;
}> = ({ children, userId = 'default_user', apiUrl }) => {
  const [client, setClient] = useState<IADKClient | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize ADK client
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { client: adkClient } = await setupADK(userId, apiUrl);
        
        if (mounted) {
          setClient(adkClient);
          setConnectionInfo(adkClient.getConnectionInfo());
          setIsConnected(adkClient.isConnected());
        }
      } catch (error) {
        console.error('Failed to initialize ADK:', error);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [userId, apiUrl]);

  // Listen for connection changes
  useEffect(() => {
    if (!client) return;

    const handleConnectionChange = () => {
      setConnectionInfo(client.getConnectionInfo());
      setIsConnected(client.isConnected());
    };

    client.on('connection_change', handleConnectionChange);
    client.on('connected', handleConnectionChange);
    client.on('disconnected', handleConnectionChange);
    client.on('reconnected', handleConnectionChange);

    return () => {
      client.off('connection_change', handleConnectionChange);
      client.off('connected', handleConnectionChange);
      client.off('disconnected', handleConnectionChange);
      client.off('reconnected', handleConnectionChange);
    };
  }, [client]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, [client]);

  const sendMessage = useCallback(async (content: string) => {
    if (!client) throw new Error('ADK client not initialized');
    await client.sendMessage(content);
  }, [client]);

  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
      setClient(null);
      setConnectionInfo(null);
      setIsConnected(false);
    }
  }, [client]);

  const value: ADKContextValue = {
    client,
    isConnected,
    connectionInfo,
    sendMessage,
    disconnect
  };

  return (
    <ADKContext.Provider value={value}>
      {children}
    </ADKContext.Provider>
  );
};

export const useADK = (): ADKContextValue => {
  const context = useContext(ADKContext);
  if (!context) {
    throw new Error('useADK must be used within ADKProvider');
  }
  return context;
};

// =============================================================================
// Custom Hooks Examples
// =============================================================================

/**
 * Hook for managing ADK messages with streaming support
 */
export const useADKMessages = () => {
  const { client, sendMessage } = useADK();
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    isComplete: boolean;
    timestamp: number;
  }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!client) return;

    const handleMessageUpdate = (data: MessageUpdate) => {
      setMessages(prev => {
        const existing = prev.find(m => m.id === data.messageId);
        if (existing) {
          // Update existing message
          return prev.map(m => 
            m.id === data.messageId 
              ? { ...m, content: data.content, isComplete: data.isComplete }
              : m
          );
        } else {
          // Add new message
          return [...prev, {
            id: data.messageId,
            content: data.content,
            isComplete: data.isComplete,
            timestamp: Date.now()
          }];
        }
      });

      setIsStreaming(!data.isComplete);
    };

    const handleStreamStart = () => setIsStreaming(true);
    const handleStreamComplete = () => setIsStreaming(false);

    client.on('message_update', handleMessageUpdate);
    client.on('stream_start', handleStreamStart);
    client.on('stream_complete', handleStreamComplete);

    return () => {
      client.off('message_update', handleMessageUpdate);
      client.off('stream_start', handleStreamStart);
      client.off('stream_complete', handleStreamComplete);
    };
  }, [client]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    clearMessages
  };
};

/**
 * Hook for managing agent thinking states
 */
export const useADKThinking = () => {
  const { client } = useADK();
  const [thinkingSteps, setThinkingSteps] = useState<Array<ThinkingUpdate & { id: string }>>([]);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);

  useEffect(() => {
    if (!client) return;

    const handleThinkingUpdate = (data: ThinkingUpdate) => {
      setThinkingSteps(prev => {
        const existing = prev.find(step => step.stepId === data.stepId);
        if (existing) {
          // Update existing step
          return prev.map(step =>
            step.stepId === data.stepId 
              ? { ...step, ...data, id: step.id }
              : step
          );
        } else {
          // Add new step
          return [...prev, { ...data, id: `step_${Date.now()}` }];
        }
      });

      // Update active agents
      setActiveAgents(prev => {
        if (data.status === 'active' && !prev.includes(data.agent)) {
          return [...prev, data.agent];
        } else if (data.status === 'complete') {
          return prev.filter(agent => agent !== data.agent);
        }
        return prev;
      });
    };

    client.on('thinking_update', handleThinkingUpdate);

    return () => {
      client.off('thinking_update', handleThinkingUpdate);
    };
  }, [client]);

  const clearThinking = useCallback(() => {
    setThinkingSteps([]);
    setActiveAgents([]);
  }, []);

  return {
    thinkingSteps,
    activeAgents,
    isThinking: activeAgents.length > 0,
    clearThinking
  };
};

/**
 * Hook for tracking research workflow progress
 */
export const useADKWorkflow = () => {
  const { client } = useADK();
  const [workflowState, setWorkflowState] = useState<{
    phase: string;
    status: string;
    progress: number;
    data: Record<string, any>;
  }>({
    phase: 'idle',
    status: 'pending',
    progress: 0,
    data: {}
  });

  useEffect(() => {
    if (!client) return;

    const handleWorkflowUpdate = (data: WorkflowUpdate) => {
      setWorkflowState(prev => ({
        ...prev,
        phase: data.phase,
        status: data.status,
        data: { ...prev.data, ...data.data },
        progress: calculateProgress(data.phase, data.status)
      }));
    };

    client.on('workflow_update', handleWorkflowUpdate);

    return () => {
      client.off('workflow_update', handleWorkflowUpdate);
    };
  }, [client]);

  const calculateProgress = (phase: string, status: string): number => {
    const phases = ['planning', 'research', 'reporting'];
    const phaseIndex = phases.indexOf(phase);
    const baseProgress = (phaseIndex / phases.length) * 100;
    
    switch (status) {
      case 'complete': return baseProgress + (100 / phases.length);
      case 'active': return baseProgress + (50 / phases.length);
      default: return baseProgress;
    }
  };

  return workflowState;
};

// =============================================================================
// Component Examples
// =============================================================================

/**
 * Example chat component using the new service layer
 */
export const ChatExample: React.FC = () => {
  const { isConnected } = useADK();
  const { messages, isStreaming, sendMessage } = useADKMessages();
  const { thinkingSteps, isThinking } = useADKThinking();
  const workflow = useADKWorkflow();
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    
    try {
      await sendMessage(input);
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="chat-container">
      {/* Connection status */}
      <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {/* Workflow progress */}
      <div className="workflow-progress">
        Phase: {workflow.phase} | Status: {workflow.status} | Progress: {workflow.progress.toFixed(1)}%
      </div>

      {/* Messages */}
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className="message">
            <div className="content">{message.content}</div>
            <div className="meta">
              {message.isComplete ? 'Complete' : 'Streaming...'}
            </div>
          </div>
        ))}
      </div>

      {/* Thinking panel */}
      {isThinking && (
        <div className="thinking-panel">
          <h4>Agent Activity</h4>
          {thinkingSteps
            .filter(step => step.status === 'active')
            .map(step => (
              <div key={step.stepId} className="thinking-step">
                <strong>{step.agent}</strong>: {step.action}
              </div>
            ))}
        </div>
      )}

      {/* Input */}
      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a research question..."
          disabled={!isConnected || isStreaming}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
          onClick={handleSend} 
          disabled={!isConnected || isStreaming || !input.trim()}
        >
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
};

/**
 * Example connection status component
 */
export const ConnectionStatus: React.FC = () => {
  const { connectionInfo, isConnected } = useADK();

  if (!connectionInfo) return null;

  return (
    <div className={`connection-status ${connectionInfo.state}`}>
      <div className="indicator" />
      <span>{connectionInfo.state}</span>
      {connectionInfo.reconnectAttempts > 0 && (
        <span className="attempts">
          (Attempt {connectionInfo.reconnectAttempts})
        </span>
      )}
      {connectionInfo.error && (
        <div className="error">{connectionInfo.error.message}</div>
      )}
    </div>
  );
};

// =============================================================================
// Advanced Usage Examples
// =============================================================================

/**
 * Example of manual service creation with custom configuration
 */
export const createCustomADKServices = () => {
  const config = {
    ...getDefaultADKConfig(),
    apiUrl: 'https://custom-adk-backend.com',
    maxRetries: 3,
    retryDelay: 2000,
    timeout: 60000,
    enableLogging: true
  };

  return createADKServices(config);
};

/**
 * Example error handling
 */
export const withErrorHandling = (client: IADKClient) => {
  client.on('error', (error) => {
    console.error('ADK Error:', error);
    
    // Show user-friendly notification
    if (error.message.includes('session')) {
      showNotification('Session expired. Please refresh the page.');
    } else if (error.message.includes('connection')) {
      showNotification('Connection lost. Trying to reconnect...');
    } else {
      showNotification('Something went wrong. Please try again.');
    }
  });
};

// Mock notification function
const showNotification = (message: string) => {
  console.log('Notification:', message);
};