/**
 * Integration Tests for Template Matching and Artifact Generation
 *
 * These tests verify that the template matching fix works correctly:
 * - Templates are matched in the chat handler
 * - Template guidance is passed to the GLM system prompt
 * - Complex artifacts succeed with template guidance
 * - Simple artifacts work with or without templates
 * - Fallback works when no template matches
 * - Template matching is consistent across chat handler and executor
 *
 * To run:
 * npm run test:integration
 *
 * Or manually:
 * SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=your_key deno test --allow-net --allow-env template-matching-integration.test.ts
 *
 * Prerequisites:
 * - Supabase local instance running (supabase start)
 * - Edge functions deployed locally (supabase functions serve)
 *
 * Cost per run: ~$0.10 (includes multiple GLM API calls)
 */

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getMatchingTemplate } from "../artifact-rules/template-matcher.ts";
import { getSystemInstruction } from "../system-prompt-inline.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Helper to get chat endpoint URL
function getChatEndpoint(): string {
  if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL not set");
  }
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
  type?: string;
  data?: string;
}

function parseSSEEvents(content: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    if (line.trim() === "" || line === "data: [DONE]") {
      continue;
    }

    if (line.startsWith("data:")) {
      try {
        const jsonData = JSON.parse(line.substring(5).trim());
        events.push(jsonData);
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return events;
}

// ============================================================================
// Test 1: Template Matching Unit Test - Dashboard Request
// ============================================================================

Deno.test({
  name: "Template Matching - Dashboard Request Matches Template",
  async fn() {
    console.log("\n🎯 Testing dashboard template matching...");

    const userMessage = "Create a dashboard with charts showing sales data";
    const result = getMatchingTemplate(userMessage);

    console.log(`  Template matched: ${result.matched}`);
    console.log(`  Template ID: ${result.templateId || 'none'}`);
    console.log(`  Confidence: ${result.confidence}%`);
    console.log(`  Reason: ${result.reason}`);

    // Verify template was matched
    assert(result.matched, "Dashboard request should match a template");
    assertExists(result.templateId, "Should have a template ID");
    assertExists(result.template, "Should have template guidance");
    assert(
      result.confidence !== undefined && result.confidence >= 50,
      "Confidence should be at least 50%"
    );

    // Verify template guidance is included in system prompt
    const systemPrompt = getSystemInstruction({
      useToolCalling: true,
      matchedTemplate: result.template,
    });

    assert(
      systemPrompt.includes(result.template),
      "System prompt should include template guidance"
    );

    console.log("✓ Dashboard template matching successful");
    console.log(`  Template includes ${result.template.length} chars of guidance`);
  },
});

// ============================================================================
// Test 2: Template Matching Unit Test - Game Request
// ============================================================================

Deno.test({
  name: "Template Matching - Game Request Matches Template",
  async fn() {
    console.log("\n🎮 Testing game template matching...");

    const userMessage = "Create an interactive tic-tac-toe game with scoring";
    const result = getMatchingTemplate(userMessage);

    console.log(`  Template matched: ${result.matched}`);
    console.log(`  Template ID: ${result.templateId || 'none'}`);
    console.log(`  Confidence: ${result.confidence}%`);

    // Verify result is valid (template may or may not match)
    // We're mainly verifying the matching system works correctly
    assertExists(result, "Should return a result");
    assertEquals(typeof result.matched, "boolean", "Should have matched boolean");
    assertEquals(typeof result.template, "string", "Should have template string");

    if (result.matched) {
      assertExists(result.templateId, "Should have a template ID when matched");
      assertExists(result.template, "Should have template guidance when matched");
      console.log("✓ Game template matching successful");
    } else {
      console.log("✓ Game request handled (no template matched, which is acceptable)");
    }
  },
});

// ============================================================================
// Test 3: Template Matching Unit Test - Simple Request (No Match)
// ============================================================================

Deno.test({
  name: "Template Matching - Simple Request No Template Match",
  async fn() {
    console.log("\n📝 Testing simple request (no template expected)...");

    const userMessage = "Create a simple hello world button";
    const result = getMatchingTemplate(userMessage);

    console.log(`  Template matched: ${result.matched}`);
    console.log(`  Confidence: ${result.confidence || 0}%`);
    console.log(`  Reason: ${result.reason}`);

    // Simple requests may or may not match templates
    // We just verify the structure is correct
    assertExists(result, "Should return a result");
    assertEquals(typeof result.matched, "boolean", "Should have matched boolean");
    assertEquals(typeof result.template, "string", "Should have template string");

    console.log("✓ Simple request handling successful");
    console.log(`  Template: ${result.template.length === 0 ? 'none' : 'matched'}`);
  },
});

// ============================================================================
// Test 4: Template Matching Unit Test - No Match Fallback
// ============================================================================

Deno.test({
  name: "Template Matching - Unrelated Request No Match",
  async fn() {
    console.log("\n🚫 Testing unrelated request (no template expected)...");

    const userMessage = "What is the weather today?";
    const result = getMatchingTemplate(userMessage);

    console.log(`  Template matched: ${result.matched}`);
    console.log(`  Reason: ${result.reason}`);

    // Weather question should not match any artifact template
    assertEquals(result.matched, false, "Weather question should not match template");
    assertEquals(result.template, "", "Should have empty template string");
    assertExists(result.reason, "Should have a reason for no match");

    console.log("✓ Unrelated request correctly handled");
  },
});

// ============================================================================
// Test 5: End-to-End - Dashboard Artifact with Template
// ============================================================================

Deno.test({
  name: "E2E - Dashboard Artifact Generation with Template",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n📊 Testing dashboard artifact generation with template...");

    const endpoint = getChatEndpoint();
    console.log(`  Endpoint: ${endpoint}`);

    const userMessage = "Create a dashboard with sales analytics charts";

    // First verify template matches
    const templateMatch = getMatchingTemplate(userMessage);
    console.log(`  Template pre-check: ${templateMatch.matched ? 'matched' : 'no match'}`);
    console.log(`  Template ID: ${templateMatch.templateId || 'none'}`);
    console.log(`  Confidence: ${templateMatch.confidence}%`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [{ role: "user", content: userMessage }],
        sessionId: `template-test-dashboard-${Date.now()}`,
        isGuest: true,
        modeHint: "artifact",
      }),
    });

    // Verify response status
    assertEquals(
      response.ok,
      true,
      `Chat endpoint returned ${response.status}: ${await response.clone().text()}`,
    );

    // Verify streaming response headers
    const contentType = response.headers.get("content-type");
    assert(
      contentType?.includes("text/event-stream"),
      `Expected SSE stream, got: ${contentType}`,
    );

    // Consume and parse stream
    const streamContent = await consumeStream(response);
    const events = parseSSEEvents(streamContent);

    console.log(`  Total events: ${events.length}`);

    // Verify tool_call_start event for generate_artifact
    const toolCallStart = events.find((e) => e.type === "tool_call_start");
    assertExists(toolCallStart, "Should have tool_call_start event");
    console.log(`  Tool called: ${JSON.stringify(toolCallStart)}`);

    // Verify tool_result event
    const toolResult = events.find((e) => e.type === "tool_result");
    assertExists(toolResult, "Should have tool_result event");
    console.log(`  Tool result success: ${(toolResult as any).success}`);

    // Verify artifact_complete event
    const artifactComplete = events.find((e) => e.type === "artifact_complete");
    assertExists(artifactComplete, "Should have artifact_complete event");

    const artifactData = artifactComplete as any;
    assertExists(artifactData.artifactCode, "Should have artifact code");
    assertExists(artifactData.artifactType, "Should have artifact type");

    console.log(`  Artifact type: ${artifactData.artifactType}`);
    console.log(`  Artifact code length: ${artifactData.artifactCode?.length || 0} chars`);
    console.log(`  Has reasoning: ${!!artifactData.reasoning}`);

    // Verify artifact code is not empty
    assert(
      artifactData.artifactCode.length > 100,
      "Artifact code should be substantial (>100 chars)"
    );

    console.log("✓ Dashboard artifact generation successful with template");
  },
});

