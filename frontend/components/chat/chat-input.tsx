"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Paperclip, MessageSquare, Search, Bot } from 'lucide-react';
import { useChatContext } from '@/contexts/chat-context';

interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSendMessage, disabled = false, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, isResearchMode, setIsResearchMode, research } = useChatContext();
  
  // Research mode is disabled if research is currently active
  const isResearchDisabled = research.isResearchActive;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    
    // Use custom handler if provided, otherwise use context
    if (onSendMessage) {
      onSendMessage(message);
    } else {
      sendMessage(message);
    }
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !disabled) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleUploadClick = () => {
    // TODO: Implement upload functionality
    console.log('Upload clicked - to be implemented');
  };

  // Get dynamic placeholder text based on mode
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (isResearchMode) {
      return isResearchDisabled 
        ? "Research in progress..." 
        : "Enter your research query...";
    }
    return "What can I help you with today?";
  };

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        {/* Research Mode Toggle */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={!isResearchMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsResearchMode(false)}
              disabled={isResearchDisabled}
              className="gap-1"
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </Button>
            <Button
              type="button"
              variant={isResearchMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsResearchMode(true)}
              disabled={isResearchDisabled}
              className="gap-1"
            >
              <Search className="h-4 w-4" />
              Research
            </Button>
          </div>
          
          {isResearchDisabled && (
            <Badge variant="default" className="gap-1">
              <Bot className="h-3 w-3 animate-pulse" />
              Research Active
            </Badge>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-2 p-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950 shadow-sm">
            {/* Upload Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUploadClick}
              disabled={disabled}
              className="flex-shrink-0 p-2"
            >
              <Paperclip size={18} />
            </Button>

            {/* Message Input */}
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              disabled={disabled}
              className="flex-1 min-h-[20px] max-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent disabled:opacity-50"
              rows={1}
            />

            {/* Send Button */}
            <Button
              type="submit"
              size="sm"
              disabled={!message.trim() || disabled}
              className="flex-shrink-0 p-2"
            >
              <Send size={18} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}