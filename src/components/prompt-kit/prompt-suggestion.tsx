import * as React from "react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * PromptSuggestion - Pill-shaped suggestion buttons for chat interfaces
 *
 * Based on prompt-kit pattern: https://www.prompt-kit.com/docs/prompt-suggestion
 *
 * Two modes:
 * - Normal: Clickable pill buttons for quick prompt suggestions
 * - Highlight: Emphasizes specific text within suggestions
 *
 * @example
 * ```tsx
 * <PromptSuggestion onClick={() => setInput("Tell me a joke")}>
 *   Tell me a joke
 * </PromptSuggestion>
 *
 * // With highlight
 * <PromptSuggestion highlight="React">
 *   Build a React component
 * </PromptSuggestion>
 * ```
 */

export interface PromptSuggestionProps
  extends Omit<ButtonProps, "variant" | "size"> {
  /** Content to display in the suggestion button */
  children: React.ReactNode;
  /** When provided, enables highlight mode and highlights this text */
  highlight?: string;
  /** Visual variant - defaults to "outline" in normal mode, "ghost" in highlight mode */
  variant?: "default" | "destructive" | "outline" | "ghost" | "secondary" | "link";
  /** Size of the button - defaults to "sm" */
  size?: "default" | "sm" | "lg" | "icon";
  /** Additional CSS classes */
  className?: string;
}

export function PromptSuggestion({
  children,
  highlight,
  variant,
  size = "sm",
  className,
  ...props
}: PromptSuggestionProps) {
  // Determine default variant based on mode
  const effectiveVariant = variant ?? (highlight ? "ghost" : "outline");

  // Helper to escape regex special characters
  const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // If highlight mode, render with highlighted text
  if (highlight && typeof children === "string") {
    const parts = children.split(new RegExp(`(${escapeRegex(highlight)})`, "gi"));

    return (
      <Button
        variant={effectiveVariant}
        size={size}
        className={cn(
          "rounded-full px-4 py-2 h-auto text-sm font-normal",
          "transition-all duration-200",
          "hover:bg-accent/80 hover:scale-[1.02]",
          "active:scale-[0.98]",
          className
        )}
        {...props}
      >
        {parts.map((part, index) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <span
              key={index}
              className="font-semibold text-primary"
            >
              {part}
            </span>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </Button>
    );
  }

  // Normal mode - simple pill button
  return (
    <Button
      variant={effectiveVariant}
      size={size}
      className={cn(
        "rounded-full px-4 py-2 h-auto text-sm font-normal",
        "border-white/10 bg-white/5 text-white/80",
        "transition-all duration-200",
        "hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-[1.02]",
        "active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * PromptSuggestionList - Container for multiple prompt suggestions
 *
 * Provides responsive flex-wrap layout for suggestion pills
 */
export interface PromptSuggestionListProps {
  children: React.ReactNode;
  className?: string;
}

export function PromptSuggestionList({
  children,
  className,
}: PromptSuggestionListProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 justify-center",
        className
      )}
      role="list"
      aria-label="Prompt suggestions"
    >
      {children}
    </div>
  );
}
