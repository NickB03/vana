"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip } from 'lucide-react';
import { useChatContext } from '@/contexts/chat-context';

export function ChatInput() {
  const [message, setMessage] = useState('');
  const { sendMessage } = useChatContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    // Send message via context
    sendMessage(message);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleUploadClick = () => {
    // TODO: Implement upload functionality
    console.log('Upload clicked - to be implemented');
  };

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-2 p-2 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-950 shadow-sm">
            {/* Upload Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUploadClick}
              className="flex-shrink-0 p-2"
            >
              <Paperclip size={18} />
            </Button>

            {/* Message Input */}
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What can I help you with today?"
              className="flex-1 min-h-[20px] max-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent"
              rows={1}
            />

            {/* Send Button */}
            <Button
              type="submit"
              size="sm"
              disabled={!message.trim()}
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