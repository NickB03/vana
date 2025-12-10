/**
 * Tests for GLM Client Tool-Calling Extensions
 * Verifies tool definition, parsing, and streaming with tool detection
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  GLM_SEARCH_TOOL,
  buildToolSystemPromptSection,
  parseToolCall,
  type GLMToolDefinition,
  type ToolCall
} from "../glm-client.ts";

Deno.test("GLM_SEARCH_TOOL - should have correct structure", () => {
  assertEquals(GLM_SEARCH_TOOL.name, "browser.search");
  assertExists(GLM_SEARCH_TOOL.description);
  assertEquals(GLM_SEARCH_TOOL.parameters.type, "object");
  assertExists(GLM_SEARCH_TOOL.parameters.properties.query);
  assertEquals(GLM_SEARCH_TOOL.parameters.required, ["query"]);
});

Deno.test("buildToolSystemPromptSection - should generate XML format", () => {
  const tools: GLMToolDefinition[] = [
    {
      name: "calculator.add",
      description: "Add two numbers",
      parameters: {
        type: "object",
        properties: {
          a: { type: "number", description: "First number" },
          b: { type: "number", description: "Second number" }
        },
        required: ["a", "b"]
      }
    }
  ];

  const result = buildToolSystemPromptSection(tools);

  // Should contain tool definition
  assertEquals(result.includes('<tool name="calculator.add">'), true);
  assertEquals(result.includes("Add two numbers"), true);
  assertEquals(result.includes("a: number (required)"), true);
  assertEquals(result.includes("b: number (required)"), true);

  // Should contain usage instructions
  assertEquals(result.includes("Available Tools"), true);
  assertEquals(result.includes("<tool_call>"), true);
  assertEquals(result.includes("WAIT for the tool result"), true);
});

Deno.test("buildToolSystemPromptSection - should handle multiple tools", () => {
  const tools: GLMToolDefinition[] = [GLM_SEARCH_TOOL, {
    name: "weather.get",
    description: "Get weather info",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name" }
      },
      required: ["city"]
    }
  }];

  const result = buildToolSystemPromptSection(tools);

  assertEquals(result.includes("browser.search"), true);
  assertEquals(result.includes("weather.get"), true);
});

Deno.test("buildToolSystemPromptSection - should return empty for no tools", () => {
  const result = buildToolSystemPromptSection([]);
  assertEquals(result, "");
});

Deno.test("buildToolSystemPromptSection - should handle optional parameters", () => {
  const tools: GLMToolDefinition[] = [
    {
      name: "test.tool",
      description: "Test tool",
      parameters: {
        type: "object",
        properties: {
          required_param: { type: "string", description: "Required" },
          optional_param: { type: "string", description: "Optional", default: "default_value" }
        },
        required: ["required_param"]
      }
    }
  ];

  const result = buildToolSystemPromptSection(tools);

  assertEquals(result.includes("required_param: string (required)"), true);
  assertEquals(result.includes("optional_param: string [default: \"default_value\"]"), true);
});

Deno.test("parseToolCall - should parse complete tool call", () => {
  const content = `<tool_call>
  <name>browser.search</name>
  <arguments>
    <query>React hooks tutorial</query>
  </arguments>
</tool_call>`;

  const result = parseToolCall(content);

  assertExists(result);
  assertEquals(result.name, "browser.search");
  assertEquals(result.arguments.query, "React hooks tutorial");
  assertExists(result.id); // Should generate UUID
});

Deno.test("parseToolCall - should handle multiple arguments", () => {
  const content = `<tool_call>
  <name>calculator.add</name>
  <arguments>
    <a>5</a>
    <b>10</b>
  </arguments>
</tool_call>`;

  const result = parseToolCall(content);

  assertExists(result);
  assertEquals(result.name, "calculator.add");
  // Numbers in plain XML tags are parsed as JSON numbers
  assertEquals(result.arguments.a, 5);
  assertEquals(result.arguments.b, 10);
});

Deno.test("parseToolCall - should return null for incomplete tool call", () => {
  const content = `<tool_call>
  <name>browser.search</name>
  <arguments>`;

  const result = parseToolCall(content);
  assertEquals(result, null);
});

Deno.test("parseToolCall - should return null for missing name tag", () => {
  const content = `<tool_call>
  <arguments>
    <query>test</query>
  </arguments>
</tool_call>`;

  const result = parseToolCall(content);
  assertEquals(result, null);
});

Deno.test("parseToolCall - should handle tool call without arguments", () => {
  const content = `<tool_call>
  <name>refresh.data</name>
  <arguments>
  </arguments>
</tool_call>`;

  const result = parseToolCall(content);

  assertExists(result);
  assertEquals(result.name, "refresh.data");
  assertEquals(Object.keys(result.arguments).length, 0);
});

Deno.test("parseToolCall - should handle tool call embedded in text", () => {
  const content = `Let me search for that information.

<tool_call>
  <name>browser.search</name>
  <arguments>
    <query>latest news</query>
  </arguments>
</tool_call>

I'll use the search results to answer your question.`;

  const result = parseToolCall(content);

  assertExists(result);
  assertEquals(result.name, "browser.search");
  assertEquals(result.arguments.query, "latest news");
});

Deno.test("parseToolCall - should parse JSON values in arguments", () => {
  const content = `<tool_call>
  <name>test.tool</name>
  <arguments>
    <config>{"enabled":true,"count":5}</config>
  </arguments>
</tool_call>`;

  const result = parseToolCall(content);

  assertExists(result);
  assertEquals(result.name, "test.tool");
  assertEquals(typeof result.arguments.config, "object");
  assertEquals((result.arguments.config as any).enabled, true);
  assertEquals((result.arguments.config as any).count, 5);
});

Deno.test("parseToolCall - should handle whitespace in arguments", () => {
  const content = `<tool_call>
  <name>browser.search</name>
  <arguments>
    <query>  React hooks best practices  </query>
  </arguments>
</tool_call>`;

  const result = parseToolCall(content);

  assertExists(result);
  assertEquals(result.arguments.query, "React hooks best practices"); // Trimmed
});
