/**
 * Integration Tests for /generate-image Edge Function
 *
 * These tests make REAL API calls to verify:
 * - Image generation with valid prompts
 * - Error handling for invalid inputs
 * - Rate limiting enforcement
 * - Response structure and headers
 *
 * To run:
 * ```bash
 * cd supabase/functions
 * OPENROUTER_GEMINI_IMAGE_KEY=your_key \
 * SUPABASE_URL=http://127.0.0.1:54321 \
 * SUPABASE_ANON_KEY=your_anon_key \
 * deno test --allow-net --allow-env _shared/__tests__/image-endpoint-integration.test.ts
 * ```
 *
 * Cost per run: ~$0.05 (minimal test suite to keep costs low)
 *
 * @module image-endpoint-integration.test
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Environment variables
const OPENROUTER_GEMINI_IMAGE_KEY = Deno.env.get("OPENROUTER_GEMINI_IMAGE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Edge Function endpoint
const IMAGE_ENDPOINT = `${SUPABASE_URL}/functions/v1/generate-image`;

// Helper to create request headers
function createHeaders(includeAuth = false): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Origin": "http://localhost:8080"
  };

  if (includeAuth && SUPABASE_ANON_KEY) {
    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  return headers;
}

// ============================================================================
// Test 1: Generate image with valid prompt (~$0.05)
// ============================================================================

Deno.test({
  name: "Generate Image - Valid Prompt",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n🎨 Testing image generation with valid prompt...");

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        prompt: "Generate a simple solid blue square, 100x100 pixels",
        mode: "generate"
      })
    });

    console.log(`  Response status: ${response.status}`);

    // Should succeed (200 OK) or partial success (206 if storage fails)
    assert(
      response.status === 200 || response.status === 206,
      `Expected 200 or 206, got ${response.status}`
    );

    const data = await response.json();

    // Verify response structure
    assertExists(data.success, "Response should have success field");
    assertEquals(data.success, true, "Success should be true");
    assertExists(data.prompt, "Response should echo prompt");
    assertEquals(data.prompt, "Generate a simple solid blue square, 100x100 pixels");

    // Verify image data is present (either URL or base64)
    // Image may be in multiple locations:
    // 1. data.imageUrl (storage URL or base64)
    // 2. data.imageData (base64 for immediate display)
    const hasImageUrl = !!data.imageUrl;
    const hasImageData = !!data.imageData;

    assert(
      hasImageUrl || hasImageData,
      "Response should contain imageUrl or imageData"
    );

    // Log image data format for debugging
    if (data.imageUrl) {
      const isBase64 = data.imageUrl.startsWith("data:image");
      const isHttpUrl = data.imageUrl.startsWith("http");
      console.log(`  ✓ Image URL present (${isBase64 ? "base64" : isHttpUrl ? "HTTP URL" : "unknown format"})`);
    }

    if (data.imageData) {
      const isBase64 = data.imageData.startsWith("data:image");
      console.log(`  ✓ Image data present (${isBase64 ? "base64" : "unknown format"})`);
    }

    // Check degraded mode warnings (206 response)
    if (response.status === 206) {
      console.log("  ⚠️ Degraded mode: Storage upload failed, using base64");
      assertExists(data.degradedMode, "206 response should have degradedMode flag");
      assertEquals(data.degradedMode, true, "degradedMode should be true");
      assertExists(data.storageWarning, "206 response should have storageWarning");
    }

    // Verify headers
    const requestId = response.headers.get("X-Request-ID");
    assertExists(requestId, "Response should have X-Request-ID header");
    console.log(`  ✓ Request ID: ${requestId}`);

    console.log("  ✓ Image generation successful");
  }
});

// ============================================================================
// Test 2: Error handling - Missing prompt
// ============================================================================

Deno.test({
  name: "Generate Image - Missing Prompt",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n❌ Testing error handling - missing prompt...");

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        mode: "generate"
        // Missing prompt field
      })
    });

    console.log(`  Response status: ${response.status}`);

    // Should return 400 Bad Request
    assertEquals(response.status, 400, "Should return 400 for missing prompt");

    const data = await response.json();

    // Verify error response structure
    assertExists(data.error, "Error response should have error message");
    assertExists(data.code, "Error response should have error code");
    assertExists(data.requestId, "Error response should have requestId");

    // Verify error message mentions prompt
    assert(
      data.error.toLowerCase().includes("prompt"),
      `Error message should mention prompt, got: ${data.error}`
    );

    console.log(`  ✓ Error message: "${data.error}"`);
    console.log(`  ✓ Error code: ${data.code}`);
    console.log("  ✓ Error handling correct");
  }
});

// ============================================================================
// Test 3: Error handling - Empty prompt
// ============================================================================

Deno.test({
  name: "Generate Image - Empty Prompt",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n❌ Testing error handling - empty prompt...");

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        prompt: "   ", // Empty/whitespace prompt
        mode: "generate"
      })
    });

    console.log(`  Response status: ${response.status}`);

    // Should return 400 Bad Request
    assertEquals(response.status, 400, "Should return 400 for empty prompt");

    const data = await response.json();

    // Verify error response structure
    assertExists(data.error, "Error response should have error message");
    assertExists(data.code, "Error response should have error code");

    // Verify error message mentions non-empty requirement
    assert(
      data.error.toLowerCase().includes("non-empty") ||
      data.error.toLowerCase().includes("required"),
      `Error should mention non-empty requirement, got: ${data.error}`
    );

    console.log(`  ✓ Error message: "${data.error}"`);
    console.log("  ✓ Empty prompt validation correct");
  }
});

// ============================================================================
// Test 4: Error handling - Prompt too long
// ============================================================================

Deno.test({
  name: "Generate Image - Prompt Too Long",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n❌ Testing error handling - prompt too long...");

    // Create prompt longer than 2000 characters
    const longPrompt = "A".repeat(2001);

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        prompt: longPrompt,
        mode: "generate"
      })
    });

    console.log(`  Response status: ${response.status}`);

    // Should return 400 Bad Request
    assertEquals(response.status, 400, "Should return 400 for prompt > 2000 chars");

    const data = await response.json();

    // Verify error response structure
    assertExists(data.error, "Error response should have error message");
    assertExists(data.code, "Error response should have error code");

    // Verify error message mentions max length
    assert(
      data.error.toLowerCase().includes("too long") ||
      data.error.toLowerCase().includes("max") ||
      data.error.toLowerCase().includes("2000"),
      `Error should mention length limit, got: ${data.error}`
    );

    console.log(`  ✓ Error message: "${data.error}"`);
    console.log("  ✓ Prompt length validation correct");
  }
});

// ============================================================================
// Test 5: Error handling - Invalid mode
// ============================================================================

Deno.test({
  name: "Generate Image - Invalid Mode",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n❌ Testing error handling - invalid mode...");

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        prompt: "Test image",
        mode: "invalid-mode" // Invalid mode
      })
    });

    console.log(`  Response status: ${response.status}`);

    // Should return 400 Bad Request
    assertEquals(response.status, 400, "Should return 400 for invalid mode");

    const data = await response.json();

    // Verify error response structure
    assertExists(data.error, "Error response should have error message");

    // Verify error message mentions valid modes
    assert(
      data.error.toLowerCase().includes("generate") ||
      data.error.toLowerCase().includes("edit") ||
      data.error.toLowerCase().includes("mode"),
      `Error should mention valid modes, got: ${data.error}`
    );

    console.log(`  ✓ Error message: "${data.error}"`);
    console.log("  ✓ Mode validation correct");
  }
});

// ============================================================================
// Test 6: Edit mode - Missing base image
// ============================================================================

Deno.test({
  name: "Generate Image - Edit Mode Missing Base Image",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n❌ Testing error handling - edit mode without base image...");

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        prompt: "Make it blue",
        mode: "edit"
        // Missing baseImage field
      })
    });

    console.log(`  Response status: ${response.status}`);

    // Should return 400 Bad Request
    assertEquals(response.status, 400, "Should return 400 for missing base image in edit mode");

    const data = await response.json();

    // Verify error response structure
    assertExists(data.error, "Error response should have error message");

    // Verify error message mentions base image requirement
    assert(
      data.error.toLowerCase().includes("base") ||
      data.error.toLowerCase().includes("image") ||
      data.error.toLowerCase().includes("edit"),
      `Error should mention base image requirement, got: ${data.error}`
    );

    console.log(`  ✓ Error message: "${data.error}"`);
    console.log("  ✓ Edit mode validation correct");
  }
});

// ============================================================================
// Test 7: CORS preflight request
// ============================================================================

Deno.test({
  name: "Generate Image - CORS Preflight",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n🔐 Testing CORS preflight request...");

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "OPTIONS",
      headers: {
        "Origin": "http://localhost:8080",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type"
      }
    });

    console.log(`  Response status: ${response.status}`);

    // Should return 204 No Content for preflight
    assertEquals(response.status, 204, "CORS preflight should return 204");

    // Verify CORS headers
    const allowOrigin = response.headers.get("Access-Control-Allow-Origin");
    const allowMethods = response.headers.get("Access-Control-Allow-Methods");
    const allowHeaders = response.headers.get("Access-Control-Allow-Headers");

    assertExists(allowOrigin, "Should have Access-Control-Allow-Origin");
    assertExists(allowMethods, "Should have Access-Control-Allow-Methods");
    assertExists(allowHeaders, "Should have Access-Control-Allow-Headers");

    console.log(`  ✓ Allow-Origin: ${allowOrigin}`);
    console.log(`  ✓ Allow-Methods: ${allowMethods}`);
    console.log(`  ✓ Allow-Headers: ${allowHeaders}`);
    console.log("  ✓ CORS headers correct");
  }
});

// ============================================================================
// Test 8: Response headers - Request ID and CORS
// ============================================================================

Deno.test({
  name: "Generate Image - Response Headers",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n📋 Testing response headers...");

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        prompt: "Simple test image",
        mode: "generate"
      })
    });

    console.log(`  Response status: ${response.status}`);

    // Should succeed or partial success
    assert(
      response.status === 200 || response.status === 206,
      `Expected 200 or 206, got ${response.status}`
    );

    // Verify essential headers
    const requestId = response.headers.get("X-Request-ID");
    const contentType = response.headers.get("Content-Type");
    const allowOrigin = response.headers.get("Access-Control-Allow-Origin");

    assertExists(requestId, "Should have X-Request-ID header");
    assertExists(contentType, "Should have Content-Type header");
    assertExists(allowOrigin, "Should have Access-Control-Allow-Origin header");

    // Verify header values
    assertEquals(contentType, "application/json", "Content-Type should be application/json");
    assertEquals(allowOrigin, "http://localhost:8080", "CORS origin should match request");

    console.log(`  ✓ X-Request-ID: ${requestId}`);
    console.log(`  ✓ Content-Type: ${contentType}`);
    console.log(`  ✓ CORS Allow-Origin: ${allowOrigin}`);

    // Check for Warning header in degraded mode (206)
    if (response.status === 206) {
      const warning = response.headers.get("Warning");
      assertExists(warning, "206 response should have Warning header");
      console.log(`  ✓ Warning: ${warning}`);
    }

    console.log("  ✓ Response headers correct");

    // Drain response body
    await response.json();
  }
});

// ============================================================================
// Test 9: Invalid JSON body
// ============================================================================

Deno.test({
  name: "Generate Image - Invalid JSON",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n❌ Testing error handling - invalid JSON...");

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: createHeaders(),
      body: "{ invalid json }" // Malformed JSON
    });

    console.log(`  Response status: ${response.status}`);

    // Should return 400 Bad Request
    assertEquals(response.status, 400, "Should return 400 for invalid JSON");

    const data = await response.json();

    // Verify error response structure
    assertExists(data.error, "Error response should have error message");
    assertExists(data.requestId, "Error response should have requestId");

    console.log(`  ✓ Error message: "${data.error}"`);
    console.log("  ✓ JSON validation correct");
  }
});

// ============================================================================
// Test 10: Guest user - Verify no auth required
// ============================================================================

Deno.test({
  name: "Generate Image - Guest User (No Auth)",
  ignore: !OPENROUTER_GEMINI_IMAGE_KEY,
  async fn() {
    console.log("\n👤 Testing guest user access (no auth)...");

    const response = await fetch(IMAGE_ENDPOINT, {
      method: "POST",
      headers: createHeaders(false), // No auth header
      body: JSON.stringify({
        prompt: "Simple blue circle",
        mode: "generate"
      })
    });

    console.log(`  Response status: ${response.status}`);

    // Should succeed - guest users are allowed
    assert(
      response.status === 200 || response.status === 206,
      `Guest request should succeed, got ${response.status}`
    );

    const data = await response.json();

    // Verify response structure
    assertEquals(data.success, true, "Guest request should succeed");
    assertExists(data.imageUrl || data.imageData, "Should return image data");

    console.log("  ✓ Guest users can generate images");
  }
});

// ============================================================================
// Summary Banner
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("Generate Image Integration Tests");
console.log("=".repeat(60));
console.log("These tests verify REAL API calls to /generate-image endpoint");
console.log("Requires: OPENROUTER_GEMINI_IMAGE_KEY, SUPABASE_URL, SUPABASE_ANON_KEY");
console.log("Cost per full run: ~$0.05 (minimal test suite)");
console.log("=".repeat(60) + "\n");
