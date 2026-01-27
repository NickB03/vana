/**
 * Rate Limiting Service
 *
 * Centralized rate limiting logic for guest users, authenticated users, and API throttling.
 * Eliminates 100+ lines of duplicate code across edge functions.
 *
 * @module rate-limiter
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { RATE_LIMITS } from "./config.ts";
import { RateLimitError } from "./error-handler.ts";

/**
 * Result of a rate limit check
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  total: number;
  remaining: number;
  resetAt: string;
}

/**
 * Combined rate limit result with headers
 */
export interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
  error?: {
    message: string;
    resetAt: string;
    total: number;
    remaining: number;
  };
}

/**
 * Rate limiter service
 *
 * Usage:
 * ```ts
 * const limiter = new RateLimiter();
 * const result = await limiter.checkAll(req, isGuest, user?.id);
 *
 * if (!result.allowed) {
 *   return errors.rateLimited(
 *     result.error.resetAt,
 *     result.error.remaining,
 *     result.error.total,
 *     result.error.message
 *   );
 * }
 *
 * // Use rate limit headers in successful response
 * return new Response(data, { headers: { ...corsHeaders, ...result.headers } });
 * ```
 */
export class RateLimiter {
  private serviceClient: SupabaseClient;

  constructor() {
    this.serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
  }

  /**
   * Check all applicable rate limits in parallel
   *
   * @param req - Request object for IP extraction
   * @param isGuest - Whether the user is a guest
   * @param userId - User ID for authenticated users
   * @returns Combined rate limit result with headers
   */
  async checkAll(
    req: Request,
    isGuest: boolean,
    userId?: string
  ): Promise<RateLimitResult> {
    try {
      // Run API throttle check and user/guest limit check in parallel
      const [apiResult, userResult] = await Promise.all([
        this.checkApiThrottle(),
        isGuest ? this.checkGuestLimit(req) : this.checkUserLimit(userId!)
      ]);

      // API throttle takes precedence
      if (!apiResult.allowed) {
        return {
          allowed: false,
          headers: {},
          error: {
            message: "API rate limit exceeded. Please try again in a moment.",
            resetAt: apiResult.resetAt,
            total: apiResult.total,
            remaining: apiResult.remaining
          }
        };
      }

      // User/guest limit
      if (!userResult.allowed) {
        return {
          allowed: false,
          headers: {},
          error: {
            message: isGuest
              ? "Rate limit exceeded. Please sign in to continue using the chat."
              : "Rate limit exceeded. Please try again later.",
            resetAt: userResult.resetAt,
            total: userResult.total,
            remaining: userResult.remaining
          }
        };
      }

      // All checks passed - return success with headers
      return {
        allowed: true,
        headers: this.buildRateLimitHeaders(userResult)
      };
    } catch (error) {
      console.error("Rate limit check error:", error);
      throw new Error("Service temporarily unavailable");
    }
  }

  /**
   * Check API-level throttling (applies to all requests)
   *
   * Prevents overwhelming external APIs (e.g., OpenRouter, Gemini)
   */
  async checkApiThrottle(): Promise<RateLimitCheckResult> {
    const { data, error } = await this.serviceClient.rpc("check_api_throttle", {
      p_api_name: "gemini",
      p_max_requests: RATE_LIMITS.API_THROTTLE.GEMINI_RPM,
      p_window_seconds: RATE_LIMITS.API_THROTTLE.WINDOW_SECONDS
    });

    if (error) {
      console.error("API throttle check error:", error);
      throw error;
    }

    return {
      allowed: data?.allowed ?? true,
      total: RATE_LIMITS.API_THROTTLE.GEMINI_RPM,
      remaining: data?.remaining ?? RATE_LIMITS.API_THROTTLE.GEMINI_RPM,
      resetAt: data?.reset_at ?? new Date(Date.now() + 60000).toISOString()
    };
  }

