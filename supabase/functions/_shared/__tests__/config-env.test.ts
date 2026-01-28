/**
 * Environment variable tests for config.ts
 *
 * Tests dynamic rate limit configuration via environment variables.
 * These tests verify that:
 * - Environment variables override default values
 * - Invalid values fall back to defaults
 * - Minimum value validation works correctly
 * - Type safety is maintained
 */

import { assertEquals, assert } from "@std/assert";

/**
 * Helper to dynamically re-import config with new environment variables
 *
 * Note: This creates a new module instance for isolated testing
 */
async function getConfigWithEnv(envVars: Record<string, string>) {
  // Set environment variables
  for (const [key, value] of Object.entries(envVars)) {
    Deno.env.set(key, value);
  }

  // Dynamic import with cache-busting query param to force re-evaluation
  const timestamp = Date.now();
  const config = await import(`../config.ts?t=${timestamp}`);

  // Clean up environment variables
  for (const key of Object.keys(envVars)) {
    Deno.env.delete(key);
  }

  return config;
}

// ==================== Environment Variable Override Tests ====================

Deno.test("RATE_LIMITS.GUEST should use environment variable override", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "50",
    RATE_LIMIT_GUEST_WINDOW: "10"
  });

  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 50);
  assertEquals(config.RATE_LIMITS.GUEST.WINDOW_HOURS, 10);
});

Deno.test("RATE_LIMITS.AUTHENTICATED should use environment variable override", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_AUTH_MAX: "200",
    RATE_LIMIT_AUTH_WINDOW: "3"
  });

  assertEquals(config.RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS, 200);
  assertEquals(config.RATE_LIMITS.AUTHENTICATED.WINDOW_HOURS, 3);
});

Deno.test("RATE_LIMITS.API_THROTTLE should use environment variable override", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_API_THROTTLE_RPM: "30",
    RATE_LIMIT_API_THROTTLE_WINDOW: "120"
  });

  assertEquals(config.RATE_LIMITS.API_THROTTLE.GEMINI_RPM, 30);
  assertEquals(config.RATE_LIMITS.API_THROTTLE.WINDOW_SECONDS, 120);
});

Deno.test("RATE_LIMITS.ARTIFACT should use environment variable overrides", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_ARTIFACT_API_MAX: "20",
    RATE_LIMIT_ARTIFACT_API_WINDOW: "90",
    RATE_LIMIT_ARTIFACT_GUEST_MAX: "10",
    RATE_LIMIT_ARTIFACT_GUEST_WINDOW: "3",
    RATE_LIMIT_ARTIFACT_AUTH_MAX: "100",
    RATE_LIMIT_ARTIFACT_AUTH_WINDOW: "2"
  });

  assertEquals(config.RATE_LIMITS.ARTIFACT.API_THROTTLE.MAX_REQUESTS, 20);
  assertEquals(config.RATE_LIMITS.ARTIFACT.API_THROTTLE.WINDOW_SECONDS, 90);
  assertEquals(config.RATE_LIMITS.ARTIFACT.GUEST.MAX_REQUESTS, 10);
  assertEquals(config.RATE_LIMITS.ARTIFACT.GUEST.WINDOW_HOURS, 3);
  assertEquals(config.RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS, 100);
  assertEquals(config.RATE_LIMITS.ARTIFACT.AUTHENTICATED.WINDOW_HOURS, 2);
});

// ==================== Validation Tests ====================

Deno.test("Invalid numeric values should fall back to defaults", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "invalid",
    RATE_LIMIT_GUEST_WINDOW: "not-a-number"
  });

  // Should use defaults (20 and 5)
  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 20);
  assertEquals(config.RATE_LIMITS.GUEST.WINDOW_HOURS, 5);
});

Deno.test("Negative values should fall back to defaults", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "-5",
    RATE_LIMIT_AUTH_WINDOW: "-10"
  });

  // Should use defaults due to minimum value validation
  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 20);
  assertEquals(config.RATE_LIMITS.AUTHENTICATED.WINDOW_HOURS, 5);
});

Deno.test("Zero values should fall back to defaults (minimum is 1)", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "0",
    RATE_LIMIT_GUEST_WINDOW: "0"
  });

  // Should use defaults because minimum value is 1
  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 20);
  assertEquals(config.RATE_LIMITS.GUEST.WINDOW_HOURS, 5);
});

Deno.test("Floating point values should be parsed as integers", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "25.7",
    RATE_LIMIT_GUEST_WINDOW: "3.9"
  });

  // parseInt() truncates to integer
  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 25);
  assertEquals(config.RATE_LIMITS.GUEST.WINDOW_HOURS, 3);
});

Deno.test("Very large values should be accepted", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "999999",
    RATE_LIMIT_AUTH_MAX: "1000000"
  });

  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 999999);
  assertEquals(config.RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS, 1000000);
});

