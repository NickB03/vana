"use client";

import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatHeader } from './chat-header';
import { MessageBubble } from './message-bubble';
import { MessageSkeleton } from './message-skeleton';
import { StreamingMessage } from './streaming-message';
import { useChatContext } from '@/contexts/chat-context';
import { ResearchProgressPanel } from '@/components/research/research-progress-panel';
import { AgentStatusDisplay } from '@/components/research/agent-status-display';
import { useAgentStatusTracker } from '@/hooks/use-research-sse';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Bot, CheckCircle } from 'lucide-react';

export function ChatMessages() {
  const { 
    messages, 
    streamingState, 
    isWaitingForResponse, 
    isResearchMode, 
    research 
  } = useChatContext();
  
  // Track agent status for research mode
  // const agentTracker = useAgentStatusTracker(research.sessionState);

  // Helper to render research-specific message content
  const renderResearchMessage = (message: ChatMessage) => {
    if (message.isResearchQuery) {
      return (
        <div className="space-y-4">
          <MessageBubble key={message.id} message={message} />
          {research.sessionState && research.isResearchActive && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="h-4 w-4 text-blue-600" />
                  <Badge variant="default" className="gap-1">
                    <Search className="h-3 w-3" />
                    Multi-Agent Research Active
                  </Badge>
                </div>
                <AgentStatusDisplay 
                  sessionState={research.sessionState}
                  className="mb-4"
                />
              </CardContent>
            </Card>
          )}
        </div>
      );
    }
    
    if (message.isResearchResult) {
      return (
        <div className="space-y-4">
          <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-medium">Research Complete</h3>
              </div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap text-sm">
                  {message.content}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return <MessageBubble key={message.id} message={message} />;
  };


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
    <ScrollArea className="h-full" data-testid="chat-messages">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message) => 
          renderResearchMessage(message)
        )}
        
        {/* Show research progress panel if in research mode and research is active */}
        {isResearchMode && research.isResearchActive && research.sessionState && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
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
        {isWaitingForResponse && <MessageSkeleton />}
        
        {/* Show streaming message */}
        {(streamingState.isStreaming || streamingState.error) && (
          <StreamingMessage 
            content={streamingState.content} 
            isComplete={false}
            error={streamingState.error}
            connectionState={streamingState.connectionState}
          />
        )}
      </div>
    </ScrollArea>
  );
}