"use client";

import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { User, Bot } from 'lucide-react';

import type { ChatMessage } from '@/types/api';

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  // DEBUG: Log message being rendered
  console.log('[MessageBubble] Rendering message:', message);

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`} data-testid="message-bubble" data-sender={message.role}>
      {/* Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <div className={`w-full h-full flex items-center justify-center rounded-full ${
          isUser 
            ? 'bg-blue-500 text-white' 
            : 'bg-gradient-to-r from-purple-500 to-orange-400 text-white'
        }`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>
      </Avatar>

      {/* Message Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <Card className={`p-4 ${
          isUser 
            ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 ml-auto' 
            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
        }`}>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="m-0 whitespace-pre-wrap">{message.content}</p>
          </div>
        </Card>
        
        {/* Timestamp */}
        <div className={`text-xs text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}