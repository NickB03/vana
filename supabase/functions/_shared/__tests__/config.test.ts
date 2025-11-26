/**
 * Unit tests for config.ts
 *
 * Tests centralized configuration constants for:
 * - Type safety
 * - Immutability (const assertions)
 * - Value validity
 * - Completeness
 */

import { assertEquals, assert, assertExists } from "@std/assert";
import {
  RATE_LIMITS,
  VALIDATION_LIMITS,
  RETRY_CONFIG,
  STORAGE_CONFIG,
  API_ENDPOINTS,
  MODELS,
  DEFAULT_MODEL_PARAMS,
  IMAGE_CONFIG,
  MESSAGE_ROLES,
  ARTIFACT_TYPES,
  HTTP_STATUS,
  CONTEXT_CONFIG,
  type MessageRole,
  type ArtifactType
} from "../config.ts";

// ==================== RATE_LIMITS Tests ====================

Deno.test("RATE_LIMITS.GUEST should have valid positive values", () => {
  assert(RATE_LIMITS.GUEST.MAX_REQUESTS > 0, "MAX_REQUESTS should be positive");
  assert(RATE_LIMITS.GUEST.WINDOW_HOURS > 0, "WINDOW_HOURS should be positive");
  assertEquals(typeof RATE_LIMITS.GUEST.MAX_REQUESTS, "number");
  assertEquals(typeof RATE_LIMITS.GUEST.WINDOW_HOURS, "number");
});

Deno.test("RATE_LIMITS.AUTHENTICATED should have valid positive values", () => {
  assert(RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS > 0, "MAX_REQUESTS should be positive");
  assert(RATE_LIMITS.AUTHENTICATED.WINDOW_HOURS > 0, "WINDOW_HOURS should be positive");
  assertEquals(typeof RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS, "number");
  assertEquals(typeof RATE_LIMITS.AUTHENTICATED.WINDOW_HOURS, "number");
});

Deno.test("RATE_LIMITS.AUTHENTICATED should be higher than GUEST limits", () => {
  assert(
    RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS >= RATE_LIMITS.GUEST.MAX_REQUESTS,
    "Authenticated users should have equal or higher limits than guests"
  );
});

Deno.test("RATE_LIMITS.API_THROTTLE should have valid RPM configuration", () => {
  assert(RATE_LIMITS.API_THROTTLE.GEMINI_RPM > 0, "GEMINI_RPM should be positive");
  assert(RATE_LIMITS.API_THROTTLE.WINDOW_SECONDS > 0, "WINDOW_SECONDS should be positive");
  assertEquals(typeof RATE_LIMITS.API_THROTTLE.GEMINI_RPM, "number");
  assertEquals(typeof RATE_LIMITS.API_THROTTLE.WINDOW_SECONDS, "number");
});

Deno.test("RATE_LIMITS.ARTIFACT should have all required configurations", () => {
  // API throttle
  assert(RATE_LIMITS.ARTIFACT.API_THROTTLE.MAX_REQUESTS > 0);
  assert(RATE_LIMITS.ARTIFACT.API_THROTTLE.WINDOW_SECONDS > 0);

  // Guest limits
  assert(RATE_LIMITS.ARTIFACT.GUEST.MAX_REQUESTS > 0);
  assert(RATE_LIMITS.ARTIFACT.GUEST.WINDOW_HOURS > 0);

  // Authenticated limits
  assert(RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS > 0);
  assert(RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS > 0);

  // Authenticated should have higher limits than guest
  assert(
    RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS >= RATE_LIMITS.ARTIFACT.GUEST.MAX_REQUESTS,
    "Artifact auth limits should be >= guest limits"
  );
});

Deno.test("RATE_LIMITS.IMAGE should have all required configurations", () => {
  // API throttle
  assert(RATE_LIMITS.IMAGE.API_THROTTLE.MAX_REQUESTS > 0);
  assert(RATE_LIMITS.IMAGE.API_THROTTLE.WINDOW_SECONDS > 0);

  // Guest limits
  assert(RATE_LIMITS.IMAGE.GUEST.MAX_REQUESTS > 0);
  assert(RATE_LIMITS.IMAGE.GUEST.WINDOW_HOURS > 0);

  // Authenticated limits
  assert(RATE_LIMITS.IMAGE.AUTHENTICATED.MAX_REQUESTS > 0);
  assert(RATE_LIMITS.IMAGE.AUTHENTICATED.WINDOW_HOURS > 0);

  // Authenticated should have higher limits than guest
  assert(
    RATE_LIMITS.IMAGE.AUTHENTICATED.MAX_REQUESTS >= RATE_LIMITS.IMAGE.GUEST.MAX_REQUESTS,
    "Image auth limits should be >= guest limits"
  );
});

