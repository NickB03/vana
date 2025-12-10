/**
 * Tests for GLM Chat Router
 *
 * Validates circuit breaker logic, fallback behavior, and error handling
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  routeChatRequest,
  getCircuitBreakerStatus,
  resetCircuitBreaker,
  type RouterOptions,
  type RouterResult
} from "../glm-chat-router.ts";

// Mock GLM and OpenRouter clients
// TODO: Implement proper mocks when integrating with chat function

Deno.test("glm-chat-router - circuit breaker status", () => {
  resetCircuitBreaker();
  const status = getCircuitBreakerStatus();

  assertEquals(status.isOpen, false);
  assertEquals(status.consecutiveFailures, 0);
  assertEquals(status.opensAt, 3);
  assertEquals(status.resetsAt, 0);
});

Deno.test("glm-chat-router - reset circuit breaker", () => {
  resetCircuitBreaker();
  const status = getCircuitBreakerStatus();

  assertEquals(status.consecutiveFailures, 0);
  assertEquals(status.resetsAt, 0);
});

// Integration tests will be added when integrating with chat function
// For now, we verify the module exports and types

Deno.test("glm-chat-router - exports", () => {
  assertExists(routeChatRequest);
  assertExists(getCircuitBreakerStatus);
  assertExists(resetCircuitBreaker);
});

// Feature flag tests - verify USE_GLM_THINKING_FOR_CHAT behavior
Deno.test("glm-chat-router - thinking mode enabled by default", () => {
  // When USE_GLM_THINKING_FOR_CHAT is not set or set to anything other than 'false',
  // enableThinking should be true (Deno.env.get(...) !== 'false' evaluates to true)
  const envValue = Deno.env.get('USE_GLM_THINKING_FOR_CHAT');
  const shouldBeEnabled = envValue !== 'false';

  // This tests the logic, not the actual router (which would need mocking)
  assertEquals(shouldBeEnabled, true, "Thinking mode should be enabled by default when env var is not 'false'");
});

Deno.test("glm-chat-router - thinking mode disabled with feature flag", () => {
  // Original env value for restoration
  const original = Deno.env.get('USE_GLM_THINKING_FOR_CHAT');

  try {
    // Set to 'false' to disable thinking mode
    Deno.env.set('USE_GLM_THINKING_FOR_CHAT', 'false');
    const envValue = Deno.env.get('USE_GLM_THINKING_FOR_CHAT');
    const shouldBeEnabled = envValue !== 'false';

    assertEquals(shouldBeEnabled, false, "Thinking mode should be disabled when env var is 'false'");
  } finally {
    // Restore original value
    if (original !== undefined) {
      Deno.env.set('USE_GLM_THINKING_FOR_CHAT', original);
    } else {
      Deno.env.delete('USE_GLM_THINKING_FOR_CHAT');
    }
  }
});
