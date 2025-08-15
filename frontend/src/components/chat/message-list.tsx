'use client';

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types/session';
import { Agent } from '@/types/agents';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, User, Bot, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
// import { format } from 'date-fns'; // Commented out until date-fns is installed

interface MessageListProps {
  messages: ChatMessage[];
  streamingMessage?: ChatMessage | null;
  isLoading?: boolean;
  className?: string;
  selectedAgent?: Agent | null;
}

interface MessageComponentProps {
  message: ChatMessage;
  isStreaming?: boolean;
  agent?: Agent | null;
}

function MessageComponent({ message, isStreaming = false, agent }: MessageComponentProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isError = message.metadata?.error;
  
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };
  
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };
  
  const renderMessageContent = () => {
    if (isError) {
      return (
        <div className="flex items-start gap-2 text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{message.content}</span>
        </div>
      );
    }
    
    // Basic markdown-style formatting
    const content = message.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>');
    
    return (
      <div 
        className="prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  };
  
  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <Badge variant="secondary" className="text-xs">
          {message.content}
        </Badge>
      </div>
    );
  }
  
  return (
    <div className={cn(
      "flex gap-3 p-4 group",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        </Avatar>
      )}
      
      <div className={cn(
        "flex flex-col max-w-[80%] md:max-w-[70%]",
        isUser ? "items-end" : "items-start"
      )}>
        <Card className={cn(
          "p-3 relative",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted",
          isError && "bg-destructive/10 border-destructive/20"
        )}>
          {renderMessageContent()}
          
          {isStreaming && (
            <div className="flex items-center gap-1 mt-2 opacity-60">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
          )}
          
          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "absolute -top-2 -right-2 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
              isUser ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={handleCopyMessage}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </Card>
        
        {/* Message metadata */}
        <div className={cn(
          "flex items-center gap-2 mt-1 text-xs text-muted-foreground",
          isUser ? "flex-row-reverse" : "flex-row"
        )}>
          <span>{formatTimestamp(message.timestamp)}</span>
          
          {message.metadata?.model && (
            <Badge variant="outline" className="text-xs h-4 px-1">
              {message.metadata.model}
            </Badge>
          )}
          
          {message.metadata?.tool_calls && message.metadata.tool_calls.length > 0 && (
            <Badge variant="outline" className="text-xs h-4 px-1">
              {message.metadata.tool_calls.length} tool{message.metadata.tool_calls.length > 1 ? 's' : ''}
            </Badge>
          )}
          
          {message.metadata?.attachments && (
            <Badge variant="outline" className="text-xs h-4 px-1">
              {message.metadata.attachments.length} file{message.metadata.attachments.length > 1 ? 's' : ''}
            </Badge>
          )}
          
          {!isError && !isStreaming && (
            <CheckCircle className="w-3 h-3 text-green-500" />
          )}
        </div>
      </div>
      
      {isUser && (
        <Avatar className="w-8 h-8 flex-shrink-0">
          <div className="w-full h-full bg-secondary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-secondary-foreground" />
          </div>
        </Avatar>
      )}
    </div>
  );
}

function LoadingMessage() {
  return (
    <div className="flex gap-3 p-4">
      <Avatar className="w-8 h-8 flex-shrink-0">
        <div className="w-full h-full bg-primary/10 flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      </Avatar>
      
      <div className="flex flex-col max-w-[80%] md:max-w-[70%]">
        <Card className="p-3 bg-muted">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.1s]" />
              <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0.2s]" />
            </div>
            <span className="text-sm text-muted-foreground">AI is thinking...</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-16 h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
        <Bot className="w-8 h-8 text-primary" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        Start a conversation
      </h3>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        Ask me anything! I can help with research, analysis, coding, writing, and more.
      </p>
      
      <div className="flex flex-wrap justify-center gap-2">
        {[
          "What can you help me with?",
          "Explain quantum computing",
          "Write a Python function",
          "Analyze this data"
        ].map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              // This would trigger sending the suggestion
              // Implementation depends on parent component structure
            }}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function MessageList({ 
  messages, 
  streamingMessage, 
  isLoading = false, 
  className 
}: MessageListProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    };
    
    // Small delay to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, streamingMessage]);
  
  const hasMessages = messages.length > 0 || streamingMessage;
  
  return (
    <ScrollArea className={cn("h-full", className)} ref={scrollAreaRef}>
      {!hasMessages && !isLoading ? (
        <EmptyState />
      ) : (
        <div className="space-y-0">
          {messages.map((message) => (
            <MessageComponent
              key={message.id}
              message={message}
            />
          ))}
          
          {streamingMessage && (
            <MessageComponent
              message={streamingMessage}
              isStreaming={true}
            />
          )}
          
          {isLoading && !streamingMessage && (
            <LoadingMessage />
          )}
        </div>
      )}
    </ScrollArea>
  );
}