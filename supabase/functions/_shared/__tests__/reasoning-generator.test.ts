import { assertEquals, assertExists, assertRejects } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  generateStructuredReasoning,
  validateReasoningSteps,
  createFallbackReasoning,
  type StructuredReasoning,
  type ReasoningStep,
} from "../reasoning-generator.ts";

/**
 * Test Suite for Reasoning Generator
 *
 * Coverage:
 * - ✅ generateStructuredReasoning() with mocked API calls
 * - ✅ validateReasoningSteps() comprehensive validation
 * - ✅ createFallbackReasoning() graceful degradation
 * - ✅ XSS protection and dangerous pattern detection
 * - ✅ Timeout handling and error scenarios
 * - ✅ JSON parsing with markdown code blocks
 */

// Mock environment variable
Deno.env.set('OPENROUTER_GEMINI_FLASH_KEY', 'test-key-12345');

// ============================================================================
// SECTION 1: validateReasoningSteps() Tests
// ============================================================================

Deno.test("validateReasoningSteps - accepts valid reasoning structure", () => {
  const validReasoning: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Understanding the problem",
        icon: "search",
        items: [
          "Analyzing user requirements",
          "Reviewing existing solutions",
        ],
      },
      {
        phase: "analysis",
        title: "Identifying patterns",
        icon: "lightbulb",
        items: ["Pattern 1 detected", "Pattern 2 found"],
      },
    ],
    summary: "Comprehensive analysis complete",
  };

  // Should not throw
  validateReasoningSteps(validReasoning);
});

Deno.test("validateReasoningSteps - rejects null or undefined input", () => {
  assertRejects(
    async () => {
      validateReasoningSteps(null as any);
    },
    Error,
    "must be an object"
  );

  assertRejects(
    async () => {
      validateReasoningSteps(undefined as any);
    },
    Error,
    "must be an object"
  );
});

Deno.test("validateReasoningSteps - rejects non-array steps", () => {
  const invalidReasoning = {
    steps: "not an array",
  };

  assertRejects(
    async () => {
      validateReasoningSteps(invalidReasoning as any);
    },
    Error,
    "steps must be an array"
  );
});

Deno.test("validateReasoningSteps - rejects empty steps array", () => {
  const emptySteps: StructuredReasoning = {
    steps: [],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(emptySteps);
    },
    Error,
    "steps array cannot be empty"
  );
});

Deno.test("validateReasoningSteps - rejects more than 10 steps", () => {
  const tooManySteps: StructuredReasoning = {
    steps: Array.from({ length: 11 }, (_, i) => ({
      phase: "research" as const,
      title: `Step ${i + 1} title text`,
      icon: "search" as const,
      items: ["Item 1"],
    })),
  };

  assertRejects(
    async () => {
      validateReasoningSteps(tooManySteps);
    },
    Error,
    "maximum 10 steps allowed"
  );
});

Deno.test("validateReasoningSteps - rejects invalid phase values", () => {
  const invalidPhase: StructuredReasoning = {
    steps: [
      {
        phase: "invalid_phase" as any,
        title: "Test step with invalid phase",
        items: ["Item 1"],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(invalidPhase);
    },
    Error,
    "Invalid phase"
  );
});

Deno.test("validateReasoningSteps - accepts all valid phases", () => {
  const allPhases: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Research phase test title",
        items: ["Item"],
      },
      {
        phase: "analysis",
        title: "Analysis phase test title",
        items: ["Item"],
      },
      {
        phase: "solution",
        title: "Solution phase test title",
        items: ["Item"],
      },
      {
        phase: "custom",
        title: "Custom phase test title here",
        items: ["Item"],
      },
    ],
  };

  // Should not throw
  validateReasoningSteps(allPhases);
});

Deno.test("validateReasoningSteps - rejects invalid icon values", () => {
  const invalidIcon: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Test step with invalid icon value",
        icon: "invalid_icon" as any,
        items: ["Item 1"],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(invalidIcon);
    },
    Error,
    "Invalid icon"
  );
});

Deno.test("validateReasoningSteps - accepts all valid icons", () => {
  const allIcons: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Search icon test step title",
        icon: "search",
        items: ["Item"],
      },
      {
        phase: "analysis",
        title: "Lightbulb icon test title",
        icon: "lightbulb",
        items: ["Item"],
      },
      {
        phase: "solution",
        title: "Target icon test step title",
        icon: "target",
        items: ["Item"],
      },
      {
        phase: "custom",
        title: "Sparkles icon test title",
        icon: "sparkles",
        items: ["Item"],
      },
    ],
  };

  // Should not throw
  validateReasoningSteps(allIcons);
});

Deno.test("validateReasoningSteps - rejects title too short (< 10 chars)", () => {
  const shortTitle: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Short",
        items: ["Item 1"],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(shortTitle);
    },
    Error,
    "Title must be 10-500 characters"
  );
});

Deno.test("validateReasoningSteps - rejects title too long (> 500 chars)", () => {
  const longTitle: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "A".repeat(501),
        items: ["Item 1"],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(longTitle);
    },
    Error,
    "Title must be 10-500 characters"
  );
});

