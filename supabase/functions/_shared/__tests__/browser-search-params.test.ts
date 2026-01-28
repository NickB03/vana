/**
 * Unit Tests for browser.search Parameter Validation
 *
 * Tests the maxResults and searchDepth parameter validation logic
 * for the browser.search tool in tool-executor.ts.
 *
 * These tests verify:
 * - maxResults: defaults, clamping to 1-10 range, decimal rounding, NaN/non-numeric handling
 * - searchDepth: defaults, valid values, invalid value handling
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  validateMaxResults,
  validateSearchDepth,
} from "../browser-search-params.ts";

// ============================================================================
// SECTION 1: maxResults Validation
// ============================================================================

Deno.test("validateMaxResults - should default to 5 when not provided", () => {
  assertEquals(validateMaxResults(undefined), 5);
});

Deno.test("validateMaxResults - should default to 5 when null", () => {
  assertEquals(validateMaxResults(null as unknown as number), 5);
});

Deno.test("validateMaxResults - should clamp values below 1 to 1", () => {
  assertEquals(validateMaxResults(0), 1);
  assertEquals(validateMaxResults(-1), 1);
  assertEquals(validateMaxResults(-100), 1);
  assertEquals(validateMaxResults(-0.5), 1);
});

Deno.test("validateMaxResults - should clamp values above 10 to 10", () => {
  assertEquals(validateMaxResults(11), 10);
  assertEquals(validateMaxResults(100), 10);
  assertEquals(validateMaxResults(999), 10);
  assertEquals(validateMaxResults(10.5), 10);
});

Deno.test("validateMaxResults - should round decimal values", () => {
  assertEquals(validateMaxResults(3.7), 4);
  assertEquals(validateMaxResults(3.2), 3);
  assertEquals(validateMaxResults(5.5), 6); // Math.round rounds .5 up
  assertEquals(validateMaxResults(2.49), 2);
  assertEquals(validateMaxResults(7.9), 8);
});

Deno.test("validateMaxResults - should handle NaN gracefully (use default)", () => {
  assertEquals(validateMaxResults(NaN), 5);
  assertEquals(validateMaxResults(Number.NaN), 5);
});

Deno.test("validateMaxResults - should handle non-numeric values (use default)", () => {
  assertEquals(validateMaxResults("5" as unknown as number), 5);
  assertEquals(validateMaxResults("abc" as unknown as number), 5);
  assertEquals(validateMaxResults({} as unknown as number), 5);
  assertEquals(validateMaxResults([] as unknown as number), 5);
  assertEquals(validateMaxResults(true as unknown as number), 5);
  assertEquals(validateMaxResults(false as unknown as number), 5);
});

Deno.test("validateMaxResults - should accept valid values within range", () => {
  assertEquals(validateMaxResults(1), 1);
  assertEquals(validateMaxResults(5), 5);
  assertEquals(validateMaxResults(10), 10);
  assertEquals(validateMaxResults(3), 3);
  assertEquals(validateMaxResults(8), 8);
});

Deno.test("validateMaxResults - should handle Infinity", () => {
  assertEquals(validateMaxResults(Infinity), 10);
  assertEquals(validateMaxResults(-Infinity), 1);
});

// ============================================================================
// SECTION 2: searchDepth Validation
// ============================================================================

Deno.test("validateSearchDepth - should default to 'basic' when not provided", () => {
  assertEquals(validateSearchDepth(undefined), "basic");
});

Deno.test("validateSearchDepth - should default to 'basic' when null", () => {
  assertEquals(validateSearchDepth(null as unknown as string), "basic");
});

Deno.test("validateSearchDepth - should accept 'advanced' as valid value", () => {
  assertEquals(validateSearchDepth("advanced"), "advanced");
});

Deno.test("validateSearchDepth - should accept 'basic' as valid value", () => {
  assertEquals(validateSearchDepth("basic"), "basic");
});

Deno.test("validateSearchDepth - should default to 'basic' for invalid string values", () => {
  assertEquals(validateSearchDepth("deep"), "basic");
  assertEquals(validateSearchDepth("Advanced"), "basic"); // Case sensitive
  assertEquals(validateSearchDepth("ADVANCED"), "basic");
  assertEquals(validateSearchDepth("BASIC"), "basic");
  assertEquals(validateSearchDepth(""), "basic");
  assertEquals(validateSearchDepth(" "), "basic");
  assertEquals(validateSearchDepth("advanced "), "basic"); // Trailing space
  assertEquals(validateSearchDepth(" advanced"), "basic"); // Leading space
});

Deno.test("validateSearchDepth - should default to 'basic' for non-string values", () => {
  assertEquals(validateSearchDepth(123 as unknown as string), "basic");
  assertEquals(validateSearchDepth(true as unknown as string), "basic");
  assertEquals(validateSearchDepth(false as unknown as string), "basic");
  assertEquals(validateSearchDepth({} as unknown as string), "basic");
  assertEquals(validateSearchDepth([] as unknown as string), "basic");
  assertEquals(validateSearchDepth(0 as unknown as string), "basic");
  assertEquals(validateSearchDepth(NaN as unknown as string), "basic");
});

// ============================================================================
// SECTION 3: Edge Cases and Combined Validation
// ============================================================================

Deno.test("validateMaxResults - boundary values", () => {
  // Just inside valid range
  assertEquals(validateMaxResults(1.0), 1);
  assertEquals(validateMaxResults(10.0), 10);

  // Just outside valid range (before clamping)
  assertEquals(validateMaxResults(0.4), 1); // rounds to 0, clamps to 1
  assertEquals(validateMaxResults(0.6), 1); // rounds to 1
  assertEquals(validateMaxResults(10.4), 10); // rounds to 10
  assertEquals(validateMaxResults(10.6), 10); // rounds to 11, clamps to 10
});

Deno.test("validateMaxResults - floating point precision", () => {
  // Verify Math.round handles typical floating point issues
  assertEquals(validateMaxResults(5.000000001), 5);
  assertEquals(validateMaxResults(4.999999999), 5);
});

Deno.test("validateSearchDepth - exact string matching", () => {
  // Only exact lowercase strings should match
  assertEquals(validateSearchDepth("advanced"), "advanced");
  assertEquals(validateSearchDepth("basic"), "basic");

  // Any variation should fall back to basic
  assertEquals(validateSearchDepth("Advanced"), "basic");
  assertEquals(validateSearchDepth("Basic"), "basic");
  assertEquals(validateSearchDepth("ADVANCED"), "basic");
  assertEquals(validateSearchDepth("BASIC"), "basic");
});
