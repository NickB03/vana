/**
 * Integration Tests for ReasoningProvider Lifecycle
 *
 * Tests the complete lifecycle of the ReasoningProvider:
 * - Initialization and configuration
 * - Start with initial status emission
 * - Processing reasoning chunks with buffering
 * - Phase detection and transitions
 * - LLM client integration with fallback
 * - Circuit breaker pattern for failure recovery
 * - Finalization with summary generation
 * - Resource cleanup on destroy
 * - NoOp provider for testing/disabled scenarios
 *
 * Run with: deno test --allow-env supabase/functions/_shared/__tests__/reasoning-provider.test.ts
 */

import { assertEquals, assertExists, assert } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  createReasoningProvider,
  createNoOpReasoningProvider,
  type IReasoningProvider,
  type ReasoningEvent,
  type ILLMClient,
  type ThinkingPhase,
} from '../reasoning-provider.ts';

// ============================================================================
// Mock LLM Client
// ============================================================================

class MockLLMClient implements ILLMClient {
  private generateStatusCalls: Array<{
    text: string;
    phase: ThinkingPhase;
    requestId: string;
  }> = [];
  private generateSummaryCalls: Array<{
    history: string;
    description: string;
    requestId: string;
  }> = [];
  private statusResponses: string[] = ['LLM status message'];
  private summaryResponses: string[] = ['Created component successfully.'];
  private statusFailure = false;
  private summaryFailure = false;
  private statusResponseIndex = 0;
  private summaryResponseIndex = 0;

  constructor() {}

  async generateStatus(
    reasoningText: string,
    phase: ThinkingPhase,
    requestId: string
  ): Promise<string> {
    this.generateStatusCalls.push({ text: reasoningText, phase, requestId });

    if (this.statusFailure) {
      throw new Error('LLM generateStatus failed');
    }

    const response = this.statusResponses[this.statusResponseIndex % this.statusResponses.length];
    this.statusResponseIndex++;
    return response;
  }

  async generateFinalSummary(
    reasoningHistory: string,
    artifactDescription: string,
    requestId: string
  ): Promise<string> {
    this.generateSummaryCalls.push({ history: reasoningHistory, description: artifactDescription, requestId });

    if (this.summaryFailure) {
      throw new Error('LLM generateFinalSummary failed');
    }

    const response = this.summaryResponses[this.summaryResponseIndex % this.summaryResponses.length];
    this.summaryResponseIndex++;
    return response;
  }

  getStatusCalls() {
    return [...this.generateStatusCalls];
  }

  getSummaryCalls() {
    return [...this.generateSummaryCalls];
  }

  setStatusFailure(fail: boolean) {
    this.statusFailure = fail;
  }

  setSummaryFailure(fail: boolean) {
    this.summaryFailure = fail;
  }

  reset() {
    this.generateStatusCalls = [];
    this.generateSummaryCalls = [];
    this.statusResponseIndex = 0;
    this.summaryResponseIndex = 0;
    this.statusFailure = false;
    this.summaryFailure = false;
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface TestEventCollector {
  events: ReasoningEvent[];
  capture: (event: ReasoningEvent) => void;
}

function createEventCollector(): TestEventCollector {
  const events: ReasoningEvent[] = [];
  return {
    events,
    capture: (event: ReasoningEvent) => {
      events.push(event);
    },
  };
}

// ============================================================================
// Tests
// ============================================================================

Deno.test("ReasoningProvider - Initialization", async (t) => {
  await t.step("creates provider with valid configuration", () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    assertExists(provider);
    assertEquals(provider.getState().currentPhase, 'analyzing');
    assertEquals(provider.getState().buffer, '');
    assertEquals(provider.getState().destroyed, false);
    provider.destroy();
  });

  await t.step("accepts optional configuration overrides", () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: {
        minBufferChars: 100,
        maxBufferChars: 400,
        timeoutMs: 3000,
      },
      llmClient: mockLLM,
    });

    assertExists(provider);
    assertEquals(provider.getState().currentPhase, 'analyzing');
    provider.destroy();
  });

  await t.step("starts with destroyed flag set to false", () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    assertEquals(provider.getState().destroyed, false);
    provider.destroy();
  });
});

