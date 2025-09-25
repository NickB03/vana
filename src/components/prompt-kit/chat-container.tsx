'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { memoWithTracking, useThrottledCallback } from '@/lib/react-performance'

interface ChatContainerRootProps {
  children: React.ReactNode
  className?: string
  autoScroll?: boolean
  scrollThreshold?: number
}

const ChatContainerRoot = memoWithTracking(({ 
  children, 
  className,
  autoScroll = true,
  scrollThreshold = 100
}: ChatContainerRootProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)

  const scrollToBottom = useCallback((smooth = true) => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant'
      })
    }
  }, [])

  // Throttle scroll position checks to prevent excessive re-renders
  const checkScrollPosition = useThrottledCallback(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      setIsNearBottom(distanceFromBottom < scrollThreshold)
    }
  }, 100)

  // Use callback to prevent effect re-runs
  const autoScrollEffect = useCallback(() => {
    if (autoScroll && isNearBottom) {
      scrollToBottom(true)
    }
  }, [autoScroll, isNearBottom, scrollToBottom])

  useEffect(() => {
    autoScrollEffect()
  }, [autoScrollEffect])

  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScrollPosition)
      return () => scrollElement.removeEventListener('scroll', checkScrollPosition)
    }
  }, [checkScrollPosition])

  return (
    <ScrollArea 
      ref={scrollAreaRef}
      className={cn("flex-1 h-full", className)}
    >
      {children}
    </ScrollArea>
  )
}, (prevProps, nextProps) => {
  return prevProps.children === nextProps.children &&
         prevProps.className === nextProps.className &&
         prevProps.autoScroll === nextProps.autoScroll &&
         prevProps.scrollThreshold === nextProps.scrollThreshold;
}, 'ChatContainerRoot');

interface ChatContainerContentProps {
  children: React.ReactNode
  className?: string
}

const ChatContainerContent = memoWithTracking(({ children, className }: ChatContainerContentProps) => {
  return (
    <div className={cn("space-y-0 px-5 py-12", className)}>
      {children}
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.children === nextProps.children &&
         prevProps.className === nextProps.className;
}, 'ChatContainerContent');

// Export all components
export { ChatContainerRoot, ChatContainerContent };

