/**
 * Unit tests for error-handler.ts
 *
 * Tests the ErrorResponseBuilder class and custom error classes for:
 * - Correct HTTP status codes
 * - Proper response body structure
 * - CORS header inclusion
 * - Rate limit header generation
 * - Streaming error responses
 * - Custom error class behavior
 */

import { assertEquals, assertExists, assert } from "@std/assert";
import {
  ErrorResponseBuilder,
  ValidationError,
  AuthenticationError,
  RateLimitError,
  type ErrorResponse,
  type RateLimitInfo
} from "../error-handler.ts";
import { HTTP_STATUS } from "../config.ts";
import { getResponseBody, assertHasHeaders, MockDate } from "./test-utils.ts";

// ==================== ErrorResponseBuilder Factory Tests ====================

Deno.test("ErrorResponseBuilder.create should create instance with CORS headers", () => {
  const origin = "https://example.com";
  const requestId = "test-123";
  const builder = ErrorResponseBuilder.create(origin, requestId);

  assertExists(builder);
});

Deno.test("ErrorResponseBuilder.create should handle null origin with secure fallback", () => {
  const requestId = "test-123";
  const builder = ErrorResponseBuilder.create(null, requestId);

  assertExists(builder);
  // Should fallback to first allowed origin (localhost in dev), not wildcard (*)
});

Deno.test("ErrorResponseBuilder.withHeaders should create instance with custom headers", () => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://custom.com",
    "Custom-Header": "custom-value"
  };
  const requestId = "test-123";
  const builder = ErrorResponseBuilder.withHeaders(corsHeaders, requestId);

  assertExists(builder);
});

// ==================== Validation Error Tests ====================

Deno.test("ErrorResponseBuilder.validation should return 400 status", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.validation("Invalid input");

  assertEquals(response.status, HTTP_STATUS.BAD_REQUEST);
});

Deno.test("ErrorResponseBuilder.validation should include error message in body", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.validation("Invalid input");
  const body = await getResponseBody(response);

  assertEquals(body.error, "Invalid input");
  assertEquals(body.requestId, "test-123");
});

Deno.test("ErrorResponseBuilder.validation should include details when provided", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.validation("Invalid input", "Field 'email' is required");
  const body = await getResponseBody(response);

  assertEquals(body.details, "Field 'email' is required");
});

Deno.test("ErrorResponseBuilder.validation should include CORS headers", () => {
  const origin = "http://localhost:8080";
  const builder = ErrorResponseBuilder.create(origin, "test-123");
  const response = builder.validation("Invalid input");

  assertEquals(response.headers.get("Access-Control-Allow-Origin"), origin);
  assertExists(response.headers.get("Content-Type"));
  assertEquals(response.headers.get("X-Request-ID"), "test-123");
});

// ==================== Unauthorized Error Tests ====================

Deno.test("ErrorResponseBuilder.unauthorized should return 401 status", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.unauthorized();

  assertEquals(response.status, HTTP_STATUS.UNAUTHORIZED);
});

Deno.test("ErrorResponseBuilder.unauthorized should use default message", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.unauthorized();
  const body = await getResponseBody(response);

  assertEquals(body.error, "Unauthorized");
});

Deno.test("ErrorResponseBuilder.unauthorized should accept custom message", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.unauthorized("Invalid token");
  const body = await getResponseBody(response);

  assertEquals(body.error, "Invalid token");
});

Deno.test("ErrorResponseBuilder.unauthorized should include details", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.unauthorized("Invalid token", "Token has expired");
  const body = await getResponseBody(response);

  assertEquals(body.details, "Token has expired");
});

// ==================== Forbidden Error Tests ====================

Deno.test("ErrorResponseBuilder.forbidden should return 403 status", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.forbidden();

  assertEquals(response.status, HTTP_STATUS.FORBIDDEN);
});

Deno.test("ErrorResponseBuilder.forbidden should use default message", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.forbidden();
  const body = await getResponseBody(response);

  assertEquals(body.error, "Forbidden");
});

Deno.test("ErrorResponseBuilder.forbidden should accept custom message and details", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.forbidden("Access denied", "Insufficient permissions");
  const body = await getResponseBody(response);

  assertEquals(body.error, "Access denied");
  assertEquals(body.details, "Insufficient permissions");
});

// ==================== Rate Limited Error Tests ====================

