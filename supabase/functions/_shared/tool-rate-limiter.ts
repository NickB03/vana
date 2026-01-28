/**
 * Tool-Specific Rate Limiter
 *
 * Enforces separate rate limits per tool type, preventing bypass attacks
 * where users route expensive operations through the unified endpoint.
 *
 * SECURITY FIX: Fail-closed design with circuit breaker pattern.
 * Unknown tools are DENIED by default (not allowed).
 *
 * @security CWE-841 - Rate Limit Bypass Prevention
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.1";
import { RATE_LIMITS } from './config.ts';

// =============================================================================
// Types
// =============================================================================

export interface ToolRateLimitConfig {
  apiThrottle: {
    maxRequests: number;
    windowSeconds: number;
  };
  guest: {
    maxRequests: number;
    windowHours: number;
  };
  authenticated: {
    maxRequests: number;
    windowHours: number;
  };
}

export interface RateLimitContext {
  isGuest: boolean;
  userId?: string;
  clientIp: string;
  requestId: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

export class ToolRateLimitError extends Error {
  constructor(
    public readonly toolName: string,
    public readonly limitType: 'api_throttle' | 'user_limit' | 'unknown_tool' | 'circuit_open',
    public readonly remaining: number,
    public readonly resetAt: Date
  ) {
    super(`Rate limit exceeded for ${toolName}`);
    this.name = 'ToolRateLimitError';
  }
}

// =============================================================================
// Circuit Breaker for Database Failures
// =============================================================================

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const CIRCUIT_BREAKER_CONFIG = {
  maxFailures: 3,           // Open circuit after 3 consecutive failures
  cooldownMs: 30000,        // 30 second cooldown before retrying
};

// =============================================================================
// Rate Limit Configuration per Tool
// =============================================================================

export const TOOL_RATE_LIMITS: Record<string, ToolRateLimitConfig> = {
  generate_artifact: {
    apiThrottle: {
      maxRequests: RATE_LIMITS.ARTIFACT.API_THROTTLE.MAX_REQUESTS,
      windowSeconds: RATE_LIMITS.ARTIFACT.API_THROTTLE.WINDOW_SECONDS,
    },
    guest: {
      maxRequests: RATE_LIMITS.ARTIFACT.GUEST.MAX_REQUESTS,
      windowHours: RATE_LIMITS.ARTIFACT.GUEST.WINDOW_HOURS,
    },
    authenticated: {
      maxRequests: RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS,
      windowHours: RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS,
    },
  },

  generate_image: {
    apiThrottle: {
      maxRequests: RATE_LIMITS.IMAGE.API_THROTTLE.MAX_REQUESTS,
      windowSeconds: RATE_LIMITS.IMAGE.API_THROTTLE.WINDOW_SECONDS,
    },
    guest: {
      maxRequests: RATE_LIMITS.IMAGE.GUEST.MAX_REQUESTS,
      windowHours: RATE_LIMITS.IMAGE.GUEST.WINDOW_HOURS,
    },
    authenticated: {
      maxRequests: RATE_LIMITS.IMAGE.AUTHENTICATED.MAX_REQUESTS,
      windowHours: RATE_LIMITS.IMAGE.AUTHENTICATED.WINDOW_HOURS,
    },
  },

  'browser.search': {
    apiThrottle: {
      maxRequests: RATE_LIMITS.TAVILY.API_THROTTLE.MAX_REQUESTS,
      windowSeconds: RATE_LIMITS.TAVILY.API_THROTTLE.WINDOW_SECONDS,
    },
    guest: {
      maxRequests: RATE_LIMITS.TAVILY.GUEST.MAX_REQUESTS,
      windowHours: RATE_LIMITS.TAVILY.GUEST.WINDOW_HOURS,
    },
    authenticated: {
      maxRequests: RATE_LIMITS.TAVILY.AUTHENTICATED.MAX_REQUESTS,
      windowHours: RATE_LIMITS.TAVILY.AUTHENTICATED.WINDOW_HOURS,
    },
  },
};

// =============================================================================
// Rate Limiter Implementation
// =============================================================================

export class ToolRateLimiter {
  private serviceClient: ReturnType<typeof createClient>;
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailure: 0,
    isOpen: false,
  };

  constructor(serviceClient: ReturnType<typeof createClient>) {
    this.serviceClient = serviceClient;
  }

  /**
   * Check if tool execution is allowed under rate limits
   *
   * SECURITY: Fail-closed design - denies on unknown tools or DB errors.
   * Uses circuit breaker to prevent cascading failures while maintaining security.
   *
   * @throws ToolRateLimitError if any limit is exceeded or tool is unknown
   */
  async checkToolRateLimit(
    toolName: string,
    context: RateLimitContext
  ): Promise<RateLimitResult> {
    // SECURITY FIX: Check circuit breaker state first
    if (this.isCircuitOpen()) {
      console.error(`[${context.requestId}] Circuit breaker OPEN - denying request`);
      throw new ToolRateLimitError(
        toolName,
        'circuit_open',
        0,
        new Date(this.circuitBreaker.lastFailure + CIRCUIT_BREAKER_CONFIG.cooldownMs)
      );
    }

    const config = TOOL_RATE_LIMITS[toolName];

    // SECURITY FIX: Fail-closed for unknown tools (was fail-open!)
    if (!config) {
      console.error(`[${context.requestId}] DENIED: Unknown tool "${toolName}" - fail-closed`);
      throw new ToolRateLimitError(
        toolName,
        'unknown_tool',
        0,
        new Date()
      );
    }

    try {
      // Check 1: API-level throttle (prevents overwhelming external APIs)
      const apiThrottleResult = await this.checkApiThrottle(toolName, config, context);
      if (!apiThrottleResult.allowed) {
        throw new ToolRateLimitError(
          toolName,
          'api_throttle',
          apiThrottleResult.remaining,
          apiThrottleResult.resetAt
        );
      }

      // Check 2: User/guest rate limit (per-user quota) - NOW TOOL-SPECIFIC
      const userLimitResult = context.isGuest
        ? await this.checkGuestLimit(toolName, config, context)
        : await this.checkUserLimit(toolName, config, context);

      if (!userLimitResult.allowed) {
        throw new ToolRateLimitError(
          toolName,
          'user_limit',
          userLimitResult.remaining,
          userLimitResult.resetAt
        );
      }

      // Success - reset circuit breaker
      this.resetCircuitBreaker();

      console.log(
        `[${context.requestId}] Tool rate limit check passed: ${toolName} ` +
        `(remaining: ${userLimitResult.remaining}/${userLimitResult.limit})`
      );

      return userLimitResult;

    } catch (error) {
      // Re-throw rate limit errors (expected)
      if (error instanceof ToolRateLimitError) {
        throw error;
      }
      // Unexpected error - record failure and fail-closed
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Check if circuit breaker is open (too many recent failures)
   */
  private isCircuitOpen(): boolean {
    if (!this.circuitBreaker.isOpen) {
      return false;
    }
    // Check if cooldown has elapsed
    const elapsed = Date.now() - this.circuitBreaker.lastFailure;
    if (elapsed >= CIRCUIT_BREAKER_CONFIG.cooldownMs) {
      // Allow one request through (half-open state)
      console.log('Circuit breaker entering half-open state');
      return false;
    }
    return true;
  }

  /**
   * Record a failure and potentially open the circuit
   */
  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    if (this.circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.maxFailures) {
      this.circuitBreaker.isOpen = true;
      console.error(`Circuit breaker OPENED after ${this.circuitBreaker.failures} failures`);
    }
  }

  /**
   * Reset circuit breaker on successful request
   */
  private resetCircuitBreaker(): void {
    if (this.circuitBreaker.failures > 0 || this.circuitBreaker.isOpen) {
      console.log('Circuit breaker reset');
    }
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
  }

  /**
   * Check API-level throttle (short window, high rate)
   * SECURITY FIX: Fail-closed on DB errors
   */
  private async checkApiThrottle(
    toolName: string,
    config: ToolRateLimitConfig,
    context: RateLimitContext
  ): Promise<RateLimitResult> {
    const { data, error } = await this.serviceClient.rpc('check_api_throttle', {
      p_api_name: `tool-${toolName}`,
      p_max_requests: config.apiThrottle.maxRequests,
      p_window_seconds: config.apiThrottle.windowSeconds,
    } as any);

    if (error) {
      console.error(`[${context.requestId}] API throttle check failed - DENYING:`, error);
      // SECURITY FIX: Fail-closed on DB errors (was fail-open!)
      throw new Error(`Rate limit check failed: ${error.message}`);
    }

    return {
      allowed: (data as any)?.allowed ?? false,  // SECURITY FIX: Default to denied
      remaining: (data as any)?.remaining ?? 0,
      resetAt: new Date((data as any)?.reset_at ?? Date.now()),
      limit: config.apiThrottle.maxRequests,
    };
  }

  /**
   * Check guest rate limit (IP-based, longer window)
   * SECURITY FIX: Tool-specific identifier AND fail-closed
   */
  private async checkGuestLimit(
    toolName: string,
    config: ToolRateLimitConfig,
    context: RateLimitContext
  ): Promise<RateLimitResult> {
    // ALREADY CORRECT: Tool-specific identifier separates from chat limits
    const identifier = `${context.clientIp}:tool:${toolName}`;

    const { data, error } = await this.serviceClient.rpc('check_guest_rate_limit', {
      p_identifier: identifier,
      p_max_requests: config.guest.maxRequests,
      p_window_hours: config.guest.windowHours,
    } as any);

    if (error) {
      console.error(`[${context.requestId}] Guest rate limit check failed - DENYING:`, error);
      // SECURITY FIX: Fail-closed on DB errors (was fail-open!)
      throw new Error(`Rate limit check failed: ${error.message}`);
    }

    return {
      allowed: (data as any)?.allowed ?? false,  // SECURITY FIX: Default to denied
      remaining: (data as any)?.remaining ?? 0,
      resetAt: new Date((data as any)?.reset_at ?? Date.now()),
      limit: config.guest.maxRequests,
    };
  }

  /**
   * Check authenticated user rate limit
   * SECURITY FIX: Tool-specific via composite key AND fail-closed
   */
  private async checkUserLimit(
    toolName: string,
    config: ToolRateLimitConfig,
    context: RateLimitContext
  ): Promise<RateLimitResult> {
    if (!context.userId) {
      // Shouldn't happen - fall back to guest limits
      return this.checkGuestLimit(toolName, config, context);
    }

    // SECURITY FIX: Use tool-specific composite key
    // The RPC function now accepts a tool_name parameter for per-tool tracking
    const { data, error } = await this.serviceClient.rpc('check_user_tool_rate_limit', {
      p_user_id: context.userId,
      p_tool_name: toolName,  // SECURITY FIX: Added tool-specific parameter
      p_max_requests: config.authenticated.maxRequests,
      p_window_hours: config.authenticated.windowHours,
    } as any);

    if (error) {
      console.error(`[${context.requestId}] User rate limit check failed - DENYING:`, error);
      // SECURITY FIX: Fail-closed on DB errors (was fail-open!)
      throw new Error(`Rate limit check failed: ${error.message}`);
    }

    return {
      allowed: (data as any)?.allowed ?? false,  // SECURITY FIX: Default to denied
      remaining: (data as any)?.remaining ?? 0,
      resetAt: new Date((data as any)?.reset_at ?? Date.now()),
      limit: config.authenticated.maxRequests,
    };
  }
}

