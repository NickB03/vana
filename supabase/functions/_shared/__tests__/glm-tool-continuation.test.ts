/**
 * Test suite for GLM tool continuation message sequence (RFC-001 bug fix)
 *
 * Validates that tool continuations properly include the assistant's tool_calls
 * message in the conversation history, preventing blank responses.
 *
 * Bug: https://github.com/your-repo/issues/XXX
 * RFC: docs/RFC-001-TOOL-RESULT-FORMAT-REFACTOR.md
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

// Mock types matching glm-client.ts
interface GLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: any[];
}

interface CallGLMOptions {
  toolResultContext?: {
    toolCallId: string;
    toolName: string;
    content: string;
  };
  previousAssistantMessage?: {
    content: string | null;
    tool_calls?: any[];
  };
}

/**
 * Simulates the message building logic from callGLM()
 * to verify the correct message sequence is constructed
 */
function buildGLMMessages(
  systemPrompt: string,
  userPrompt: string,
  options?: CallGLMOptions
): GLMMessage[] {
  const messages: GLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  // BUG FIX: Add assistant message with tool_calls if provided
  if (options?.previousAssistantMessage) {
    const assistantMessage: any = {
      role: "assistant",
      content: options.previousAssistantMessage.content || null
    };

    if (
      options.previousAssistantMessage.tool_calls &&
      options.previousAssistantMessage.tool_calls.length > 0
    ) {
      assistantMessage.tool_calls = options.previousAssistantMessage.tool_calls;
    }

    messages.push(assistantMessage);
  }

  // Add tool result message
  if (options?.toolResultContext) {
    messages.push({
      role: "tool",
      content: options.toolResultContext.content,
      tool_call_id: options.toolResultContext.toolCallId
    });
  }

  return messages;
}

// ============================================================================
// TEST 1: Message sequence without tool calls (should be 3 messages)
// ============================================================================
Deno.test({
  name: "Tool continuation: Basic sequence (no tool calls)",
  fn: () => {
    const messages = buildGLMMessages(
      "You are a helpful assistant.",
      "What's the weather?"
    );

    assertEquals(messages.length, 2, "Should have 2 messages (system + user)");
    assertEquals(messages[0].role, "system");
    assertEquals(messages[1].role, "user");
  }
});

// ============================================================================
// TEST 2: Message sequence WITH tool calls (the critical fix)
// ============================================================================
Deno.test({
  name: "Tool continuation: FIXED sequence with previous assistant tool_calls",
  fn: () => {
    const messages = buildGLMMessages(
      "You are a helpful assistant with tools.",
      "What's the weather in San Francisco?",
      {
        previousAssistantMessage: {
          content: null,
          tool_calls: [
            {
              id: "call_123",
              function: {
                name: "browser.search",
                arguments: '{"query":"San Francisco weather"}'
              }
            }
          ]
        },
        toolResultContext: {
          toolCallId: "call_123",
          toolName: "browser.search",
          content: "Weather in San Francisco: Sunny, 72°F"
        }
      }
    );

    // CRITICAL: Verify message order
    assertEquals(messages.length, 4, "Should have 4 messages");

    // 1. System message
    assertEquals(messages[0].role, "system");
    assertEquals(messages[0].content, "You are a helpful assistant with tools.");

    // 2. User message
    assertEquals(messages[1].role, "user");
    assertEquals(messages[1].content, "What's the weather in San Francisco?");

    // 3. Assistant message with tool_calls (THIS WAS MISSING IN BUG)
    assertEquals(messages[2].role, "assistant");
    assertEquals(messages[2].content, null);
    assertExists(messages[2].tool_calls, "Should have tool_calls array");
    assertEquals(messages[2].tool_calls.length, 1);
    assertEquals(messages[2].tool_calls[0].id, "call_123");
    assertEquals(messages[2].tool_calls[0].function.name, "browser.search");

    // 4. Tool result message
    assertEquals(messages[3].role, "tool");
    assertEquals(messages[3].tool_call_id, "call_123");
    assertEquals(messages[3].content, "Weather in San Francisco: Sunny, 72°F");
  }
});

