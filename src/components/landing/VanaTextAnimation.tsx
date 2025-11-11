import { motion } from "motion/react";
import { TYPOGRAPHY } from "@/utils/typographyConstants";
import { cn } from "@/lib/utils";

/**
 * Animated text component with character-by-character reveal
 *
 * Features:
 * - Character-by-character fade and scale animation
 * - Spring physics for natural bounce effect
 * - Gradient text styling for highlighted portion
 * - Customizable delay and stagger timing
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
  /** Text to animate with gradient (character-by-character reveal) */
  highlight: string;
  /** Optional CSS classes */
  className?: string;
  /** Delay before animation starts (ms) */
  initialDelay?: number;
  /** Delay between each character (ms) */
  staggerDelay?: number;
}

export const VanaTextAnimation = ({
  prefix = "",
  highlight,
  className = "",
  initialDelay = 300,
  staggerDelay = 50,
}: VanaTextAnimationProps) => {
  // Split highlighted text into individual characters
  const characters = highlight.split("");

  return (
    <h1 className={cn(TYPOGRAPHY.DISPLAY.xl.full, "font-bold", className)}>
      {/* Prefix appears instantly */}
      {prefix && (
        <span className="text-white/90">
          {prefix}
        </span>
      )}

      {/* Animated characters with gradient */}
      <span className="inline-block">
        {characters.map((char, index) => (
          <motion.span
            key={`${char}-${index}`}
            className="inline-block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent"
            initial={{
              opacity: 0,
              scale: 0.8,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: initialDelay / 1000 + (index * staggerDelay) / 1000,
            }}
            style={{
              display: "inline-block",
              // Preserve spaces
              whiteSpace: char === " " ? "pre" : "normal",
            }}
          >
            {char}
          </motion.span>
        ))}
      </span>
    </h1>
  );
};

export default VanaTextAnimation;
