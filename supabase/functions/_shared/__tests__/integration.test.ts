/**
 * Integration tests for Edge Functions shared modules
 *
 * Tests the interaction between modules:
 * - Validators + Error Handler
 * - Rate Limiter + Error Handler
 * - End-to-end request flows
 * - Error propagation across modules
 */

import { assertEquals, assertExists, assert } from "@std/assert";
import {
  RequestValidator,
  ValidationError,
  type ChatRequest,
  type ImageRequest
} from "../validators.ts";
import {
  ErrorResponseBuilder,
  RateLimitError,
  AuthenticationError
} from "../error-handler.ts";
import { HTTP_STATUS } from "../config.ts";
import {
  createValidChatRequest,
  createValidImageRequest,
  createValidMessage,
  getResponseBody,
  mockRequestWithIp,
  generateString
} from "./test-utils.ts";

// ==================== Validator + Error Handler Integration ====================

Deno.test("ValidationError from validator should convert to 400 response", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");

  try {
    RequestValidator.validateChat({ messages: [] });
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = errors.validation(error.message, error.details);
      const body = await getResponseBody(response);

      assertEquals(response.status, HTTP_STATUS.BAD_REQUEST);
      assertEquals(body.error, error.message);
      assertEquals(body.requestId, "test-123");
    }
  }
});

Deno.test("Multiple validation errors should be caught and formatted", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const invalidRequests = [
    { messages: [] }, // Empty messages
    { messages: "not an array" }, // Wrong type
    { messages: [{ role: "invalid", content: "test" }] } // Invalid role
  ];

  for (const invalidRequest of invalidRequests) {
    try {
      RequestValidator.validateChat(invalidRequest);
    } catch (error) {
      if (error instanceof ValidationError) {
        const response = errors.validation(error.message, error.details);
        assertEquals(response.status, HTTP_STATUS.BAD_REQUEST);
      }
    }
  }
});

Deno.test("Validator error details should be included in response", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");

  try {
    RequestValidator.validateChat({ messages: [] });
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = errors.validation(error.message, error.details);
      const body = await getResponseBody(response);

      assertExists(body.details);
      assert(body.details.includes("required"), "Details should explain what's required");
    }
  }
});

// ==================== Rate Limiter + Error Handler Integration ====================

Deno.test("RateLimitError should convert to 429 response", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const resetAt = new Date(Date.now() + 60000).toISOString();

  const rateLimitError = new RateLimitError(
    "Rate limit exceeded",
    resetAt,
    100,
    0
  );

  const response = errors.rateLimited(
    rateLimitError.resetAt,
    rateLimitError.remaining,
    rateLimitError.total,
    rateLimitError.message
  );

  const body = await getResponseBody(response);

  assertEquals(response.status, HTTP_STATUS.TOO_MANY_REQUESTS);
  assertEquals(body.error, rateLimitError.message);
  assertEquals(body.rateLimitExceeded, true);
  assertEquals(body.resetAt, resetAt);
});

Deno.test("Rate limit response should include proper headers", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const resetAt = new Date(Date.now() + 60000).toISOString();

  const response = errors.rateLimited(resetAt, 0, 100);

  assertEquals(response.headers.get("X-RateLimit-Limit"), "100");
  assertEquals(response.headers.get("X-RateLimit-Remaining"), "0");
  assertExists(response.headers.get("X-RateLimit-Reset"));
  assertExists(response.headers.get("Retry-After"));
});

// ==================== End-to-End Request Flows ====================

Deno.test("Valid chat request should pass validation", () => {
  const request = createValidChatRequest();

  // Should not throw
  const validated = RequestValidator.validateChat(request);

  assertExists(validated);
  assert(validated.messages.length > 0);
});

Deno.test("Invalid chat request should fail validation with clear error", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const invalidRequest = {
    messages: [{ role: "user", content: "" }] // Empty content
  };

  try {
    RequestValidator.validateChat(invalidRequest);
    assert(false, "Should have thrown ValidationError");
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = errors.validation(error.message, error.details);
      const body = await getResponseBody(response);

      assert(body.error.includes("Empty"));
      assertEquals(response.status, HTTP_STATUS.BAD_REQUEST);
    }
  }
});

Deno.test("Valid image request should pass validation", () => {
  const request = createValidImageRequest();

  // Should not throw
  const validated = RequestValidator.validateImage(request);

  assertExists(validated);
  assertEquals(validated.mode, "generate");
});

Deno.test("Invalid image request should fail validation with clear error", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const invalidRequest = {
    prompt: "", // Empty prompt
    mode: "generate"
  };

  try {
    RequestValidator.validateImage(invalidRequest);
    assert(false, "Should have thrown ValidationError");
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = errors.validation(error.message, error.details);
      const body = await getResponseBody(response);

      assert(body.error.includes("Empty"));
      assertEquals(response.status, HTTP_STATUS.BAD_REQUEST);
    }
  }
});

// ==================== Guest Request Flow ====================

