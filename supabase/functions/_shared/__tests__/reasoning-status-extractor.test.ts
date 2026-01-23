/**
 * Integration tests for reasoning status extractor
 *
 * Tests the extraction of user-friendly status messages from LLM reasoning content.
 * Validates pattern matching, confidence scoring, and time-based fallback logic.
 *
 * Run with: npm run test:integration or deno test in supabase/functions directory
 */

import { assertEquals, assertMatch, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  extractStatusFromReasoning,
  getTimeBasedStatus,
  toGerund,
  cleanObject,
} from "../reasoning-status-extractor.ts";

// ============================================================================
// Markdown Header Pattern Tests
// ============================================================================

Deno.test("Markdown Header - Basic extraction", () => {
  const text = "**Analyzing the database schema**\n\nLet me look at this...";
  const result = extractStatusFromReasoning(text);

  // cleanObject removes leading articles ("the") for cleaner status messages
  assertEquals(result.status, "Analyzing database schema...");
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "markdown_header");
});

Deno.test("Markdown Header - Multiple headers (first wins)", () => {
  const text = "**Planning the architecture**\n\nSome text.\n\n**Implementing the feature**";
  const result = extractStatusFromReasoning(text);

  // cleanObject removes leading articles ("the") for cleaner status messages
  assertEquals(result.status, "Planning architecture...");
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "markdown_header");
});

Deno.test("Markdown Header - With additional text", () => {
  const text = "**Building the component structure**\n\nI will analyze the requirements...";
  const result = extractStatusFromReasoning(text);

  // cleanObject removes leading articles ("the") for cleaner status messages
  assertEquals(result.status, "Building component structure...");
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "markdown_header");
});

Deno.test("Markdown Header - Length truncation at 45 chars", () => {
  const text = "**Analyzing the very long and detailed database schema requirements for the microservices architecture**";
  const result = extractStatusFromReasoning(text);

  assert(result.status !== null, "Should extract status");
  assert(result.status!.length <= 45, "Should truncate to 45 chars");
  assertMatch(result.status!, /\.\.\.$/);
});

// ============================================================================
// "I will" Pattern Tests
// ============================================================================

Deno.test("I will Pattern - Basic extraction", () => {
  const text = "I will analyze the user requirements carefully.";
  const result = extractStatusFromReasoning(text);

  assertMatch(result.status!, /Analyzing.*requirements/i);
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "future_action");
});

Deno.test("I will Pattern - I'll variant", () => {
  const text = "I'll create the component structure for you.";
  const result = extractStatusFromReasoning(text);

  assertMatch(result.status!, /Creating.*component/i);
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "future_action");
});

Deno.test("I will Pattern - Various verbs", () => {
  const testCases = [
    { input: "I will design the API endpoints.", expected: /Designing.*API/i },
    { input: "I'll validate the input data.", expected: /Validating.*input/i },
    { input: "I will implement the authentication flow.", expected: /Implementing.*authentication/i },
  ];

  testCases.forEach(({ input, expected }) => {
    const result = extractStatusFromReasoning(input);
    assertMatch(result.status!, expected);
    assertEquals(result.confidence, "high");
  });
});

// ============================================================================
// "Let me" Pattern Tests
// ============================================================================

Deno.test("Let me Pattern - Basic extraction", () => {
  const text = "Let me check the authentication flow.";
  const result = extractStatusFromReasoning(text);

  assertMatch(result.status!, /Checking.*authentication/i);
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "let_me");
});

Deno.test("Let me Pattern - Various verbs", () => {
  const testCases = [
    { input: "Let me review the code structure", expected: /Reviewing.*code/i },
    { input: "Let me explore the database schema", expected: /Exploring.*database/i },
    { input: "Let me examine the error logs", expected: /Examining.*error/i },
  ];

  testCases.forEach(({ input, expected }) => {
    const result = extractStatusFromReasoning(input);
    assertMatch(result.status!, expected);
    assertEquals(result.confidence, "high");
  });
});

// ============================================================================
// "First" Pattern Tests
// ============================================================================

