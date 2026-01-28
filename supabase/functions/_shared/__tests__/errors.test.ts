/**
 * Tests for Structured Error Types
 *
 * Validates error class construction, retryable detection,
 * and user-friendly message extraction.
 *
 * @module errors.test
 */

import { assertEquals, assertInstanceOf } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  ArtifactParseError,
  LLMQuotaExceededError,
  LLMTimeoutError,
  CircuitBreakerOpenError,
  StructuredOutputValidationError,
  isRetryableError,
  isLLMError,
  getUserFriendlyErrorMessage
} from "../errors.ts";

// =============================================================================
// ARTIFACT PARSE ERROR TESTS
// =============================================================================

Deno.test("ArtifactParseError - constructs with all properties", () => {
  const error = new ArtifactParseError("Parse failed", "<raw>response</raw>", true);

  assertEquals(error.name, "ArtifactParseError");
  assertEquals(error.message, "Parse failed");
  assertEquals(error.rawResponse, "<raw>response</raw>");
  assertEquals(error.retryable, true);
  assertInstanceOf(error, Error);
});

Deno.test("ArtifactParseError - defaults retryable to true", () => {
  const error = new ArtifactParseError("Parse failed", "response");

  assertEquals(error.retryable, true);
});

Deno.test("ArtifactParseError - can be non-retryable", () => {
  const error = new ArtifactParseError("Invalid syntax", "response", false);

  assertEquals(error.retryable, false);
});

// =============================================================================
// LLM QUOTA EXCEEDED ERROR TESTS
// =============================================================================

Deno.test("LLMQuotaExceededError - constructs with reset time and type", () => {
  const resetAt = new Date(Date.now() + 60000);
  const error = new LLMQuotaExceededError(resetAt, "rate");

  assertEquals(error.name, "LLMQuotaExceededError");
  assertEquals(error.resetAt, resetAt);
  assertEquals(error.quotaType, "rate");
  assertEquals(error.retryable, true);
  assertEquals(error.message.includes("rate quota exceeded"), true);
});

Deno.test("LLMQuotaExceededError - calculates retry delay", () => {
  const resetAt = new Date(Date.now() + 5000);
  const error = new LLMQuotaExceededError(resetAt, "token");

  const delay = error.getRetryDelayMs();

  // Should be approximately 5000ms + 1000ms buffer
  assertEquals(delay >= 5000, true);
  assertEquals(delay <= 7000, true);
});

Deno.test("LLMQuotaExceededError - handles past reset time", () => {
  const resetAt = new Date(Date.now() - 1000); // In the past
  const error = new LLMQuotaExceededError(resetAt, "cost");

  const delay = error.getRetryDelayMs();

  // Should be minimum 0 (plus buffer, so ~1000)
  assertEquals(delay >= 0, true);
});

// =============================================================================
// LLM TIMEOUT ERROR TESTS
// =============================================================================

Deno.test("LLMTimeoutError - constructs with timeout and operation", () => {
  const error = new LLMTimeoutError(30000, "callGemini");

  assertEquals(error.name, "LLMTimeoutError");
  assertEquals(error.timeoutMs, 30000);
  assertEquals(error.operation, "callGemini");
  assertEquals(error.retryable, true);
  assertEquals(error.message.includes("'callGemini' timed out"), true);
  assertEquals(error.message.includes("30000ms"), true);
});

// =============================================================================
// CIRCUIT BREAKER OPEN ERROR TESTS
// =============================================================================

Deno.test("CircuitBreakerOpenError - constructs with reset time", () => {
  const resetAt = new Date(Date.now() + 30000);
  const error = new CircuitBreakerOpenError(resetAt);

  assertEquals(error.name, "CircuitBreakerOpenError");
  assertEquals(error.resetAt, resetAt);
  assertEquals(error.retryable, false); // Circuit breaker errors are not directly retryable
  assertEquals(error.message.includes("Circuit breaker is OPEN"), true);
});

Deno.test("CircuitBreakerOpenError - calculates time until half-open", () => {
  const resetAt = new Date(Date.now() + 10000);
  const error = new CircuitBreakerOpenError(resetAt);

  const timeUntil = error.getTimeUntilHalfOpenMs();

  assertEquals(timeUntil >= 9000, true);
  assertEquals(timeUntil <= 11000, true);
});

// =============================================================================
// STRUCTURED OUTPUT VALIDATION ERROR TESTS
// =============================================================================

Deno.test("StructuredOutputValidationError - constructs with validation errors", () => {
  const error = new StructuredOutputValidationError(
    "Validation failed",
    '{"invalid": "json"}',
    ["Missing required field: type", "Title too short"]
  );

  assertEquals(error.name, "StructuredOutputValidationError");
  assertEquals(error.rawResponse, '{"invalid": "json"}');
  assertEquals(error.validationErrors.length, 2);
  assertEquals(error.retryable, true);
});

Deno.test("StructuredOutputValidationError - defaults validation errors to empty", () => {
  const error = new StructuredOutputValidationError("Failed", "response");

  assertEquals(error.validationErrors.length, 0);
});

// =============================================================================
// IS RETRYABLE ERROR TESTS
// =============================================================================

