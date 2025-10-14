/**
 * Unit tests for ADK content extraction
 *
 * Tests the critical P0-002 fix: extracting content from ADK events
 * that contain parts[].functionResponse (where research plans live)
 */

import {
  extractContentFromADKEvent,
  hasExtractableContent,
} from '../adk-content-extraction';

describe('extractContentFromADKEvent', () => {
  describe('Top-level field extraction', () => {
    it('should extract from content field', () => {
      const payload = { content: 'Test content' };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toBe('Test content');
      expect(result.sources.topLevel).toBe(true);
      expect(result.sources.textParts).toBe(0);
      expect(result.sources.functionResponses).toBe(0);
    });

    it('should extract from report field', () => {
      const payload = { report: 'Test report' };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toBe('Test report');
      expect(result.sources.topLevel).toBe(true);
    });

    it('should extract from final_report field', () => {
      const payload = { final_report: 'Final report' };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toBe('Final report');
      expect(result.sources.topLevel).toBe(true);
    });

    it('should extract from result field', () => {
      const payload = { result: 'Result data' };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toBe('Result data');
      expect(result.sources.topLevel).toBe(true);
    });

    it('should concatenate multiple top-level fields', () => {
      const payload = {
        content: 'Part 1',
        report: 'Part 2',
        result: 'Part 3',
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toContain('Part 1');
      expect(result.content).toContain('Part 2');
      expect(result.content).toContain('Part 3');
      expect(result.sources.topLevel).toBe(true);
    });
  });

  describe('parts[].text extraction', () => {
    it('should extract from single text part', () => {
      const payload = {
        parts: [{ text: 'Model output' }],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toBe('Model output');
      expect(result.sources.textParts).toBe(1);
      expect(result.sources.functionResponses).toBe(0);
    });

    it('should extract from multiple text parts', () => {
      const payload = {
        parts: [
          { text: 'Part 1' },
          { text: 'Part 2' },
          { text: 'Part 3' },
        ],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toContain('Part 1');
      expect(result.content).toContain('Part 2');
      expect(result.content).toContain('Part 3');
      expect(result.sources.textParts).toBe(3);
    });

    it('should skip empty text parts', () => {
      const payload = {
        parts: [
          { text: 'Valid' },
          { text: '' },
          { text: '   ' },
          { text: 'Also valid' },
        ],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toContain('Valid');
      expect(result.content).toContain('Also valid');
      expect(result.content).not.toContain('empty');
      expect(result.sources.textParts).toBe(2);
    });
  });

  describe('parts[].functionResponse extraction (CRITICAL)', () => {
    it('should extract from functionResponse.response.result', () => {
      const payload = {
        parts: [{
          functionResponse: {
            id: 'adk-123',
            name: 'plan_generator',
            response: {
              result: '**[RESEARCH]** Test research plan',
            },
          },
        }],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toBe('**[RESEARCH]** Test research plan');
      expect(result.sources.functionResponses).toBe(1);
    });

    it('should extract from multiple functionResponse parts', () => {
      const payload = {
        parts: [
          {
            functionResponse: {
              name: 'agent1',
              response: { result: 'Agent 1 output' },
            },
          },
          {
            functionResponse: {
              name: 'agent2',
              response: { result: 'Agent 2 output' },
            },
          },
        ],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toContain('Agent 1 output');
      expect(result.content).toContain('Agent 2 output');
      expect(result.sources.functionResponses).toBe(2);
    });

    it('should handle nested object in result field', () => {
      const payload = {
        parts: [{
          functionResponse: {
            name: 'plan_generator',
            response: {
              result: {
                text: 'Research plan content',
              },
            },
          },
        }],
      };
      const result = extractContentFromADKEvent(payload);

      // Should extract the nested text field
      expect(result.content).toContain('Research plan content');
      expect(result.sources.functionResponses).toBe(1);
    });

    it('should handle JSON string in result field', () => {
      const payload = {
        parts: [{
          functionResponse: {
            name: 'tool',
            response: {
              result: JSON.stringify({ data: 'test data' }),
            },
          },
        }],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toContain('test data');
      expect(result.sources.functionResponses).toBe(1);
    });

    it('should skip functionResponse with missing result', () => {
      const payload = {
        parts: [{
          functionResponse: {
            name: 'tool',
            response: {
              // No result field
              status: 'success',
            },
          },
        }],
      };
      const result = extractContentFromADKEvent(payload);

      // Should use fallback message
      expect(result.content).toBe('No content available');
      expect(result.sources.functionResponses).toBe(0);
    });

    it('should skip functionResponse with empty result', () => {
      const payload = {
        parts: [{
          functionResponse: {
            name: 'tool',
            response: {
              result: '',
            },
          },
        }],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toBe('No content available');
      expect(result.sources.functionResponses).toBe(0);
    });
  });

  describe('Mixed content extraction', () => {
    it('should extract from both text and functionResponse parts', () => {
      const payload = {
        parts: [
          { text: 'Creating plan...' },
          {
            functionResponse: {
              name: 'plan_generator',
              response: {
                result: '**[RESEARCH]** Plan content',
              },
            },
          },
          { text: 'Does this look good?' },
        ],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toContain('Creating plan...');
      expect(result.content).toContain('**[RESEARCH]** Plan content');
      expect(result.content).toContain('Does this look good?');
      expect(result.sources.textParts).toBe(2);
      expect(result.sources.functionResponses).toBe(1);
    });

    it('should combine top-level and parts content', () => {
      const payload = {
        content: 'Top level content',
        parts: [
          { text: 'Part 1' },
          {
            functionResponse: {
              name: 'tool',
              response: { result: 'Part 2' },
            },
          },
        ],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toContain('Top level content');
      expect(result.content).toContain('Part 1');
      expect(result.content).toContain('Part 2');
      expect(result.sources.topLevel).toBe(true);
      expect(result.sources.textParts).toBe(1);
      expect(result.sources.functionResponses).toBe(1);
    });

    it('should handle real-world plan_generator event', () => {
      // Simulates actual ADK event from plan_generator agent
      const payload = {
        content: {
          parts: [
            { text: "I'll create a research plan for you." },
            {
              functionCall: {
                id: 'adk-abc123',
                name: 'plan_generator',
                args: { query: 'quantum computing' },
              },
            },
          ],
          role: 'model',
        },
        author: 'interactive_planner_agent',
      };

      // First event: model introduces task
      let result = extractContentFromADKEvent(payload.content);
      expect(result.content).toContain("I'll create a research plan");
      expect(result.sources.textParts).toBe(1);

      // Second event: plan_generator returns result
      const responsePayload = {
        content: {
          parts: [{
            functionResponse: {
              id: 'adk-abc123',
              name: 'plan_generator',
              response: {
                result: '*   **[RESEARCH]** Analyze quantum mechanics principles\n*   **[RESEARCH]** Investigate quantum computer architecture\n*   **[DELIVERABLE]** Compile comprehensive summary',
              },
            },
          }],
          role: 'model',
        },
        author: 'interactive_planner_agent',
      };

      result = extractContentFromADKEvent(responsePayload.content);
      expect(result.content).toContain('**[RESEARCH]**');
      expect(result.content).toContain('Analyze quantum mechanics');
      expect(result.sources.functionResponses).toBe(1);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null payload', () => {
      const result = extractContentFromADKEvent(null);

      expect(result.content).toBe('No content available');
      expect(result.sources.topLevel).toBe(false);
      expect(result.sources.textParts).toBe(0);
      expect(result.sources.functionResponses).toBe(0);
    });

    it('should handle undefined payload', () => {
      const result = extractContentFromADKEvent(undefined);

      expect(result.content).toBe('No content available');
    });

    it('should handle empty payload', () => {
      const result = extractContentFromADKEvent({});

      expect(result.content).toBe('No content available');
    });

    it('should handle empty parts array', () => {
      const payload = { parts: [] };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toBe('No content available');
    });

    it('should handle malformed parts', () => {
      const payload = {
        parts: [
          null,
          undefined,
          'not an object',
          { invalid: 'structure' },
          { text: 'Valid part' },
        ],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).toBe('Valid part');
      expect(result.sources.textParts).toBe(1);
    });

    it('should use custom fallback message', () => {
      const result = extractContentFromADKEvent({}, 'Custom fallback');

      expect(result.content).toBe('Custom fallback');
    });

    it('should handle nested content object (ADK event wrapper)', () => {
      const payload = {
        content: {
          parts: [{ text: 'Nested content' }],
          role: 'model',
        },
      };

      // Should handle nested .content object
      const result = extractContentFromADKEvent(payload);
      // Top-level content extraction should work
      expect(result.content).toContain('Nested content');
    });

    it('should trim whitespace from extracted content', () => {
      const payload = {
        parts: [
          { text: '  Leading whitespace' },
          { text: 'Trailing whitespace  ' },
          { text: '  Both  ' },
        ],
      };
      const result = extractContentFromADKEvent(payload);

      expect(result.content).not.toMatch(/^\s+/);
      expect(result.content).not.toMatch(/\s+$/);
      expect(result.content).toContain('Leading whitespace');
      expect(result.content).toContain('Trailing whitespace');
      expect(result.content).toContain('Both');
    });
  });

  describe('Logging and debugging', () => {
    let consoleLogSpy: jest.SpyInstance;
    let consoleDebugSpy: jest.SpyInstance;
    let consoleWarnSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleDebugSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should log extraction sources', () => {
      const payload = {
        content: 'Test',
        parts: [
          { text: 'Text part' },
          {
            functionResponse: {
              name: 'tool',
              response: { result: 'Function result' },
            },
          },
        ],
      };

      extractContentFromADKEvent(payload);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[ADK] Extraction complete:',
        expect.objectContaining({
          totalLength: expect.any(Number),
          sources: {
            topLevel: true,
            textParts: 1,
            functionResponses: 1,
          },
        })
      );
    });

    it('should warn on missing content', () => {
      extractContentFromADKEvent({});

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[ADK] No content found in payload:',
        expect.any(String)
      );
    });
  });
});

describe('hasExtractableContent', () => {
  it('should return true for top-level content', () => {
    expect(hasExtractableContent({ content: 'test' })).toBe(true);
    expect(hasExtractableContent({ report: 'test' })).toBe(true);
    expect(hasExtractableContent({ final_report: 'test' })).toBe(true);
    expect(hasExtractableContent({ result: 'test' })).toBe(true);
  });

  it('should return true for text parts', () => {
    const payload = {
      parts: [{ text: 'test' }],
    };
    expect(hasExtractableContent(payload)).toBe(true);
  });

  it('should return true for functionResponse parts', () => {
    const payload = {
      parts: [{
        functionResponse: {
          name: 'tool',
          response: { result: 'test' },
        },
      }],
    };
    expect(hasExtractableContent(payload)).toBe(true);
  });

  it('should return false for empty payload', () => {
    expect(hasExtractableContent({})).toBe(false);
    expect(hasExtractableContent(null)).toBe(false);
    expect(hasExtractableContent(undefined)).toBe(false);
  });

  it('should return false for payload with no extractable content', () => {
    const payload = {
      metadata: 'some metadata',
      status: 'success',
      parts: [
        { functionCall: { name: 'tool' } },
        { thoughtSignature: { thinking: 'hmm' } },
      ],
    };
    expect(hasExtractableContent(payload)).toBe(false);
  });
});