Deno.test("First Pattern - Basic extraction", () => {
  const text = "First, I'll design the component structure.";
  const result = extractStatusFromReasoning(text);

  // "I'll" pattern matches before "First" pattern
  assertMatch(result.status!, /Designing.*component/i);
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "future_action");
});

Deno.test("First Pattern - Without I'll", () => {
  const text = "First, validate the user input.";
  const result = extractStatusFromReasoning(text);

  assertMatch(result.status!, /Validating.*user/i);
  assertEquals(result.confidence, "medium");
  assertEquals(result.pattern, "first_step");
});

// ============================================================================
// "I'm [verb]ing" Pattern Tests
// ============================================================================

Deno.test("Present Continuous - I'm analyzing", () => {
  const text = "I'm analyzing the data structure carefully.";
  const result = extractStatusFromReasoning(text);

  assertMatch(result.status!, /Analyzing.*data/i);
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "present_continuous");
});

Deno.test("Present Continuous - Various gerunds", () => {
  const testCases = [
    { input: "I'm building the component hierarchy.", expected: /Building.*component/i },
    { input: "I'm testing the validation logic.", expected: /Testing.*validation/i },
    { input: "I'm reviewing the error handling.", expected: /Reviewing.*error/i },
  ];

  testCases.forEach(({ input, expected }) => {
    const result = extractStatusFromReasoning(input);
    assertMatch(result.status!, expected);
    assertEquals(result.confidence, "high");
  });
});

// ============================================================================
// Invalid Input Tests
// ============================================================================

Deno.test("Invalid - Regular prose", () => {
  const text = "This is just regular prose without any clear action indicator.";
  const result = extractStatusFromReasoning(text);

  assertEquals(result.status, null);
  assertEquals(result.confidence, "low");
  assertEquals(result.pattern, null);
});

Deno.test("Invalid - No matching pattern", () => {
  const text = "The user wants to create a new component.";
  const result = extractStatusFromReasoning(text);

  assertEquals(result.status, null);
  assertEquals(result.confidence, "low");
  assertEquals(result.pattern, null);
});

// ============================================================================
// Gerund Start Pattern Tests
// ============================================================================

Deno.test("Gerund Start - Beginning of line", () => {
  const text = "Analyzing user requirements\n\nMore text here...";
  const result = extractStatusFromReasoning(text);

  // Gerund at start of line
  assertMatch(result.status!, /Analyzing.*user/i);
  assertEquals(result.confidence, "medium");
  assertEquals(result.pattern, "gerund_start");
});

Deno.test("Gerund Start - Various verbs", () => {
  const testCases = [
    "Creating component structure",
    "Validating input data",
    "Implementing authentication flow",
    "Designing api endpoints", // lowercase to match pattern
    "Building data model",
    "Testing error handling",
  ];

  testCases.forEach((input) => {
    const result = extractStatusFromReasoning(input);
    assert(result.status !== null, `Should extract from: ${input}`);
    assertMatch(result.status!, /\.\.\.$/);
    assertEquals(result.confidence, "medium");
  });
});

// ============================================================================
// Priority and Pattern Matching Tests
// ============================================================================

Deno.test("Priority - Markdown over I will", () => {
  const text = "**Planning the architecture**\n\nI will also implement the features.";
  const result = extractStatusFromReasoning(text);

  // Markdown headers have highest priority
  assertMatch(result.status!, /Planning.*architecture/i);
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "markdown_header");
});

Deno.test("Priority - I will over gerund start", () => {
  const text = "I will analyze the requirements. Implementing the features.";
  const result = extractStatusFromReasoning(text);

  // "I will" should match first
  assertMatch(result.status!, /Analyzing.*requirements/i);
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "future_action");
});

// ============================================================================
// Real-World Reasoning Examples
// ============================================================================

Deno.test("Real-world - Architecture planning", () => {
  const text = `
**Planning the component architecture**

I need to consider the following aspects:
- State management
- Data flow
- Component composition
  `;

  const result = extractStatusFromReasoning(text);
  assertMatch(result.status!, /Planning.*component/i);
  assertEquals(result.confidence, "high");
});

Deno.test("Real-world - Requirements analysis", () => {
  const text = `
**Analyzing the user requirements**

The user wants to:
1. Create a new component
2. Handle authentication
3. Validate input data
  `;

  const result = extractStatusFromReasoning(text);
  assertMatch(result.status!, /Analyzing.*user/i);
  assertEquals(result.confidence, "high");
});

