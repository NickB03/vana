'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowDown } from 'lucide-react'

interface ScrollButtonProps {
  className?: string
  onClick?: () => void
  scrollContainerSelector?: string
}

export function ScrollButton({ className, onClick, scrollContainerSelector }: ScrollButtonProps) {
  const [isVisible, setIsVisible] = useState(false)

  const checkScrollPosition = useCallback(() => {
    // Find the scroll container (either provided selector or viewport)
    const scrollContainer = scrollContainerSelector
      ? document.querySelector(scrollContainerSelector)
      : document.querySelector('[data-radix-scroll-area-viewport]')

    if (!scrollContainer) {
      setIsVisible(false)
      return
    }

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer as HTMLElement
    const isScrollable = scrollHeight > clientHeight
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100

    // Show button only if content is scrollable AND user is not near the bottom
    setIsVisible(isScrollable && !isNearBottom)
  }, [scrollContainerSelector])

  useEffect(() => {
    // Find scroll container
    const scrollContainer = scrollContainerSelector
      ? document.querySelector(scrollContainerSelector)
      : document.querySelector('[data-radix-scroll-area-viewport]')

    if (!scrollContainer) return

    // Check on mount
    checkScrollPosition()

    // Check on scroll
    scrollContainer.addEventListener('scroll', checkScrollPosition)

    // Check on resize (content might change height)
    const resizeObserver = new ResizeObserver(checkScrollPosition)
    resizeObserver.observe(scrollContainer)

    return () => {
      scrollContainer.removeEventListener('scroll', checkScrollPosition)
      resizeObserver.disconnect()
    }
  }, [checkScrollPosition, scrollContainerSelector])

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      // Default scroll to bottom behavior
      const scrollContainer = scrollContainerSelector
        ? document.querySelector(scrollContainerSelector)
        : document.querySelector('[data-radix-scroll-area-viewport]')

      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: 'smooth'
        })
      } else {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }

  if (!isVisible) return null

  return (
    <Button
      onClick={handleClick}
      size="icon"
      variant="outline"
      className={cn(
        "size-8 rounded-full bg-background border shadow-sm hover:bg-accent",
        className
      )}
    >
      <ArrowDown className="size-4" />
    </Button>
  )
}