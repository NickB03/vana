"use client";

import React, { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Paperclip, Bot } from 'lucide-react';
import { useChatContext } from '@/contexts/chat-context';
import { cn } from '@/lib/utils';

// ============================================================================
// Core PromptInput Components (following prompt-kit pattern)
// ============================================================================

interface PromptInputProps {
  value: string;
  onValueChange: (value: string) => void;
  isLoading?: boolean;
  onSubmit: (value: string) => void;
  maxHeight?: number | string;
  className?: string;
  children: React.ReactNode;
}

const PromptInput = forwardRef<HTMLFormElement, PromptInputProps>(
  ({ value, onValueChange, isLoading = false, onSubmit, maxHeight = 200, className, children, ...props }, ref) => {
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!value.trim() || isLoading) return;
      onSubmit(value);
    };

    return (
      <TooltipProvider>
        <form
          ref={ref}
          onSubmit={handleSubmit}
          className={cn("relative", className)}
          role="form"
          aria-label="Chat input form"
          {...props}
        >
          <div className={cn(
            // Mobile-first responsive design
            "flex items-end gap-2 p-2 sm:p-3",
            // Responsive borders and styling
            "border border-gray-200 dark:border-gray-800 rounded-lg sm:rounded-xl",
            // Background with better mobile contrast
            "bg-white dark:bg-gray-950 shadow-sm hover:shadow-md transition-shadow",
            // Mobile touch targets
            "min-h-[48px] sm:min-h-[52px]"
          )}>
            {children}
          </div>
        </form>
      </TooltipProvider>
    );
  }
);
PromptInput.displayName = "PromptInput";

interface PromptInputTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxHeight?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
}

const PromptInputTextarea = forwardRef<HTMLTextAreaElement, PromptInputTextareaProps>(
  ({ 
    value, 
    onChange, 
    onKeyDown, 
    placeholder, 
    disabled, 
    className,
    maxHeight = 200,
    ...props 
  }, ref) => {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !disabled) {
        e.preventDefault();
        // Let the parent PromptInput handle the submit
        const form = e.currentTarget.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
      onKeyDown?.(e);
    };

    return (
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex-1 min-h-[20px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent disabled:opacity-50",
          className
        )}
        style={{ maxHeight }}
        rows={1}
        {...props}
      />
    );
  }
);
PromptInputTextarea.displayName = "PromptInputTextarea";

interface PromptInputActionsProps {
  children: React.ReactNode;
  className?: string;
}

const PromptInputActions: React.FC<PromptInputActionsProps> = ({ children, className }) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {children}
    </div>
  );
};

interface PromptInputActionProps {
  tooltip: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

const PromptInputAction: React.FC<PromptInputActionProps> = ({ 
  tooltip, 
  children, 
  onClick, 
  disabled, 
  className 
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex-shrink-0", className)}>
          {React.cloneElement(children as React.ReactElement, {
            onClick,
            disabled,
          } as Record<string, unknown>)}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// ============================================================================
// ChatInputPromptKit Component (Drop-in Replacement)
// ============================================================================

interface ChatInputPromptKitProps {
  onSendMessage?: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInputPromptKit({ 
  onSendMessage, 
  disabled = false, 
  placeholder,
  className 
}: ChatInputPromptKitProps) {
  const [message, setMessage] = useState('');
  const { sendMessage, research } = useChatContext();
  
  // Always use research mode (no toggle)
  const isResearchMode = true;
  const isLoading = research.isResearchActive || disabled;

  const handleSubmit = (value: string) => {
    // Debug logging removed for production build
    
    if (!value.trim() || isLoading) {
      // Submission blocked - empty value or loading
      return;
    }
    
    // Use custom handler if provided, otherwise use context
    if (onSendMessage) {
      // Using custom onSendMessage handler
      onSendMessage(value);
    } else {
      // Using context sendMessage
      sendMessage(value);
    }
    setMessage('');
  };

  const handleUploadClick = () => {
    // TODO: Implement upload functionality
    // Upload clicked - to be implemented
  };

  // Get dynamic placeholder text based on mode
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    if (isResearchMode) {
      return research.isResearchActive 
        ? "Research in progress..." 
        : "Enter your research query...";
    }
    return "What can I help you with today?";
  };

  return (
    <div className={cn(
      // Mobile-first padding and responsive design
      "px-3 py-3 sm:px-4 sm:py-4",
      // Background and border styling with better mobile contrast
      "border-t border-gray-200 dark:border-gray-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      className
    )}>
      <div className="max-w-4xl mx-auto w-full">
        {/* Research Status (when active) */}
        {research.isResearchActive && (
          <div className="flex justify-center mb-2 sm:mb-3">
            <Badge variant="default" className="gap-1 text-xs sm:text-sm">
              <Bot className="h-3 w-3 animate-pulse" />
              Research Active
            </Badge>
          </div>
        )}
        
        {/* PromptInput Implementation */}
        <PromptInput
          value={message}
          onValueChange={setMessage}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          maxHeight={200}
          aria-label={isResearchMode ? "Research query form" : "Chat message form"}
        >
          {/* Upload Action */}
          <PromptInputAction
            tooltip="Attach file"
            disabled={isLoading}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleUploadClick}
              className="p-2"
              aria-label="Attach file"
            >
              <Paperclip size={18} />
            </Button>
          </PromptInputAction>

          {/* Message Input Textarea */}
          <PromptInputTextarea
            value={message}
            onChange={setMessage}
            placeholder={getPlaceholder()}
            disabled={isLoading}
            maxHeight={200}
            aria-label={isResearchMode ? "Enter research query" : "Enter message"}
            aria-describedby="chat-input-hint"
            data-testid="chat-input"
          />

          {/* Actions Container */}
          <PromptInputActions>
            {/* Send Action */}
            <PromptInputAction
              tooltip="Send message"
              disabled={!message.trim() || isLoading}
            >
              <Button
                type="submit"
                size="sm"
                disabled={!message.trim() || isLoading}
                className="p-2"
                aria-label="Send message"
                data-testid="send-button"
              >
                <Send size={18} />
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>

        {/* Screen reader hint */}
        <div id="chat-input-hint" className="sr-only">
          {isResearchMode 
            ? "Press Enter to send research query, Shift+Enter for new line" 
            : "Press Enter to send message, Shift+Enter for new line"
          }
        </div>
      </div>
    </div>
  );
}

// Export individual components for potential reuse
export { PromptInput, PromptInputTextarea, PromptInputActions, PromptInputAction };