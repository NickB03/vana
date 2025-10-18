"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function Message({ className, children, ...props }: MessageProps) {
  return (
    <div className={cn("flex gap-3", className)} {...props}>
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
}

function MessageContent({
  className,
  children,
  ...props
}: MessageContentProps) {
  return (
    <div
      className={cn("rounded-lg px-4 py-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { Message, MessageAvatar, MessageContent }
