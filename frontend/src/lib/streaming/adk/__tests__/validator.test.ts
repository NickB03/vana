/**
 * Validator Tests - Phase 3.1
 *
 * Tests for ADK event validation (development mode only)
 */

import {
  validateAdkEvent,
  quickValidateAdkEvent,
  shouldValidate,
  conditionalValidate,
} from '../validator';
import type { AdkEvent } from '../types';

const setNodeEnv = (value: string | undefined) => {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) {
    delete env.NODE_ENV;
  } else {
    env.NODE_ENV = value;
  }
};

describe('ADK Event Validator', () => {
  describe('validateAdkEvent', () => {
    it('should validate minimal valid event', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv_456',
        timestamp: 1729252800,
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject null event', () => {
      const result = validateAdkEvent(null);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Event must be a non-null object');
    });

    it('should reject missing id', () => {
      const event = {
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('id'))).toBe(true);
    });

    it('should reject missing author', () => {
      const event = {
        id: 'evt_123',
        invocationId: 'inv',
        timestamp: 123,
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('author'))).toBe(true);
    });

    it('should reject missing invocationId', () => {
      const event = {
        id: 'evt_123',
        author: 'agent',
        timestamp: 123,
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invocationId'))).toBe(true);
    });

    it('should reject missing timestamp', () => {
      const event = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
    });

    it('should validate event with content', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Test' },
          ],
        },
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid content type', () => {
      const event = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: 'invalid',
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('content'))).toBe(true);
    });

    it('should reject invalid parts type', () => {
      const event = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: 'not an array',
        },
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('parts'))).toBe(true);
    });

    it('should validate text part', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Valid text' },
          ],
        },
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(true);
    });

    it('should validate thought part', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Thought', thought: true },
          ],
        },
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid thought type', () => {
      const event = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Text', thought: 'invalid' },
          ],
        },
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
    });

    it('should validate function call part', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionCall: {
                name: 'tool',
                args: { param: 'value' },
                id: 'call_1',
              },
            },
          ],
        },
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(true);
    });

    it('should reject function call missing name', () => {
      const event = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionCall: {
                args: {},
                id: 'call_1',
              },
            },
          ],
        },
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
    });

    it('should validate function response part', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            {
              functionResponse: {
                name: 'tool',
                id: 'call_1',
                response: { result: 'Success' },
              },
            },
          ],
        },
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(true);
    });

    it('should validate event with actions', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        actions: {
          transfer_to_agent: 'other_agent',
        },
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(true);
    });

    it('should validate event with optional fields', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        branch: 'agent1.agent2',
        partial: true,
        turnComplete: false,
        longRunningToolIds: ['tool_1'],
        errorCode: 'ERROR',
        errorMessage: 'Test error',
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid branch type', () => {
      const event = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        branch: 123,
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
    });

    it('should reject invalid partial type', () => {
      const event = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        partial: 'true',
      };

      const result = validateAdkEvent(event);

      expect(result.valid).toBe(false);
    });
  });

  describe('quickValidateAdkEvent', () => {
    it('should quickly validate valid event', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
      };

      expect(quickValidateAdkEvent(event)).toBe(true);
    });

    it('should reject null', () => {
      expect(quickValidateAdkEvent(null)).toBe(false);
    });

    it('should reject missing required fields', () => {
      const event = {
        id: 'evt_123',
        // Missing other required fields
      };

      expect(quickValidateAdkEvent(event)).toBe(false);
    });

    it('should validate simple events faster', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
      };

      // Quick validation should be very fast for simple events
      const start = performance.now();
      const result = quickValidateAdkEvent(event);
      const duration = performance.now() - start;

      expect(result).toBe(true);
      expect(duration).toBeLessThan(1); // Should be <1ms
    });
  });

  describe('shouldValidate', () => {
    it('should return true in development', () => {
      const originalEnv = process.env.NODE_ENV;
      setNodeEnv('development');

      expect(shouldValidate()).toBe(true);

      setNodeEnv(originalEnv);
    });

    it('should return false in production', () => {
      const originalEnv = process.env.NODE_ENV;
      setNodeEnv('production');

      expect(shouldValidate()).toBe(false);

      setNodeEnv(originalEnv);
    });
  });

  describe('conditionalValidate', () => {
    it('should validate in development', () => {
      const originalEnv = process.env.NODE_ENV;
      setNodeEnv('development');

      const event = {
        id: 'evt_123',
        // Missing required fields
      };

      const result = conditionalValidate(event);

      expect(result.valid).toBe(false);

      setNodeEnv(originalEnv);
    });

    it('should skip validation in production', () => {
      const originalEnv = process.env.NODE_ENV;
      setNodeEnv('production');

      const event = {
        id: 'evt_123',
        // Missing required fields but should pass
      };

      const result = conditionalValidate(event);

      expect(result.valid).toBe(true);

      setNodeEnv(originalEnv);
    });
  });

  describe('Performance', () => {
    it('should validate in <2ms', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
        content: {
          parts: [
            { text: 'Text' },
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

      const start = performance.now();
      validateAdkEvent(event);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(2);
    });

    it('should quick validate in <1ms', () => {
      const event: AdkEvent = {
        id: 'evt_123',
        author: 'agent',
        invocationId: 'inv',
        timestamp: 123,
      };

      const start = performance.now();
      quickValidateAdkEvent(event);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(1);
    });
  });
});
