/**
 * Tests for token-counter.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  countTokens,
  calculateContextBudget,
  getMessageTokenCounts,
  getModelBudget,
  MODEL_BUDGETS,
  countMessageTokens,
  countTotalTokens,
  type TokenBudget,
  type Message,
} from '../token-counter.ts';
import { MODELS } from '../config.ts';

Deno.test('countTokens - estimates tokens for simple text', () => {
  const text = 'Hello world';
  const tokens = countTokens(text);
  // "Hello world" = 2 words * 1.3 = 2.6 -> ceil = 3 tokens
  assertEquals(tokens, 3);
});

Deno.test('countTokens - handles empty string', () => {
  assertEquals(countTokens(''), 0);
  assertEquals(countTokens('   '), 0);
});

Deno.test('countTokens - estimates tokens for longer text', () => {
  const text = 'The quick brown fox jumps over the lazy dog';
  const tokens = countTokens(text);
  // 9 words * 1.3 = 11.7 -> ceil = 12 tokens
  assertEquals(tokens, 12);
});

Deno.test('MODEL_BUDGETS - contains expected models', () => {
  assertExists(MODEL_BUDGETS[MODELS.GEMINI_FLASH]);
  assertExists(MODEL_BUDGETS[MODELS.KIMI_K2]);
});

Deno.test('MODEL_BUDGETS - GEMINI_FLASH has correct configuration', () => {
  const budget = MODEL_BUDGETS[MODELS.GEMINI_FLASH];
  assertEquals(budget.model, MODELS.GEMINI_FLASH);
  assertEquals(budget.maxContextTokens, 128000);
  assertEquals(budget.reservedForResponse, 4096);
  assertEquals(budget.safetyMargin, 0.1);
});

Deno.test('MODEL_BUDGETS - KIMI_K2 has correct configuration', () => {
  const budget = MODEL_BUDGETS[MODELS.KIMI_K2];
  assertEquals(budget.model, MODELS.KIMI_K2);
  assertEquals(budget.maxContextTokens, 128000);
  assertEquals(budget.reservedForResponse, 8192);
  assertEquals(budget.safetyMargin, 0.15);
});

Deno.test('calculateContextBudget - calculates available tokens for GEMINI_FLASH', () => {
  const available = calculateContextBudget(MODELS.GEMINI_FLASH);
  // 128000 - 4096 - (128000 * 0.1) = 128000 - 4096 - 12800 = 111104
  assertEquals(available, 111104);
});

Deno.test('calculateContextBudget - calculates available tokens for KIMI_K2', () => {
  const available = calculateContextBudget(MODELS.KIMI_K2);
  // 128000 - 8192 - (128000 * 0.15) = 128000 - 8192 - 19200 = 100608
  assertEquals(available, 100608);
});

Deno.test('calculateContextBudget - throws error for unknown model', () => {
  try {
    calculateContextBudget('unknown-model');
    throw new Error('Should have thrown');
  } catch (error) {
    assertEquals(
      (error as Error).message.includes('Unknown model'),
      true
    );
  }
});

Deno.test('getMessageTokenCounts - calculates tokens for messages', () => {
  const messages = [
    { role: 'user', content: 'Hello!', id: '1', created_at: '2025-01-15' },
    { role: 'assistant', content: 'Hi there!', id: '2', created_at: '2025-01-15' },
  ];

  const counts = getMessageTokenCounts(messages);
  assertEquals(counts.length, 2);
  assertEquals(counts[0].id, '1');
  assertEquals(counts[0].role, 'user');
  assertEquals(counts[0].tokens, 2); // "Hello!" = 1 word * 1.3 = 1.3 -> ceil = 2
  assertEquals(counts[1].id, '2');
  assertEquals(counts[1].role, 'assistant');
  assertEquals(counts[1].tokens, 3); // "Hi there!" = 2 words * 1.3 = 2.6 -> ceil = 3
});

Deno.test('getModelBudget - returns budget for valid model', () => {
  const budget = getModelBudget(MODELS.GEMINI_FLASH);
  assertExists(budget);
  assertEquals(budget?.model, MODELS.GEMINI_FLASH);
});

Deno.test('getModelBudget - returns undefined for invalid model', () => {
  const budget = getModelBudget('invalid-model');
  assertEquals(budget, undefined);
});

// Backward compatibility tests
Deno.test('countMessageTokens - estimates tokens for message with content', () => {
  const message: Message = {
    role: 'user',
    content: 'Hello world',
  };
  const tokens = countMessageTokens(message);
  // "Hello world" = 2 words * 1.3 = 2.6 -> ceil = 3, plus 10 overhead = 13
  assertEquals(tokens, 13);
});

Deno.test('countMessageTokens - includes reasoning_steps', () => {
  const message: Message = {
    role: 'assistant',
    content: 'Hello',
    reasoning_steps: 'Let me think',
  };
  const tokens = countMessageTokens(message);
  // "Hello" = 1 word * 1.3 = 1.3 -> ceil = 2
  // "Let me think" = 3 words * 1.3 = 3.9 -> ceil = 4
  // Total = 2 + 4 + 10 = 16
  assertEquals(tokens, 16);
});

Deno.test('countTotalTokens - sums tokens for multiple messages', () => {
  const messages: Message[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' },
  ];
  const total = countTotalTokens(messages);
  // Message 1: 1 word * 1.3 = 1.3 -> ceil = 2, plus 10 = 12
  // Message 2: 2 words * 1.3 = 2.6 -> ceil = 3, plus 10 = 13
  // Total = 12 + 13 = 25
  assertEquals(total, 25);
});
