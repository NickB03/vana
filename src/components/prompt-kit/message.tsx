"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Markdown } from "./markdown"

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function Message({ className, children, ...props }: MessageProps) {
  return (
    <div className={cn("flex", className)} {...props}>
      {children}
    </div>
  )
}

interface MessageAvatarProps {
  src?: string
  alt?: string
  fallback: string
  className?: string
}

function MessageAvatar({ src, alt, fallback, className }: MessageAvatarProps) {
  return (
    <Avatar className={cn("h-8 w-8 shrink-0", className)}>
      {src && <AvatarImage src={src} alt={alt} />}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  )
}

interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  markdown?: boolean
}

function MessageContent({
  className,
  children,
  markdown = false,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn("rounded-lg px-4 py-2", className)}
      {...props}
    >
      {markdown ? <Markdown>{children as string}</Markdown> : children}
    </div>
  )
}

interface MessageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function MessageActions({ className, children, ...props }: MessageActionsProps) {
  return (
    <div className={cn("flex items-center", className)} {...props}>
      {children}
    </div>
  )
}

interface MessageActionProps {
  children: React.ReactNode
  tooltip?: string
  delayDuration?: number
}

function MessageAction({ children, tooltip, delayDuration = 0 }: MessageActionProps) {
  if (!tooltip) return <>{children}</>

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { Message, MessageAvatar, MessageContent, MessageActions, MessageAction }
