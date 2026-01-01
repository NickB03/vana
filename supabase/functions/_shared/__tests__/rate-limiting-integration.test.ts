/**
 * Integration Tests for Rate Limiting RPC Functions
 *
 * These tests make REAL database calls to verify:
 * - check_guest_rate_limit() - Guest rate limiting (20 req/5h)
 * - check_user_rate_limit() - User rate limiting (100 req/5h)
 * - check_api_throttle() - API throttle (15 req/min)
 * - get_user_rate_limit_status() - Read-only status check
 *
 * To run:
 * SUPABASE_URL=http://127.0.0.1:54321 \
 * SUPABASE_SERVICE_ROLE_KEY=your_key \
 * deno test --allow-net --allow-env rate-limiting-integration.test.ts
 *
 * Prerequisites:
 * - Local Supabase running (supabase start)
 * - Rate limiting migration applied (20251108000001_comprehensive_rate_limiting.sql)
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Environment setup
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Create Supabase client (service role for RPC access)
const supabase = SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

/**
 * Helper: Generate unique identifier for test isolation
 */
function generateTestId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Helper: Clean up test data from guest_rate_limits table
 */
async function cleanupGuestRateLimit(identifier: string) {
  if (!supabase) return;

  const { error } = await supabase
    .from("guest_rate_limits")
    .delete()
    .eq("identifier", identifier);

  if (error) {
    console.warn(`⚠️ Cleanup failed for guest rate limit "${identifier}":`, error.message);
  }
}

/**
 * Helper: Clean up test data from user_rate_limits table
 */
async function cleanupUserRateLimit(userId: string) {
  if (!supabase) return;

  const { error } = await supabase
    .from("user_rate_limits")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.warn(`⚠️ Cleanup failed for user rate limit "${userId}":`, error.message);
  }
}

/**
 * Helper: Clean up test data from api_throttle_state table
 */
async function cleanupApiThrottle(apiName: string) {
  if (!supabase) return;

  const { error } = await supabase
    .from("api_throttle_state")
    .delete()
    .eq("api_name", apiName);

  if (error) {
    console.warn(`⚠️ Cleanup failed for API throttle "${apiName}":`, error.message);
  }
}

/**
 * Helper: Create a temporary test user
 */
async function createTestUser(email: string): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "test-password-123",
    email_confirm: true,
  });

  if (error) {
    console.error("Failed to create test user:", error);
    return null;
  }

  return data.user?.id || null;
}

/**
 * Helper: Delete a test user
 */
async function deleteTestUser(userId: string) {
  if (!supabase) return;

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    console.warn(`⚠️ Cleanup failed for test user "${userId}":`, error.message);
  }
}

// ============================================================================
// Test 1: check_guest_rate_limit - First Request (Within Limit)
// ============================================================================

Deno.test({
  name: "Rate Limiting - Guest: First request allowed",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n🔒 Testing guest rate limit - first request...");

    const testId = generateTestId("guest_first");

    try {
      const { data, error } = await supabase!.rpc("check_guest_rate_limit", {
        p_identifier: testId,
        p_max_requests: 20,
        p_window_hours: 5,
      });

      // Verify no error
      assertEquals(error, null, "Should not return error");
      assertExists(data, "Should return data");

      // Verify response structure
      assertEquals(data.allowed, true, "First request should be allowed");
      assertEquals(data.total, 20, "Total should match limit");
      assertEquals(data.remaining, 19, "Should have 19 remaining (20 - 1)");
      assertExists(data.reset_at, "Should have reset_at timestamp");

      console.log("✓ First request allowed");
      console.log(`  Remaining: ${data.remaining}/${data.total}`);
      console.log(`  Reset at: ${data.reset_at}`);
    } finally {
      await cleanupGuestRateLimit(testId);
    }
  },
});

// ============================================================================
// Test 2: check_guest_rate_limit - Exceeds Limit
// ============================================================================

