"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

interface VanaWelcomeMessageProps {
  className?: string
  variant?: "default" | "compact"
  animate?: boolean
}

export function VanaWelcomeMessage({ 
  className, 
  variant = "default",
  animate = true
}: VanaWelcomeMessageProps) {
  const [isVisible, setIsVisible] = React.useState(!animate)
  
  React.useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    }
  }, [animate])

  return (
    <div 
      className={cn(
        "flex flex-col items-center justify-center text-center space-y-4",
        "transition-all duration-700 ease-out",
        animate && (isVisible 
          ? "opacity-100 transform translate-y-0 scale-100" 
          : "opacity-0 transform translate-y-4 scale-95"
        ),
        className
      )}
    >
      {/* Decorative Icon */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-purple-500 to-orange-500 rounded-full blur-xl opacity-20 animate-pulse" />
        <div className="relative bg-gradient-to-r from-purple-600 via-purple-500 to-orange-500 p-4 rounded-full">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* Main Welcome Message */}
      <div className="space-y-2">
        <h1 
          className={cn(
            "font-bold tracking-tight leading-tight",
            "bg-gradient-to-r from-purple-600 via-purple-500 to-orange-500 bg-clip-text text-transparent",
            variant === "default" && "text-4xl sm:text-5xl lg:text-6xl",
            variant === "compact" && "text-2xl sm:text-3xl lg:text-4xl"
          )}
        >
          Hi, I&apos;m Vana
        </h1>
        
        <p className={cn(
          "text-muted-foreground leading-relaxed max-w-2xl mx-auto",
          variant === "default" && "text-lg sm:text-xl",
          variant === "compact" && "text-base sm:text-lg"
        )}>
          Your AI research assistant. I can help you explore ideas, analyze data, 
          and discover insights across any topic.
        </p>
      </div>

      {/* Gradient Underline Animation */}
      <div className="relative">
        <div 
          className={cn(
            "h-1 bg-gradient-to-r from-purple-600 via-purple-500 to-orange-500 rounded-full",
            "transition-all duration-1000 ease-out",
            variant === "default" && (isVisible ? "w-24" : "w-0"),
            variant === "compact" && (isVisible ? "w-16" : "w-0")
          )}
        />
      </div>
    </div>
  )
}