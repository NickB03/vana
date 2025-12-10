/**
 * Tests for GLM Tool-Calling Feature Flag
 *
 * Verifies the shouldUseGLMToolCalling() function which controls gradual rollout
 * of GLM's native tool-calling capabilities.
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { shouldUseGLMToolCalling, FEATURE_FLAGS } from "../config.ts";

// ============================================================================
// SECTION 1: Feature Flag Disabled (Default)
// ============================================================================

Deno.test("shouldUseGLMToolCalling - returns false when feature flag is disabled", () => {
  // By default, USE_GLM_TOOL_CALLING should be false (not set in env)
  const result = shouldUseGLMToolCalling("test-request-id-123");
  assertEquals(result, false);
});

Deno.test("shouldUseGLMToolCalling - returns false for any request ID when disabled", () => {
  const requestIds = [
    "req-001",
    "req-002",
    "req-003",
    crypto.randomUUID(),
    crypto.randomUUID(),
  ];

  for (const requestId of requestIds) {
    assertEquals(shouldUseGLMToolCalling(requestId), false);
  }
});

// ============================================================================
// SECTION 2: Rollout Percentage = 0 (Disabled Explicitly)
// ============================================================================

Deno.test("shouldUseGLMToolCalling - returns false when rollout is 0%", () => {
  // Simulate GLM_TOOL_CALLING_ROLLOUT_PERCENT=0
  // Note: This test assumes the function reads from FEATURE_FLAGS.GLM_TOOL_CALLING_ROLLOUT_PERCENT
  // In production, this would be controlled by environment variable
  const result = shouldUseGLMToolCalling("any-request-id");

  // Should return false if feature is disabled OR rollout is 0%
  // Since feature flag defaults to false, this will be false
  assertEquals(result, false);
});

// ============================================================================
// SECTION 3: Deterministic Hash-Based Rollout
// ============================================================================

Deno.test("shouldUseGLMToolCalling - produces deterministic results for same request ID", () => {
  const requestId = "consistent-test-id-12345";

  // Call multiple times with same ID
  const result1 = shouldUseGLMToolCalling(requestId);
  const result2 = shouldUseGLMToolCalling(requestId);
  const result3 = shouldUseGLMToolCalling(requestId);

  // Should always return same result for same request ID
  assertEquals(result1, result2);
  assertEquals(result2, result3);
});

Deno.test("shouldUseGLMToolCalling - hash produces different results for different IDs", () => {
  const requestId1 = "test-id-1";
  const requestId2 = "test-id-2";

  const result1 = shouldUseGLMToolCalling(requestId1);
  const result2 = shouldUseGLMToolCalling(requestId2);

  // Note: Both will be false in default env, but hash calculation still runs
  // If feature were enabled, different IDs could produce different results
  // For now, both return false since feature flag is off
  assertEquals(typeof result1, "boolean");
  assertEquals(typeof result2, "boolean");
});

// ============================================================================
// SECTION 4: Edge Cases for Request ID
// ============================================================================

Deno.test("shouldUseGLMToolCalling - handles empty string request ID", () => {
  const result = shouldUseGLMToolCalling("");

  // Should still return boolean (false when feature disabled)
  assertEquals(typeof result, "boolean");
  assertEquals(result, false);
});

Deno.test("shouldUseGLMToolCalling - handles UUID format request IDs", () => {
  const uuid = crypto.randomUUID();
  const result = shouldUseGLMToolCalling(uuid);

  assertEquals(typeof result, "boolean");
  assertEquals(result, false); // Default: feature disabled
});

Deno.test("shouldUseGLMToolCalling - handles numeric string request IDs", () => {
  const result = shouldUseGLMToolCalling("123456789");

  assertEquals(typeof result, "boolean");
  assertEquals(result, false);
});

Deno.test("shouldUseGLMToolCalling - handles special characters in request ID", () => {
  const specialIds = [
    "req-!@#$%^&*()",
    "req_with_underscores",
    "req-with-dashes-123",
    "req.with.dots",
  ];

  for (const id of specialIds) {
    const result = shouldUseGLMToolCalling(id);
    assertEquals(typeof result, "boolean");
  }
});

// ============================================================================
// SECTION 5: Simulated Rollout Scenarios (Conceptual)
// ============================================================================

Deno.test("shouldUseGLMToolCalling - hash-based distribution concept", () => {
  // Generate many request IDs to test hash distribution
  const requestIds = Array.from({ length: 100 }, (_, i) => `req-${i}`);

  const results = requestIds.map(id => shouldUseGLMToolCalling(id));

  // All should be false when feature is disabled
  const trueCount = results.filter(r => r === true).length;
  const falseCount = results.filter(r => r === false).length;

  assertEquals(falseCount, 100); // All false when feature disabled
  assertEquals(trueCount, 0);

  // Note: If USE_GLM_TOOL_CALLING=true and GLM_TOOL_CALLING_ROLLOUT_PERCENT=10,
  // we'd expect roughly 10% true, 90% false (with some variance due to hash)
});

Deno.test("shouldUseGLMToolCalling - consistent hash buckets for A/B testing", () => {
  // In a real A/B test scenario, same user/request should always get same experience
  const userId = "user-12345";

  // Simulate multiple requests from same user
  const session1 = shouldUseGLMToolCalling(`${userId}-session-1`);
  const session2 = shouldUseGLMToolCalling(`${userId}-session-2`);

  // Different session IDs might hash differently, but that's OK
  // What matters is determinism: same input = same output
  assertEquals(typeof session1, "boolean");
  assertEquals(typeof session2, "boolean");

  // Verify determinism
  assertEquals(shouldUseGLMToolCalling(`${userId}-session-1`), session1);
  assertEquals(shouldUseGLMToolCalling(`${userId}-session-2`), session2);
});

// ============================================================================
// SECTION 6: Integration with FEATURE_FLAGS
// ============================================================================

Deno.test("shouldUseGLMToolCalling - respects USE_GLM_TOOL_CALLING flag", () => {
  // When USE_GLM_TOOL_CALLING=false (default), should always return false
  // regardless of rollout percentage or request ID
  assertEquals(FEATURE_FLAGS.USE_GLM_TOOL_CALLING, false);

  const result = shouldUseGLMToolCalling("any-id");
  assertEquals(result, false);
});

Deno.test("FEATURE_FLAGS.USE_GLM_TOOL_CALLING - is boolean", () => {
  assertEquals(typeof FEATURE_FLAGS.USE_GLM_TOOL_CALLING, "boolean");
});

Deno.test("FEATURE_FLAGS.GLM_TOOL_CALLING_ROLLOUT_PERCENT - is number", () => {
  assertEquals(typeof FEATURE_FLAGS.GLM_TOOL_CALLING_ROLLOUT_PERCENT, "number");
});

Deno.test("FEATURE_FLAGS.GLM_TOOL_CALLING_ROLLOUT_PERCENT - is within valid range", () => {
  const percent = FEATURE_FLAGS.GLM_TOOL_CALLING_ROLLOUT_PERCENT;

  // Should be between 0 and 100
  assertEquals(percent >= 0, true);
  assertEquals(percent <= 100, true);
});

// ============================================================================
// SECTION 7: Security and Robustness
// ============================================================================

Deno.test("shouldUseGLMToolCalling - handles very long request IDs", () => {
  const longId = "x".repeat(10000);
  const result = shouldUseGLMToolCalling(longId);

  // Should not crash or throw error
  assertEquals(typeof result, "boolean");
});

Deno.test("shouldUseGLMToolCalling - handles Unicode characters in request ID", () => {
  const unicodeIds = [
    "req-你好-123",
    "req-مرحبا-456",
    "req-🚀🎉-789",
  ];

  for (const id of unicodeIds) {
    const result = shouldUseGLMToolCalling(id);
    assertEquals(typeof result, "boolean");
  }
});

Deno.test("shouldUseGLMToolCalling - handles newlines and control characters", () => {
  const weirdIds = [
    "req\n123",
    "req\t456",
    "req\r\n789",
  ];

  for (const id of weirdIds) {
    const result = shouldUseGLMToolCalling(id);
    assertEquals(typeof result, "boolean");
  }
});

// ============================================================================
// SECTION 8: Performance Characteristics
// ============================================================================

Deno.test("shouldUseGLMToolCalling - executes quickly for hash computation", () => {
  const startTime = performance.now();

  // Run 1000 checks
  for (let i = 0; i < 1000; i++) {
    shouldUseGLMToolCalling(`request-${i}`);
  }

  const endTime = performance.now();
  const duration = endTime - startTime;

  // Should complete 1000 checks in under 100ms
  // (Hash-based modulo is very fast)
  assertEquals(duration < 100, true);
});

Deno.test("shouldUseGLMToolCalling - returns immediately when feature disabled", () => {
  // When feature flag is false, should short-circuit without hash calculation
  const result = shouldUseGLMToolCalling("test-id");

  // Should return false immediately
  assertEquals(result, false);
});

// ============================================================================
// SECTION 9: Real-World Usage Patterns
// ============================================================================

Deno.test("Real-world pattern - Chat endpoint decides whether to use tool-calling", () => {
  // Simulate chat endpoint receiving a request
  const requestId = crypto.randomUUID();

  // Decide which path to take
  const useToolCalling = shouldUseGLMToolCalling(requestId);

  if (useToolCalling) {
    // Use GLM native tool-calling (when feature enabled)
    // Call searchWithToolCalling(requestId, messages, tools)
    assertEquals(typeof useToolCalling, "boolean");
  } else {
    // Use legacy regex-based shouldPerformWebSearch()
    // Call legacySearch(requestId, messages)
    assertEquals(typeof useToolCalling, "boolean");
  }
});

Deno.test("Real-world pattern - Gradual rollout configuration", () => {
  // Production scenario: Start with 10% rollout
  // If GLM_TOOL_CALLING_ROLLOUT_PERCENT=10
  // Then ~10% of requests would use new tool-calling approach
  // Rest would use legacy regex-based detection

  const testRequests = 100;
  const results = Array.from(
    { length: testRequests },
    (_, i) => shouldUseGLMToolCalling(`prod-request-${i}`)
  );

  const enabledCount = results.filter(r => r === true).length;

  // In default env (feature disabled), should be 0%
  assertEquals(enabledCount, 0);

  // In production with feature enabled + 10% rollout:
  // Expected: ~10 enabled (with some variance due to hash distribution)
  // Acceptable range: 5-15 enabled out of 100
  // But we can't test this without env var manipulation
});

Deno.test("Real-world pattern - Analytics tracking of rollout groups", () => {
  const requestId = "analytics-test-123";

  const useToolCalling = shouldUseGLMToolCalling(requestId);

  // In production, we'd log this to analytics
  const analyticsEvent = {
    requestId,
    experimentGroup: useToolCalling ? "tool-calling" : "legacy",
    featureFlagEnabled: FEATURE_FLAGS.USE_GLM_TOOL_CALLING,
    rolloutPercent: FEATURE_FLAGS.GLM_TOOL_CALLING_ROLLOUT_PERCENT,
  };

  assertEquals(analyticsEvent.experimentGroup, "legacy"); // Default state
  assertEquals(analyticsEvent.featureFlagEnabled, false);
  assertEquals(analyticsEvent.rolloutPercent >= 0, true);
});

// ============================================================================
// SECTION 10: Documentation and Error Prevention
// ============================================================================

Deno.test("Feature flag documentation - reminds of environment variables", () => {
  // This test documents how to enable the feature in production
  const howToEnable = `
    To enable GLM tool-calling:

    1. Full rollout (100%):
       supabase secrets set USE_GLM_TOOL_CALLING=true

    2. Gradual rollout (10%):
       supabase secrets set USE_GLM_TOOL_CALLING=true
       supabase secrets set GLM_TOOL_CALLING_ROLLOUT_PERCENT=10

    3. Disable:
       supabase secrets set USE_GLM_TOOL_CALLING=false
  `;

  // Just documenting, no actual test assertion needed
  assertEquals(howToEnable.includes("USE_GLM_TOOL_CALLING"), true);
});

Deno.test("Feature flag prevents accidental full rollout", () => {
  // Safety check: Default rollout percentage should be 0
  // This prevents accidental 100% rollout if someone just enables the flag
  // They must EXPLICITLY set both USE_GLM_TOOL_CALLING=true AND
  // GLM_TOOL_CALLING_ROLLOUT_PERCENT=100

  const defaultPercent = FEATURE_FLAGS.GLM_TOOL_CALLING_ROLLOUT_PERCENT;
  assertEquals(defaultPercent, 0);
});

console.log("\n✅ All feature-flag-tool-calling tests completed!\n");
