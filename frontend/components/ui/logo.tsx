"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface VanaLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "full" | "icon"
  className?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
  xl: "h-12 w-12"
}

export const VanaLogo = React.forwardRef<SVGSVGElement, VanaLogoProps>(
  ({ size = "md", variant = "full", className, ...props }, ref) => {
    const baseClasses = sizeClasses[size]
    
    if (variant === "icon") {
      return (
        <svg
          ref={ref}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn(baseClasses, className)}
          role="img"
          aria-label="Vana logo icon"
          {...props}
        >
          <defs>
            <linearGradient id="vana-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path
            d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
            fill="url(#vana-gradient)"
          />
          <path
            d="M12 10L20 10L16 20L12 10Z"
            fill="white"
            fillOpacity="0.9"
          />
          <circle
            cx="16"
            cy="24"
            r="2"
            fill="white"
            fillOpacity="0.8"
          />
        </svg>
      )
    }

    return (
      <div className={cn("flex items-center gap-2", className)}>
        <svg
          ref={ref}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={baseClasses}
          role="img"
          aria-label="Vana logo"
          {...props}
        >
          <defs>
            <linearGradient id="vana-gradient-full" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path
            d="M8 6C8 4.89543 8.89543 4 10 4H22C23.1046 4 24 4.89543 24 6V26C24 27.1046 23.1046 28 22 28H10C8.89543 28 8 27.1046 8 26V6Z"
            fill="url(#vana-gradient-full)"
          />
          <path
            d="M12 10L20 10L16 20L12 10Z"
            fill="white"
            fillOpacity="0.9"
          />
          <circle
            cx="16"
            cy="24"
            r="2"
            fill="white"
            fillOpacity="0.8"
          />
        </svg>
        {variant === "full" && (
          <span className="font-semibold text-lg tracking-tight">Vana</span>
        )}
      </div>
    )
  }
)

VanaLogo.displayName = "VanaLogo"

// For backwards compatibility and simpler usage
export const Logo = VanaLogo

// Icon-only version for use in places that need just the icon
export const VanaIcon = (props: Omit<VanaLogoProps, "variant">) => (
  <VanaLogo variant="icon" {...props} />
)