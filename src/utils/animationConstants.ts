/**
 * Animation Constants
 *
 * Centralized animation configuration for consistent timing and behavior
 * across the application. All animations should use these constants to
 * ensure a cohesive user experience.
 */

/**
 * Standard animation durations in seconds (for Motion/React)
 * - fast: Micro-interactions like hover states
 * - normal: Standard transitions like focus states
 * - moderate: Route transitions and page elements
 * - slow: Staggered animations and hero content
 */
export const ANIMATION_DURATIONS = {
  fast: 0.15,      // 150ms
  normal: 0.2,     // 200ms
  moderate: 0.3,   // 300ms
  slow: 0.5,       // 500ms
} as const;

/**
 * Standard easing functions for natural motion
 * - easeIn: Accelerating from zero velocity
 * - easeOut: Decelerating to zero velocity (most common)
 * - easeInOut: Accelerating and decelerating (route transitions)
 */
export const ANIMATION_EASINGS = {
  easeIn: 'easeIn',
  easeOut: 'easeOut',
  easeInOut: 'easeInOut',
} as const;

/**
 * Common animation variants for reuse across components
 */

/**
 * Fade in with upward slide animation
 * Used for: Route transitions, page elements
 */
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

/**
 * Scale in with fade animation
 * Used for: Chat messages, modal entrances
 */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: { opacity: 1, scale: 1, y: 0 },
};

/**
 * Stagger container for coordinated child animations
 * Used for: Hero sections, feature lists, card grids
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,  // 80ms delay between each child (optimized from 100ms)
      delayChildren: 0.1,     // 100ms delay before first child (optimized from 200ms)
    },
  },
};

/**
 * Stagger item animation (child of staggerContainer)
 * Used with: staggerContainer parent
 */
export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: ANIMATION_DURATIONS.slow,
      ease: ANIMATION_EASINGS.easeOut
    },
  },
};

/**
 * Hover lift effect for interactive cards
 * Used for: Showcase cards, feature cards, interactive elements
 */
export const hoverLift = {
  whileHover: { y: -8, scale: 1.02 },
  transition: {
    duration: ANIMATION_DURATIONS.moderate,
    ease: ANIMATION_EASINGS.easeOut
  },
};



/**
 * Scroll-triggered fade in animation
 * Used for: Landing page sections that should animate into view on scroll
 */
export const scrollFadeIn = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 }, // Trigger when 30% visible, only once
  transition: {
    duration: ANIMATION_DURATIONS.slow,
    ease: ANIMATION_EASINGS.easeOut,
  },
};

/**
 * Scroll-triggered stagger container
 * Used for: Groups of items that should stagger in on scroll
 */
export const scrollStaggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1 },
  viewport: { once: true, amount: 0.2 },
  transition: {
    staggerChildren: 0.1,
    delayChildren: 0.2,
  },
};

/**
 * Scroll-triggered stagger item (child of scrollStaggerContainer)
 */
export const scrollStaggerItem = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  transition: {
    duration: ANIMATION_DURATIONS.moderate,
    ease: ANIMATION_EASINGS.easeOut,
  },
};

/**
 * Tailwind CSS duration classes mapping
 * Use these class names in Tailwind for consistency with Motion animations
 */
export const TAILWIND_DURATIONS = {
  fast: 'duration-150',
  normal: 'duration-200',
  moderate: 'duration-300',
  slow: 'duration-500',
} as const;