Deno.test("validateReasoningSteps - rejects empty items array", () => {
  const emptyItems: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Step with empty items array",
        items: [],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(emptyItems);
    },
    Error,
    "Items array cannot be empty"
  );
});

Deno.test("validateReasoningSteps - rejects more than 20 items per step", () => {
  const tooManyItems: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Step with too many items",
        items: Array.from({ length: 21 }, (_, i) => `Item ${i + 1}`),
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(tooManyItems);
    },
    Error,
    "Maximum 20 items per step"
  );
});

Deno.test("validateReasoningSteps - rejects non-string items", () => {
  const nonStringItem: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Step with non-string item",
        items: [123 as any, "Valid item"],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(nonStringItem);
    },
    Error,
    "Must be a string"
  );
});

Deno.test("validateReasoningSteps - rejects items exceeding 2000 chars", () => {
  const longItem: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Step with very long item",
        items: ["A".repeat(2001)],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(longItem);
    },
    Error,
    "Exceeds 2000 characters"
  );
});

// ============================================================================
// SECTION 2: XSS Protection Tests
// ============================================================================

Deno.test("validateReasoningSteps - blocks <script> tags in title", () => {
  const xssTitle: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: 'Malicious title<script>alert("XSS")</script>',
        items: ["Safe item"],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(xssTitle);
    },
    Error,
    "potentially dangerous content"
  );
});

Deno.test("validateReasoningSteps - blocks <iframe> tags in title", () => {
  const iframeTitle: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: 'Title with <iframe src="evil.com"></iframe>',
        items: ["Safe item"],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(iframeTitle);
    },
    Error,
    "potentially dangerous content"
  );
});

Deno.test("validateReasoningSteps - blocks javascript: protocol in title", () => {
  const jsProtocol: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: 'Title with javascript:alert("XSS") protocol',
        items: ["Safe item"],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(jsProtocol);
    },
    Error,
    "potentially dangerous content"
  );
});

Deno.test("validateReasoningSteps - blocks onerror handlers in items", () => {
  const onerrorItem: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Safe title for this test step",
        items: ['<img src=x onerror="alert(1)">'],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(onerrorItem);
    },
    Error,
    "potentially dangerous content"
  );
});

Deno.test("validateReasoningSteps - blocks onload handlers in items", () => {
  const onloadItem: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Safe title for onload test",
        items: ['<body onload="malicious()">'],
      },
    ],
  };

  assertRejects(
    async () => {
      validateReasoningSteps(onloadItem);
    },
    Error,
    "potentially dangerous content"
  );
});

Deno.test("validateReasoningSteps - blocks <embed> tags in summary", () => {
  const embedSummary: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Safe step title here for testing",
        items: ["Safe item"],
      },
    ],
    summary: '<embed src="malicious.swf">',
  };

  assertRejects(
    async () => {
      validateReasoningSteps(embedSummary);
    },
    Error,
    "potentially dangerous content"
  );
});

Deno.test("validateReasoningSteps - blocks <object> tags in summary", () => {
  const objectSummary: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Safe title for object tag test",
        items: ["Safe item"],
      },
    ],
    summary: '<object data="evil.pdf">',
  };

  assertRejects(
    async () => {
      validateReasoningSteps(objectSummary);
    },
    Error,
    "potentially dangerous content"
  );
});

Deno.test("validateReasoningSteps - allows safe HTML entities", () => {
  const safeHtml: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Title with &lt;safe&gt; entities",
        items: ["Item with &amp; &lt; &gt; &quot;"],
      },
    ],
    summary: "Summary with &copy; 2025",
  };

  // Should not throw
  validateReasoningSteps(safeHtml);
});

// ============================================================================
// SECTION 3: Summary Validation Tests
// ============================================================================

Deno.test("validateReasoningSteps - accepts valid summary", () => {
  const withSummary: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Test step with summary present",
        items: ["Item 1"],
      },
    ],
    summary: "This is a valid summary under 1000 characters",
  };

  // Should not throw
  validateReasoningSteps(withSummary);
});

Deno.test("validateReasoningSteps - accepts undefined summary", () => {
  const noSummary: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Test step without summary",
        items: ["Item 1"],
      },
    ],
  };

  // Should not throw
  validateReasoningSteps(noSummary);
});

Deno.test("validateReasoningSteps - rejects non-string summary", () => {
  const nonStringSummary: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Test step for summary validation",
        items: ["Item 1"],
      },
    ],
    summary: 123 as any,
  };

  assertRejects(
    async () => {
      validateReasoningSteps(nonStringSummary);
    },
    Error,
    "Summary must be a string"
  );
});

Deno.test("validateReasoningSteps - rejects summary exceeding 1000 chars", () => {
  const longSummary: StructuredReasoning = {
    steps: [
      {
        phase: "research",
        title: "Test step with long summary",
        items: ["Item 1"],
      },
    ],
    summary: "A".repeat(1001),
  };

  assertRejects(
    async () => {
      validateReasoningSteps(longSummary);
    },
    Error,
    "Summary exceeds 1000 characters"
  );
});

