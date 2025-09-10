"use client";

import React, { useState } from 'react';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { ChatProgress } from './chat-progress';
import { useChatSession } from '@/src/contexts/ChatSessionContext';
import { CreateResearchQueryRequest } from '@/src/types/chat';
import { ComponentErrorBoundary } from '@/src/components/error-boundary';
import { ErrorDisplay, ConnectionStatus } from '@/src/components/ui/error-display';
import { ErrorHandler, AppError } from '@/src/lib/error-handler';

export function ChatInterface() {
  const { 
    state, 
    submitQuery, 
    connectionStatus, 
    events,
    agents,
    reconnectSSE 
  } = useChatSession();
  
  const [submissionError, setSubmissionError] = useState<AppError | null>(null);

  const handleSubmitQuery = async (request: CreateResearchQueryRequest) => {
    try {
      setSubmissionError(null);
      await submitQuery(request);
    } catch (error) {
      console.error('Failed to submit query:', error);
      const result = ErrorHandler.handle(error, {
        action: 'submit_query',
        resource: 'chat_interface',
        sessionId: state.sessions[0]?.id,
      });
      setSubmissionError(result.error);
    }
  };

  const handleErrorAction = (action: { type: string }) => {
    if (action.type === 'retry') {
      setSubmissionError(null);
    } else if (action.type === 'reload') {
      window.location.reload();
    }
  };

  const handleDismissError = () => {
    setSubmissionError(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-chat-background text-text-primary">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-2 border-b border-chat-border">
        <div className="flex items-center gap-2">
          <ConnectionStatus 
            status={connectionStatus} 
            onReconnect={reconnectSSE}
          />
        </div>
      </div>

      {/* Error Display */}
      {submissionError && (
        <div className="p-4">
          <ErrorDisplay
            error={submissionError}
            actions={[
              {
                type: 'retry',
                label: 'Try Again',
                action: () => handleErrorAction({ type: 'retry' }),
                primary: true,
              },
              {
                type: 'reload',
                label: 'Refresh Page',
                action: () => handleErrorAction({ type: 'reload' }),
              },
            ]}
            onAction={handleErrorAction}
            onDismiss={handleDismissError}
            variant="banner"
          />
        </div>
      )}
      
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ComponentErrorBoundary name="Chat Messages">
          <ChatMessages />
        </ComponentErrorBoundary>
      </div>
      
      {/* Progress Indicator */}
      {state.isLoading && (
        <ComponentErrorBoundary name="Chat Progress">
          <ChatProgress 
            isProcessing={state.isLoading}
            connectionStatus={connectionStatus}
            events={events}
            agents={agents}
          />
        </ComponentErrorBoundary>
      )}
      
      {/* Chat Input */}
      <div className="border-t border-chat-border bg-chat-surface minimal-transition">
        <ComponentErrorBoundary name="Chat Input">
          <ChatInput 
            onSubmit={handleSubmitQuery}
            disabled={state.isLoading || !!submissionError}
            isProcessing={state.isLoading}
            connectionStatus={connectionStatus}
          />
        </ComponentErrorBoundary>
      </div>
    </div>
  );
}