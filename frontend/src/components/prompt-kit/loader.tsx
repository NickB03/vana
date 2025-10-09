"use client"

import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const loaderVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      spinner: "animate-spin",
      dots: "gap-1",
      pulse: "animate-pulse",
      "text-blink": "",
      "text-shimmer": "relative overflow-hidden",
      "loading-dots": "gap-1",
    },
    size: {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-8 w-8",
    },
  },
  defaultVariants: {
    variant: "spinner",
    size: "md",
  },
})

export interface LoaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loaderVariants> {
  text?: string
}

export function Loader({
  className,
  variant,
  size,
  text,
  ...props
}: LoaderProps) {
  // Spinner variant
  if (variant === "spinner") {
    return (
      <div
        className={cn(loaderVariants({ variant, size }), className)}
        {...props}
      >
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
    )
  }

  // Dots variant
  if (variant === "dots") {
    return (
      <div
        className={cn(loaderVariants({ variant, size }), className)}
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse rounded-full bg-current",
              size === "sm" && "h-1 w-1",
              size === "md" && "h-2 w-2",
              size === "lg" && "h-3 w-3"
            )}
            style={{
              animationDelay: `${i * 0.15}s`,
            }}
          />
        ))}
      </div>
    )
  }

  // Pulse variant
  if (variant === "pulse") {
    return (
      <div
        className={cn(
          loaderVariants({ variant, size }),
          "rounded-full bg-current",
          className
        )}
        {...props}
      />
    )
  }

  // Text-blink variant
  if (variant === "text-blink") {
    return (
      <div
        className={cn("animate-pulse text-sm font-medium", className)}
        {...props}
      >
        {text || "Loading..."}
      </div>
    )
  }

  // Text-shimmer variant
  if (variant === "text-shimmer") {
    return (
      <div
        className={cn(
          // Remove loaderVariants to avoid fixed h-6 w-6 dimensions
          "inline-flex items-center justify-center",
          "text-sm font-medium",
          className
        )}
        {...props}
      >
        <span className="relative inline-block overflow-hidden">
          {text || "Loading..."}
          <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </span>
      </div>
    )
  }

  // Loading-dots variant (animated dots after text)
  if (variant === "loading-dots") {
    return (
      <div
        className={cn("flex items-center gap-1 text-sm font-medium", className)}
        {...props}
      >
        <span>{text || "Loading"}</span>
        <span className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="animate-bounce"
              style={{
                animationDelay: `${i * 0.15}s`,
                animationDuration: "1s",
              }}
            >
              .
            </span>
          ))}
        </span>
      </div>
    )
  }

  return null
}
