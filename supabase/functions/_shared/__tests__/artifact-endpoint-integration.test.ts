/**
 * Integration Tests for /generate-artifact Edge Function
 *
 * These tests make REAL API calls to verify the complete artifact generation pipeline:
 * - Input validation (prompt, artifactType, etc.)
 * - GLM-4.7 artifact generation
 * - Pre-validation and auto-fixing
 * - Response structure and metadata
 * - Error handling (missing prompt, invalid type, etc.)
 *
 * To run:
 * ```bash
 * cd supabase/functions
 * GLM_API_KEY=your_key \
 * SUPABASE_URL=http://127.0.0.1:54321 \
 * SUPABASE_ANON_KEY=your_local_anon_key \
 * deno test --allow-net --allow-env _shared/__tests__/artifact-endpoint-integration.test.ts
 * ```
 *
 * Cost per run: ~$0.03-0.05 (GLM-4.7 is more expensive than GLM-4.5-Air)
 *
 * NOTE: These are API-level integration tests, NOT E2E browser tests.
 * They verify the Edge Function endpoint behavior in isolation.
 */

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// Environment variables
const GLM_API_KEY = Deno.env.get("GLM_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Endpoint URL
const ARTIFACT_ENDPOINT = `${SUPABASE_URL}/functions/v1/generate-artifact`;

/**
 * Helper to call the generate-artifact endpoint
 */
async function callArtifactEndpoint(
  body: {
    prompt: string;
    artifactType?: string;
    sessionId?: string;
    stream?: boolean;
  },
  options?: {
    authToken?: string;
    expectedStatus?: number;
  },
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.authToken) {
    headers["Authorization"] = `Bearer ${options.authToken}`;
  }

  const response = await fetch(ARTIFACT_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  // Optionally verify expected status
  if (options?.expectedStatus !== undefined) {
    assertEquals(
      response.status,
      options.expectedStatus,
      `Expected status ${options.expectedStatus}, got ${response.status}: ${await response.clone()
        .text()}`,
    );
  }

  return response;
}

// ============================================================================
// Test 1: Generate Simple React Component (Non-Streaming)
// ============================================================================

Deno.test({
  name: "Artifact Integration - Generate Simple React Component",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🎨 Testing React component generation...");

    const response = await callArtifactEndpoint(
      {
        prompt: "Create a simple button that says 'Click Me' with blue background",
        artifactType: "react",
        stream: false, // Non-streaming for easier testing
      },
      {
        authToken: SUPABASE_ANON_KEY,
      },
    );

    // Should return 200 OK
    assertEquals(
      response.ok,
      true,
      `API returned ${response.status}: ${await response.clone().text()}`,
    );

    const data = await response.json();

    // Verify response structure
    assertExists(data.success, "Response should have success field");
    assertEquals(data.success, true, "Request should succeed");

    assertExists(data.artifactCode, "Response should have artifactCode");
    assert(data.artifactCode.length > 0, "Artifact code should not be empty");

    // Verify artifact contains expected React patterns
    const code = data.artifactCode;
    assert(
      code.includes("<artifact") && code.includes("</artifact>"),
      "Code should be wrapped in artifact tags",
    );
    assert(
      code.includes("export default") || code.includes("function") || code.includes("const"),
      "Code should contain React component definition",
    );

    // Verify metadata is included
    assertExists(data.requestId, "Response should have requestId");
    assertExists(data.validation, "Response should have validation metadata");

    // Log success details
    console.log(`  ✓ Artifact generated successfully`);
    console.log(`  Code length: ${data.artifactCode.length} characters`);
    console.log(`  Auto-fixed: ${data.validation.autoFixed}`);
    console.log(`  Issues: ${data.validation.issueCount}`);
    if (data.reasoning) {
      console.log(`  Reasoning length: ${data.reasoning.length} characters`);
    }
  },
});

// ============================================================================
// Test 2: Generate HTML Artifact
// ============================================================================

Deno.test({
  name: "Artifact Integration - Generate HTML Artifact",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n📄 Testing HTML artifact generation...");

    const response = await callArtifactEndpoint(
      {
        prompt: "Create a simple HTML page with a heading 'Hello World' and a paragraph",
        artifactType: "html",
        stream: false,
      },
      {
        authToken: SUPABASE_ANON_KEY,
      },
    );

    assertEquals(response.ok, true, `API returned ${response.status}`);

    const data = await response.json();

    assertEquals(data.success, true, "Request should succeed");
    assertExists(data.artifactCode, "Response should have artifactCode");

    // Verify HTML structure
    const code = data.artifactCode;
    assert(
      code.includes("<artifact") && code.includes("</artifact>"),
      "Code should be wrapped in artifact tags",
    );

    // HTML artifacts may contain DOCTYPE, html, head, body tags
    // OR they may be pure HTML fragments depending on GLM's interpretation
    assert(
      code.includes("<") && code.includes(">"),
      "Code should contain HTML tags",
    );

    console.log(`  ✓ HTML artifact generated`);
    console.log(`  Code length: ${data.artifactCode.length} characters`);
  },
});

