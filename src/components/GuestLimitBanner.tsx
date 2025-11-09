import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Gift, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { CountdownTimer } from "@/components/CountdownTimer";

interface GuestLimitBannerProps {
  messageCount: number;
  maxMessages: number;
  resetTime?: number | null; // Unix timestamp when limit resets
  className?: string;
}

/**
 * Displays message count for guest users
 * Shows banner at 75% threshold (15/20 messages)
 * Displays countdown timer and updated messaging (20 messages/5 hours)
 */
export const GuestLimitBanner = ({
  messageCount,
  maxMessages,
  resetTime,
  className = "",
}: GuestLimitBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const remaining = maxMessages - messageCount;
  const percentage = (messageCount / maxMessages) * 100;
  const WARNING_THRESHOLD = 0.75; // Show at 75% (15/20 messages)

  // Show banner when user reaches warning threshold (75%)
  const shouldShow = messageCount >= Math.floor(maxMessages * WARNING_THRESHOLD) && !isDismissed;

  // Determine variant based on remaining messages
  const getVariant = () => {
    if (remaining === 0) return "error";
    if (remaining <= 5) return "warning"; // Warning when 5 or fewer remaining
    return "info";
  };

  const variant = getVariant();

  const variantStyles = {
    info: "bg-blue-500/10 border-blue-500/20 text-blue-200",
    warning: "bg-orange-500/10 border-orange-500/20 text-orange-200",
    error: "bg-red-500/10 border-red-500/20 text-red-200",
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`relative border rounded-lg p-3 ${variantStyles[variant]} ${className}`}
          role="status"
          aria-live="polite"
        >
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 rounded-b-lg overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 pb-1">
            {/* Left: Icon + Message */}
            <div className="flex items-center gap-3">
              <Gift className="h-5 w-5 flex-shrink-0" />
              <div className="flex flex-col gap-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="text-sm font-medium">
                    Guest Mode: {remaining}/{maxMessages} messages remaining
                  </span>
                  <span className="hidden sm:inline text-xs opacity-70">•</span>
                  <span className="text-xs opacity-90">Sign in for 100 messages/5h</span>
                </div>
                {resetTime && (
                  <CountdownTimer
                    resetTime={resetTime}
                    showIcon={false}
                    className="text-xs opacity-80"
                  />
                )}
              </div>
            </div>

            {/* Right: CTA + Dismiss */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs hover:bg-white/10"
                asChild
              >
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 hover:bg-white/10"
                onClick={() => setIsDismissed(true)}
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
