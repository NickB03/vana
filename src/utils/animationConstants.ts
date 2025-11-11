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
      staggerChildren: 0.1,  // 100ms delay between each child
      delayChildren: 0.2,    // 200ms delay before first child
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
 * Landing to app transition variants - Enhanced Cinematic Depth-of-Field Effect
 * Used for: Scroll-triggered page transformation with premium visual polish
 *
 * Design Philosophy:
 * - Dramatic depth perception through enhanced blur and scale
 * - Smooth timed animations (800ms) instead of instant scroll-driven updates
 * - Backdrop darkening creates professional "transition moment"
 * - Extended travel distance for more noticeable transformation
 */
export const landingTransition = {
  landing: {
    fadeOut: {
      initial: { opacity: 1, y: 0, scale: 1 },
      transitioning: (progress: number) => ({
        opacity: 1 - progress,
        y: -100 * progress, // Doubled from 50px for more dramatic movement
        scale: 1 - 0.1 * progress, // Doubled from 0.05 for deeper zoom-out effect
      }),
      complete: { opacity: 0, y: -100, scale: 0.9 },
    },
    blurOut: {
      initial: { filter: 'blur(0px)' },
      transitioning: (progress: number) => ({
        filter: `blur(${20 * progress}px)`, // Doubled from 10px for stronger depth-of-field
      }),
      complete: { filter: 'blur(20px)' },
    },
  },
  app: {
    fadeIn: {
      initial: { opacity: 0, y: 100, scale: 0.9 }, // Start farther back for "emerging" effect
      transitioning: (progress: number) => ({
        opacity: progress,
        y: 100 - 100 * progress, // Doubled travel distance
        scale: 0.9 + 0.1 * progress, // Doubled scale change
      }),
      complete: { opacity: 1, y: 0, scale: 1 },
    },
  },
  // Backdrop overlay creates dramatic "moment of transition"
  backdrop: {
    initial: { opacity: 0 },
    transitioning: (progress: number) => {
      // Fade in to peak at 50% progress, then fade out
      const peakProgress = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
      return { opacity: peakProgress * 0.4 }; // Max 40% darkness
    },
    complete: { opacity: 0 },
  },
};

/**
 * Reduced motion variants (respects prefers-reduced-motion)
 * Gentle crossfade with minimal movement, no blur effects
 */
export const landingTransitionReduced = {
  landing: {
    fadeOut: {
      initial: { opacity: 1 },
      transitioning: (progress: number) => ({ opacity: 1 - progress }),
      complete: { opacity: 0 },
    },
  },
  app: {
    fadeIn: {
      initial: { opacity: 0 },
      transitioning: (progress: number) => ({ opacity: progress }),
      complete: { opacity: 1 },
    },
  },
  backdrop: {
    initial: { opacity: 0 },
    transitioning: () => ({ opacity: 0 }), // No backdrop for reduced motion
    complete: { opacity: 0 },
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
