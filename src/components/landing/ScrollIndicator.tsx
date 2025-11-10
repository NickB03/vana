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
 * ScrollIndicator - Minimal animated scroll hint
 *
 * Features:
 * - Subtle mouse icon with animated scroll wheel
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
        className
      )}
      onClick={onClick}
      initial={{ opacity: 0 }}
      animate={{
        opacity: [0.5, 0.3, 0.5],
      }}
      transition={{
        opacity: {
          duration: 2,
          delay: 5, // Wait 5 seconds before first appearance
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        },
      }}
      aria-hidden="true"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Simple down arrow */}
      <motion.svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-white/70"
        animate={
          prefersReducedMotion
            ? {}
            : {
                y: [0, 8, 0],
                opacity: [0.7, 0.5, 0.7],
              }
        }
        transition={{
          duration: 2,
          delay: 5, // Wait 5 seconds before animation starts
          repeat: Infinity,
          repeatType: "loop",
          ease: "easeInOut",
        }}
      >
        <path
          d="M24 10L24 36M24 36L14 26M24 36L34 26"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
};
