'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useAuth } from '@/hooks/use-auth';
import { useSessionStore } from '@/store/session-store';
import { MessageInput } from './message-input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  Copy, 
  RotateCcw, 
  Edit, 
  User, 
  Bot, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { ChatMessage, AgentInfo } from '@/types/session';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  sanitizeText, 
  chatMessageSchema, 
  sseEventSchema,
  containsMaliciousPatterns,
  isRateLimited,
  logSecurityViolation
} from '@/lib/security';
import { createCORSAwareEventSource, handleSSECORS } from '@/lib/cors';
import { tokenManager } from '@/lib/auth-security';

// File validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'text/plain', 'application/pdf'];

interface SSEEvent {
  type: string;
  data: unknown;
  id?: string;
  timestamp?: string;
}

interface AgentResponseStartData {
  message: ChatMessage;
  messageId?: string;
  model?: string;
}

interface AgentResponseChunkData {
  content: string;
  messageId: string;
}

interface AgentResponseCompleteData {
  messageId: string;
  content?: string;
  model?: string;
  tool_calls?: unknown[];
}

interface AgentErrorData {
  error: string;
  messageId?: string;
}

interface ChatInterfaceProps {
  className?: string;
  initialMessage?: string;
}

interface MessageActionsProps {
  message: ChatMessage;
  onCopy: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
}

interface TypingIndicatorProps {
  agents: AgentInfo[];
  isVisible: boolean;
}

interface StreamingIndicatorProps {
  content: string;
  isStreaming: boolean;
}

// Message Actions Component
function MessageActions({ message, onCopy, onRegenerate, onEdit }: MessageActionsProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1 mt-2"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onCopy}>
            <Copy className="w-3 h-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy message</TooltipContent>
      </Tooltip>
      
      {message.role === 'assistant' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={onRegenerate}>
              <RotateCcw className="w-3 h-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Regenerate response</TooltipContent>
        </Tooltip>
      )}
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Edit className="w-3 h-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit message</TooltipContent>
      </Tooltip>
    </motion.div>
  );
}

