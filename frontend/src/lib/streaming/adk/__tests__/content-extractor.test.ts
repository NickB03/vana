/**
 * Content Extractor Tests - Phase 3.1
 *
 * Tests for ADK content extraction utilities
 * Focus: P0-002 fix - function response extraction
 */

import {
  extractTextContent,
  extractFunctionCalls,
  extractFunctionResponses,
  extractFunctionResponseText,
  extractSourcesFromFunctionResponse,
  extractSources,
  extractAllContent,
  hasContent,
} from '../content-extractor';
import type { AdkEvent, AdkFunctionResponse } from '../types';

describe('Content Extractor', () => {
  describe('extractTextContent', () => {
    it('should extract regular text parts', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Part 1' },
            { text: 'Part 2' },
          ],
        },
      };

      const result = extractTextContent(event);

      expect(result.textParts).toEqual(['Part 1', 'Part 2']);
      expect(result.thoughtParts).toEqual([]);
    });

    it('should extract thought parts separately', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Thinking...', thought: true },
            { text: 'Analyzing...', thought: true },
          ],
        },
      };

      const result = extractTextContent(event);

      expect(result.textParts).toEqual([]);
      expect(result.thoughtParts).toEqual(['Thinking...', 'Analyzing...']);
    });

    it('should separate text and thoughts', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Let me think...', thought: true },
            { text: 'Here is my answer:' },
            { text: 'Considering alternatives...', thought: true },
            { text: 'Final conclusion.' },
          ],
        },
      };

      const result = extractTextContent(event);

      expect(result.textParts).toEqual(['Here is my answer:', 'Final conclusion.']);
      expect(result.thoughtParts).toEqual(['Let me think...', 'Considering alternatives...']);
    });

    it('should handle event with no content', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
      };

      const result = extractTextContent(event);

      expect(result.textParts).toEqual([]);
      expect(result.thoughtParts).toEqual([]);
    });

    it('should handle event with empty parts', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: { parts: [] },
      };

      const result = extractTextContent(event);

      expect(result.textParts).toEqual([]);
      expect(result.thoughtParts).toEqual([]);
    });

    it('should skip non-text parts', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Text part' },
            {
              functionCall: {
                name: 'tool',
                args: {},
                id: 'call_1',
              },
            },
            { text: 'Another text' },
          ],
        },
      };

      const result = extractTextContent(event);

      expect(result.textParts).toEqual(['Text part', 'Another text']);
    });
  });

  describe('extractFunctionCalls', () => {
    it('should extract function calls', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionCall: {
                name: 'search_web',
                args: { query: 'test' },
                id: 'call_1',
              },
            },
          ],
        },
      };

      const result = extractFunctionCalls(event);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('search_web');
      expect(result[0].args).toEqual({ query: 'test' });
    });

    it('should extract multiple function calls', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionCall: {
                name: 'tool1',
                args: {},
                id: 'call_1',
              },
            },
            {
              functionCall: {
                name: 'tool2',
                args: {},
                id: 'call_2',
              },
            },
          ],
        },
      };

      const result = extractFunctionCalls(event);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for event with no function calls', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [{ text: 'No calls here' }],
        },
      };

      const result = extractFunctionCalls(event);

      expect(result).toEqual([]);
    });
  });

  describe('extractFunctionResponses', () => {
    it('should extract function responses (P0-002)', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionResponse: {
                name: 'plan_generator',
                id: 'call_1',
                response: {
                  result: '**[RESEARCH]** Test plan',
                },
              },
            },
          ],
        },
      };

      const result = extractFunctionResponses(event);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('plan_generator');
      expect(result[0].response.result).toContain('[RESEARCH]');
    });

    it('should extract multiple function responses', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionResponse: {
                name: 'tool1',
                id: 'call_1',
                response: { result: 'Result 1' },
              },
            },
            {
              functionResponse: {
                name: 'tool2',
                id: 'call_2',
                response: { result: 'Result 2' },
              },
            },
          ],
        },
      };

      const result = extractFunctionResponses(event);

      expect(result).toHaveLength(2);
    });
  });

  describe('extractFunctionResponseText (P0-002 fix)', () => {
    it('should extract from response.result', () => {
      const response: AdkFunctionResponse = {
        name: 'tool',
        id: 'call_1',
        response: {
          result: 'Test result',
        },
      };

      const text = extractFunctionResponseText(response);

      expect(text).toBe('Test result');
    });

    it('should extract from response.content', () => {
      const response: AdkFunctionResponse = {
        name: 'tool',
        id: 'call_1',
        response: {
          content: 'Test content',
        },
      };

      const text = extractFunctionResponseText(response);

      expect(text).toBe('Test content');
    });

    it('should extract from response.output', () => {
      const response: AdkFunctionResponse = {
        name: 'tool',
        id: 'call_1',
        response: {
          output: 'Test output',
        },
      };

      const text = extractFunctionResponseText(response);

      expect(text).toBe('Test output');
    });

    it('should prioritize result over content', () => {
      const response: AdkFunctionResponse = {
        name: 'tool',
        id: 'call_1',
        response: {
          result: 'Priority result',
          content: 'Lower priority',
        },
      };

      const text = extractFunctionResponseText(response);

      expect(text).toBe('Priority result');
    });

    it('should stringify object result', () => {
      const response: AdkFunctionResponse = {
        name: 'tool',
        id: 'call_1',
        response: {
          result: {
            data: 'nested',
          },
        },
      };

      const text = extractFunctionResponseText(response);

      expect(text).toContain('"data"');
      expect(text).toContain('"nested"');
    });

    it('should fallback to stringified response', () => {
      const response: AdkFunctionResponse = {
        name: 'tool',
        id: 'call_1',
        response: {
          customField: 'custom value',
        },
      };

      const text = extractFunctionResponseText(response);

      expect(text).toContain('customField');
      expect(text).toContain('custom value');
    });
  });

  describe('extractSourcesFromFunctionResponse', () => {
    it('should extract sources from sources field', () => {
      const response: AdkFunctionResponse = {
        name: 'search',
        id: 'call_1',
        response: {
          sources: [
            { url: 'https://example.com/1', title: 'Article 1' },
            { url: 'https://example.com/2', title: 'Article 2' },
          ],
        },
      };

      const sources = extractSourcesFromFunctionResponse(response);

      expect(sources).toHaveLength(2);
      expect(sources[0].url).toBe('https://example.com/1');
      expect(sources[0].title).toBe('Article 1');
    });

    it('should extract from results field', () => {
      const response: AdkFunctionResponse = {
        name: 'search',
        id: 'call_1',
        response: {
          results: [
            { url: 'https://example.com', title: 'Result' },
          ],
        },
      };

      const sources = extractSourcesFromFunctionResponse(response);

      expect(sources).toHaveLength(1);
    });

    it('should handle missing title', () => {
      const response: AdkFunctionResponse = {
        name: 'search',
        id: 'call_1',
        response: {
          sources: [
            { url: 'https://example.com' },
          ],
        },
      };

      const sources = extractSourcesFromFunctionResponse(response);

      expect(sources).toHaveLength(1);
      expect(sources[0].title).toBe('Untitled');
    });

    it('should return empty for no sources', () => {
      const response: AdkFunctionResponse = {
        name: 'tool',
        id: 'call_1',
        response: {
          result: 'No sources',
        },
      };

      const sources = extractSourcesFromFunctionResponse(response);

      expect(sources).toEqual([]);
    });
  });

  describe('extractSources', () => {
    it('should extract from groundingMetadata', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        groundingMetadata: {
          groundingChunks: [
            {
              web: {
                uri: 'https://example.com/article',
                title: 'Example Article',
              },
            },
          ],
        },
      };

      const sources = extractSources(event);

      expect(sources).toHaveLength(1);
      expect(sources[0].url).toBe('https://example.com/article');
      expect(sources[0].title).toBe('Example Article');
    });

    it('should combine grounding and function response sources', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionResponse: {
                name: 'search',
                id: 'call_1',
                response: {
                  sources: [
                    { url: 'https://example.com/1', title: 'Source 1' },
                  ],
                },
              },
            },
          ],
        },
        groundingMetadata: {
          groundingChunks: [
            {
              web: {
                uri: 'https://example.com/2',
                title: 'Source 2',
              },
            },
          ],
        },
      };

      const sources = extractSources(event);

      expect(sources).toHaveLength(2);
    });

    it('should deduplicate sources by URL', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionResponse: {
                name: 'search',
                id: 'call_1',
                response: {
                  sources: [
                    { url: 'https://example.com', title: 'Duplicate' },
                  ],
                },
              },
            },
          ],
        },
        groundingMetadata: {
          groundingChunks: [
            {
              web: {
                uri: 'https://example.com',
                title: 'Duplicate',
              },
            },
          ],
        },
      };

      const sources = extractSources(event);

      expect(sources).toHaveLength(1);
    });
  });

  describe('extractAllContent', () => {
    it('should extract all content types', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Text part' },
            { text: 'Thought part', thought: true },
            {
              functionCall: {
                name: 'tool',
                args: {},
                id: 'call_1',
              },
            },
            {
              functionResponse: {
                name: 'tool',
                id: 'call_1',
                response: { result: 'Result' },
              },
            },
          ],
        },
      };

      const result = extractAllContent(event);

      expect(result.textParts).toHaveLength(1);
      expect(result.thoughtParts).toHaveLength(1);
      expect(result.functionCalls).toHaveLength(1);
      expect(result.functionResponses).toHaveLength(1);
    });
  });

  describe('hasContent', () => {
    it('should return true for text content', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [{ text: 'Content' }],
        },
      };

      expect(hasContent(event)).toBe(true);
    });

    it('should return true for function calls', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionCall: {
                name: 'tool',
                args: {},
                id: 'call_1',
              },
            },
          ],
        },
      };

      expect(hasContent(event)).toBe(true);
    });

    it('should return false for empty event', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
      };

      expect(hasContent(event)).toBe(false);
    });

    it('should return false for empty parts', () => {
      const event: AdkEvent = {
        id: 'evt_1',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: { parts: [] },
      };

      expect(hasContent(event)).toBe(false);
    });
  });
});
