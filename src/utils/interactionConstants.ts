import { cn } from "@/lib/utils";

/**
 * Interaction Constants
 *
 * Standardized hover, focus, and active states for interactive elements.
 * These constants ensure consistent feedback across the application.
 */

/**
 * Button interaction states
 * Provides scale, shadow, and ring effects for buttons
 */
export const BUTTON_STATES = {
  /** Default button interactions with scale and shadow */
  default: cn(
    "transition-all duration-200",
    "hover:scale-105 hover:shadow-lg motion-safe:hover:scale-105",
    "active:scale-95 motion-safe:active:scale-95",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed"
  ),

  /** Subtle button interactions with background change only */
  subtle: cn(
    "transition-colors duration-200",
    "hover:bg-accent hover:text-accent-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
  ),

  /** Ghost button interactions (minimal visual change) */
  ghost: cn(
    "transition-colors duration-150",
    "hover:bg-accent/50",
    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
  ),
} as const;

/**
 * Card interaction states
 * Provides lift effect and shadow for clickable cards
 */
export const CARD_STATES = {
  /** Interactive card with lift effect */
  interactive: cn(
    "cursor-pointer transition-all duration-300 transform-gpu",
    "hover:shadow-xl hover:-translate-y-1 motion-safe:hover:-translate-y-1",
    "active:translate-y-0 motion-safe:active:translate-y-0",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "focus-visible:outline-none"
  ),

  /** Subtle card interaction (shadow only) */
  subtle: cn(
    "cursor-pointer transition-shadow duration-200",
    "hover:shadow-md",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  ),
} as const;

/**
 * Link interaction states
 * Provides underline and color change for links
 */
export const LINK_STATES = {
  /** Default link interactions */
  default: cn(
    "transition-colors duration-200",
    "hover:text-primary hover:underline",
    "focus-visible:outline-none focus-visible:underline focus-visible:decoration-2 focus-visible:text-primary"
  ),

  /** Subtle link (color change only) */
  subtle: cn(
    "transition-colors duration-150",
    "hover:text-primary",
    "focus-visible:outline-none focus-visible:text-primary"
  ),
} as const;

/**
 * Input/Textarea interaction states
 * Provides border and ring effects for form inputs
 */
export const INPUT_STATES = {
  default: cn(
    "transition-all duration-200",
    "focus:ring-2 focus:ring-ring focus:ring-offset-0",
    "focus:border-primary",
    "disabled:opacity-50 disabled:cursor-not-allowed"
  ),
} as const;

/**
 * Helper function to combine interaction states with custom classes
 */
export const withInteraction = (state: string, customClasses?: string): string => {
  return cn(state, customClasses);
};