Deno.test("isRetryableError - returns true for retryable custom errors", () => {
  assertEquals(isRetryableError(new ArtifactParseError("test", "raw")), true);
  assertEquals(isRetryableError(new LLMQuotaExceededError(new Date(), "rate")), true);
  assertEquals(isRetryableError(new LLMTimeoutError(1000, "test")), true);
  assertEquals(isRetryableError(new StructuredOutputValidationError("test", "raw")), true);
});

Deno.test("isRetryableError - returns false for non-retryable errors", () => {
  assertEquals(isRetryableError(new CircuitBreakerOpenError(new Date())), false);
  assertEquals(isRetryableError(new ArtifactParseError("test", "raw", false)), false);
});

Deno.test("isRetryableError - returns true for network errors", () => {
  assertEquals(isRetryableError(new Error("Network error")), true);
  assertEquals(isRetryableError(new Error("Connection reset")), true);
  assertEquals(isRetryableError(new Error("Socket timeout")), true);
  assertEquals(isRetryableError(new Error("ECONNRESET")), true);
  assertEquals(isRetryableError(new Error("ECONNREFUSED")), true);
});

Deno.test("isRetryableError - returns true for rate limit errors", () => {
  assertEquals(isRetryableError(new Error("Rate limit exceeded")), true);
  assertEquals(isRetryableError(new Error("429 Too Many Requests")), true);
});

Deno.test("isRetryableError - returns true for service unavailable", () => {
  assertEquals(isRetryableError(new Error("503 Service Unavailable")), true);
  assertEquals(isRetryableError(new Error("Service unavailable")), true);
});

Deno.test("isRetryableError - returns false for generic errors", () => {
  assertEquals(isRetryableError(new Error("Something went wrong")), false);
  assertEquals(isRetryableError(new Error("Invalid input")), false);
});

Deno.test("isRetryableError - handles null and undefined", () => {
  assertEquals(isRetryableError(null), false);
  assertEquals(isRetryableError(undefined), false);
});

Deno.test("isRetryableError - handles non-Error objects", () => {
  assertEquals(isRetryableError({ retryable: true }), true);
  assertEquals(isRetryableError({ retryable: false }), false);
  assertEquals(isRetryableError("string error"), false);
  assertEquals(isRetryableError(42), false);
});

// =============================================================================
// IS LLM ERROR TESTS
// =============================================================================

Deno.test("isLLMError - returns true for custom LLM errors", () => {
  assertEquals(isLLMError(new ArtifactParseError("test", "raw")), true);
  assertEquals(isLLMError(new LLMQuotaExceededError(new Date(), "rate")), true);
  assertEquals(isLLMError(new LLMTimeoutError(1000, "test")), true);
  assertEquals(isLLMError(new CircuitBreakerOpenError(new Date())), true);
  assertEquals(isLLMError(new StructuredOutputValidationError("test", "raw")), true);
});

Deno.test("isLLMError - returns false for generic errors", () => {
  assertEquals(isLLMError(new Error("Generic error")), false);
  assertEquals(isLLMError(new TypeError("Type error")), false);
  assertEquals(isLLMError("string"), false);
  assertEquals(isLLMError(null), false);
});

// =============================================================================
// GET USER FRIENDLY ERROR MESSAGE TESTS
// =============================================================================

Deno.test("getUserFriendlyErrorMessage - handles ArtifactParseError", () => {
  const error = new ArtifactParseError("Internal error", "raw");
  const message = getUserFriendlyErrorMessage(error);

  assertEquals(message.includes("Failed to generate artifact"), true);
  assertEquals(message.includes("Internal error"), false); // Should not expose internal details
});

Deno.test("getUserFriendlyErrorMessage - handles LLMQuotaExceededError", () => {
  const error = new LLMQuotaExceededError(new Date(Date.now() + 30000), "rate");
  const message = getUserFriendlyErrorMessage(error);

  assertEquals(message.includes("Rate limit"), true);
  assertEquals(message.includes("seconds"), true);
});

Deno.test("getUserFriendlyErrorMessage - handles LLMTimeoutError", () => {
  const error = new LLMTimeoutError(30000, "streaming");
  const message = getUserFriendlyErrorMessage(error);

  assertEquals(message.includes("timed out"), true);
  assertEquals(message.includes("streaming"), true);
});

Deno.test("getUserFriendlyErrorMessage - handles CircuitBreakerOpenError", () => {
  const error = new CircuitBreakerOpenError(new Date());
  const message = getUserFriendlyErrorMessage(error);

  assertEquals(message.includes("temporarily unavailable"), true);
});

Deno.test("getUserFriendlyErrorMessage - handles StructuredOutputValidationError", () => {
  const error = new StructuredOutputValidationError("Validation failed", "raw");
  const message = getUserFriendlyErrorMessage(error);

  assertEquals(message.includes("unexpected format"), true);
});

Deno.test("getUserFriendlyErrorMessage - handles generic Error", () => {
  const error = new Error("Something specific happened");
  const message = getUserFriendlyErrorMessage(error);

  assertEquals(message, "Something specific happened");
});

Deno.test("getUserFriendlyErrorMessage - handles non-Error", () => {
  const message = getUserFriendlyErrorMessage("string error");

  assertEquals(message.includes("unexpected error"), true);
});
