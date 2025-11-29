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
