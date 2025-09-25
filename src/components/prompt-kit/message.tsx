'use client'

import React, { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'
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

interface MessageContentProps {
  children: React.ReactNode
  className?: string
  markdown?: boolean
}

const MessageContent = memoWithTracking(({ children, className, markdown = false }: MessageContentProps) => {
  // Memoize markdown components to prevent re-creation on every render
  const markdownComponents = useMemo(() => ({
    p: ({ children }: { children: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
    code: ({ children }: { children: React.ReactNode }) => (
      <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
        {children}
      </code>
    ),
    pre: ({ children }: { children: React.ReactNode }) => (
      <pre className="mb-4 mt-6 overflow-x-auto rounded-lg border bg-zinc-950 py-4">
        {children}
      </pre>
    ),
  }), []);

  // Memoize content to prevent unnecessary markdown re-processing
  const content = useMemo(() => {
    if (!markdown) return children;
    
    const textContent = typeof children === 'string' ? children : String(children);
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0">
        <ReactMarkdown components={markdownComponents}>
          {textContent}
        </ReactMarkdown>
      </div>
    );
  }, [children, markdown, markdownComponents]);

  return (
    <div className={cn("text-foreground flex-1 rounded-lg bg-transparent p-0", className)}>
      {content}
    </div>
  )
}, (prevProps, nextProps) => {
  // Only re-render if content, markdown flag, or className changes
  return prevProps.children === nextProps.children && 
         prevProps.markdown === nextProps.markdown &&
         prevProps.className === nextProps.className;
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
export { Message, MessageContent, MessageActions, MessageAction };