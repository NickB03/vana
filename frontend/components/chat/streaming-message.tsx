"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';

interface StreamingMessageProps {
  content: string;
  isComplete: boolean;
}

export function StreamingMessage({ content, isComplete }: StreamingMessageProps) {
  return (
    <div className="flex gap-4 flex-row">
      {/* AI Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <div className="w-full h-full flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-orange-400 text-white">
          <Bot size={18} />
        </div>
      </Avatar>

      {/* Streaming Message Content */}
      <div className="flex-1 max-w-[80%] text-left">
        <Card className="p-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p className="m-0 whitespace-pre-wrap">
              {content}
              {!isComplete && (
                <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
              )}
            </p>
          </div>
        </Card>
        
        {/* Status indicator */}
        {!isComplete && (
          <div className="text-xs text-gray-500 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Streaming...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}