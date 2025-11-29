/**
 * GLM Chat Router - Intelligent Provider Selection for Chat
 *
 * Routes chat requests between GLM (primary) and OpenRouter (fallback) with circuit breaker pattern.
 *
 * Key Features:
 * - GLM-first strategy with automatic fallback to OpenRouter
 * - Circuit breaker prevents cascading failures
 * - Retryable vs non-retryable error handling
 * - Comprehensive logging and metrics
 *
 * Routing Logic:
 * 1. Try GLM first (unless circuit is open)
 * 2. On retryable failure (429, 503) after max retries → fallback to OpenRouter
 * 3. On non-retryable failure (400, 401) → return error immediately
 * 4. Track failures to open/close circuit breaker
 *
 * Circuit Breaker:
 * - Opens after 3 consecutive GLM failures
 * - Routes directly to OpenRouter for 60 seconds
 * - Resets on successful GLM response
 */

import { callGLMWithRetry } from './glm-client.ts';
import { callGeminiFlashWithRetry, type OpenRouterMessage } from './openrouter-client.ts';
import { RETRY_CONFIG } from './config.ts';

// ============================================================================
// Circuit Breaker State (module-level, resets on cold start)
// ============================================================================

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 60000; // 60 seconds

// ============================================================================
// Type Definitions
// ============================================================================

export interface RouterOptions {
  requestId: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  preferredProvider?: 'glm' | 'openrouter' | 'auto';
}

export interface RouterResult {
  response: Response;
  provider: 'glm' | 'openrouter';
  fallbackUsed: boolean;
  circuitBreakerOpen: boolean;
}

// ============================================================================
// Circuit Breaker Helpers
// ============================================================================

/**
 * Check if circuit breaker is currently open
 */
function isCircuitOpen(): boolean {
  if (circuitOpenUntil === 0) return false;

  const now = Date.now();
  if (now < circuitOpenUntil) {
    return true;
  }

  // Circuit has timed out, reset
  console.log(`🔄 Circuit breaker timeout expired, resetting state`);
  circuitOpenUntil = 0;
  consecutiveFailures = 0;
  return false;
}

/**
 * Record a GLM failure and potentially open the circuit
 */
function recordFailure(requestId: string): void {
  consecutiveFailures++;
  console.log(`[${requestId}] ⚠️  GLM failure count: ${consecutiveFailures}/${CIRCUIT_THRESHOLD}`);

  if (consecutiveFailures >= CIRCUIT_THRESHOLD && circuitOpenUntil === 0) {
    circuitOpenUntil = Date.now() + CIRCUIT_RESET_MS;
    console.log(
      `[${requestId}] 🔴 Circuit breaker OPENED after ${CIRCUIT_THRESHOLD} failures. ` +
      `Routing to OpenRouter for ${CIRCUIT_RESET_MS / 1000}s`
    );
  }
}

/**
 * Record a GLM success and reset the circuit
 */
