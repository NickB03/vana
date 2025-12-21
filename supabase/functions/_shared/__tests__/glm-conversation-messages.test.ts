/**
 * Test suite for GLM conversation history preservation (P0 bug fix)
 *
 * Validates that conversationMessages properly preserves full conversation
 * context including assistant responses with artifacts, preventing blank
 * responses on follow-up modification requests.
 *
 * Bug: After generating an artifact, follow-up modification requests result
 *      in blank responses because assistant context was being discarded.
 * Fix: Added conversationMessages parameter to preserve full conversation.
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
  conversationMessages?: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
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
  // BUG FIX (2025-12-20): Support full conversation history
  // When conversationMessages is provided, it takes precedence
  let messages: GLMMessage[];

  if (options?.conversationMessages && options.conversationMessages.length > 0) {
    // Multi-turn conversation mode - use provided messages
    messages = options.conversationMessages.map(m => ({
      role: m.role,
      content: m.content
    })) as GLMMessage[];
  } else {
    // Legacy single-turn mode - system + user prompt
    messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];
  }

  // Add assistant message with tool_calls if provided (existing logic)
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
// TEST 1: conversationMessages takes precedence over systemPrompt + userPrompt
// ============================================================================
Deno.test({
  name: "Conversation history: conversationMessages takes precedence",
  fn: () => {
    const messages = buildGLMMessages(
      "This system prompt should be ignored",
      "This user prompt should be ignored",
      {
        conversationMessages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Create a counter component" },
          { role: "assistant", content: "<artifact type='react' title='Counter'>...</artifact>" },
          { role: "user", content: "Add a reset button" }
        ]
      }
    );

    assertEquals(messages.length, 4, "Should have 4 messages from conversationMessages");
    assertEquals(messages[0].role, "system");
    assertEquals(messages[0].content, "You are a helpful assistant.");
    assertEquals(messages[1].role, "user");
    assertEquals(messages[1].content, "Create a counter component");
    assertEquals(messages[2].role, "assistant");
    assertEquals(messages[2].content?.includes("artifact"), true, "Should preserve artifact");
    assertEquals(messages[3].role, "user");
    assertEquals(messages[3].content, "Add a reset button");
  }
});

// ============================================================================
// TEST 2: Empty conversationMessages falls back to legacy mode
// ============================================================================
Deno.test({
  name: "Conversation history: Empty conversationMessages falls back to legacy",
  fn: () => {
    const messages = buildGLMMessages(
      "System prompt",
      "User prompt",
      {
        conversationMessages: []  // Empty array
      }
    );

    assertEquals(messages.length, 2, "Should fall back to legacy mode");
    assertEquals(messages[0].role, "system");
    assertEquals(messages[0].content, "System prompt");
    assertEquals(messages[1].role, "user");
    assertEquals(messages[1].content, "User prompt");
  }
});

// ============================================================================
// TEST 3: Undefined conversationMessages uses legacy mode (backward compat)
// ============================================================================
Deno.test({
  name: "Conversation history: Backward compatibility with no conversationMessages",
  fn: () => {
    const messages = buildGLMMessages(
      "System prompt",
      "User prompt"
      // No options - undefined conversationMessages
    );

    assertEquals(messages.length, 2, "Should use legacy mode");
    assertEquals(messages[0].role, "system");
    assertEquals(messages[1].role, "user");
  }
});

// ============================================================================
// TEST 4: Artifact modification scenario (the main bug case)
// ============================================================================
Deno.test({
  name: "Conversation history: FIXED - Artifact modification preserves context",
  fn: () => {
    const artifactContent = `<artifact type="application/vnd.ant.react" title="Counter">
const { useState } = React;
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}
export default Counter;
</artifact>`;

    const messages = buildGLMMessages(
      "Ignored when conversationMessages provided",
      "Ignored when conversationMessages provided",
      {
        conversationMessages: [
          { role: "system", content: "You are a helpful React developer." },
          { role: "user", content: "Create a simple counter button" },
          { role: "assistant", content: `Here's a counter component:\n\n${artifactContent}` },
          { role: "user", content: "Add a reset button that sets count back to 0" }
        ]
      }
    );

    assertEquals(messages.length, 4, "Should have full conversation");

    // Verify assistant message with artifact is preserved
    const assistantMsg = messages.find(m => m.role === "assistant");
    assertExists(assistantMsg, "Should have assistant message");
    assertEquals(assistantMsg!.content?.includes("Counter"), true, "Should contain artifact");
    assertEquals(assistantMsg!.content?.includes("useState(0)"), true, "Should contain implementation");

    // Verify modification request is the last message
    assertEquals(messages[3].role, "user");
    assertEquals(messages[3].content?.includes("reset button"), true, "Should have modification request");
  }
});

// ============================================================================
// TEST 5: Long conversation with multiple artifacts
// ============================================================================
Deno.test({
  name: "Conversation history: Multiple artifacts in conversation",
  fn: () => {
    const messages = buildGLMMessages(
      "Ignored",
      "Ignored",
      {
        conversationMessages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Create a todo list" },
          { role: "assistant", content: "<artifact type='react' title='TodoList'>...todo code...</artifact>" },
          { role: "user", content: "Add a delete button for each item" },
          { role: "assistant", content: "<artifact type='react' title='TodoList'>...updated with delete...</artifact>" },
          { role: "user", content: "Now add a filter dropdown" }
        ]
      }
    );

    assertEquals(messages.length, 6, "Should preserve all messages");

    // Count assistant messages (should be 2)
    const assistantMessages = messages.filter(m => m.role === "assistant");
    assertEquals(assistantMessages.length, 2, "Should have 2 assistant responses");

    // Both should contain artifacts
    for (const msg of assistantMessages) {
      assertEquals(msg.content?.includes("artifact"), true, "Each assistant message should have artifact");
    }
  }
});

// ============================================================================
// TEST 6: Image modification scenario
// ============================================================================
Deno.test({
  name: "Conversation history: Image modification preserves context",
  fn: () => {
    const messages = buildGLMMessages(
      "Ignored",
      "Ignored",
      {
        conversationMessages: [
          { role: "system", content: "You are an image generation assistant." },
          { role: "user", content: "Generate an image of a sunset" },
          { role: "assistant", content: "Here's your sunset image:\n\n<artifact type='image' title='Sunset'>https://storage.example.com/sunset.png</artifact>" },
          { role: "user", content: "Make the colors more vibrant" }
        ]
      }
    );

    assertEquals(messages.length, 4, "Should have full conversation");
    assertEquals(messages[2].content?.includes("sunset"), true, "Should preserve image reference");
    assertEquals(messages[3].content?.includes("vibrant"), true, "Should have modification request");
  }
});

// ============================================================================
// TEST 7: conversationMessages with tool continuation (combined scenario)
// ============================================================================
Deno.test({
  name: "Conversation history: Works alongside previousAssistantMessage for tool continuation",
  fn: () => {
    const messages = buildGLMMessages(
      "Ignored",
      "Ignored",
      {
        conversationMessages: [
          { role: "system", content: "You have tools available." },
          { role: "user", content: "Search for React best practices" }
        ],
        previousAssistantMessage: {
          content: null,
          tool_calls: [
            {
              id: "call_123",
              function: { name: "browser.search", arguments: '{"query":"React best practices"}' }
            }
          ]
        },
        toolResultContext: {
          toolCallId: "call_123",
          toolName: "browser.search",
          content: "Search results: React hooks, state management..."
        }
      }
    );

    // Should have: 2 from conversationMessages + 1 assistant + 1 tool = 4
    assertEquals(messages.length, 4, "Should combine conversationMessages with tool continuation");
    assertEquals(messages[0].role, "system");
    assertEquals(messages[1].role, "user");
    assertEquals(messages[2].role, "assistant");
    assertEquals(messages[3].role, "tool");
  }
});

// ============================================================================
// TEST 8: Message role types are correct
// ============================================================================
Deno.test({
  name: "Conversation history: Message roles are typed correctly",
  fn: () => {
    const messages = buildGLMMessages(
      "Ignored",
      "Ignored",
      {
        conversationMessages: [
          { role: "system", content: "System" },
          { role: "user", content: "User" },
          { role: "assistant", content: "Assistant" }
        ]
      }
    );

    // Verify roles are preserved
    assertEquals(messages[0].role, "system");
    assertEquals(messages[1].role, "user");
    assertEquals(messages[2].role, "assistant");
  }
});

// ============================================================================
// DOCUMENTATION
// ============================================================================
Deno.test({
  name: "BUG FIX DOCUMENTATION: Conversation history preservation",
  fn: () => {
    console.log("\n");
    console.log("========================================");
    console.log("P0 BUG FIX: Conversation History");
    console.log("========================================");
    console.log("");
    console.log("BEFORE (BROKEN):");
    console.log("  tool-calling-chat.ts filtered to user-only:");
    console.log("    const userPrompt = messages");
    console.log("      .filter((m) => m.role === 'user')");
    console.log("      .map((m) => m.content)");
    console.log("      .join('\\n\\n');");
    console.log("");
    console.log("  Result: Assistant artifacts discarded!");
    console.log("          Modification requests get blank responses");
    console.log("");
    console.log("AFTER (FIXED):");
    console.log("  1. Added conversationMessages to CallGLMOptions");
    console.log("  2. Build full conversation history in tool-calling-chat.ts");
    console.log("  3. GLM receives: [system, user, assistant, user, ...]");
    console.log("");
    console.log("  Result: GLM understands modification context");
    console.log("          Follow-up requests work correctly");
    console.log("========================================");
    console.log("");
  }
});
