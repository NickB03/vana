"use client";

import React from 'react';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { ChatProgress } from './chat-progress';
import { useChatSession } from '@/src/contexts/ChatSessionContext';
import { CreateResearchQueryRequest } from '@/src/types/chat';

export function ChatInterface() {
  const { 
    state, 
    submitQuery, 
    connectionStatus, 
    events 
  } = useChatSession();

  const handleSubmitQuery = async (request: CreateResearchQueryRequest) => {
    try {
      await submitQuery(request);
    } catch (error) {
      console.error('Failed to submit query:', error);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-chat-background text-text-primary">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-hidden">
        <ChatMessages />
      </div>
      
      {/* Progress Indicator */}
      {state.isLoading && (
        <ChatProgress 
          isProcessing={state.isLoading}
          connectionStatus={connectionStatus}
          events={events}
        />
      )}
      
      {/* Chat Input */}
      <div className="border-t border-chat-border bg-chat-surface minimal-transition">
        <ChatInput 
          onSubmit={handleSubmitQuery}
          disabled={state.isLoading}
          isProcessing={state.isLoading}
          connectionStatus={connectionStatus}
        />
      </div>
    </div>
  );
}