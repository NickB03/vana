/**
 * Integration Tests for Circuit Breaker + Retry Interaction
 *
 * These tests verify that the circuit breaker and retry logic work correctly together:
 * - Circuit breaker tracks failures during retry sequences
 * - Circuit opens after failure threshold is exceeded
 * - Retry logic respects circuit breaker state
 * - Circuit transitions (closed -> open -> half-open -> closed) work correctly
 * - No race conditions between retries and circuit state transitions
 *
 * Key Components Under Test:
 * - CircuitBreaker class (circuit-breaker.ts)
 * - callGeminiWithRetry function (gemini-client.ts)
 *
 * To run:
 * deno test --allow-net --allow-env circuit-breaker-retry-integration.test.ts
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CircuitBreaker, CircuitState } from '../circuit-breaker.ts';
import { CircuitBreakerOpenError, LLMQuotaExceededError } from '../errors.ts';

/**
 * Helper: Create a circuit breaker with custom config for testing
 */
function createTestCircuitBreaker(config?: {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  name?: string;
}): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: config?.failureThreshold ?? 3,
    resetTimeoutMs: config?.resetTimeoutMs ?? 1000,
    name: config?.name ?? 'TestCircuit'
  });
}

/**
 * Helper: Mock function that fails a specified number of times
 */
function createMockFunction(failCount: number, successValue = 'success'): {
  fn: () => Promise<string>;
  callCount: number;
  resetCallCount: () => void;
} {
  let callCount = 0;
  return {
    fn: async () => {
      callCount++;
      if (callCount <= failCount) {
        throw new Error(`Mock failure ${callCount}`);
      }
      return successValue;
    },
    get callCount() {
      return callCount;
    },
    resetCallCount: () => {
      callCount = 0;
    }
  };
}

