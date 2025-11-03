/**
 * Client-side rate limiting utility using sliding window algorithm
 *
 * Features:
 * - Sliding window rate limiting per user
 * - localStorage persistence with memory fallback
 * - Automatic cleanup of expired entries
 * - Detailed limit information for user feedback
 * - TypeScript type safety
 *
 * Usage:
 * ```typescript
 * const allowed = await rateLimiter.checkLimit(
 *   userId,
 *   RATE_LIMITS.chat_messages.limit,
 *   RATE_LIMITS.chat_messages.window
 * );
 *
 * if (!allowed) {
 *   const remaining = rateLimiter.getTimeUntilReset(userId, windowMs);
 *   toast.error(`Rate limit exceeded. Try again in ${Math.ceil(remaining / 1000)}s`);
 * }
 * ```
 */

export interface RateLimitConfig {
  limit: number;
  window: number; // in milliseconds
}

export const RATE_LIMITS = {
  chat_messages: {
    limit: 100,
    window: 3600000, // 1 hour in ms
  },
  artifact_creation: {
    limit: 50,
    window: 3600000, // 1 hour in ms
  },
  file_upload: {
    limit: 20,
    window: 3600000, // 1 hour in ms
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

interface RequestLog {
  userId: string;
  timestamps: number[];
  lastCleanup: number;
}

const STORAGE_KEY = "rate_limiter_data";
const CLEANUP_INTERVAL = 300000; // Clean up every 5 minutes

class RateLimiter {
  private requests: Map<string, number[]>;
  private useLocalStorage: boolean;
  private lastGlobalCleanup: number;

  constructor() {
    this.requests = new Map();
    this.useLocalStorage = this.checkLocalStorageAvailability();
    this.lastGlobalCleanup = Date.now();

    // Load existing data from localStorage
    if (this.useLocalStorage) {
      this.loadFromStorage();
    }

    // Set up periodic cleanup
    if (typeof window !== "undefined") {
      setInterval(() => this.performGlobalCleanup(), CLEANUP_INTERVAL);
    }
  }

  /**
   * Check if localStorage is available and working
   */
  private checkLocalStorageAvailability(): boolean {
    try {
      const testKey = "__rate_limiter_test__";
      localStorage.setItem(testKey, "test");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      console.warn("localStorage unavailable, using memory storage for rate limiting");
      return false;
    }
  }

  /**
   * Load rate limit data from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const data: RequestLog[] = JSON.parse(stored);
      const now = Date.now();

      // Reconstruct the Map, filtering out very old entries
      data.forEach((log) => {
        const recentTimestamps = log.timestamps.filter(
          (ts) => now - ts < 86400000 // Keep entries from last 24 hours
        );
        if (recentTimestamps.length > 0) {
          this.requests.set(log.userId, recentTimestamps);
        }
      });
    } catch (error) {
      console.error("Failed to load rate limiter data from storage:", error);
      // If loading fails, start fresh
      this.requests.clear();
    }
  }

  /**
   * Persist rate limit data to localStorage
   */
  private saveToStorage(): void {
    if (!this.useLocalStorage) return;

    try {
      const data: RequestLog[] = Array.from(this.requests.entries()).map(
        ([userId, timestamps]) => ({
          userId,
          timestamps,
          lastCleanup: Date.now(),
        })
      );

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      // Handle quota exceeded errors gracefully
      if (error instanceof Error && error.name === "QuotaExceededError") {
        console.warn("localStorage quota exceeded, clearing old rate limit data");
        this.performGlobalCleanup(true);
        // Try saving again after cleanup
        try {
          const data: RequestLog[] = Array.from(this.requests.entries()).map(
            ([userId, timestamps]) => ({
              userId,
              timestamps,
              lastCleanup: Date.now(),
            })
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch {
          // If it still fails, disable localStorage persistence
          this.useLocalStorage = false;
          console.warn("Disabling localStorage persistence for rate limiting");
        }
      }
    }
  }

  /**
   * Clean up expired entries for a specific user
   */
  private cleanupUserEntries(userId: string, windowMs: number): void {
    const timestamps = this.requests.get(userId);
    if (!timestamps) return;

    const now = Date.now();
    const validTimestamps = timestamps.filter((ts) => now - ts < windowMs);

    if (validTimestamps.length === 0) {
      this.requests.delete(userId);
    } else {
      this.requests.set(userId, validTimestamps);
    }
  }

  /**
   * Perform global cleanup of all expired entries
   */
  private performGlobalCleanup(aggressive = false): void {
    const now = Date.now();

    // Skip if cleaned up recently (unless aggressive)
    if (!aggressive && now - this.lastGlobalCleanup < CLEANUP_INTERVAL) {
      return;
    }

    const maxAge = aggressive ? 3600000 : 86400000; // 1 hour or 24 hours

    for (const [userId, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter((ts) => now - ts < maxAge);

      if (validTimestamps.length === 0) {
        this.requests.delete(userId);
      } else {
        this.requests.set(userId, validTimestamps);
      }
    }

    this.lastGlobalCleanup = now;
    this.saveToStorage();
  }

  /**
   * Check if a request is allowed under the rate limit
   *
   * @param userId - Unique user identifier
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns true if request is allowed, false if rate limit exceeded
   */
  async checkLimit(
    userId: string,
    limit: number,
    windowMs: number
  ): Promise<boolean> {
    // Input validation
    if (!userId || typeof userId !== "string") {
      throw new Error("Invalid userId provided to rate limiter");
    }
    if (limit <= 0 || windowMs <= 0) {
      throw new Error("Invalid rate limit configuration");
    }

    // Clean up old entries for this user
    this.cleanupUserEntries(userId, windowMs);

    const now = Date.now();
    const userTimestamps = this.requests.get(userId) || [];

    // Count requests within the window
    const recentRequests = userTimestamps.filter((ts) => now - ts < windowMs);

    // Check if limit exceeded
    if (recentRequests.length >= limit) {
      return false;
    }

    // Record this request
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);

    // Persist to storage
    this.saveToStorage();

    return true;
  }

  /**
   * Get the number of remaining requests in the current window
   *
   * @param userId - Unique user identifier
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Number of requests remaining
   */
  getRemainingRequests(
    userId: string,
    limit: number,
    windowMs: number
  ): number {
    this.cleanupUserEntries(userId, windowMs);

    const now = Date.now();
    const userTimestamps = this.requests.get(userId) || [];
    const recentRequests = userTimestamps.filter((ts) => now - ts < windowMs);

    return Math.max(0, limit - recentRequests.length);
  }

  /**
   * Get the time in milliseconds until the rate limit resets
   *
   * @param userId - Unique user identifier
   * @param windowMs - Time window in milliseconds
   * @returns Milliseconds until oldest request expires (0 if no requests)
   */
  getTimeUntilReset(userId: string, windowMs: number): number {
    const userTimestamps = this.requests.get(userId);
    if (!userTimestamps || userTimestamps.length === 0) {
      return 0;
    }

    const now = Date.now();
    const oldestRequest = Math.min(...userTimestamps);
    const timeUntilReset = windowMs - (now - oldestRequest);

    return Math.max(0, timeUntilReset);
  }

  /**
   * Get detailed rate limit status for a user
   *
   * @param userId - Unique user identifier
   * @param limit - Maximum number of requests allowed
   * @param windowMs - Time window in milliseconds
   * @returns Detailed status object
   */
  getStatus(userId: string, limit: number, windowMs: number) {
    this.cleanupUserEntries(userId, windowMs);

    const remaining = this.getRemainingRequests(userId, limit, windowMs);
    const resetTime = this.getTimeUntilReset(userId, windowMs);
    const used = limit - remaining;
    const resetDate = resetTime > 0 ? new Date(Date.now() + resetTime) : null;

    return {
      limit,
      remaining,
      used,
      resetInMs: resetTime,
      resetInSeconds: Math.ceil(resetTime / 1000),
      resetAt: resetDate,
      isLimited: remaining === 0,
    };
  }

  /**
   * Reset rate limit for a specific user (useful for testing)
   *
   * @param userId - Unique user identifier
   */
  reset(userId: string): void {
    this.requests.delete(userId);
    this.saveToStorage();
  }

  /**
   * Reset all rate limits (useful for testing)
   */
  resetAll(): void {
    this.requests.clear();
    if (this.useLocalStorage) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore errors
      }
    }
  }

  /**
   * Get current request count for debugging
   */
  getDebugInfo(userId?: string) {
    if (userId) {
      return {
        userId,
        timestamps: this.requests.get(userId) || [],
        count: (this.requests.get(userId) || []).length,
      };
    }

    return {
      totalUsers: this.requests.size,
      users: Array.from(this.requests.entries()).map(([id, timestamps]) => ({
        userId: id,
        count: timestamps.length,
        oldestRequest: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
        newestRequest: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
      })),
    };
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Export helper function for common use case
export async function checkRateLimit(
  userId: string,
  type: RateLimitType
): Promise<{ allowed: boolean; status: ReturnType<typeof rateLimiter.getStatus> }> {
  const config = RATE_LIMITS[type];
  const allowed = await rateLimiter.checkLimit(userId, config.limit, config.window);
  const status = rateLimiter.getStatus(userId, config.limit, config.window);

  return { allowed, status };
}

// Export formatted time string helper
export function formatTimeUntilReset(milliseconds: number): string {
  if (milliseconds <= 0) return "now";

  const seconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  return `${seconds}s`;
}
