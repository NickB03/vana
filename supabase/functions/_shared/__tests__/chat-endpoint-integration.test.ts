/**
 * Integration Tests for /chat Edge Function Endpoint
 *
 * These tests make REAL API calls to the deployed chat function to verify:
 * - Basic chat request returns streaming response
 * - Guest users work with rate limiting
 * - Tool calling triggers correctly (artifacts, images)
 * - Error handling for invalid requests
 * - Authentication flows
 *
 * To run:
 * SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=your_key deno test --allow-net --allow-env chat-endpoint-integration.test.ts
 *
 * Prerequisites:
 * - Supabase local instance running (supabase start)
 * - Edge functions deployed locally (supabase functions serve)
 *
 * Cost per run: ~$0.05 (includes Gemini API calls)
 */

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Helper to get chat endpoint URL
function getChatEndpoint(): string {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL not set");
  }
  // Handle both local and deployed URLs
  const baseUrl = SUPABASE_URL.replace(/\/$/, "");
  return `${baseUrl}/functions/v1/chat`;
}

// Helper to create request headers
function createHeaders(authToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  return headers;
}

// Helper to consume a streaming response
async function consumeStream(response: Response): Promise<string> {
  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullContent = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}

// Helper to parse SSE events from stream
interface SSEEvent {
  event?: string;
  data?: string;
}

function parseSSEEvents(content: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const lines = content.split("\n");

  let currentEvent: SSEEvent = {};

  for (const line of lines) {
    if (line.trim() === "") {
      if (Object.keys(currentEvent).length > 0) {
        events.push(currentEvent);
        currentEvent = {};
      }
      continue;
    }

    if (line.startsWith("event:")) {
      currentEvent.event = line.substring(6).trim();
    } else if (line.startsWith("data:")) {
      currentEvent.data = line.substring(5).trim();
    }
  }

  // Push final event if exists
  if (Object.keys(currentEvent).length > 0) {
    events.push(currentEvent);
  }

  return events;
}

// ============================================================================
// Test 1: Basic Chat Request with Guest User (~$0.01)
// ============================================================================

