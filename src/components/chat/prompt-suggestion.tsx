'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PromptSuggestionProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  disabled?: boolean
  highlight?: {
    text: string
    className?: string
  }
}

export function PromptSuggestion({
  children,
  onClick,
  variant = 'outline',
  size = 'default',
  className,
  disabled = false,
  highlight
}: PromptSuggestionProps) {
  
  if (highlight) {
    return (
      <span 
        className={cn(
          "inline-block px-2 py-1 rounded-md bg-primary/10 text-primary cursor-pointer transition-colors hover:bg-primary/20",
          highlight.className,
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={disabled ? undefined : onClick}
      >
        {highlight.text}
      </span>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full transition-all duration-200 hover:scale-105",
        "border-dashed border-2 hover:border-solid",
        className
      )}
    >
      {children}
    </Button>
  )
}

interface PromptSuggestionGridProps {
  children: React.ReactNode
  className?: string
  columns?: 1 | 2 | 3 | 4
}

export function PromptSuggestionGrid({ 
  children, 
  className,
  columns = 2
}: PromptSuggestionGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={cn(
      "grid gap-3",
      gridCols[columns],
      className
    )}>
      {children}
    </div>
  )
}

interface PromptSuggestionListProps {
  suggestions: Array<{
    id: string
    title: string
    description?: string
    prompt: string
  }>
  onSuggestionClick?: (prompt: string) => void
  className?: string
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  columns?: 1 | 2 | 3 | 4
}

export function PromptSuggestionList({
  suggestions,
  onSuggestionClick,
  className,
  variant = 'outline',
  columns = 2
}: PromptSuggestionListProps) {
  return (
    <PromptSuggestionGrid columns={columns} className={className}>
      {suggestions.map((suggestion) => (
        <PromptSuggestion
          key={suggestion.id}
          variant={variant}
          onClick={() => onSuggestionClick?.(suggestion.prompt)}
          className="h-auto p-4 text-left flex flex-col items-start"
        >
          <div className="font-medium mb-1">{suggestion.title}</div>
          {suggestion.description && (
            <div className="text-xs text-muted-foreground">
              {suggestion.description}
            </div>
          )}
        </PromptSuggestion>
      ))}
    </PromptSuggestionGrid>
  )
}

// Compound component pattern
PromptSuggestion.Grid = PromptSuggestionGrid
PromptSuggestion.List = PromptSuggestionList

export default PromptSuggestion