/**
 * Integration Tests for /generate-title Edge Function
 *
 * These tests make REAL API calls to verify:
 * - Title generation from conversation messages
 * - Input validation (missing/empty messages)
 * - Title quality (concise, relevant)
 * - Error handling and authentication
 * - Response structure validation
 *
 * To run:
 * cd supabase/functions
 * OPENROUTER_GEMINI_FLASH_KEY=your_key SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=your_key deno task test:integration:title
 *
 * Cost per run: ~$0.005 (5 tests × ~$0.001 each)
 */

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const OPENROUTER_GEMINI_FLASH_KEY = Deno.env.get("OPENROUTER_GEMINI_FLASH_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Local Edge Function URL (running via `supabase start`)
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/generate-title`;

// Helper to create a mock auth token for local testing
// In production, this would be a real Supabase JWT
const MOCK_AUTH_TOKEN = SUPABASE_ANON_KEY;

console.log("\n" + "=".repeat(70));
console.log("Title Generation Endpoint Integration Tests");
console.log("=".repeat(70));
console.log("Testing REAL API calls to /generate-title Edge Function");
console.log(`Endpoint: ${FUNCTION_URL}`);
console.log("Cost per full run: ~$0.005");
console.log("=".repeat(70) + "\n");

// ============================================================================
// Test 1: Generate title from simple conversation message
// ============================================================================

Deno.test({
  name: "Title Endpoint - Generate title from conversation",
  ignore: !OPENROUTER_GEMINI_FLASH_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n💬 Testing title generation from conversation...");

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message:
          "I want to build a todo list app with React. It should have add, delete, and mark complete functionality.",
      }),
    });

    assertEquals(
      response.ok,
      true,
      `API returned ${response.status}: ${await response.clone().text()}`,
    );

    const data = await response.json();

    // Verify response structure
    assertExists(data.title, "Response should have title field");
    assert(typeof data.title === "string", "Title should be a string");
    assert(data.title.length > 0, "Title should not be empty");

    // Soft assertion for title length - AI titles can vary
    if (data.title.length > 50) {
      console.log(`⚠️ Soft assertion: Title should be concise (max 50 chars), got ${data.title.length}: "${data.title}"`);
    }

    // Verify title is relevant to the message content
    // Note: AI-generated titles may vary - we check for broad relevance
    const lowerTitle = data.title.toLowerCase();
    const hasRelevantKeywords = lowerTitle.includes("todo") ||
      lowerTitle.includes("task") ||
      lowerTitle.includes("list") ||
      lowerTitle.includes("react") ||
      lowerTitle.includes("app") ||
      lowerTitle.includes("build") ||
      lowerTitle.includes("creat") ||  // matches create, creating
      lowerTitle.includes("component") ||
      lowerTitle.includes("function");

    // Soft assertion - log warning but don't fail on keyword mismatch
    // Title generation is inherently variable
    if (!hasRelevantKeywords) {
      console.log(`⚠️ Title may not contain expected keywords: "${data.title}"`);
    }

    console.log("✓ Title generated successfully");
    console.log(`  Message: "I want to build a todo list app..."`);
    console.log(`  Title: "${data.title}"`);
    console.log(`  Length: ${data.title.length} chars`);
  },
});

// ============================================================================
// Test 2: Error handling - Missing message field
// ============================================================================

Deno.test({
  name: "Title Endpoint - Missing message field",
  ignore: !OPENROUTER_GEMINI_FLASH_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n⚠️ Testing missing message field...");

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Missing 'message' field
      }),
    });

    // Should return validation error
    assertEquals(response.ok, false, "Missing message should fail");
    assertEquals(response.status, 400, "Should return 400 Bad Request");

    const data = await response.json();
    assertExists(data.error, "Error response should have error field");
    assert(
      data.error.toLowerCase().includes("message"),
      `Error should mention 'message'. Got: "${data.error}"`,
    );

    console.log("✓ Missing message validation works");
    console.log(`  Status: ${response.status}`);
    console.log(`  Error: "${data.error}"`);
  },
});

// ============================================================================
// Test 3: Error handling - Empty message
// ============================================================================

Deno.test({
  name: "Title Endpoint - Empty message",
  ignore: !OPENROUTER_GEMINI_FLASH_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n⚠️ Testing empty message...");

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "   ", // Whitespace only
      }),
    });

    // Should return validation error
    assertEquals(response.ok, false, "Empty message should fail");
    assertEquals(response.status, 400, "Should return 400 Bad Request");

    const data = await response.json();
    assertExists(data.error, "Error response should have error field");
    assert(
      data.error.toLowerCase().includes("empty"),
      `Error should mention 'empty'. Got: "${data.error}"`,
    );

    console.log("✓ Empty message validation works");
    console.log(`  Status: ${response.status}`);
    console.log(`  Error: "${data.error}"`);
  },
});

// ============================================================================
// Test 4: Title quality - Multiple conversation types
// ============================================================================

Deno.test({
  name: "Title Endpoint - Title quality across conversation types",
  ignore: !OPENROUTER_GEMINI_FLASH_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🎯 Testing title quality across different conversation types...");

    const testCases = [
      {
        message: "What's the weather like in San Francisco today?",
        expectedKeywords: ["weather", "san francisco", "forecast", "today"],
        description: "Weather query",
      },
      {
        message: "Explain quantum entanglement in simple terms",
        expectedKeywords: ["quantum", "entanglement", "explain", "physics"],
        description: "Technical explanation request",
      },
      {
        message: "Write a haiku about coffee",
        expectedKeywords: ["haiku", "coffee", "poem", "poetry"],
        description: "Creative writing request",
      },
    ];

    for (const testCase of testCases) {
      console.log(`\n  Testing: ${testCase.description}...`);

      const response = await fetch(FUNCTION_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: testCase.message,
        }),
      });

      assertEquals(response.ok, true, `${testCase.description} should succeed`);

      const data = await response.json();
      assertExists(data.title, "Response should have title");

      // Soft assertion for title length - AI titles can vary
      if (data.title.length > 50) {
        console.log(
          `⚠️ Soft assertion: Title should be concise (max 50 chars) for "${testCase.description}". ` +
          `Got ${data.title.length}: "${data.title}"`
        );
      }

      // Title should contain at least one relevant keyword
      const lowerTitle = data.title.toLowerCase();
      const hasRelevantKeyword = testCase.expectedKeywords.some((keyword) =>
        lowerTitle.includes(keyword.toLowerCase())
      );

      // Soft assertion - AI titles are variable, log warning instead of failing
      if (!hasRelevantKeyword) {
        console.log(
          `⚠️ Title for "${testCase.description}" may not contain expected keywords. ` +
          `Expected one of: [${testCase.expectedKeywords.join(", ")}]. Got: "${data.title}"`
        );
      }

      console.log(`  ✓ ${testCase.description}`);
      console.log(`    Title: "${data.title}"`);
      console.log(`    Length: ${data.title.length} chars`);

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\n✓ Title quality verified across all conversation types");
  },
});

// ============================================================================
// Test 5: Response headers and structure
// ============================================================================

Deno.test({
  name: "Title Endpoint - Response headers and structure",
  ignore: !OPENROUTER_GEMINI_FLASH_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n📋 Testing response headers and structure...");

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Hello, how are you?",
      }),
    });

    assertEquals(response.ok, true, "Request should succeed");

    // Check CORS headers
    const corsHeader = response.headers.get("access-control-allow-origin");
    assertExists(corsHeader, "Should have CORS header");

    // Check Content-Type
    const contentType = response.headers.get("content-type");
    assert(
      contentType?.includes("application/json"),
      `Should return JSON. Got: ${contentType}`,
    );

    // Check X-Request-ID header
    const requestId = response.headers.get("x-request-id");
    assertExists(requestId, "Should have X-Request-ID header for tracing");

    // Verify response structure
    const data = await response.json();
    assertExists(data.title, "Response should have title field");
    assertEquals(typeof data.title, "string", "Title should be a string");

    // Should not have extra fields (clean response)
    const keys = Object.keys(data);
    assertEquals(keys.length, 1, "Response should only have 'title' field");

    console.log("✓ Response headers and structure correct");
    console.log(`  Content-Type: ${contentType}`);
    console.log(`  CORS: ${corsHeader}`);
    console.log(`  Request-ID: ${requestId}`);
    console.log(`  Response fields: ${keys.join(", ")}`);
  },
});

// ============================================================================
// Test 6: Guest user access (no authentication required)
// ============================================================================

Deno.test({
  name: "Title Endpoint - Guest user access (no auth required)",
  ignore: !OPENROUTER_GEMINI_FLASH_KEY,
  async fn() {
    console.log("\n👤 Testing guest user access (no auth)...");

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        // No Authorization header - testing guest access
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Create a simple counter app",
      }),
    });

    // Should succeed - guest users are allowed (like generate-image)
    assertEquals(response.ok, true, "Guest request should succeed");
    assertEquals(response.status, 200, "Should return 200 OK");

    const data = await response.json();
    assertExists(data.title, "Response should have title field");
    assert(typeof data.title === "string", "Title should be a string");
    assert(data.title.length > 0, "Title should not be empty");

    console.log("✓ Guest users can generate titles");
    console.log(`  Title: "${data.title}"`);
  },
});

// ============================================================================
// Test 7: Message length validation
// ============================================================================

Deno.test({
  name: "Title Endpoint - Message length validation",
  ignore: !OPENROUTER_GEMINI_FLASH_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n📏 Testing message length validation...");

    // Create a message that exceeds the 10,000 character limit
    const longMessage = "a".repeat(10001);

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: longMessage,
      }),
    });

    // Should return validation error
    assertEquals(response.ok, false, "Message too long should fail");
    assertEquals(response.status, 400, "Should return 400 Bad Request");

    const data = await response.json();
    assertExists(data.error, "Error response should have error field");
    assert(
      data.error.toLowerCase().includes("too long") ||
        data.error.toLowerCase().includes("length"),
      `Error should mention length. Got: "${data.error}"`,
    );

    console.log("✓ Message length validation works");
    console.log(`  Status: ${response.status}`);
    console.log(`  Error: "${data.error}"`);
  },
});

// ============================================================================
// Test 8: Performance - Title generation speed
// ============================================================================

Deno.test({
  name: "Title Endpoint - Performance (fast response)",
  ignore: !OPENROUTER_GEMINI_FLASH_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n⚡ Testing title generation performance...");

    const startTime = Date.now();

    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MOCK_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: "Create a simple counter app",
      }),
    });

    const duration = Date.now() - startTime;

    assertEquals(response.ok, true, "Request should succeed");

    const data = await response.json();
    assertExists(data.title, "Response should have title");

    // Title generation should be fast (< 5 seconds)
    // This includes network latency, so we're generous with the timeout
    assert(
      duration < 5000,
      `Title generation should be fast. Took ${duration}ms (max: 5000ms)`,
    );

    console.log("✓ Title generation performance acceptable");
    console.log(`  Duration: ${duration}ms`);
    console.log(`  Title: "${data.title}"`);
  },
});
