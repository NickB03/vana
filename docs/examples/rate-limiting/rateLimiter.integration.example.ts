/**
 * Integration examples for rateLimiter utility
 *
 * This file demonstrates how to integrate the rate limiter
 * into various parts of the application.
 */

import { useToast } from "@/hooks/use-toast";
import {
  rateLimiter,
  checkRateLimit,
  formatTimeUntilReset,
  RATE_LIMITS,
} from "./rateLimiter";

/**
 * Example 1: Basic integration in useChatMessages hook
 *
 * Add rate limiting to the streamChat function to prevent API abuse.
 */
export function useChatMessagesExample() {
  const { toast } = useToast();

  const streamChat = async (
    userMessage: string,
    sessionId: string,
    userId: string
  ) => {
    // Check rate limit before processing
    const { allowed, status } = await checkRateLimit(userId, "chat_messages");

    if (!allowed) {
      const resetTime = formatTimeUntilReset(status.resetInMs);
      toast({
        title: "Rate limit exceeded",
        description: `You've sent ${status.limit} messages in the past hour. Please try again in ${resetTime}.`,
        variant: "destructive",
      });
      return;
    }

    // Show remaining requests for transparency
    if (status.remaining <= 5) {
      toast({
        title: "Approaching rate limit",
        description: `You have ${status.remaining} messages remaining in the next hour.`,
      });
    }

    // Continue with normal chat flow...
    // ... (rest of streamChat implementation)
  };

  return { streamChat };
}

/**
 * Example 2: Integration in artifact creation
 *
 * Rate limit artifact generation separately from regular messages.
 */
export async function createArtifact(
  userId: string,
  artifactData: any
): Promise<boolean> {
  const { toast } = useToast();

  // Check artifact-specific rate limit
  const allowed = await rateLimiter.checkLimit(
    userId,
    RATE_LIMITS.artifact_creation.limit,
    RATE_LIMITS.artifact_creation.window
  );

  if (!allowed) {
    const status = rateLimiter.getStatus(
      userId,
      RATE_LIMITS.artifact_creation.limit,
      RATE_LIMITS.artifact_creation.window
    );
    const resetTime = formatTimeUntilReset(status.resetInMs);

    toast({
      title: "Artifact creation limit reached",
      description: `You can create ${status.limit} artifacts per hour. Try again in ${resetTime}.`,
      variant: "destructive",
    });
    return false;
  }

  // Create artifact...
  return true;
}

/**
 * Example 3: Integration with file uploads
 *
 * Prevent excessive file uploads.
 */
export async function uploadFile(
  userId: string,
  file: File
): Promise<{ success: boolean; url?: string }> {
  const { toast } = useToast();

  // Check file upload rate limit
  const { allowed, status } = await checkRateLimit(userId, "file_upload");

  if (!allowed) {
    const resetTime = formatTimeUntilReset(status.resetInMs);
    toast({
      title: "Upload limit reached",
      description: `You can upload ${status.limit} files per hour. Try again in ${resetTime}.`,
      variant: "destructive",
    });
    return { success: false };
  }

  // Upload file...
  return { success: true, url: "https://..." };
}

/**
 * Example 4: React component with rate limit display
 *
 * Show user their current rate limit status.
 */
