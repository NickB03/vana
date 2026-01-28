/**
 * Tests for normalizePromptForApi()
 *
 * Function Purpose:
 * - Normalize user input for API transmission to LLM models
 * - NOT for HTML rendering - preserves all visible characters
 * - Security is handled separately by: PromptInjectionDefense, ReactMarkdown, iframe sandbox
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { normalizePromptForApi } from "../tool-validator.ts";

// Test 1: Preserves package names with special characters
Deno.test("normalizePromptForApi - preserves npm package paths", () => {
  const input = "Create component using @radix-ui/react-select";
  const result = normalizePromptForApi(input);
  assertEquals(result.includes("@radix-ui/react-select"), true);
  assertEquals(result.includes("&#x2F;"), false); // Should NOT HTML-encode
});

// Test 2: Preserves JSX/HTML syntax
Deno.test("normalizePromptForApi - preserves JSX syntax", () => {
  const input = '<div className="test">Hello & "world"</div>';
  const result = normalizePromptForApi(input);
  assertEquals(result, input); // Unchanged
});

// Test 3: Removes control characters
Deno.test("normalizePromptForApi - removes control characters", () => {
  const input = "text\x00with\x1Fcontrol\x7Fchars";
  const result = normalizePromptForApi(input);
  assertEquals(result, "textwithcontrolchars");
});

// Test 4: Normalizes Windows line endings
Deno.test("normalizePromptForApi - normalizes CRLF to LF", () => {
  const input = "line1\r\nline2\r\nline3";
  const result = normalizePromptForApi(input);
  assertEquals(result, "line1\nline2\nline3");
});

// Test 5: Handles standalone CR
Deno.test("normalizePromptForApi - normalizes standalone CR", () => {
  const input = "line1\rline2";
  const result = normalizePromptForApi(input);
  assertEquals(result, "line1\nline2");
});

// Test 6: Removes zero-width characters
Deno.test("normalizePromptForApi - removes zero-width characters", () => {
  const input = "hidden\u200Btext\uFEFF";
  const result = normalizePromptForApi(input);
  assertEquals(result, "hiddentext");
});

// Test 7: Preserves Unicode (non-control)
Deno.test("normalizePromptForApi - preserves valid Unicode", () => {
  const input = "Hello 世界 🌍 مرحبا";
  const result = normalizePromptForApi(input);
  assertEquals(result, input);
});

// Test 8: Empty input handling
Deno.test("normalizePromptForApi - handles empty input", () => {
  assertEquals(normalizePromptForApi(""), "");
});

// Test 9: Whitespace preservation
Deno.test("normalizePromptForApi - preserves whitespace", () => {
  assertEquals(normalizePromptForApi("   "), "   ");
  assertEquals(normalizePromptForApi("\t\t"), "\t\t");
});

// Test 10: Real artifact prompt example
Deno.test("normalizePromptForApi - handles real artifact prompt", () => {
  const input = `Create a dropdown using @radix-ui/react-select with:
- Dark theme styling
- Options: "Option 1", "Option 2"
- Use <SelectTrigger> and <SelectContent>`;

  const result = normalizePromptForApi(input);

  assertEquals(result.includes("@radix-ui/react-select"), true);
  assertEquals(result.includes("<SelectTrigger>"), true);
  assertEquals(result.includes('"Option 1"'), true);
});
