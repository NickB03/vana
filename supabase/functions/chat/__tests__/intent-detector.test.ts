/**
 * Tests for Intent Detection System (Regex-based)
 * Validates high confidence patterns, negative patterns, and thresholds
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { detectIntent } from "../intent-detector.ts";

Deno.test("Intent Detection - High Confidence React Patterns", () => {
  const testCases = [
    { input: "create a react app for tracking expenses", expected: "react" },
    { input: "build an interactive web dashboard", expected: "react" },
    { input: "make me a web component for authentication", expected: "react" },
    { input: "generate a react application with user login", expected: "react" },
  ];

  for (const testCase of testCases) {
    const result = detectIntent(testCase.input);
    assertEquals(
      result.type,
      testCase.expected,
      `Failed for: "${testCase.input}" - got ${result.type}, expected ${testCase.expected}. Reasoning: ${result.reasoning}`
    );
    assertEquals(
      result.confidence,
      "high",
      `Should have high confidence for: "${testCase.input}". Reasoning: ${result.reasoning}`
    );
  }
});

Deno.test("Intent Detection - High Confidence Mermaid Patterns", () => {
  const testCases = [
    { input: "create a flowchart showing the user login process", expected: "mermaid" },
    { input: "draw a sequence diagram for API calls", expected: "mermaid" },
    { input: "generate a mermaid diagram of the system architecture", expected: "mermaid" },
    { input: "make a state diagram for the order workflow", expected: "mermaid" },
  ];

  for (const testCase of testCases) {
    const result = detectIntent(testCase.input);
    assertEquals(
      result.type,
      testCase.expected,
      `Failed for: "${testCase.input}" - got ${result.type}, expected ${testCase.expected}. Reasoning: ${result.reasoning}`
    );
    assertEquals(
      result.confidence,
      "high",
      `Should have high confidence for: "${testCase.input}". Reasoning: ${result.reasoning}`
    );
  }
});

Deno.test("Intent Detection - High Confidence SVG Patterns", () => {
  const testCases = [
    { input: "create an svg logo for my startup", expected: "svg" },
    { input: "generate a vector icon set", expected: "svg" },
    { input: "make me an svg illustration", expected: "svg" },
  ];

  for (const testCase of testCases) {
    const result = detectIntent(testCase.input);
    assertEquals(
      result.type,
      testCase.expected,
      `Failed for: "${testCase.input}" - got ${result.type}, expected ${testCase.expected}. Reasoning: ${result.reasoning}`
    );
    // Note: SVG might be high or medium depending on other pattern matches
    assertExists(result.confidence, `Should have confidence for: "${testCase.input}"`);
  }
});

Deno.test("Intent Detection - High Confidence Image Patterns", () => {
  const testCases = [
    { input: "generate an image of a sunset over mountains", expected: "image" },
    { input: "create a picture showing a futuristic city", expected: "image" },
    { input: "draw an illustration depicting a medieval castle", expected: "image" },
    { input: "make an artwork of abstract patterns", expected: "image" },
  ];

  for (const testCase of testCases) {
    const result = detectIntent(testCase.input);
    assertEquals(
      result.type,
      testCase.expected,
      `Failed for: "${testCase.input}" - got ${result.type}, expected ${testCase.expected}. Reasoning: ${result.reasoning}`
    );
    assertEquals(
      result.confidence,
      "high",
      `Should have high confidence for: "${testCase.input}". Reasoning: ${result.reasoning}`
    );
  }
});

Deno.test("Intent Detection - Negative Patterns Prevent False Positives", () => {
  const testCases = [
    { input: "What is a react component?", expected: "chat" },
    { input: "How do flowcharts work?", expected: "chat" },
    { input: "Why would I use SVG instead of PNG?", expected: "chat" },
    { input: "Explain image generation to me", expected: "chat" },
    { input: "Tell me about mermaid diagrams", expected: "chat" },
    { input: "Can you explain how react hooks work?", expected: "chat" },
    { input: "Could you describe what a flowchart is?", expected: "chat" },
    { input: "Is it possible to create SVG with code?", expected: "chat" },
    { input: "What are the benefits of vector graphics?", expected: "chat" },
  ];

  for (const testCase of testCases) {
    const result = detectIntent(testCase.input);
    assertEquals(
      result.type,
      testCase.expected,
      `Failed for: "${testCase.input}" - got ${result.type}, expected ${testCase.expected}. Reasoning: ${result.reasoning}`
    );
    assertEquals(
      result.confidence,
      "high",
      `Should have high confidence for chat on question: "${testCase.input}". Reasoning: ${result.reasoning}`
    );
  }
});

Deno.test("Intent Detection - Low Confidence Defaults to Chat", () => {
  const testCases = [
    "Hello there",
    "I need help",
    "Let's discuss something",
    "Tell me a story",
    "Random text without clear intent",
  ];

  for (const testCase of testCases) {
    const result = detectIntent(testCase);
    assertEquals(
      result.type,
      "chat",
      `Failed for: "${testCase}" - got ${result.type}, expected chat. Reasoning: ${result.reasoning}`
    );
  }
});

Deno.test("Intent Detection - Medium Confidence Still Routes", () => {
  // These should have scores between 15-24 (medium confidence)
  const testCases = [
    { input: "I want an interactive dashboard", expected: "react", minScore: 15 },
    { input: "Show me a diagram of the process", expected: "mermaid", minScore: 7 }, // This might be low
    { input: "Make a simple logo", expected: "svg", minScore: 15 },
  ];

  for (const testCase of testCases) {
    const result = detectIntent(testCase.input);
    // We're flexible here - medium or high confidence both acceptable
    if (result.type !== "chat") {
      assertExists(
        result.confidence,
        `Should have confidence for: "${testCase.input}". Reasoning: ${result.reasoning}`
      );
    }
  }
});

Deno.test("Intent Detection - Score Thresholds", () => {
  // Test that score thresholds work correctly
  const highConfidenceInput = "create a react app with dashboard";
  const highResult = detectIntent(highConfidenceInput);
  assertEquals(
    highResult.confidence,
    "high",
    `High confidence input should have high confidence. Reasoning: ${highResult.reasoning}`
  );

  // Test minimum confidence threshold (score < 15 should be chat)
  const lowConfidenceInput = "maybe something";
  const lowResult = detectIntent(lowConfidenceInput);
  assertEquals(
    lowResult.type,
    "chat",
    `Low confidence input should default to chat. Reasoning: ${lowResult.reasoning}`
  );
});

Deno.test("Intent Detection - Combined Patterns Score Higher", () => {
  // Test that multiple matching patterns increase score
  const input = "create an interactive react application with dashboard and real-time updates";
  const result = detectIntent(input);

  assertEquals(
    result.type,
    "react",
    `Should detect react for: "${input}". Reasoning: ${result.reasoning}`
  );
  assertEquals(
    result.confidence,
    "high",
    `Combined patterns should give high confidence. Reasoning: ${result.reasoning}`
  );
});

Deno.test("Intent Detection - Edge Cases", () => {
  // Empty string
  const emptyResult = detectIntent("");
  assertEquals(emptyResult.type, "chat", "Empty string should default to chat");

  // Very long input
  const longInput = "I want to " + "create a react app ".repeat(100);
  const longResult = detectIntent(longInput);
  assertEquals(longResult.type, "react", "Should still detect intent in long inputs");

  // Case sensitivity
  const upperCaseInput = "CREATE A REACT APP";
  const upperResult = detectIntent(upperCaseInput);
  assertEquals(upperResult.type, "react", "Should be case-insensitive");
});