export function RateLimitStatus({ userId }: { userId: string }) {
  const status = rateLimiter.getStatus(
    userId,
    RATE_LIMITS.chat_messages.limit,
    RATE_LIMITS.chat_messages.window
  );

  const percentage = (status.used / status.limit) * 100;

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Message Usage</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Used: {status.used}</span>
          <span>Remaining: {status.remaining}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              percentage > 90
                ? "bg-red-500"
                : percentage > 75
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        {status.isLimited ? (
          <p className="text-sm text-red-600">
            Rate limit reached. Resets in{" "}
            {formatTimeUntilReset(status.resetInMs)}
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Resets in {formatTimeUntilReset(status.resetInMs)}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Example 5: Advanced usage with custom warning threshold
 *
 * Show warnings as user approaches rate limit.
 */
export async function sendMessageWithWarnings(
  userId: string,
  message: string
) {
  const { toast } = useToast();

  const { allowed, status } = await checkRateLimit(userId, "chat_messages");

  if (!allowed) {
    toast({
      title: "Rate limit exceeded",
      description: `Please wait ${formatTimeUntilReset(status.resetInMs)} before sending more messages.`,
      variant: "destructive",
    });
    return false;
  }

  // Warning at different thresholds
  const warningThresholds = [
    { threshold: 10, color: "yellow" },
    { threshold: 5, color: "orange" },
    { threshold: 1, color: "red" },
  ];

  for (const { threshold, color } of warningThresholds) {
    if (status.remaining === threshold) {
      toast({
        title: `${status.remaining} messages remaining`,
        description: `You're approaching the rate limit. Resets in ${formatTimeUntilReset(
          status.resetInMs
        )}.`,
        className: `border-${color}-500`,
      });
      break;
    }
  }

  // Send message...
  return true;
}

/**
 * Example 6: Debug panel for development
 *
 * Display rate limiter debug information during development.
 */
export function RateLimiterDebugPanel({ userId }: { userId: string }) {
  const debugInfo = rateLimiter.getDebugInfo(userId);
  const allDebugInfo = rateLimiter.getDebugInfo();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-black/90 text-white rounded-lg text-xs max-w-md">
      <h4 className="font-bold mb-2">Rate Limiter Debug</h4>
      <div className="space-y-1">
        <p>User ID: {userId}</p>
        <p>Request count: {debugInfo.count}</p>
        <p>Total users tracked: {allDebugInfo.totalUsers}</p>
        <details className="mt-2">
          <summary className="cursor-pointer">All users</summary>
          <pre className="mt-2 text-xs overflow-auto max-h-40">
            {JSON.stringify(allDebugInfo.users, null, 2)}
          </pre>
        </details>
        <button
          onClick={() => rateLimiter.reset(userId)}
          className="mt-2 px-2 py-1 bg-red-600 rounded text-xs"
        >
          Reset my limit
        </button>
      </div>
    </div>
  );
}

/**
 * Example 7: Middleware pattern for API calls
 *
 * Wrap API calls with rate limit checking.
 */
export function createRateLimitedApiCall<T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  userId: string,
  limitType: keyof typeof RATE_LIMITS
): T {
  return (async (...args: Parameters<T>) => {
    const { allowed, status } = await checkRateLimit(userId, limitType);

    if (!allowed) {
      throw new Error(
        `Rate limit exceeded. Try again in ${formatTimeUntilReset(status.resetInMs)}`
      );
    }

    return apiCall(...args);
  }) as T;
}

// Usage:
// const rateLimitedChatCall = createRateLimitedApiCall(
//   originalChatFunction,
//   userId,
//   "chat_messages"
// );

/**
 * Example 8: React hook for rate limit status
 *
 * Custom hook to track and display rate limit status.
 */
export function useRateLimitStatus(userId: string, limitType: keyof typeof RATE_LIMITS) {
  const [status, setStatus] = React.useState(() =>
    rateLimiter.getStatus(
      userId,
      RATE_LIMITS[limitType].limit,
      RATE_LIMITS[limitType].window
    )
  );

  React.useEffect(() => {
    // Update status periodically
    const interval = setInterval(() => {
      setStatus(
        rateLimiter.getStatus(
          userId,
          RATE_LIMITS[limitType].limit,
          RATE_LIMITS[limitType].window
        )
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [userId, limitType]);

  const checkLimit = async () => {
    const { allowed, status: newStatus } = await checkRateLimit(userId, limitType);
    setStatus(newStatus);
    return allowed;
  };

  return {
    status,
    checkLimit,
    isLimited: status.isLimited,
    remaining: status.remaining,
    resetTime: formatTimeUntilReset(status.resetInMs),
  };
}

// Usage in component:
// const { status, checkLimit, isLimited, resetTime } = useRateLimitStatus(
//   session.user.id,
//   "chat_messages"
// );

/**
 * Example 9: Toast notifications helper
 *
 * Standardized toast messages for rate limiting.
 */
export function showRateLimitToast(
  toast: ReturnType<typeof useToast>["toast"],
  status: ReturnType<typeof rateLimiter.getStatus>,
  limitType: string
) {
  if (status.isLimited) {
    toast({
      title: "Rate limit exceeded",
      description: `You've reached the ${limitType} limit. Please try again in ${formatTimeUntilReset(
        status.resetInMs
      )}.`,
      variant: "destructive",
    });
  } else if (status.remaining <= 5) {
    toast({
      title: "Approaching limit",
      description: `You have ${status.remaining} ${limitType} remaining. Resets in ${formatTimeUntilReset(
        status.resetInMs
      )}.`,
    });
  }
}

/**
 * Example 10: Testing utilities
 *
 * Helpers for testing rate-limited features.
 */
export const rateLimiterTestUtils = {
  /**
   * Fill up a user's rate limit for testing
   */
  async fillLimit(userId: string, limitType: keyof typeof RATE_LIMITS) {
    const config = RATE_LIMITS[limitType];
    for (let i = 0; i < config.limit; i++) {
      await rateLimiter.checkLimit(userId, config.limit, config.window);
    }
  },

  /**
   * Reset all limits for testing
   */
  resetAll() {
    rateLimiter.resetAll();
  },

  /**
   * Get debug information
   */
  getDebug(userId?: string) {
    return rateLimiter.getDebugInfo(userId);
  },
};

// Note: Add React import at top of actual implementation file
declare const React: any;