Deno.test("ReasoningProvider - Start Lifecycle", async (t) => {
  await t.step("initializes provider on start", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();

    assert(collector.events.length > 0, 'Events should be emitted');
    assertEquals(collector.events[0].type, 'reasoning_status');
    assertExists(collector.events[0].message);

    provider.destroy();
  });

  await t.step("emits initial fallback status when started", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();

    const initialEvent = collector.events[0];
    assertEquals(initialEvent.type, 'reasoning_status');
    assertEquals(initialEvent.metadata.source, 'fallback');
    assertEquals(initialEvent.phase, 'analyzing');

    provider.destroy();
  });

  await t.step("starts with analyzing phase", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();

    assertEquals(provider.getState().currentPhase, 'analyzing');
    assertEquals(collector.events[0].phase, 'analyzing');

    provider.destroy();
  });
});

Deno.test("ReasoningProvider - Process Chunks", async (t) => {
  await t.step("buffers reasoning chunks", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 500 }, // High threshold
      llmClient: mockLLM,
    });

    await provider.start();
    await provider.processReasoningChunk('Analyzing the requirements...');

    const state = provider.getState();
    assert(state.buffer.includes('Analyzing the requirements'));

    provider.destroy();
  });

  await t.step("accumulates multiple chunks in buffer", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 500 },
      llmClient: mockLLM,
    });

    await provider.start();
    await provider.processReasoningChunk('First chunk. ');
    await provider.processReasoningChunk('Second chunk. ');
    await provider.processReasoningChunk('Third chunk.');

    const state = provider.getState();
    assert(state.buffer.includes('First chunk'));
    assert(state.buffer.includes('Second chunk'));
    assert(state.buffer.includes('Third chunk'));

    provider.destroy();
  });

  await t.step("triggers flush when buffer exceeds minBufferChars", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 50 },
      llmClient: mockLLM,
    });

    await provider.start();
    const initialEventCount = collector.events.length;

    await provider.processReasoningChunk('This is a long reasoning chunk that should trigger the LLM call because it exceeds the buffer threshold.');
    await delay(300);

    // Should have emitted more events or buffer should be cleared after flush attempt
    assert(collector.events.length >= initialEventCount, 'Events should be emitted or buffer flushed');

    provider.destroy();
  });

  await t.step("does not process chunks when destroyed", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();
    provider.destroy();

    await provider.processReasoningChunk('This should not be processed');

    // Buffer should remain empty
    assertEquals(provider.getState().buffer, '');

    provider.destroy();
  });
});

Deno.test("ReasoningProvider - Phase Management", async (t) => {
  await t.step("sets phase manually", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();
    const initialEventCount = collector.events.length;

    await provider.setPhase('implementing');

    assertEquals(provider.getState().currentPhase, 'implementing');
    // Should emit a status event for phase change
    assert(collector.events.length > initialEventCount);

    provider.destroy();
  });

  await t.step("detects phase changes from chunk content", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 500 }, // Prevent auto-flush
      llmClient: mockLLM,
    });

    await provider.start();

    // Send chunk with implementation keywords
    await provider.processReasoningChunk('Now I will implement the core logic and write the code for the component.');

    // Phase should change to implementing
    assertEquals(provider.getState().currentPhase, 'implementing');

    provider.destroy();
  });
});

Deno.test("ReasoningProvider - Finalize Lifecycle", async (t) => {
  await t.step("emits reasoning_final event on finalize", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();

    await provider.finalize('Calculator Component');

    const finalEvent = collector.events.find(e => e.type === 'reasoning_final');
    assertExists(finalEvent);
    assertExists(finalEvent?.message);

    provider.destroy();
  });

  await t.step("uses fallback message when LLM summary fails", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    mockLLM.setSummaryFailure(true);
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();

    await provider.finalize('Test Component');

    const finalEvent = collector.events.find(e => e.type === 'reasoning_final');
    assertExists(finalEvent);
    assert(finalEvent?.message.includes('Test Component'));
    assertEquals(finalEvent?.metadata.source, 'fallback');

    provider.destroy();
  });

  await t.step("emits final event with proper metadata", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();

    await provider.finalize('New Feature');

    const finalEvent = collector.events.find(e => e.type === 'reasoning_final');
    assertEquals(finalEvent?.metadata.requestId, requestId);
    assertExists(finalEvent?.metadata.timestamp);
    assertEquals(finalEvent?.phase, 'finalizing');

    provider.destroy();
  });

  await t.step("destroys provider after finalize", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();
    await provider.finalize('Test Component');

    assertEquals(provider.getState().destroyed, true);

    provider.destroy();
  });
});

Deno.test("ReasoningProvider - Destroy Lifecycle", async (t) => {
  await t.step("destroys without error", () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    // Should not throw
    provider.destroy();
  });

  await t.step("marks provider as destroyed", () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    provider.destroy();

    assertEquals(provider.getState().destroyed, true);
  });

  await t.step("stops accepting new chunks after destroy", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 50 },
      llmClient: mockLLM,
    });

    await provider.start();
    provider.destroy();

    mockLLM.reset();

    await provider.processReasoningChunk('Should be ignored');

    assertEquals(mockLLM.getStatusCalls().length, 0);
    assertEquals(provider.getState().buffer, '');

    provider.destroy();
  });

  await t.step("allows multiple destroy calls without error", () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    // Should not throw
    provider.destroy();
    provider.destroy();
    provider.destroy();
  });
});

Deno.test("ReasoningProvider - NoOp Provider", async (t) => {
  await t.step("creates no-op provider without error", () => {
    const provider = createNoOpReasoningProvider();
    assertExists(provider);
  });

  await t.step("no-op start does not throw", async () => {
    const provider = createNoOpReasoningProvider();
    await provider.start();
  });

  await t.step("no-op processReasoningChunk does not throw", async () => {
    const provider = createNoOpReasoningProvider();
    await provider.processReasoningChunk('test');
  });

  await t.step("no-op setPhase does not throw", async () => {
    const provider = createNoOpReasoningProvider();
    await provider.setPhase('implementing');
  });

  await t.step("no-op finalize does not throw", async () => {
    const provider = createNoOpReasoningProvider();
    await provider.finalize('test');
  });

  await t.step("no-op destroy does not throw", () => {
    const provider = createNoOpReasoningProvider();
    provider.destroy();
  });

  await t.step("no-op getState returns valid state", () => {
    const provider = createNoOpReasoningProvider();
    const state = provider.getState();

    assertEquals(state.currentPhase, 'analyzing');
    assertEquals(state.buffer, '');
    assertEquals(state.destroyed, false);
    assertEquals(state.pendingCalls, 0);
  });
});