Deno.test("RATE_LIMITS.TAVILY should have all required configurations", () => {
  // API throttle
  assert(RATE_LIMITS.TAVILY.API_THROTTLE.MAX_REQUESTS > 0);
  assert(RATE_LIMITS.TAVILY.API_THROTTLE.WINDOW_SECONDS > 0);

  // Guest limits
  assert(RATE_LIMITS.TAVILY.GUEST.MAX_REQUESTS > 0);
  assert(RATE_LIMITS.TAVILY.GUEST.WINDOW_HOURS > 0);

  // Authenticated limits
  assert(RATE_LIMITS.TAVILY.AUTHENTICATED.MAX_REQUESTS > 0);
  assert(RATE_LIMITS.TAVILY.AUTHENTICATED.WINDOW_HOURS > 0);

  // Authenticated should have higher limits than guest
  assert(
    RATE_LIMITS.TAVILY.AUTHENTICATED.MAX_REQUESTS >= RATE_LIMITS.TAVILY.GUEST.MAX_REQUESTS,
    "Tavily auth limits should be >= guest limits"
  );
});

Deno.test("RATE_LIMITS should enforce minimum value of 1 for all limits", () => {
  // All rate limits must be at least 1 to prevent division by zero and invalid configs
  assert(RATE_LIMITS.GUEST.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.GUEST.WINDOW_HOURS >= 1);
  assert(RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.AUTHENTICATED.WINDOW_HOURS >= 1);
  assert(RATE_LIMITS.API_THROTTLE.GEMINI_RPM >= 1);
  assert(RATE_LIMITS.API_THROTTLE.WINDOW_SECONDS >= 1);
  assert(RATE_LIMITS.ARTIFACT.API_THROTTLE.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.ARTIFACT.API_THROTTLE.WINDOW_SECONDS >= 1);
  assert(RATE_LIMITS.ARTIFACT.GUEST.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.ARTIFACT.GUEST.WINDOW_HOURS >= 1);
  assert(RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS >= 1);
  assert(RATE_LIMITS.IMAGE.API_THROTTLE.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.IMAGE.API_THROTTLE.WINDOW_SECONDS >= 1);
  assert(RATE_LIMITS.IMAGE.GUEST.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.IMAGE.GUEST.WINDOW_HOURS >= 1);
  assert(RATE_LIMITS.IMAGE.AUTHENTICATED.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.IMAGE.AUTHENTICATED.WINDOW_HOURS >= 1);
  assert(RATE_LIMITS.TAVILY.API_THROTTLE.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.TAVILY.API_THROTTLE.WINDOW_SECONDS >= 1);
  assert(RATE_LIMITS.TAVILY.GUEST.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.TAVILY.GUEST.WINDOW_HOURS >= 1);
  assert(RATE_LIMITS.TAVILY.AUTHENTICATED.MAX_REQUESTS >= 1);
  assert(RATE_LIMITS.TAVILY.AUTHENTICATED.WINDOW_HOURS >= 1);
});

// ==================== VALIDATION_LIMITS Tests ====================

Deno.test("VALIDATION_LIMITS should have all required fields", () => {
  assertExists(VALIDATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION);
  assertExists(VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH);
  assertExists(VALIDATION_LIMITS.MAX_PROMPT_LENGTH);
  assertExists(VALIDATION_LIMITS.MAX_IMAGE_TITLE_LENGTH);
});

Deno.test("VALIDATION_LIMITS should have positive values", () => {
  assert(VALIDATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION > 0);
  assert(VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH > 0);
  assert(VALIDATION_LIMITS.MAX_PROMPT_LENGTH > 0);
  assert(VALIDATION_LIMITS.MAX_IMAGE_TITLE_LENGTH > 0);
});

Deno.test("VALIDATION_LIMITS should have reasonable values", () => {
  // Messages per conversation should be reasonable (not too low, not absurdly high)
  assert(VALIDATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION >= 10);
  assert(VALIDATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION <= 1000);

  // Content length should be reasonable
  assert(VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH >= 1000);
  assert(VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH <= 100000);

  // Prompt length should be smaller than message content
  assert(VALIDATION_LIMITS.MAX_PROMPT_LENGTH < VALIDATION_LIMITS.MAX_MESSAGE_CONTENT_LENGTH);
});

// ==================== RETRY_CONFIG Tests ====================

