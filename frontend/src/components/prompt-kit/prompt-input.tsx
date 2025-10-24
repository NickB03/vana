'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface PromptInputProps {
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  onSubmit?: (value: string) => void
  maxHeight?: number
  placeholder?: string
  className?: string
  disabled?: boolean
  children?: React.ReactNode
}

export function PromptInput({
  isLoading = false,
  value: controlledValue,
  onValueChange,
  onSubmit,
  maxHeight = 200,
  placeholder = "Ask anything",
  className,
  disabled = false,
  children
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Use controlled or uncontrolled value
  const value = controlledValue !== undefined ? controlledValue : internalValue

  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!value.trim() || isLoading || disabled) return

    onSubmit?.(value.trim())

    // Clear input after submit if uncontrolled
    if (controlledValue === undefined) {
      setInternalValue('')
    }
  }

  const focusInput = () => {
    textareaRef.current?.focus()
  }

  // Provide context to children
  const contextValue = {
    value,
    onChange: handleValueChange,
    onSubmit: handleSubmit,
    isLoading,
    disabled,
    placeholder,
    maxHeight,
    textareaRef,
    focusInput
  }

  return (
    <TooltipProvider>
      <form 
        ref={formRef}
        onSubmit={handleSubmit}
        className={cn("border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs", className)}
      >
        <PromptInputContext.Provider value={contextValue}>
          {children}
        </PromptInputContext.Provider>
      </form>
    </TooltipProvider>
  )
}

// Context for sharing state between PromptInput components
const PromptInputContext = React.createContext<{
  value: string
  onChange: (value: string) => void
  onSubmit: (e?: React.FormEvent) => void
  isLoading: boolean
  disabled: boolean
  placeholder: string
  maxHeight: number
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  focusInput: () => void
} | null>(null)

const usePromptInputContext = () => {
  const context = React.useContext(PromptInputContext)
  if (!context) {
    throw new Error('PromptInput components must be used within PromptInput')
  }
  return context
}

// Export as usePromptInput for backward compatibility
export const usePromptInput = usePromptInputContext

interface PromptInputTextareaProps {
  placeholder?: string
  className?: string
}

export function PromptInputTextarea({ placeholder: propPlaceholder, className }: PromptInputTextareaProps) {
  const { value, onChange, onSubmit, isLoading, disabled, placeholder: contextPlaceholder, maxHeight, textareaRef } = usePromptInputContext()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const scrollHeight = Math.min(textarea.scrollHeight, maxHeight)
    textarea.style.height = `${scrollHeight}px`
  }, [value, maxHeight, textareaRef])

  return (
    <Textarea
      ref={textareaRef as React.RefObject<HTMLTextAreaElement>}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={propPlaceholder || contextPlaceholder}
      disabled={disabled || isLoading}
      className={cn(
        "resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0",
        "min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base",
        "placeholder:text-muted-foreground/70",
        className
      )}
      rows={1}
    />
  )
}

interface PromptInputActionsProps {
  children: React.ReactNode
  className?: string
}

export function PromptInputActions({ children, className }: PromptInputActionsProps) {
  return (
    <div className={cn("mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3", className)}>
      {children}
    </div>
  )
}

interface PromptInputActionProps {
  children: React.ReactNode
  tooltip?: string
  onClick?: () => void
}

export function PromptInputAction({ children, tooltip, onClick }: PromptInputActionProps) {
  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild onClick={onClick}>
          {children}
        </TooltipTrigger>
        <TooltipContent>
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }

  return <div onClick={onClick}>{children}</div>
}