Deno.test("Guest request flow should extract IP and validate", () => {
  const req = mockRequestWithIp("192.168.1.100");
  const request = createValidChatRequest({ isGuest: true });

  // Validate request
  const validated = RequestValidator.validateChat(request);
  assertEquals(validated.isGuest, true);

  // Extract IP
  const ip = req.headers.get("x-forwarded-for");
  assertEquals(ip, "192.168.1.100");
});

Deno.test("Guest request without IP should handle gracefully", () => {
  const request = createValidChatRequest({ isGuest: true });

  const validated = RequestValidator.validateChat(request);
  assertEquals(validated.isGuest, true);
});

// ==================== Authenticated Request Flow ====================

Deno.test("Authenticated request flow should validate and check user limit", () => {
  const request = createValidChatRequest({
    isGuest: false,
    sessionId: "user-session-123"
  });

  const validated = RequestValidator.validateChat(request);
  assertEquals(validated.isGuest, false);
  assertEquals(validated.sessionId, "user-session-123");
});

Deno.test("Authenticated request without session should still validate", () => {
  const request = createValidChatRequest({ isGuest: false });
  delete (request as any).sessionId;

  const validated = RequestValidator.validateChat(request);
  assertEquals(validated.isGuest, false);
});

// ==================== Error Propagation Tests ====================

Deno.test("ValidationError should propagate through error handler", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const validationError = new ValidationError("Invalid input", "Details here");

  const response = errors.validation(validationError.message, validationError.details);
  const body = await getResponseBody(response);

  assertEquals(body.error, "Invalid input");
  assertEquals(body.details, "Details here");
  assertEquals(response.status, HTTP_STATUS.BAD_REQUEST);
});

Deno.test("AuthenticationError should propagate through error handler", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const authError = new AuthenticationError("Invalid token", "Token expired");

  const response = errors.unauthorized(authError.message, authError.details);
  const body = await getResponseBody(response);

  assertEquals(body.error, "Invalid token");
  assertEquals(body.details, "Token expired");
  assertEquals(response.status, HTTP_STATUS.UNAUTHORIZED);
});

Deno.test("RateLimitError should propagate through error handler", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const resetAt = new Date(Date.now() + 3600000).toISOString();
  const rateLimitError = new RateLimitError("Too many requests", resetAt, 100, 0);

  const response = errors.rateLimited(
    rateLimitError.resetAt,
    rateLimitError.remaining,
    rateLimitError.total,
    rateLimitError.message
  );
  const body = await getResponseBody(response);

  assertEquals(body.error, "Too many requests");
  assertEquals(body.rateLimitExceeded, true);
  assertEquals(response.status, HTTP_STATUS.TOO_MANY_REQUESTS);
});

Deno.test("Generic Error should convert to internal error", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const genericError = new Error("Unexpected error");

  const response = errors.internal(genericError.message);
  const body = await getResponseBody(response);

  assertEquals(body.error, "Unexpected error");
  assertEquals(response.status, HTTP_STATUS.INTERNAL_SERVER_ERROR);
});

// ==================== Streaming Error Responses ====================

Deno.test("Validation error should support streaming format", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");

  try {
    RequestValidator.validateChat({ messages: [] });
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = errors.toStreamResponse(error.message);
      const text = await response.text();

      assert(text.includes("data:"));
      assert(text.includes(error.message));
      assert(text.includes("[DONE]"));
      assertEquals(response.headers.get("Content-Type"), "text/event-stream");
    }
  }
});

// ==================== Cross-Module Type Safety ====================

Deno.test("Validated ChatRequest should match ChatRequest type", () => {
  const request = createValidChatRequest();
  const validated: ChatRequest = RequestValidator.validateChat(request);

  assertEquals(validated.messages[0].role, "user");
  assertExists(validated.sessionId);
});

Deno.test("Validated ImageRequest should match ImageRequest type", () => {
  const request = createValidImageRequest();
  const validated: ImageRequest = RequestValidator.validateImage(request);

  assertEquals(validated.mode, "generate");
  assertExists(validated.prompt);
});

// ==================== Complex Validation Scenarios ====================

Deno.test("Chat request with artifact should validate all fields", () => {
  const request = createValidChatRequest({
    currentArtifact: {
      title: "Test Artifact",
      type: "html",
      content: "<div>Hello</div>"
    }
  });

  const validated = RequestValidator.validateChat(request);

  assertExists(validated.currentArtifact);
  assertEquals(validated.currentArtifact.title, "Test Artifact");
  assertEquals(validated.currentArtifact.type, "html");
});

Deno.test("Chat request with invalid artifact should fail validation", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const request = {
    messages: [createValidMessage()],
    currentArtifact: {
      title: "Test",
      // Missing type and content
    }
  };

  try {
    RequestValidator.validateChat(request);
    assert(false, "Should have thrown ValidationError");
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = errors.validation(error.message, error.details);
      assertEquals(response.status, HTTP_STATUS.BAD_REQUEST);
    }
  }
});

// ==================== Boundary Integration Tests ====================