Deno.test({
  name: "Rate Limiting - Guest: Exceeds limit after max requests",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n🔒 Testing guest rate limit - exceeding limit...");

    const testId = generateTestId("guest_exceed");
    const maxRequests = 3; // Use small limit for fast testing

    try {
      // Make max_requests successful calls
      for (let i = 0; i < maxRequests; i++) {
        const { data, error } = await supabase!.rpc("check_guest_rate_limit", {
          p_identifier: testId,
          p_max_requests: maxRequests,
          p_window_hours: 5,
        });

        assertEquals(error, null, `Request ${i + 1} should succeed`);
        assertEquals(data.allowed, true, `Request ${i + 1} should be allowed`);
      }

      // Next request should be blocked
      const { data: blockedData, error: blockedError } = await supabase!.rpc(
        "check_guest_rate_limit",
        {
          p_identifier: testId,
          p_max_requests: maxRequests,
          p_window_hours: 5,
        }
      );

      assertEquals(blockedError, null, "Should not return error");
      assertExists(blockedData, "Should return data");
      assertEquals(blockedData.allowed, false, "Request should be blocked");
      assertEquals(blockedData.remaining, 0, "Should have 0 remaining");
      assertExists(blockedData.reset_at, "Should have reset_at timestamp");

      console.log("✓ Rate limit enforced after max requests");
      console.log(`  Blocked at: ${maxRequests}/${maxRequests}`);
    } finally {
      await cleanupGuestRateLimit(testId);
    }
  },
});

// ============================================================================
// Test 3: check_guest_rate_limit - Window Reset
// ============================================================================

Deno.test({
  name: "Rate Limiting - Guest: Window reset after expiry",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n🔒 Testing guest rate limit - window reset...");

    const testId = generateTestId("guest_reset");
    const windowHours = 0; // Use 0 hours for immediate reset (window always expired)

    try {
      // First request
      const { data: firstData } = await supabase!.rpc("check_guest_rate_limit", {
        p_identifier: testId,
        p_max_requests: 20,
        p_window_hours: windowHours,
      });

      assertEquals(firstData.allowed, true, "First request should be allowed");
      assertEquals(firstData.remaining, 19, "Should have 19 remaining");

      // Wait a tiny bit to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second request (window should be expired due to 0 hour window)
      const { data: resetData } = await supabase!.rpc("check_guest_rate_limit", {
        p_identifier: testId,
        p_max_requests: 20,
        p_window_hours: windowHours,
      });

      assertEquals(resetData.allowed, true, "Request after reset should be allowed");
      assertEquals(
        resetData.remaining,
        19,
        "Should have reset to 19 remaining after window expiry"
      );

      console.log("✓ Window reset works correctly");
      console.log(`  Counter reset from ${firstData.remaining} to ${resetData.remaining}`);
    } finally {
      await cleanupGuestRateLimit(testId);
    }
  },
});

// ============================================================================
// Test 4: check_user_rate_limit - Authenticated User (Within Limit)
// ============================================================================

Deno.test({
  name: "Rate Limiting - User: First request allowed",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n🔐 Testing user rate limit - first request...");

    const testEmail = `test_user_${Date.now()}@example.com`;
    const userId = await createTestUser(testEmail);

    if (!userId) {
      throw new Error("Failed to create test user");
    }

    try {
      const { data, error } = await supabase!.rpc("check_user_rate_limit", {
        p_user_id: userId,
        p_max_requests: 100,
        p_window_hours: 5,
      });

      // Verify no error
      assertEquals(error, null, "Should not return error");
      assertExists(data, "Should return data");

      // Verify response structure
      assertEquals(data.allowed, true, "First request should be allowed");
      assertEquals(data.total, 100, "Total should match limit");
      assertEquals(data.remaining, 99, "Should have 99 remaining (100 - 1)");
      assertExists(data.reset_at, "Should have reset_at timestamp");

      console.log("✓ User first request allowed");
      console.log(`  User ID: ${userId}`);
      console.log(`  Remaining: ${data.remaining}/${data.total}`);
    } finally {
      await cleanupUserRateLimit(userId);
      await deleteTestUser(userId);
    }
  },
});

// ============================================================================
// Test 5: check_user_rate_limit - Exceeds Limit
// ============================================================================