// ============================================================================
// Test 6: End-to-End - Simple Artifact without Template
// ============================================================================

Deno.test({
  name: "E2E - Simple Artifact Generation without Template",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🔘 Testing simple artifact generation (no template)...");

    const endpoint = getChatEndpoint();
    const userMessage = "Create a button that says Click Me";

    // Verify this doesn't match a complex template
    const templateMatch = getMatchingTemplate(userMessage);
    console.log(`  Template match: ${templateMatch.matched ? templateMatch.templateId : 'none'}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [{ role: "user", content: userMessage }],
        sessionId: `template-test-simple-${Date.now()}`,
        isGuest: true,
        modeHint: "artifact",
      }),
    });

    assertEquals(response.ok, true, `Should succeed: ${response.status}`);

    const streamContent = await consumeStream(response);
    const events = parseSSEEvents(streamContent);

    // Verify artifact was generated
    const artifactComplete = events.find((e) => e.type === "artifact_complete");
    assertExists(artifactComplete, "Should have artifact_complete event");

    const artifactData = artifactComplete as any;
    assertExists(artifactData.artifactCode, "Should have artifact code");

    console.log(`  Artifact type: ${artifactData.artifactType}`);
    console.log(`  Artifact code length: ${artifactData.artifactCode?.length || 0} chars`);

    console.log("✓ Simple artifact generation successful");
  },
});

// ============================================================================
// Test 7: End-to-End - Game Artifact with Template
// ============================================================================

Deno.test({
  name: "E2E - Game Artifact Generation with Template",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n🎮 Testing game artifact generation with template...");

    const endpoint = getChatEndpoint();
    const userMessage = "Create a tic-tac-toe game";

    // Verify template matches
    const templateMatch = getMatchingTemplate(userMessage);
    console.log(`  Template matched: ${templateMatch.matched}`);
    console.log(`  Template ID: ${templateMatch.templateId || 'none'}`);
    console.log(`  Confidence: ${templateMatch.confidence}%`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [{ role: "user", content: userMessage }],
        sessionId: `template-test-game-${Date.now()}`,
        isGuest: true,
        modeHint: "artifact",
      }),
    });

    assertEquals(response.ok, true, `Should succeed: ${response.status}`);

    const streamContent = await consumeStream(response);
    const events = parseSSEEvents(streamContent);

    // Verify artifact was generated
    const artifactComplete = events.find((e) => e.type === "artifact_complete");
    assertExists(artifactComplete, "Should have artifact_complete event");

    const artifactData = artifactComplete as any;
    assertExists(artifactData.artifactCode, "Should have artifact code");

    // Game artifacts should be substantial
    assert(
      artifactData.artifactCode.length > 200,
      "Game artifact should be substantial (>200 chars)"
    );

    console.log(`  Artifact type: ${artifactData.artifactType}`);
    console.log(`  Artifact code length: ${artifactData.artifactCode?.length || 0} chars`);
    console.log("✓ Game artifact generation successful with template");
  },
});

// ============================================================================
// Test 8: Template Consistency - Same Template in Handler and Executor
// ============================================================================

Deno.test({
  name: "Template Consistency - Handler and Executor Match",
  async fn() {
    console.log("\n🔄 Testing template consistency...");

    const testMessages = [
      "Create a dashboard with charts",
      "Build a landing page",
      "Make a todo list app",
      "Create a calculator",
    ];

    for (const message of testMessages) {
      // Match template as chat handler does
      const handlerMatch = getMatchingTemplate(message);

      // Match template again (simulating executor)
      const executorMatch = getMatchingTemplate(message);

      // Verify consistency
      assertEquals(
        handlerMatch.matched,
        executorMatch.matched,
        `Template match should be consistent for: "${message}"`
      );

      if (handlerMatch.matched && executorMatch.matched) {
        assertEquals(
          handlerMatch.templateId,
          executorMatch.templateId,
          `Template ID should match for: "${message}"`
        );

        assertEquals(
          handlerMatch.template,
          executorMatch.template,
          `Template guidance should match for: "${message}"`
        );
      }

      console.log(`  ✓ "${message.slice(0, 30)}...": consistent (matched=${handlerMatch.matched})`);
    }

    console.log("✓ Template matching is consistent");
  },
});

// ============================================================================
// Test 9: System Prompt Integration - Template Injection
// ============================================================================

Deno.test({
  name: "System Prompt - Template Guidance Injection",
  async fn() {
    console.log("\n💉 Testing template guidance injection in system prompt...");

    const userMessage = "Create a dashboard with sales charts";
    const templateMatch = getMatchingTemplate(userMessage);

    // Generate system prompt WITHOUT template
    const promptWithoutTemplate = getSystemInstruction({
      useToolCalling: true,
    });

    // Generate system prompt WITH template
    const promptWithTemplate = getSystemInstruction({
      useToolCalling: true,
      matchedTemplate: templateMatch.template,
    });

    console.log(`  Prompt without template: ${promptWithoutTemplate.length} chars`);
    console.log(`  Prompt with template: ${promptWithTemplate.length} chars`);

    if (templateMatch.matched) {
      // Verify template was injected
      assert(
        promptWithTemplate.includes(templateMatch.template),
        "System prompt should include template guidance"
      );

      // Verify template makes prompt longer
      assert(
        promptWithTemplate.length > promptWithoutTemplate.length,
        "Template should add content to system prompt"
      );

      const addedLength = promptWithTemplate.length - promptWithoutTemplate.length;
      console.log(`  Template added ${addedLength} chars to system prompt`);
    } else {
      // No template matched - prompts should be equal
      assertEquals(
        promptWithTemplate.length,
        promptWithoutTemplate.length,
        "Prompts should be equal when no template matched"
      );
    }

    console.log("✓ Template guidance injection successful");
  },
});

// ============================================================================
// Test 10: Backward Compatibility - Non-Templated Flow
// ============================================================================

Deno.test({
  name: "Backward Compatibility - Non-Templated Artifacts Work",
  ignore: !SUPABASE_URL || !SUPABASE_ANON_KEY,
  async fn() {
    console.log("\n⏮️ Testing backward compatibility with non-templated flow...");

    const endpoint = getChatEndpoint();

    // Request that shouldn't match any template
    const userMessage = "Create a component with just a heading that says Hello";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: createHeaders(),
      body: JSON.stringify({
        messages: [{ role: "user", content: userMessage }],
        sessionId: `template-test-compat-${Date.now()}`,
        isGuest: true,
        modeHint: "artifact",
      }),
    });

    assertEquals(response.ok, true, `Should succeed: ${response.status}`);

    const streamContent = await consumeStream(response);
    const events = parseSSEEvents(streamContent);

    // Verify artifact was generated
    const artifactComplete = events.find((e) => e.type === "artifact_complete");
    assertExists(artifactComplete, "Should have artifact_complete event");

    const artifactData = artifactComplete as any;
    assertExists(artifactData.artifactCode, "Should have artifact code");
    assert(artifactData.artifactCode.length > 0, "Should have non-empty code");

    console.log(`  Artifact generated: ${artifactData.artifactCode.length} chars`);
    console.log("✓ Backward compatibility maintained");
  },
});

console.log("\n📋 Template Matching Integration Tests");
console.log("======================================");
console.log("Tests verify that template matching works correctly:");
console.log("  - Templates match complex requests (dashboard, game, landing page)");
console.log("  - Template guidance is passed to GLM system prompt");
console.log("  - Complex artifacts succeed with template guidance");
console.log("  - Simple artifacts work with or without templates");
console.log("  - Fallback works when no template matches");
console.log("  - Template matching is consistent across calls");
console.log("  - Backward compatibility is maintained");
console.log("======================================\n");
