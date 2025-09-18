'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Copy, ThumbsUp, ThumbsDown } from 'lucide-react'

interface MessageProps {
  children: React.ReactNode
  className?: string
  variant?: 'user' | 'assistant' | 'system'
}

export function Message({ children, className, variant = 'assistant' }: MessageProps) {
  return (
    <div className={cn(
      "flex gap-3 group",
      variant === 'user' && "flex-row-reverse",
      className
    )}>
      {children}
    </div>
  )
}

interface MessageAvatarProps {
  src?: string
  fallback?: string
  variant?: 'user' | 'assistant' | 'system'
  className?: string
}

export function MessageAvatar({ 
  src, 
  fallback, 
  variant = 'assistant',
  className 
}: MessageAvatarProps) {
  const defaultFallbacks = {
    user: 'U',
    assistant: 'V',
    system: 'S'
  }

  const avatarColors = {
    user: 'bg-blue-500',
    assistant: 'bg-primary',
    system: 'bg-gray-500'
  }

  return (
    <Avatar className={cn("h-8 w-8 shrink-0", className)}>
      {src && <AvatarImage src={src} />}
      <AvatarFallback className={cn(
        "text-white text-sm font-semibold",
        avatarColors[variant]
      )}>
        {fallback || defaultFallbacks[variant]}
      </AvatarFallback>
    </Avatar>
  )
}

interface MessageContentProps {
  children: React.ReactNode
  className?: string
  variant?: 'user' | 'assistant' | 'system'
}

export function MessageContent({ 
  children, 
  className,
  variant = 'assistant' 
}: MessageContentProps) {
  return (
    <div className={cn(
      "flex-1 space-y-2",
      variant === 'user' && "text-right",
      className
    )}>
      <div className={cn(
        "inline-block max-w-[80%] rounded-lg px-4 py-2 text-sm",
        variant === 'user' 
          ? "bg-primary text-primary-foreground ml-auto" 
          : "bg-muted",
        variant === 'system' && "bg-yellow-50 border border-yellow-200 text-yellow-800"
      )}>
        {children}
      </div>
    </div>
  )
}

interface MessageActionsProps {
  onCopy?: () => void
  onLike?: () => void
  onDislike?: () => void
  className?: string
  showActions?: boolean
}

export function MessageActions({ 
  onCopy, 
  onLike, 
  onDislike,
  className,
  showActions = true
}: MessageActionsProps) {
  if (!showActions) return null

  return (
    <div className={cn(
      "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
      className
    )}>
      {onCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="h-8 w-8 p-0"
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
      {onLike && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onLike}
          className="h-8 w-8 p-0"
        >
          <ThumbsUp className="h-3 w-3" />
        </Button>
      )}
      {onDislike && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDislike}
          className="h-8 w-8 p-0"
        >
          <ThumbsDown className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

// Compound component pattern
Message.Avatar = MessageAvatar
Message.Content = MessageContent
Message.Actions = MessageActions

export default Message