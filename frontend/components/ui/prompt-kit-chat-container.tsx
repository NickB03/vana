"use client"

import { cn } from "@/lib/utils"
import { StickToBottom } from "use-stick-to-bottom"
import { forwardRef } from "react"

export type PromptKitChatContainerRootProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

export type PromptKitChatContainerContentProps = {
  children: React.ReactNode
  className?: string
} & React.HTMLAttributes<HTMLDivElement>

export type PromptKitChatContainerScrollAnchorProps = {
  className?: string
  ref?: React.RefObject<HTMLDivElement>
} & React.HTMLAttributes<HTMLDivElement>

/**
 * PromptKit-style ChatContainerRoot - The main scrollable container
 * Provides scroll-to-bottom functionality with smooth scrolling behavior
 * Compatible with SSE streaming and real-time message updates
 */
const ChatContainerRoot = forwardRef<HTMLDivElement, PromptKitChatContainerRootProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <StickToBottom
        className={cn(
          // Core layout and scrolling - ensure proper flex direction for vertical scrolling
          "flex flex-col overflow-y-auto",
          // Enhanced sizing - use min-h-0 to prevent flex issues  
          "h-full min-h-0",
          // Better scrollbar styling
          "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border/20",
          "hover:scrollbar-thumb-border/40",
          // Smooth scroll behavior for better UX
          "scroll-smooth",
          className
        )}
        resize="smooth"
        initial="instant"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        {...props}
      >
        {children}
      </StickToBottom>
    )
  }
)

ChatContainerRoot.displayName = "ChatContainerRoot"

/**
 * PromptKit-style ChatContainerContent - The content wrapper
 * Handles layout and spacing for chat messages
 * Optimized for SSE streaming with proper flex behavior
 */
const ChatContainerContent = forwardRef<HTMLDivElement, PromptKitChatContainerContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <StickToBottom.Content
        className={cn(
          // Core layout - flex grow to fill available space
          "flex flex-col flex-grow",
          // Enhanced spacing and layout - less aggressive spacing
          "space-y-3 p-4 sm:space-y-4 sm:p-6",
          // Use flex-grow and min-h-0 for proper height behavior
          "flex-1 min-h-0",
          // Responsive padding with better mobile experience
          "md:p-6 lg:p-8",
          // Better text rendering and ensure scrolling works
          "text-sm antialiased overflow-y-auto",
          className
        )}
        {...props}
      >
        {children}
      </StickToBottom.Content>
    )
  }
)

ChatContainerContent.displayName = "ChatContainerContent"

/**
 * PromptKit-style ChatContainerScrollAnchor - Invisible anchor for scroll behavior
 * Ensures proper scroll-to-bottom functionality during streaming
 * Enhanced with better accessibility and visual debugging
 */
const ChatContainerScrollAnchor = forwardRef<HTMLDivElement, PromptKitChatContainerScrollAnchorProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Core anchor styling
          "h-px shrink-0 scroll-mt-4",
          // Enhanced for prompt-kit - better scroll targeting
          "scroll-margin-top-4",
          // Visual debugging aid (only visible in development)
          process.env.NODE_ENV === 'development' && "bg-red-100/10",
          className
        )}
        aria-hidden="true"
        data-scroll-anchor
        {...props}
      />
    )
  }
)

ChatContainerScrollAnchor.displayName = "ChatContainerScrollAnchor"

/**
 * Additional PromptKit-style utilities for enhanced chat experience
 */

export type PromptKitChatMessageProps = {
  children: React.ReactNode
  className?: string
  variant?: "user" | "assistant" | "system"
  isStreaming?: boolean
} & React.HTMLAttributes<HTMLDivElement>

/**
 * PromptKit-style ChatMessage wrapper with enhanced styling
 * Provides consistent message styling with streaming indicators
 */
const ChatMessage = forwardRef<HTMLDivElement, PromptKitChatMessageProps>(
  ({ children, className, variant = "assistant", isStreaming = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base message styling
          "group relative flex gap-4",
          // Variant-specific styling
          variant === "user" && "flex-row-reverse",
          variant === "assistant" && "flex-row",
          variant === "system" && "justify-center opacity-75",
          // Streaming indicator
          isStreaming && "animate-pulse",
          // Enhanced interaction states
          "hover:bg-muted/50 transition-colors duration-200",
          "focus-within:bg-muted/30",
          className
        )}
        data-message-variant={variant}
        data-streaming={isStreaming}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ChatMessage.displayName = "ChatMessage"

export type PromptKitChatInputContainerProps = {
  children: React.ReactNode
  className?: string
  isLoading?: boolean
} & React.HTMLAttributes<HTMLDivElement>

/**
 * PromptKit-style ChatInputContainer for the input area
 * Provides consistent styling for chat input with loading states
 */
const ChatInputContainer = forwardRef<HTMLDivElement, PromptKitChatInputContainerProps>(
  ({ children, className, isLoading = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base container styling
          "flex flex-col gap-2",
          "border-t border-border/40",
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          // Enhanced padding and spacing
          "p-4 sm:p-6",
          // Loading state styling
          isLoading && "opacity-75 pointer-events-none",
          // Responsive adjustments
          "sticky bottom-0",
          className
        )}
        data-loading={isLoading}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ChatInputContainer.displayName = "ChatInputContainer"

export {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
  ChatMessage,
  ChatInputContainer,
}

// Default export for convenience
export default {
  Root: ChatContainerRoot,
  Content: ChatContainerContent,
  ScrollAnchor: ChatContainerScrollAnchor,
  Message: ChatMessage,
  InputContainer: ChatInputContainer,
}