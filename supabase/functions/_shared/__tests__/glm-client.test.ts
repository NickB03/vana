import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { parseStatusMarker } from "../glm-client.ts";

/**
 * Test Suite for GLM Client - Status Marker Parsing
 *
 * Coverage:
 * - ✅ Single status marker extraction
 * - ✅ Multiple status markers (returns last)
 * - ✅ Incomplete markers (no closing bracket)
 * - ✅ No markers present
 * - ✅ Whitespace handling
 * - ✅ Edge cases
 */

// ============================================================================
// SECTION 1: Basic Status Marker Detection
// ============================================================================

Deno.test("parseStatusMarker - extracts single status marker", () => {
  const text = "[STATUS: analyzing requirements]";
  const result = parseStatusMarker(text);
  assertEquals(result, "analyzing requirements");
});

Deno.test("parseStatusMarker - extracts status from reasoning text", () => {
  const text = `
    First, I need to understand the problem.
    [STATUS: analyzing code structure]
    Looking at the components...
  `;
  const result = parseStatusMarker(text);
  assertEquals(result, "analyzing code structure");
});

Deno.test("parseStatusMarker - handles whitespace variations", () => {
  const text1 = "[STATUS:   lots  of   spaces  ]";
  assertEquals(parseStatusMarker(text1), "lots  of   spaces");

  const text2 = "[STATUS:no-spaces]";
  assertEquals(parseStatusMarker(text2), "no-spaces");

  const text3 = "[STATUS:\t\ttabs\t\t]";
  assertEquals(parseStatusMarker(text3), "tabs");
});

// ============================================================================
// SECTION 2: Multiple Markers (Last One Wins)
// ============================================================================

Deno.test("parseStatusMarker - returns last marker when multiple present", () => {
  const text = `
    [STATUS: starting analysis]
    Some thinking...
    [STATUS: reviewing code]
    More thinking...
    [STATUS: generating solution]
  `;
  const result = parseStatusMarker(text);
  assertEquals(result, "generating solution");
});

Deno.test("parseStatusMarker - handles consecutive markers", () => {
  const text = "[STATUS: first][STATUS: second][STATUS: third]";
  const result = parseStatusMarker(text);
  assertEquals(result, "third");
});

// ============================================================================
// SECTION 3: Edge Cases - Incomplete/Invalid Markers
// ============================================================================

Deno.test("parseStatusMarker - returns null for incomplete marker", () => {
  const text1 = "[STATUS: incomplete";
  assertEquals(parseStatusMarker(text1), null);

  const text2 = "[STATUS:";
  assertEquals(parseStatusMarker(text2), null);

  const text3 = "thinking... [STATUS: partial marker without";
  assertEquals(parseStatusMarker(text3), null);
});

Deno.test("parseStatusMarker - returns null when no marker present", () => {
  const text = "This is just regular reasoning text without any markers.";
  assertEquals(parseStatusMarker(text), null);
});

Deno.test("parseStatusMarker - returns null for empty string", () => {
  assertEquals(parseStatusMarker(""), null);
});

Deno.test("parseStatusMarker - ignores partial marker at end", () => {
  const text = "[STATUS: complete marker] some text [STATUS: incomplete";
  const result = parseStatusMarker(text);
  // Should return the complete marker, ignore the incomplete one
  assertEquals(result, "complete marker");
});

// ============================================================================
// SECTION 4: Real-World GLM Scenarios
// ============================================================================

Deno.test("parseStatusMarker - handles typical GLM reasoning flow", () => {
  // Simulating accumulated reasoning text during streaming
  let accumulated = "";

  // First chunk
  accumulated += "I need to analyze this request. ";
  assertEquals(parseStatusMarker(accumulated), null);

  // Second chunk - status appears
  accumulated += "[STATUS: analyzing requirements] ";
  assertEquals(parseStatusMarker(accumulated), "analyzing requirements");

  // Third chunk - more thinking
  accumulated += "The user wants a React component. ";
  assertEquals(parseStatusMarker(accumulated), "analyzing requirements");

  // Fourth chunk - new status
  accumulated += "[STATUS: designing component structure] ";
  assertEquals(parseStatusMarker(accumulated), "designing component structure");

  // Fifth chunk - final status
  accumulated += "Now implementing... [STATUS: writing code]";
  assertEquals(parseStatusMarker(accumulated), "writing code");
});

Deno.test("parseStatusMarker - handles multi-line status text", () => {
  const text = `
    [STATUS: analyzing the user's requirements and determining the best approach]
  `;
  const result = parseStatusMarker(text);
  assertEquals(result, "analyzing the user's requirements and determining the best approach");
});

Deno.test("parseStatusMarker - handles special characters in status", () => {
  const text = "[STATUS: checking UI/UX patterns & design]";
  const result = parseStatusMarker(text);
  assertEquals(result, "checking UI/UX patterns & design");
});

// ============================================================================
// SECTION 5: Deduplication Scenario Testing
// ============================================================================

Deno.test("parseStatusMarker - supports deduplication pattern", () => {
  // This tests the pattern used in generate-artifact where we track
  // lastEmittedStatus to avoid duplicate SSE events

  let lastEmitted: string | null = null;
  const chunks = [
    "Starting to think... ",
    "[STATUS: analyzing] ",
    "More analysis... ",
    "Still analyzing... ",
    "[STATUS: planning] ",
    "Creating plan... ",
  ];

  let accumulated = "";
  const emittedStatuses: string[] = [];

  for (const chunk of chunks) {
    accumulated += chunk;
    const currentStatus = parseStatusMarker(accumulated);

    if (currentStatus && currentStatus !== lastEmitted) {
      emittedStatuses.push(currentStatus);
      lastEmitted = currentStatus;
    }
  }

  // Should have emitted exactly 2 unique statuses
  assertEquals(emittedStatuses.length, 2);
  assertEquals(emittedStatuses[0], "analyzing");
  assertEquals(emittedStatuses[1], "planning");
});
