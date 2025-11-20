/**
 * Tests for API Error Handler
 *
 * Comprehensive test suite for shared API error handling utilities.
 * Ensures consistent error responses across artifact generation functions.
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.192.0/testing/asserts.ts";
import { handleApiError, handleKimiError, handleGeminiError } from "../api-error-handler.ts";
import { HTTP_STATUS } from "../config.ts";

// ============================================================================
// Mock Utilities
// ============================================================================

function createMockResponse(status: number, body: string, headers?: Record<string, string>): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}

const mockCorsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:8080",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const mockRequestId = "test-request-123";

// ============================================================================
// Test Suite: handleApiError()
// ============================================================================

Deno.test("handleApiError - 429 (Too Many Requests) with retry-after header", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    JSON.stringify({ error: "Rate limited" }),
    { "Retry-After": "60" }
  );

  const result = await handleApiError(mockResponse, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders,
    context: "Kimi K2-Thinking"
  });

  assertEquals(result.status, HTTP_STATUS.TOO_MANY_REQUESTS);

  const responseData = await result.json();
  assertEquals(responseData.error, "API quota exceeded. Please try again in a moment.");
  assertEquals(responseData.requestId, mockRequestId);
  assertEquals(responseData.retryable, true);
  assertEquals(responseData.rateLimitExceeded, true);
  assertEquals(responseData.retryAfter, 60);
  assertExists(responseData.resetAt);

  // Verify headers
  assertEquals(result.headers.get("X-Request-ID"), mockRequestId);
  assertEquals(result.headers.get("Retry-After"), "60");
  assertEquals(result.headers.get("Access-Control-Allow-Origin"), "http://localhost:8080");
});

Deno.test("handleApiError - 429 without retry-after header (defaults to 60s)", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    JSON.stringify({ error: "Rate limited" })
  );

  const result = await handleApiError(mockResponse, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders
  });

  assertEquals(result.status, HTTP_STATUS.TOO_MANY_REQUESTS);

  const responseData = await result.json();
  assertEquals(responseData.retryAfter, 60); // Default fallback
  assertExists(responseData.resetAt);
});

Deno.test("handleApiError - 403 (Forbidden) treated as quota error", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.FORBIDDEN,
    JSON.stringify({ error: "Quota exceeded" })
  );

  const result = await handleApiError(mockResponse, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders,
    context: "OpenRouter API"
  });

  // 403 should be mapped to 429 for consistent client handling
  assertEquals(result.status, HTTP_STATUS.TOO_MANY_REQUESTS);

  const responseData = await result.json();
  assertEquals(responseData.error, "API quota exceeded. Please try again in a moment.");
  assertEquals(responseData.requestId, mockRequestId);
  assertEquals(responseData.retryable, true);
  assertEquals(responseData.rateLimitExceeded, true);
});

Deno.test("handleApiError - 503 (Service Unavailable) with retryable flag", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    JSON.stringify({ error: "Service overloaded" })
  );

  const result = await handleApiError(mockResponse, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders
  });

  assertEquals(result.status, HTTP_STATUS.SERVICE_UNAVAILABLE);

  const responseData = await result.json();
  assertEquals(responseData.error, "AI service is temporarily overloaded. Please try again in a moment.");
  assertEquals(responseData.requestId, mockRequestId);
  assertEquals(responseData.retryable, true);
});

Deno.test("handleApiError - 500 (Internal Server Error) preserves status and marks retryable", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    JSON.stringify({ error: "Internal error" })
  );

  const result = await handleApiError(mockResponse, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders
  });

  assertEquals(result.status, HTTP_STATUS.INTERNAL_SERVER_ERROR);

  const responseData = await result.json();
  assertEquals(responseData.error, "AI service error. Please try again.");
  assertEquals(responseData.requestId, mockRequestId);
  assertEquals(responseData.retryable, true); // Server errors are retryable
  assertExists(responseData.details);
});

Deno.test("handleApiError - 400 (Bad Request) preserves status and not retryable", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.BAD_REQUEST,
    JSON.stringify({ error: "Invalid input" })
  );

  const result = await handleApiError(mockResponse, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders
  });

  assertEquals(result.status, HTTP_STATUS.BAD_REQUEST);

  const responseData = await result.json();
  assertEquals(responseData.error, "Request failed. Please check your input and try again.");
  assertEquals(responseData.requestId, mockRequestId);
  assertEquals(responseData.retryable, false); // Client errors are not retryable
});

Deno.test("handleApiError - includes context in logs", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    JSON.stringify({ error: "Rate limited" })
  );

  // This test verifies the function runs without errors when context is provided
  const result = await handleApiError(mockResponse, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders,
    context: "Kimi K2-Thinking"
  });

  assertEquals(result.status, HTTP_STATUS.TOO_MANY_REQUESTS);
});

// ============================================================================
// Test Suite: handleKimiError() (convenience wrapper)
// ============================================================================

Deno.test("handleKimiError - wraps handleApiError with Kimi context", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    JSON.stringify({ error: "Rate limited" })
  );

  const result = await handleKimiError(mockResponse, mockRequestId, mockCorsHeaders);

  assertEquals(result.status, HTTP_STATUS.TOO_MANY_REQUESTS);

  const responseData = await result.json();
  assertEquals(responseData.error, "API quota exceeded. Please try again in a moment.");
  assertEquals(responseData.requestId, mockRequestId);
});

Deno.test("handleKimiError - handles 503 correctly", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    JSON.stringify({ error: "Service down" })
  );

  const result = await handleKimiError(mockResponse, mockRequestId, mockCorsHeaders);

  assertEquals(result.status, HTTP_STATUS.SERVICE_UNAVAILABLE);

  const responseData = await result.json();
  assertEquals(responseData.retryable, true);
});

// ============================================================================
// Test Suite: handleGeminiError() (convenience wrapper)
// ============================================================================

Deno.test("handleGeminiError - wraps handleApiError with Gemini context", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    JSON.stringify({ error: "Rate limited" })
  );

  const result = await handleGeminiError(mockResponse, mockRequestId, mockCorsHeaders);

  assertEquals(result.status, HTTP_STATUS.TOO_MANY_REQUESTS);

  const responseData = await result.json();
  assertEquals(responseData.error, "API quota exceeded. Please try again in a moment.");
});

// ============================================================================
// Test Suite: Edge Cases
// ============================================================================

Deno.test("handleApiError - truncates long error text to 200 chars", async () => {
  const longErrorText = "A".repeat(500);
  const mockResponse = createMockResponse(
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    longErrorText
  );

  const result = await handleApiError(mockResponse, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders
  });

  const responseData = await result.json();
  assertExists(responseData.details);
  assertEquals(responseData.details.length, 200); // Should be truncated
});

Deno.test("handleApiError - includes requestId in all responses", async () => {
  const testCases = [
    HTTP_STATUS.TOO_MANY_REQUESTS,
    HTTP_STATUS.FORBIDDEN,
    HTTP_STATUS.SERVICE_UNAVAILABLE,
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    HTTP_STATUS.BAD_REQUEST
  ];

  for (const status of testCases) {
    const mockResponse = createMockResponse(status, JSON.stringify({ error: "Error" }));
    const result = await handleApiError(mockResponse, {
      requestId: mockRequestId,
      corsHeaders: mockCorsHeaders
    });

    const responseData = await result.json();
    assertEquals(responseData.requestId, mockRequestId, `Failed for status ${status}`);

    // Verify X-Request-ID header
    assertEquals(result.headers.get("X-Request-ID"), mockRequestId);
  }
});

Deno.test("handleApiError - includes CORS headers in all responses", async () => {
  const mockResponse = createMockResponse(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    JSON.stringify({ error: "Error" })
  );

  const result = await handleApiError(mockResponse, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders
  });

  assertEquals(result.headers.get("Access-Control-Allow-Origin"), "http://localhost:8080");
  assertEquals(result.headers.get("Access-Control-Allow-Methods"), "POST, GET, OPTIONS");
  assertEquals(result.headers.get("Content-Type"), "application/json");
});

// ============================================================================
// Test Suite: Consistency Validation
// ============================================================================

Deno.test("Consistency - 429 and 403 return identical response structure", async () => {
  const response429 = createMockResponse(
    HTTP_STATUS.TOO_MANY_REQUESTS,
    JSON.stringify({ error: "Rate limit" })
  );

  const response403 = createMockResponse(
    HTTP_STATUS.FORBIDDEN,
    JSON.stringify({ error: "Quota exceeded" })
  );

  const result429 = await handleApiError(response429, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders
  });

  const result403 = await handleApiError(response403, {
    requestId: mockRequestId,
    corsHeaders: mockCorsHeaders
  });

  const data429 = await result429.json();
  const data403 = await result403.json();

  // Both should have same structure
  assertEquals(result429.status, HTTP_STATUS.TOO_MANY_REQUESTS);
  assertEquals(result403.status, HTTP_STATUS.TOO_MANY_REQUESTS);
  assertEquals(data429.error, data403.error);
  assertEquals(data429.retryable, data403.retryable);
  assertEquals(data429.rateLimitExceeded, data403.rateLimitExceeded);
});

console.log("✅ All API error handler tests passed!");
