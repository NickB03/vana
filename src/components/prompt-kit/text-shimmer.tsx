"use client";

import { cn } from "@/lib/utils";

export type TextShimmerProps = {
  /** HTML element to render as */
  as?: keyof JSX.IntrinsicElements;
  /** Animation duration in seconds */
  duration?: number;
  /** Shimmer spread width (constrained 5-45) */
  spread?: number;
  /** Use pulsing animation variant (slower, left-to-right pulse) */
  pulse?: boolean;
  /** Content to display with shimmer effect */
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

/**
 * TextShimmer - Animated shimmer effect for text
 *
 * Creates a gradient animation that sweeps across text content,
 * ideal for loading states or highlighting active processing.
 *
 * @example
 * ```tsx
 * // Standard shimmer (fast sweep)
 * <TextShimmer duration={2} spread={30}>
 *   Processing...
 * </TextShimmer>
 *
 * // Pulsing shimmer (slow, gentle pulse)
 * <TextShimmer pulse duration={3} spread={30}>
 *   Analyzing request...
 * </TextShimmer>
 * ```
 */
export function TextShimmer({
  as = "span",
  className,
  duration = 4,
  spread = 20,
  pulse = false,
  children,
  ...props
}: TextShimmerProps) {
  // Constrain spread between 5 and 45 for visual consistency
  const dynamicSpread = Math.min(Math.max(spread, 5), 45);
  const Component = as as React.ElementType;

  return (
    <Component
      className={cn(
        "bg-clip-text font-medium text-transparent",
        pulse ? "animate-shimmer-pulse" : "animate-shimmer",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(to right, hsl(var(--muted-foreground)) ${50 - dynamicSpread}%, hsl(var(--foreground)) 50%, hsl(var(--muted-foreground)) ${50 + dynamicSpread}%)`,
        animationDuration: `${duration}s`,
      }}
      {...props}
    >
      {children}
    </Component>
  );
}
