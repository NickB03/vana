/**
 * Skills System v2 - Automatic Skill Detector
 *
 * Uses LLM classification to automatically detect which skill (if any)
 * should be applied to a user's message.
 *
 * @module skills/detector
 */

import { MODELS } from '../config.ts';
import { createLogger } from '../logger.ts';
import { PromptInjectionDefense } from '../prompt-injection-defense.ts';
import { SafeErrorHandler } from '../safe-error-handler.ts';
import { type SkillId, VALID_SKILL_IDS, isSkillId } from './types.ts';
import { ERROR_IDS } from '../../../../src/constants/errorIds.ts';

// ============================================================================
// Circuit Breaker for Rate Limiting with Exponential Backoff
// ============================================================================
// Prevents API quota exhaustion by disabling skill detection after consecutive
// failures. The circuit "opens" after MAX_CONSECUTIVE_FAILURES, blocking all
// requests using exponential backoff:
//
// - First 5 failures: No backoff (immediate retry)
// - 6th failure: 1 second backoff
// - 7th failure: 2 seconds backoff
// - 8th failure: 4 seconds backoff
// - 9th failure: 8 seconds backoff
// - 10th+ failure: 16s, 32s, 60s (max)
//
// Formula: backoffMs = Math.min(MAX_BACKOFF_MS, 2^(failures - 5) * MIN_BACKOFF_MS)
//
// Benefits:
// - Quick recovery from transient failures (1s instead of 60s)
// - Progressive backoff protects against sustained failures
// - Self-healing with automatic retry attempts
// ============================================================================

// ============================================================================
// MODULE-LEVEL STATE (Per-Isolate, Not Global)
// ============================================================================
// IMPORTANT: These variables are module-level and persist across function
// invocations WITHIN THE SAME DENO ISOLATE. State is NOT shared across:
//
// 1. Different Deno isolates (Supabase spins up multiple per region)
// 2. Different regions (if multi-region deployment)
// 3. Cold starts (isolate recycling after ~10-15min inactivity)
// 4. Deployments (new code = new isolates)
//
// DENO ISOLATE BEHAVIOR:
// - Each Supabase Edge Function runs in a V8 isolate
// - Isolates are reused for multiple requests (warm starts)
// - Module code executes once when isolate initializes
// - Module-level variables persist until isolate is destroyed
// - Isolate lifetime: typically 10-15 minutes of inactivity
// - Multiple isolates run concurrently to handle load
//
// WHY THIS APPROACH WORKS:
// 1. Circuit breaker is a SAFETY mechanism (per-isolate protection is sufficient)
// 2. Each isolate independently protects itself from cascading failures
// 3. Simpler than distributed coordination (no Redis/KV required)
// 4. Failures are typically transient and isolate-local
// 5. Multiple isolates provide redundancy (if one trips, others continue)
//
// TRADE-OFFS:
// ✅ PROS:
//   - Zero external dependencies (no Redis/KV)
//   - Lower latency (no network calls to shared state)
//   - Simpler implementation and debugging
//   - Natural load distribution (each isolate tracks own failures)
//
// ⚠️ CONS:
//   - Inconsistent state across isolates (one may trip while others don't)
//   - State resets on cold starts (circuit breaker history lost)
//   - No global view of system health
//   - Per-isolate failures don't aggregate (could miss systemic issues)
//
// WHEN STATE RESETS:
// - Cold start: First request after 10-15min inactivity
// - Deployment: Code changes trigger new isolate creation
// - Isolate recycling: Supabase periodically recycles isolates
// - Region scaling: New isolates created to handle increased load
//
// PRODUCTION CONSIDERATIONS:
// For true distributed circuit breaker across all isolates/regions, consider:
// - Upstash Redis (https://upstash.com/) - serverless Redis with low latency
// - Supabase Edge KV (when available) - native key-value store
// - DynamoDB with TTL - AWS managed key-value store
// - CloudFlare Workers KV - if hosting on CloudFlare
//
// Example distributed implementation:
// ```typescript
// // Get circuit state from Redis
// const failures = await redis.get('skill_detector:failures') || 0;
// const openedAt = await redis.get('skill_detector:opened_at');
//
// // Update state on failure
// await redis.incr('skill_detector:failures');
// await redis.expire('skill_detector:failures', 3600); // 1 hour TTL
// ```
//
// REFERENCES:
// - Deno Deploy isolates: https://docs.deno.com/deploy/manual/how-isolates-work
// - Supabase Edge Functions: https://supabase.com/docs/guides/functions/deploy
// - Circuit Breaker pattern: https://martinfowler.com/bliki/CircuitBreaker.html
// ============================================================================