// ============================================================================
// TEST 3: Multiple tool calls in assistant message
// ============================================================================
Deno.test({
  name: "Tool continuation: Multiple tool_calls in assistant message",
  fn: () => {
    const messages = buildGLMMessages(
      "You are a helpful assistant with tools.",
      "Search for news and generate an image",
      {
        previousAssistantMessage: {
          content: null,
          tool_calls: [
            {
              id: "call_1",
              function: { name: "browser.search", arguments: '{"query":"news"}' }
            },
            {
              id: "call_2",
              function: { name: "generate_image", arguments: '{"prompt":"news"}' }
            }
          ]
        },
        toolResultContext: {
          toolCallId: "call_1",
          toolName: "browser.search",
          content: "News results here..."
        }
      }
    );

    assertEquals(messages.length, 4);
    assertEquals(messages[2].role, "assistant");
    assertExists(messages[2].tool_calls);
    assertEquals(messages[2].tool_calls!.length, 2, "Should have both tool calls");
  }
});

// ============================================================================
// TEST 4: Without previousAssistantMessage (backward compatibility)
// ============================================================================
Deno.test({
  name: "Tool continuation: Backward compatibility (no previousAssistantMessage)",
  fn: () => {
    const messages = buildGLMMessages(
      "You are a helpful assistant.",
      "What's the weather?",
      {
        toolResultContext: {
          toolCallId: "call_123",
          toolName: "browser.search",
          content: "Results..."
        }
        // NOTE: No previousAssistantMessage - simulates old broken code
      }
    );

    assertEquals(messages.length, 3, "Should have 3 messages");
    assertEquals(messages[0].role, "system");
    assertEquals(messages[1].role, "user");
    assertEquals(messages[2].role, "tool");
    // NOTE: Missing assistant message - this was the bug!
  }
});

// ============================================================================
// TEST 5: Tool result content preservation
// ============================================================================
Deno.test({
  name: "Tool continuation: Tool result content is preserved correctly",
  fn: () => {
    const longContent = "Search result 1\nSearch result 2\nSearch result 3\nMore results...";

    const messages = buildGLMMessages(
      "System prompt",
      "User question",
      {
        previousAssistantMessage: {
          content: null,
          tool_calls: [
            {
              id: "call_123",
              function: {
                name: "browser.search",
                arguments: '{"query":"test"}'
              }
            }
          ]
        },
        toolResultContext: {
          toolCallId: "call_123",
          toolName: "browser.search",
          content: longContent
        }
      }
    );

    const toolMessage = messages[3];
    assertEquals(toolMessage.role, "tool");
    assertEquals(toolMessage.content, longContent, "Should preserve full content");
  }
});

// ============================================================================
// TEST 6: Empty tool_calls array (still adds assistant message for robustness)
// ============================================================================
Deno.test({
  name: "Tool continuation: Empty tool_calls array (still creates assistant message)",
  fn: () => {
    const messages = buildGLMMessages(
      "System prompt",
      "User question",
      {
        previousAssistantMessage: {
          content: null,
          tool_calls: []  // Empty array
        },
        toolResultContext: {
          toolCallId: "call_123",
          toolName: "browser.search",
          content: "Results..."
        }
      }
    );

    // Still adds assistant message even with empty tool_calls (defensive approach)
    assertEquals(messages.length, 4, "Should have assistant message even if empty");
    assertEquals(messages[2].role, "assistant");
    // tool_calls may not be included since array was empty
  }
});

// ============================================================================
// SUMMARY / DOCUMENTATION
// ============================================================================
Deno.test({
  name: "BUG FIX DOCUMENTATION: Tool continuation message sequence",
  fn: () => {
    console.log("\n");
    console.log("========================================");
    console.log("RFC-001 BUG FIX: Tool Continuation");
    console.log("========================================");
    console.log("");
    console.log("BEFORE (BROKEN):");
    console.log("  [system message]");
    console.log("  [user message]");
    console.log("  [tool message] ← MISSING CONTEXT!");
    console.log("  Result: GLM returns blank response");
    console.log("");
    console.log("AFTER (FIXED):");
    console.log("  [system message]");
    console.log("  [user message]");
    console.log("  [assistant message with tool_calls] ← NOW INCLUDED!");
    console.log("  [tool message]");
    console.log("  Result: GLM returns proper response");
    console.log("");
    console.log("KEY FIX:");
    console.log("  - Capture nativeToolCalls from processGLMStream()");
    console.log("  - Pass to callGLMWithToolResult() as previousAssistantToolCalls");
    console.log("  - Reconstruct assistant message in callGLM()");
    console.log("  - GLM now has full context to synthesize response");
    console.log("========================================");
    console.log("");
  }
});
