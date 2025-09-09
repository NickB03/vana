"use client";

import React from 'react';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { ChatProvider } from '@/contexts/chat-context';

export function ChatInterface() {
  return (
    <ChatProvider>
      <div className="flex flex-col h-full w-full">
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ChatMessages />
        </div>
        
        {/* Chat Input */}
        <div className="border-t border-gray-200 dark:border-gray-800">
          <ChatInput />
        </div>
      </div>
    </ChatProvider>
  );
}