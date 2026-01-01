/**
 * Integration Tests for OpenRouter API
 *
 * These tests make REAL API calls to verify:
 * - API key is valid and working
 * - Image generation works
 * - Chat fallback works
 *
 * To run:
 * OPENROUTER_GEMINI_IMAGE_KEY=your_key deno test --allow-net --allow-env openrouter-integration.test.ts
 *
 * Cost per run: ~$0.05
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const OPENROUTER_IMAGE_KEY = Deno.env.get("OPENROUTER_GEMINI_IMAGE_KEY");
const OPENROUTER_FLASH_KEY = Deno.env.get("OPENROUTER_GEMINI_FLASH_KEY");
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// ============================================================================
// Test 1: Chat Completion with Gemini Flash (~$0.001)
// ============================================================================

Deno.test({
  name: "OpenRouter Integration - Gemini Flash Chat",
  ignore: !OPENROUTER_FLASH_KEY,
  async fn() {
    console.log("\n💬 Testing OpenRouter Gemini Flash chat...");

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_FLASH_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vana.sh",
        "X-Title": "Vana Integration Test",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "user", content: "Say exactly: 'OpenRouter test passed'" }
        ],
        max_tokens: 50,
        temperature: 0,
      }),
    });

    assertEquals(response.ok, true, `API returned ${response.status}: ${await response.clone().text()}`);

    const data = await response.json();

    // Verify response structure
    assertExists(data.choices, "Response should have choices");
    assertExists(data.choices[0].message.content, "Should have content");

    console.log("✓ Chat completion successful");
    console.log(`  Response: "${data.choices[0].message.content.substring(0, 50)}..."`);
    console.log(`  Model: ${data.model}`);
  },
});

// ============================================================================
// Test 2: Image Generation (~$0.05)
// ============================================================================

Deno.test({
  name: "OpenRouter Integration - Image Generation",
  ignore: !OPENROUTER_IMAGE_KEY,
  async fn() {
    console.log("\n🖼️ Testing OpenRouter image generation...");

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_IMAGE_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vana.sh",
        "X-Title": "Vana Integration Test",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          { role: "user", content: "Generate a simple solid blue square, 100x100 pixels" }
        ],
        max_tokens: 1000,
      }),
    });

    assertEquals(response.ok, true, `API returned ${response.status}`);

    const data = await response.json();

    // Verify response structure
    assertExists(data.choices, "Response should have choices");
    assertExists(data.choices[0].message, "Should have message");

    const message = data.choices[0].message;

    // Image may be in multiple locations (matching production code):
    // 1. message.images[0].image_url.url
    // 2. message.content (as URL, data URL, or base64)
    let hasImageData = false;
    let imageSource = "none";

    // Check images array first
    if (message.images && Array.isArray(message.images) && message.images.length > 0) {
      hasImageData = !!message.images[0]?.image_url?.url;
      if (hasImageData) imageSource = "images array";
    }

    // Check content field
    const content = message.content || "";
    if (!hasImageData && content.length > 0) {
      hasImageData = content.startsWith("http") ||
                     content.startsWith("data:image") ||
                     (content.length > 100 && !content.includes(" "));  // Likely base64
      if (hasImageData) imageSource = "content field";
    }

    // Check for multipart content
    if (!hasImageData && Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === "image_url" && part.image_url?.url) {
          hasImageData = true;
          imageSource = "multipart content";
          break;
        }
      }
    }

    console.log("✓ Image generation request successful");
    console.log(`  Model: ${data.model}`);
    console.log(`  Image found: ${hasImageData} (source: ${imageSource})`);
    console.log(`  Content length: ${content.length} chars`);

    // Assert image data was actually returned - this is the core purpose of the test
    assert(
      hasImageData,
      `Image generation should return image data. Source: ${imageSource}, content length: ${content.length}`
    );
    assert(data.choices.length > 0, "Should have at least one choice");
  },
});

// ============================================================================
// Test 3: Error Handling - Invalid API Key
// ============================================================================

Deno.test({
  name: "OpenRouter Integration - Invalid Key Handling",
  async fn() {
    console.log("\n⚠️ Testing OpenRouter error handling...");

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": "Bearer invalid-key-12345",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: "test" }],
      }),
    });

    // Should return 401 Unauthorized
    assertEquals(response.ok, false, "Invalid key should fail");
    assert(response.status === 401 || response.status === 403, "Should return auth error");

    console.log("✓ Error handling works");
    console.log(`  Status: ${response.status}`);

    // Drain response
    await response.text();
  },
});

// ============================================================================
// Test 4: Rate Limit Headers
// ============================================================================

Deno.test({
  name: "OpenRouter Integration - Rate Limit Headers",
  ignore: !OPENROUTER_FLASH_KEY,
  async fn() {
    console.log("\n📋 Testing OpenRouter headers...");

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_FLASH_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vana.sh",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
    });

    assertEquals(response.ok, true);

    // Check for rate limit headers
    const remaining = response.headers.get("x-ratelimit-remaining");
    const limit = response.headers.get("x-ratelimit-limit");

    console.log("✓ Headers received");
    console.log(`  Rate Limit: ${limit || "not provided"}`);
    console.log(`  Remaining: ${remaining || "not provided"}`);

    // Drain response
    await response.json();
  },
});

console.log("\n" + "=".repeat(60));
console.log("OpenRouter Integration Tests");
console.log("=".repeat(60));
console.log("These tests verify REAL API calls to OpenRouter");
console.log("Requires: OPENROUTER_GEMINI_FLASH_KEY, OPENROUTER_GEMINI_IMAGE_KEY");
console.log("Cost per full run: ~$0.05");
console.log("=".repeat(60) + "\n");
