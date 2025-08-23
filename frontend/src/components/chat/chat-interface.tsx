'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useSessionStore } from '@/store/session-store';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { ChatMessage } from '@/types/session';

interface SSEEvent {
  type: string;
  data: unknown;
  id?: string;
  timestamp?: string;
}

interface ChatInterfaceProps {
  className?: string;
  initialMessage?: string;
}

export function ChatInterface({ className, initialMessage }: ChatInterfaceProps) {
  const { user, tokens } = useAuth();
  const { currentSession, addMessage, createSession } = useSessionStore();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<ChatMessage | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [currentSession?.messages, currentStreamingMessage]);
  
  // Initialize session if none exists
  useEffect(() => {
    if (!currentSession) {
      createSession();
    }
  }, [currentSession, createSession]);
  
  // Handle initial message
  useEffect(() => {
    if (initialMessage && currentSession && currentSession.messages.length === 0) {
      handleSendMessage(initialMessage);
    }
  }, [initialMessage, currentSession]);
  
  // SSE Connection Management
  const connectToSSE = () => {
    if (!currentSession?.id || !tokens?.access_token) {
      console.log('Cannot connect to SSE: missing session or token');
      return;
    }
    
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://your-backend-url'
      : 'http://localhost:8000';
    
    const sseUrl = `${baseUrl}/api/events/stream?session_id=${currentSession.id}&token=${tokens.access_token}`;
    
    try {
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('SSE Connected');
        setIsConnected(true);
        setConnectionError(null);
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);
          handleSSEEvent(data);
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setIsConnected(false);
        setConnectionError('Connection lost. Attempting to reconnect...');
        
        // Attempt to reconnect after a delay
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (currentSession?.id && tokens?.access_token) {
            connectToSSE();
          }
        }, 5000);
      };
      
      // Handle different event types
      eventSource.addEventListener('agent_response_start', (event) => {
        const data = JSON.parse(event.data);
        handleResponseStart(data);
      });
      
      eventSource.addEventListener('agent_response_chunk', (event) => {
        const data = JSON.parse(event.data);
        handleResponseChunk(data);
      });
      
      eventSource.addEventListener('agent_response_complete', (event) => {
        const data = JSON.parse(event.data);
        handleResponseComplete(data);
      });
      
      eventSource.addEventListener('error', (event) => {
        const messageEvent = event as MessageEvent;
        const data = JSON.parse(messageEvent.data);
        handleErrorEvent(data);
      });
      
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setConnectionError('Failed to establish connection');
    }
  };
  
  // SSE Event Handlers
  const handleSSEEvent = (event: SSEEvent) => {
    console.log('SSE Event:', event.type, event.data);
  };
  
  const handleResponseStart = (data: { message: ChatMessage; messageId?: string; model?: string }) => {
    setIsStreaming(true);
    
    const streamingMessage: ChatMessage = {
      id: data.messageId || `temp_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      metadata: {
        model: data.model,
        streaming: true
      }
    };
    
    setCurrentStreamingMessage(streamingMessage);
  };
  
  const handleResponseChunk = (data: { content: string; messageId: string }) => {
    if (currentStreamingMessage) {
      setCurrentStreamingMessage(prev => prev ? {
        ...prev,
        content: prev.content + (data.content || '')
      } : null);
    }
  };
  
  const handleResponseComplete = (data: { messageId: string; content?: string; model?: string; tool_calls?: unknown[] }) => {
    if (currentStreamingMessage) {
      const finalMessage: ChatMessage = {
        ...currentStreamingMessage,
        content: data.content || currentStreamingMessage.content,
        metadata: {
          ...currentStreamingMessage.metadata,
          streaming: false,
          model: data.model,
          tool_calls: data.tool_calls
        }
      };
      
      addMessage(finalMessage);
      setCurrentStreamingMessage(null);
    }
    
    setIsStreaming(false);
  };
  
  const handleErrorEvent = (data: { error: string; messageId?: string }) => {
    console.error('Agent error:', data);
    
    const errorMessage: ChatMessage = {
      id: `error_${Date.now()}`,
      role: 'assistant',
      content: `Error: ${data.error || 'An unexpected error occurred'}`,
      timestamp: Date.now(),
      metadata: {
        error: data.error
      }
    };
    
    addMessage(errorMessage);
    setCurrentStreamingMessage(null);
    setIsStreaming(false);
  };
  
  // Connect to SSE when component mounts or session changes
  useEffect(() => {
    if (currentSession?.id && tokens?.access_token) {
      connectToSSE();
    }
    
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [currentSession?.id, tokens?.access_token]);
  
  // Handle sending messages
  const handleSendMessage = async (content: string, files?: File[]) => {
    if (!currentSession || !tokens?.access_token) {
      console.error('Cannot send message: missing session or token');
      return;
    }
    
    // Add user message immediately
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      metadata: files ? { attachments: files.map(f => f.name) } : undefined
    };
    
    addMessage(userMessage);
    
    // Send to backend
    try {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://your-backend-url'
        : 'http://localhost:8000';
      
      const formData = new FormData();
      formData.append('message', content);
      formData.append('session_id', currentSession.id);
      
      // Add files if provided
      if (files) {
        files.forEach((file, index) => {
          formData.append(`file_${index}`, file);
        });
      }
      
      const response = await fetch(`${baseUrl}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Response will come through SSE, so we don't need to handle it here
    } catch (error) {
      console.error('Failed to send message:', error);
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
      
      addMessage(errorMessage);
    }
  };
  
  // Handle retrying failed connections
  const handleRetryConnection = () => {
    setConnectionError(null);
    connectToSSE();
  };
  
  if (!user) {
    return (
      <main className="flex items-center justify-center h-full" role="main">
        <Card className="p-6 text-center" role="alert">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please log in to start chatting with the AI assistant.
          </p>
          <Button 
            onClick={() => window.location.href = '/auth/login'}
            aria-label="Navigate to login page"
          >
            Go to Login
          </Button>
        </Card>
      </main>
    );
  }
  
  if (!currentSession) {
    return (
      <main className="flex items-center justify-center h-full" role="main">
        <div className="space-y-4 w-full max-w-md" aria-label="Loading chat interface">
          <Skeleton className="h-4 w-full" aria-hidden="true" />
          <Skeleton className="h-4 w-3/4" aria-hidden="true" />
          <Skeleton className="h-4 w-1/2" aria-hidden="true" />
          <span className="sr-only">Loading chat interface, please wait...</span>
        </div>
      </main>
    );
  }
  
  return (
    <section 
      className={`flex flex-col h-full ${className}`}
      role="application"
      aria-label="AI Chat Interface"
    >
      {/* Connection Status Bar */}
      <header 
        className="flex items-center justify-between px-4 py-2 border-b"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" aria-hidden="true" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" aria-hidden="true" />
          )}
          <Badge 
            variant={isConnected ? 'default' : 'destructive'}
            aria-label={`Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          {isStreaming && (
            <Badge 
              variant="secondary" 
              className="animate-pulse"
              aria-label="AI is currently typing a response"
            >
              AI is typing...
            </Badge>
          )}
        </div>
        
        {connectionError && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryConnection}
            aria-label="Retry connection to AI service"
          >
            Retry Connection
          </Button>
        )}
      </header>
      
      {/* Error Banner */}
      {connectionError && (
        <div 
          className="px-4 py-2 bg-destructive/10 border-b border-destructive/20"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>{connectionError}</span>
          </div>
        </div>
      )}
      
      {/* Messages Area */}
      <section 
        className="flex-1 overflow-hidden"
        aria-label="Chat messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <MessageList
          messages={currentSession.messages}
          streamingMessage={currentStreamingMessage}
          isLoading={isStreaming}
        />
        <div ref={messagesEndRef} aria-hidden="true" />
      </section>
      
      {/* Input Area */}
      <footer className="border-t">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!isConnected || isStreaming}
          placeholder={!isConnected ? 'Connecting...' : 'Type your message...'}
        />
      </footer>
    </section>
  );
}