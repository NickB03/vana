/**
 * Unit tests for truncation feedback functionality
 * Tests the TruncationResult interface and metadata tracking
 */

import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  truncateArtifactContext,
  truncateUrlExtractContext,
  type TruncationResult,
} from "../../chat/middleware/validation.ts";

const REQUEST_ID = "test-truncation-123";

// Test truncateArtifactContext
Deno.test("truncateArtifactContext - should not truncate content within limit", () => {
  const content = "Short artifact content";
  const result: TruncationResult = truncateArtifactContext(content, REQUEST_ID);

  assertEquals(result.wasTruncated, false);
  assertEquals(result.content, content);
  assertEquals(result.originalLength, undefined);
  assertEquals(result.truncatedLength, undefined);
});

Deno.test("truncateArtifactContext - should truncate oversized content and return metadata", () => {
  const maxChars = 100000; // VALIDATION_LIMITS.MAX_ARTIFACT_CONTEXT_CHARS
  const oversizedContent = "x".repeat(maxChars + 5000);
  const result: TruncationResult = truncateArtifactContext(oversizedContent, REQUEST_ID);

  assertEquals(result.wasTruncated, true);
  assertEquals(result.originalLength, maxChars + 5000);
  assertEquals(result.truncatedLength !== undefined, true);
  assertEquals(result.truncatedLength! <= maxChars, true);
  assertEquals(result.content.includes("[ARTIFACT CONTENT TRUNCATED FOR SIZE]"), true);
});

Deno.test("truncateArtifactContext - should preserve header and footer structure", () => {
  const maxChars = 100000;
  const header = "Header content: ".repeat(30);
  const middle = "x".repeat(maxChars);
  const footer = "Footer content.";
  const oversizedContent = header + middle + footer;

  const result: TruncationResult = truncateArtifactContext(oversizedContent, REQUEST_ID);

  assertEquals(result.wasTruncated, true);
  assertEquals(result.content.startsWith(header.slice(0, 500)), true);
  assertEquals(result.content.includes(footer.slice(-500)), true);
});

// Test truncateUrlExtractContext
Deno.test("truncateUrlExtractContext - should not truncate content within limit", () => {
  const content = "Short URL extract content";
  const result: TruncationResult = truncateUrlExtractContext(content, REQUEST_ID);

  assertEquals(result.wasTruncated, false);
  assertEquals(result.content, content);
  assertEquals(result.originalLength, undefined);
  assertEquals(result.truncatedLength, undefined);
});

Deno.test("truncateUrlExtractContext - should truncate oversized content and return metadata", () => {
  const maxChars = 50000; // VALIDATION_LIMITS.MAX_URL_EXTRACT_CONTEXT_CHARS
  const oversizedContent = "y".repeat(maxChars + 2000);
  const result: TruncationResult = truncateUrlExtractContext(oversizedContent, REQUEST_ID);

  assertEquals(result.wasTruncated, true);
  assertEquals(result.originalLength, maxChars + 2000);
  assertEquals(result.truncatedLength !== undefined, true);
  assertEquals(result.truncatedLength! <= maxChars, true);
  assertEquals(result.content.includes("[URL CONTENT TRUNCATED FOR SIZE]"), true);
});

Deno.test("truncateUrlExtractContext - should find clean break points", () => {
  const maxChars = 50000;
  const content = "Paragraph 1\n\nParagraph 2\n\n" + "x".repeat(maxChars);
  const result: TruncationResult = truncateUrlExtractContext(content, REQUEST_ID);

  assertEquals(result.wasTruncated, true);
  assertEquals(result.content.endsWith("[URL CONTENT TRUNCATED FOR SIZE] ..."), true);
});

// Test empty/null handling
Deno.test("truncateArtifactContext - should handle empty string", () => {
  const result: TruncationResult = truncateArtifactContext("", REQUEST_ID);
  assertEquals(result.wasTruncated, false);
  assertEquals(result.content, "");
});

Deno.test("truncateUrlExtractContext - should handle empty string", () => {
  const result: TruncationResult = truncateUrlExtractContext("", REQUEST_ID);
  assertEquals(result.wasTruncated, false);
  assertEquals(result.content, "");
});

// Test metadata accuracy
Deno.test("truncation metadata - original and truncated lengths are accurate", () => {
  const maxChars = 100000;
  const oversizedContent = "a".repeat(maxChars + 10000);
  const result: TruncationResult = truncateArtifactContext(oversizedContent, REQUEST_ID);

  assertEquals(result.originalLength, maxChars + 10000);
  assertEquals(result.truncatedLength, result.content.length);
  assertEquals(result.originalLength! > result.truncatedLength!, true);
});
