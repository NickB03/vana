'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface ScrollButtonProps {
  scrollRef?: React.RefObject<HTMLElement>
  containerRef?: React.RefObject<HTMLElement>
  threshold?: number
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function ScrollButton({
  scrollRef,
  containerRef,
  threshold = 100,
  variant = 'default',
  size = 'icon',
  className,
  onClick,
  children
}: ScrollButtonProps) {
  const [isVisible, setIsVisible] = useState(false)

  const scrollToBottom = () => {
    const element = scrollRef?.current || containerRef?.current
    if (element) {
      const scrollElement = element.querySelector('[data-radix-scroll-area-viewport]') || element
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth'
      })
    }
    onClick?.()
  }

  useEffect(() => {
    const element = scrollRef?.current || containerRef?.current
    if (!element) return

    const scrollElement = element.querySelector('[data-radix-scroll-area-viewport]') || element

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      setIsVisible(distanceFromBottom > threshold)
    }

    scrollElement.addEventListener('scroll', handleScroll)
    
    // Initial check
    handleScroll()

    return () => scrollElement.removeEventListener('scroll', handleScroll)
  }, [scrollRef, containerRef, threshold])

  if (!isVisible) return null

  return (
    <Button
      variant={variant}
      size={size}
      onClick={scrollToBottom}
      className={cn(
        "fixed bottom-20 right-6 rounded-full shadow-lg transition-all duration-200",
        "hover:scale-110 z-50",
        className
      )}
    >
      {children || <ChevronDown className="h-4 w-4" />}
    </Button>
  )
}

interface FloatingScrollButtonProps extends ScrollButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
  offset?: {
    bottom?: number
    right?: number
    left?: number
  }
}

export function FloatingScrollButton({
  position = 'bottom-right',
  offset = { bottom: 80, right: 24 },
  className,
  ...props
}: FloatingScrollButtonProps) {
  const positionClasses = {
    'bottom-right': `bottom-[${offset.bottom}px] right-[${offset.right || 24}px]`,
    'bottom-left': `bottom-[${offset.bottom}px] left-[${offset.left || 24}px]`,
    'bottom-center': `bottom-[${offset.bottom}px] left-1/2 transform -translate-x-1/2`
  }

  return (
    <ScrollButton
      {...props}
      className={cn(
        "fixed rounded-full shadow-lg",
        positionClasses[position],
        className
      )}
    />
  )
}

// Export both components
ScrollButton.Floating = FloatingScrollButton

export default ScrollButton