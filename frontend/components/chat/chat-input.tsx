"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Send, 
  Paperclip, 
  Mic, 
  Square,
  FileText,
  Image,
  Loader2,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { QueryType, QueryParameters, CreateResearchQueryRequest } from '../../src/types/chat';

interface ChatInputProps {
  onSubmit: (request: CreateResearchQueryRequest) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
  maxLength?: number;
  showQueryTypeHints?: boolean;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
}

export function ChatInput({
  onSubmit,
  disabled = false,
  isProcessing = false,
  placeholder = "Ask me anything about a topic you&apos;d like to research...",
  maxLength = 5000,
  showQueryTypeHints = true,
  connectionStatus = 'disconnected',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [queryType, setQueryType] = useState<QueryType>('research');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Detect query type from message content
  useEffect(() => {
    if (!message.trim()) return;
    
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('compare') || lowerMessage.includes('vs') || lowerMessage.includes('versus')) {
      setQueryType('comparison');
    } else if (lowerMessage.includes('summarize') || lowerMessage.includes('summary')) {
      setQueryType('summarization');
    } else if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis')) {
      setQueryType('analysis');
    } else if (lowerMessage.includes('fact check') || lowerMessage.includes('verify')) {
      setQueryType('fact-check');
    } else if (lowerMessage.includes('create') || lowerMessage.includes('write') || lowerMessage.includes('generate')) {
      setQueryType('creative');
    } else {
      setQueryType('research');
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled || isProcessing) return;
    
    onSubmit({
      content: message,
      type: queryType,
      priority: 'medium',
      attachments,
      parameters: {
        outputFormat: 'structured',
        detailLevel: 'detailed',
        sourcesRequired: true,
        maxDuration: 300,
        agentSelection: [],
      },
    });
    
    setMessage('');
    setAttachments([]);
    setShowAdvanced(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // Limit file size to 10MB
      if (file.size > 10 * 1024 * 1024) {
        console.warn(`File ${file.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    
    setAttachments(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 files
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // TODO: Implement voice recording functionality
  };

  const getQueryTypeColor = (type: QueryType) => {
    const colors = {
      research: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      analysis: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      comparison: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      summarization: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'fact-check': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      creative: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    };
    return colors[type];
  };

  // Temporarily allow submission when disconnected for testing
  const isSubmitDisabled = !message.trim() || disabled || isProcessing;

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      {/* Query Type Hints */}
      {showQueryTypeHints && message && (
        <Card className="p-3 bg-muted border-dashed minimal-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm text-text-secondary">Detected query type:</span>
              <Badge className={cn('text-xs', getQueryTypeColor(queryType))}>
                {queryType.charAt(0).toUpperCase() + queryType.slice(1)}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs"
            >
              {showAdvanced ? 'Simple' : 'Advanced'}
            </Button>
          </div>
        </Card>
      )}

      {/* Attachments Display */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              {file.type.startsWith('image/') ? <Image className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
              <span className="max-w-20 truncate">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(index)}
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                ×
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Main Input */}
      <Card className="relative minimal-surface bg-chat-input-background border-chat-border">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 p-3">
            {/* File Upload */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled}
                    className="flex-shrink-0 h-9 w-9 p-0"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach files (max 10MB each)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Message Input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="min-h-[2.5rem] max-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent pr-12 text-text-primary placeholder:text-text-tertiary"
                rows={1}
              />
              
              {/* Character Counter */}
              {message.length > maxLength * 0.8 && (
                <div className="absolute bottom-2 right-2 text-xs text-text-tertiary">
                  {message.length}/{maxLength}
                </div>
              )}
            </div>

            {/* Voice Recording */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "ghost"}
                    size="sm"
                    onClick={toggleRecording}
                    disabled={disabled}
                    className="flex-shrink-0 h-9 w-9 p-0"
                  >
                    {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isRecording ? 'Stop recording' : 'Voice input (coming soon)'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Send Button */}
            <Button
              type="submit"
              disabled={isSubmitDisabled}
              className="flex-shrink-0 h-9 w-9 p-0"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </form>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.pdf,.doc,.docx,.md,.csv,.json,image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </Card>

      {/* Quick Examples */}
      {!message && !isProcessing && (
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            "Research latest AI developments",
            "Compare renewable energy sources",
            "Analyze market trends for 2025",
            "Summarize recent climate studies"
          ].map((example, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setMessage(example)}
              className="text-xs text-text-secondary hover:text-text-primary minimal-transition"
            >
              {example}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}