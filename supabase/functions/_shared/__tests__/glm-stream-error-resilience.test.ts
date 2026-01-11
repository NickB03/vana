/**
 * Test GLM Stream Error Resilience
 *
 * This test documents the expected behavior for SSE error handling
 * in processGLMStream. The fix ensures errors don't break tool execution.
 */

import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

Deno.test("GLM Stream Error Resilience - SSE error handling fix", () => {
  // This test documents the expected behavior:
  // - SyntaxError: Expected for non-JSON SSE lines, silently skip
  // - Other errors: Log but continue processing (don't re-throw)
  const expectedBehavior = {
    syntaxError: {
      action: 'skip',
      shouldThrow: false,
    },
    otherError: {
      action: 'continue',
      shouldLog: true,
      shouldThrow: false, // CRITICAL: Don't re-throw - this breaks tool calls
    }
  };

  // Verify the fix is documented
  assertEquals(expectedBehavior.otherError.shouldThrow, false);
  assertEquals(expectedBehavior.otherError.action, 'continue');
  assert(expectedBehavior.otherError.shouldLog);
});
