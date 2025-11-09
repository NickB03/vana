import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const MAX_USER_MESSAGES = 100;
const SESSION_DURATION_HOURS = 5;
const WARNING_THRESHOLD = 0.90; // Show warning at 90% (90/100 messages)

export interface UserRateLimitInfo {
  total: number;
  remaining: number;
  used: number;
  resetAt: string; // ISO timestamp
  showWarning: boolean;
  hasReachedLimit: boolean;
}

interface UseAuthUserRateLimitReturn {
  rateLimitInfo: UserRateLimitInfo | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches and tracks rate limit status for authenticated users
 * Polls server for current rate limit status (100 messages per 5 hours)
 * Shows warning at 90% threshold (90/100 messages)
 */
export const useAuthUserRateLimit = (
  userId: string | undefined,
  enabled: boolean = true
): UseAuthUserRateLimitReturn => {
  const [rateLimitInfo, setRateLimitInfo] = useState<UserRateLimitInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch rate limit status from server
   */
  const fetchRateLimitStatus = useCallback(async () => {
    if (!userId || !enabled) {
      setRateLimitInfo(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc("get_user_rate_limit_status", {
        p_user_id: userId,
        p_max_requests: MAX_USER_MESSAGES,
        p_window_hours: SESSION_DURATION_HOURS,
      });

      if (rpcError) {
        throw new Error(`Failed to fetch rate limit status: ${rpcError.message}`);
      }

      if (data) {
        const showWarning = data.used >= Math.floor(MAX_USER_MESSAGES * WARNING_THRESHOLD);
        const hasReachedLimit = data.remaining <= 0;

        setRateLimitInfo({
          total: data.total,
          remaining: data.remaining,
          used: data.used,
          resetAt: data.reset_at,
          showWarning,
          hasReachedLimit,
        });
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error("Error fetching user rate limit status:", errorObj);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  /**
   * Initial fetch and periodic refresh
   */
  useEffect(() => {
    if (!userId || !enabled) {
      setRateLimitInfo(null);
      return;
    }

    // Initial fetch
    fetchRateLimitStatus();

    // Refresh every 30 seconds to keep status current
    const intervalId = setInterval(fetchRateLimitStatus, 30000);

    return () => clearInterval(intervalId);
  }, [userId, enabled, fetchRateLimitStatus]);

  return {
    rateLimitInfo,
    isLoading,
    error,
    refetch: fetchRateLimitStatus,
  };
};

