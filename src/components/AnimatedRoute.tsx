/**
 * AnimatedRoute Component
 *
 * Reusable wrapper for route-level page transitions.
 * Provides consistent fade + vertical slide animation for all page changes.
 *
 * Usage:
 * <Route path="/" element={<AnimatedRoute><Index /></AnimatedRoute>} />
 */

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { fadeInUp, ANIMATION_DURATIONS, ANIMATION_EASINGS } from "@/utils/animationConstants";

interface AnimatedRouteProps {
  children: ReactNode;
}

/**
 * AnimatedRoute wraps page components with entrance/exit animations
 * - Fade in from bottom on entry (opacity: 0→1, y: 20→0)
 * - Fade out to top on exit (opacity: 1→0, y: 0→-20)
 * - Duration: 300ms with easeInOut for smooth acceleration/deceleration
 */
export function AnimatedRoute({ children }: AnimatedRouteProps) {
  return (
    <motion.div
      {...fadeInUp}
      transition={{
        duration: ANIMATION_DURATIONS.moderate,
        ease: ANIMATION_EASINGS.easeInOut
      }}
    >
      {children}
    </motion.div>
  );
}
