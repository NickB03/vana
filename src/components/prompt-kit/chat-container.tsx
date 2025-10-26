"use client"

import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"

interface ChatContainerRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function ChatContainerRoot({
  className,
  children,
  ...props
}: ChatContainerRootProps) {
  return (
    <div
      className={cn("relative flex-1 overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface ChatContainerContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  autoScroll?: boolean
}

function ChatContainerContent({
  className,
  children,
  autoScroll = true,
  ...props
}: ChatContainerContentProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [children, autoScroll])

  return (
    <div
      ref={contentRef}
      className={cn("h-full overflow-y-auto", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { ChatContainerRoot, ChatContainerContent }