Deno.test("ErrorResponseBuilder.rateLimited should return 429 status", () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const resetAt = new Date(Date.now() + 60000).toISOString();
  const response = builder.rateLimited(resetAt, 0, 100);

  assertEquals(response.status, HTTP_STATUS.TOO_MANY_REQUESTS);
});

Deno.test("ErrorResponseBuilder.rateLimited should include rate limit in body", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const resetAt = new Date(Date.now() + 60000).toISOString();
  const response = builder.rateLimited(resetAt, 0, 100);
  const body = await getResponseBody(response);

  assertEquals(body.rateLimitExceeded, true);
  assertEquals(body.resetAt, resetAt);
  assertExists(body.error);
});

Deno.test("ErrorResponseBuilder.rateLimited should include rate limit headers", () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const resetAt = new Date(Date.now() + 60000).toISOString();
  const response = builder.rateLimited(resetAt, 5, 100);

  assertEquals(response.headers.get("X-RateLimit-Limit"), "100");
  assertEquals(response.headers.get("X-RateLimit-Remaining"), "5");
  assertExists(response.headers.get("X-RateLimit-Reset"));
  assertExists(response.headers.get("Retry-After"));
});

Deno.test("ErrorResponseBuilder.rateLimited should calculate Retry-After from resetAt", () => {
  const mockDate = new MockDate(1700000000000);
  mockDate.install();

  try {
    const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
    const resetAt = new Date(1700000060000).toISOString(); // +60 seconds
    const response = builder.rateLimited(resetAt, 0, 100);

    const retryAfter = response.headers.get("Retry-After");
    assertEquals(retryAfter, "60");
  } finally {
    mockDate.restore();
  }
});

Deno.test("ErrorResponseBuilder.rateLimited should handle past reset times", () => {
  const mockDate = new MockDate(1700000000000);
  mockDate.install();

  try {
    const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
    const resetAt = new Date(1700000000000 - 5000).toISOString(); // -5 seconds (in the past)
    const response = builder.rateLimited(resetAt, 0, 100);

    const retryAfter = response.headers.get("Retry-After");
    assertEquals(retryAfter, "0"); // Should be 0, not negative
  } finally {
    mockDate.restore();
  }
});

Deno.test("ErrorResponseBuilder.rateLimited should accept custom message", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const resetAt = new Date(Date.now() + 60000).toISOString();
  const response = builder.rateLimited(resetAt, 0, 100, "Custom rate limit message");
  const body = await getResponseBody(response);

  assertEquals(body.error, "Custom rate limit message");
});

// ==================== Internal Error Tests ====================

Deno.test("ErrorResponseBuilder.internal should return 500 status", () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.internal();

  assertEquals(response.status, HTTP_STATUS.INTERNAL_SERVER_ERROR);
});

Deno.test("ErrorResponseBuilder.internal should use default message", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.internal();
  const body = await getResponseBody(response);

  assertEquals(body.error, "An error occurred while processing your request");
});

Deno.test("ErrorResponseBuilder.internal should accept custom message and details", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.internal("Database error", "Connection timeout");
  const body = await getResponseBody(response);

  assertEquals(body.error, "Database error");
  assertEquals(body.details, "Connection timeout");
});

// ==================== Service Unavailable Error Tests ====================

Deno.test("ErrorResponseBuilder.serviceUnavailable should return 503 status", () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.serviceUnavailable();

  assertEquals(response.status, HTTP_STATUS.SERVICE_UNAVAILABLE);
});

Deno.test("ErrorResponseBuilder.serviceUnavailable should mark as retryable by default", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.serviceUnavailable();
  const body = await getResponseBody(response);

  assertEquals(body.retryable, true);
});

Deno.test("ErrorResponseBuilder.serviceUnavailable should accept retryable flag", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.serviceUnavailable("Service down", false);
  const body = await getResponseBody(response);

  assertEquals(body.retryable, false);
});

Deno.test("ErrorResponseBuilder.serviceUnavailable should include Retry-After header when provided", () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.serviceUnavailable("Service down", true, 120);

  assertEquals(response.headers.get("Retry-After"), "120");
});

Deno.test("ErrorResponseBuilder.serviceUnavailable should not include Retry-After when not provided", () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.serviceUnavailable();

  assertEquals(response.headers.get("Retry-After"), null);
});

