"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Bot, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface StreamingMessageProps {
  content: string;
  isComplete: boolean;
  error?: string;
  connectionState?: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';
}

export function StreamingMessage({ 
  content, 
  isComplete, 
  error, 
  connectionState = 'disconnected' 
}: StreamingMessageProps) {
  
  const getConnectionIcon = () => {
    switch (connectionState) {
      case 'connecting':
      case 'reconnecting':
        return <Wifi className="w-3 h-3 animate-pulse" />;
      case 'connected':
        return <Wifi className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <WifiOff className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };
  
  const getStatusText = () => {
    if (error) return 'Error occurred';
    
    switch (connectionState) {
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return 'Streaming...';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'failed':
        return 'Connection failed';
      default:
        return 'Disconnected';
    }
  };
  
  const hasError = !!error;
  const isStreaming = !isComplete && !hasError && connectionState === 'connected';
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
        <Card className={`p-4 border-gray-200 dark:border-gray-800 ${
          hasError 
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' 
            : 'bg-gray-50 dark:bg-gray-900'
        }`}>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {hasError ? (
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="m-0 text-red-700 dark:text-red-300 font-medium">
                    Failed to stream response
                  </p>
                  <p className="m-0 mt-1 text-red-600 dark:text-red-400 text-sm">
                    {error}
                  </p>
                </div>
              </div>
            ) : (
              <p className="m-0 whitespace-pre-wrap">
                {content}
                {isStreaming && (
                  <span className="inline-block w-2 h-5 bg-blue-500 ml-1 animate-pulse" />
                )}
              </p>
            )}
          </div>
        </Card>
        
        {/* Status indicator */}
        {(!isComplete || hasError || connectionState !== 'disconnected') && (
          <div className="text-xs text-gray-500 mt-1">
            <div className="flex items-center gap-1">
              {getConnectionIcon()}
              <span className={hasError ? 'text-red-500' : ''}>
                {getStatusText()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}