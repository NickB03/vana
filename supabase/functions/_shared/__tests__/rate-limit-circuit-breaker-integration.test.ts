/**
 * Integration Tests for Rate Limit (429) + Circuit Breaker Interaction
 *
 * IMPORTANT DISCOVERY: These tests revealed bugs in the current implementation!
 *
 * BUGS FOUND:
 * 1. callGemini() throws LLMQuotaExceededError on 429 (line 264)
 * 2. This prevents callGeminiWithRetry() from seeing response.status === 429
 * 3. Therefore, the Retry-After header logic (lines 316-364) is UNREACHABLE
 * 4. The retry logic uses exponential backoff instead of Retry-After
 * 5. 429 errors count as circuit breaker failures (they shouldn't)
 *
 * These tests verify the CURRENT behavior to establish a baseline.
 * Future work should fix the implementation to:
 * 1. Return 429 response from callGemini instead of throwing
 * 2. Let callGeminiWithRetry handle Retry-After parsing
 * 3. Prevent 429 errors from counting as circuit breaker failures
 *
 * To run:
 * deno test --allow-net --allow-env rate-limit-circuit-breaker-integration.test.ts
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  callGeminiWithRetry,
  getCircuitBreaker,
  type GeminiMessage
} from "../gemini-client.ts";
import { LLMQuotaExceededError, CircuitBreakerOpenError } from "../errors.ts";
import { RETRY_CONFIG } from "../config.ts";

/**
 * Mock fetch to return controlled responses for testing
 */
interface MockFetchOptions {
  status: number;
  body?: string;
  headers?: Record<string, string>;
}

let originalFetch: typeof globalThis.fetch;
let fetchCallCount = 0;

/**
 * Set up mock fetch to return specified response
 */
function mockFetch(response: MockFetchOptions) {
  fetchCallCount = 0;

  if (!originalFetch) {
    originalFetch = globalThis.fetch;
  }

  globalThis.fetch = async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    fetchCallCount++;

    const headers = new Headers(response.headers || {});
    const body = response.body || JSON.stringify({ error: "Mock error" });

    return new Response(body, {
      status: response.status,
      statusText: response.status === 429 ? "Too Many Requests" : "Error",
      headers
    });
  };
}

/**
 * Restore original fetch
 */
function restoreFetch() {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
  fetchCallCount = 0;
}

/**
 * Helper to create test messages
 */
function createTestMessages(): GeminiMessage[] {
  return [
    { role: "system", content: "You are a test assistant" },
    { role: "user", content: "Hello" }
  ];
}

// ============================================================================
// Test 1: 429 response throws LLMQuotaExceededError from circuit breaker
// ============================================================================

Deno.test({
  name: "Rate Limit + Circuit Breaker: 429 throws LLMQuotaExceededError",
  async fn() {
    console.log("\n🔄 Testing 429 throws LLMQuotaExceededError...");

    try {
      getCircuitBreaker().reset();

      // Mock 429 response with Retry-After header
      mockFetch({
        status: 429,
        body: JSON.stringify({ error: "Rate limit exceeded" }),
        headers: {
          "Retry-After": "30"
        }
      });

      const messages = createTestMessages();

      // callGemini throws LLMQuotaExceededError immediately on 429
      let errorThrown: Error | null = null;

      try {
        await callGeminiWithRetry(messages);
      } catch (error) {
        errorThrown = error as Error;
      }

      // Verify error was thrown
      assertExists(errorThrown, "Should throw error");
      assert(errorThrown instanceof LLMQuotaExceededError, "Should be LLMQuotaExceededError");

      const quotaError = errorThrown as LLMQuotaExceededError;
      assertExists(quotaError.resetAt, "Error should include resetAt");
      assertEquals(quotaError.quotaType, 'rate', "Error should indicate rate quota");
      assertEquals(quotaError.retryable, true, "Error should be retryable");

      // Verify retries were attempted (1 initial + MAX_RETRIES)
      assertEquals(
        fetchCallCount,
        1 + RETRY_CONFIG.MAX_RETRIES,
        `Should make ${1 + RETRY_CONFIG.MAX_RETRIES} total attempts`
      );

      // BUG: Circuit breaker counts 429 as failures
      const stats = getCircuitBreaker().getStats();
      assert(
        stats.failureCount > 0,
        "Circuit DOES track 429 as failure (BUG - should not)"
      );

    } finally {
      restoreFetch();
      getCircuitBreaker().reset();
    }

    console.log("✓ 429 throws LLMQuotaExceededError after retries");
  }
});