Deno.test("Minimum value of 1 should be accepted", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "1",
    RATE_LIMIT_GUEST_WINDOW: "1"
  });

  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 1);
  assertEquals(config.RATE_LIMITS.GUEST.WINDOW_HOURS, 1);
});

// ==================== Mixed Configuration Tests ====================

Deno.test("Partial environment variable overrides should work", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "30"
    // RATE_LIMIT_GUEST_WINDOW not set - should use default
  });

  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 30);
  assertEquals(config.RATE_LIMITS.GUEST.WINDOW_HOURS, 5); // Default
});

Deno.test("Different rate limit types can have independent overrides", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "15",
    RATE_LIMIT_IMAGE_GUEST_MAX: "25",
    RATE_LIMIT_TAVILY_GUEST_MAX: "8"
  });

  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 15);
  assertEquals(config.RATE_LIMITS.IMAGE.GUEST.MAX_REQUESTS, 25);
  assertEquals(config.RATE_LIMITS.TAVILY.GUEST.MAX_REQUESTS, 8);
});

// ==================== Type Safety Tests ====================

Deno.test("Environment variables should result in number types", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "42",
    RATE_LIMIT_GUEST_WINDOW: "7"
  });

  assertEquals(typeof config.RATE_LIMITS.GUEST.MAX_REQUESTS, "number");
  assertEquals(typeof config.RATE_LIMITS.GUEST.WINDOW_HOURS, "number");
  assert(Number.isInteger(config.RATE_LIMITS.GUEST.MAX_REQUESTS));
  assert(Number.isInteger(config.RATE_LIMITS.GUEST.WINDOW_HOURS));
});

// ==================== Real-World Scenario Tests ====================

Deno.test("DDoS mitigation scenario: tighten all guest limits", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_GUEST_MAX: "5",
    RATE_LIMIT_GUEST_WINDOW: "1",
    RATE_LIMIT_ARTIFACT_GUEST_MAX: "2",
    RATE_LIMIT_ARTIFACT_GUEST_WINDOW: "1",
    RATE_LIMIT_IMAGE_GUEST_MAX: "3",
    RATE_LIMIT_IMAGE_GUEST_WINDOW: "1",
    RATE_LIMIT_TAVILY_GUEST_MAX: "1",
    RATE_LIMIT_TAVILY_GUEST_WINDOW: "1"
  });

  // Verify all guest limits are tightened
  assertEquals(config.RATE_LIMITS.GUEST.MAX_REQUESTS, 5);
  assertEquals(config.RATE_LIMITS.GUEST.WINDOW_HOURS, 1);
  assertEquals(config.RATE_LIMITS.ARTIFACT.GUEST.MAX_REQUESTS, 2);
  assertEquals(config.RATE_LIMITS.ARTIFACT.GUEST.WINDOW_HOURS, 1);
  assertEquals(config.RATE_LIMITS.IMAGE.GUEST.MAX_REQUESTS, 3);
  assertEquals(config.RATE_LIMITS.IMAGE.GUEST.WINDOW_HOURS, 1);
  assertEquals(config.RATE_LIMITS.TAVILY.GUEST.MAX_REQUESTS, 1);
  assertEquals(config.RATE_LIMITS.TAVILY.GUEST.WINDOW_HOURS, 1);
});

Deno.test("Capacity expansion scenario: increase authenticated limits", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_AUTH_MAX: "500",
    RATE_LIMIT_ARTIFACT_AUTH_MAX: "200",
    RATE_LIMIT_IMAGE_AUTH_MAX: "150",
    RATE_LIMIT_TAVILY_AUTH_MAX: "100"
  });

  // Verify all authenticated limits are increased
  assertEquals(config.RATE_LIMITS.AUTHENTICATED.MAX_REQUESTS, 500);
  assertEquals(config.RATE_LIMITS.ARTIFACT.AUTHENTICATED.MAX_REQUESTS, 200);
  assertEquals(config.RATE_LIMITS.IMAGE.AUTHENTICATED.MAX_REQUESTS, 150);
  assertEquals(config.RATE_LIMITS.TAVILY.AUTHENTICATED.MAX_REQUESTS, 100);
});

Deno.test("API throttle adjustment: reduce external API load", async () => {
  const config = await getConfigWithEnv({
    RATE_LIMIT_API_THROTTLE_RPM: "5",
    RATE_LIMIT_ARTIFACT_API_MAX: "3",
    RATE_LIMIT_IMAGE_API_MAX: "5",
    RATE_LIMIT_TAVILY_API_MAX: "2"
  });

  // Verify all API throttles are reduced
  assertEquals(config.RATE_LIMITS.API_THROTTLE.GEMINI_RPM, 5);
  assertEquals(config.RATE_LIMITS.ARTIFACT.API_THROTTLE.MAX_REQUESTS, 3);
  assertEquals(config.RATE_LIMITS.IMAGE.API_THROTTLE.MAX_REQUESTS, 5);
  assertEquals(config.RATE_LIMITS.TAVILY.API_THROTTLE.MAX_REQUESTS, 2);
});
