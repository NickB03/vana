'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import ReactMarkdown from 'react-markdown'

interface MessageProps {
  children: React.ReactNode
  className?: string
}

export function Message({ children, className }: MessageProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-2 px-6", className)}>
      {children}
    </div>
  )
}

interface MessageContentProps {
  children: React.ReactNode
  className?: string
  markdown?: boolean
}

export function MessageContent({ children, className, markdown = false }: MessageContentProps) {
  const content = markdown ? (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-pre:p-0">
      <ReactMarkdown 
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          code: ({ children }) => (
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="mb-4 mt-6 overflow-x-auto rounded-lg border bg-zinc-950 py-4">
              {children}
            </pre>
          ),
        }}
      >
        {typeof children === 'string' ? children : String(children)}
      </ReactMarkdown>
    </div>
  ) : children

  return (
    <div className={cn("text-foreground flex-1 rounded-lg bg-transparent p-0", className)}>
      {content}
    </div>
  )
}

interface MessageActionsProps {
  children: React.ReactNode
  className?: string
}

export function MessageActions({ children, className }: MessageActionsProps) {
  return (
    <TooltipProvider>
      <div className={cn("flex gap-0", className)}>
        {children}
      </div>
    </TooltipProvider>
  )
}

interface MessageActionProps {
  children: React.ReactNode
  tooltip?: string
  delayDuration?: number
  onClick?: () => void
}

export function MessageAction({ children, tooltip, delayDuration = 100, onClick }: MessageActionProps) {
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
}