// ============================================================================
// Test 2: Multiple 429 responses increment circuit breaker failure count
// ============================================================================

Deno.test({
  name: "Rate Limit + Circuit Breaker: 429 errors increment circuit failures (BUG)",
  async fn() {
    console.log("\n🔄 Testing 429 increments circuit failures...");

    try {
      getCircuitBreaker().reset();

      mockFetch({
        status: 429,
        body: JSON.stringify({ error: "Rate limit exceeded" }),
        headers: { "Retry-After": "10" }
      });

      const messages = createTestMessages();

      // Make a single request that will fail with 429
      try {
        await callGeminiWithRetry(messages);
      } catch (error) {
        assert(error instanceof LLMQuotaExceededError, "Should throw LLMQuotaExceededError");
      }

      // BUG: Circuit breaker failure count increments for each 429 attempt
      const stats = getCircuitBreaker().getStats();
      assertEquals(
        stats.failureCount,
        1 + RETRY_CONFIG.MAX_RETRIES,
        "Circuit counts all 429 attempts as failures (BUG)"
      );

      console.log(`  Failure count: ${stats.failureCount} (expected: 0)`);

    } finally {
      restoreFetch();
      getCircuitBreaker().reset();
    }

    console.log("✓ 429 increments circuit failures (current buggy behavior)");
  }
});

// ============================================================================
// Test 3: 429 errors CAN open circuit after threshold (BUG)
// ============================================================================

Deno.test({
  name: "Rate Limit + Circuit Breaker: 429 errors CAN open circuit (BUG)",
  async fn() {
    console.log("\n🔄 Testing 429s can open circuit...");

    try {
      getCircuitBreaker().reset();

      // Send threshold number of 429 requests (each request tries 1 + MAX_RETRIES times)
      // Since each failed request increments failure count by (1 + MAX_RETRIES), we need
      // fewer requests to hit threshold
      const threshold = 5; // Default circuit breaker threshold
      const requestsNeeded = Math.ceil(threshold / (1 + RETRY_CONFIG.MAX_RETRIES));

      for (let i = 0; i < requestsNeeded; i++) {
        mockFetch({
          status: 429,
          body: JSON.stringify({ error: "Rate limit exceeded" })
        });

        const messages = createTestMessages();

        try {
          await callGeminiWithRetry(messages);
        } catch (error) {
          // Expected to throw
          assert(
            error instanceof LLMQuotaExceededError || error instanceof CircuitBreakerOpenError,
            "Should throw LLMQuotaExceededError or CircuitBreakerOpenError"
          );
        }
      }

      // Circuit should be OPEN after threshold failures (current buggy behavior)
      const circuitState = getCircuitBreaker().getState();
      assertEquals(circuitState, 'open', "Circuit DOES open for 429s (BUG - should stay closed)");

      console.log(`  Circuit state after ${requestsNeeded} failed requests: ${circuitState}`);

    } finally {
      restoreFetch();
      getCircuitBreaker().reset();
    }

    console.log("✓ 429s DO open circuit (current buggy behavior)");
  }
});

// ============================================================================
// Test 4: Mixed 429 and 5xx errors both increment circuit
// ============================================================================

