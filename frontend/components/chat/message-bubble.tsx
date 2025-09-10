"use client";

import React from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { User, Bot } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
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
        <Card className={`p-4 minimal-surface minimal-transition ${
          isUser 
            ? 'bg-chat-bubble-user text-primary-foreground border-primary/20 ml-auto' 
            : 'bg-chat-bubble-assistant border-chat-border'
        }`}>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="m-0 whitespace-pre-wrap">{message.content}</p>
          </div>
        </Card>
        
        {/* Timestamp */}
        <div className={`text-xs text-text-tertiary mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}