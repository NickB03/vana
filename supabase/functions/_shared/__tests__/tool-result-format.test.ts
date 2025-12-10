import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { formatToolResult, formatToolError } from "../glm-tool-parser.ts";
import { formatResultForGLM } from "../tool-executor.ts";
import type { ToolCall } from "../glm-client.ts";

// Test the standard format across all three files

Deno.test("formatToolResult uses standard format", () => {
  const toolCall: ToolCall = {
    id: "call_123",
    name: "browser.search",
    arguments: { query: "test" }
  };

  const result = formatToolResult(toolCall, { results: ["item1"] }, true);
  
  // Should contain all standard elements
  assertEquals(result.includes("<tool_call_id>call_123</tool_call_id>"), true);
  assertEquals(result.includes("<name>browser.search</name>"), true);
  assertEquals(result.includes("<status>success</status>"), true);
  assertEquals(result.includes("<result>"), true);
  assertEquals(result.includes("</result>"), true);
  assertEquals(result.includes("</tool_result>"), true);
});

Deno.test("formatToolError uses standard format", () => {
  const toolCall: ToolCall = {
    id: "call_456",
    name: "browser.navigate",
    arguments: { url: "invalid" }
  };

  const result = formatToolError(toolCall, "Invalid URL");
  
  // Should contain all standard elements
  assertEquals(result.includes("<tool_call_id>call_456</tool_call_id>"), true);
  assertEquals(result.includes("<name>browser.navigate</name>"), true);
  assertEquals(result.includes("<status>error</status>"), true);
  assertEquals(result.includes("<error>"), true);
  assertEquals(result.includes("Invalid URL"), true);
});

Deno.test("formatResultForGLM uses standard format - success", () => {
  const toolCall: ToolCall = {
    id: "call_789",
    name: "browser.search",
    arguments: { query: "test" }
  };

  const result = formatResultForGLM(toolCall, {
    success: true,
    toolName: "browser.search",
    data: { formattedContext: "Search results here" },
    latencyMs: 100
  });
  
  // Should contain all standard elements
  assertEquals(result.includes("<tool_call_id>call_789</tool_call_id>"), true);
  assertEquals(result.includes("<name>browser.search</name>"), true);
  assertEquals(result.includes("<status>success</status>"), true);
  assertEquals(result.includes("<result>"), true);
  assertEquals(result.includes("Search results here"), true);
});

Deno.test("formatResultForGLM uses standard format - failure", () => {
  const toolCall: ToolCall = {
    id: "call_999",
    name: "browser.search",
    arguments: { query: "test" }
  };

  const result = formatResultForGLM(toolCall, {
    success: false,
    toolName: "browser.search",
    error: "Network timeout",
    latencyMs: 5000
  });
  
  // Should contain all standard elements
  assertEquals(result.includes("<tool_call_id>call_999</tool_call_id>"), true);
  assertEquals(result.includes("<name>browser.search</name>"), true);
  assertEquals(result.includes("<status>failure</status>"), true);
  assertEquals(result.includes("<result>"), true);
  assertEquals(result.includes("Network timeout"), true);
});

Deno.test("All formatters sanitize XML special characters", () => {
  const toolCall: ToolCall = {
    id: "call_<script>",
    name: "browser.search",
    arguments: { query: "test" }
  };

  const result1 = formatToolResult(toolCall, "<script>alert('xss')</script>", true);
  // Should escape the tool_call_id
  assertEquals(result1.includes("<tool_call_id>call_&lt;script&gt;</tool_call_id>"), true);
  // Should escape the result content
  assertEquals(result1.includes("&lt;script&gt;alert(&apos;xss&apos;)&lt;/script&gt;"), true);
  // Should NOT contain unescaped script tags in the result section
  assertEquals(result1.includes("result>\n<script>"), false);

  const result2 = formatToolError(toolCall, "<img src=x onerror=alert(1)>");
  // Should escape the error content
  assertEquals(result2.includes("&lt;img src=x onerror=alert(1)&gt;"), true);
  // Should NOT contain unescaped img tag in the error section
  assertEquals(result2.includes("error>\n<img"), false);
});

console.log("All tool result format tests passed!");
