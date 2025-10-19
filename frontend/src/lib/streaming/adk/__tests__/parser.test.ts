/**
 * Comprehensive ADK Event Parser Tests
 *
 * Phase 3.1 - Parser Infrastructure Testing
 * Target: 100+ test cases with 100% coverage
 *
 * Test Categories:
 * 1. Valid event parsing (30+ tests)
 * 2. Content extraction (25+ tests)
 * 3. Error handling (20+ tests)
 * 4. Edge cases (15+ tests)
 * 5. Performance benchmarks (10+ tests)
 */

import {
  parseAdkEventSSE,
  normalizeAdkEvent,
  batchParseAdkEvents,
  parseSSEEventBlock,
  isAdkEventData,
  fastParseAdkEvent,
} from '../parser';
import type {  AdkEvent, ParsedAdkEvent } from '../types';

describe('ADK Event Parser - Core Functionality', () => {
  describe('parseAdkEventSSE - Valid Events', () => {
    it('should parse minimal valid ADK event', () => {
      const data = JSON.stringify({
        id: 'evt_123',
        author: 'test_agent',
        invocationId: 'inv_456',
        timestamp: 1729252800.123,
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event).toBeDefined();
      expect(result.event!.messageId).toBe('evt_123');
      expect(result.event!.author).toBe('test_agent');
    });

    it('should parse event with text content', () => {
      const data = JSON.stringify({
        id: 'evt_text',
        author: 'plan_generator',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [{ text: 'Creating research plan...' }],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.textParts).toEqual(['Creating research plan...']);
      expect(result.event!.thoughtParts).toEqual([]);
    });

    it('should parse event with thought content', () => {
      const data = JSON.stringify({
        id: 'evt_thought',
        author: 'researcher',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [
            { text: 'Thinking about approach...', thought: true },
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.thoughtParts).toEqual(['Thinking about approach...']);
      expect(result.event!.textParts).toEqual([]);
    });

    it('should parse event with mixed text and thoughts', () => {
      const data = JSON.stringify({
        id: 'evt_mixed',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [
            { text: 'Let me analyze this...', thought: true },
            { text: 'Here are my findings:' },
            { text: 'Considering alternatives...', thought: true },
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.textParts).toEqual(['Here are my findings:']);
      expect(result.event!.thoughtParts).toEqual([
        'Let me analyze this...',
        'Considering alternatives...',
      ]);
    });

    it('should parse event with function call', () => {
      const data = JSON.stringify({
        id: 'evt_call',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [
            {
              functionCall: {
                name: 'search_web',
                args: { query: 'quantum computing' },
                id: 'call_123',
              },
            },
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.functionCalls).toHaveLength(1);
      expect(result.event!.functionCalls[0].name).toBe('search_web');
      expect(result.event!.functionCalls[0].args).toEqual({ query: 'quantum computing' });
    });

    it('should parse event with function response (P0-002 fix)', () => {
      const data = JSON.stringify({
        id: 'evt_response',
        author: 'plan_generator',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [
            {
              functionResponse: {
                name: 'generate_plan',
                id: 'call_123',
                response: {
                  result: '**[RESEARCH]** Analyze quantum mechanics',
                },
              },
            },
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.functionResponses).toHaveLength(1);
      expect(result.event!.functionResponses[0].name).toBe('generate_plan');
      expect(result.event!.functionResponses[0].response.result).toContain('RESEARCH');
    });

    it('should parse event with grounding metadata', () => {
      const data = JSON.stringify({
        id: 'evt_grounded',
        author: 'researcher',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [{ text: 'Based on web search results...' }],
        },
        groundingMetadata: {
          groundingChunks: [
            {
              web: {
                uri: 'https://example.com/article',
                title: 'Quantum Computing Basics',
              },
            },
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.sources).toHaveLength(1);
      expect(result.event!.sources[0].url).toBe('https://example.com/article');
      expect(result.event!.sources[0].title).toBe('Quantum Computing Basics');
    });

    it('should parse event with agent transfer', () => {
      const data = JSON.stringify({
        id: 'evt_transfer',
        author: 'coordinator',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [{ text: 'Transferring to researcher...' }],
        },
        actions: {
          transfer_to_agent: 'section_researcher',
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.isAgentTransfer).toBe(true);
      expect(result.event!.transferTargetAgent).toBe('section_researcher');
    });

    it('should parse event with error metadata', () => {
      const data = JSON.stringify({
        id: 'evt_error',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        errorCode: 'TIMEOUT',
        errorMessage: 'Request timed out after 30s',
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.rawEvent.errorCode).toBe('TIMEOUT');
      expect(result.event!.rawEvent.errorMessage).toContain('timed out');
    });

    it('should detect final response correctly', () => {
      const data = JSON.stringify({
        id: 'evt_final',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [{ text: 'Final response content' }],
        },
        partial: false,
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.isFinalResponse).toBe(true);
    });

    it('should detect non-final response (partial=true)', () => {
      const data = JSON.stringify({
        id: 'evt_partial',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [{ text: 'Streaming...' }],
        },
        partial: true,
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.isFinalResponse).toBe(false);
    });

    it('should detect non-final response (pending function calls)', () => {
      const data = JSON.stringify({
        id: 'evt_pending',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [
            { text: 'Calling tool...' },
            {
              functionCall: {
                name: 'tool',
                args: {},
                id: 'call_1',
              },
            },
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.isFinalResponse).toBe(false);
    });

    it('should parse event with multiple content types', () => {
      const data = JSON.stringify({
        id: 'evt_complex',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [
            { text: 'Starting analysis...', thought: true },
            { text: 'Executing search...' },
            {
              functionCall: {
                name: 'search',
                args: { q: 'test' },
                id: 'call_1',
              },
            },
            {
              functionResponse: {
                name: 'search',
                id: 'call_1',
                response: { result: 'Search completed' },
              },
            },
            { text: 'Results processed.' },
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.thoughtParts).toHaveLength(1);
      expect(result.event!.textParts).toHaveLength(2);
      expect(result.event!.functionCalls).toHaveLength(1);
      expect(result.event!.functionResponses).toHaveLength(1);
    });

    it('should parse event with long-running tools', () => {
      const data = JSON.stringify({
        id: 'evt_long',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        longRunningToolIds: ['tool_1', 'tool_2'],
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.rawEvent.longRunningToolIds).toEqual(['tool_1', 'tool_2']);
      expect(result.event!.isFinalResponse).toBe(false);
    });

    it('should parse event with branch path', () => {
      const data = JSON.stringify({
        id: 'evt_branch',
        author: 'sub_agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        branch: 'coordinator.planner.researcher',
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.rawEvent.branch).toBe('coordinator.planner.researcher');
    });

    it('should parse event with turnComplete flag', () => {
      const data = JSON.stringify({
        id: 'evt_turn',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        turnComplete: true,
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.rawEvent.turnComplete).toBe(true);
    });
  });

  describe('parseAdkEventSSE - Special Cases', () => {
    it('should handle empty data', () => {
      const result = parseAdkEventSSE('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty SSE data');
    });

    it('should handle whitespace-only data', () => {
      const result = parseAdkEventSSE('   \n\t  ');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Empty SSE data');
    });

    it('should handle [DONE] marker', () => {
      const result = parseAdkEventSSE('[DONE]');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Stream complete marker');
    });

    it('should handle SSE comments', () => {
      const result = parseAdkEventSSE(': this is a comment');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SSE comment');
    });

    it('should handle invalid JSON', () => {
      const result = parseAdkEventSSE('{ invalid json }');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON');
    });

    it('should handle missing required fields', () => {
      const data = JSON.stringify({
        id: 'evt_123',
        // Missing author, invocationId, timestamp
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid ADK Event structure');
    });

    it('should handle missing content', () => {
      const data = JSON.stringify({
        id: 'evt_null',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.textParts).toEqual([]);
      expect(result.event!.functionCalls).toEqual([]);
    });

    it('should handle empty parts array', () => {
      const data = JSON.stringify({
        id: 'evt_empty',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: { parts: [] },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.textParts).toEqual([]);
    });

    it('should handle malformed parts gracefully', () => {
      const data = JSON.stringify({
        id: 'evt_malformed',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [
            { text: 'Valid text' },
            {}, // Empty part
            { unknownField: 'data' }, // Unknown part type
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.textParts).toEqual(['Valid text']);
    });

    it('should handle empty text parts', () => {
      const data = JSON.stringify({
        id: 'evt_empty_text',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [
            { text: '' },
            { text: '  ' },
            { text: 'Valid' },
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      // Content extractor filters empty text internally
      expect(result.event!.textParts.length).toBeGreaterThanOrEqual(1);
      expect(result.event!.textParts).toContain('Valid');
    });
  });

  describe('parseAdkEventSSE - Complex Scenarios', () => {
    it('should parse real-world plan_generator event', () => {
      const data = JSON.stringify({
        id: 'adk-abc123',
        author: 'interactive_planner_agent',
        invocationId: 'inv-xyz',
        timestamp: 1729252800.456,
        content: {
          parts: [
            {
              functionResponse: {
                id: 'call-plan',
                name: 'plan_generator',
                response: {
                  result: `**[RESEARCH]** Analyze quantum mechanics principles
**[RESEARCH]** Investigate quantum computer architecture
**[DELIVERABLE]** Compile comprehensive summary`,
                },
              },
            },
          ],
          role: 'model',
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.author).toBe('interactive_planner_agent');
      expect(result.event!.functionResponses).toHaveLength(1);
      expect(result.event!.functionResponses[0].response.result).toContain('[RESEARCH]');
      expect(result.event!.functionResponses[0].response.result).toContain('[DELIVERABLE]');
    });

    it('should parse event with multiple sources', () => {
      const data = JSON.stringify({
        id: 'evt_sources',
        author: 'researcher',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [{ text: 'Search results compiled' }],
        },
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: 'https://example.com/1', title: 'Article 1' } },
            { web: { uri: 'https://example.com/2', title: 'Article 2' } },
            { web: { uri: 'https://example.com/3' } }, // No title
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      expect(result.event!.sources).toHaveLength(3);
      expect(result.event!.sources[0].title).toBe('Article 1');
      expect(result.event!.sources[2].title).toBeUndefined();
    });

    it('should deduplicate sources', () => {
      const data = JSON.stringify({
        id: 'evt_dup',
        author: 'agent',
        invocationId: 'inv_123',
        timestamp: 1729252800,
        content: {
          parts: [
            {
              functionResponse: {
                name: 'search',
                id: 'call_1',
                response: {
                  sources: [
                    { url: 'https://example.com/1', title: 'Article' },
                  ],
                },
              },
            },
          ],
        },
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: 'https://example.com/1', title: 'Article' } },
          ],
        },
      });

      const result = parseAdkEventSSE(data);

      expect(result.success).toBe(true);
      // Should deduplicate same URL
      expect(result.event!.sources).toHaveLength(1);
    });
  });

  describe('batchParseAdkEvents', () => {
    it('should parse multiple events', () => {
      const events = [
        JSON.stringify({
          id: 'evt_1',
          author: 'agent',
          invocationId: 'inv_1',
          timestamp: 1729252800,
        }),
        JSON.stringify({
          id: 'evt_2',
          author: 'agent',
          invocationId: 'inv_1',
          timestamp: 1729252801,
        }),
      ];

      const results = batchParseAdkEvents(events);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].event!.messageId).toBe('evt_1');
      expect(results[1].event!.messageId).toBe('evt_2');
    });

    it('should handle mixed valid and invalid events', () => {
      const events = [
        JSON.stringify({ id: 'evt_1', author: 'agent', invocationId: 'inv', timestamp: 123 }),
        'invalid json',
        JSON.stringify({ id: 'evt_2', author: 'agent', invocationId: 'inv', timestamp: 124 }),
      ];

      const results = batchParseAdkEvents(events);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should handle empty array', () => {
      const results = batchParseAdkEvents([]);

      expect(results).toEqual([]);
    });
  });

  describe('parseSSEEventBlock', () => {
    it('should parse SSE block with event type', () => {
      const block = `event: message
id: evt_123
data: {"id":"evt_123","author":"agent","invocationId":"inv","timestamp":123}`;

      const result = parseSSEEventBlock(block);

      expect(result.success).toBe(true);
      expect(result.event!.messageId).toBe('evt_123');
    });

    it('should parse SSE block with multi-line data', () => {
      const block = `event: message
data: {"id":"evt_123",
data: "author":"agent",
data: "invocationId":"inv","timestamp":123}`;

      const result = parseSSEEventBlock(block);

      expect(result.success).toBe(true);
      expect(result.event!.messageId).toBe('evt_123');
    });

    it('should handle SSE block with only data', () => {
      const block = `data: {"id":"evt_123","author":"agent","invocationId":"inv","timestamp":123}`;

      const result = parseSSEEventBlock(block);

      expect(result.success).toBe(true);
    });

    it('should handle empty SSE block', () => {
      const result = parseSSEEventBlock('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No data in SSE event block');
    });

    it('should handle SSE block with empty lines', () => {
      const block = `

event: message

data: {"id":"evt_123","author":"agent","invocationId":"inv","timestamp":123}

`;

      const result = parseSSEEventBlock(block);

      expect(result.success).toBe(true);
    });
  });

  describe('isAdkEventData', () => {
    it('should detect valid ADK event data', () => {
      const data = JSON.stringify({
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
      });

      expect(isAdkEventData(data)).toBe(true);
    });

    it('should reject empty data', () => {
      expect(isAdkEventData('')).toBe(false);
    });

    it('should reject [DONE] marker', () => {
      expect(isAdkEventData('[DONE]')).toBe(false);
    });

    it('should reject SSE comments', () => {
      expect(isAdkEventData(': comment')).toBe(false);
    });

    it('should reject invalid JSON', () => {
      expect(isAdkEventData('not json')).toBe(false);
    });

    it('should reject non-ADK event structures', () => {
      const data = JSON.stringify({
        type: 'research_update',
        payload: { message: 'test' },
      });

      expect(isAdkEventData(data)).toBe(false);
    });

    it('should reject events missing required fields', () => {
      const data = JSON.stringify({
        id: 'evt_123',
        // Missing author and invocationId
      });

      expect(isAdkEventData(data)).toBe(false);
    });
  });

  describe('fastParseAdkEvent', () => {
    it('should parse valid event quickly', () => {
      const data = JSON.stringify({
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [{ text: 'Fast parse' }],
        },
      });

      const result = fastParseAdkEvent(data);

      expect(result).not.toBeNull();
      expect(result!.messageId).toBe('evt_123');
      expect(result!.textParts).toEqual(['Fast parse']);
    });

    it('should return null for invalid JSON', () => {
      const result = fastParseAdkEvent('invalid');

      expect(result).toBeNull();
    });

    it('should return null for missing required fields', () => {
      const data = JSON.stringify({
        id: 'evt_123',
        // Missing author
      });

      const result = fastParseAdkEvent(data);

      expect(result).toBeNull();
    });
  });

  describe('Performance Benchmarks', () => {
    it('should parse simple event in <5ms', () => {
      const data = JSON.stringify({
        id: 'evt_bench',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: { parts: [{ text: 'Benchmark test' }] },
      });

      const start = performance.now();
      const result = parseAdkEventSSE(data);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5);
    });

    it('should parse complex event in <5ms', () => {
      const data = JSON.stringify({
        id: 'evt_complex',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Thought', thought: true },
            { text: 'Regular text' },
            {
              functionCall: {
                name: 'tool',
                args: { param: 'value' },
                id: 'call_1',
              },
            },
            {
              functionResponse: {
                name: 'tool',
                id: 'call_1',
                response: { result: 'Success' },
              },
            },
          ],
        },
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: 'https://example.com', title: 'Example' } },
          ],
        },
      });

      const start = performance.now();
      const result = parseAdkEventSSE(data);
      const duration = performance.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(5);
    });

    it('should parse 100 events in <500ms', () => {
      const events = Array.from({ length: 100 }, (_, i) =>
        JSON.stringify({
          id: `evt_${i}`,
          author: 'agent',
          invocationId: `inv_${i}`,
          timestamp: 1729252800 + i,
          content: { parts: [{ text: `Message ${i}` }] },
        })
      );

      const start = performance.now();
      const results = batchParseAdkEvents(events);
      const duration = performance.now() - start;

      expect(results).toHaveLength(100);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(500);
    });

    it('should use fastParseAdkEvent for faster parsing', () => {
      const data = JSON.stringify({
        id: 'evt_fast',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
      });

      const start = performance.now();
      const result = fastParseAdkEvent(data);
      const duration = performance.now() - start;

      expect(result).not.toBeNull();
      expect(duration).toBeLessThan(2); // Should be even faster
    });
  });
});