function recordSuccess(requestId: string): void {
  if (consecutiveFailures > 0 || circuitOpenUntil > 0) {
    console.log(`[${requestId}] ✅ GLM success - resetting circuit breaker (was at ${consecutiveFailures} failures)`);
  }
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Determine if an error is retryable (should trigger fallback)
 */
function isRetryableError(status: number): boolean {
  return status === 429 || status === 503;
}

/**
 * Determine if an error is non-retryable (should return immediately)
 */
function isNonRetryableError(status: number): boolean {
  return status === 400 || status === 401;
}

// ============================================================================
// GLM Chat Wrapper
// ============================================================================

/**
 * Call GLM for chat with retry logic
 *
 * This wraps the existing GLM client to support chat-style message arrays
 * and converts them to the system/user prompt format GLM expects.
 */
async function callGLMChat(
  messages: OpenRouterMessage[],
  options: RouterOptions
): Promise<Response> {
  const { requestId, temperature, max_tokens, stream } = options;

  // Convert message array to system/user format
  // GLM expects: [{ role: "system", content: "..." }, { role: "user", content: "..." }]
  const systemMessages = messages.filter(m => m.role === 'system');
  const userMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  const systemPrompt = systemMessages.map(m => m.content).join('\n') ||
    'You are a helpful AI assistant.';
  const userPrompt = userMessages.map(m =>
    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
  ).join('\n\n');

  // Call GLM with retry logic
  return await callGLMWithRetry(
    systemPrompt,
    userPrompt,
    {
      temperature,
      max_tokens,
      requestId,
      enableThinking: false, // Disable thinking mode for chat (only for artifacts)
      stream
    }
  );
}

// ============================================================================
// Main Router Function
// ============================================================================

/**
 * Route chat request to GLM (primary) or OpenRouter (fallback)
 *
 * Implements intelligent routing with circuit breaker pattern:
 * 1. Check circuit breaker state
 * 2. Try GLM first (if circuit is closed and not explicitly set to OpenRouter)
 * 3. On retryable failure after max retries → fallback to OpenRouter
 * 4. On non-retryable failure → return error immediately
 * 5. Track failures to manage circuit breaker
 *
 * @param messages - Array of chat messages
 * @param options - Router configuration options
 * @returns RouterResult with response and metadata
 */
export async function routeChatRequest(
  messages: OpenRouterMessage[],
  options: RouterOptions
): Promise<RouterResult> {
  const {
    requestId,
    temperature = 0.7,
    max_tokens = 8000,
    stream = false,
    preferredProvider = 'auto'
  } = options;

  const circuitOpen = isCircuitOpen();

  // Log initial routing decision
  console.log(
    `[${requestId}] 🎯 Routing decision: preferredProvider=${preferredProvider}, ` +
    `circuitOpen=${circuitOpen}, consecutiveFailures=${consecutiveFailures}`
  );

  // If preferredProvider is explicitly set, respect it (unless OpenRouter is forced and circuit is open)
  if (preferredProvider === 'openrouter') {
    console.log(`[${requestId}] 📍 Explicit OpenRouter routing requested`);
    const response = await callGeminiFlashWithRetry(messages, {
      temperature,
      max_tokens,
      requestId,
      stream
    });

    return {
      response,
      provider: 'openrouter',
      fallbackUsed: false,
      circuitBreakerOpen: circuitOpen
    };
  }

  // If circuit is open, route directly to OpenRouter
  if (circuitOpen && preferredProvider === 'auto') {
    console.log(`[${requestId}] ⚡ Circuit breaker OPEN - routing directly to OpenRouter (bypassing GLM)`);
    const response = await callGeminiFlashWithRetry(messages, {
      temperature,
      max_tokens,
      requestId,
      stream
    });

    return {
      response,
      provider: 'openrouter',
      fallbackUsed: true,
      circuitBreakerOpen: true
    };
  }

  // Try GLM first (circuit is closed or explicit GLM request)
  try {
    console.log(`[${requestId}] 🚀 Attempting GLM chat request`);
    const glmResponse = await callGLMChat(messages, {
      requestId,
      temperature,
      max_tokens,
      stream
    });

    // Check if GLM succeeded
    if (glmResponse.ok) {
      console.log(`[${requestId}] ✅ GLM chat succeeded`);
      recordSuccess(requestId);
      return {
        response: glmResponse,
        provider: 'glm',
        fallbackUsed: false,
        circuitBreakerOpen: false
      };
    }

    // GLM returned an error response
    const status = glmResponse.status;
    console.log(`[${requestId}] ⚠️  GLM chat failed with status: ${status}`);

    // Non-retryable error - return immediately without fallback
    if (isNonRetryableError(status)) {
      console.log(`[${requestId}] ❌ Non-retryable error (${status}) - returning error without fallback`);
      recordFailure(requestId);
      return {
        response: glmResponse,
        provider: 'glm',
        fallbackUsed: false,
        circuitBreakerOpen: isCircuitOpen()
      };
    }

    // Retryable error after max retries - fallback to OpenRouter
    if (isRetryableError(status) && preferredProvider === 'auto') {
      console.log(`[${requestId}] 🔄 Retryable error (${status}) - falling back to OpenRouter`);
      recordFailure(requestId);

      // CRITICAL: Drain GLM response body to prevent resource leak
      await glmResponse.text();

      const fallbackResponse = await callGeminiFlashWithRetry(messages, {
        temperature,
        max_tokens,
        requestId,
        stream
      });

      return {
        response: fallbackResponse,
        provider: 'openrouter',
        fallbackUsed: true,
        circuitBreakerOpen: isCircuitOpen()
      };
    }

    // Other error - return GLM error response
    console.log(`[${requestId}] ❌ GLM error (${status}) - returning error`);
    recordFailure(requestId);
    return {
      response: glmResponse,
      provider: 'glm',
      fallbackUsed: false,
      circuitBreakerOpen: isCircuitOpen()
    };

  } catch (error) {
    // Network error or exception during GLM call
    console.error(`[${requestId}] 💥 GLM exception - falling back to OpenRouter:`, error);
    recordFailure(requestId);

    // Fallback to OpenRouter if auto mode
    if (preferredProvider === 'auto') {
      const fallbackResponse = await callGeminiFlashWithRetry(messages, {
        temperature,
        max_tokens,
        requestId,
        stream
      });

      return {
        response: fallbackResponse,
        provider: 'openrouter',
        fallbackUsed: true,
        circuitBreakerOpen: isCircuitOpen()
      };
    }

    // Re-throw if GLM was explicitly requested
    throw error;
  }
}

/**
 * Get current circuit breaker status (for monitoring/debugging)
 */
export function getCircuitBreakerStatus(): {
  isOpen: boolean;
  consecutiveFailures: number;
  opensAt: number;
  resetsAt: number;
} {
  return {
    isOpen: isCircuitOpen(),
    consecutiveFailures,
    opensAt: CIRCUIT_THRESHOLD,
    resetsAt: circuitOpenUntil
  };
}

/**
 * Reset circuit breaker manually (for testing/debugging)
 */
export function resetCircuitBreaker(): void {
  console.log('🔄 Manual circuit breaker reset');
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}