  /**
   * Check guest user rate limit (IP-based)
   *
   * @param req - Request object to extract client IP
   */
  async checkGuestLimit(req: Request): Promise<RateLimitCheckResult> {
    const clientIp = this.extractClientIp(req);

    const { data, error } = await this.serviceClient.rpc("check_guest_rate_limit", {
      p_identifier: clientIp,
      p_max_requests: RATE_LIMITS.GUEST.MAX_REQUESTS,
      p_window_hours: RATE_LIMITS.GUEST.WINDOW_HOURS
    });

    if (error) {
      console.error("Guest rate limit check error:", error);
      throw error;
    }

    return {
      allowed: data?.allowed ?? true,
      total: RATE_LIMITS.GUEST.MAX_REQUESTS,
      remaining: data?.remaining ?? RATE_LIMITS.GUEST.MAX_REQUESTS,
      resetAt: data?.reset_at ?? this.calculateResetTime(RATE_LIMITS.GUEST.WINDOW_HOURS)
    };
  }

  /**
   * Check authenticated user rate limit
   *
   * @param userId - User ID from auth token
   */
  async checkUserLimit(userId: string): Promise<RateLimitCheckResult> {
    if (!userId) {
      throw new Error("User ID required for user rate limit check");
    }

    const { data, error } = await this.serviceClient.rpc("check_user_rate_limit", {
      p_user_id: userId,
      p_max_requests: RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS,
      p_window_hours: RATE_LIMITS.AUTHENTICATED.WINDOW_HOURS
    });

    if (error) {
      console.error("User rate limit check error:", error);
      throw error;
    }

    return {
      allowed: data?.allowed ?? true,
      total: RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS,
      remaining: data?.remaining ?? RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS,
      resetAt: data?.reset_at ?? this.calculateResetTime(RATE_LIMITS.AUTHENTICATED.WINDOW_HOURS)
    };
  }

  /**
   * Extract client IP from request headers
   *
   * Supabase Edge Functions provide sanitized headers to prevent IP spoofing
   */
  private extractClientIp(req: Request): string {
    // X-Forwarded-For is sanitized by Supabase proxy
    const forwardedFor = req.headers.get("x-forwarded-for");
    if (forwardedFor) {
      // Take the first IP (client IP)
      return forwardedFor.split(",")[0].trim();
    }

    // Fallback to X-Real-IP
    const realIp = req.headers.get("x-real-ip");
    if (realIp) {
      return realIp.trim();
    }

    // Ultimate fallback (should not happen in production)
    return "unknown";
  }

  /**
   * Build X-RateLimit-* headers for successful responses
   */
  private buildRateLimitHeaders(result: RateLimitCheckResult): Record<string, string> {
    return {
      "X-RateLimit-Limit": result.total.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": new Date(result.resetAt).getTime().toString()
    };
  }

  /**
   * Calculate reset time based on window hours
   */
  private calculateResetTime(windowHours: number): string {
    return new Date(Date.now() + windowHours * 3600000).toISOString();
  }
}

// ============================================================================
// MODULE-LEVEL STATE (Per-Isolate Singleton)
// ============================================================================
// Singleton RateLimiter instance reused across requests within the same isolate.
//
// ISOLATE BEHAVIOR: Instance persists within a Deno isolate but resets on:
// - Cold starts (after ~10-15min inactivity)
// - Deployments (new code = new isolates)
// - Isolate recycling (automatic cleanup)
//
// WHY SINGLETON:
// - RateLimiter holds no mutable state (all rate limit data in Supabase DB)
// - Reusing instance avoids repeated initialization overhead
// - Safe to share across requests (no race conditions)
//
// For details on module-level state persistence, see detector.ts comments.
// ============================================================================
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get or create the rate limiter singleton
 *
 * Usage:
 * ```ts
 * const limiter = getRateLimiter();
 * const result = await limiter.checkAll(req, isGuest, userId);
 * ```
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}
