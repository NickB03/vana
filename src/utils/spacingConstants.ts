/**
 * Spacing Constants
 *
 * Centralized spacing system for consistent layout across the application.
 * Based on 4px base unit with multipliers for different use cases.
 *
 * Usage:
 * - Import constants and apply to className
 * - Use semantic names (section, container, component) for clarity
 * - Mobile-first approach with responsive overrides
 */

/**
 * Section-level spacing (top-level page sections)
 * Large breathing room between major sections
 */
export const SECTION_SPACING = {
  mobile: 'px-4 py-16',
  desktop: 'md:px-6 md:py-24',
  full: 'px-4 py-16 md:px-6 md:py-24',
} as const;

/**
 * Container-level spacing (cards, panels, major groupings)
 * Medium spacing for content containers
 */
export const CONTAINER_SPACING = {
  mobile: 'px-4 py-6',
  desktop: 'md:px-6 md:py-8',
  full: 'px-4 py-6 md:px-6 md:py-8',
} as const;

/**
 * Component-level spacing (buttons, inputs, small components)
 * Tight spacing for interactive elements
 */
export const COMPONENT_SPACING = {
  mobile: 'px-3 py-3',
  desktop: 'md:px-5 md:py-5',
  full: 'px-3 py-3 md:px-5 md:py-5',
} as const;

/**
 * Chat-specific spacing (message bubbles, chat containers)
 * Optimized for conversation flow
 */
export const CHAT_SPACING = {
  message: {
    container: 'px-6 py-3',
    bubble: 'px-5 py-2.5',
  },
  input: {
    container: 'px-3 pb-3 md:px-5 md:pb-5',
    textarea: 'pl-4 pt-3',
  },
  messageList: 'px-5 py-12',
} as const;

/**
 * Safe area spacing (for mobile notches, bottom bars)
 * Ensures content doesn't get clipped by device UI
 */
export const SAFE_AREA_SPACING = {
  bottom: 'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
  top: 'pt-[max(0.75rem,env(safe-area-inset-top))]',
  left: 'pl-[max(1rem,env(safe-area-inset-left))]',
  right: 'pr-[max(1rem,env(safe-area-inset-right))]',
} as const;

/**
 * Gap spacing for flex/grid layouts
 * Consistent gaps between child elements
 */
export const GAP_SPACING = {
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
} as const;

/**
 * Helper function to combine multiple spacing values
 */
export const combineSpacing = (...spacings: string[]): string => {
  return spacings.join(' ');
};