// Typing Indicator Component
function TypingIndicator({ agents, isVisible }: TypingIndicatorProps) {
  if (!isVisible || agents.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground"
      >
        <div className="flex -space-x-2">
          {agents.slice(0, 3).map((agent) => (
            <Avatar key={agent.id} className="w-6 h-6 border-2 border-background">
              <AvatarFallback className="text-xs">
                {agent.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Loader2 className="w-3 h-3" />
          </motion.div>
          <span>
            {agents.length === 1 ? agents[0]?.name ?? 'Agent' : `${agents.length} agents`} typing...
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Streaming Indicator Component
function StreamingIndicator({ content, isStreaming }: StreamingIndicatorProps) {
  const [displayContent, setDisplayContent] = useState('');

  useEffect(() => {
    if (!isStreaming) {
      setDisplayContent(content);
      return;
    }

    const words = content.split(' ');
    let currentIndex = 0;

    const timer = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayContent(words.slice(0, currentIndex + 1).join(' '));
        currentIndex++;
      } else {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [content, isStreaming]);

  return (
    <div className="relative">
      <ReactMarkdown
        components={{
          code: (props) => {
            const { className, children, ...restProps } = props;
            const inline = !className;
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark as { [key: string]: React.CSSProperties }}
                language={match[1]}
                PreTag="div"
                className="rounded-md"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-muted px-1 py-0.5 rounded text-sm" {...restProps}>
                {children}
              </code>
            );
          }
        }}
      >
        {displayContent}
      </ReactMarkdown>
      {isStreaming && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-block w-2 h-4 bg-primary ml-1 rounded-sm"
        />
      )}
    </div>
  );
}

export function ChatInterface({ className, initialMessage }: ChatInterfaceProps) {
  const { user, tokens } = useAuth();
  const { currentSession, addMessage, createSession } = useSessionStore();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<ChatMessage | null>(null);
  const [activeAgents] = useState<AgentInfo[]>([]);
  
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
          // Parse JSON first, then sanitize specific fields to prevent JSON corruption
          const data: SSEEvent = JSON.parse(event.data);
          
          // Sanitize and validate parsed data fields
          if (containsMaliciousPatterns(event.data)) {
            console.error('Potentially malicious SSE data blocked');
            logSecurityViolation('xss_attempt', { data: event.data, source: 'sse' });
            return;
          }
          
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
      const handleSecureEvent = <T = unknown>(eventType: string, handler: (data: T) => void) => {
        eventSource.addEventListener(eventType, (event) => {
          try {
            const messageEvent = event as MessageEvent;
            
            if (containsMaliciousPatterns(messageEvent.data)) {
              console.error(`Potentially malicious ${eventType} data blocked`);
              logSecurityViolation('xss_attempt', { eventType, data: messageEvent.data });
              return;
            }
            
            // Parse JSON first, then sanitize specific fields
            const data = JSON.parse(messageEvent.data) as T;
            handler(data);
          } catch (error) {
            console.error(`Failed to parse ${eventType} event:`, error);
          }
        });
      };
      
      handleSecureEvent<AgentResponseStartData>('agent_response_start', handleResponseStart);
      handleSecureEvent<AgentResponseChunkData>('agent_response_chunk', handleResponseChunk);
      handleSecureEvent<AgentResponseCompleteData>('agent_response_complete', handleResponseComplete);
      handleSecureEvent<AgentErrorData>('error', handleErrorEvent);
      
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      setConnectionError('Failed to establish connection');
    }
  };
  
  // SSE Event Handlers
  const handleSSEEvent = (event: SSEEvent) => {
    console.log('SSE Event:', event.type, event.data);
  };
  
  const handleResponseStart = (data: AgentResponseStartData) => {
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
  
  const handleResponseChunk = (data: AgentResponseChunkData) => {
    // Sanitize chunk content to prevent XSS
    const sanitizedContent = sanitizeText(data.content || '');
    const sanitizedMessageId = sanitizeText(data.messageId);
    
    // Use functional state update to prevent stale state capture
    setCurrentStreamingMessage(prev => {
      if (!prev) return null;
      
      // Validate that message ID matches current streaming message
      if (sanitizedMessageId && prev.id && sanitizedMessageId !== prev.id) {
        console.warn('Message ID mismatch in chunk, ignoring');
        return prev;
      }
      
      return {
        ...prev,
        content: prev.content + sanitizedContent
      };
    });
  };
  
  const handleResponseComplete = (data: AgentResponseCompleteData) => {
    // Sanitize final content and metadata
    const sanitizedModel = data.model ? sanitizeText(data.model) : undefined;
    const sanitizedMessageId = sanitizeText(data.messageId);
    
    // Use functional state update to prevent stale state capture
    setCurrentStreamingMessage(prev => {
      if (!prev) return null;
      
      // Sanitize content, using current message content as fallback
      const sanitizedContent = data.content ? sanitizeText(data.content) : prev.content;
      
      // Validate message ID matches
      if (prev.id && sanitizedMessageId !== prev.id) {
        console.warn('Message ID mismatch in completion, using current message');
      }
      
      const finalMessage: ChatMessage = {
        ...prev,
        content: sanitizedContent,
        metadata: {
          ...prev.metadata,
          streaming: false,
          model: sanitizedModel,
          tool_calls: data.tool_calls // Tool calls are handled separately and don't contain user-displayable content
        }
      };
      
      addMessage(finalMessage);
      return null;
    });
    
    setIsStreaming(false);
  };
  
  const handleErrorEvent = (data: AgentErrorData) => {
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
      const errorMsg = messageValidation.error.issues.map((e) => e.message).join(', ');
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
      const baseUrl = process.env['NODE_ENV'] === 'production'
        ? process.env['NEXT_PUBLIC_API_URL'] || 'https://api.vana.ai'
        : 'http://localhost:8000';
      
      const formData = new FormData();
      formData.append('message', sanitizedContent); // Use sanitized content
      formData.append('session_id', sanitizeText(currentSession.id));
      
      // Add files if provided (with validation)
      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file) continue; // Check if file is defined
          
          // Additional file validation using constants
          if (file.size > MAX_FILE_SIZE) {
            throw new Error(`File ${file.name} is too large (max 10MB)`);
          }
          
          if (!ALLOWED_FILE_TYPES.includes(file.type)) {
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
  
  // Message actions handlers
  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  const handleRegenerateMessage = useCallback((messageId: string) => {
    // Find the message and regenerate response
    if (!currentSession) return;
    
    const messageIndex = currentSession.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;
    
    // Remove all messages after this one and regenerate
    const messagesToKeep = currentSession.messages.slice(0, messageIndex);
    const lastUserMessage = messagesToKeep.findLast(m => m.role === 'user');
    
    if (lastUserMessage?.content) {
      handleSendMessage(lastUserMessage.content);
    }
  }, [currentSession]);

  const handleEditMessage = useCallback((messageId: string) => {
    // Implementation for editing messages
    console.log('Edit message:', messageId);
  }, []);

  if (!user) {
    return (
      <main className="flex items-center justify-center h-full bg-[#131314]" role="main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="p-8 text-center border-border/50 bg-card/50 backdrop-blur-sm" role="alert">
            <CardContent className="pt-6">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
              </motion.div>
              <h2 className="text-xl font-semibold mb-3 text-foreground">Authentication Required</h2>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Please log in to start chatting with the AI assistant and unlock the full potential of collaborative intelligence.
              </p>
              <Button 
                onClick={() => window.location.href = '/auth/login'}
                aria-label="Navigate to login page"
                className="bg-primary hover:bg-primary/90"
              >
                <User className="w-4 h-4 mr-2" />
                Go to Login
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    );
  }
  
  if (!currentSession) {
    return (
      <main className="flex items-center justify-center h-full bg-[#131314]" role="main">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6 w-full max-w-md"
          aria-label="Loading chat interface"
        >
          <div className="text-center">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: 'easeInOut'
              }}
            >
              <Sparkles className="w-8 h-8 mx-auto mb-4 text-primary" />
            </motion.div>
            <h3 className="text-lg font-medium text-foreground mb-2">Initializing Chat</h3>
            <p className="text-sm text-muted-foreground">Setting up your AI assistant...</p>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-full bg-muted/50" aria-hidden="true" />
            <Skeleton className="h-3 w-4/5 bg-muted/50" aria-hidden="true" />
            <Skeleton className="h-3 w-3/5 bg-muted/50" aria-hidden="true" />
          </div>
          <span className="sr-only">Loading chat interface, please wait...</span>
        </motion.div>
      </main>
    );
  }
  
  return (
    <section 
      className={`flex flex-col h-full bg-[#131314] ${className}`}
      role="application"
      aria-label="AI Chat Interface"
    >
      {/* Enhanced Connection Status Bar */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-6 py-3 border-b border-border/50 bg-card/30 backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={isConnected ? { scale: 1 } : { scale: [1, 0.8, 1] }}
            transition={{ duration: 1, repeat: isConnected ? 0 : Infinity }}
          >
            {isConnected ? (
              <Wifi className="w-5 h-5 text-emerald-500" aria-hidden="true" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" aria-hidden="true" />
            )}
          </motion.div>
          
          <Badge 
            variant={isConnected ? 'default' : 'destructive'}
            className={`${isConnected ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : ''}`}
            aria-label={`Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          
          <AnimatePresence>
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <Badge 
                  variant="secondary" 
                  className="bg-blue-500/10 text-blue-500 border-blue-500/20 flex items-center gap-2"
                  aria-label="AI is currently generating a response"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Bot className="w-3 h-3" />
                  </motion.div>
                  AI generating...
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {connectionError && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryConnection}
              aria-label="Retry connection to AI service"
              className="border-border/50 hover:bg-muted/50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry Connection
            </Button>
          </motion.div>
        )}
      </motion.header>
      
      {/* Enhanced Error Banner */}
      <AnimatePresence>
        {connectionError && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-6 py-3 bg-red-500/10 border-b border-red-500/20 backdrop-blur-sm"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-3 text-sm text-red-400">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
              </motion.div>
              <span className="flex-1">{connectionError}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConnectionError(null)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
              >
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing Indicator */}
      <TypingIndicator agents={activeAgents} isVisible={isStreaming} />
      
      {/* Enhanced Messages Area */}
      <section 
        className="flex-1 overflow-y-auto scroll-smooth px-4 py-2"
        aria-label="Chat messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence mode="popLayout">
            {currentSession.messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`flex gap-4 group ${
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <Avatar className={`w-8 h-8 ${
                    message.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <AvatarFallback>
                      {message.role === 'user' ? (
                        <User className="w-4 h-4" />
                      ) : (
                        <Bot className="w-4 h-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Message Content */}
                <div className={`flex-1 max-w-3xl ${
                  message.role === 'user' ? 'text-right' : 'text-left'
                }`}>
                    <div className={`inline-block p-4 rounded-2xl ${
                      message.role === 'user'
                      ? 'bg-primary text-primary-foreground ml-12'
                      : 'bg-muted mr-12'
                    }`}>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                        code: (props) => {
                          const { className, children, ...restProps } = props;
                          const inline = !className;
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                          <SyntaxHighlighter
                            style={oneDark as { [key: string]: React.CSSProperties }}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-md my-2"
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                          ) : (
                          <code className="bg-background/50 px-1.5 py-0.5 rounded text-sm font-mono" {...restProps}>
                            {children}
                          </code>
                          );
                        },
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                      </div>
                    </div>

                  {/* Message Metadata */}
                  <div className={`text-xs text-muted-foreground mt-1 ${
                    message.role === 'user' ? 'text-right' : 'text-left'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                    {message.metadata?.model && (
                      <span className="ml-2">• {message.metadata.model}</span>
                    )}
                  </div>

                  {/* Message Actions */}
                  <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-2 ${
                    message.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                  }`}>
                    <MessageActions
                      message={message}
                      onCopy={() => handleCopyMessage(message.content)}
                      onRegenerate={() => handleRegenerateMessage(message.id)}
                      onEdit={() => handleEditMessage(message.id)}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Streaming Message */}
          <AnimatePresence>
            {currentStreamingMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0">
                  <Avatar className="w-8 h-8 bg-muted">
                    <AvatarFallback>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      >
                        <Bot className="w-4 h-4" />
                      </motion.div>
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 max-w-3xl">
                  <div className="inline-block p-4 rounded-2xl bg-muted mr-12">
                    <StreamingIndicator
                      content={currentStreamingMessage.content}
                      isStreaming={isStreaming}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div ref={messagesEndRef} aria-hidden="true" />
      </section>
      
      {/* Enhanced Input Area */}
      <motion.footer 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-t border-border/50 bg-card/30 backdrop-blur-sm"
      >
        <div className="max-w-4xl mx-auto px-4 py-3">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={!isConnected || isStreaming}
            placeholder={
              !isConnected 
                ? 'Connecting to AI assistant...'
                : isStreaming
                ? 'AI is thinking...'
                : 'Message your AI assistant...'
            }
          />
        </div>
      </motion.footer>
    </section>
  );
}