// ============================================================================
// Test 3: Error Handling - Missing Prompt
// ============================================================================

Deno.test({
  name: "Artifact Integration - Error Handling: Missing Prompt",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n❌ Testing missing prompt error handling...");

    const response = await callArtifactEndpoint(
      {
        prompt: "", // Empty prompt should fail validation
        artifactType: "react",
      },
      {
        authToken: SUPABASE_ANON_KEY,
        expectedStatus: 400, // Should return Bad Request
      },
    );

    const data = await response.json();

    assertExists(data.error, "Error response should have error field");
    assert(
      data.error.includes("Prompt") || data.error.includes("required") ||
        data.error.includes("empty"),
      `Error message should mention prompt issue. Got: ${data.error}`,
    );

    console.log(`  ✓ Validation error handled correctly`);
    console.log(`  Error: ${data.error}`);
  },
});

// ============================================================================
// Test 4: Error Handling - Invalid Artifact Type
// ============================================================================

Deno.test({
  name: "Artifact Integration - Error Handling: Invalid Artifact Type",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n❌ Testing invalid artifact type error handling...");

    const response = await callArtifactEndpoint(
      {
        prompt: "Create something cool",
        artifactType: "invalid_type", // Invalid type
      },
      {
        authToken: SUPABASE_ANON_KEY,
        expectedStatus: 400,
      },
    );

    const data = await response.json();

    assertExists(data.error, "Error response should have error field");
    assert(
      data.error.includes("Invalid artifact type") || data.error.includes("type"),
      `Error message should mention artifact type issue. Got: ${data.error}`,
    );

    console.log(`  ✓ Invalid type error handled correctly`);
    console.log(`  Error: ${data.error}`);
  },
});

// ============================================================================
// Test 5: Error Handling - Prompt Too Long
// ============================================================================

Deno.test({
  name: "Artifact Integration - Error Handling: Prompt Too Long",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n❌ Testing prompt length validation...");

    // Generate a prompt longer than 10,000 characters (max limit)
    const longPrompt = "a".repeat(10001);

    const response = await callArtifactEndpoint(
      {
        prompt: longPrompt,
        artifactType: "react",
      },
      {
        authToken: SUPABASE_ANON_KEY,
        expectedStatus: 400,
      },
    );

    const data = await response.json();

    assertExists(data.error, "Error response should have error field");
    assert(
      data.error.includes("too long") || data.error.includes("10,000"),
      `Error message should mention length limit. Got: ${data.error}`,
    );

    console.log(`  ✓ Length validation error handled correctly`);
    console.log(`  Error: ${data.error}`);
  },
});

// ============================================================================
// Test 6: Response Includes Artifact Metadata
// ============================================================================

Deno.test({
  name: "Artifact Integration - Response Metadata Verification",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n📊 Testing response metadata...");

    const response = await callArtifactEndpoint(
      {
        prompt: "Create a simple div with text 'Test'",
        artifactType: "html",
        stream: false,
      },
      {
        authToken: SUPABASE_ANON_KEY,
      },
    );

    assertEquals(response.ok, true);

    const data = await response.json();

    // Verify all expected metadata fields
    assertExists(data.success, "Should have success field");
    assertExists(data.artifactCode, "Should have artifactCode field");
    assertExists(data.requestId, "Should have requestId field");
    assertExists(data.validation, "Should have validation field");

    // Verify validation metadata structure
    const validation = data.validation;
    assertExists(validation.autoFixed, "Validation should have autoFixed field");
    assertExists(validation.issueCount, "Validation should have issueCount field");
    assertExists(validation.issueSummary, "Validation should have issueSummary field");

    assert(typeof validation.autoFixed === "boolean", "autoFixed should be boolean");
    assert(typeof validation.issueCount === "number", "issueCount should be number");
    assert(Array.isArray(validation.issueSummary), "issueSummary should be array");

    console.log(`  ✓ All metadata fields present`);
    console.log(`  Request ID: ${data.requestId}`);
    console.log(`  Auto-fixed: ${validation.autoFixed}`);
    console.log(`  Issue count: ${validation.issueCount}`);
  },
});

// ============================================================================
// Test 7: Generate SVG Artifact
// ============================================================================