let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;
const MIN_BACKOFF_MS = 1000;  // 1 second minimum backoff
const MAX_BACKOFF_MS = 60000; // 60 seconds maximum backoff
let circuitOpenedAt: number | null = null;

/**
 * Reset circuit breaker state. FOR TESTING ONLY.
 *
 * This function resets the module-level circuit breaker state to its initial
 * values. It should only be used in test environments to ensure test isolation.
 *
 * @internal
 */
export function __resetCircuitBreakerForTesting(): void {
  consecutiveFailures = 0;
  circuitOpenedAt = null;
}

/**
 * Calculate exponential backoff duration based on consecutive failures.
 *
 * Uses exponential backoff strategy with doubling delay:
 * - Failures 1-5: No backoff (0ms) - immediate retry
 * - Failure 6: 1 second
 * - Failure 7: 2 seconds
 * - Failure 8: 4 seconds
 * - Failure 9: 8 seconds
 * - Failure 10: 16 seconds
 * - Failure 11: 32 seconds
 * - Failure 12+: 60 seconds (capped at MAX_BACKOFF_MS)
 *
 * @param failures - Number of consecutive failures
 * @returns Backoff duration in milliseconds
 */
function calculateBackoff(failures: number): number {
  if (failures < MAX_CONSECUTIVE_FAILURES) {
    return 0; // No backoff for first 5 failures
  }
  // Exponential backoff: 2^(failures - 5) * 1000ms, capped at 60s
  const exponent = failures - MAX_CONSECUTIVE_FAILURES;
  return Math.min(MAX_BACKOFF_MS, Math.pow(2, exponent) * MIN_BACKOFF_MS);
}

/** Minimum message length required for skill detection (shorter messages skip classification) */
const MIN_MESSAGE_LENGTH_FOR_DETECTION = 10;

// ============================================================================
// CRITICAL: Model Configuration Rule
// ============================================================================
//
// Uses MODELS.GEMINI_FLASH (fast/cheap) for classification.
// NEVER hardcode model names! Always use MODELS.* constants.
//
// ============================================================================

/**
 * Result of skill detection
 */
export interface SkillDetectionResult {
  /** Detected skill ID, or null if no skill applies */
  skillId: SkillId | null;
  /** Confidence level from the classifier */
  confidence: 'high' | 'medium' | 'low';
  /** Brief reasoning for the classification */
  reason: string;
  /** Time taken for classification in ms */
  latencyMs: number;
  /** Optional warning to display to user (e.g., circuit breaker opened) */
  warning?: {
    message: string;
    errorId: string;
  };
}

/**
 * Classification prompt for skill detection
 */
const CLASSIFICATION_PROMPT = `You are a skill classifier. Analyze the user's message and determine which skill (if any) should be activated.

Available skills:
- web-search: For questions requiring current/real-time information, news, events, prices, weather, or anything that changes over time. Supports multi-step research with up to 2 sequential searches.
- code-assistant: For requests to create, edit, debug, or explain code/artifacts/components
- data-viz: For requests to create charts, graphs, visualizations, or data displays
- null: For general conversation, simple questions, greetings, or anything not matching above

Rules (apply in order - first match wins):
1. Choose "data-viz" for requests specifically about charts, graphs, or data visualization
2. Choose "code-assistant" for requests involving code, artifacts, components, debugging, or technical implementation
3. Choose "web-search" for questions requiring research, current information, news, events, prices, weather, or multi-source synthesis
4. Choose "null" for simple questions, greetings, general knowledge, or ambiguous requests

Examples:
- "create a saas landing page" → code-assistant (creating artifact)
- "build a counter button" → code-assistant (creating component)
- "make me a website" → code-assistant (creating code)
- "debug this React error" → code-assistant (debugging)
- "create a bar chart showing sales" → data-viz (visualization request)
- "search for React 19 features" → web-search (research request)
- "what's the weather today" → web-search (current information)
- "find information about Next.js" → web-search (information lookup)
- "hello" → null (greeting)
- "what is 2+2" → null (simple question)

Respond with ONLY a JSON object (no markdown, no explanation):
{"skill": "web-search" | "code-assistant" | "data-viz" | null, "confidence": "high" | "medium" | "low", "reason": "brief reason"}`;

