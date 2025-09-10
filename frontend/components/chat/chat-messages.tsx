"use client";

import React, { useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatHeader } from './chat-header';
import { ChatMessage } from './chat-message';
import { MessageSkeleton } from './message-skeleton';
import { useChatSession } from '@/src/contexts/ChatSessionContext';

export function ChatMessages() {
  const { 
    state, 
    connectionStatus,
    reconnectSSE,
    connectSSE,
    disconnectSSE
  } = useChatSession();

  // Convert queries and responses to chat messages
  const messages = useMemo(() => {
    const chatMessages: Array<{
      id: string;
      content: string;
      type: 'user' | 'agent' | 'result';
      timestamp: Date;
      agentType?: any;
      metadata?: any;
    }> = [];

    // Add queries as user messages
    state.queries.forEach(query => {
      chatMessages.push({
        id: query.id,
        content: query.content,
        type: 'user' as const,
        timestamp: query.createdAt,
      });
    });

    // Add responses as agent messages  
    state.responses.forEach(response => {
      chatMessages.push({
        id: response.id,
        content: response.content,
        type: 'agent' as const,
        timestamp: response.createdAt,
        agentType: response.agentType,
        metadata: {
          confidence: response.confidence,
          sources: response.sources.length,
          processingTime: response.processingTimeMs,
        },
      });
    });

    // Add results as result messages
    state.results.forEach(result => {
      chatMessages.push({
        id: result.id,
        content: `# ${result.title}\n\n${result.summary}\n\n## Quality Score: ${Math.round(result.quality.overallScore * 100)}%\n\nWord Count: ${result.wordCount} | Reading Time: ${result.readingTimeMinutes} minutes`,
        type: 'result' as const,
        timestamp: result.generatedAt,
      });
    });

    // Sort by timestamp
    return chatMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [state.queries, state.responses, state.results]);


  // Show welcome screen when no messages
  if (messages.length === 0 && !state.isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <ChatHeader 
            connectionStatus={connectionStatus}
            sessionCount={state.sessions.length}
            isProcessing={state.isLoading}
            onConnect={connectSSE}
            onDisconnect={disconnectSSE}
          />
        </div>
      </div>
    );
  }

  // Show message history when there are messages
  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onCopy={(content) => {
              navigator.clipboard.writeText(content);
            }}
            onFeedback={(messageId, feedback) => {
              console.log(`Feedback for ${messageId}: ${feedback}`);
            }}
            onShare={(messageId) => {
              console.log(`Share message: ${messageId}`);
            }}
            onDownload={(messageId) => {
              console.log(`Download message: ${messageId}`);
            }}
          />
        ))}
        
        {/* Show loading skeleton while waiting for response */}
        {state.isLoading && <MessageSkeleton />}
      </div>
    </ScrollArea>
  );
}