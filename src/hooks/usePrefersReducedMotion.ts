import { useEffect, useState } from 'react';

/**
 * React hook that detects and subscribes to changes in the user's motion preference.
 *
 * Returns `true` if the user prefers reduced motion (for accessibility).
 * Automatically updates when the system preference changes.
 *
 * @example
 * ```tsx
 * import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
 * import { motion } from 'motion/react';
 *
 * function MyComponent() {
 *   const prefersReducedMotion = usePrefersReducedMotion();
 *
 *   return (
 *     <motion.div
 *       animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
 *       initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
 *     >
 *       Content
 *     </motion.div>
 *   );
 * }
 * ```
 *
 * @returns {boolean} True if user prefers reduced motion, false otherwise
 */
export function usePrefersReducedMotion(): boolean {
  // Initialize with SSR-safe check
  const [prefersReduced, setPrefersReduced] = useState(() => {
    // During SSR, default to false (animations enabled)
    if (typeof window === 'undefined') return false;

    // Check initial preference
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    // Skip during SSR
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Handler for preference changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    // Subscribe to changes
    // Note: Use addEventListener for better browser support
    mediaQuery.addEventListener('change', handleChange);

    // Cleanup subscription on unmount
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []); // Empty dependency array - set up once on mount

  return prefersReduced;
}
