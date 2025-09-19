'use client'

import React, { useRef, useEffect, useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface ChatContainerRootProps {
  children: React.ReactNode
  className?: string
  autoScroll?: boolean
  scrollThreshold?: number
}

export function ChatContainerRoot({ 
  children, 
  className,
  autoScroll = true,
  scrollThreshold = 100
}: ChatContainerRootProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)

  const scrollToBottom = (smooth = true) => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant'
      })
    }
  }

  const checkScrollPosition = () => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      setIsNearBottom(distanceFromBottom < scrollThreshold)
    }
  }

  useEffect(() => {
    if (autoScroll && isNearBottom) {
      scrollToBottom(true)
    }
  })

  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollPosition)
      return () => scrollElement.removeEventListener('scroll', checkScrollPosition)
    }
  }, [])

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className={cn("flex-1 h-full", className)}
    >
      {children}
    </ScrollArea>
  )
}

interface ChatContainerContentProps {
  children: React.ReactNode
  className?: string
}

export function ChatContainerContent({ children, className }: ChatContainerContentProps) {
  return (
    <div className={cn("space-y-0 px-5 py-12", className)}>
      {children}
    </div>
  )
}

