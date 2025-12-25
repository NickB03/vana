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
  assertExists(MODEL_BUDGETS[MODELS.GLM_4_6]);
});

Deno.test('MODEL_BUDGETS - GEMINI_FLASH has correct configuration', () => {
  const budget = MODEL_BUDGETS[MODELS.GEMINI_FLASH];
  assertEquals(budget.model, MODELS.GEMINI_FLASH);
  assertEquals(budget.maxContextTokens, 128000);
  assertEquals(budget.reservedForResponse, 4096);
  assertEquals(budget.safetyMargin, 0.1);
});

Deno.test('MODEL_BUDGETS - GLM_4_6 has correct configuration', () => {
  const budget = MODEL_BUDGETS[MODELS.GLM_4_6];
  assertEquals(budget.model, MODELS.GLM_4_6);
  assertEquals(budget.maxContextTokens, 128000);
  assertEquals(budget.reservedForResponse, 8000);
  assertEquals(budget.safetyMargin, 0.15);
});

Deno.test('calculateContextBudget - calculates available tokens for GEMINI_FLASH', () => {
  const available = calculateContextBudget(MODELS.GEMINI_FLASH);
  // 128000 - 4096 - (128000 * 0.1) = 128000 - 4096 - 12800 = 111104
  assertEquals(available, 111104);
});

Deno.test('calculateContextBudget - calculates available tokens for GLM_4_6', () => {
  const available = calculateContextBudget(MODELS.GLM_4_6);
  // 128000 - 8000 - (128000 * 0.15) = 128000 - 8000 - 19200 = 100800
  assertEquals(available, 100800);
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

// Token counting tests (using inline logic from deprecated countMessageTokens)
Deno.test('estimates tokens for message with content only', () => {
  const message: Message = {
    role: 'user',
    content: 'Hello world',
  };
  // Inline the logic from deprecated countMessageTokens()
  const contentTokens = countTokens(message.content);
  const reasoningTokens = message.reasoning_steps
    ? countTokens(message.reasoning_steps)
    : 0;
  const tokens = contentTokens + reasoningTokens + 10;

  // "Hello world" = 2 words * 1.3 = 2.6 -> ceil = 3, plus 10 overhead = 13
  assertEquals(tokens, 13);
});

Deno.test('estimates tokens for message including reasoning_steps', () => {
  const message: Message = {
    role: 'assistant',
    content: 'Hello',
    reasoning_steps: 'Let me think',
  };
  // Inline the logic from deprecated countMessageTokens()
  const contentTokens = countTokens(message.content);
  const reasoningTokens = message.reasoning_steps
    ? countTokens(message.reasoning_steps)
    : 0;
  const tokens = contentTokens + reasoningTokens + 10;

  // "Hello" = 1 word * 1.3 = 1.3 -> ceil = 2
  // "Let me think" = 3 words * 1.3 = 3.9 -> ceil = 4
  // Total = 2 + 4 + 10 = 16
  assertEquals(tokens, 16);
});

Deno.test('sums tokens for multiple messages', () => {
  const messages: Message[] = [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi there' },
  ];
  // Inline the logic from deprecated countTotalTokens()
  const total = messages.reduce((sum, msg) => {
    const contentTokens = countTokens(msg.content);
    const reasoningTokens = msg.reasoning_steps
      ? countTokens(msg.reasoning_steps)
      : 0;
    return sum + contentTokens + reasoningTokens + 10;
  }, 0);

  // Message 1: 1 word * 1.3 = 1.3 -> ceil = 2, plus 10 = 12
  // Message 2: 2 words * 1.3 = 2.6 -> ceil = 3, plus 10 = 13
  // Total = 12 + 13 = 25
  assertEquals(total, 25);
});