// ==================== API Error Tests ====================

Deno.test("ErrorResponseBuilder.apiError should handle 429 rate limit", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const apiResponse = new Response("Rate limited", { status: 429 });
  const response = await builder.apiError(apiResponse);

  assertEquals(response.status, HTTP_STATUS.TOO_MANY_REQUESTS);
  const body = await getResponseBody(response);
  assert(body.error.includes("quota exceeded"));
  assertEquals(body.retryable, true);
});

Deno.test("ErrorResponseBuilder.apiError should handle 403 as rate limit", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const apiResponse = new Response("Forbidden", { status: 403 });
  const response = await builder.apiError(apiResponse);

  assertEquals(response.status, HTTP_STATUS.TOO_MANY_REQUESTS);
  const body = await getResponseBody(response);
  assertEquals(body.retryable, true);
});

Deno.test("ErrorResponseBuilder.apiError should preserve Retry-After header", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const apiResponse = new Response("Rate limited", {
    status: 429,
    headers: { "Retry-After": "60" }
  });
  const response = await builder.apiError(apiResponse);

  assertEquals(response.headers.get("Retry-After"), "60");
});

Deno.test("ErrorResponseBuilder.apiError should handle 503 service unavailable", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const apiResponse = new Response("Service unavailable", { status: 503 });
  const response = await builder.apiError(apiResponse);

  assertEquals(response.status, HTTP_STATUS.SERVICE_UNAVAILABLE);
  const body = await getResponseBody(response);
  assert(body.error.includes("temporarily unavailable"));
  assertEquals(body.retryable, true);
});

Deno.test("ErrorResponseBuilder.apiError should handle 5xx errors as retryable", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const apiResponse = new Response("Internal error", { status: 500 });
  const response = await builder.apiError(apiResponse);

  assertEquals(response.status, 500);
  const body = await getResponseBody(response);
  assertEquals(body.error, "AI service error");
  assertEquals(body.retryable, true);
});

Deno.test("ErrorResponseBuilder.apiError should handle 4xx errors as non-retryable", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const apiResponse = new Response("Bad request", { status: 400 });
  const response = await builder.apiError(apiResponse);

  assertEquals(response.status, 400);
  const body = await getResponseBody(response);
  assertEquals(body.error, "Request failed");
  assertEquals(body.retryable, false);
});

Deno.test("ErrorResponseBuilder.apiError should truncate long error messages", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const longError = "x".repeat(500);
  const apiResponse = new Response(longError, { status: 400 });
  const response = await builder.apiError(apiResponse);

  const body = await getResponseBody(response);
  assert(body.details.length <= 200, "Error details should be truncated to 200 characters");
});

Deno.test("ErrorResponseBuilder.apiError should accept context parameter", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const apiResponse = new Response("Error", { status: 500 });

  // Should not throw - context is used for logging only
  const response = await builder.apiError(apiResponse, "OpenRouter API");
  assertExists(response);
});

// ==================== Streaming Error Tests ====================

Deno.test("ErrorResponseBuilder.toStreamResponse should return streaming format", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.toStreamResponse("Stream error occurred");

  assertEquals(response.headers.get("Content-Type"), "text/event-stream");
  assertEquals(response.headers.get("X-Request-ID"), "test-123");
});

Deno.test("ErrorResponseBuilder.toStreamResponse should format SSE data correctly", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.toStreamResponse("Stream error occurred");
  const text = await response.text();

  assert(text.includes("data: "), "Should start with 'data: '");
  assert(text.includes("Stream error occurred"), "Should include error message");
  assert(text.includes("test-123"), "Should include request ID");
  assert(text.includes("data: [DONE]"), "Should end with [DONE]");
});

Deno.test("ErrorResponseBuilder.toStreamResponse should include additional headers", () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.toStreamResponse("Error", { "Custom-Header": "value" });

  assertEquals(response.headers.get("Custom-Header"), "value");
  assertEquals(response.headers.get("Content-Type"), "text/event-stream");
});

// ==================== Custom Error Classes Tests ====================

Deno.test("ValidationError should extend Error", () => {
  const error = new ValidationError("Validation failed");

  assert(error instanceof Error);
  assert(error instanceof ValidationError);
  assertEquals(error.name, "ValidationError");
  assertEquals(error.message, "Validation failed");
});

