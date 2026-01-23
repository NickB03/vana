/**
 * Tests for Circuit Breaker Pattern Implementation
 *
 * Validates state transitions, failure threshold tracking, fallback execution,
 * and half-open recovery behavior.
 *
 * @module circuit-breaker.test
 */

import { assertEquals, assertRejects, assertStrictEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { CircuitBreaker, createGeminiCircuitBreaker } from "../circuit-breaker.ts";
import { CircuitBreakerOpenError } from "../errors.ts";
import { getCircuitBreaker } from "../gemini-client.ts";

/**
 * Helper to create a failing function
 */
function createFailingFn(error: Error = new Error("Test failure")) {
  return async () => {
    throw error;
  };
}

/**
 * Helper to create a successful function
 */
function createSuccessFn<T>(result: T) {
  return async () => result;
}

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// STATE TRANSITION TESTS
// =============================================================================

Deno.test("CircuitBreaker - starts in closed state", () => {
  const cb = new CircuitBreaker();
  assertEquals(cb.getState(), "closed");
  assertEquals(cb.getFailureCount(), 0);
});

Deno.test("CircuitBreaker - transitions to open after failure threshold", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeoutMs: 1000,
    name: "test-threshold"
  });

  // Cause 3 failures
  for (let i = 0; i < 3; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  assertEquals(cb.getState(), "open");
  assertEquals(cb.getFailureCount(), 3);
});

Deno.test("CircuitBreaker - stays closed below failure threshold", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 1000,
    name: "test-below-threshold"
  });

  // Cause 4 failures (below threshold of 5)
  for (let i = 0; i < 4; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  assertEquals(cb.getState(), "closed");
  assertEquals(cb.getFailureCount(), 4);
});

Deno.test("CircuitBreaker - transitions to half-open after timeout", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeoutMs: 50, // Short timeout for testing
    name: "test-half-open"
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  assertEquals(cb.getState(), "open");

  // Wait for timeout
  await delay(60);

  // State should transition to half-open on next check
  assertEquals(cb.getState(), "half-open");
});

Deno.test("CircuitBreaker - closes after success in half-open state", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeoutMs: 50,
    name: "test-half-open-success"
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  // Wait for half-open
  await delay(60);
  assertEquals(cb.getState(), "half-open");

  // Successful call should close the circuit
  const result = await cb.call(createSuccessFn("success"));
  assertEquals(result, "success");
  assertEquals(cb.getState(), "closed");
  assertEquals(cb.getFailureCount(), 0);
});

Deno.test("CircuitBreaker - reopens after failure in half-open state", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeoutMs: 50,
    name: "test-half-open-failure"
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  // Wait for half-open
  await delay(60);
  assertEquals(cb.getState(), "half-open");

  // Failed call should reopen the circuit
  try {
    await cb.call(createFailingFn());
  } catch {
    // Expected
  }

  assertEquals(cb.getState(), "open");
});

// =============================================================================
// SUCCESS/FAILURE TRACKING TESTS
// =============================================================================

Deno.test("CircuitBreaker - resets failure count on success", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 1000,
    name: "test-reset"
  });

  // Cause 3 failures
  for (let i = 0; i < 3; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  assertEquals(cb.getFailureCount(), 3);

  // Success should reset failure count
  await cb.call(createSuccessFn("ok"));
  assertEquals(cb.getFailureCount(), 0);
});

Deno.test("CircuitBreaker - tracks stats correctly", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 10,
    resetTimeoutMs: 1000,
    name: "test-stats"
  });

  // 3 successful calls
  for (let i = 0; i < 3; i++) {
    await cb.call(createSuccessFn("ok"));
  }

  // 2 failed calls
  for (let i = 0; i < 2; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  const stats = cb.getStats();
  assertEquals(stats.totalCalls, 5);
  assertEquals(stats.totalSuccesses, 3);
  assertEquals(stats.totalFailures, 2);
  assertEquals(stats.successRate, 0.6);
});