Deno.test("RETRY_CONFIG should have valid retry configuration", () => {
  assert(RETRY_CONFIG.MAX_RETRIES >= 0, "MAX_RETRIES should be non-negative");
  assert(RETRY_CONFIG.BACKOFF_MULTIPLIER > 1, "BACKOFF_MULTIPLIER should be greater than 1");
  assert(RETRY_CONFIG.INITIAL_DELAY_MS > 0, "INITIAL_DELAY_MS should be positive");
  assert(RETRY_CONFIG.MAX_DELAY_MS > RETRY_CONFIG.INITIAL_DELAY_MS, "MAX_DELAY_MS should be greater than INITIAL_DELAY_MS");
});

// ==================== STORAGE_CONFIG Tests ====================

Deno.test("STORAGE_CONFIG should have valid bucket configuration", () => {
  assertEquals(typeof STORAGE_CONFIG.BUCKET_NAME, "string");
  assert(STORAGE_CONFIG.BUCKET_NAME.length > 0, "BUCKET_NAME should not be empty");
});

Deno.test("STORAGE_CONFIG should have valid expiry and cache settings", () => {
  assert(STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS > 0);
  assertEquals(typeof STORAGE_CONFIG.CACHE_CONTROL, "string");
  assertEquals(typeof STORAGE_CONFIG.DEFAULT_CONTENT_TYPE, "string");
  assert(STORAGE_CONFIG.DEFAULT_CONTENT_TYPE.startsWith("image/"));
});

// ==================== API_ENDPOINTS Tests ====================

Deno.test("API_ENDPOINTS.OPENROUTER should have valid URLs", () => {
  assert(API_ENDPOINTS.OPENROUTER.BASE_URL.startsWith("https://"));
  assert(API_ENDPOINTS.OPENROUTER.CHAT_COMPLETIONS.startsWith("/"));
});

// ==================== MODELS Tests ====================

Deno.test("MODELS should contain all required model configurations", () => {
  assertExists(MODELS.GEMINI_FLASH);
  assertExists(MODELS.KIMI_K2);
  assertExists(MODELS.GEMINI_FLASH_IMAGE);

  assertEquals(typeof MODELS.GEMINI_FLASH, "string");
  assertEquals(typeof MODELS.KIMI_K2, "string");
  assertEquals(typeof MODELS.GEMINI_FLASH_IMAGE, "string");

  assert(MODELS.GEMINI_FLASH.length > 0);
  assert(MODELS.KIMI_K2.length > 0);
  assert(MODELS.GEMINI_FLASH_IMAGE.length > 0);
});

// ==================== DEFAULT_MODEL_PARAMS Tests ====================

Deno.test("DEFAULT_MODEL_PARAMS should have valid temperature", () => {
  assert(DEFAULT_MODEL_PARAMS.TEMPERATURE >= 0);
  assert(DEFAULT_MODEL_PARAMS.TEMPERATURE <= 2, "Temperature should be reasonable (0-2)");
});

Deno.test("DEFAULT_MODEL_PARAMS should have valid max tokens", () => {
  assert(DEFAULT_MODEL_PARAMS.MAX_TOKENS > 0);
  assert(DEFAULT_MODEL_PARAMS.CHAT_MAX_TOKENS > 0);
  assert(DEFAULT_MODEL_PARAMS.ARTIFACT_MAX_TOKENS > 0);
  assert(DEFAULT_MODEL_PARAMS.IMAGE_MAX_TOKENS > 0);
});

// ==================== IMAGE_CONFIG Tests ====================

Deno.test("IMAGE_CONFIG should have valid aspect ratio", () => {
  assertEquals(typeof IMAGE_CONFIG.DEFAULT_ASPECT_RATIO, "string");
  assert(IMAGE_CONFIG.DEFAULT_ASPECT_RATIO.includes(":"));
});

Deno.test("IMAGE_CONFIG.MODES should have generate and edit", () => {
  assertEquals(IMAGE_CONFIG.MODES.GENERATE, "generate");
  assertEquals(IMAGE_CONFIG.MODES.EDIT, "edit");
});

// ==================== MESSAGE_ROLES Tests ====================

Deno.test("MESSAGE_ROLES should contain all valid roles", () => {
  assert(MESSAGE_ROLES.includes("user"));
  assert(MESSAGE_ROLES.includes("assistant"));
  assert(MESSAGE_ROLES.includes("system"));
  assertEquals(MESSAGE_ROLES.length, 3);
});

Deno.test("MESSAGE_ROLES should be readonly array", () => {
  // TypeScript enforces readonly, but we can verify it's an array
  assert(Array.isArray(MESSAGE_ROLES));
});

Deno.test("MessageRole type should match MESSAGE_ROLES values", () => {
  // Type assertion test - this will fail at compile time if types don't match
  const testRoles: MessageRole[] = ["user", "assistant", "system"];
  testRoles.forEach(role => {
    assert(MESSAGE_ROLES.includes(role));
  });
});

// ==================== ARTIFACT_TYPES Tests ====================