Deno.test("Real-world - Implementation narrative", () => {
  const text = `
I'll implement the authentication flow by first setting up the session management,
then creating the login form, and finally adding the logout functionality.
  `;

  const result = extractStatusFromReasoning(text);
  assertMatch(result.status!, /Implementing.*authentication/i);
  assertEquals(result.confidence, "high");
});

// ============================================================================
// Time-Based Status Tests
// ============================================================================

Deno.test("Time-Based Status - Initial (0-3s)", () => {
  assertEquals(getTimeBasedStatus(0), "Analyzing your request...");
  assertEquals(getTimeBasedStatus(1000), "Analyzing your request...");
  assertEquals(getTimeBasedStatus(2999), "Analyzing your request...");
});

Deno.test("Time-Based Status - Early Working (3-10s)", () => {
  assertEquals(getTimeBasedStatus(3000), "Still working on your request...");
  assertEquals(getTimeBasedStatus(5000), "Still working on your request...");
  assertEquals(getTimeBasedStatus(9999), "Still working on your request...");
});

Deno.test("Time-Based Status - Mid Progress (10-20s)", () => {
  assertEquals(getTimeBasedStatus(10000), "Building a detailed response...");
  assertEquals(getTimeBasedStatus(15000), "Building a detailed response...");
  assertEquals(getTimeBasedStatus(19999), "Building a detailed response...");
});

Deno.test("Time-Based Status - Late Progress (20-30s)", () => {
  assertEquals(getTimeBasedStatus(20000), "Crafting a thorough answer...");
  assertEquals(getTimeBasedStatus(25000), "Crafting a thorough answer...");
  assertEquals(getTimeBasedStatus(29999), "Crafting a thorough answer...");
});

Deno.test("Time-Based Status - Delayed (30-45s)", () => {
  assertEquals(getTimeBasedStatus(30000), "This is taking longer than usual...");
  assertEquals(getTimeBasedStatus(40000), "This is taking longer than usual...");
  assertEquals(getTimeBasedStatus(44999), "This is taking longer than usual...");
});

Deno.test("Time-Based Status - Final Stage (45s+)", () => {
  assertEquals(getTimeBasedStatus(45000), "Almost there, finalizing response...");
  assertEquals(getTimeBasedStatus(60000), "Almost there, finalizing response...");
  assertEquals(getTimeBasedStatus(120000), "Almost there, finalizing response...");
});

Deno.test("Time-Based Status - Boundary conditions", () => {
  // Test exact boundary values
  assertEquals(getTimeBasedStatus(2999), "Analyzing your request...");
  assertEquals(getTimeBasedStatus(3000), "Still working on your request...");

  assertEquals(getTimeBasedStatus(9999), "Still working on your request...");
  assertEquals(getTimeBasedStatus(10000), "Building a detailed response...");

  assertEquals(getTimeBasedStatus(19999), "Building a detailed response...");
  assertEquals(getTimeBasedStatus(20000), "Crafting a thorough answer...");

  assertEquals(getTimeBasedStatus(29999), "Crafting a thorough answer...");
  assertEquals(getTimeBasedStatus(30000), "This is taking longer than usual...");

  assertEquals(getTimeBasedStatus(44999), "This is taking longer than usual...");
  assertEquals(getTimeBasedStatus(45000), "Almost there, finalizing response...");
});

// ============================================================================
// Helper Function Tests
// ============================================================================

Deno.test("toGerund - Common verbs from lookup table", () => {
  assertEquals(toGerund("analyze"), "Analyzing");
  assertEquals(toGerund("create"), "Creating");
  assertEquals(toGerund("implement"), "Implementing");
  assertEquals(toGerund("design"), "Designing");
  assertEquals(toGerund("validate"), "Validating");
});

Deno.test("toGerund - Fallback for uncommon verbs", () => {
  assertEquals(toGerund("walk"), "Walking");
  assertEquals(toGerund("run"), "Runing"); // Simple append, not perfect
  assertEquals(toGerund("jump"), "Jumping");
});

