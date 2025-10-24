'use client'

import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { memoWithTracking } from '@/lib/react-performance'

interface MessageProps {
  children: React.ReactNode
  className?: string
}

const Message = memoWithTracking(({ children, className }: MessageProps) => {
  return (
    <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-2 px-6", className)}>
      {children}
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.children === nextProps.children &&
         prevProps.className === nextProps.className;
}, 'Message');

interface MessageAvatarProps {
  src?: string
  alt: string
  fallback: string
  delayMs?: number
  className?: string
}

const MessageAvatar = memoWithTracking(({
  src,
  alt,
  fallback,
  delayMs = 600,
  className
}: MessageAvatarProps) => {
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback delayMs={delayMs}>{fallback}</AvatarFallback>
    </Avatar>
  )
}, (prevProps, nextProps) => {
  return prevProps.src === nextProps.src &&
         prevProps.alt === nextProps.alt &&
         prevProps.fallback === nextProps.fallback &&
         prevProps.className === nextProps.className;
}, 'MessageAvatar');

interface MessageContentProps {
  children: React.ReactNode
  className?: string
  markdown?: boolean  // Deprecated: Use <Markdown> component directly instead
  id?: string         // For memoization when using with Markdown component
}

const MessageContent = memoWithTracking(({
  children,
  className,
  markdown = false,  // Kept for backward compatibility but deprecated
  id
}: MessageContentProps) => {
  // Note: The `markdown` prop is deprecated. Users should wrap content with
  // <Markdown id={messageId}>{content}</Markdown> instead for better streaming performance

  return (
    <div className={cn("text-foreground flex-1 rounded-lg bg-transparent p-0", className)}>
      {children}
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.children === nextProps.children &&
         prevProps.className === nextProps.className &&
         prevProps.id === nextProps.id;
}, 'MessageContent');

interface MessageActionsProps {
  children: React.ReactNode
  className?: string
}

const MessageActions = memoWithTracking(({ children, className }: MessageActionsProps) => {
  return (
    <TooltipProvider>
      <div className={cn("flex gap-0", className)}>
        {children}
      </div>
    </TooltipProvider>
  )
}, (prevProps, nextProps) => {
  return prevProps.children === nextProps.children && 
         prevProps.className === nextProps.className;
}, 'MessageActions');

interface MessageActionProps {
  children: React.ReactNode
  tooltip?: string
  delayDuration?: number
  onClick?: () => void
}

const MessageAction = memoWithTracking(({ children, tooltip, delayDuration = 100, onClick }: MessageActionProps) => {
  if (tooltip) {
    return (
      <Tooltip delayDuration={delayDuration}>
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
}, (prevProps, nextProps) => {
  return prevProps.children === nextProps.children && 
         prevProps.tooltip === nextProps.tooltip &&
         prevProps.delayDuration === nextProps.delayDuration &&
         prevProps.onClick === nextProps.onClick;
}, 'MessageAction');

// Export all components
export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction };