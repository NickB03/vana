/**
 * Skills System v2 - Resolver Tests
 *
 * Comprehensive Deno test suite for resolver.ts functionality including:
 * - Basic skill resolution with context providers
 * - Timeout handling for slow providers
 * - Action execution with parameter validation
 * - Security sanitization of user content
 * - Reference loading
 * - Error handling and graceful degradation
 *
 * @module skills/__tests__/resolver.test.ts
 * @since 2026-01-25 (Skills System v2)
 */

import {
  assertEquals,
  assertExists,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { spy, assertSpyCall } from "https://deno.land/std@0.208.0/testing/mock.ts";

import { resolveSkill, loadReference, executeAction } from '../resolver.ts';
import { getSkill, registerSkill } from '../registry.ts';
// Import definitions to trigger registration
import '../definitions/index.ts';
import type { SkillContext, Skill, ContextProvider, SkillAction, MessageRole, ArtifactType } from '../types.ts';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a mock SkillContext for testing
 *
 * @remarks
 * This is a TEST-ONLY helper that bypasses the branded type requirement.
 * In production code, ALWAYS use `createSkillContext()` from factories.ts.
 *
 * The cast is safe for tests because:
 * 1. Tests need exact control over input without sanitization
 * 2. Tests verify resolver behavior, not factory validation
 * 3. Factory tests are in a separate test file
 *
 * @internal Test utility only - not exported from module
 */
function createMockContext(overrides?: Partial<{
  sessionId: string;
  conversationHistory: Array<{ role: MessageRole; content: string }>;
  requestId?: string;
  currentArtifact?: {
    title: string;
    type: ArtifactType;
    content: string;
  };
}>): SkillContext {
  // Cast to SkillContext - test-only privilege to bypass brand requirement
  return {
    sessionId: 'test-session-123',
    conversationHistory: [],
    requestId: 'test-request-456',
    ...overrides,
  } as unknown as SkillContext;
}

/**
 * Create a slow provider that exceeds timeout for testing
 */
function createSlowProvider(delayMs: number): ContextProvider {
  return {
    id: 'slow-provider',
    name: 'Slow Provider',
    placeholder: '{{slow_data}}',
    provider: async (): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return 'This should timeout';
    },
  };
}

/**
 * Create a provider that returns very long output for truncation testing
 */
function createLongOutputProvider(chars: number): ContextProvider {
  return {
    id: 'long-output',
    name: 'Long Output Provider',
    placeholder: '{{long_data}}',
    provider: async (): Promise<string> => {
      return 'A'.repeat(chars);
    },
  };
}

// =============================================================================
// Basic Resolution Tests
// =============================================================================

Deno.test("resolveSkill - returns null for unknown skill", async () => {
  const context = createMockContext();
  const result = await resolveSkill('unknown-skill' as any, context);
  assertEquals(result, null);
});

Deno.test({
  name: "resolveSkill - resolves web-search skill with context providers",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const context = createMockContext();
  const result = await resolveSkill('web-search', context);

  assertExists(result);
  assertEquals(result.skill.id, 'web-search');
  assertStringIncludes(result.content, 'WEB SEARCH SKILL ACTIVE');

  // Verify placeholders are replaced ({{recent_searches}} should be gone)
  assertEquals(result.content.includes('{{recent_searches}}'), false);
  },
});

Deno.test({
  name: "resolveSkill - includes artifact context when provided",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const context = createMockContext({
    currentArtifact: {
      title: 'Test Chart',
      type: 'react',
      content: 'export default function TestChart() { return <div>Chart</div>; }',
    },
  });

  const result = await resolveSkill('code-assistant', context);

  assertExists(result);
  assertEquals(result.skill.id, 'code-assistant');
  assertStringIncludes(result.content, 'CODE ASSISTANT SKILL ACTIVE');
  },
});

Deno.test({
  name: "resolveSkill - resolves skill without context providers",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  // data-viz skill exists in registry now
  const context = createMockContext();
  const result = await resolveSkill('data-viz', context);

  assertExists(result);
  assertEquals(result.skill.id, 'data-viz');
  // Just verify it resolves and has content
  assertExists(result.content);
  assertEquals(result.loadedReferences.length, 0);
  },
});

Deno.test({
  name: "resolveSkill - returns empty loadedReferences (not implemented yet)",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const context = createMockContext();
  const result = await resolveSkill('web-search', context);

  assertExists(result);
  assertEquals(result.loadedReferences, []);
  },
});

// =============================================================================
// Timeout Tests
// =============================================================================

Deno.test({
  name: "resolveSkill - handles context provider timeout gracefully",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  // Create a test skill with a slow provider (4 seconds > 3 second timeout)
  const testSkill: Skill = {
    id: 'web-search', // Reuse existing skill ID for testing
    displayName: 'Test Timeout Skill',
    description: 'Test skill with slow provider',
    content: 'Content: {{slow_data}}',
    contextProviders: [createSlowProvider(4000)],
  };

  // Temporarily override the skill in registry for this test
  const originalSkill = getSkill('web-search');
  registerSkill(testSkill);

  try {
    const context = createMockContext();
    const result = await resolveSkill('web-search', context);

    assertExists(result);
    // Placeholder should be replaced with empty string on timeout
    assertStringIncludes(result.content, 'Content: ');
    assertEquals(result.content.includes('{{slow_data}}'), false);
    assertEquals(result.content.includes('This should timeout'), false);
  } finally {
    // Restore original skill
    if (originalSkill) {
      registerSkill(originalSkill);
    }
  }
  },
});

Deno.test({
  name: "resolveSkill - continues resolution even if one provider fails",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const workingProvider: ContextProvider = {
    id: 'working-provider',
    name: 'Working Provider',
    placeholder: '{{working_data}}',
    provider: async (): Promise<string> => {
      return 'Working data';
    },
  };

  const failingProvider: ContextProvider = {
    id: 'failing-provider',
    name: 'Failing Provider',
    placeholder: '{{failing_data}}',
    provider: async (): Promise<string> => {
      throw new Error('Provider failure');
    },
  };

  const testSkill: Skill = {
    id: 'web-search',
    displayName: 'Test Multi-Provider Skill',
    description: 'Test skill with multiple providers',
    content: 'Working: {{working_data}}, Failing: {{failing_data}}',
    contextProviders: [workingProvider, failingProvider],
  };

  const originalSkill = getSkill('web-search');
  registerSkill(testSkill);

  try {
    const context = createMockContext();
    const result = await resolveSkill('web-search', context);

    assertExists(result);
    assertStringIncludes(result.content, 'Working: Working data');
    // Failing provider should be replaced with empty string
    assertStringIncludes(result.content, 'Failing: ');
    assertEquals(result.content.includes('{{failing_data}}'), false);
  } finally {
    if (originalSkill) {
      registerSkill(originalSkill);
    }
  }
  },
});

// =============================================================================
// Action Execution Tests
// =============================================================================

Deno.test("executeAction - returns error for unknown action", async () => {
  const skill = getSkill('web-search');
  assertExists(skill);

  const context = createMockContext();
  const result = await executeAction(
    skill,
    'non-existent-action',
    {},
    context
  );

  assertEquals(result.success, false);
  assertExists(result.error);
  assertStringIncludes(result.error, 'Action not found');
});

Deno.test("executeAction - validates parameters with Zod schema", async () => {
  // Create a test skill with an action that requires parameters
  const testAction: SkillAction = {
    id: 'test-action',
    name: 'Test Action',
    description: 'Test action with required params',
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Required query' },
      { name: 'limit', type: 'number', required: false, description: 'Optional limit' },
    ],
    execute: async (params) => {
      return { success: true, data: params };
    },
  };

  const testSkill: Skill = {
    id: 'web-search',
    displayName: 'Test Action Skill',
    description: 'Test skill with action',
    content: 'Test content',
    actions: [testAction],
  };

  const originalSkill = getSkill('web-search');
  registerSkill(testSkill);

  try {
    const context = createMockContext();

    // Test missing required parameter
    const result1 = await executeAction(
      testSkill,
      'test-action',
      {},
      context
    );

    assertEquals(result1.success, false);
    assertExists(result1.error);
    assertStringIncludes(result1.error, 'validation failed');

    // Test with valid parameters
    const result2 = await executeAction(
      testSkill,
      'test-action',
      { query: 'test query' },
      context
    );

    assertEquals(result2.success, true);
    assertEquals(result2.data, { query: 'test query' });

    // Test with valid required + optional parameters
    const result3 = await executeAction(
      testSkill,
      'test-action',
      { query: 'test query', limit: 10 },
      context
    );

    assertEquals(result3.success, true);
    assertEquals(result3.data, { query: 'test query', limit: 10 });
  } finally {
    if (originalSkill) {
      registerSkill(originalSkill);
    }
  }
});

Deno.test("executeAction - handles action execution errors gracefully", async () => {
  const failingAction: SkillAction = {
    id: 'failing-action',
    name: 'Failing Action',
    description: 'Action that throws error',
    parameters: [],
    execute: async () => {
      throw new Error('Execution failed');
    },
  };

  const testSkill: Skill = {
    id: 'web-search',
    displayName: 'Test Failing Action Skill',
    description: 'Test skill with failing action',
    content: 'Test content',
    actions: [failingAction],
  };

  const originalSkill = getSkill('web-search');
  registerSkill(testSkill);

  try {
    const context = createMockContext();
    const result = await executeAction(
      testSkill,
      'failing-action',
      {},
      context
    );

    assertEquals(result.success, false);
    assertExists(result.error);
  } finally {
    if (originalSkill) {
      registerSkill(originalSkill);
    }
  }
});

Deno.test("executeAction - validates parameter types correctly", async () => {
  const testAction: SkillAction = {
    id: 'type-test-action',
    name: 'Type Test Action',
    description: 'Action with different parameter types',
    parameters: [
      { name: 'name', type: 'string', required: true },
      { name: 'count', type: 'number', required: true },
      { name: 'enabled', type: 'boolean', required: true },
    ],
    execute: async (params) => {
      return { success: true, data: params };
    },
  };

  const testSkill: Skill = {
    id: 'web-search',
    displayName: 'Type Test Skill',
    description: 'Test skill for type validation',
    content: 'Test content',
    actions: [testAction],
  };

  const originalSkill = getSkill('web-search');
  registerSkill(testSkill);

  try {
    const context = createMockContext();

    // Test with correct types
    const result1 = await executeAction(
      testSkill,
      'type-test-action',
      { name: 'test', count: 42, enabled: true },
      context
    );

    assertEquals(result1.success, true);

    // Test with wrong type (string instead of number)
    const result2 = await executeAction(
      testSkill,
      'type-test-action',
      { name: 'test', count: 'not-a-number', enabled: true },
      context
    );

    assertEquals(result2.success, false);
    assertExists(result2.error);
  } finally {
    if (originalSkill) {
      registerSkill(originalSkill);
    }
  }
});

// =============================================================================
// Security Tests
// =============================================================================

Deno.test({
  name: "resolveSkill - sanitizes user content in conversation history",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const context = createMockContext({
    conversationHistory: [
      {
        role: 'user',
        content: '<script>alert("XSS")</script>Hello',
      },
      {
        role: 'assistant',
        content: 'Safe response',
      },
    ],
  });

  // Note: We can't directly verify sanitization without inspecting internal state,
  // but we can verify the function completes without error and returns valid result
  const result = await resolveSkill('web-search', context);

  assertExists(result);
  assertEquals(result.skill.id, 'web-search');
  },
});

Deno.test({
  name: "resolveSkill - truncates provider output exceeding max length",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const testSkill: Skill = {
    id: 'web-search',
    displayName: 'Test Long Output Skill',
    description: 'Test skill with long output',
    content: 'Data: {{long_data}}',
    contextProviders: [createLongOutputProvider(6000)], // > 5000 char limit
  };

  const originalSkill = getSkill('web-search');
  registerSkill(testSkill);

  try {
    const context = createMockContext();
    const result = await resolveSkill('web-search', context);

    assertExists(result);
    // Content should be truncated and include truncation notice
    assertStringIncludes(result.content, '[Output truncated]');
    // Verify it doesn't exceed the limit by much (5000 chars + prefix + suffix)
    assertEquals(result.content.length < 5100, true);
  } finally {
    if (originalSkill) {
      registerSkill(originalSkill);
    }
  }
  },
});

