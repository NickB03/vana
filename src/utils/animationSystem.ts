/**
 * Unified Animation System
 *
 * Central source of truth for all animations across the application.
 * Provides consistent timing, easing, and animation patterns for:
 * - Tailwind CSS transitions
 * - Motion/React (Framer Motion) animations
 * - Custom CSS keyframes
 *
 * @example Tailwind usage:
 * ```tsx
 * <div className={`transition-all ${ANIMATION_CLASSES.duration.normal} ${ANIMATION_CLASSES.easing.standard}`}>
 * ```
 *
 * @example Motion usage:
 * ```tsx
 * <motion.div {...MOTION_VARIANTS.fadeIn} transition={MOTION_TRANSITIONS.normal}>
 * ```
 */

// ============================================================================
// CORE CONSTANTS
// ============================================================================

/**
 * Standard animation durations in milliseconds
 * Based on Material Design motion principles
 */
export const DURATION = {
  /** 0ms - Instant, no animation */
  instant: 0,
  /** 150ms - Micro-interactions (hover, focus states) */
  fast: 150,
  /** 200ms - Standard UI transitions (dropdowns, tooltips) */
  normal: 200,
  /** 300ms - Page/route transitions, modal open/close */
  moderate: 300,
  /** 500ms - Hero content, staggered animations */
  slow: 500,
} as const;

/**
 * Standard easing curves for natural motion
 * @see https://material.io/design/motion/speed.html#easing
 */
export const EASING = {
  /** Standard curve - Most common, balanced acceleration/deceleration */
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Decelerate (ease-out) - Elements entering the screen */
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Accelerate (ease-in) - Elements leaving the screen */
  accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Sharp - Quick, decisive movements */
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

/**
 * Consistent translate/movement distances (in pixels)
 */
export const TRANSLATE = {
  /** 8px - Subtle movements (micro-interactions) */
  sm: 8,
  /** 12px - Standard movements (dropdowns, tooltips) */
  md: 12,
  /** 20px - Large movements (page transitions) */
  lg: 20,
  /** 40px - Scroll-triggered animations */
  xl: 40,
} as const;

// ============================================================================
// TAILWIND CSS CLASSES
// ============================================================================

/**
 * Pre-composed Tailwind classes for common animation patterns
 * Use these for consistency across CSS-based transitions
 */
export const ANIMATION_CLASSES = {
  duration: {
    instant: 'duration-0',
    fast: 'duration-150',
    normal: 'duration-200',
    moderate: 'duration-300',
    slow: 'duration-500',
  },
  easing: {
    standard: 'ease-[cubic-bezier(0.4,0,0.2,1)]',
    decelerate: 'ease-out',
    accelerate: 'ease-in',
    sharp: 'ease-[cubic-bezier(0.4,0,0.6,1)]',
  },
  /** Common transition property combinations */
  properties: {
    all: 'transition-all',
    transform: 'transition-transform',
    opacity: 'transition-opacity',
    colors: 'transition-colors',
    widthHeight: 'transition-[width,height]',
    transformOpacity: 'transition-[transform,opacity]',
  },
} as const;

/**
 * Complete pre-composed transition classes
 * @example `<div className={TRANSITIONS.normal}>`
 */
export const TRANSITIONS = {
  /** Fast all-property transition (150ms, standard easing) */
  fast: `${ANIMATION_CLASSES.properties.all} ${ANIMATION_CLASSES.duration.fast} ${ANIMATION_CLASSES.easing.standard}`,
  /** Normal all-property transition (200ms, standard easing) */
  normal: `${ANIMATION_CLASSES.properties.all} ${ANIMATION_CLASSES.duration.normal} ${ANIMATION_CLASSES.easing.standard}`,
  /** Moderate all-property transition (300ms, standard easing) */
  moderate: `${ANIMATION_CLASSES.properties.all} ${ANIMATION_CLASSES.duration.moderate} ${ANIMATION_CLASSES.easing.standard}`,
  /** Slow all-property transition (500ms, standard easing) */
  slow: `${ANIMATION_CLASSES.properties.all} ${ANIMATION_CLASSES.duration.slow} ${ANIMATION_CLASSES.easing.standard}`,

  /** Transform-only transitions for performance */
  transform: {
    fast: `${ANIMATION_CLASSES.properties.transform} ${ANIMATION_CLASSES.duration.fast} ${ANIMATION_CLASSES.easing.decelerate}`,
    normal: `${ANIMATION_CLASSES.properties.transform} ${ANIMATION_CLASSES.duration.normal} ${ANIMATION_CLASSES.easing.decelerate}`,
  },

  /** Opacity-only transitions */
  opacity: {
    fast: `${ANIMATION_CLASSES.properties.opacity} ${ANIMATION_CLASSES.duration.fast} ${ANIMATION_CLASSES.easing.standard}`,
    normal: `${ANIMATION_CLASSES.properties.opacity} ${ANIMATION_CLASSES.duration.normal} ${ANIMATION_CLASSES.easing.standard}`,
  },
} as const;

// ============================================================================
// MOTION/REACT (FRAMER MOTION) VARIANTS
// ============================================================================

/**
 * Motion transition configurations matching our duration/easing constants
 */
export const MOTION_TRANSITIONS = {
  fast: {
    duration: DURATION.fast / 1000,  // Convert to seconds
    ease: [0.4, 0, 0.2, 1],          // Standard easing as array
  },
  normal: {
    duration: DURATION.normal / 1000,
    ease: [0.4, 0, 0.2, 1],
  },
  moderate: {
    duration: DURATION.moderate / 1000,
    ease: [0.4, 0, 0.2, 1],
  },
  slow: {
    duration: DURATION.slow / 1000,
    ease: [0.4, 0, 0.2, 1],
  },
} as const;

/**
 * Common Motion animation variants
 * Use with <motion.div> components
 */
export const MOTION_VARIANTS = {
  /** Fade in with upward slide (page transitions) */
  fadeIn: {
    initial: { opacity: 0, y: TRANSLATE.lg },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -TRANSLATE.lg },
  },

  /** Fade in with left slide */
  fadeInLeft: {
    initial: { opacity: 0, x: -TRANSLATE.md },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: TRANSLATE.md },
  },

  /** Scale in with fade (modals, artifacts) */
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },

  /** Scale in with subtle slide (chat messages) */
  messageIn: {
    initial: { opacity: 0, scale: 0.98, y: TRANSLATE.sm },
    animate: { opacity: 1, scale: 1, y: 0 },
  },

  /** Slide in from bottom (mobile sheets) */
  slideUp: {
    initial: { opacity: 0, y: '100%' },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: '100%' },
  },

  /** Backdrop fade */
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
} as const;

