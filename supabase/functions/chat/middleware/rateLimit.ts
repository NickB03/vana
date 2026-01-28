/**
 * Rate limiting middleware
 * Handles both API throttle and user rate limits
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { FEATURE_FLAGS, RATE_LIMITS } from "../../_shared/config.ts";

export interface RateLimitResult {
  ok: boolean;
  headers: Record<string, string>;
  error?: {
    error: string;
    requestId: string;
    rateLimitExceeded?: boolean;
    resetAt?: string;
    retryAfter?: number;
    retryable?: boolean;
  };
  status?: number;
}

/**
 * Checks API throttle limit (applies to all requests)
 */
export async function checkApiThrottle(
  serviceClient: SupabaseClient,
  requestId: string
): Promise<RateLimitResult> {
  // Skip rate limiting if feature flag is set (for local development only!)
  if (FEATURE_FLAGS.RATE_LIMIT_DISABLED) {
    console.warn(`[${requestId}] ⚠️ API throttle DISABLED via feature flag - development mode only!`);
    return { ok: true, headers: {} };
  }

  const { data: apiThrottleResult, error: apiThrottleError } =
    await serviceClient.rpc("check_api_throttle", {
      p_api_name: "gemini",
      p_max_requests: RATE_LIMITS.API_THROTTLE.GEMINI_RPM,
      p_window_seconds: RATE_LIMITS.API_THROTTLE.WINDOW_SECONDS,
    });

  // Handle API throttle check results
  if (apiThrottleError) {
    console.error(
      `[${requestId}] API throttle check error:`,
      apiThrottleError
    );
    return {
      ok: false,
      headers: {},
      status: 503,
      error: {
        error: "Service temporarily unavailable",
        requestId,
        retryable: true,
      },
    };
  }

  // SECURITY: Explicit null check to prevent bypass
  if (!apiThrottleResult) {
    console.error(`[${requestId}] CRITICAL: API throttle returned null/undefined`);
    return {
      ok: false,
      headers: {},
      status: 503,
      error: { error: "Rate limiting check failed", requestId, retryable: true },
    };
  }

  if (!apiThrottleResult.allowed) {
    return {
      ok: false,
      headers: {
        "X-RateLimit-Limit": apiThrottleResult.total.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(apiThrottleResult.reset_at)
          .getTime()
          .toString(),
        "Retry-After": apiThrottleResult.retry_after.toString(),
      },
      status: 429,
      error: {
        error: "API rate limit exceeded. Please try again in a moment.",
        rateLimitExceeded: true,
        resetAt: apiThrottleResult.reset_at,
        retryAfter: apiThrottleResult.retry_after,
      },
    };
  }

  return { ok: true, headers: {} };
}

/**
 * Checks guest rate limit (IP-based)
 */
export async function checkGuestRateLimit(
  req: Request,
  serviceClient: SupabaseClient,
  requestId: string
): Promise<RateLimitResult> {
  // Skip rate limiting if feature flag is set (for local development only!)
  if (FEATURE_FLAGS.RATE_LIMIT_DISABLED) {
    console.warn(`[${requestId}] ⚠️ Guest rate limit DISABLED via feature flag - development mode only!`);
    return { ok: true, headers: {} };
  }

  // Get client IP address (trusted headers set by Supabase Edge infrastructure)
  // X-Forwarded-For is sanitized by Supabase proxy to prevent spoofing
  let clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "";

  // SECURITY: Generate unique ID instead of shared "unknown" bucket
  if (!clientIp) {
    clientIp = `no-ip_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  }

  const { data: rateLimitResult, error: rateLimitError } =
    await serviceClient.rpc("check_guest_rate_limit", {
      p_identifier: clientIp,
      p_max_requests: RATE_LIMITS.GUEST.MAX_REQUESTS,
      p_window_hours: RATE_LIMITS.GUEST.WINDOW_HOURS,
    });

  if (rateLimitError) {
    console.error(
      `[${requestId}] Guest rate limit check error:`,
      rateLimitError
    );
    return {
      ok: false,
      headers: {},
      status: 503,
      error: {
        error: "Service temporarily unavailable",
        requestId,
        retryable: true,
      },
    };
  }

  // SECURITY: Explicit null check to prevent bypass
  if (!rateLimitResult) {
    console.error(`[${requestId}] CRITICAL: Guest rate limit returned null/undefined`);
    return {
      ok: false,
      headers: {},
      status: 503,
      error: { error: "Rate limiting check failed", requestId, retryable: true },
    };
  }

  if (!rateLimitResult.allowed) {
    return {
      ok: false,
      headers: {
        "X-RateLimit-Limit": rateLimitResult.total.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(rateLimitResult.reset_at)
          .getTime()
          .toString(),
      },
      status: 429,
      error: {
        error:
          "Rate limit exceeded. Please sign in to continue using the chat.",
        rateLimitExceeded: true,
        resetAt: rateLimitResult.reset_at,
      },
    };
  }

  // Add rate limit headers to successful responses
  // Note: rateLimitResult is guaranteed non-null here due to explicit check above
  const headers = {
    "X-RateLimit-Limit": rateLimitResult.total.toString(),
    "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
    "X-RateLimit-Reset": new Date(rateLimitResult.reset_at)
      .getTime()
      .toString(),
  };

  return { ok: true, headers };
}

/**
 * Checks authenticated user rate limit
 */
export async function checkUserRateLimit(
  userId: string,
  serviceClient: SupabaseClient,
  requestId: string
): Promise<RateLimitResult> {
  // Skip rate limiting if feature flag is set (for local development only!)
  if (FEATURE_FLAGS.RATE_LIMIT_DISABLED) {
    console.warn(`[${requestId}] ⚠️ User rate limit DISABLED via feature flag - development mode only!`);
    return { ok: true, headers: {} };
  }

  const { data: userRateLimitResult, error: userRateLimitError } =
    await serviceClient.rpc("check_user_rate_limit", {
      p_user_id: userId,
      p_max_requests: RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS,
      p_window_hours: RATE_LIMITS.AUTHENTICATED.WINDOW_HOURS,
    });

  if (userRateLimitError) {
    console.error(
      `[${requestId}] User rate limit check error:`,
      userRateLimitError
    );
    return {
      ok: false,
      headers: {},
      status: 503,
      error: {
        error: "Service temporarily unavailable",
        requestId,
        retryable: true,
      },
    };
  }

  // SECURITY: Explicit null check to prevent bypass
  if (!userRateLimitResult) {
    console.error(`[${requestId}] CRITICAL: User rate limit returned null/undefined`);
    return {
      ok: false,
      headers: {},
      status: 503,
      error: { error: "Rate limiting check failed", requestId, retryable: true },
    };
  }

  if (!userRateLimitResult.allowed) {
    return {
      ok: false,
      headers: {
        "X-RateLimit-Limit": userRateLimitResult.total.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": new Date(userRateLimitResult.reset_at)
          .getTime()
          .toString(),
      },
      status: 429,
      error: {
        error: "Rate limit exceeded. Please try again later.",
        rateLimitExceeded: true,
        resetAt: userRateLimitResult.reset_at,
      },
    };
  }

  // Add rate limit headers to successful responses
  // Note: userRateLimitResult is guaranteed non-null here due to explicit check above
  const headers = {
    "X-RateLimit-Limit": userRateLimitResult.total.toString(),
    "X-RateLimit-Remaining": userRateLimitResult.remaining.toString(),
    "X-RateLimit-Reset": new Date(userRateLimitResult.reset_at)
      .getTime()
      .toString(),
  };

  return { ok: true, headers };
}
