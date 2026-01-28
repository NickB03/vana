import { motion } from "motion/react";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";

/**
 * Animated text component with optimized word-level reveal
 *
 * Features:
 * - Smooth fade and scale animation (optimized for performance)
 * - Gradient text styling for highlighted portion
 * - Customizable delay timing
 * - Reduced animation overhead compared to character-by-character
 *
 * @example
 * <VanaTextAnimation
 *   prefix="Hi, I'm "
 *   highlight="Vana"
 *   className="text-6xl"
 * />
 */

interface VanaTextAnimationProps {
  /** Text before the highlighted portion (appears instantly) */
  prefix?: string;
  /** Text to animate with gradient (word-level reveal for better performance) */
  highlight: string;
  /** Optional CSS classes */
  className?: string;
  /** Delay before animation starts (ms) */
  initialDelay?: number;
}

export const VanaTextAnimation = ({
  prefix = "",
  highlight,
  className = "",
  initialDelay = 300,
}: VanaTextAnimationProps) => {
  return (
    <h1 className={cn(TYPOGRAPHY.DISPLAY.xl.full, "font-bold", className)}>
      {/* Prefix appears instantly */}
      {prefix && (
        <span className="text-white/90">
          {prefix}
        </span>
      )}

      {/* Optimized word-level animation (reduces overhead from 4 motion components to 1) */}
      <motion.span
        className="inline-block text-white"
        initial={{
          opacity: 0,
          scale: 0.95,
          y: 10,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
          ease: "easeOut",
          delay: initialDelay / 1000,
        }}
      >
        {highlight}
      </motion.span>
    </h1>
  );
};

export default VanaTextAnimation;