Deno.test({
  name: "Artifact Integration - Generate SVG Artifact",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🎨 Testing SVG artifact generation...");

    const response = await callArtifactEndpoint(
      {
        prompt: "Create a simple SVG circle with red fill",
        artifactType: "svg",
        stream: false,
      },
      {
        authToken: SUPABASE_ANON_KEY,
      },
    );

    assertEquals(response.ok, true);

    const data = await response.json();

    assertEquals(data.success, true);
    assertExists(data.artifactCode, "Should have artifact code");

    const code = data.artifactCode;
    assert(
      code.includes("<artifact") && code.includes("</artifact>"),
      "Code should be wrapped in artifact tags",
    );

    // SVG should contain <svg> tags
    assert(
      code.includes("<svg") || code.includes("svg"),
      "Code should reference SVG elements",
    );

    console.log(`  ✓ SVG artifact generated`);
    console.log(`  Code length: ${data.artifactCode.length} characters`);
  },
});

// ============================================================================
// Test 8: Rate Limiting Headers Present
// ============================================================================

Deno.test({
  name: "Artifact Integration - Rate Limiting Headers",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🔒 Testing rate limiting headers...");

    const response = await callArtifactEndpoint(
      {
        prompt: "Create a simple component",
        artifactType: "react",
        stream: false,
      },
      {
        authToken: SUPABASE_ANON_KEY,
      },
    );

    assertEquals(response.ok, true);

    // Check for rate limit headers (may not be present if RATE_LIMIT_DISABLED=true)
    const rateLimitLimit = response.headers.get("X-RateLimit-Limit");
    const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
    const rateLimitReset = response.headers.get("X-RateLimit-Reset");

    // If rate limiting is enabled, all three headers should be present
    if (rateLimitLimit !== null) {
      assertExists(rateLimitLimit, "Should have X-RateLimit-Limit header");
      assertExists(rateLimitRemaining, "Should have X-RateLimit-Remaining header");
      assertExists(rateLimitReset, "Should have X-RateLimit-Reset header");

      console.log(`  ✓ Rate limit headers present`);
      console.log(`  Limit: ${rateLimitLimit}`);
      console.log(`  Remaining: ${rateLimitRemaining}`);
    } else {
      console.log(`  ⚠️ Rate limiting disabled (development mode)`);
    }

    // Verify request ID is always present
    const requestId = response.headers.get("X-Request-ID");
    assertExists(requestId, "Should have X-Request-ID header");
    console.log(`  Request ID: ${requestId}`);
  },
});

// ============================================================================
// Test 9: CORS Headers Present
// ============================================================================

Deno.test({
  name: "Artifact Integration - CORS Headers",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🌐 Testing CORS headers...");

    const response = await callArtifactEndpoint(
      {
        prompt: "Create a test component",
        artifactType: "react",
        stream: false,
      },
      {
        authToken: SUPABASE_ANON_KEY,
      },
    );

    assertEquals(response.ok, true);

    // Verify CORS headers
    const corsOrigin = response.headers.get("Access-Control-Allow-Origin");
    assertExists(corsOrigin, "Should have Access-Control-Allow-Origin header");

    // Should NOT be wildcard in production
    console.log(`  ✓ CORS headers present`);
    console.log(`  Allowed origin: ${corsOrigin}`);
  },
});

// ============================================================================
// Test 10: Reasoning Data Included (If Available)
// ============================================================================

Deno.test({
  name: "Artifact Integration - Reasoning Data",
  ignore: !GLM_API_KEY || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🧠 Testing reasoning data inclusion...");

    const response = await callArtifactEndpoint(
      {
        prompt: "Create a React counter component with increment and decrement buttons",
        artifactType: "react",
        stream: false,
      },
      {
        authToken: SUPABASE_ANON_KEY,
      },
    );

    assertEquals(response.ok, true);

    const data = await response.json();

    // Reasoning may or may not be present depending on GLM-4.7's thinking mode
    // We just verify the field exists (can be null or string)
    assert(
      "reasoning" in data,
      "Response should have reasoning field (even if null)",
    );

    if (data.reasoning) {
      assert(typeof data.reasoning === "string", "Reasoning should be string if present");
      console.log(`  ✓ Reasoning data present`);
      console.log(`  Reasoning length: ${data.reasoning.length} characters`);
    } else {
      console.log(`  ⚠️ No reasoning data (GLM may not have provided it)`);
    }

    // ReasoningSteps should be null (structured parsing removed per code comments)
    assertEquals(data.reasoningSteps, null, "reasoningSteps should be null");
  },
});

// ============================================================================
// Header Banner
// ============================================================================

console.log("\n" + "=".repeat(70));
console.log("Artifact Endpoint Integration Tests");
console.log("=".repeat(70));
console.log("Testing /generate-artifact Edge Function");
console.log("Endpoint: " + ARTIFACT_ENDPOINT);
console.log("Cost per full run: ~$0.03-0.05 (GLM-4.7 model)");
console.log("=".repeat(70) + "\n");
