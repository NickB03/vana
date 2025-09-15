"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { VanaWelcomeMessage } from "./vana-welcome-message"
import { WelcomeSuggestions } from "./welcome-suggestions"
import { ChatPromptInput } from "@/components/prompt-kit/prompt-input"

interface WelcomeScreenProps {
  onStartChat: (message: string) => void
  className?: string
  variant?: "default" | "compact"
  showSuggestions?: boolean
}

export function WelcomeScreen({ 
  onStartChat, 
  className,
  variant = "default",
  showSuggestions = true
}: WelcomeScreenProps) {
  const [isInputFocused, setIsInputFocused] = React.useState(false)

  const handleSuggestionSelect = React.useCallback((suggestion: string) => {
    onStartChat(suggestion)
  }, [onStartChat])

  const handleInputSubmit = React.useCallback((message: string) => {
    onStartChat(message)
  }, [onStartChat])

  return (
    <div 
      className={cn(
        "flex flex-col h-full min-h-0",
        "relative overflow-hidden",
        className
      )}
    >
      {/* Main Welcome Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 min-h-0">
        <div className="w-full max-w-6xl mx-auto space-y-12">
          
          {/* Welcome Message */}
          <VanaWelcomeMessage 
            variant={variant}
            animate={true}
            className="mb-8"
          />
          
          {/* Suggestions Grid */}
          {showSuggestions && (
            <div className={cn(
              "transition-all duration-300 ease-out",
              isInputFocused ? "opacity-75 scale-95" : "opacity-100 scale-100"
            )}>
              <WelcomeSuggestions 
                onSelectSuggestion={handleSuggestionSelect}
                maxDisplay={variant === "compact" ? 4 : 6}
              />
            </div>
          )}
        </div>
      </div>

      {/* Input Area - Bottom */}
      <div className="flex-shrink-0 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-4">
          <ChatPromptInput
            onSendMessage={handleInputSubmit}
            placeholder="What would you like to explore today?"
            variant="enhanced"
            className={cn(
              "transition-all duration-300 ease-out",
              isInputFocused && "scale-105 shadow-lg"
            )}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
          />
        </div>
      </div>

      {/* Background Decorations */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-purple-500/10 to-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-orange-500/10 to-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,69,19,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,69,19,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black_40%,transparent_100%)]" />
      </div>
    </div>
  )
}