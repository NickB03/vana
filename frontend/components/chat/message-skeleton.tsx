"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';

export function MessageSkeleton() {
  return (
    <div className="flex gap-4 flex-row">
      {/* AI Avatar */}
      <Avatar className="w-8 h-8 flex-shrink-0">
        <div className="w-full h-full flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-orange-400 text-white">
          <Bot size={18} />
        </div>
      </Avatar>

      {/* Message Content Skeleton */}
      <div className="flex-1 max-w-[80%] text-left">
        <Card className="p-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <div className="space-y-2">
            {/* Typing indicator with animated dots */}
            <div className="flex items-center gap-1">
              <span className="text-gray-500 text-sm">Vana is thinking</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
            
            {/* Content skeleton lines */}
            <div className="space-y-2 mt-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}