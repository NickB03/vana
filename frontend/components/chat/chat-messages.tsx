"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatHeader } from './chat-header';
import { MessageBubble } from './message-bubble';
import { MessageSkeleton } from './message-skeleton';
import { StreamingMessage } from './streaming-message';
import { useChatContext } from '@/contexts/chat-context';

export function ChatMessages() {
  const { messages, streamingState, isWaitingForResponse } = useChatContext();


  // Show welcome screen when no messages
  if (messages.length === 0 && !isWaitingForResponse && !streamingState.isStreaming) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <ChatHeader />
        </div>
      </div>
    );
  }

  // Show message history when there are messages
  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
          />
        ))}
        
        {/* Show loading skeleton while waiting for response */}
        {isWaitingForResponse && <MessageSkeleton />}
        
        {/* Show streaming message */}
        {streamingState.isStreaming && (
          <StreamingMessage 
            content={streamingState.content} 
            isComplete={false} 
          />
        )}
      </div>
    </ScrollArea>
  );
}