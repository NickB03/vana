import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { AlertTriangle } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";

interface RateLimitWarningToastProps {
  remaining: number;
  total: number;
  resetTime: number | string;
  isGuest: boolean;
  onDismiss?: () => void;
}

const TOAST_STORAGE_KEY = "rate_limit_warning_dismissed";

/**
 * Displays a subtle warning toast when approaching rate limits
 * - Guest users: 75% threshold (15/20 messages)
 * - Authenticated users: 90% threshold (90/100 messages)
 * - Dismissible with localStorage persistence per session
 */
export const RateLimitWarningToast = ({
  remaining,
  total,
  resetTime,
  isGuest,
  onDismiss,
}: RateLimitWarningToastProps) => {
  const { toast } = useToast();
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if already dismissed for this session
    const dismissed = sessionStorage.getItem(TOAST_STORAGE_KEY);
    if (dismissed || hasShown) return;

    // Calculate threshold
    const guestThreshold = 0.75; // 75% for guests (15/20)
    const authThreshold = 0.90; // 90% for authenticated (90/100)
    const threshold = isGuest ? guestThreshold : authThreshold;
    
    const used = total - remaining;
    const percentageUsed = used / total;

    // Show warning if at or above threshold
    if (percentageUsed >= threshold) {
      const title = isGuest 
        ? "Approaching Guest Limit" 
        : "Approaching Rate Limit";
      
      const description = (
        <div className="space-y-2">
          <p>
            {remaining} {remaining === 1 ? "message" : "messages"} remaining out of {total}
          </p>
          <CountdownTimer 
            resetTime={resetTime} 
            showIcon={true}
            className="text-sm"
          />
          {isGuest && (
            <p className="text-xs opacity-90">
              Sign in for 100 messages per 5 hours
            </p>
          )}
        </div>
      );

      toast({
        title,
        description,
        variant: "default",
        duration: 10000, // 10 seconds
        action: (
          <ToastAction 
            altText="Dismiss" 
            onClick={() => {
              sessionStorage.setItem(TOAST_STORAGE_KEY, "true");
              onDismiss?.();
            }}
          >
            Dismiss
          </ToastAction>
        ),
      });

      setHasShown(true);
    }
  }, [remaining, total, resetTime, isGuest, hasShown, toast, onDismiss]);

  return null; // This component doesn't render anything directly
};

/**
 * Hook to show rate limit warning toast
 * Usage: useRateLimitWarning({ remaining, total, resetTime, isGuest })
 */
export const useRateLimitWarning = (props: RateLimitWarningToastProps) => {
  return <RateLimitWarningToast {...props} />;
};