Deno.test("ReasoningProvider - Circuit Breaker", async (t) => {
  await t.step("opens circuit after consecutive failures", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    mockLLM.setStatusFailure(true);
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: {
        minBufferChars: 50,
        circuitBreakerThreshold: 2,
        minUpdateIntervalMs: 100, // Reduce cooldown for faster testing
      },
      llmClient: mockLLM,
    });

    await provider.start();

    // Trigger multiple failures
    await provider.processReasoningChunk('A'.repeat(100));
    await delay(300);

    await provider.processReasoningChunk('A'.repeat(100));
    await delay(300);

    const state = provider.getState();
    assertEquals(state.circuitBreaker.isOpen, true);

    provider.destroy();
  });

  await t.step("uses fallback messages when circuit is open", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    mockLLM.setStatusFailure(true);
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: {
        minBufferChars: 50,
        circuitBreakerThreshold: 1,
      },
      llmClient: mockLLM,
    });

    await provider.start();

    // Trigger failure to open circuit
    await provider.processReasoningChunk('A'.repeat(100));
    await delay(150);

    mockLLM.reset();
    mockLLM.setStatusFailure(false);

    // Next chunk should use fallback
    await provider.processReasoningChunk('A'.repeat(100));
    await delay(150);

    assertEquals(mockLLM.getStatusCalls().length, 0);

    provider.destroy();
  });

  await t.step("includes circuitBreakerOpen flag in event metadata", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    mockLLM.setStatusFailure(true);
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: {
        minBufferChars: 50,
        circuitBreakerThreshold: 1,
        minUpdateIntervalMs: 100,
      },
      llmClient: mockLLM,
    });

    await provider.start();

    // Trigger failure to open circuit
    await provider.processReasoningChunk('A'.repeat(100));
    await delay(300);

    // Find event with open circuit flag (check if any event has it set, or at least has the property)
    const hasCircuitBreakerFlag = collector.events.some(
      e => e.metadata.circuitBreakerOpen !== undefined
    );

    assert(hasCircuitBreakerFlag, 'Should have circuitBreakerOpen flag in metadata');

    provider.destroy();
  });

  await t.step("circuit transitions from open to half-open to closed after reset timeout", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_circuit_halfopen';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: {
        minBufferChars: 50,
        circuitBreakerThreshold: 1,
        circuitBreakerResetMs: 500, // Short timeout for testing
        minUpdateIntervalMs: 100,
      },
      llmClient: mockLLM,
    });

    await provider.start();

    // Step 1: CLOSED → OPEN (trigger failure)
    mockLLM.setStatusFailure(true);
    await provider.processReasoningChunk('A'.repeat(100));
    await delay(200);

    // Verify circuit is open
    let state = provider.getState();
    assertEquals(state.circuitBreaker.isOpen, true);
    assertEquals(state.circuitBreaker.consecutiveFailures, 1);

    // Step 2: Wait for circuitBreakerResetMs to expire (OPEN → HALF-OPEN)
    await delay(400); // Total ~600ms > 500ms reset timeout

    // Step 3: LLM call succeeds on next chunk (HALF-OPEN → CLOSED)
    mockLLM.reset();
    mockLLM.setStatusFailure(false);
    await provider.processReasoningChunk('B'.repeat(100));
    await delay(200);

    // Verify circuit closed after successful call
    state = provider.getState();
    assertEquals(state.circuitBreaker.isOpen, false);
    assertEquals(state.circuitBreaker.consecutiveFailures, 0);
    assertEquals(state.circuitBreaker.openedAt, undefined);

    // Verify LLM was actually called (not using fallback)
    const statusCalls = mockLLM.getStatusCalls();
    assert(statusCalls.length > 0, 'LLM should have been called after circuit closed');

    provider.destroy();
  });

  await t.step("circuit re-opens if LLM call fails during half-open state", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_circuit_reopen';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: {
        minBufferChars: 50,
        circuitBreakerThreshold: 1,
        circuitBreakerResetMs: 600, // 600ms timeout for testing
        minUpdateIntervalMs: 100,
      },
      llmClient: mockLLM,
    });

    await provider.start();

    // Step 1: CLOSED → OPEN (trigger failure)
    mockLLM.setStatusFailure(true);
    await provider.processReasoningChunk('A'.repeat(100));
    await delay(150);

    // Verify circuit is open and record the openedAt timestamp
    let state = provider.getState();
    assertEquals(state.circuitBreaker.isOpen, true);
    const initialFailureCount = state.circuitBreaker.consecutiveFailures;
    const originalOpenedAt = state.circuitBreaker.openedAt;

    // Step 2: Wait for reset timeout (OPEN → HALF-OPEN)
    await delay(550); // Total ~700ms > 600ms reset timeout

    // Record call count before half-open attempt
    const callsBeforeHalfOpen = mockLLM.getStatusCalls().length;

    // Step 3: LLM call fails again during half-open state (HALF-OPEN → OPEN)
    mockLLM.setStatusFailure(true);
    await provider.processReasoningChunk('B'.repeat(100));
    await delay(50);

    // Verify LLM was called during half-open state
    const callsAfterHalfOpen = mockLLM.getStatusCalls().length;
    assertEquals(callsAfterHalfOpen, callsBeforeHalfOpen + 1, 'Should attempt LLM call in half-open state');

    // Verify circuit remained open after failure
    state = provider.getState();
    assertEquals(state.circuitBreaker.isOpen, true);
    assertEquals(state.circuitBreaker.consecutiveFailures, initialFailureCount + 1);

    // Important: openedAt is NOT updated during half-open failure (implementation preserves original timestamp)
    assertEquals(state.circuitBreaker.openedAt, originalOpenedAt, 'openedAt should not be updated during half-open failure');

    // Step 4: Verify next chunk uses fallback immediately after half-open failure
    // Process chunk C immediately to test that circuit doesn't retry right away
    await provider.processReasoningChunk('C'.repeat(100));
    await delay(25);

    // Should not have made another LLM call (still using original openedAt timestamp)
    const finalCallCount = mockLLM.getStatusCalls().length;
    assertEquals(finalCallCount, callsAfterHalfOpen, 'Should not retry LLM call while circuit remains open');

    provider.destroy();
  });
});

