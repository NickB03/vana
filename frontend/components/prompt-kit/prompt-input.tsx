"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Send, Paperclip, Plus, Sparkles } from "lucide-react"

// ============================================================================
// Modern Prompt-Kit Input Component (Shadcn v4 Compatible)
// ============================================================================

interface PromptInputProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  loading?: boolean
  multiline?: boolean
  maxHeight?: number
  showActions?: boolean
  variant?: "default" | "minimal" | "enhanced"
}

interface PromptTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value?: string
  onChange?: (value: string) => void
  autoResize?: boolean
  maxHeight?: number
}

const PromptTextarea = React.forwardRef<HTMLTextAreaElement, PromptTextareaProps>(
  ({ className, value, onChange, autoResize = true, maxHeight = 200, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    React.useImperativeHandle(ref, () => textareaRef.current!)
    
    React.useEffect(() => {
      if (autoResize && textareaRef.current) {
        const textarea = textareaRef.current
        textarea.style.height = 'auto'
        const newHeight = Math.min(textarea.scrollHeight, maxHeight)
        textarea.style.height = `${newHeight}px`
      }
    }, [value, autoResize, maxHeight])

    return (
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        data-slot="textarea"
        className={cn(
          // Base styling with shadcn v4 patterns
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30",
          // Prompt-kit specific styling
          "flex w-full min-h-[44px] resize-none rounded-lg border bg-transparent px-3 py-2.5 text-base shadow-xs transition-[color,box-shadow,height] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // Remove default borders for embedded use
          "border-0 shadow-none focus-visible:ring-0 focus-visible:border-0",
          // Better mobile experience
          "field-sizing-content scroll-smooth",
          className
        )}
        style={{ maxHeight: autoResize ? maxHeight : undefined }}
        {...props}
      />
    )
  }
)
PromptTextarea.displayName = "PromptTextarea"

const PromptInput = React.forwardRef<HTMLDivElement, PromptInputProps>(
  ({ 
    className, 
    value: controlledValue, 
    onValueChange, 
    onSubmit, 
    placeholder = "Type a message...",
    disabled = false,
    loading = false,
    multiline = true,
    maxHeight = 200,
    showActions = true,
    variant = "default",
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = React.useState("")
    const value = controlledValue ?? internalValue
    const setValue = onValueChange ?? setInternalValue
    
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    const handleSubmit = React.useCallback(() => {
      if (!value.trim() || disabled || loading) return
      onSubmit?.(value.trim())
      setValue("")
    }, [value, disabled, loading, onSubmit, setValue])
    
    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !disabled && !loading) {
        e.preventDefault()
        handleSubmit()
      }
    }, [handleSubmit, disabled, loading])
    
    const handleAttachment = React.useCallback(() => {
      // TODO: Implement file upload
      console.log('Attachment clicked')
    }, [])
    
    const canSubmit = value.trim().length > 0 && !disabled && !loading
    
    return (
      <div
        ref={ref}
        className={cn(
          "prompt-input-container relative",
          // Variant styling
          variant === "default" && "border border-border rounded-lg bg-background shadow-sm hover:shadow-md transition-shadow",
          variant === "minimal" && "border-b border-border bg-transparent",
          variant === "enhanced" && "border border-border rounded-xl bg-gradient-to-r from-background to-muted/5 shadow-lg",
          // State styling
          loading && "opacity-75",
          disabled && "pointer-events-none opacity-50",
          className
        )}
        {...props}
      >
        <div className="flex items-end gap-2 p-3">
          {/* Attachment Button */}
          {showActions && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAttachment}
              disabled={disabled || loading}
              className="flex-shrink-0 h-9 w-9 p-0 rounded-lg hover:bg-muted/50"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          )}
          
          {/* Input Textarea */}
          <div className="flex-1 min-w-0">
            <PromptTextarea
              ref={textareaRef}
              value={value}
              onChange={setValue}
              placeholder={loading ? "Processing..." : placeholder}
              disabled={disabled || loading}
              maxHeight={maxHeight}
              onKeyDown={handleKeyDown}
              className="w-full"
              aria-label="Message input"
              data-testid="chat-input"
            />
          </div>
          
          {/* Submit Button */}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="sm"
            className={cn(
              "flex-shrink-0 h-9 w-9 p-0 rounded-lg transition-all duration-200",
              canSubmit 
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                : "bg-muted text-muted-foreground cursor-not-allowed",
              loading && "animate-pulse"
            )}
            aria-label="Send message"
            data-testid="send-button"
          >
            {loading ? (
              <Sparkles className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20 animate-pulse">
            <div className="h-full bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
          </div>
        )}
      </div>
    )
  }
)
PromptInput.displayName = "PromptInput"

// ============================================================================
// Enhanced Prompt Input with Chat Integration
// ============================================================================

interface ChatPromptInputProps extends Omit<PromptInputProps, 'onSubmit'> {
  onSendMessage?: (message: string) => void
  isResearchMode?: boolean
  researchActive?: boolean
  className?: string
}

const ChatPromptInput = React.forwardRef<HTMLDivElement, ChatPromptInputProps>(
  ({ 
    onSendMessage, 
    isResearchMode = false,
    researchActive = false,
    placeholder: customPlaceholder,
    loading: customLoading,
    className,
    ...props 
  }, ref) => {
    const loading = customLoading || researchActive
    
    const placeholder = customPlaceholder || (
      isResearchMode 
        ? (researchActive ? "Research in progress..." : "Enter your research query...")
        : "What can I help you with today?"
    )
    
    return (
      <div className={cn("w-full max-w-4xl mx-auto", className)}>
        {/* Research Status Indicator */}
        {researchActive && (
          <div className="flex items-center justify-center mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Research Active
            </div>
          </div>
        )}
        
        {/* Main Prompt Input */}
        <PromptInput
          ref={ref}
          onSubmit={onSendMessage}
          placeholder={placeholder}
          loading={loading}
          variant="enhanced"
          {...props}
        />
        
        {/* Help Text */}
        <div className="mt-2 text-center">
          <p className="text-xs text-muted-foreground">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Enter</kbd> to send, 
            <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border ml-1">Shift + Enter</kbd> for new line
          </p>
        </div>
      </div>
    )
  }
)
ChatPromptInput.displayName = "ChatPromptInput"

export { 
  PromptInput, 
  PromptTextarea, 
  ChatPromptInput,
  type PromptInputProps,
  type ChatPromptInputProps
}

// Default export for convenience
export default ChatPromptInput