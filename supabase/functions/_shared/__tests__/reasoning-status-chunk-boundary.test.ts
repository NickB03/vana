/**
 * Tests for reasoning status extraction across chunk boundaries
 *
 * Validates that status extraction works correctly when reasoning phrases
 * are split across multiple stream chunks.
 */

import { assertEquals } from 'jsr:@std/assert@1';
import { extractStatusFromReasoning } from '../reasoning-status-extractor.ts';

Deno.test('Chunk Boundary - Full phrase in accumulated text', () => {
  // Simulate accumulating text across chunks
  let accumulated = '';

  // First chunk: partial markdown header
  accumulated += '**Analy';
  const result1 = extractStatusFromReasoning(accumulated);
  assertEquals(result1.status, null, 'Should not match partial phrase');

  // Second chunk: completes the header
  accumulated += 'zing the schema**';
  const result2 = extractStatusFromReasoning(accumulated);
  assertEquals(result2.status, 'Analyzing schema...');
  assertEquals(result2.confidence, 'high');
  assertEquals(result2.pattern, 'markdown_header');
});

Deno.test('Chunk Boundary - Pattern split across three chunks', () => {
  let accumulated = '';

  // Chunk 1: "I will "
  accumulated += 'I will ';
  assertEquals(extractStatusFromReasoning(accumulated).status, null);

  // Chunk 2: "create the "
  // Note: This might match but produce awkward output like "Creating the..."
  // which is acceptable for partial streaming text
  accumulated += 'create the ';

  // Chunk 3: "component."
  accumulated += 'component.';
  const result = extractStatusFromReasoning(accumulated);
  assertEquals(result.status, 'Creating component...');
  assertEquals(result.confidence, 'high');
});

Deno.test('Chunk Boundary - Recent text window (500 chars)', () => {
  // Simulate long accumulated text (> 500 chars)
  const longPrefix = 'x'.repeat(600); // 600 chars of noise
  const accumulated = longPrefix + ' **Building the interface**';

  // Extract from last 500 chars (should still capture the pattern)
  const recentText = accumulated.slice(-500);
  const result = extractStatusFromReasoning(recentText);
  assertEquals(result.status, 'Building interface...');
  assertEquals(result.confidence, 'high');
});

Deno.test('CleanObject - Minimum length check', () => {
  // Test that cleanObject filters out very short objects after article removal
  const accumulated = '**Analyzing a thing**';
  const result = extractStatusFromReasoning(accumulated);

  // "a thing" → remove "a " → "thing" (5 chars, should pass)
  assertEquals(result.status, 'Analyzing thing...');
  assertEquals(result.confidence, 'high');
});

Deno.test('CleanObject - Handles normal length objects', () => {
  const accumulated = '**Analyzing the database schema**';
  const result = extractStatusFromReasoning(accumulated);
  assertEquals(result.status, 'Analyzing database schema...');
});

Deno.test('ExtractStatus - Handles short verbs correctly', () => {
  // Even short verbs should work if the object is substantial
  const accumulated = 'I will do the analysis.';
  const result = extractStatusFromReasoning(accumulated);

  // "do" → "Doing", "the analysis" → "analysis"
  assertEquals(result.status, 'Doing analysis...');
  assertEquals(result.confidence, 'high');
});

Deno.test('Chunk Boundary - Multiple patterns in accumulated text', () => {
  let accumulated = '';

  // Chunk 1: First pattern (should match)
  accumulated += '**Analyzing the request** ';
  const result1 = extractStatusFromReasoning(accumulated);
  assertEquals(result1.status, 'Analyzing request...');

  // Chunk 2: Add more text with second pattern
  accumulated += 'I will create the component.';
  const result2 = extractStatusFromReasoning(accumulated);

  // Should still match first pattern (markdown_header has higher priority)
  assertEquals(result2.status, 'Analyzing request...');
  assertEquals(result2.pattern, 'markdown_header');
});
