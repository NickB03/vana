'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Send, Loader2, Plus, Mic, Paperclip } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ConversationPromptInputProps {
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  onSubmit?: (value: string) => void
  maxHeight?: number
  placeholder?: string
  className?: string
  disabled?: boolean
  showAttachments?: boolean
  showVoice?: boolean
  allowMultiline?: boolean
  suggestions?: string[]
  onSuggestionClick?: (suggestion: string) => void
}

export function ConversationPromptInput({
  isLoading = false,
  value: controlledValue,
  onValueChange,
  onSubmit,
  maxHeight = 200,
  placeholder = "Message Vana...",
  className,
  disabled = false,
  showAttachments = false,
  showVoice = false,
  allowMultiline = true,
  suggestions = [],
  onSuggestionClick
}: ConversationPromptInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  // Use controlled or uncontrolled value
  const value = controlledValue !== undefined ? controlledValue : internalValue
  
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!value.trim() || isLoading || disabled) return
    
    onSubmit?.(value.trim())
    
    // Clear input after submit if uncontrolled
    if (controlledValue === undefined) {
      setInternalValue('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!allowMultiline || (!e.shiftKey && allowMultiline)) {
        e.preventDefault()
        formRef.current?.requestSubmit()
      }
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    handleValueChange(suggestion)
    onSuggestionClick?.(suggestion)
    textareaRef.current?.focus()
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const scrollHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${scrollHeight}px`
  }, [value, maxHeight])

  // Focus textarea when suggestions are clicked
  useEffect(() => {
    if (value && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [value])

  return (
    <TooltipProvider>
      <div className={cn("fixed bottom-0 left-0 right-0 bg-background border-t", className)}>
        {/* Input Area - Prompt-Kit Style */}
        <div className="max-w-4xl mx-auto p-4">
          <form 
            ref={formRef}
            onSubmit={handleSubmit}
            className="relative"
          >
            <div className="flex items-end gap-3 bg-white border border-gray-200 rounded-3xl p-3 shadow-sm">
              {/* Left Actions */}
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full"
                      disabled={disabled || isLoading}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add content</TooltipContent>
                </Tooltip>
                
                {showAttachments && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full"
                        disabled={disabled || isLoading}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach file</TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Input Container */}
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => handleValueChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={placeholder}
                  disabled={disabled || isLoading}
                  className={cn(
                    "resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
                    "min-h-[40px] max-h-[160px] px-0 py-2",
                    "placeholder:text-gray-500 text-gray-900 text-sm"
                  )}
                  rows={1}
                />
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2">
                {showVoice && !value.trim() && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full"
                        disabled={disabled || isLoading}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Voice message</TooltipContent>
                  </Tooltip>
                )}
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="submit"
                      size="icon"
                      disabled={!value.trim() || isLoading || disabled}
                      className={cn(
                        "h-8 w-8 shrink-0 rounded-full transition-all duration-200",
                        value.trim() 
                          ? "bg-gray-800 hover:bg-gray-700 text-white" 
                          : "bg-gray-100 text-gray-400"
                      )}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Send message
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </form>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default ConversationPromptInput