// =============================================================================
// DATABASE MIGRATION REQUIRED
// =============================================================================
//
// Add the following migration to support tool-specific user rate limits:
//
// CREATE TABLE user_tool_rate_limits (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
//   tool_name TEXT NOT NULL,
//   request_count INTEGER DEFAULT 1,
//   window_start TIMESTAMPTZ DEFAULT NOW(),
//   last_request TIMESTAMPTZ DEFAULT NOW(),
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   UNIQUE(user_id, tool_name)
// );
//
// CREATE INDEX idx_user_tool_rate_limits_lookup
//   ON user_tool_rate_limits(user_id, tool_name, window_start);
//
// CREATE OR REPLACE FUNCTION check_user_tool_rate_limit(
//   p_user_id UUID,
//   p_tool_name TEXT,
//   p_max_requests INTEGER,
//   p_window_hours INTEGER
// ) RETURNS JSONB
// LANGUAGE plpgsql
// SECURITY DEFINER
// SET search_path = public, pg_temp
// AS $$
// DECLARE
//   v_result JSONB;
//   v_count INTEGER;
//   v_window_start TIMESTAMPTZ;
// BEGIN
//   -- Upsert and get current count
//   INSERT INTO user_tool_rate_limits (user_id, tool_name, request_count, window_start, last_request)
//   VALUES (p_user_id, p_tool_name, 1, NOW(), NOW())
//   ON CONFLICT (user_id, tool_name) DO UPDATE SET
//     request_count = CASE
//       WHEN user_tool_rate_limits.window_start < NOW() - (p_window_hours || ' hours')::INTERVAL
//       THEN 1
//       ELSE user_tool_rate_limits.request_count + 1
//     END,
//     window_start = CASE
//       WHEN user_tool_rate_limits.window_start < NOW() - (p_window_hours || ' hours')::INTERVAL
//       THEN NOW()
//       ELSE user_tool_rate_limits.window_start
//     END,
//     last_request = NOW()
//   RETURNING request_count, window_start INTO v_count, v_window_start;
//
//   RETURN jsonb_build_object(
//     'allowed', v_count <= p_max_requests,
//     'remaining', GREATEST(0, p_max_requests - v_count),
//     'reset_at', v_window_start + (p_window_hours || ' hours')::INTERVAL
//   );
// END;
// $$;
