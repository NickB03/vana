import { RateLimitWarningToast, type RateLimitWarningToastProps } from "@/components/RateLimitWarningToast";

/**
 * Hook to show rate limit warning toast
 * Usage: useRateLimitWarning({ remaining, total, resetTime, isGuest })
 */
export const useRateLimitWarning = (props: RateLimitWarningToastProps) => {
  return <RateLimitWarningToast {...props} />;
};
