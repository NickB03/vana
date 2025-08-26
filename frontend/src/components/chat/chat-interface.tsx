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
import { 
  sanitizeHtml, 
  sanitizeText, 
  chatMessageSchema, 
  sseEventSchema,
  containsMaliciousPatterns,
  isRateLimited,
  logSecurityViolation,
  setTextContentSafely
} from '@/lib/security';
import { createCORSAwareEventSource, handleSSECORS } from '@/lib/cors';
import { tokenManager, authManager } from '@/lib/auth-security';

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
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  
  // SSE Connection Management with Enhanced Security
  const connectToSSE = async () => {
    if (!currentSession?.id) {
      console.log('Cannot connect to SSE: missing session ID');
      return;
    }
    
    // Validate authentication tokens
    const tokens = await tokenManager.validateAndRefreshSession();
    if (!tokens) {
      console.error('Cannot connect to SSE: invalid or expired tokens');
      setConnectionError('Authentication required');
      return;
    }
    
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Rate limiting check
    const connectionKey = `sse_connection_${currentSession.id}`;
    if (isRateLimited(connectionKey, 10, 60000)) {
      console.warn('SSE connection rate limited');
      setConnectionError('Too many connection attempts. Please wait.');
      return;
    }
    
    // Use secure SSE URL with validated session ID
    const sseUrl = `/api/sse?session_id=${encodeURIComponent(sanitizeText(currentSession.id))}`;
    
    try {
      // Validate CORS configuration for SSE
      const corsResult = handleSSECORS(window.location.origin);
      if (!corsResult.isValid) {
        throw new Error('CORS validation failed for SSE endpoint');
      }
      
      // Create CORS-aware EventSource with credentials
      const eventSource = createCORSAwareEventSource(sseUrl);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        console.log('SSE Connected');
        setIsConnected(true);
        setConnectionError(null);
      };
      
      eventSource.onmessage = (event) => {
        try {
          // Sanitize and validate incoming event data
          const rawData = sanitizeText(event.data);
          if (!rawData || containsMaliciousPatterns(rawData)) {
            console.error('Potentially malicious SSE data blocked');
            logSecurityViolation('xss_attempt', { data: event.data, source: 'sse' });
            return;
          }
          
          const data: SSEEvent = JSON.parse(rawData);
          
          // Validate event structure
          const validatedEvent = sseEventSchema.safeParse(data);
          if (!validatedEvent.success) {
            console.error('Invalid SSE event structure:', validatedEvent.error);
            return;
          }
          
          handleSSEEvent(validatedEvent.data);
        } catch (error) {
          console.error('Failed to parse SSE event:', error);
          logSecurityViolation('invalid_input', { error: error instanceof Error ? error.message : 'Unknown', source: 'sse' });
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        setIsConnected(false);
        setConnectionError('Connection lost. EventSource will auto-reconnect...');
        
        // EventSource automatically attempts reconnection
        // No need for manual reconnect logic
      };
      
      // Handle different event types with security validation
      const handleSecureEvent = (eventType: string, handler: (data: any) => void) => {
        eventSource.addEventListener(eventType, (event) => {
          try {
            const messageEvent = event as MessageEvent;
            const sanitizedData = sanitizeText(messageEvent.data);
            
            if (containsMaliciousPatterns(sanitizedData)) {
              console.error(`Potentially malicious ${eventType} data blocked`);
              logSecurityViolation('xss_attempt', { eventType, data: messageEvent.data });
              return;
            }
            
            const data = JSON.parse(sanitizedData);
            handler(data);
          } catch (error) {
            console.error(`Failed to parse ${eventType} event:`, error);
          }
        });
      };
      
      handleSecureEvent('agent_response_start', handleResponseStart);
      handleSecureEvent('agent_response_chunk', handleResponseChunk);
      handleSecureEvent('agent_response_complete', handleResponseComplete);
      handleSecureEvent('error', handleErrorEvent);
      
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
    
    // Sanitize and validate incoming data
    const messageId = data.messageId ? sanitizeText(data.messageId) : `temp_${Date.now()}`;
    const model = data.model ? sanitizeText(data.model) : undefined;
    
    // Validate message ID format
    if (data.messageId && !data.messageId.match(/^[a-zA-Z0-9_-]+$/)) {
      console.error('Invalid message ID format');
      return;
    }
    
    const streamingMessage: ChatMessage = {
      id: messageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      metadata: {
        model,
        streaming: true
      }
    };
    
    setCurrentStreamingMessage(streamingMessage);
  };
  
  const handleResponseChunk = (data: { content: string; messageId: string }) => {
    if (currentStreamingMessage) {
      // Sanitize chunk content to prevent XSS
      const sanitizedContent = sanitizeText(data.content || '');
      const sanitizedMessageId = sanitizeText(data.messageId);
      
      // Validate that message ID matches current streaming message
      if (sanitizedMessageId && sanitizedMessageId !== currentStreamingMessage.id) {
        console.warn('Message ID mismatch in chunk, ignoring');
        return;
      }
      
      setCurrentStreamingMessage(prev => prev ? {
        ...prev,
        content: prev.content + sanitizedContent
      } : null);
    }
  };
  
  const handleResponseComplete = (data: { messageId: string; content?: string; model?: string; tool_calls?: unknown[] }) => {
    if (currentStreamingMessage) {
      // Sanitize final content and metadata
      const sanitizedContent = data.content ? sanitizeText(data.content) : currentStreamingMessage.content;
      const sanitizedModel = data.model ? sanitizeText(data.model) : undefined;
      const sanitizedMessageId = sanitizeText(data.messageId);
      
      // Validate message ID matches
      if (sanitizedMessageId !== currentStreamingMessage.id) {
        console.warn('Message ID mismatch in completion, using current message');
      }
      
      const finalMessage: ChatMessage = {
        ...currentStreamingMessage,
        content: sanitizedContent,
        metadata: {
          ...currentStreamingMessage.metadata,
          streaming: false,
          model: sanitizedModel,
          tool_calls: data.tool_calls // Tool calls are handled separately and don't contain user-displayable content
        }
      };
      
      addMessage(finalMessage);
      setCurrentStreamingMessage(null);
    }
    
    setIsStreaming(false);
  };
  
  const handleErrorEvent = (data: { error: string; messageId?: string }) => {
    // Sanitize error message to prevent XSS
    const sanitizedError = sanitizeText(data.error || 'An unexpected error occurred');
    const sanitizedMessageId = data.messageId ? sanitizeText(data.messageId) : undefined;
    
    console.error('Agent error:', { error: sanitizedError, messageId: sanitizedMessageId });
    
    const errorMessage: ChatMessage = {
      id: `error_${Date.now()}`,
      role: 'assistant',
      content: `Error: ${sanitizedError}`,
      timestamp: Date.now(),
      metadata: {
        error: sanitizedError,
        messageId: sanitizedMessageId
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
  
  // Handle sending messages with comprehensive security validation
  const handleSendMessage = async (content: string, files?: File[]) => {
    // Validate authentication
    const tokens = await tokenManager.validateAndRefreshSession();
    if (!currentSession || !tokens) {
      console.error('Cannot send message: missing session or invalid token');
      setConnectionError('Authentication required');
      return;
    }
    
    // Rate limiting check
    const messageKey = `send_message_${currentSession.id}`;
    if (isRateLimited(messageKey, 30, 60000)) { // 30 messages per minute
      console.warn('Message sending rate limited');
      setConnectionError('Too many messages. Please slow down.');
      return;
    }
    
    // Validate and sanitize message content
    const messageValidation = chatMessageSchema.safeParse({
      content,
      sessionId: currentSession.id,
      files: files?.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });
    
    if (!messageValidation.success) {
      console.error('Message validation failed:', messageValidation.error);
      const errorMsg = messageValidation.error.errors.map(e => e.message).join(', ');
      setConnectionError(`Invalid message: ${errorMsg}`);
      return;
    }
    
    // Sanitize content for display
    const sanitizedContent = sanitizeText(content);
    
    // Add user message immediately with sanitized content
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: sanitizedContent,
      timestamp: Date.now(),
      metadata: files ? { 
        attachments: files.map(f => sanitizeText(f.name))
      } : undefined
    };
    
    addMessage(userMessage);
    
    // Send to backend with security headers and validation
    try {
      const baseUrl = process.env.NODE_ENV === 'production'
        ? process.env.NEXT_PUBLIC_API_URL || 'https://api.vana.ai'
        : 'http://localhost:8000';
      
      const formData = new FormData();
      formData.append('message', sanitizedContent); // Use sanitized content
      formData.append('session_id', sanitizeText(currentSession.id));
      
      // Add files if provided (with validation)
      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          // Additional file validation
          if (file.size > 10 * 1024 * 1024) { // 10MB limit
            throw new Error(`File ${file.name} is too large (max 10MB)`);
          }
          
          const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'text/plain', 'application/pdf'];
          if (!allowedTypes.includes(file.type)) {
            throw new Error(`File type ${file.type} not allowed`);
          }
          
          formData.append(`file_${i}`, file);
        }
      }
      
      // Use secure fetch with authentication token from secure storage
      const response = await fetch(`${baseUrl}/api/chat/send`, {
        method: 'POST',
        headers: {
          // Don't send Authorization header - use httpOnly cookies instead
          'X-Requested-With': 'XMLHttpRequest', // CSRF protection
        },
        credentials: 'include', // Send httpOnly cookies
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
        className="flex-1 overflow-y-auto"
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