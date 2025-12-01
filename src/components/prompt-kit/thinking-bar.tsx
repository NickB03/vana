"use client";

import { cn } from "@/lib/utils";
import { TextShimmer } from "@/components/prompt-kit/text-shimmer";
import { ChevronDown, Square } from "lucide-react";

export type ThinkingBarProps = {
  /** Text to display (e.g., "Thinking...") */
  text?: string;
  /** Label for stop button */
  stopLabel?: string;
  /** Callback when stop button is clicked */
  onStop?: () => void;
  /** Callback when bar is clicked (e.g., expand/collapse) */
  onClick?: () => void;
  /** Whether the bar is expanded */
  isExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
};

/**
 * ThinkingBar - Animated thinking indicator with optional controls
 *
 * Displays an animated shimmer effect to indicate AI processing/thinking state.
 * Optionally supports stop button for stream cancellation and click handler for expand/collapse.
 *
 * Based on prompt-kit's ThinkingBar component with our design system integration.
 *
 * @example
 * ```tsx
 * <ThinkingBar
 *   text="Thinking..."
 *   onClick={() => setExpanded(!expanded)}
 *   isExpanded={expanded}
 * />
 * ```
 */
export function ThinkingBar({
  text = "Thinking...",
  stopLabel,
  onStop,
  onClick,
  isExpanded,
  className,
}: ThinkingBarProps) {
  const hasClickHandler = !!onClick;
  const hasStopButton = !!onStop && !!stopLabel;

  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-2",
        "rounded-md border border-border/40 bg-transparent",
        "px-3 py-1.5",
        "transition-all",
        hasClickHandler && [
          "cursor-pointer",
          "hover:border-border/60 hover:bg-muted/10",
        ],
        className
      )}
      onClick={onClick}
      role={hasClickHandler ? "button" : undefined}
      tabIndex={hasClickHandler ? 0 : undefined}
      onKeyDown={
        hasClickHandler
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      aria-expanded={hasClickHandler ? isExpanded : undefined}
      aria-label={
        hasClickHandler
          ? isExpanded
            ? "Hide thinking process"
            : "Show thinking process"
          : undefined
      }
    >
      {/* Left side: Spinner + Shimmer text */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {/* Spinner */}
        <div
          className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />

        {/* Shimmer text */}
        <TextShimmer
          className="flex-1 text-sm line-clamp-1"
          duration={2}
          spread={25}
        >
          {text}
        </TextShimmer>
      </div>

      {/* Right side: Stop button and/or Chevron */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Stop button */}
        {hasStopButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStop?.();
            }}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1",
              "text-xs text-muted-foreground",
              "rounded-md border border-border/40",
              "transition-colors",
              "hover:bg-muted/20 hover:text-foreground"
            )}
            aria-label="Stop thinking"
            type="button"
          >
            <Square className="size-3" aria-hidden="true" />
            <span>{stopLabel}</span>
          </button>
        )}

        {/* Chevron for expand/collapse */}
        {hasClickHandler && (
          <ChevronDown
            className={cn(
              "size-3.5 text-muted-foreground/60 transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
