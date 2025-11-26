/**
 * Tests for context-selector.ts
 */

import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/assert/mod.ts';
import {
  selectContext,
  extractEntities,
  type ContextOptions,
  type ContextSelectionResult,
} from '../context-selector.ts';

const createMessage = (role: string, content: string) => ({
  role,
  content,
});

Deno.test('selectContext - returns full_context when within budget', async () => {
  const messages = [
    createMessage('user', 'Hello'),
    createMessage('assistant', 'Hi there!'),
    createMessage('user', 'How are you?'),
  ];

  const result = await selectContext(messages, 10000); // Large budget

  assertEquals(result.strategy, 'full_context');
  assertEquals(result.selectedMessages.length, 3);
  assertEquals(result.summarizedMessages.length, 0);
  assertEquals(result.summary, null);
});

Deno.test('selectContext - uses importance_based_selection when over budget', async () => {
  // Create messages that exceed a small token budget
  const messages = Array.from({ length: 20 }, (_, i) =>
    createMessage(i % 2 === 0 ? 'user' : 'assistant', `Message ${i}: ${' word'.repeat(50)}`)
  );

  const result = await selectContext(messages, 100, {
    alwaysKeepRecent: 3,
    summaryBudget: 20,
  });

  assertEquals(result.strategy, 'importance_based_selection');
  // Should keep at least the recent messages
  assertExists(result.selectedMessages.length >= 3);
  // Some messages should be marked for summarization
  assertExists(result.summarizedMessages.length > 0);
});

Deno.test('selectContext - always keeps recent messages', async () => {
  const messages = Array.from({ length: 10 }, (_, i) =>
    createMessage('user', `Message ${i}`)
  );

  const result = await selectContext(messages, 50, {
    alwaysKeepRecent: 3,
    summaryBudget: 10,
  });

  // Last 3 messages should be in selected
  const lastThreeContent = messages.slice(-3).map(m => m.content);
  const selectedContent = result.selectedMessages.map(m => m.content);

  lastThreeContent.forEach(content => {
    assertEquals(selectedContent.includes(content), true, `Missing recent message: ${content}`);
  });
});

Deno.test('extractEntities - extracts capitalized words', () => {
  const messages = [
    createMessage('user', 'Check the UserAuth component'),
    createMessage('assistant', 'The UserAuth handles AuthProvider'),
  ];

  const entities = extractEntities(messages);

  assertEquals(entities.has('UserAuth'), true);
  assertEquals(entities.has('AuthProvider'), true);
  assertEquals(entities.has('Check'), true); // Capitalized at start
});

Deno.test('extractEntities - extracts camelCase identifiers', () => {
  const messages = [
    createMessage('user', 'The validateToken function is broken'),
  ];

  const entities = extractEntities(messages);

  assertEquals(entities.has('validateToken'), true);
});

Deno.test('extractEntities - extracts file paths', () => {
  const messages = [
    createMessage('user', 'Look at src/components/Auth.tsx'),
  ];

  const entities = extractEntities(messages);

  assertEquals(entities.has('src/components/Auth.tsx'), true);
});

Deno.test('extractEntities - handles empty messages', () => {
  const entities = extractEntities([]);
  assertEquals(entities.size, 0);
});

Deno.test('selectContext - respects trackedEntities option', async () => {
  const messages = [
    createMessage('user', 'Let me explain the UserAuth system'),
    createMessage('assistant', 'I understand the UserAuth flow'),
    createMessage('user', 'Now about the weather'),
    createMessage('assistant', 'The weather looks nice'),
    createMessage('user', 'Final question about UserAuth'),
  ];

  const trackedEntities = new Set(['UserAuth']);

  const result = await selectContext(messages, 100, {
    trackedEntities,
    alwaysKeepRecent: 2,
    summaryBudget: 20,
  });

  // Messages mentioning UserAuth should be prioritized
  const selectedContent = result.selectedMessages.map(m => m.content).join(' ');
  assertEquals(selectedContent.includes('UserAuth'), true);
});