/**
 * Helper: Retry logic with exponential backoff (simplified version of callGeminiWithRetry)
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  initialDelayMs: number = 100,
  backoffMultiplier: number = 2
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on circuit breaker open errors
      if (error instanceof CircuitBreakerOpenError) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delayMs = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt),
          10000
        );
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Retry exhausted');
}

// ============================================================================
// Test 1: Circuit opens during retry sequence
// ============================================================================

Deno.test({
  name: "Circuit Breaker + Retry: Circuit opens during retry sequence",
  async fn() {
    console.log("\n🔄 Testing circuit opening during retries...");

    const circuitBreaker = createTestCircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 30000,
      name: 'RetryTest'
    });

    // Mock function that always fails
    const mockFn = createMockFunction(100); // Fails 100 times (more than we'll call it)

    try {
      // Attempt with retry logic - should fail 3 times (1 initial + 2 retries)
      await retryWithBackoff(
        () => circuitBreaker.call(mockFn.fn),
        2, // max 2 retries
        10, // 10ms initial delay for fast testing
        2   // 2x backoff
      );
    } catch (error) {
      // Expected to fail
    }

    // Circuit should still be closed (3 failures < 5 threshold)
    const stats1 = circuitBreaker.getStats();
    assertEquals(stats1.state, 'closed', 'Circuit should remain closed after first attempt');
    assertEquals(stats1.failureCount, 3, 'Should have 3 failures (1 + 2 retries)');
    assertEquals(stats1.totalFailures, 3, 'Total failures should be 3');

    // Second attempt - will open circuit after 2 failures (reaching 5 total)
    try {
      await retryWithBackoff(
        () => circuitBreaker.call(mockFn.fn),
        2,
        10,
        2
      );
    } catch (error) {
      // Expected to fail
    }

    // Circuit should now be open (5 failures = threshold)
    const stats2 = circuitBreaker.getStats();
    assertEquals(stats2.state, 'open', 'Circuit should open after exceeding threshold');
    // Note: Circuit opens on 5th failure, so retry logic stops
    assert(stats2.totalFailures >= 5, `Total failures should be at least 5 (got ${stats2.totalFailures})`);

    // Next call should throw CircuitBreakerOpenError immediately (no retries attempted)
    let caughtError: Error | null = null;
    try {
      await retryWithBackoff(
        () => circuitBreaker.call(mockFn.fn),
        2,
        10,
        2
      );
    } catch (error) {
      caughtError = error as Error;
    }

    assertExists(caughtError, 'Should throw error when circuit is open');
    assert(
      caughtError instanceof CircuitBreakerOpenError,
      'Should throw CircuitBreakerOpenError'
    );

    // Call count should be 5 (circuit opened after 5th failure, preventing more calls)
    assertEquals(
      mockFn.callCount,
      5,
      'Mock function should not be called when circuit is open (stops at 5)'
    );

    console.log("✓ Circuit opens correctly during retry sequence");
    console.log(`  Total calls before circuit opened: ${mockFn.callCount}`);
    console.log(`  Circuit state: ${stats2.state}`);
  }
});

// ============================================================================
// Test 2: Circuit half-open allows retry attempt
// ============================================================================

Deno.test({
  name: "Circuit Breaker + Retry: Half-open state allows retry attempt",
  async fn() {
    console.log("\n🔄 Testing half-open state with retries...");

    const circuitBreaker = createTestCircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 500, // 500ms for faster testing
      name: 'HalfOpenTest'
    });

    // Force circuit to open by causing 3 failures
    const failingFn = createMockFunction(10);
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.call(failingFn.fn);
      } catch (error) {
        // Expected
      }
    }

    // Verify circuit is open
    assertEquals(circuitBreaker.getState(), 'open', 'Circuit should be open');

    // Wait for reset timeout to transition to half-open
    await new Promise(resolve => setTimeout(resolve, 600));

    // Circuit should now be half-open
    assertEquals(
      circuitBreaker.getState(),
      'half-open',
      'Circuit should transition to half-open'
    );

    // Attempt with retry - if it succeeds, circuit closes
    const successFn = createMockFunction(0, 'recovered');
    const result = await retryWithBackoff(
      () => circuitBreaker.call(successFn.fn),
      2,
      10,
      2
    );

    assertEquals(result, 'recovered', 'Should succeed in half-open state');
    assertEquals(
      circuitBreaker.getState(),
      'closed',
      'Circuit should close after success in half-open'
    );

    const stats = circuitBreaker.getStats();
    assertEquals(stats.failureCount, 0, 'Failure count should reset after closing');

    console.log("✓ Half-open state allows successful recovery");
    console.log(`  Circuit state after recovery: ${circuitBreaker.getState()}`);
  }
});

// ============================================================================
// Test 3: Circuit half-open reopens on retry failure
// ============================================================================

Deno.test({
  name: "Circuit Breaker + Retry: Half-open reopens on failure",
  async fn() {
    console.log("\n🔄 Testing half-open reopening on failure...");

    const circuitBreaker = createTestCircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 500,
      name: 'ReopenTest'
    });

    // Force circuit to open
    const failingFn = createMockFunction(10);
    for (let i = 0; i < 3; i++) {
      try {
        await circuitBreaker.call(failingFn.fn);
      } catch (error) {
        // Expected
      }
    }

    assertEquals(circuitBreaker.getState(), 'open', 'Circuit should be open');

    // Wait for half-open transition
    await new Promise(resolve => setTimeout(resolve, 600));
    assertEquals(circuitBreaker.getState(), 'half-open', 'Should be half-open');

    // Attempt that fails in half-open state - should immediately reopen circuit
    try {
      await circuitBreaker.call(failingFn.fn);
    } catch (error) {
      // Expected to fail
    }

    // Circuit should reopen immediately (no retries needed to trigger reopen)
    assertEquals(
      circuitBreaker.getState(),
      'open',
      'Circuit should reopen after failure in half-open'
    );

    // Total call count should be 4 (3 to open initially + 1 in half-open)
    assertEquals(failingFn.callCount, 4, 'Should have 4 total attempts');

    console.log("✓ Half-open correctly reopens on failure");
    console.log(`  Circuit state after reopen: ${circuitBreaker.getState()}`);
  }
});

// ============================================================================
// Test 4: Retry delay vs circuit breaker timing
// ============================================================================

Deno.test({
  name: "Circuit Breaker + Retry: Retry delays don't interfere with circuit timing",
  async fn() {
    console.log("\n⏱️  Testing retry timing vs circuit breaker timing...");

    const circuitBreaker = createTestCircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 1000,
      name: 'TimingTest'
    });

    const failingFn = createMockFunction(10);
    const startTime = Date.now();

    // First attempt with retry (2 failures with delays)
    try {
      await retryWithBackoff(
        () => circuitBreaker.call(failingFn.fn),
        1, // 1 retry
        100, // 100ms delay
        2
      );
    } catch (error) {
      // Expected
    }

    const afterFirstAttempt = Date.now();
    const firstAttemptDuration = afterFirstAttempt - startTime;

    // Should have taken at least 100ms (one retry delay)
    assert(
      firstAttemptDuration >= 100,
      `First attempt should take at least 100ms (took ${firstAttemptDuration}ms)`
    );

    // Circuit should now be open (2 failures = threshold)
    assertEquals(circuitBreaker.getState(), 'open', 'Circuit should be open');

    // Next call should fail immediately (no retry delays)
    const immediateStartTime = Date.now();
    try {
      await retryWithBackoff(
        () => circuitBreaker.call(failingFn.fn),
        1,
        100,
        2
      );
    } catch (error) {
      assert(
        error instanceof CircuitBreakerOpenError,
        'Should throw CircuitBreakerOpenError'
      );
    }

    const immediateDuration = Date.now() - immediateStartTime;

    // Should fail immediately (< 50ms) when circuit is open
    assert(
      immediateDuration < 50,
      `Should fail immediately when circuit open (took ${immediateDuration}ms)`
    );

    console.log("✓ Retry delays work correctly with circuit breaker");
    console.log(`  First attempt duration: ${firstAttemptDuration}ms`);
    console.log(`  Circuit open rejection: ${immediateDuration}ms`);
  }
});

// ============================================================================
// Test 5: Multiple concurrent calls during circuit transition
// ============================================================================

Deno.test({
  name: "Circuit Breaker + Retry: Concurrent calls during circuit transition",
  async fn() {
    console.log("\n🔄 Testing concurrent calls during circuit transitions...");

    const circuitBreaker = createTestCircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 500,
      name: 'ConcurrentTest'
    });

    // Create a shared counter to track total calls
    let totalCalls = 0;
    const failingFn = async () => {
      totalCalls++;
      throw new Error(`Concurrent failure ${totalCalls}`);
    };

    // Launch 5 concurrent requests (each with retry logic)
    const promises = Array.from({ length: 5 }, (_, i) =>
      retryWithBackoff(
        () => circuitBreaker.call(failingFn),
        1, // 1 retry each
        10,
        2
      ).catch(error => ({ error, index: i }))
    );

    const results = await Promise.all(promises);

    // All should fail
    results.forEach(result => {
      assertExists(result.error, 'All concurrent calls should fail');
    });

    // Circuit should be open (exceeded threshold of 3)
    assertEquals(circuitBreaker.getState(), 'open', 'Circuit should be open');

    const stats = circuitBreaker.getStats();
    assert(
      stats.totalFailures >= 3,
      `Should have at least 3 failures (got ${stats.totalFailures})`
    );

    // Some requests may have been rejected by circuit breaker before attempting
    assert(
      totalCalls <= 10,
      `Total calls should be <= 10 (5 requests × 2 max attempts), got ${totalCalls}`
    );

    console.log("✓ Concurrent calls handled correctly during circuit transitions");
    console.log(`  Total calls attempted: ${totalCalls}`);
    console.log(`  Circuit state: ${circuitBreaker.getState()}`);
    console.log(`  Total failures tracked: ${stats.totalFailures}`);
  }
});

// ============================================================================
// Test 6: Exponential backoff with circuit breaker
// ============================================================================

Deno.test({
  name: "Circuit Breaker + Retry: Exponential backoff respects circuit state",
  async fn() {
    console.log("\n⏱️  Testing exponential backoff with circuit breaker...");

    const circuitBreaker = createTestCircuitBreaker({
      failureThreshold: 5,
      resetTimeoutMs: 2000,
      name: 'BackoffTest'
    });

    const failingFn = createMockFunction(20);
    const retryDelays: number[] = [];

    // Custom retry logic that tracks delays
    const retryWithTracking = async (maxRetries: number): Promise<void> => {
      let lastError: Error | undefined;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await circuitBreaker.call(failingFn.fn);
          return;
        } catch (error) {
          lastError = error as Error;

          if (error instanceof CircuitBreakerOpenError) {
            throw error;
          }

          if (attempt < maxRetries) {
            const delayMs = 100 * Math.pow(2, attempt); // 100, 200, 400ms
            retryDelays.push(delayMs);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }
        }
      }

      throw lastError;
    };

    // First attempt sequence (fails 3 times with backoff)
    try {
      await retryWithTracking(2);
    } catch (error) {
      // Expected
    }

    // Verify backoff delays were applied
    assertEquals(retryDelays.length, 2, 'Should have 2 retry delays');
    assertEquals(retryDelays[0], 100, 'First retry delay should be 100ms');
    assertEquals(retryDelays[1], 200, 'Second retry delay should be 200ms');

    // Second attempt sequence (2 more failures opens circuit)
    retryDelays.length = 0; // Reset
    try {
      await retryWithTracking(2);
    } catch (error) {
      // Expected
    }

    // Circuit should now be open
    assertEquals(circuitBreaker.getState(), 'open', 'Circuit should be open');

    // Third attempt should fail immediately (no delays)
    retryDelays.length = 0;
    try {
      await retryWithTracking(2);
    } catch (error) {
      assert(
        error instanceof CircuitBreakerOpenError,
        'Should throw CircuitBreakerOpenError'
      );
    }

    // No retry delays should have been recorded (circuit rejected immediately)
    assertEquals(
      retryDelays.length,
      0,
      'No retry delays when circuit is open'
    );

    console.log("✓ Exponential backoff respects circuit breaker state");
    console.log(`  Circuit state: ${circuitBreaker.getState()}`);
  }
});

// ============================================================================
// Test 7: Circuit breaker with rate limit errors
// ============================================================================

Deno.test({
  name: "Circuit Breaker + Retry: Handles rate limit errors correctly",
  async fn() {
    console.log("\n🚦 Testing circuit breaker with rate limit errors...");

    const circuitBreaker = createTestCircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      name: 'RateLimitTest'
    });

    // Mock function that throws rate limit errors
    let callCount = 0;
    const rateLimitFn = async () => {
      callCount++;
      const resetAt = new Date(Date.now() + 60000); // 1 minute
      throw new LLMQuotaExceededError(resetAt, 'rate');
    };

    // Attempt with retries - rate limit errors should count toward circuit breaker
    try {
      await retryWithBackoff(
        () => circuitBreaker.call(rateLimitFn),
        2,
        10,
        2
      );
    } catch (error) {
      assert(
        error instanceof LLMQuotaExceededError,
        'Should throw LLMQuotaExceededError'
      );
    }

    // Circuit should still be closed (3 failures = threshold)
    const stats = circuitBreaker.getStats();
    assertEquals(stats.failureCount, 3, 'Should track rate limit failures');

    // One more attempt should open the circuit
    try {
      await circuitBreaker.call(rateLimitFn);
    } catch (error) {
      // Expected
    }

    // Circuit should now be open
    assertEquals(
      circuitBreaker.getState(),
      'open',
      'Circuit should open after rate limit failures exceed threshold'
    );

    console.log("✓ Circuit breaker tracks rate limit errors correctly");
    console.log(`  Circuit state: ${circuitBreaker.getState()}`);
    console.log(`  Total rate limit failures: ${stats.totalFailures + 1}`);
  }
});

// ============================================================================
// Test Banner
// ============================================================================

console.log("\n" + "=".repeat(70));
console.log("Circuit Breaker + Retry Integration Tests");
console.log("=".repeat(70));
console.log("Tests verify circuit breaker and retry logic work correctly together");
console.log("=".repeat(70) + "\n");