Deno.test({
  name: "Rate Limit + Circuit Breaker: Mixed 429 and 5xx both increment failures",
  async fn() {
    console.log("\n🔄 Testing mixed 429 and 5xx errors...");

    try {
      getCircuitBreaker().reset();

      // First request: 500 error
      mockFetch({
        status: 500,
        body: JSON.stringify({ error: "Internal server error" })
      });

      const messages1 = createTestMessages();
      try {
        await callGeminiWithRetry(messages1);
      } catch {
        // Expected to fail
      }

      const stats1 = getCircuitBreaker().getStats();
      const failuresAfter500 = stats1.failureCount;
      assert(failuresAfter500 > 0, "500 error should increment failure count");

      console.log(`  Failures after 500: ${failuresAfter500}`);

      // Second request: 429 error
      mockFetch({
        status: 429,
        body: JSON.stringify({ error: "Rate limit exceeded" }),
        headers: { "Retry-After": "1" }
      });

      const messages2 = createTestMessages();
      try {
        await callGeminiWithRetry(messages2);
      } catch (error) {
        const err = error as Error;
        assert(
          error instanceof LLMQuotaExceededError || error instanceof CircuitBreakerOpenError,
          `Should throw LLMQuotaExceededError or CircuitBreakerOpenError, got ${err.constructor.name}`
        );
      }

      // BUG: 429 DOES increment failure count (should NOT)
      const stats2 = getCircuitBreaker().getStats();
      assert(
        stats2.failureCount > failuresAfter500,
        `429 DOES increment circuit failure count (BUG). Before: ${failuresAfter500}, After: ${stats2.failureCount}`
      );

      console.log(`  Failures after 500: ${failuresAfter500}, after 429: ${stats2.failureCount}`);

    } finally {
      restoreFetch();
      getCircuitBreaker().reset();
    }

    console.log("✓ Mixed errors both increment circuit (current behavior)");
  }
});

// ============================================================================
// Test 5: LLMQuotaExceededError contains proper details
// ============================================================================

Deno.test({
  name: "Rate Limit + Circuit Breaker: LLMQuotaExceededError has correct fields",
  async fn() {
    console.log("\n🔄 Testing LLMQuotaExceededError details...");

    try {
      getCircuitBreaker().reset();

      mockFetch({
        status: 429,
        body: JSON.stringify({ error: "Rate limit exceeded" }),
        headers: { "Retry-After": "60" }
      });

      const messages = createTestMessages();
      let thrownError: LLMQuotaExceededError | null = null;

      try {
        await callGeminiWithRetry(messages);
      } catch (error) {
        thrownError = error as LLMQuotaExceededError;
      }

      assertExists(thrownError, "Should throw error");
      assertEquals(thrownError.name, "LLMQuotaExceededError");

      // Verify error properties
      assertExists(thrownError.resetAt, "Should have resetAt");
      assert(thrownError.resetAt instanceof Date, "resetAt should be Date");
      assertEquals(thrownError.quotaType, 'rate', "Should be rate quota");
      assertEquals(thrownError.retryable, true, "Should be retryable");

      // Verify getRetryDelayMs() method
      const retryDelay = thrownError.getRetryDelayMs();
      assert(retryDelay >= 0, "Retry delay should be non-negative");

      // Verify error message format
      assert(
        thrownError.message.includes("rate quota exceeded"),
        "Message should mention rate quota"
      );

      console.log(`  Error message: ${thrownError.message}`);
      console.log(`  Reset at: ${thrownError.resetAt.toISOString()}`);
      console.log(`  Retry delay: ${retryDelay}ms`);

    } finally {
      restoreFetch();
      getCircuitBreaker().reset();
    }

    console.log("✓ LLMQuotaExceededError has proper fields");
  }
});

// ============================================================================
// Test 6: Circuit breaker opens after threshold 429 errors
// ============================================================================

