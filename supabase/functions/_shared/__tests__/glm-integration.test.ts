/**
 * Integration Tests for GLM API (Z.ai)
 *
 * These tests make REAL API calls to verify:
 * - API key is valid and working
 * - GLM-4.7 responds correctly
 * - Artifact generation works
 * - Token usage is tracked
 *
 * To run:
 * GLM_API_KEY=your_key deno test --allow-net --allow-env glm-integration.test.ts
 *
 * Cost per run: ~$0.01-0.02
 */

import { assertEquals, assert, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const GLM_API_KEY = Deno.env.get("GLM_API_KEY");
const GLM_BASE_URL = "https://api.z.ai/api/coding/paas/v4";

// ============================================================================
// Test 1: Basic Chat Completion (Cheapest - ~$0.001)
// ============================================================================

Deno.test({
  name: "GLM Integration - Basic Chat Response",
  ignore: !GLM_API_KEY,
  async fn() {
    console.log("\n🤖 Testing GLM-4.7 basic chat...");

    const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4.7",
        messages: [
          { role: "user", content: "Say exactly: 'GLM integration test passed'" }
        ],
        max_tokens: 50,
        temperature: 0,
      }),
    });

    assertEquals(response.ok, true, `API returned ${response.status}: ${await response.clone().text()}`);

    const data = await response.json();

    // Verify response structure
    assertExists(data.choices, "Response should have choices array");
    assertExists(data.choices[0].message, "Response should have message");
    assertExists(data.choices[0].message.content, "Message should have content");

    // Verify token usage is tracked
    assertExists(data.usage, "Response should include usage stats");
    assert(data.usage.total_tokens > 0, "Should report token usage");

    console.log("✓ API call successful");
    console.log(`  Response: "${data.choices[0].message.content.substring(0, 50)}..."`);
    console.log(`  Tokens: ${data.usage.total_tokens}`);
  },
});

// ============================================================================
// Test 2: Tool Calling (Matches Production Architecture) (~$0.01)
// ============================================================================

Deno.test({
  name: "GLM Integration - Tool Calling",
  ignore: !GLM_API_KEY,
  async fn() {
    console.log("\n🔧 Testing GLM-4.7 tool calling...");

    // Use the production tool definition format (flat, not nested OpenAI format)
    const artifactTool = {
      name: "generate_artifact",
      description: "Create interactive React components or HTML. Use when user requests visual content.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description: "Type of artifact",
            enum: ["react", "html"],
          },
          prompt: {
            type: "string",
            description: "Detailed description of what to generate",
          },
        },
        required: ["type", "prompt"],
      },
    };

    const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4.7",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant with tools. Use tools when appropriate."
          },
          {
            role: "user",
            content: "Create a simple button that says Hello"
          }
        ],
        tools: [{ type: "function", function: artifactTool }],
        max_tokens: 500,
        temperature: 0,
      }),
    });

    assertEquals(response.ok, true, `API returned ${response.status}`);

    const data = await response.json();

    // Verify response structure
    assertExists(data.choices, "Response should have choices");
    assertExists(data.choices[0].message, "Response should have message");

    const message = data.choices[0].message;

    // GLM should call the generate_artifact tool
    assertExists(message.tool_calls, "Response should have tool_calls");
    assert(message.tool_calls.length > 0, "Should have at least one tool call");

    const toolCall = message.tool_calls[0];
    assertEquals(toolCall.function.name, "generate_artifact", "Should call generate_artifact");

    // Parse and verify arguments
    let args;
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Tool arguments (raw):", toolCall.function.arguments);
      throw new Error(`Tool call returned malformed JSON: ${errorMessage}. Raw: ${toolCall.function.arguments.substring(0, 200)}`);
    }

    assertExists(args.type, "Should have type parameter");
    assertExists(args.prompt, "Should have prompt parameter");

    console.log("✓ Tool calling successful");
    console.log(`  Type: ${args.type}`);
    console.log(`  Prompt: "${args.prompt.substring(0, 50)}..."`);
    console.log(`  Tokens: ${data.usage.total_tokens}`);
  },
});

// ============================================================================
// Test 3: Thinking Mode (Reasoning) (~$0.005)
// ============================================================================

Deno.test({
  name: "GLM Integration - Thinking Mode",
  ignore: !GLM_API_KEY,
  async fn() {
    console.log("\n🧠 Testing GLM-4.7 thinking mode...");

    const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4.7",
        messages: [
          { role: "user", content: "What is 15 * 7? Think step by step." }
        ],
        max_tokens: 200,
        temperature: 0,
        // GLM-4.7 has thinking mode enabled by default
      }),
    });

    assertEquals(response.ok, true, `API returned ${response.status}`);

    const data = await response.json();
    const message = data.choices[0].message;

    // GLM-4.7 may return thinking in reasoning_content or content field
    const content = message.content || "";
    const reasoning = message.reasoning_content || "";
    const fullResponse = content + reasoning;

    // Log what we received for debugging
    console.log(`  Content length: ${content.length}, Reasoning length: ${reasoning.length}`);

    // Verify we got some response (either content or reasoning)
    assert(fullResponse.length > 0, "Response should have content or reasoning");

    // The correct answer to 15 * 7 is 105 - we should require this
    const hasCorrectAnswer = fullResponse.includes("105");
    assert(
      hasCorrectAnswer,
      `Thinking mode should compute 15*7=105 correctly. Response: ${fullResponse.substring(0, 300)}`
    );

    console.log("✓ Thinking mode working");
    console.log(`  Response: "${fullResponse.substring(0, 100)}..."`);
    console.log(`  Tokens: ${data.usage.total_tokens}`);
  },
});

// ============================================================================
// Test 4: Error Handling - Invalid Request
// ============================================================================

Deno.test({
  name: "GLM Integration - Error Handling",
  ignore: !GLM_API_KEY,
  async fn() {
    console.log("\n⚠️ Testing GLM error handling...");

    // Send invalid request (empty messages)
    const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4.7",
        messages: [], // Invalid: empty messages
        max_tokens: 50,
      }),
    });

    // Should return error status
    assertEquals(response.ok, false, "Empty messages should fail");
    assert(response.status >= 400, "Should return 4xx error");

    console.log("✓ Error handling works");
    console.log(`  Status: ${response.status}`);

    // Drain response body to avoid leak
    await response.text();
  },
});

// ============================================================================
// Test 5: Rate Limit Headers Present
// ============================================================================

Deno.test({
  name: "GLM Integration - Response Headers",
  ignore: !GLM_API_KEY,
  async fn() {
    console.log("\n📋 Testing GLM response headers...");

    const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GLM_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "glm-4.7",
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 10,
      }),
    });

    assertEquals(response.ok, true);

    // Check for important headers
    const contentType = response.headers.get("content-type");
    assert(contentType?.includes("application/json"), "Should return JSON");

    console.log("✓ Headers correct");
    console.log(`  Content-Type: ${contentType}`);

    // Drain response body
    await response.json();
  },
});

console.log("\n" + "=".repeat(60));
console.log("GLM Integration Tests");
console.log("=".repeat(60));
console.log("These tests verify REAL API calls to Z.ai GLM-4.7");
console.log("Cost per full run: ~$0.02");
console.log("=".repeat(60) + "\n");
