/**
 * MessageTransformer tests
 * 
 * Tests for message transformation between ADK and UI formats,
 * including user message creation and ADK event processing.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageTransformer } from '../message-transformer';
import type { Session, MessageMetadata, ADKRequestMessage } from '@/types/adk-service';
import type { ADKSSEEvent, UIEvent } from '@/types/adk-events';

describe('MessageTransformer', () => {
  let transformer: MessageTransformer;
  let mockSession: Session;

  beforeEach(() => {
    transformer = new MessageTransformer();
    
    mockSession = {
      id: 'session_123',
      userId: 'user_456',
      title: 'Test Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  describe('User Message Creation', () => {
    it('should create ADK request message from user input', () => {
      const content = 'What is the latest news about AI?';
      const metadata: MessageMetadata = {
        messageId: 'msg_123',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.createUserMessage(content, mockSession, metadata);

      expect(result).toEqual({
        app_name: 'app',
        user_id: 'user_456',
        session_id: 'session_123',
        new_message: {
          role: 'user',
          parts: [{ text: content }],
        },
        streaming: true,
        metadata: {
          messageId: 'msg_123',
          timestamp: '2024-01-01T00:00:00.000Z',
          clientVersion: '1.0.0',
        },
      });
    });

    it('should generate message ID when not provided', () => {
      const content = 'Test message';

      const result = transformer.createUserMessage(content, mockSession);

      expect(result.metadata?.messageId).toMatch(/^msg_\d+_[a-z0-9]{6}$/);
    });

    it('should use current timestamp when not provided', () => {
      const content = 'Test message';
      const beforeTime = Date.now();

      const result = transformer.createUserMessage(content, mockSession);

      const afterTime = Date.now();
      const resultTime = result.metadata?.timestamp as number;

      expect(resultTime).toBeGreaterThanOrEqual(beforeTime);
      expect(resultTime).toBeLessThanOrEqual(afterTime);
    });

    it('should merge additional metadata', () => {
      const content = 'Test message';
      const metadata: MessageMetadata = {
        messageId: 'msg_123',
        customField: 'custom_value',
        requestId: 'req_456',
      };

      const result = transformer.createUserMessage(content, mockSession, metadata);

      expect(result.metadata).toEqual({
        messageId: 'msg_123',
        timestamp: expect.any(Number),
        clientVersion: '1.0.0',
        customField: 'custom_value',
        requestId: 'req_456',
      });
    });
  });

  describe('ADK Event Transformation', () => {
    it('should transform agent thinking event', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'planner_agent',
        content: null,
        actions: [
          {
            function_name: 'thinking',
            function_parameters: JSON.stringify({
              reasoning: 'Analyzing the user query about AI news...',
              step: 'planning',
            }),
          },
        ],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'thinking_update',
        data: {
          agent: 'planner_agent',
          reasoning: 'Analyzing the user query about AI news...',
          step: 'planning',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should transform agent content event', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'researcher_agent',
        content: 'Here are the latest AI developments...',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'content_update',
        data: {
          agent: 'researcher_agent',
          content: 'Here are the latest AI developments...',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should transform workflow state changes', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'planner_agent',
        content: null,
        actions: [
          {
            function_name: 'update_workflow_state',
            function_parameters: JSON.stringify({
              state: 'research_in_progress',
              step: 'gathering_information',
            }),
          },
        ],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toContainEqual({
        type: 'workflow_state_change',
        data: {
          state: 'research_in_progress',
          step: 'gathering_information',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should handle events with both thinking and content', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'composer_agent',
        content: 'Based on my research...',
        actions: [
          {
            function_name: 'thinking',
            function_parameters: JSON.stringify({
              reasoning: 'Composing the final response...',
              step: 'synthesis',
            }),
          },
        ],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        type: 'thinking_update',
        data: {
          agent: 'composer_agent',
          reasoning: 'Composing the final response...',
          step: 'synthesis',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
      expect(result).toContainEqual({
        type: 'content_update',
        data: {
          agent: 'composer_agent',
          content: 'Based on my research...',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should ignore user messages in thinking extraction', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'user',
        content: 'User message content',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      // Should not create thinking update for user messages
      const thinkingUpdates = result.filter(event => event.type === 'thinking_update');
      expect(thinkingUpdates).toHaveLength(0);
    });

    it('should handle events without author', () => {
      const adkEvent: ADKSSEEvent = {
        content: 'System message',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      // Should handle gracefully without crashing
      expect(result).toBeInstanceOf(Array);
    });

    it('should handle malformed action parameters', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'agent',
        content: null,
        actions: [
          {
            function_name: 'thinking',
            function_parameters: 'invalid json',
          },
        ],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      // Should not crash on malformed JSON
      expect(result).toBeInstanceOf(Array);
    });

    it('should extract timeline events', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'planner_agent',
        content: null,
        actions: [
          {
            function_name: 'add_timeline_event',
            function_parameters: JSON.stringify({
              event_type: 'research_started',
              title: 'Research Phase Started',
              description: 'Beginning information gathering',
            }),
          },
        ],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toContainEqual({
        type: 'timeline_event',
        data: {
          event_type: 'research_started',
          title: 'Research Phase Started',
          description: 'Beginning information gathering',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should extract error events', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'researcher_agent',
        content: null,
        actions: [
          {
            function_name: 'report_error',
            function_parameters: JSON.stringify({
              error_type: 'api_limit_exceeded',
              message: 'API rate limit exceeded',
              recoverable: true,
            }),
          },
        ],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toContainEqual({
        type: 'error_event',
        data: {
          error_type: 'api_limit_exceeded',
          message: 'API rate limit exceeded',
          recoverable: true,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });
  });

  describe('Agent Display Information', () => {
    it('should provide agent display info', () => {
      // This tests the internal agent display mapping
      const displayInfo = transformer['agentDisplayMap'];

      expect(displayInfo).toHaveProperty('planner_agent');
      expect(displayInfo['planner_agent']).toEqual({
        name: expect.any(String),
        description: expect.any(String),
        category: expect.any(String),
      });
    });

    it('should handle unknown agents gracefully', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'unknown_agent',
        content: 'Test content',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toContainEqual({
        type: 'content_update',
        data: {
          agent: 'unknown_agent',
          content: 'Test content',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });
  });

  describe('Function Descriptions', () => {
    it('should provide function descriptions for actions', () => {
      // This tests the internal function descriptions mapping
      const descriptions = transformer['functionDescriptions'];

      expect(descriptions).toHaveProperty('thinking');
      expect(descriptions['thinking']).toBe('Agent reasoning and thought process');
    });

    it('should handle unknown functions', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'agent',
        content: null,
        actions: [
          {
            function_name: 'unknown_function',
            function_parameters: JSON.stringify({ data: 'test' }),
          },
        ],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Should not crash on unknown functions
      const result = transformer.transformADKEvent(adkEvent);
      expect(result).toBeInstanceOf(Array);
    });
  });

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', () => {
      const id1 = transformer['generateMessageId']();
      const id2 = transformer['generateMessageId']();

      expect(id1).toMatch(/^msg_\d+_[a-z0-9]{6}$/);
      expect(id2).toMatch(/^msg_\d+_[a-z0-9]{6}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'agent',
        content: '',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toContainEqual({
        type: 'content_update',
        data: {
          agent: 'agent',
          content: '',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should handle null content', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'agent',
        content: null,
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      // Should not create content update for null content
      const contentUpdates = result.filter(event => event.type === 'content_update');
      expect(contentUpdates).toHaveLength(0);
    });

    it('should handle empty actions array', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'agent',
        content: 'Test content',
        actions: [],
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toContainEqual({
        type: 'content_update',
        data: {
          agent: 'agent',
          content: 'Test content',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should handle missing timestamp', () => {
      const adkEvent: ADKSSEEvent = {
        author: 'agent',
        content: 'Test content',
      };

      const result = transformer.transformADKEvent(adkEvent);

      // Should handle gracefully even without timestamp
      expect(result).toBeInstanceOf(Array);
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const adkEvent: ADKSSEEvent = {
        author: 'agent',
        content: longContent,
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toContainEqual({
        type: 'content_update',
        data: {
          agent: 'agent',
          content: longContent,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    it('should handle special characters in content', () => {
      const specialContent = '🤖 AI is analyzing: "What\'s the latest?" <test> & more...';
      const adkEvent: ADKSSEEvent = {
        author: 'agent',
        content: specialContent,
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      const result = transformer.transformADKEvent(adkEvent);

      expect(result).toContainEqual({
        type: 'content_update',
        data: {
          agent: 'agent',
          content: specialContent,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      });
    });
  });

  describe('Performance', () => {
    it('should handle multiple simultaneous transformations', () => {
      const events = Array.from({ length: 100 }, (_, i) => ({
        author: `agent_${i}`,
        content: `Content ${i}`,
        timestamp: new Date().toISOString(),
      }));

      const startTime = performance.now();
      
      const results = events.map(event => transformer.transformADKEvent(event));
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should reuse instances efficiently', () => {
      const event: ADKSSEEvent = {
        author: 'agent',
        content: 'Test',
        timestamp: '2024-01-01T00:00:00.000Z',
      };

      // Multiple calls should not create new instances
      const result1 = transformer.transformADKEvent(event);
      const result2 = transformer.transformADKEvent(event);

      expect(result1).toEqual(result2);
    });
  });
});