Deno.test("ValidationError should accept details", () => {
  const error = new ValidationError("Validation failed", "Field 'email' is required");

  assertEquals(error.details, "Field 'email' is required");
});

Deno.test("ValidationError should work without details", () => {
  const error = new ValidationError("Validation failed");

  assertEquals(error.details, undefined);
});

Deno.test("AuthenticationError should extend Error", () => {
  const error = new AuthenticationError();

  assert(error instanceof Error);
  assert(error instanceof AuthenticationError);
  assertEquals(error.name, "AuthenticationError");
});

Deno.test("AuthenticationError should use default message", () => {
  const error = new AuthenticationError();

  assertEquals(error.message, "Unauthorized");
});

Deno.test("AuthenticationError should accept custom message", () => {
  const error = new AuthenticationError("Invalid token");

  assertEquals(error.message, "Invalid token");
});

Deno.test("AuthenticationError should accept details", () => {
  const error = new AuthenticationError("Invalid token", "Token has expired");

  assertEquals(error.details, "Token has expired");
});

Deno.test("RateLimitError should extend Error", () => {
  const resetAt = new Date().toISOString();
  const error = new RateLimitError("Rate limit exceeded", resetAt, 100);

  assert(error instanceof Error);
  assert(error instanceof RateLimitError);
  assertEquals(error.name, "RateLimitError");
});

Deno.test("RateLimitError should store rate limit info", () => {
  const resetAt = new Date().toISOString();
  const error = new RateLimitError("Rate limit exceeded", resetAt, 100, 5);

  assertEquals(error.message, "Rate limit exceeded");
  assertEquals(error.resetAt, resetAt);
  assertEquals(error.total, 100);
  assertEquals(error.remaining, 5);
});

Deno.test("RateLimitError should default remaining to 0", () => {
  const resetAt = new Date().toISOString();
  const error = new RateLimitError("Rate limit exceeded", resetAt, 100);

  assertEquals(error.remaining, 0);
});

// ==================== CORS Header Tests ====================

Deno.test("All error responses should include CORS headers", async () => {
  const origin = "http://localhost:8080";
  const builder = ErrorResponseBuilder.create(origin, "test-123");

  const responses = [
    builder.validation("Error"),
    builder.unauthorized(),
    builder.forbidden(),
    builder.rateLimited(new Date().toISOString(), 0, 100),
    builder.internal(),
    builder.serviceUnavailable()
  ];

  for (const response of responses) {
    assertEquals(
      response.headers.get("Access-Control-Allow-Origin"),
      origin,
      "Should include CORS origin header"
    );
  }
});

Deno.test("All error responses should include Content-Type header", () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");

  const responses = [
    builder.validation("Error"),
    builder.unauthorized(),
    builder.forbidden(),
    builder.rateLimited(new Date().toISOString(), 0, 100),
    builder.internal(),
    builder.serviceUnavailable()
  ];

  for (const response of responses) {
    assertEquals(
      response.headers.get("Content-Type"),
      "application/json",
      "Should include Content-Type header"
    );
  }
});

Deno.test("All error responses should include X-Request-ID header", () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");

  const responses = [
    builder.validation("Error"),
    builder.unauthorized(),
    builder.forbidden(),
    builder.rateLimited(new Date().toISOString(), 0, 100),
    builder.internal(),
    builder.serviceUnavailable()
  ];

  for (const response of responses) {
    assertEquals(
      response.headers.get("X-Request-ID"),
      "test-123",
      "Should include X-Request-ID header"
    );
  }
});

// ==================== Edge Cases ====================

Deno.test("ErrorResponseBuilder should handle empty error messages", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const response = builder.validation("");
  const body = await getResponseBody(response);

  assertEquals(body.error, "");
  assertExists(body.requestId);
});

Deno.test("ErrorResponseBuilder should handle very long error messages", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const longMessage = "x".repeat(10000);
  const response = builder.validation(longMessage);
  const body = await getResponseBody(response);

  assertEquals(body.error, longMessage);
});

Deno.test("ErrorResponseBuilder should handle special characters in messages", async () => {
  const builder = ErrorResponseBuilder.create("https://example.com", "test-123");
  const specialChars = "Error with 'quotes', \"double quotes\", and <html>";
  const response = builder.validation(specialChars);
  const body = await getResponseBody(response);

  assertEquals(body.error, specialChars);
});
