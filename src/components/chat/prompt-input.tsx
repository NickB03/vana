'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Send, Loader2 } from 'lucide-react'

interface PromptInputProps {
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  onSubmit?: (value: string) => void
  maxHeight?: number
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function PromptInput({
  isLoading = false,
  value: controlledValue,
  onValueChange,
  onSubmit,
  maxHeight = 200,
  placeholder = "Type your message...",
  className,
  disabled = false
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState('')
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      formRef.current?.requestSubmit()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const scrollHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${scrollHeight}px`
  }, [value, maxHeight])

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit}
      className={cn("flex items-end gap-2 p-4 border-t bg-background", className)}
    >
      <div className="flex-1 relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleValueChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="resize-none min-h-[44px] max-h-[200px] pr-12"
          rows={1}
        />
      </div>
      
      <Button 
        type="submit"
        size="icon"
        disabled={!value.trim() || isLoading || disabled}
        className="h-11 w-11 shrink-0"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  )
}

export default PromptInput