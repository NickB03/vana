"use client";

import React from 'react';
import type { ChatMessage } from '@/types/api';
import { ChatHeader } from './chat-header';
import { MessageBubblePromptKit } from './message-bubble-prompt-kit';
import { MessageSkeleton } from './message-skeleton';
import { StreamingMessagePromptKit } from './streaming-message-prompt-kit';
import { useChatContext } from '@/contexts/chat-context';
import { ResearchProgressPanel } from '@/components/research/research-progress-panel';
import { Card, CardContent } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { 
  ChatContainerContent, 
  ChatContainerScrollAnchor 
} from '@/components/ui/prompt-kit-chat-container';

export function ChatMessagesPromptKit() {
  const { 
    messages, 
    streamingState, 
    research 
  } = useChatContext();
  
  // Messages and streaming state management

  // Simplified message rendering - just use the consistent MessageBubblePromptKit
  const renderMessage = (message: ChatMessage) => {
    return <MessageBubblePromptKit key={message.id} message={message} />;
  };

  // Show welcome screen when no messages
  if (messages.length === 0 && !streamingState.isStreaming) {
    return (
      <ChatContainerContent className="h-full flex flex-col justify-center">
        <div className="flex-1 flex items-center justify-center">
          <ChatHeader />
        </div>
        <ChatContainerScrollAnchor />
      </ChatContainerContent>
    );
  }

  // Show message history when there are messages
  return (
    <ChatContainerContent data-testid="chat-messages-prompt-kit" className="flex-1 min-h-0">
      {/* Messages Container with Proper Spacing */}
      <div className="flex flex-col w-full max-w-4xl mx-auto space-y-6">
        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 border border-border/40 p-2 rounded-md bg-muted/30">
            Debug: {messages.length} messages, streaming: {streamingState.isStreaming ? 'yes' : 'no'}
          </div>
        )}
        
        {/* Message List with Proper Spacing */}
        <div className="flex flex-col space-y-4">
          {messages.map((message) => renderMessage(message))}
        </div>
        
        {/* Show active research indicator */}
        {research.isResearchActive && messages.length > 0 && (
          <div className="flex justify-center py-6">
            <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 text-primary rounded-full border border-primary/20">
              <Bot className="h-4 w-4 animate-pulse" />
              <span className="text-sm font-medium">
                Multi-agent research in progress...
              </span>
            </div>
          </div>
        )}
        
        {/* Show research progress panel if research is active */}
        {research.isResearchActive && research.sessionState && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <ResearchProgressPanel 
                sessionState={research.sessionState}
                isLoading={research.isLoading}
                error={research.error}
                onStart={() => {}}
                onStop={research.stopResearch}
                onRetry={research.clearError}
              />
            </CardContent>
          </Card>
        )}
        
        {/* Show loading skeleton while waiting for response */}
        {streamingState.isStreaming && (
          <div className="animate-pulse">
            <MessageSkeleton />
          </div>
        )}
        
        {/* Show streaming message */}
        {(streamingState.isStreaming || streamingState.error) && (
          <div className="animate-in fade-in-0 duration-300">
            <StreamingMessagePromptKit 
              content={streamingState.content} 
              isComplete={false}
              error={streamingState.error}
              connectionState={streamingState.connectionState}
            />
          </div>
        )}
      </div>
      
      {/* Scroll anchor for proper scroll-to-bottom behavior */}
      <ChatContainerScrollAnchor />
    </ChatContainerContent>
  );
}