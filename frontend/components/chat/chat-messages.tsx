"use client";

import React, { useMemo, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatHeader } from './chat-header';
import { ChatMessage } from './chat-message';
import { MessageSkeleton } from './message-skeleton';
import { useChatSession } from '@/src/contexts/ChatSessionContext';
import { SectionErrorBoundary } from '@/src/components/error-boundary';
import { ErrorDisplay, LoadingError, NetworkError } from '@/src/components/ui/error-display';
import { ErrorHandler, AppError } from '@/src/lib/error-handler';

export function ChatMessages() {
  const { 
    state, 
    connectionStatus,
    reconnectSSE,
    connectSSE,
    disconnectSSE
  } = useChatSession();

  const [messageError, setMessageError] = useState<AppError | null>(null);

  // Convert queries and responses to chat messages
  const messages = useMemo(() => {
    try {
      const chatMessages: Array<{
        id: string;
        content: string;
        type: 'user' | 'agent' | 'result';
        timestamp: Date;
        agentType?: import('../../src/types/chat').AgentType;
        metadata?: {
          confidence?: number;
          sources?: number;
          processingTime?: number;
        };
      }> = [];

      // Add queries as user messages
      state.queries?.forEach(query => {
        if (query?.id && query?.content) {
          chatMessages.push({
            id: query.id,
            content: query.content,
            type: 'user' as const,
            timestamp: query.createdAt || new Date(),
          });
        }
      });

      // Add responses as agent messages  
      state.responses?.forEach(response => {
        if (response?.id && response?.content) {
          chatMessages.push({
            id: response.id,
            content: response.content,
            type: 'agent' as const,
            timestamp: response.createdAt || new Date(),
            agentType: response.agentType,
            metadata: {
              confidence: response.confidence,
              sources: response.sources?.length || 0,
              processingTime: response.processingTimeMs,
            },
          });
        }
      });

      // Add results as result messages
      state.results?.forEach(result => {
        if (result?.id && result?.title) {
          chatMessages.push({
            id: result.id,
            content: `# ${result.title}\n\n${result.summary || 'No summary available'}\n\n## Quality Score: ${Math.round((result.quality?.overallScore || 0) * 100)}%\n\nWord Count: ${result.wordCount || 0} | Reading Time: ${result.readingTimeMinutes || 0} minutes`,
            type: 'result' as const,
            timestamp: result.generatedAt || new Date(),
          });
        }
      });

      // Sort by timestamp
      return chatMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    } catch (error) {
      console.error('Error processing messages:', error);
      const result = ErrorHandler.handle(error, {
        action: 'process_messages',
        resource: 'chat_messages',
      });
      setMessageError(result.error);
      return [];
    }
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