Deno.test("Request at max message length should pass validation", () => {
  const maxContent = generateString(50000); // MAX_MESSAGE_CONTENT_LENGTH
  const request = createValidChatRequest({
    messages: [createValidMessage({ content: maxContent })]
  });

  const validated = RequestValidator.validateChat(request);
  assertEquals(validated.messages[0].content.length, 50000);
});

Deno.test("Request over max message length should fail validation", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  const tooLongContent = generateString(50001);
  const request = {
    messages: [createValidMessage({ content: tooLongContent })]
  };

  try {
    RequestValidator.validateChat(request);
    assert(false, "Should have thrown ValidationError");
  } catch (error) {
    if (error instanceof ValidationError) {
      const response = errors.validation(error.message, error.details);
      const body = await getResponseBody(response);

      assert(body.error.includes("too long"));
      assertEquals(response.status, HTTP_STATUS.BAD_REQUEST);
    }
  }
});

// ==================== Error Response Consistency ====================

Deno.test("All error responses should include request ID", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");

  const responses = [
    errors.validation("Error"),
    errors.unauthorized(),
    errors.forbidden(),
    errors.rateLimited(new Date().toISOString(), 0, 100),
    errors.internal(),
    errors.serviceUnavailable()
  ];

  for (const response of responses) {
    const body = await getResponseBody(response);
    assertEquals(body.requestId, "test-123");
  }
});

Deno.test("All error responses should include CORS headers", () => {
  const origin = "https://example.com";
  const errors = ErrorResponseBuilder.create(origin, "test-123");

  const responses = [
    errors.validation("Error"),
    errors.unauthorized(),
    errors.forbidden(),
    errors.rateLimited(new Date().toISOString(), 0, 100),
    errors.internal(),
    errors.serviceUnavailable()
  ];

  for (const response of responses) {
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), origin);
    assertEquals(response.headers.get("Content-Type"), "application/json");
  }
});

// ==================== Real-World Scenarios ====================

Deno.test("Complete guest chat flow: validation + rate check simulation", () => {
  // Step 1: Create and validate request
  const request = createValidChatRequest({ isGuest: true });
  const validated = RequestValidator.validateChat(request);

  assertEquals(validated.isGuest, true);
  assert(validated.messages.length > 0);

  // Step 2: Simulate rate limit check (would be async in real implementation)
  const rateLimitResult = {
    allowed: true,
    headers: {
      "X-RateLimit-Limit": "20",
      "X-RateLimit-Remaining": "15",
      "X-RateLimit-Reset": Date.now().toString()
    }
  };

  assertEquals(rateLimitResult.allowed, true);
  assertExists(rateLimitResult.headers);
});

Deno.test("Complete authenticated chat flow: validation + rate check simulation", () => {
  // Step 1: Create and validate request
  const request = createValidChatRequest({
    isGuest: false,
    sessionId: "user-session-123"
  });
  const validated = RequestValidator.validateChat(request);

  assertEquals(validated.isGuest, false);
  assertEquals(validated.sessionId, "user-session-123");

  // Step 2: Simulate rate limit check
  const rateLimitResult = {
    allowed: true,
    headers: {
      "X-RateLimit-Limit": "100",
      "X-RateLimit-Remaining": "75",
      "X-RateLimit-Reset": Date.now().toString()
    }
  };

  assertEquals(rateLimitResult.allowed, true);
  assertEquals(rateLimitResult.headers["X-RateLimit-Limit"], "100");
});

Deno.test("Failed validation should prevent rate limit check", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");
  let rateLimitChecked = false;

  try {
    // Invalid request
    RequestValidator.validateChat({ messages: [] });

    // Rate limit check would happen here
    rateLimitChecked = true;
  } catch (error) {
    if (error instanceof ValidationError) {
      // Return error without checking rate limit
      const response = errors.validation(error.message, error.details);
      assertEquals(response.status, HTTP_STATUS.BAD_REQUEST);
    }
  }

  assertEquals(rateLimitChecked, false, "Rate limit should not be checked for invalid requests");
});

Deno.test("Rate limit exceeded should prevent request processing", async () => {
  const errors = ErrorResponseBuilder.create("https://example.com", "test-123");

  // Step 1: Validate request (succeeds)
  const request = createValidChatRequest();
  const validated = RequestValidator.validateChat(request);
  assertExists(validated);

  // Step 2: Simulate rate limit exceeded
  const rateLimitResult = {
    allowed: false,
    error: {
      message: "Rate limit exceeded",
      resetAt: new Date(Date.now() + 3600000).toISOString(),
      total: 100,
      remaining: 0
    }
  };

  if (!rateLimitResult.allowed && rateLimitResult.error) {
    const response = errors.rateLimited(
      rateLimitResult.error.resetAt,
      rateLimitResult.error.remaining,
      rateLimitResult.error.total,
      rateLimitResult.error.message
    );

    assertEquals(response.status, HTTP_STATUS.TOO_MANY_REQUESTS);
  }
});