/**
 * Detect which skill should be applied to a user message
 *
 * @param userMessage - The user's message to classify
 * @param requestId - Request ID for logging
 * @returns Detection result with skill ID (or null) and metadata
 */
export async function detectSkill(
  userMessage: string,
  requestId: string
): Promise<SkillDetectionResult> {
  const logger = createLogger({ requestId, functionName: 'skill-detector' });
  const startTime = Date.now();

  // Skip classification for very short messages (likely greetings)
  if (userMessage.trim().length < MIN_MESSAGE_LENGTH_FOR_DETECTION) {
    return {
      skillId: null,
      confidence: 'high',
      reason: 'Message too short for skill activation',
      latencyMs: 0,
    };
  }

  // Check circuit breaker - prevents API quota exhaustion after consecutive failures
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    const backoffMs = calculateBackoff(consecutiveFailures);
    const now = Date.now();

    // Reset circuit if backoff period has elapsed
    if (circuitOpenedAt && now - circuitOpenedAt > backoffMs) {
      logger.info('circuit_breaker_reset', {
        previousFailures: consecutiveFailures,
        backoffMs,
        elapsedMs: now - circuitOpenedAt,
      });
      consecutiveFailures = 0;
      circuitOpenedAt = null;
      // Circuit closed (failures cleared) - continue with skill detection
      // Note: Circuit will re-open on next failure if issues persist
    } else {
      // Circuit is open - inform user of degraded service
      const backoffSeconds = Math.round(backoffMs / 1000);
      if (!circuitOpenedAt) {
        circuitOpenedAt = Date.now();
        logger.error(
          'circuit_breaker_opened',
          new Error('Skill detection circuit breaker opened due to consecutive failures'),
          {
            errorId: ERROR_IDS.SKILL_DETECTION_UNAVAILABLE,
            consecutiveFailures,
            backoffMs,
            backoffSeconds,
          }
        );
      }
      return {
        skillId: null,
        confidence: 'low',
        reason: `Skill detection temporarily unavailable (recovering in ${backoffSeconds}s)`,
        latencyMs: 0,
        warning: {
          message: `Skill system temporarily degraded (will retry in ${backoffSeconds}s)`,
          errorId: ERROR_IDS.SKILL_DETECTION_UNAVAILABLE,
        },
      };
    }
  }

  try {
    logger.info('skill_detection_start', { messageLength: userMessage.length });

    // Sanitize user message to prevent prompt injection
    const sanitizedMessage = PromptInjectionDefense.sanitizeArtifactContext(userMessage);
    if (sanitizedMessage !== userMessage) {
      logger.debug('skill_detection_sanitized', {
        originalLength: userMessage.length,
        sanitizedLength: sanitizedMessage.length
      });
    }

    const apiKey = Deno.env.get('OPENROUTER_GEMINI_FLASH_KEY');
    if (!apiKey) {
      logger.error(
        'skill_detection_no_api_key',
        new Error('OPENROUTER_GEMINI_FLASH_KEY environment variable not configured'),
        {
          errorId: ERROR_IDS.SKILL_DETECTION_NO_API_KEY,
          environment: Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development',
        }
      );
      return {
        skillId: null,
        confidence: 'low',
        reason: 'Skill detection unavailable (configuration error)',
        latencyMs: Date.now() - startTime,
      };
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vana.com',
        'X-Title': 'Vana Skill Detector',
      },
      body: JSON.stringify({
        model: MODELS.GEMINI_FLASH,
        messages: [
          { role: 'system', content: CLASSIFICATION_PROMPT },
          { role: 'user', content: sanitizedMessage },
        ],
        temperature: 0.1, // Low temperature for consistent classification
        max_tokens: 100,  // Classification is short
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      consecutiveFailures++;

      // Map status codes to specific error IDs and user-friendly messages
      let errorId: string;
      let reason: string;
      let retryable = true;

      switch (response.status) {
        case 401:
          errorId = ERROR_IDS.SKILL_DETECTION_API_ERROR;
          reason = 'Skill detection unavailable (authentication error)';
          retryable = false;
          break;
        case 402:
          errorId = ERROR_IDS.SKILL_DETECTION_API_ERROR;
          reason = 'Skill detection unavailable (quota exceeded)';
          retryable = false;
          break;
        case 429:
          errorId = ERROR_IDS.SKILL_DETECTION_API_ERROR;
          reason = 'Skill detection temporarily unavailable (rate limited)';
          retryable = true;
          break;
        case 503:
          errorId = ERROR_IDS.SKILL_DETECTION_API_ERROR;
          reason = 'Skill detection temporarily unavailable (service down)';
          retryable = true;
          break;
        default:
          errorId = ERROR_IDS.SKILL_DETECTION_API_ERROR;
          reason = `Skill detection unavailable (API error ${response.status})`;
          retryable = response.status >= 500;
      }

      logger.error(
        'skill_detection_api_error',
        new Error(`API error ${response.status}: ${errorText}`),
        {
          errorId,
          status: response.status,
          consecutiveFailures,
          retryable,
        }
      );

      return {
        skillId: null,
        confidence: 'low',
        reason,
        latencyMs: Date.now() - startTime,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Check for empty response before parsing
    if (!content || content.trim().length === 0) {
      logger.error(
        'skill_detection_empty_response',
        new Error('API returned empty response'),
        {
          errorId: ERROR_IDS.SKILL_DETECTION_EMPTY,
          apiResponse: JSON.stringify(data).slice(0, 200),
        }
      );
      return {
        skillId: null,
        confidence: 'low',
        reason: 'Detection failed (empty API response)',
        latencyMs: Date.now() - startTime,
      };
    }

    // Parse JSON response (handle potential markdown code blocks)
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    let parsed: { skill: string | null; confidence: string; reason: string };

    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      // Don't increment consecutiveFailures for parse errors (not a systemic issue)
      const contentSample = content.slice(0, 200);
      logger.error(
        'skill_detection_parse_error',
        parseError instanceof Error ? parseError : new Error('JSON parse failed'),
        {
          errorId: ERROR_IDS.SKILL_DETECTION_PARSE_ERROR,
          contentSample,
          contentLength: content.length,
        }
      );
      return {
        skillId: null,
        confidence: 'low',
        reason: 'Detection failed (invalid API response format)',
        latencyMs: Date.now() - startTime,
      };
    }

    // Validate skill ID against allowed values using type guard
    const skillId = isSkillId(parsed.skill) ? parsed.skill : null;

    const result: SkillDetectionResult = {
      skillId,
      confidence: (parsed.confidence as 'high' | 'medium' | 'low') || 'medium',
      reason: parsed.reason || 'No reason provided',
      latencyMs: Date.now() - startTime,
    };

    // Success - reset circuit breaker
    consecutiveFailures = 0;

    logger.info('skill_detection_complete', {
      skillId: result.skillId,
      confidence: result.confidence,
      reason: result.reason,
      latencyMs: result.latencyMs,
    });

    return result;
  } catch (error) {
    // Distinguish between expected failures (network, timeout, etc.) and unexpected bugs
    const isExpectedError =
      error instanceof Error &&
      ((error.name === 'TypeError' && error.message.includes('fetch')) ||
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT'));

    if (isExpectedError) {
      // Expected failure - increment circuit breaker
      consecutiveFailures++;
      const { response } = SafeErrorHandler.toSafeResponse(error, requestId, {
        operation: 'skill_detection',
      });
      logger.error(
        'skill_detection_failed',
        error instanceof Error ? error : new Error(String(error)),
        {
          errorId: ERROR_IDS.SKILL_DETECTION_FAILED,
          message: response.error.message,
          consecutiveFailures,
          retryable: response.error.retryable,
        }
      );

      return {
        skillId: null,
        confidence: 'low',
        reason: response.error.message || 'Detection failed (network error)',
        latencyMs: Date.now() - startTime,
      };
    } else {
      // Unexpected bug - log with stack trace, don't increment circuit breaker
      logger.error(
        'skill_detection_bug',
        error instanceof Error ? error : new Error(String(error)),
        {
          errorId: ERROR_IDS.SKILL_DETECTION_BUG,
          stack: error instanceof Error ? error.stack : undefined,
          consecutiveFailures, // Report current value but don't increment
          retryable: false,
        }
      );

      return {
        skillId: null,
        confidence: 'low',
        reason: 'Detection failed (internal error)',
        latencyMs: Date.now() - startTime,
      };
    }
  }
}