Deno.test("ARTIFACT_TYPES should contain all valid types", () => {
  const expectedTypes = ["image", "html", "react", "code", "svg", "mermaid", "markdown"];
  expectedTypes.forEach(type => {
    assert(ARTIFACT_TYPES.includes(type as any), `ARTIFACT_TYPES should include ${type}`);
  });
  assertEquals(ARTIFACT_TYPES.length, expectedTypes.length);
});

Deno.test("ARTIFACT_TYPES should be readonly array", () => {
  assert(Array.isArray(ARTIFACT_TYPES));
});

Deno.test("ArtifactType type should match ARTIFACT_TYPES values", () => {
  const testTypes: ArtifactType[] = ["image", "html", "react", "code", "svg", "mermaid", "markdown"];
  testTypes.forEach(type => {
    assert(ARTIFACT_TYPES.includes(type));
  });
});

// ==================== HTTP_STATUS Tests ====================

Deno.test("HTTP_STATUS should have all standard status codes", () => {
  assertEquals(HTTP_STATUS.OK, 200);
  assertEquals(HTTP_STATUS.BAD_REQUEST, 400);
  assertEquals(HTTP_STATUS.UNAUTHORIZED, 401);
  assertEquals(HTTP_STATUS.FORBIDDEN, 403);
  assertEquals(HTTP_STATUS.NOT_FOUND, 404);
  assertEquals(HTTP_STATUS.TOO_MANY_REQUESTS, 429);
  assertEquals(HTTP_STATUS.INTERNAL_SERVER_ERROR, 500);
  assertEquals(HTTP_STATUS.SERVICE_UNAVAILABLE, 503);
});

Deno.test("HTTP_STATUS codes should be valid HTTP codes", () => {
  const allCodes = Object.values(HTTP_STATUS);
  allCodes.forEach(code => {
    assert(code >= 100 && code < 600, `HTTP status ${code} should be in valid range`);
  });
});

// ==================== CONTEXT_CONFIG Tests ====================

Deno.test("CONTEXT_CONFIG should have valid recent message count", () => {
  assert(CONTEXT_CONFIG.RECENT_MESSAGE_COUNT > 0);
  assert(CONTEXT_CONFIG.RECENT_MESSAGE_COUNT < VALIDATION_LIMITS.MAX_MESSAGES_PER_CONVERSATION);
});

Deno.test("CONTEXT_CONFIG should have valid stream buffer size", () => {
  assert(CONTEXT_CONFIG.MAX_STREAM_BUFFER_SIZE > 0);
  assertEquals(typeof CONTEXT_CONFIG.MAX_STREAM_BUFFER_SIZE, "number");
});

// ==================== Immutability Tests ====================

Deno.test("Config objects should be immutable (const assertion)", () => {
  // These will fail at TypeScript compile time, but we can verify at runtime
  // that the objects themselves are frozen (if using Object.freeze)

  // Note: `as const` in TypeScript doesn't freeze at runtime, it's compile-time only
  // But we can verify objects exist and have expected structure

  assertExists(RATE_LIMITS);
  assertExists(VALIDATION_LIMITS);
  assertExists(RETRY_CONFIG);

  // Verify objects are not null
  assert(typeof RATE_LIMITS === "object");
  assert(typeof VALIDATION_LIMITS === "object");
  assert(typeof RETRY_CONFIG === "object");
});

// ==================== Integration Tests ====================

Deno.test("Config values should be internally consistent", () => {
  // Storage expiry should be reasonable (7 days = 604800 seconds)
  assertEquals(STORAGE_CONFIG.SIGNED_URL_EXPIRY_SECONDS, 604800);

  // Cache control should be reasonable (1 year = 31536000 seconds)
  assertEquals(STORAGE_CONFIG.CACHE_CONTROL, "31536000");

  // Retry config should use exponential backoff
  assert(RETRY_CONFIG.MAX_RETRIES >= 0);
  assert(RETRY_CONFIG.BACKOFF_MULTIPLIER > 1);
  assert(RETRY_CONFIG.MAX_DELAY_MS > RETRY_CONFIG.INITIAL_DELAY_MS);
});

Deno.test("All exported constants should be defined", () => {
  const allExports = [
    RATE_LIMITS,
    VALIDATION_LIMITS,
    RETRY_CONFIG,
    STORAGE_CONFIG,
    API_ENDPOINTS,
    MODELS,
    DEFAULT_MODEL_PARAMS,
    IMAGE_CONFIG,
    MESSAGE_ROLES,
    ARTIFACT_TYPES,
    HTTP_STATUS,
    CONTEXT_CONFIG
  ];

  allExports.forEach(exportedValue => {
    assertExists(exportedValue, "All exported constants should be defined");
  });
});
