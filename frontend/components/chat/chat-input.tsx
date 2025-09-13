"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Paperclip, Bot } from 'lucide-react';
import { useChatContext } from '@/contexts/chat-context';

interface ChatInputProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSendMessage, disabled = false, placeholder }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, research } = useChatContext();
  
  // Always use research mode (no toggle)
  const isResearchMode = true;
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
        {/* Research Status (when active) */}
        {isResearchDisabled && (
          <div className="flex justify-center mb-3">
            <Badge variant="default" className="gap-1">
              <Bot className="h-3 w-3 animate-pulse" />
              Research Active
            </Badge>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="relative" role="form" aria-label={isResearchMode ? "Research query form" : "Chat message form"}>
          <div className="flex items-end gap-2 p-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950 shadow-sm">
            {/* Upload Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUploadClick}
              disabled={disabled}
              className="flex-shrink-0 p-2"
              aria-label="Attach file"
              title="Attach file"
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
              aria-label={isResearchMode ? "Enter research query" : "Enter message"}
              aria-describedby="chat-input-hint"
              data-testid="chat-input"
            />

            {/* Send Button */}
            <Button
              type="submit"
              size="sm"
              disabled={!message.trim() || disabled}
              className="flex-shrink-0 p-2"
              aria-label="Send message"
              title="Send message"
              data-testid="send-button"
            >
              <Send size={18} />
            </Button>
          </div>
          {/* Screen reader hint */}
          <div id="chat-input-hint" className="sr-only">
            {isResearchMode 
              ? "Press Enter to send research query, Shift+Enter for new line" 
              : "Press Enter to send message, Shift+Enter for new line"
            }
          </div>
        </form>
      </div>
    </div>
  );
}