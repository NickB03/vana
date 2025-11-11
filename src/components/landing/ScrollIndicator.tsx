import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface ScrollIndicatorProps {
  /** Whether to show the indicator */
  visible?: boolean;
  /** Callback when indicator is clicked */
  onClick?: () => void;
  /** Custom className */
  className?: string;
}

/**
 * ScrollIndicator - Enhanced animated scroll hint with text
 *
 * Features:
 * - Prominent bounce animation to catch attention
 * - "Scroll to explore" text for clarity
 * - Minimal design that doesn't distract
 * - Respects prefers-reduced-motion
 * - Auto-hides when scroll transition starts
 * - Accessible click target for smooth scroll
 */
export const ScrollIndicator = ({ visible = true, onClick, className }: ScrollIndicatorProps) => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!visible) return null;

  return (
    <motion.div
      className={cn(
        "fixed bottom-16 left-1/2 -translate-x-1/2 z-30",
        "pointer-events-auto cursor-pointer",
        "flex flex-col items-center gap-2",
        className
      )}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: [0, 1, 1],
        y: [10, 0, 0],
      }}
      transition={{
        duration: 0.8,
        delay: 0.8, // Appears after 0.8 seconds
        ease: "easeOut",
      }}
      role="button"
      tabIndex={0}
      aria-label="Scroll to explore"
      style={{ willChange: 'transform, opacity' }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Text hint */}
      <motion.span
        className="text-white/80 text-sm font-medium"
        animate={
          prefersReducedMotion
            ? {}
            : {
                opacity: [0.8, 0.5, 0.8],
              }
        }
        transition={{
          duration: 2,
          delay: 1.3,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
      >
        Scroll to explore
      </motion.span>

      {/* Enhanced bounce arrow */}
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white/90"
        style={{ willChange: prefersReducedMotion ? 'auto' : 'transform' }}
        animate={
          prefersReducedMotion
            ? {}
            : {
                y: [0, 12, 0],
                scale: [1, 0.95, 1],
              }
        }
        transition={{
          duration: 1.5,
          delay: 1.3,
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
      >
        {/* Arrow with glow effect */}
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M24 10L24 36M24 36L14 26M24 36L34 26"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#glow)"
        />
        {/* Decorative circle background */}
        <circle
          cx="24"
          cy="24"
          r="22"
          stroke="currentColor"
          strokeWidth="1"
          fill="none"
          opacity="0.2"
        />
      </motion.svg>
    </motion.div>
  );
};