Deno.test({
  name: "Rate Limiting - User: Exceeds limit after max requests",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n🔐 Testing user rate limit - exceeding limit...");

    const testEmail = `test_user_exceed_${Date.now()}@example.com`;
    const userId = await createTestUser(testEmail);

    if (!userId) {
      throw new Error("Failed to create test user");
    }

    const maxRequests = 3; // Use small limit for fast testing

    try {
      // Make max_requests successful calls
      for (let i = 0; i < maxRequests; i++) {
        const { data, error } = await supabase!.rpc("check_user_rate_limit", {
          p_user_id: userId,
          p_max_requests: maxRequests,
          p_window_hours: 5,
        });

        assertEquals(error, null, `Request ${i + 1} should succeed`);
        assertEquals(data.allowed, true, `Request ${i + 1} should be allowed`);
      }

      // Next request should be blocked
      const { data: blockedData, error: blockedError } = await supabase!.rpc(
        "check_user_rate_limit",
        {
          p_user_id: userId,
          p_max_requests: maxRequests,
          p_window_hours: 5,
        }
      );

      assertEquals(blockedError, null, "Should not return error");
      assertExists(blockedData, "Should return data");
      assertEquals(blockedData.allowed, false, "Request should be blocked");
      assertEquals(blockedData.remaining, 0, "Should have 0 remaining");

      console.log("✓ User rate limit enforced");
      console.log(`  Blocked at: ${maxRequests}/${maxRequests}`);
    } finally {
      await cleanupUserRateLimit(userId);
      await deleteTestUser(userId);
    }
  },
});

// ============================================================================
// Test 6: get_user_rate_limit_status - Read-Only Check
// ============================================================================

Deno.test({
  name: "Rate Limiting - User: Read-only status check",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n🔐 Testing user rate limit - read-only status...");

    const testEmail = `test_user_status_${Date.now()}@example.com`;
    const userId = await createTestUser(testEmail);

    if (!userId) {
      throw new Error("Failed to create test user");
    }

    try {
      // First, make actual requests to set up state
      await supabase!.rpc("check_user_rate_limit", {
        p_user_id: userId,
        p_max_requests: 100,
        p_window_hours: 5,
      });

      await supabase!.rpc("check_user_rate_limit", {
        p_user_id: userId,
        p_max_requests: 100,
        p_window_hours: 5,
      });

      // Now check status (should not increment counter)
      const { data: status1, error: error1 } = await supabase!.rpc(
        "get_user_rate_limit_status",
        {
          p_user_id: userId,
          p_max_requests: 100,
          p_window_hours: 5,
        }
      );

      assertEquals(error1, null, "First status check should succeed");
      assertExists(status1, "Should return data");
      assertEquals(status1.total, 100, "Total should be 100");
      assertEquals(status1.used, 2, "Should show 2 requests used");
      assertEquals(status1.remaining, 98, "Should have 98 remaining");

      // Second status check (should return same values - no increment)
      const { data: status2, error: error2 } = await supabase!.rpc(
        "get_user_rate_limit_status",
        {
          p_user_id: userId,
          p_max_requests: 100,
          p_window_hours: 5,
        }
      );

      assertEquals(error2, null, "Second status check should succeed");
      assertEquals(status2.used, 2, "Used count should not change (read-only)");
      assertEquals(
        status2.remaining,
        98,
        "Remaining should not change (read-only)"
      );

      console.log("✓ Read-only status check works");
      console.log(`  Used: ${status1.used}, Remaining: ${status1.remaining}`);
    } finally {
      await cleanupUserRateLimit(userId);
      await deleteTestUser(userId);
    }
  },
});

// ============================================================================
// Test 7: check_api_throttle - API Throttle (Within Limit)
// ============================================================================

Deno.test({
  name: "Rate Limiting - API: First request allowed",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n⚡ Testing API throttle - first request...");

    const apiName = generateTestId("api_first");

    try {
      const { data, error } = await supabase!.rpc("check_api_throttle", {
        p_api_name: apiName,
        p_max_requests: 15,
        p_window_seconds: 60,
      });

      // Verify no error
      assertEquals(error, null, "Should not return error");
      assertExists(data, "Should return data");

      // Verify response structure
      assertEquals(data.allowed, true, "First request should be allowed");
      assertEquals(data.total, 15, "Total should match limit");
      assertEquals(data.remaining, 14, "Should have 14 remaining (15 - 1)");
      assertExists(data.reset_at, "Should have reset_at timestamp");

      console.log("✓ API throttle first request allowed");
      console.log(`  API: ${apiName}`);
      console.log(`  Remaining: ${data.remaining}/${data.total}`);
    } finally {
      await cleanupApiThrottle(apiName);
    }
  },
});

// ============================================================================
// Test 8: check_api_throttle - Exceeds RPM Limit
// ============================================================================