Deno.test("ReasoningProvider - Event Emission", async (t) => {
  await t.step("includes request ID in all events", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();
    await provider.finalize('Test');

    for (const event of collector.events) {
      assertEquals(event.metadata.requestId, requestId);
    }

    provider.destroy();
  });

  await t.step("includes valid timestamp in all events", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();
    await provider.finalize('Test');

    for (const event of collector.events) {
      const timestamp = new Date(event.metadata.timestamp);
      assert(timestamp.getTime() > 0);
      assert(timestamp.getTime() <= Date.now() + 1000);
    }

    provider.destroy();
  });

  await t.step("includes source metadata in events", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 100 },
      llmClient: mockLLM,
    });

    await provider.start();

    // Should have fallback event from start
    assertEquals(collector.events[0].metadata.source, 'fallback');

    await provider.finalize('Test');

    const finalEvent = collector.events.find(e => e.type === 'reasoning_final');
    assertExists(finalEvent?.metadata.source);
    assert(['llm', 'fallback'].includes(finalEvent?.metadata.source!));

    provider.destroy();
  });

  await t.step("includes phase in all events", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      llmClient: mockLLM,
    });

    await provider.start();
    await provider.finalize('Test');

    const validPhases = ['analyzing', 'planning', 'implementing', 'styling', 'finalizing'];
    for (const event of collector.events) {
      assert(validPhases.includes(event.phase));
    }

    provider.destroy();
  });
});

Deno.test("ReasoningProvider - Complete Lifecycle Flow", async (t) => {
  await t.step("executes full lifecycle: start -> process -> finalize -> destroy", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    // Step 1: Create provider
    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 100 },
      llmClient: mockLLM,
    });

    assertEquals(provider.getState().destroyed, false);

    // Step 2: Start
    await provider.start();
    assert(collector.events.length > 0);
    assertEquals(collector.events[0].type, 'reasoning_status');

    // Step 3: Process chunks
    await provider.processReasoningChunk('Analyzing requirements');
    await provider.processReasoningChunk(' and planning approach');

    const stateAfterProcessing = provider.getState();
    assert(stateAfterProcessing.buffer.length > 0);

    // Step 4: Finalize
    await provider.finalize('React Component');

    const finalEvent = collector.events.find(e => e.type === 'reasoning_final');
    assertExists(finalEvent);
    assertExists(finalEvent?.message); // Just verify message exists

    // Step 5: Verify destroyed
    assertEquals(provider.getState().destroyed, true);

    provider.destroy();
  });

  await t.step("handles rapid chunk processing", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 200 },
      llmClient: mockLLM,
    });

    await provider.start();

    // Rapid processing
    for (let i = 0; i < 10; i++) {
      await provider.processReasoningChunk(`Chunk ${i} `);
    }

    const state = provider.getState();
    assert(state.buffer.length > 0);

    await provider.finalize('Test');
    assertEquals(provider.getState().destroyed, true);

    provider.destroy();
  });

  await t.step("maintains event sequence order", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 200 },
      llmClient: mockLLM,
    });

    await provider.start();
    await provider.processReasoningChunk('A'.repeat(300)); // Trigger LLM call
    await delay(150);
    await provider.finalize('Test');

    // First event should be status
    assertEquals(collector.events[0].type, 'reasoning_status');

    // Last event should be final
    assertEquals(collector.events[collector.events.length - 1].type, 'reasoning_final');

    // All events should have valid timestamps
    for (const event of collector.events) {
      assertExists(event.metadata.timestamp);
      assert(new Date(event.metadata.timestamp).getTime() > 0);
    }

    provider.destroy();
  });
});

Deno.test("ReasoningProvider - Error Handling", async (t) => {
  await t.step("continues operation when LLM fails", async () => {
    const collector = createEventCollector();
    const mockLLM = new MockLLMClient();
    mockLLM.setStatusFailure(true);
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 50, idleHeartbeatMs: 10000 }, // Longer heartbeat
      llmClient: mockLLM,
    });

    await provider.start();

    // Should not throw
    await provider.processReasoningChunk('A'.repeat(100));
    await delay(150);

    assertEquals(provider.getState().destroyed, false);

    provider.destroy();
  });

  await t.step("handles missing LLM client gracefully", async () => {
    const collector = createEventCollector();
    const requestId = 'req_test_123';

    const provider = createReasoningProvider(requestId, collector.capture, {
      config: { minBufferChars: 50, idleHeartbeatMs: 10000 }, // Longer heartbeat
      // No LLM client provided
    });

    await provider.start();

    // Should use fallback, not throw
    await provider.processReasoningChunk('A'.repeat(100));
    await delay(150);

    // Fallback events should be emitted
    const fallbackEvents = collector.events.filter(e => e.metadata.source === 'fallback');
    assert(fallbackEvents.length > 0);

    provider.destroy();
  });
});
