import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AIConversationProps {
  children: React.ReactNode
  className?: string
}

export function AIConversation({ children, className }: AIConversationProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = React.useState(false)

  // Check if we're at the bottom
  const checkScrollPosition = React.useCallback(() => {
    if (!containerRef.current) return
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isAtBottom)
  }, [])

  // Scroll to bottom function
  const scrollToBottom = React.useCallback(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [])

  // Auto-scroll when new content is added
  React.useEffect(() => {
    scrollToBottom()
  }, [children, scrollToBottom])

  // Listen for scroll events
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('scroll', checkScrollPosition)
    checkScrollPosition() // Initial check

    return () => {
      container.removeEventListener('scroll', checkScrollPosition)
    }
  }, [checkScrollPosition])

  return (
    <div className={cn("relative flex-1 overflow-hidden", className)}>
      <div
        ref={containerRef}
        className="h-full overflow-y-auto scroll-smooth"
        role="log"
        aria-label="AI conversation"
      >
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-2">
          {children}
          <div className="h-4" /> {/* Extra spacing at bottom for overlap */}
        </div>
      </div>
      
      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className={cn(
            "absolute bottom-4 right-4 z-10",
            "rounded-full bg-[var(--bg-element)] border border-[var(--border-primary)]",
            "p-2 shadow-lg transition-all duration-200",
            "hover:bg-gray-800 hover:scale-105",
            "animate-in fade-in slide-in-from-bottom-2"
          )}
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}