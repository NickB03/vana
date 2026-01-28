import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { getSyncDelay } from "./skeleton-utils";

interface MessageSkeletonProps {
  variant?: "user" | "assistant";
  className?: string;
}

/**
 * Skeleton placeholder for chat messages during loading.
 * Matches the visual layout of actual messages for smooth transitions.
 *
 * Accessibility:
 * - Uses role="status" for screen readers
 * - Includes aria-label describing the loading state
 * - Contains sr-only text for additional context
 * - Respects prefers-reduced-motion via motion-safe/motion-reduce
 */
export const MessageSkeleton = memo(({ variant = "assistant", className }: MessageSkeletonProps) => {
  // Calculate sync delay once on mount - useMemo ensures consistent timing
  // during the component's lifecycle
  const syncDelay = useMemo(() => getSyncDelay(), []);

  // Inline style for CSS variable
  const syncStyle = { '--pulse-sync-delay': `${syncDelay}ms` } as React.CSSProperties;

  // Base skeleton classes with synchronized animation and motion-reduce support
  const baseClasses = "motion-safe:animate-pulse-sync motion-reduce:animate-none bg-muted rounded";

  const ariaLabel = variant === "user" ? "Loading your message" : "Loading AI response";

  if (variant === "user") {
    return (
      <div
        role="status"
        aria-label={ariaLabel}
        className={cn("flex flex-col items-end gap-1 mx-auto w-full max-w-3xl px-4", className)}
      >
        <div className={cn(baseClasses, "h-10 w-64 rounded-3xl")} style={syncStyle} aria-hidden="true" />
        <span className="sr-only">{ariaLabel}</span>
      </div>
    );
  }

  // Assistant message skeleton
  return (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn("mx-auto w-full max-w-3xl px-4 space-y-2", className)}
    >
      <div className="space-y-2">
        <div className={cn(baseClasses, "h-4 w-full")} style={syncStyle} aria-hidden="true" />
        <div className={cn(baseClasses, "h-4 w-5/6")} style={syncStyle} aria-hidden="true" />
        <div className={cn(baseClasses, "h-4 w-4/5")} style={syncStyle} aria-hidden="true" />
      </div>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
});

MessageSkeleton.displayName = 'MessageSkeleton';