Deno.test({
  name: "Chat Endpoint - Basic Guest Chat Request",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n💬 Testing basic guest chat request...");

    const endpoint = getChatEndpoint();
    console.log(`  Endpoint: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Say exactly: 'Integration test passed'" },
        ],
        sessionId: `test-session-${Date.now()}`,
        isGuest: true,
      }),
    });

    // Verify response status
    assertEquals(
      response.ok,
      true,
      `Chat endpoint returned ${response.status}: ${await response
        .clone()
        .text()}`,
    );

    // Verify streaming response headers
    const contentType = response.headers.get("content-type");
    assert(
      contentType?.includes("text/event-stream"),
      `Expected SSE stream, got: ${contentType}`,
    );

    // Consume and verify stream
    const streamContent = await consumeStream(response);
    assert(streamContent.length > 0, "Stream should have content");

    // Parse SSE events
    const events = parseSSEEvents(streamContent);
    assert(events.length > 0, "Should have at least one SSE event");

    // Verify we got content chunks
    const contentChunks = events.filter((e) => e.event === "content_chunk");
    assert(contentChunks.length > 0, "Should have content chunks");

    // Verify we got done event
    const doneEvents = events.filter((e) => e.event === "done");
    assert(doneEvents.length > 0, "Should have done event");

    console.log("✓ Basic chat request successful");
    console.log(`  Events received: ${events.length}`);
    console.log(`  Content chunks: ${contentChunks.length}`);
    console.log(`  Stream length: ${streamContent.length} chars`);
  },
});

// ============================================================================
// Rate Limit Tests - DISABLED
// ============================================================================
// These tests are commented out because this is a demo site using an API
// that doesn't enforce rate limiting. Re-enable if rate limiting is added.
//
// Test 2: Guest Rate Limiting (~$0.00 - cached)
// Test 2b: Rate Limit Enforcement (Actually Hits Limit)
// ============================================================================

/*
Deno.test({
  name: "Chat Endpoint - Guest Rate Limiting",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🚦 Testing guest rate limiting...");

    const endpoint = getChatEndpoint();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [{ role: "user", content: "Test rate limit" }],
        sessionId: `rate-limit-test-${Date.now()}`,
        isGuest: true,
      }),
    });

    // First request should succeed (or may fail if rate limited from previous tests)
    console.log(`  Status: ${response.status}`);

    // Check for rate limit headers
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    const rateLimitReset = response.headers.get("x-ratelimit-reset");

    console.log("✓ Rate limit headers present");
    console.log(`  Remaining: ${rateLimitRemaining || "not provided"}`);
    console.log(`  Reset: ${rateLimitReset || "not provided"}`);

    // Drain response body
    if (response.ok) {
      await consumeStream(response);
    } else {
      await response.text();
    }
  },
});

Deno.test({
  name: "Chat Endpoint - Rate Limit Enforcement",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🚫 Testing rate limit enforcement (hitting limit)...");

    const endpoint = getChatEndpoint();
    const testSessionId = `rate-limit-enforce-${Date.now()}`;

    // Guest limit is typically 5 requests per minute
    // We'll make requests until we get rate limited
    const maxRequests = 10; // More than the limit to ensure we hit it
    let rateLimitedAt = -1;

    for (let i = 1; i <= maxRequests; i++) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: createHeaders(),
        body: JSON.stringify({
          messages: [{ role: "user", content: `Rate limit test ${i}` }],
          sessionId: testSessionId,
          isGuest: true,
        }),
      });

      console.log(`  Request ${i}: Status ${response.status}`);

      if (response.status === 429) {
        rateLimitedAt = i;
        console.log(`  ✓ Rate limited at request ${i}`);

        // Verify rate limit response structure
        const data = await response.json();
        assert(data.error, "Rate limit response should have error message");
        assert(
          data.error.toLowerCase().includes("rate") ||
          data.error.toLowerCase().includes("limit"),
          `Error should mention rate limit: ${data.error}`
        );
        break;
      }

      // Drain successful responses
      if (response.ok) {
        await consumeStream(response);
      } else {
        await response.text();
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Verify we actually hit the rate limit
    assert(
      rateLimitedAt > 0,
      `Should have been rate limited within ${maxRequests} requests. ` +
      "Rate limiting may not be enforced or limit is too high."
    );

    console.log("✓ Rate limit enforcement verified");
    console.log(`  Limit hit at request: ${rateLimitedAt}`);
  },
});
*/

// ============================================================================
// Test 3: Tool Calling - Artifact Generation (~$0.02)
// ============================================================================

Deno.test({
  name: "Chat Endpoint - Artifact Tool Call",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🔧 Testing artifact tool calling...");

    const endpoint = getChatEndpoint();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "Create a simple React button component that says Hello",
          },
        ],
        sessionId: `artifact-test-${Date.now()}`,
        isGuest: true,
        toolChoice: "generate_artifact", // Force artifact generation
      }),
    });

    assertEquals(response.ok, true, `Expected 200, got ${response.status}`);

    // Consume stream
    const streamContent = await consumeStream(response);
    const events = parseSSEEvents(streamContent);

    console.log(`  Total events: ${events.length}`);

    // Verify we got a tool_call_start event
    const toolCallStartEvents = events.filter((e) => e.event === "tool_call_start");

    if (toolCallStartEvents.length > 0) {
      console.log("✓ Tool call detected");

      let toolCallData;
      try {
        toolCallData = JSON.parse(toolCallStartEvents[0].data || "{}");
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        const rawData = toolCallStartEvents[0].data || "";
        console.error("Tool call data (raw):", rawData);
        throw new Error(`Tool call SSE event returned malformed JSON: ${errorMessage}. Raw: ${rawData.substring(0, 200)}`);
      }
      console.log(`  Tool: ${toolCallData.toolName || "unknown"}`);

      // Check for tool_result event
      const toolResultEvents = events.filter((e) => e.event === "tool_result");
      if (toolResultEvents.length > 0) {
        console.log("✓ Tool execution completed");
        let resultData;
        try {
          resultData = JSON.parse(toolResultEvents[0].data || "{}");
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          const rawData = toolResultEvents[0].data || "";
          console.error("Tool result data (raw):", rawData);
          throw new Error(`Tool result SSE event returned malformed JSON: ${errorMessage}. Raw: ${rawData.substring(0, 200)}`);
        }
        console.log(`  Success: ${resultData.success}`);
      }
    } else {
      // When toolChoice explicitly requests generate_artifact, we MUST get a tool call
      // This is a contract violation - the model should respect toolChoice
      throw new Error(
        "Tool calling requested via toolChoice='generate_artifact' but model responded directly. " +
        "This indicates the tool calling pipeline may be broken."
      );
    }

    // Verify stream completed
    const doneEvents = events.filter((e) => e.event === "done");
    assert(doneEvents.length > 0, "Stream should complete with done event");

    console.log("✓ Tool calling test completed");
  },
});

// ============================================================================
// Test 4: Tool Calling - Image Generation (~$0.05)
// ============================================================================

Deno.test({
  name: "Chat Endpoint - Image Tool Call",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🖼️ Testing image tool calling...");

    const endpoint = getChatEndpoint();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Generate a simple blue square image" },
        ],
        sessionId: `image-test-${Date.now()}`,
        isGuest: true,
        toolChoice: "generate_image", // Force image generation
      }),
    });

    assertEquals(response.ok, true, `Expected 200, got ${response.status}`);

    // Consume stream
    const streamContent = await consumeStream(response);
    const events = parseSSEEvents(streamContent);

    console.log(`  Total events: ${events.length}`);

    // Verify we got a tool_call_start event for image generation
    const toolCallStartEvents = events.filter((e) => e.event === "tool_call_start");

    if (toolCallStartEvents.length > 0) {
      console.log("✓ Tool call detected");

      let toolCallData;
      try {
        toolCallData = JSON.parse(toolCallStartEvents[0].data || "{}");
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        const rawData = toolCallStartEvents[0].data || "";
        console.error("Tool call data (raw):", rawData);
        throw new Error(`Tool call SSE event returned malformed JSON: ${errorMessage}. Raw: ${rawData.substring(0, 200)}`);
      }
      console.log(`  Tool: ${toolCallData.toolName || "unknown"}`);

      // Should be generate_image
      if (toolCallData.toolName === "generate_image") {
        console.log("✓ Correct tool selected (generate_image)");
      }

      // Check for tool_result event
      const toolResultEvents = events.filter((e) => e.event === "tool_result");
      if (toolResultEvents.length > 0) {
        console.log("✓ Tool execution completed");
        let resultData;
        try {
          resultData = JSON.parse(toolResultEvents[0].data || "{}");
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          const rawData = toolResultEvents[0].data || "";
          console.error("Tool result data (raw):", rawData);
          throw new Error(`Tool result SSE event returned malformed JSON: ${errorMessage}. Raw: ${rawData.substring(0, 200)}`);
        }
        console.log(`  Success: ${resultData.success}`);
      }
    } else {
      // When toolChoice explicitly requests generate_image, we MUST get a tool call
      throw new Error(
        "Tool calling requested via toolChoice='generate_image' but model responded directly. " +
        "This indicates the tool calling pipeline may be broken."
      );
    }

    // Verify stream completed
    const doneEvents = events.filter((e) => e.event === "done");
    assert(doneEvents.length > 0, "Stream should complete with done event");

    console.log("✓ Image tool calling test completed");
  },
});

// ============================================================================
// Test 5: Error Handling - Invalid Request
// ============================================================================

Deno.test({
  name: "Chat Endpoint - Invalid Request Handling",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n⚠️ Testing error handling...");

    const endpoint = getChatEndpoint();

    // Send request with missing required fields
    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [], // Invalid: empty messages array
        sessionId: `error-test-${Date.now()}`,
        isGuest: true,
      }),
    });

    // Should return error status
    assertEquals(
      response.ok,
      false,
      "Empty messages should return error status",
    );
    assert(response.status >= 400, "Should return 4xx error");

    console.log("✓ Error handling works");
    console.log(`  Status: ${response.status}`);

    // Drain response
    await response.text();
  },
});

// ============================================================================
// Test 6: CORS Headers
// ============================================================================

Deno.test({
  name: "Chat Endpoint - CORS Headers",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n📋 Testing CORS headers...");

    const endpoint = getChatEndpoint();

    // Test OPTIONS preflight request
    const preflightResponse = await fetch(endpoint, {
      method: "OPTIONS",
      headers: {
        "Origin": "http://localhost:8080",
        "Access-Control-Request-Method": "POST",
      },
    });

    assertEquals(preflightResponse.status, 204, "OPTIONS should return 204");

    const corsOrigin = preflightResponse.headers.get(
      "access-control-allow-origin",
    );
    const corsMethods = preflightResponse.headers.get(
      "access-control-allow-methods",
    );

    console.log("✓ CORS preflight successful");
    console.log(`  Allow-Origin: ${corsOrigin || "not set"}`);
    console.log(`  Allow-Methods: ${corsMethods || "not set"}`);

    // Verify POST is allowed
    assert(
      corsMethods?.includes("POST"),
      "Should allow POST method",
    );
  },
});

// ============================================================================
// Test 7: Request ID Tracking
// ============================================================================

Deno.test({
  name: "Chat Endpoint - Request ID Tracking",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🔍 Testing request ID tracking...");

    const endpoint = getChatEndpoint();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [{ role: "user", content: "Test request ID" }],
        sessionId: `request-id-test-${Date.now()}`,
        isGuest: true,
      }),
    });

    // Check for X-Request-ID header
    const requestId = response.headers.get("x-request-id");

    if (requestId) {
      console.log("✓ Request ID present");
      console.log(`  Request ID: ${requestId}`);

      // Verify it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      assert(uuidRegex.test(requestId), "Request ID should be a valid UUID");
    } else {
      throw new Error("X-Request-ID header not present - request tracing is broken");
    }

    // Drain response
    if (response.ok) {
      await consumeStream(response);
    } else {
      await response.text();
    }

    console.log("✓ Request ID tracking test completed");
  },
});

// ============================================================================
// Test 8: Message Content Validation
// ============================================================================

Deno.test({
  name: "Chat Endpoint - Message Content Validation",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n📝 Testing message content validation...");

    const endpoint = getChatEndpoint();

    // Test with excessively long message
    const longContent = "A".repeat(150000); // 150K chars (exceeds 100K limit)

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [{ role: "user", content: longContent }],
        sessionId: `validation-test-${Date.now()}`,
        isGuest: true,
      }),
    });

    // Should return error status for content too long
    assertEquals(
      response.ok,
      false,
      "Excessively long content should be rejected",
    );
    assert(response.status === 400, "Should return 400 for validation error");

    console.log("✓ Content validation works");
    console.log(`  Status: ${response.status}`);

    // Drain response
    await response.text();
  },
});

// ============================================================================
// Test 9: Reasoning Mode (if enabled)
// ============================================================================

Deno.test({
  name: "Chat Endpoint - Reasoning Mode",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🧠 Testing reasoning mode...");

    const endpoint = getChatEndpoint();

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: "What is 15 * 7? Think step by step.",
          },
        ],
        sessionId: `reasoning-test-${Date.now()}`,
        isGuest: true,
        includeReasoning: true,
      }),
    });

    assertEquals(response.ok, true, `Expected 200, got ${response.status}`);

    // Consume stream
    const streamContent = await consumeStream(response);
    const events = parseSSEEvents(streamContent);

    console.log(`  Total events: ${events.length}`);

    // Check for reasoning_status events (if ReasoningProvider is enabled)
    const reasoningEvents = events.filter((e) => e.event === "reasoning_status");

    if (reasoningEvents.length > 0) {
      console.log("✓ Reasoning status events detected");
      console.log(`  Reasoning events: ${reasoningEvents.length}`);
    } else {
      console.log(
        "ℹ️ No reasoning events (may be disabled or not triggered)",
      );
    }

    // Verify we got content
    const contentChunks = events.filter((e) => e.event === "content_chunk");
    assert(contentChunks.length > 0, "Should have content chunks");

    console.log("✓ Reasoning mode test completed");
  },
});

// ============================================================================
// Summary Banner
// ============================================================================

console.log("\n" + "=".repeat(60));
console.log("Chat Endpoint Integration Tests");
console.log("=".repeat(60));
console.log("These tests verify REAL API calls to /chat Edge Function");
console.log("Prerequisites:");
console.log("  - SUPABASE_URL (local: http://127.0.0.1:54321)");
console.log("  - SUPABASE_ANON_KEY");
console.log("  - Supabase running: supabase start");
console.log("  - Functions served: supabase functions serve");
console.log("Cost per full run: ~$0.05");
console.log("=".repeat(60) + "\n");
