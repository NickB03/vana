'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowDown } from 'lucide-react'

interface ScrollButtonProps {
  className?: string
  onClick?: () => void
}

export function ScrollButton({ className, onClick }: ScrollButtonProps) {
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      // Default scroll to bottom behavior
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      })
    }
  }

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