Deno.test({
  name: "Rate Limiting - API: Exceeds RPM limit",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n⚡ Testing API throttle - exceeding RPM...");

    const apiName = generateTestId("api_exceed");
    const maxRequests = 3; // Use small limit for fast testing

    try {
      // Make max_requests successful calls
      for (let i = 0; i < maxRequests; i++) {
        const { data, error } = await supabase!.rpc("check_api_throttle", {
          p_api_name: apiName,
          p_max_requests: maxRequests,
          p_window_seconds: 60,
        });

        assertEquals(error, null, `Request ${i + 1} should succeed`);
        assertEquals(data.allowed, true, `Request ${i + 1} should be allowed`);
      }

      // Next request should be blocked
      const { data: blockedData, error: blockedError } = await supabase!.rpc(
        "check_api_throttle",
        {
          p_api_name: apiName,
          p_max_requests: maxRequests,
          p_window_seconds: 60,
        }
      );

      assertEquals(blockedError, null, "Should not return error");
      assertExists(blockedData, "Should return data");
      assertEquals(blockedData.allowed, false, "Request should be blocked");
      assertEquals(blockedData.remaining, 0, "Should have 0 remaining");
      assertExists(blockedData.reset_at, "Should have reset_at timestamp");
      assertExists(blockedData.retry_after, "Should have retry_after seconds");
      assert(
        blockedData.retry_after > 0,
        "retry_after should be positive number of seconds"
      );

      console.log("✓ API throttle enforced");
      console.log(`  Blocked at: ${maxRequests}/${maxRequests}`);
      console.log(`  Retry after: ${blockedData.retry_after}s`);
    } finally {
      await cleanupApiThrottle(apiName);
    }
  },
});

// ============================================================================
// Test 9: check_api_throttle - Window Reset
// ============================================================================

Deno.test({
  name: "Rate Limiting - API: Window reset after expiry",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n⚡ Testing API throttle - window reset...");

    const apiName = generateTestId("api_reset");
    const windowSeconds = 1; // Use 1 second for fast testing

    try {
      // First request
      const { data: firstData } = await supabase!.rpc("check_api_throttle", {
        p_api_name: apiName,
        p_max_requests: 15,
        p_window_seconds: windowSeconds,
      });

      assertEquals(firstData.allowed, true, "First request should be allowed");
      assertEquals(firstData.remaining, 14, "Should have 14 remaining");

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Second request (window should be expired)
      const { data: resetData } = await supabase!.rpc("check_api_throttle", {
        p_api_name: apiName,
        p_max_requests: 15,
        p_window_seconds: windowSeconds,
      });

      assertEquals(resetData.allowed, true, "Request after reset should be allowed");
      assertEquals(
        resetData.remaining,
        14,
        "Should have reset to 14 remaining after window expiry"
      );

      console.log("✓ API throttle window reset works");
      console.log(`  Counter reset from ${firstData.remaining} to ${resetData.remaining}`);
    } finally {
      await cleanupApiThrottle(apiName);
    }
  },
});

// ============================================================================
// Test 10: Multiple API Names (Isolation Test)
// ============================================================================

Deno.test({
  name: "Rate Limiting - API: Different API names are isolated",
  ignore: !SUPABASE_SERVICE_ROLE_KEY,
  async fn() {
    console.log("\n⚡ Testing API throttle - isolation between APIs...");

    const apiName1 = generateTestId("api_isolation_1");
    const apiName2 = generateTestId("api_isolation_2");

    try {
      // Make request to first API
      const { data: data1 } = await supabase!.rpc("check_api_throttle", {
        p_api_name: apiName1,
        p_max_requests: 15,
        p_window_seconds: 60,
      });

      // Make request to second API (should start fresh)
      const { data: data2 } = await supabase!.rpc("check_api_throttle", {
        p_api_name: apiName2,
        p_max_requests: 15,
        p_window_seconds: 60,
      });

      // Both should be allowed with full quota
      assertEquals(data1.allowed, true, "First API should be allowed");
      assertEquals(data1.remaining, 14, "First API should have 14 remaining");
      assertEquals(data2.allowed, true, "Second API should be allowed");
      assertEquals(data2.remaining, 14, "Second API should have 14 remaining");

      console.log("✓ API throttle isolation works");
      console.log(`  ${apiName1}: ${data1.remaining}/15`);
      console.log(`  ${apiName2}: ${data2.remaining}/15`);
    } finally {
      await cleanupApiThrottle(apiName1);
      await cleanupApiThrottle(apiName2);
    }
  },
});

// ============================================================================
// Test Banner
// ============================================================================

console.log("\n" + "=".repeat(70));
console.log("Rate Limiting Integration Tests");
console.log("=".repeat(70));
console.log("These tests verify REAL database RPC calls to rate limiting functions");
console.log("Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
console.log("=".repeat(70) + "\n");