// ============================================================================
// SECTION 4: createFallbackReasoning() Tests
// ============================================================================

Deno.test("createFallbackReasoning - returns valid fallback structure", () => {
  const fallback = createFallbackReasoning("API timeout");

  assertExists(fallback);
  assertExists(fallback.steps);
  assertEquals(fallback.steps.length, 1);
  assertEquals(fallback.steps[0].phase, "custom");
  assertEquals(fallback.steps[0].icon, "sparkles");
  assertEquals(fallback.steps[0].title, "Reasoning generation unavailable");
  assertEquals(fallback.steps[0].items.length, 3);
});

Deno.test("createFallbackReasoning - includes error message in items", () => {
  const errorMsg = "Network connection failed";
  const fallback = createFallbackReasoning(errorMsg);

  const errorItem = fallback.steps[0].items.find(item => item.includes(errorMsg));
  assertExists(errorItem);
});

Deno.test("createFallbackReasoning - validates against schema", () => {
  const fallback = createFallbackReasoning("Test error");

  // Should pass validation
  validateReasoningSteps(fallback);
});

Deno.test("createFallbackReasoning - handles long error messages", () => {
  const longError = "A".repeat(500);
  const fallback = createFallbackReasoning(longError);

  // Should still create valid structure
  assertExists(fallback);
  validateReasoningSteps(fallback);
});

// ============================================================================
// SECTION 5: Mock API Tests for generateStructuredReasoning()
// ============================================================================

// Mock fetch for testing
const originalFetch = globalThis.fetch;

function mockFetch(status: number, response: any) {
  globalThis.fetch = async () => {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => response,
      text: async () => JSON.stringify(response),
    } as Response;
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test("generateStructuredReasoning - successful API call", async () => {
  const mockResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            steps: [
              {
                phase: "research",
                title: "Understanding the request context",
                icon: "search",
                items: ["Analyzing user query", "Reviewing context"],
              },
            ],
            summary: "Analysis complete",
          }),
        },
      },
    ],
  };

  mockFetch(200, mockResponse);

  const result = await generateStructuredReasoning(
    "Test user message",
    [],
    { timeout: 5000 }
  );

  assertExists(result);
  assertEquals(result.steps.length, 1);
  assertEquals(result.summary, "Analysis complete");

  restoreFetch();
});

Deno.test("generateStructuredReasoning - handles markdown code blocks", async () => {
  const mockResponse = {
    choices: [
      {
        message: {
          content: '```json\n{"steps":[{"phase":"research","title":"Test step title here","icon":"search","items":["Item 1"]}]}\n```',
        },
      },
    ],
  };

  mockFetch(200, mockResponse);

  const result = await generateStructuredReasoning(
    "Test message",
    []
  );

  assertExists(result);
  assertEquals(result.steps.length, 1);

  restoreFetch();
});

Deno.test("generateStructuredReasoning - handles plain markdown blocks", async () => {
  const mockResponse = {
    choices: [
      {
        message: {
          content: '```\n{"steps":[{"phase":"research","title":"Plain markdown test title","icon":"search","items":["Item 1"]}]}\n```',
        },
      },
    ],
  };

  mockFetch(200, mockResponse);

  const result = await generateStructuredReasoning(
    "Test message",
    []
  );

  assertExists(result);
  assertEquals(result.steps.length, 1);

  restoreFetch();
});

Deno.test("generateStructuredReasoning - API error handling", async () => {
  mockFetch(500, { error: "Internal server error" });

  await assertRejects(
    async () => {
      await generateStructuredReasoning("Test message", []);
    },
    Error,
    "Reasoning generation failed"
  );

  restoreFetch();
});

Deno.test("generateStructuredReasoning - missing content in response", async () => {
  const mockResponse = {
    choices: [
      {
        message: {},
      },
    ],
  };

  mockFetch(200, mockResponse);

  await assertRejects(
    async () => {
      await generateStructuredReasoning("Test message", []);
    },
    Error,
    "No reasoning content in API response"
  );

  restoreFetch();
});

Deno.test("generateStructuredReasoning - respects timeout option", async () => {
  // Mock a slow response
  globalThis.fetch = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    } as Response;
  };

  await assertRejects(
    async () => {
      await generateStructuredReasoning("Test", [], { timeout: 100 });
    },
    Error,
    "timeout"
  );

  restoreFetch();
});

Deno.test("generateStructuredReasoning - validates generated output", async () => {
  // Mock invalid response
  const mockResponse = {
    choices: [
      {
        message: {
          content: JSON.stringify({
            steps: [
              {
                phase: "invalid_phase", // Invalid phase
                title: "Test",
                items: ["Item"],
              },
            ],
          }),
        },
      },
    ],
  };

  mockFetch(200, mockResponse);

  await assertRejects(
    async () => {
      await generateStructuredReasoning("Test message", []);
    },
    Error,
    "Reasoning generation failed"
  );

  restoreFetch();
});

// Run tests
console.log("\n✅ All reasoning-generator tests completed!\n");