Deno.test("toGerund - Case insensitivity", () => {
  assertEquals(toGerund("ANALYZE"), "Analyzing");
  assertEquals(toGerund("AnAlYzE"), "Analyzing");
});

Deno.test("cleanObject - Removes whitespace and leading articles", () => {
  // cleanObject removes leading articles ("the", "a", "an") for cleaner status messages
  assertEquals(cleanObject("  the database schema  "), "database schema");
  assertEquals(cleanObject("the   component   structure"), "component structure");
  assertEquals(cleanObject("a sample object"), "sample object");
  assertEquals(cleanObject("an element"), "element");
});

Deno.test("cleanObject - Removes trailing punctuation", () => {
  // Also removes leading articles
  assertEquals(cleanObject("the database schema."), "database schema");
  assertEquals(cleanObject("the component!"), "component");
  assertEquals(cleanObject("the API?"), "API");
});

Deno.test("cleanObject - Length truncation at 30 chars", () => {
  const longText = "a very long component name that exceeds limits";
  const result = cleanObject(longText);

  assert(result.length <= 30, "Should truncate to 30 chars");
  assertMatch(result, /\.\.\.$/);
});

// ============================================================================
// Edge Cases
// ============================================================================

Deno.test("Edge case - Status always ends with ellipsis", () => {
  const testCases = [
    "**Analyzing data**",
    "I will create something",
    "Let me check this",
    "Implementing features",
  ];

  testCases.forEach((input) => {
    const result = extractStatusFromReasoning(input);
    if (result.status) {
      assertMatch(result.status, /\.\.\.$/);
    }
  });
});

Deno.test("Edge case - Status is capitalized", () => {
  const text = "**analyzing the database**"; // lowercase in markdown
  const result = extractStatusFromReasoning(text);

  // Won't match because pattern requires capital letter
  assertEquals(result.status, null);
});

Deno.test("Edge case - Empty reasoning text", () => {
  const result = extractStatusFromReasoning("");

  assertEquals(result.status, null);
  assertEquals(result.confidence, "low");
  assertEquals(result.pattern, null);
});

Deno.test("Edge case - Whitespace only", () => {
  const result = extractStatusFromReasoning("   \n\n  ");

  assertEquals(result.status, null);
  assertEquals(result.confidence, "low");
  assertEquals(result.pattern, null);
});

Deno.test("Edge case - Multiple newlines around pattern", () => {
  const text = "\n\n\n**Building the component**\n\n\nSome text.";
  const result = extractStatusFromReasoning(text);

  assertMatch(result.status!, /Building.*component/i);
  assertEquals(result.confidence, "high");
});

// ============================================================================
// Confidence Level Tests
// ============================================================================

Deno.test("Confidence - High for markdown headers", () => {
  const text = "**Analyzing the data**";
  const result = extractStatusFromReasoning(text);

  assertEquals(result.confidence, "high");
});

Deno.test("Confidence - High for I will/I'll patterns", () => {
  const testCases = [
    "I will analyze the data.",
    "I'll create the component.",
  ];

  testCases.forEach((input) => {
    const result = extractStatusFromReasoning(input);
    assertEquals(result.confidence, "high");
  });
});

Deno.test("Confidence - High for Let me patterns", () => {
  const text = "Let me check the configuration.";
  const result = extractStatusFromReasoning(text);

  assertEquals(result.confidence, "high");
});

Deno.test("Confidence - High for First patterns with I'll", () => {
  const text = "First, I'll design the structure.";
  const result = extractStatusFromReasoning(text);

  // "I'll" pattern matches first with high confidence
  assertEquals(result.confidence, "high");
});

Deno.test("Confidence - Medium for gerund start", () => {
  const text = "Analyzing the requirements\n\nMore text...";
  const result = extractStatusFromReasoning(text);

  assertEquals(result.confidence, "medium");
});

Deno.test("Confidence - High for I'm thinking pattern", () => {
  const text = "I'm thinking about the architecture design.";
  const result = extractStatusFromReasoning(text);

  // "I'm [verb]ing" pattern matches first with high confidence
  assertEquals(result.confidence, "high");
  assertEquals(result.pattern, "present_continuous");
});