/**
 * Stagger container configuration for sequential animations
 */
export const MOTION_STAGGER = {
  /** Default stagger for lists/grids */
  default: {
    staggerChildren: 0.08,  // 80ms between each child
    delayChildren: 0.1,     // 100ms before first child
  },
  /** Fast stagger for short lists */
  fast: {
    staggerChildren: 0.05,
    delayChildren: 0.05,
  },
  /** Slow stagger for hero sections */
  slow: {
    staggerChildren: 0.12,
    delayChildren: 0.2,
  },
} as const;

/**
 * Complete stagger container variant
 */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: MOTION_STAGGER.default,
  },
} as const;

/**
 * Stagger item variant (child of staggerContainer)
 */
export const staggerItem = {
  hidden: { opacity: 0, y: TRANSLATE.lg },
  visible: {
    opacity: 1,
    y: 0,
    transition: MOTION_TRANSITIONS.slow,
  },
} as const;

// ============================================================================
// SPECIFIC USE CASES
// ============================================================================

/**
 * Sidebar animation configuration
 */
export const SIDEBAR_ANIMATION = {
  /** Desktop sidebar slide transition */
  desktop: {
    className: `transition-[left,right,width,transform] ${ANIMATION_CLASSES.duration.normal} ${ANIMATION_CLASSES.easing.standard}`,
    duration: DURATION.normal,
  },
  /** Mobile sidebar sheet transition */
  mobile: {
    ...MOTION_VARIANTS.slideUp,
    transition: MOTION_TRANSITIONS.normal,
  },
} as const;

/**
 * Route/page transition configuration
 */
export const ROUTE_ANIMATION = {
  variant: MOTION_VARIANTS.fadeIn,
  transition: MOTION_TRANSITIONS.moderate,
} as const;

/**
 * Artifact animation configuration
 */
export const ARTIFACT_ANIMATION = {
  variant: MOTION_VARIANTS.scaleIn,
  transition: MOTION_TRANSITIONS.normal,
} as const;