// =============================================================================
// FALLBACK TESTS
// =============================================================================

Deno.test("CircuitBreaker - uses fallback when circuit is open", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeoutMs: 1000,
    name: "test-fallback"
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  assertEquals(cb.getState(), "open");

  // Call with fallback
  const result = await cb.call(
    createFailingFn(new Error("Primary failed")),
    createSuccessFn("fallback result")
  );

  assertEquals(result, "fallback result");
});

Deno.test("CircuitBreaker - throws CircuitBreakerOpenError without fallback", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeoutMs: 1000,
    name: "test-no-fallback"
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  // Call without fallback should throw CircuitBreakerOpenError
  await assertRejects(
    async () => {
      await cb.call(createFailingFn());
    },
    CircuitBreakerOpenError,
    "Circuit breaker is OPEN"
  );
});

Deno.test("CircuitBreaker - propagates fallback errors", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeoutMs: 1000,
    name: "test-fallback-error"
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  // Fallback also fails
  await assertRejects(
    async () => {
      await cb.call(
        createFailingFn(new Error("Primary failed")),
        createFailingFn(new Error("Fallback also failed"))
      );
    },
    Error,
    "Fallback also failed"
  );
});

Deno.test("CircuitBreaker - fallback success does NOT close circuit", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeoutMs: 60000,
    name: "test-fallback-no-recovery"
  });

  // Open circuit by triggering threshold failures
  for (let i = 0; i < 2; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  assertEquals(cb.getState(), "open");

  // Use fallback while circuit is open
  const result = await cb.call(
    createFailingFn(new Error("Primary")),
    createSuccessFn("fallback")
  );

  assertEquals(result, "fallback");

  // Circuit should STILL be open - fallback success doesn't count as recovery
  assertEquals(cb.getState(), "open");

  // Failure count should remain at threshold
  assertEquals(cb.getFailureCount(), 2);
});

// =============================================================================
// RESET TESTS
// =============================================================================

Deno.test("CircuitBreaker - manual reset returns to closed state", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 2,
    resetTimeoutMs: 60000, // Long timeout
    name: "test-manual-reset"
  });

  // Open the circuit
  for (let i = 0; i < 2; i++) {
    try {
      await cb.call(createFailingFn());
    } catch {
      // Expected
    }
  }

  assertEquals(cb.getState(), "open");

  // Manual reset
  cb.reset();

  assertEquals(cb.getState(), "closed");
  assertEquals(cb.getFailureCount(), 0);
});

// =============================================================================
// FACTORY FUNCTION TESTS
// =============================================================================

Deno.test("createGeminiCircuitBreaker - creates breaker with default config", () => {
  const cb = createGeminiCircuitBreaker();

  assertEquals(cb.getState(), "closed");
  assertEquals(cb.getFailureCount(), 0);

  // Verify it's a CircuitBreaker instance
  const stats = cb.getStats();
  assertEquals(stats.state, "closed");
  assertEquals(stats.totalCalls, 0);
});

Deno.test("getCircuitBreaker - returns same instance (singleton)", () => {
  const cb1 = getCircuitBreaker();
  const cb2 = getCircuitBreaker();
  assertStrictEquals(cb1, cb2);
});

// =============================================================================
// CONCURRENT CALL TESTS
// =============================================================================

Deno.test("CircuitBreaker - handles concurrent calls correctly", async () => {
  const cb = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 1000,
    name: "test-concurrent"
  });

  // Launch 10 concurrent successful calls
  const promises = Array(10).fill(null).map(() =>
    cb.call(createSuccessFn("ok"))
  );

  const results = await Promise.all(promises);

  assertEquals(results.length, 10);
  results.forEach((r) => assertEquals(r, "ok"));

  const stats = cb.getStats();
  assertEquals(stats.totalCalls, 10);
  assertEquals(stats.totalSuccesses, 10);
});
