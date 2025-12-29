/**
 * Phase 0 Validation Tests: GLM OpenAI-Compatible Tool Message Format
 *
 * RFC-001: Tool Result Format Refactor
 *
 * These tests validate that GLM-4.7 accepts the standard OpenAI tool message format
 * BEFORE we refactor the codebase. Run with GLM_API_KEY environment variable.
 *
 * Usage:
 *   GLM_API_KEY=your_key deno test glm-openai-format.validation.test.ts
 *
 * Exit Criteria:
 * - Test 0.1 (Basic format): REQUIRED to pass
 * - Test 0.2 (Name field): INFORMATIONAL - documents behavior
 * - Test 0.3 (Error format): REQUIRED to pass
 * - Test 0.4 (JSON content): REQUIRED to pass
 * - Test 0.5 (Long content): REQUIRED to pass
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";

const GLM_API_KEY = Deno.env.get("GLM_API_KEY");
// Use the Coding API endpoint (not the General API)
// See: https://docs.z.ai/devpack/tool/others
const GLM_API_URL = "https://api.z.ai/api/coding/paas/v4/chat/completions";

interface TestResult {
  passed: boolean;
  response?: string;
  error?: string;
}

/**
 * Test helper: Send a tool message to GLM and validate response
 */
async function testToolMessageFormat(
  toolMessage: Record<string, unknown>,
  description: string
): Promise<TestResult> {
  if (!GLM_API_KEY) {
    return { passed: false, error: "GLM_API_KEY not set" };
  }

  try {
    const response = await fetch(GLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: "glm-4.7",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Search for AI news" },
          {
            role: "assistant",
            content: null,
            tool_calls: [{
              id: "call_test_123",
              type: "function",
              function: { name: "browser.search", arguments: '{"query":"AI news"}' }
            }]
          },
          toolMessage  // The format we're testing
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { passed: false, error: `HTTP ${response.status}: ${errorBody}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    return {
      passed: true,
      response: content?.substring(0, 100) || "No content"
    };
  } catch (error) {
    return { passed: false, error: String(error) };
  }
}

// ============================================================================
// TEST 0.1: Basic OpenAI-compatible format (REQUIRED TO PASS)
// ============================================================================
Deno.test({
  name: "Phase 0.1: GLM accepts basic OpenAI tool message format",
  ignore: !GLM_API_KEY,
  fn: async () => {
    const result = await testToolMessageFormat(
      {
        role: "tool",
        tool_call_id: "call_test_123",
        content: "Found 3 results about AI breakthroughs in December 2025."
      },
      "Basic format"
    );

    console.log(`Test result: ${result.passed ? "PASS" : "FAIL"}`);
    if (result.response) console.log(`Response preview: ${result.response}`);
    if (result.error) console.log(`Error: ${result.error}`);

    assertEquals(result.passed, true, `GLM rejected basic format: ${result.error}`);
  }
});

// ============================================================================
// TEST 0.2: With 'name' field (may be rejected - not in OpenAI spec)
// ============================================================================
Deno.test({
  name: "Phase 0.2: GLM behavior with 'name' field",
  ignore: !GLM_API_KEY,
  fn: async () => {
    const result = await testToolMessageFormat(
      {
        role: "tool",
        tool_call_id: "call_test_123",
        name: "browser.search",  // Not in OpenAI spec
        content: "Found 3 results about AI breakthroughs."
      },
      "With name field"
    );

    console.log(`With 'name' field: ${result.passed ? "ACCEPTED" : "REJECTED"}`);
    if (!result.passed) {
      console.log("Decision: EXCLUDE 'name' field from implementation");
    } else {
      console.log("Decision: 'name' field is OPTIONAL but accepted");
    }

    // This test documents behavior, doesn't require pass
    assertExists(result);
  }
});

// ============================================================================
// TEST 0.3: Error message format
// ============================================================================
Deno.test({
  name: "Phase 0.3: GLM accepts error format in tool result",
  ignore: !GLM_API_KEY,
  fn: async () => {
    const result = await testToolMessageFormat(
      {
        role: "tool",
        tool_call_id: "call_test_123",
        content: "Error: Network timeout occurred while searching"
      },
      "Error format"
    );

    console.log(`Error format: ${result.passed ? "PASS" : "FAIL"}`);
    assertEquals(result.passed, true, `GLM rejected error format: ${result.error}`);
  }
});

// ============================================================================
// TEST 0.4: JSON content in tool result
// ============================================================================
Deno.test({
  name: "Phase 0.4: GLM accepts JSON content in tool result",
  ignore: !GLM_API_KEY,
  fn: async () => {
    const result = await testToolMessageFormat(
      {
        role: "tool",
        tool_call_id: "call_test_123",
        content: JSON.stringify({
          results: [
            { title: "AI News 1", url: "https://example.com/1" },
            { title: "AI News 2", url: "https://example.com/2" }
          ],
          sourceCount: 2
        })
      },
      "JSON content"
    );

    console.log(`JSON content: ${result.passed ? "PASS" : "FAIL"}`);
    assertEquals(result.passed, true, `GLM rejected JSON content: ${result.error}`);
  }
});

// ============================================================================
// TEST 0.5: Long content (artifact-like)
// ============================================================================
Deno.test({
  name: "Phase 0.5: GLM accepts long content (artifact simulation)",
  ignore: !GLM_API_KEY,
  fn: async () => {
    const longContent = `Artifact generated successfully:

\`\`\`typescript
export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div className="p-4">
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}
\`\`\`

Reasoning:
Created a simple counter component with React hooks.`;

    const result = await testToolMessageFormat(
      {
        role: "tool",
        tool_call_id: "call_test_123",
        content: longContent
      },
      "Long artifact content"
    );

    console.log(`Long content: ${result.passed ? "PASS" : "FAIL"}`);
    assertEquals(result.passed, true, `GLM rejected long content: ${result.error}`);
  }
});

// ============================================================================
// SUMMARY
// ============================================================================
Deno.test({
  name: "Phase 0 Summary",
  ignore: !GLM_API_KEY,
  fn: () => {
    console.log("\n========================================");
    console.log("PHASE 0 VALIDATION COMPLETE");
    console.log("========================================");
    console.log("If all tests passed, proceed with Phase 1.");
    console.log("If Test 0.2 (name field) failed, ensure implementation excludes 'name'.");
    console.log("========================================\n");
  }
});

// ============================================================================
// SKIP REASON (when GLM_API_KEY not set)
// ============================================================================
Deno.test({
  name: "Phase 0: Skip reason",
  ignore: !!GLM_API_KEY,
  fn: () => {
    console.log("\n========================================");
    console.log("PHASE 0 TESTS SKIPPED");
    console.log("========================================");
    console.log("GLM_API_KEY environment variable not set.");
    console.log("To run validation tests:");
    console.log("  GLM_API_KEY=your_key deno test glm-openai-format.validation.test.ts");
    console.log("========================================\n");
  }
});