/**
 * Message animation configuration
 * IMPORTANT: Only animate NEW messages, not entire chat history
 */
export const MESSAGE_ANIMATION = {
  variant: MOTION_VARIANTS.messageIn,
  transition: MOTION_TRANSITIONS.fast,
  /** Helper to determine if message should animate */
  shouldAnimate: (isLastMessage: boolean, isStreaming: boolean) => {
    return isLastMessage && !isStreaming;
  },
} as const;

/**
 * Button/interactive element hover animations
 */
export const HOVER_ANIMATION = {
  /** Subtle lift on hover */
  lift: {
    whileHover: { y: -2, scale: 1.02 },
    transition: MOTION_TRANSITIONS.fast,
  },
  /** Scale up on hover */
  scale: {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: MOTION_TRANSITIONS.fast,
  },
} as const;

// ============================================================================
// ACCESSIBILITY
// ============================================================================

/**
 * Check if user prefers reduced motion (synchronous check)
 *
 * @deprecated Use the React hook `usePrefersReducedMotion` from '@/hooks/usePrefersReducedMotion' instead.
 * This function is kept for backwards compatibility but doesn't react to preference changes.
 *
 * @example
 * ```tsx
 * // OLD (deprecated):
 * const shouldAnimate = !prefersReducedMotion();
 *
 * // NEW (recommended):
 * import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
 * const prefersReduced = usePrefersReducedMotion();
 * const shouldAnimate = !prefersReduced;
 * ```
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation props with reduced motion support
 *
 * @deprecated This function performs synchronous checks and may cause hydration issues.
 * Use `usePrefersReducedMotion` hook instead for proper reactivity.
 *
 * @example
 * ```tsx
 * // OLD (deprecated):
 * <motion.div {...getAccessibleAnimation(MOTION_VARIANTS.fadeIn)}>
 *
 * // NEW (recommended):
 * import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
 *
 * function MyComponent() {
 *   const prefersReduced = usePrefersReducedMotion();
 *   const animationProps = prefersReduced ? {} : MOTION_VARIANTS.fadeIn;
 *   return <motion.div {...animationProps}>...</motion.div>;
 * }
 * ```
 */
export const getAccessibleAnimation = <T extends object>(variant: T): T | { initial: false; animate: false } => {
  if (prefersReducedMotion()) {
    return { initial: false, animate: false };
  }
  return variant;
};

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Backwards compatibility with existing animationConstants.ts
 * @deprecated Use DURATION, EASING, MOTION_VARIANTS instead
 */
export const ANIMATION_DURATIONS = {
  fast: DURATION.fast / 1000,
  normal: DURATION.normal / 1000,
  moderate: DURATION.moderate / 1000,
  slow: DURATION.slow / 1000,
} as const;

export const ANIMATION_EASINGS = {
  easeIn: 'easeIn' as const,
  easeOut: 'easeOut' as const,
  easeInOut: 'easeInOut' as const,
} as const;

/**
 * @deprecated Use MOTION_VARIANTS.fadeIn instead
 */
export const fadeInUp = MOTION_VARIANTS.fadeIn;

/**
 * @deprecated Use MOTION_VARIANTS.scaleIn instead
 */
export const scaleIn = MOTION_VARIANTS.scaleIn;

/**
 * @deprecated Use TAILWIND_DURATIONS from this file instead
 */
export const TAILWIND_DURATIONS = ANIMATION_CLASSES.duration;

/**
 * @deprecated Use MOTION_VARIANTS.hoverLift or HOVER_ANIMATION.lift instead
 */
export const hoverLift = HOVER_ANIMATION.lift;

/**
 * @deprecated Use scrollFadeIn from animationSystem or create custom scroll animations
 */
export const scrollFadeIn = {
  initial: { opacity: 0, y: TRANSLATE.xl },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: MOTION_TRANSITIONS.slow,
};

/**
 * @deprecated Use MOTION_STAGGER or create custom stagger containers
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
 * @deprecated Use staggerItem with whileInView or create custom
 */
export const scrollStaggerItem = {
  initial: { opacity: 0, y: TRANSLATE.lg + 10 }, // 30px to match old value
  whileInView: { opacity: 1, y: 0 },
  transition: MOTION_TRANSITIONS.moderate,
};