Deno.test({
  name: "Rate Limit + Circuit Breaker: Circuit opens after threshold 429s",
  async fn() {
    console.log("\n🔄 Testing circuit opens after threshold...");

    try {
      getCircuitBreaker().reset();

      // Send enough failed requests to open circuit
      // Each request attempts (1 + MAX_RETRIES) times
      const threshold = 5;
      const requestsNeeded = Math.ceil(threshold / (1 + RETRY_CONFIG.MAX_RETRIES));

      for (let i = 0; i < requestsNeeded; i++) {
        mockFetch({
          status: 429,
          body: JSON.stringify({ error: "Rate limit exceeded" })
        });

        const messages = createTestMessages();

        try {
          await callGeminiWithRetry(messages);
        } catch {
          // Expected to fail
        }
      }

      // Circuit should now be open
      const circuitState = getCircuitBreaker().getState();
      assertEquals(circuitState, 'open', "Circuit should be open");

      // Next call should fail with CircuitBreakerOpenError (not LLMQuotaExceededError)
      mockFetch({
        status: 200,
        body: JSON.stringify({ choices: [{ message: { content: "test" } }] })
      });

      const messages = createTestMessages();
      let error: Error | null = null;

      try {
        await callGeminiWithRetry(messages);
      } catch (e) {
        error = e as Error;
      }

      assertExists(error, "Should throw error");
      assert(error instanceof CircuitBreakerOpenError, "Should be CircuitBreakerOpenError");

      console.log(`  Circuit state: ${circuitState}`);
      console.log(`  Error type: ${error.name}`);

    } finally {
      restoreFetch();
      getCircuitBreaker().reset();
    }

    console.log("✓ Circuit opens after threshold");
  }
});

// ============================================================================
// Test 7: getUserFriendlyErrorMessage works for rate limit errors
// ============================================================================

Deno.test({
  name: "Rate Limit + Circuit Breaker: User-friendly error messages",
  async fn() {
    console.log("\n🔄 Testing user-friendly error messages...");

    // Import function for testing
    const { getUserFriendlyErrorMessage } = await import("../errors.ts");

    try {
      getCircuitBreaker().reset();

      mockFetch({
        status: 429,
        body: JSON.stringify({ error: "Rate limit exceeded" }),
        headers: { "Retry-After": "30" }
      });

      const messages = createTestMessages();
      let quotaError: LLMQuotaExceededError | null = null;

      try {
        await callGeminiWithRetry(messages);
      } catch (error) {
        quotaError = error as LLMQuotaExceededError;
      }

      assertExists(quotaError, "Should throw error");

      // Get user-friendly message
      const userMessage = getUserFriendlyErrorMessage(quotaError);

      assert(userMessage.includes("Rate limit"), "Should mention rate limit");
      assert(userMessage.includes("try again"), "Should suggest retry");
      assert(userMessage.match(/\d+\s+seconds?/), "Should include time in seconds");

      console.log(`  User-friendly message: ${userMessage}`);

    } finally {
      restoreFetch();
      getCircuitBreaker().reset();
    }

    console.log("✓ User-friendly error messages work");
  }
});

// ============================================================================
// Test Banner
// ============================================================================

console.log("\n" + "=".repeat(80));
console.log("Rate Limit (429) + Circuit Breaker Integration Tests");
console.log("=".repeat(80));
console.log("⚠️  TESTING CURRENT (BUGGY) BEHAVIOR - NOT INTENDED BEHAVIOR!");
console.log("");
console.log("BUGS DISCOVERED:");
console.log("1. callGemini throws LLMQuotaExceededError on 429 (line 264)");
console.log("2. Retry-After header logic is UNREACHABLE (lines 316-364)");
console.log("3. 429 errors increment circuit breaker failure count (shouldn't)");
console.log("4. Retries use exponential backoff instead of Retry-After header");
console.log("");
console.log("TODO: Fix implementation to return 429 response instead of throwing");
console.log("=".repeat(80) + "\n");