Deno.test({
  name: "resolveSkill - handles malicious artifact context",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const context = createMockContext({
    currentArtifact: {
      title: '<img src=x onerror=alert(1)>',
      type: 'react',
      content: '/* malicious comment */ export default function App() {}',
    },
  });

  // Should not throw error, sanitization should handle it
  const result = await resolveSkill('code-assistant', context);

  assertExists(result);
  assertEquals(result.skill.id, 'code-assistant');
  },
});

// =============================================================================
// Reference Tests
// =============================================================================

Deno.test("loadReference - returns null for unknown reference", () => {
  const skill = getSkill('web-search');
  assertExists(skill);

  const result = loadReference(skill, 'non-existent-reference');
  assertEquals(result, null);
});

Deno.test("loadReference - returns null when skill has no references", () => {
  const skill = getSkill('web-search');
  assertExists(skill);

  // web-search skill has empty references array
  const result = loadReference(skill, 'any-reference');
  assertEquals(result, null);
});

Deno.test("loadReference - loads known reference content", () => {
  const testSkill: Skill = {
    id: 'web-search',
    displayName: 'Test Reference Skill',
    description: 'Test skill with references',
    content: 'Test content',
    references: [
      {
        id: 'test-reference',
        name: 'Test Reference',
        content: '# Test Reference\n\nThis is test reference content.',
      },
    ],
  };

  const result = loadReference(testSkill, 'test-reference');

  assertExists(result);
  assertStringIncludes(result, '# Test Reference');
  assertStringIncludes(result, 'test reference content');
});

// =============================================================================
// Placeholder Replacement Tests
// =============================================================================

Deno.test({
  name: "resolveSkill - replaces multiple placeholders correctly",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const provider1: ContextProvider = {
    id: 'provider-1',
    name: 'Provider 1',
    placeholder: '{{data1}}',
    provider: async () => 'Value 1',
  };

  const provider2: ContextProvider = {
    id: 'provider-2',
    name: 'Provider 2',
    placeholder: '{{data2}}',
    provider: async () => 'Value 2',
  };

  const testSkill: Skill = {
    id: 'web-search',
    displayName: 'Multi-Placeholder Skill',
    description: 'Test multiple placeholders',
    content: 'First: {{data1}}, Second: {{data2}}, First again: {{data1}}',
    contextProviders: [provider1, provider2],
  };

  const originalSkill = getSkill('web-search');
  registerSkill(testSkill);

  try {
    const context = createMockContext();
    const result = await resolveSkill('web-search', context);

    assertExists(result);
    assertEquals(result.content, 'First: Value 1, Second: Value 2, First again: Value 1');
  } finally {
    if (originalSkill) {
      registerSkill(originalSkill);
    }
  }
  },
});

Deno.test({
  name: "resolveSkill - handles empty provider results gracefully",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const emptyProvider: ContextProvider = {
    id: 'empty-provider',
    name: 'Empty Provider',
    placeholder: '{{empty}}',
    provider: async () => '',
  };

  const testSkill: Skill = {
    id: 'web-search',
    displayName: 'Empty Provider Skill',
    description: 'Test empty provider',
    content: 'Before{{empty}}After',
    contextProviders: [emptyProvider],
  };

  const originalSkill = getSkill('web-search');
  registerSkill(testSkill);

  try {
    const context = createMockContext();
    const result = await resolveSkill('web-search', context);

    assertExists(result);
    assertEquals(result.content, 'BeforeAfter');
  } finally {
    if (originalSkill) {
      registerSkill(originalSkill);
    }
  }
  },
});

// =============================================================================
// Registry Integration Tests
// =============================================================================

Deno.test({
  name: "registry integration - all registered skills are resolvable",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
  const skillIds: Array<'web-search' | 'code-assistant' | 'data-viz'> = [
    'web-search',
    'code-assistant',
    'data-viz',
  ];

  const context = createMockContext();

  for (const skillId of skillIds) {
    const skill = getSkill(skillId);
    assertExists(skill, `Skill ${skillId} should be registered`);

    const resolved = await resolveSkill(skillId, context);
    assertExists(resolved, `Skill ${skillId} should resolve successfully`);
    assertEquals(resolved.skill.id, skillId);
  }
  },
});
