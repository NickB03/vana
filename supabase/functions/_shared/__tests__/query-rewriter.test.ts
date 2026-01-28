/**
 * Tests for Query Rewriter Module
 *
 * Tests the query optimization system that transforms natural language
 * queries into search-optimized queries before sending to Tavily.
 */

import { assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { shouldRewriteQuery } from '../query-rewriter.ts';

// ============================================================================
// SECTION 1: shouldRewriteQuery - Heuristic Tests
// ============================================================================

Deno.test('shouldRewriteQuery - skips URLs', () => {
  const result = shouldRewriteQuery('https://example.com');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query is a URL');
});

Deno.test('shouldRewriteQuery - skips http URLs', () => {
  const result = shouldRewriteQuery('http://example.com/page');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query is a URL');
});

Deno.test('shouldRewriteQuery - skips code blocks', () => {
  const result = shouldRewriteQuery('```console.log()```');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query contains code block');
});

Deno.test('shouldRewriteQuery - skips very short queries (2 words)', () => {
  const result = shouldRewriteQuery('NYC weather');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query too short (≤3 words)');
});

Deno.test('shouldRewriteQuery - skips very short queries (3 words)', () => {
  const result = shouldRewriteQuery('Bitcoin price today');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query too short (≤3 words)');
});

Deno.test('shouldRewriteQuery - rewrites "can you" conversational queries', () => {
  const result = shouldRewriteQuery('Can you tell me about React hooks?');
  assertEquals(result.shouldRewrite, true);
  assertEquals(result.reason, undefined);
});

Deno.test('shouldRewriteQuery - rewrites "please help" conversational queries', () => {
  const result = shouldRewriteQuery('Please help me understand TypeScript');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - rewrites "what is" questions', () => {
  const result = shouldRewriteQuery('What is the latest version of Node.js?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - rewrites "how do" questions', () => {
  const result = shouldRewriteQuery('How do I deploy a Supabase function?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - rewrites long questions with ?', () => {
  const result = shouldRewriteQuery('What features were added in React 19?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - skips non-conversational medium queries', () => {
  const result = shouldRewriteQuery('React 19 new features');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query already appears optimized');
});

Deno.test('shouldRewriteQuery - handles empty string', () => {
  const result = shouldRewriteQuery('');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query too short (≤3 words)');
});

Deno.test('shouldRewriteQuery - handles single word', () => {
  const result = shouldRewriteQuery('weather');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query too short (≤3 words)');
});

Deno.test('shouldRewriteQuery - rewrites "tell me" conversational queries', () => {
  const result = shouldRewriteQuery('Tell me about the history of JavaScript');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - rewrites "show me" conversational queries', () => {
  const result = shouldRewriteQuery('Show me how to use async await');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - rewrites "where is" questions', () => {
  const result = shouldRewriteQuery('Where is the Supabase dashboard located?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - rewrites "when did" questions', () => {
  const result = shouldRewriteQuery('When did React 18 release?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - rewrites "why is" questions', () => {
  const result = shouldRewriteQuery('Why is TypeScript popular for web development?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - handles multiline code blocks', () => {
  const result = shouldRewriteQuery(`
    \`\`\`typescript
    const x = 1;
    \`\`\`
  `);
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query contains code block');
});

Deno.test('shouldRewriteQuery - rewrites "i want" conversational queries', () => {
  const result = shouldRewriteQuery('I want to learn about machine learning basics');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - rewrites "could you" conversational queries', () => {
  const result = shouldRewriteQuery('Could you find information about AI trends?');
  assertEquals(result.shouldRewrite, true);
});

// ============================================================================
// SECTION 2: Edge Cases and Real-World Queries
// ============================================================================

Deno.test('shouldRewriteQuery - handles query with both URL and text', () => {
  // Query starts with https:// so it's detected as URL
  const result = shouldRewriteQuery('https://example.com is my website');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query is a URL');
});

Deno.test('shouldRewriteQuery - handles technical queries with symbols', () => {
  // Short technical query
  const result = shouldRewriteQuery('React @types/react');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query too short (≤3 words)');
});

Deno.test('shouldRewriteQuery - handles queries with numbers', () => {
  const result = shouldRewriteQuery('What happened on January 15 2025?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - handles queries with special characters', () => {
  const result = shouldRewriteQuery('What is C++ vs C# performance?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - skips already-optimized keyword queries', () => {
  const result = shouldRewriteQuery('bitcoin price USD 2025');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query already appears optimized');
});

Deno.test('shouldRewriteQuery - rewrites verbose questions', () => {
  const result = shouldRewriteQuery(
    'Can you please help me understand how React server components work?'
  );
  assertEquals(result.shouldRewrite, true);
});

// ============================================================================
// SECTION 3: Case Sensitivity Tests
// ============================================================================

Deno.test('shouldRewriteQuery - handles uppercase conversational markers', () => {
  const result = shouldRewriteQuery('CAN YOU tell me about Deno?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - handles mixed case URLs', () => {
  const result = shouldRewriteQuery('HTTPS://EXAMPLE.COM');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query is a URL');
});

Deno.test('shouldRewriteQuery - handles uppercase WHAT IS', () => {
  const result = shouldRewriteQuery('WHAT IS the capital of France?');
  assertEquals(result.shouldRewrite, true);
});

// ============================================================================
// SECTION 4: Whitespace and Formatting Tests
// ============================================================================

Deno.test('shouldRewriteQuery - handles leading whitespace', () => {
  const result = shouldRewriteQuery('   Can you help me?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - handles trailing whitespace', () => {
  const result = shouldRewriteQuery('What is TypeScript?   ');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - handles multiple spaces between words', () => {
  const result = shouldRewriteQuery('weather    forecast    today');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query too short (≤3 words)');
});

// ============================================================================
// SECTION 5: Boundary Tests
// ============================================================================

Deno.test('shouldRewriteQuery - exactly 4 words without conversational marker', () => {
  const result = shouldRewriteQuery('React hooks best practices');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query already appears optimized');
});

Deno.test('shouldRewriteQuery - exactly 5 words with question mark', () => {
  const result = shouldRewriteQuery('How does React hooks work?');
  assertEquals(result.shouldRewrite, true);
});

Deno.test('shouldRewriteQuery - exactly 5 words without question mark', () => {
  const result = shouldRewriteQuery('React hooks best practices tutorial');
  assertEquals(result.shouldRewrite, false);
  assertEquals(result.reason, 'Query already appears optimized');
});

Deno.test('shouldRewriteQuery - 4 words with conversational marker', () => {
  const result = shouldRewriteQuery('Can you help me?');
  assertEquals(result.shouldRewrite, true);
});

console.log('\n✅ All query-rewriter tests completed!\n');
