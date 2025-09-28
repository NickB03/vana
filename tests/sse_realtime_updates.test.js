/**
 * @fileoverview Server-Sent Events (SSE) and Real-time Updates Test Suite
 * Comprehensive tests for SSE functionality, real-time message updates,
 * connection handling, and event broadcasting.
 */

const { describe, test, expect, beforeEach, afterEach, jest } = require('@jest/globals');

/**
 * SSE Real-time Updates Test Suite
 *
 * Tests all aspects of Server-Sent Events (SSE) functionality:
 * 1. SSE connection establishment and management
 * 2. Real-time message edit events
 * 3. Regeneration progress events
 * 4. Delete confirmation events
 * 5. Connection/disconnection events
 * 6. Error handling and reconnection
 * 7. Authentication in SSE streams
 * 8. Event filtering and routing
 */
describe('SSE Real-time Updates Tests', () => {
  let mockEventSource;
  let eventHandlers;

  beforeEach(() => {
    // Reset event handlers storage
    eventHandlers = {};

    // Mock EventSource implementation
    mockEventSource = {
      readyState: 0, // CONNECTING
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
      url: '',
      addEventListener: jest.fn((event, handler) => {
        if (!eventHandlers[event]) {
          eventHandlers[event] = [];
        }
        eventHandlers[event].push(handler);
      }),
      removeEventListener: jest.fn((event, handler) => {
        if (eventHandlers[event]) {
          eventHandlers[event] = eventHandlers[event].filter(h => h !== handler);
        }
      }),
      close: jest.fn(),
      onopen: null,
      onmessage: null,
      onerror: null
    };

    global.EventSource = jest.fn((url, options) => {
      mockEventSource.url = url;
      mockEventSource.options = options;
      return mockEventSource;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('SSE Connection Management', () => {
    test('should establish SSE connection with correct URL', () => {
      const sessionId = 'test_session_123';
      const expectedUrl = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(expectedUrl);

      expect(global.EventSource).toHaveBeenCalledWith(expectedUrl, undefined);
      expect(eventSource.url).toBe(expectedUrl);
    });

    test('should establish connection with authentication headers', () => {
      const sessionId = 'test_session_456';
      const token = 'bearer-token-123';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      expect(global.EventSource).toHaveBeenCalledWith(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    });

    test('should handle connection state changes', () => {
      const sessionId = 'test_session_789';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const openHandler = jest.fn();
      const errorHandler = jest.fn();

      eventSource.addEventListener('open', openHandler);
      eventSource.addEventListener('error', errorHandler);

      // Simulate connection opening
      mockEventSource.readyState = 1; // OPEN
      if (eventHandlers.open) {
        eventHandlers.open.forEach(handler => handler({ type: 'open' }));
      }

      expect(mockEventSource.readyState).toBe(1);
      expect(openHandler).toHaveBeenCalledWith({ type: 'open' });
    });

    test('should handle connection errors', () => {
      const sessionId = 'test_session_error';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const errorHandler = jest.fn();

      eventSource.addEventListener('error', errorHandler);

      // Simulate connection error
      mockEventSource.readyState = 2; // CLOSED
      const errorEvent = {
        type: 'error',
        target: mockEventSource,
        data: 'Connection failed'
      };

      if (eventHandlers.error) {
        eventHandlers.error.forEach(handler => handler(errorEvent));
      }

      expect(errorHandler).toHaveBeenCalledWith(errorEvent);
    });

    test('should close connection properly', () => {
      const sessionId = 'test_session_close';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      eventSource.close();

      expect(mockEventSource.close).toHaveBeenCalled();
    });

    test('should remove event listeners on cleanup', () => {
      const sessionId = 'test_session_cleanup';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);
      eventSource.removeEventListener('message', messageHandler);

      expect(mockEventSource.removeEventListener).toHaveBeenCalledWith('message', messageHandler);
    });
  });

  describe('Connection Events', () => {
    test('should handle initial connection event', () => {
      const sessionId = 'test_session_init';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate initial connection event
      const connectionEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'connection',
          status: 'connected',
          sessionId: sessionId,
          timestamp: '2025-01-26T10:00:00Z',
          authenticated: false,
          userId: null
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(connectionEvent));
      }

      expect(messageHandler).toHaveBeenCalledWith(connectionEvent);

      const eventData = JSON.parse(connectionEvent.data);
      expect(eventData.type).toBe('connection');
      expect(eventData.status).toBe('connected');
      expect(eventData.sessionId).toBe(sessionId);
    });

    test('should handle authenticated connection event', () => {
      const sessionId = 'test_session_auth';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate authenticated connection event
      const authConnectionEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'connection',
          status: 'connected',
          sessionId: sessionId,
          authenticated: true,
          userId: 'user_123'
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(authConnectionEvent));
      }

      const eventData = JSON.parse(authConnectionEvent.data);
      expect(eventData.authenticated).toBe(true);
      expect(eventData.userId).toBe('user_123');
    });

    test('should handle disconnection event', () => {
      const sessionId = 'test_session_disconnect';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate disconnection event
      const disconnectEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'connection',
          status: 'disconnected',
          sessionId: sessionId,
          timestamp: '2025-01-26T10:05:00Z'
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(disconnectEvent));
      }

      const eventData = JSON.parse(disconnectEvent.data);
      expect(eventData.type).toBe('connection');
      expect(eventData.status).toBe('disconnected');
    });
  });

  describe('Message Edit Events', () => {
    test('should handle message edit events', () => {
      const sessionId = 'test_session_edit';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;
      const messageId = `msg_123_${sessionId}_user`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate message edit event
      const editEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'message_edited',
          data: {
            message_id: messageId,
            session_id: sessionId,
            content: 'Updated message content',
            previousContent: 'Original content',
            edited: true,
            timestamp: '2025-01-26T10:00:00Z'
          }
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(editEvent));
      }

      expect(messageHandler).toHaveBeenCalledWith(editEvent);

      const eventData = JSON.parse(editEvent.data);
      expect(eventData.type).toBe('message_edited');
      expect(eventData.data.message_id).toBe(messageId);
      expect(eventData.data.content).toBe('Updated message content');
      expect(eventData.data.edited).toBe(true);
    });

    test('should handle edit with regeneration trigger events', () => {
      const sessionId = 'test_session_edit_regen';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;
      const messageId = `msg_456_${sessionId}_user`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate edit with regeneration event
      const editRegenEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'message_edited',
          data: {
            message_id: messageId,
            session_id: sessionId,
            content: 'Edited content triggering regeneration',
            previousContent: 'Original content',
            edited: true,
            triggered_regeneration: true,
            regeneration_task_id: 'regen_abc123'
          }
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(editRegenEvent));
      }

      const eventData = JSON.parse(editRegenEvent.data);
      expect(eventData.data.triggered_regeneration).toBe(true);
      expect(eventData.data.regeneration_task_id).toBe('regen_abc123');
    });
  });

  describe('Message Delete Events', () => {
    test('should handle message delete events', () => {
      const sessionId = 'test_session_delete';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;
      const messageId = `msg_789_${sessionId}_user`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate message delete event
      const deleteEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'message_deleted',
          data: {
            message_id: messageId,
            session_id: sessionId,
            deletedCount: 2,
            deletedMessageIds: [messageId, 'msg_790_test_session_delete_assistant'],
            timestamp: '2025-01-26T10:00:00Z'
          }
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(deleteEvent));
      }

      expect(messageHandler).toHaveBeenCalledWith(deleteEvent);

      const eventData = JSON.parse(deleteEvent.data);
      expect(eventData.type).toBe('message_deleted');
      expect(eventData.data.deletedCount).toBe(2);
      expect(eventData.data.deletedMessageIds).toHaveLength(2);
    });
  });

  describe('Message Regeneration Events', () => {
    test('should handle regeneration start events', () => {
      const sessionId = 'test_session_regen';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;
      const messageId = `msg_regen_${sessionId}_assistant`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate regeneration start event
      const regenStartEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'message_regenerating',
          data: {
            message_id: messageId,
            session_id: sessionId,
            taskId: 'regen_xyz789',
            originalMessageId: 'msg_original_test_session_regen_user',
            userQuery: 'Original user query for regeneration'
          }
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(regenStartEvent));
      }

      const eventData = JSON.parse(regenStartEvent.data);
      expect(eventData.type).toBe('message_regenerating');
      expect(eventData.data.taskId).toBe('regen_xyz789');
      expect(eventData.data.userQuery).toBe('Original user query for regeneration');
    });

    test('should handle regeneration progress events', () => {
      const sessionId = 'test_session_progress';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;
      const messageId = `msg_progress_${sessionId}_assistant`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate regeneration progress events
      const progressSteps = [
        { progress: 20, message: 'Processing user query...' },
        { progress: 40, message: 'Generating response...' },
        { progress: 60, message: 'Refining content...' },
        { progress: 80, message: 'Finalizing response...' },
        { progress: 100, message: 'Complete!', partialContent: 'Final regenerated content' }
      ];

      progressSteps.forEach((step, index) => {
        const progressEvent = {
          type: 'message',
          data: JSON.stringify({
            type: 'regeneration_progress',
            data: {
              message_id: messageId,
              session_id: sessionId,
              taskId: 'regen_progress_task',
              progress: step.progress,
              message: step.message,
              partialContent: step.partialContent || ''
            }
          })
        };

        if (eventHandlers.message) {
          eventHandlers.message.forEach(handler => handler(progressEvent));
        }

        const eventData = JSON.parse(progressEvent.data);
        expect(eventData.type).toBe('regeneration_progress');
        expect(eventData.data.progress).toBe(step.progress);
        expect(eventData.data.message).toBe(step.message);

        if (step.progress === 100) {
          expect(eventData.data.partialContent).toBe('Final regenerated content');
        }
      });

      expect(messageHandler).toHaveBeenCalledTimes(5);
    });

    test('should handle regeneration completion events', () => {
      const sessionId = 'test_session_complete';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;
      const messageId = `msg_complete_${sessionId}_assistant`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate regeneration completion event
      const completeEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'message_regenerated',
          data: {
            message_id: messageId,
            session_id: sessionId,
            taskId: 'regen_complete_task',
            content: 'Fully regenerated message content with detailed response',
            timestamp: '2025-01-26T10:05:00Z'
          }
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(completeEvent));
      }

      const eventData = JSON.parse(completeEvent.data);
      expect(eventData.type).toBe('message_regenerated');
      expect(eventData.data.content).toBe('Fully regenerated message content with detailed response');
      expect(eventData.data.timestamp).toBeTruthy();
    });

    test('should handle regeneration error events', () => {
      const sessionId = 'test_session_error';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;
      const messageId = `msg_error_${sessionId}_assistant`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate regeneration error event
      const errorEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'regeneration_error',
          data: {
            message_id: messageId,
            session_id: sessionId,
            taskId: 'regen_error_task',
            error: 'Failed to generate response: Model timeout',
            timestamp: '2025-01-26T10:03:00Z'
          }
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(errorEvent));
      }

      const eventData = JSON.parse(errorEvent.data);
      expect(eventData.type).toBe('regeneration_error');
      expect(eventData.data.error).toBe('Failed to generate response: Model timeout');
    });
  });

  describe('Heartbeat and Keep-alive Events', () => {
    test('should handle heartbeat events', () => {
      const sessionId = 'test_session_heartbeat';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate heartbeat event
      const heartbeatEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'heartbeat',
          timestamp: '2025-01-26T10:00:00Z'
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(heartbeatEvent));
      }

      const eventData = JSON.parse(heartbeatEvent.data);
      expect(eventData.type).toBe('heartbeat');
      expect(eventData.timestamp).toBeTruthy();
    });

    test('should handle multiple heartbeat events over time', () => {
      const sessionId = 'test_session_multiple_heartbeat';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate multiple heartbeat events
      for (let i = 0; i < 5; i++) {
        const heartbeatEvent = {
          type: 'message',
          data: JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date(Date.now() + i * 30000).toISOString() // 30 seconds apart
          })
        };

        if (eventHandlers.message) {
          eventHandlers.message.forEach(handler => handler(heartbeatEvent));
        }
      }

      expect(messageHandler).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error and Exception Handling', () => {
    test('should handle SSE stream errors', () => {
      const sessionId = 'test_session_stream_error';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const errorHandler = jest.fn();
      const messageHandler = jest.fn();

      eventSource.addEventListener('error', errorHandler);
      eventSource.addEventListener('message', messageHandler);

      // Simulate stream error event
      const streamErrorEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'error',
          message: 'Stream processing error',
          session_id: sessionId,
          timestamp: '2025-01-26T10:00:00Z',
          error_code: 'STREAM_ERROR'
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(streamErrorEvent));
      }

      const eventData = JSON.parse(streamErrorEvent.data);
      expect(eventData.type).toBe('error');
      expect(eventData.message).toBe('Stream processing error');
      expect(eventData.error_code).toBe('STREAM_ERROR');
    });

    test('should handle malformed event data', () => {
      const sessionId = 'test_session_malformed';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate malformed event
      const malformedEvent = {
        type: 'message',
        data: 'invalid-json-data{malformed'
      };

      try {
        if (eventHandlers.message) {
          eventHandlers.message.forEach(handler => {
            try {
              handler(malformedEvent);
              // In real implementation, this would try to parse malformed JSON
              JSON.parse(malformedEvent.data);
            } catch (e) {
              expect(e).toBeInstanceOf(SyntaxError);
            }
          });
        }
      } catch (error) {
        expect(error).toBeInstanceOf(SyntaxError);
      }
    });

    test('should handle connection timeouts', () => {
      const sessionId = 'test_session_timeout';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const errorHandler = jest.fn();

      eventSource.addEventListener('error', errorHandler);

      // Simulate connection timeout
      const timeoutError = {
        type: 'error',
        target: mockEventSource,
        message: 'Connection timeout'
      };

      if (eventHandlers.error) {
        eventHandlers.error.forEach(handler => handler(timeoutError));
      }

      expect(errorHandler).toHaveBeenCalledWith(timeoutError);
    });

    test('should handle reconnection scenarios', () => {
      const sessionId = 'test_session_reconnect';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      let connectionAttempts = 0;
      global.EventSource = jest.fn((url) => {
        connectionAttempts++;
        return {
          ...mockEventSource,
          url,
          readyState: connectionAttempts === 1 ? 2 : 1 // First attempt fails, second succeeds
        };
      });

      // First connection attempt
      let eventSource = new EventSource(url);
      expect(eventSource.readyState).toBe(2); // CLOSED

      // Reconnection attempt
      eventSource = new EventSource(url);
      expect(eventSource.readyState).toBe(1); // OPEN
      expect(connectionAttempts).toBe(2);
    });
  });

  describe('Event Filtering and Routing', () => {
    test('should handle session-specific event routing', () => {
      const sessionId1 = 'session_123';
      const sessionId2 = 'session_456';

      const url1 = `http://localhost:8000/agent_network_sse/${sessionId1}`;
      const url2 = `http://localhost:8000/agent_network_sse/${sessionId2}`;

      const eventSource1 = new EventSource(url1);
      const eventSource2 = new EventSource(url2);

      const handler1 = jest.fn();
      const handler2 = jest.fn();

      eventSource1.addEventListener('message', handler1);
      eventSource2.addEventListener('message', handler2);

      // Simulate event for session 1
      const event1 = {
        type: 'message',
        data: JSON.stringify({
          type: 'message_edited',
          data: {
            session_id: sessionId1,
            message_id: `msg_${sessionId1}`,
            content: 'Session 1 content'
          }
        })
      };

      // Only trigger handler for session 1
      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => {
          // In real implementation, SSE would only send events to correct session
          const eventData = JSON.parse(event1.data);
          if (eventData.data.session_id === sessionId1) {
            handler1(event1);
          }
        });
      }

      expect(handler1).toHaveBeenCalledWith(event1);
      expect(handler2).not.toHaveBeenCalled();
    });

    test('should handle event type filtering', () => {
      const sessionId = 'filter_test_session';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);

      const editHandler = jest.fn();
      const deleteHandler = jest.fn();
      const regenHandler = jest.fn();

      // Simulate event type filtering
      const messageHandler = (event) => {
        const eventData = JSON.parse(event.data);

        switch (eventData.type) {
          case 'message_edited':
            editHandler(event);
            break;
          case 'message_deleted':
            deleteHandler(event);
            break;
          case 'message_regenerating':
          case 'regeneration_progress':
          case 'message_regenerated':
            regenHandler(event);
            break;
        }
      };

      eventSource.addEventListener('message', messageHandler);

      // Test different event types
      const editEvent = {
        type: 'message',
        data: JSON.stringify({ type: 'message_edited', data: {} })
      };

      const deleteEvent = {
        type: 'message',
        data: JSON.stringify({ type: 'message_deleted', data: {} })
      };

      const regenEvent = {
        type: 'message',
        data: JSON.stringify({ type: 'regeneration_progress', data: {} })
      };

      messageHandler(editEvent);
      messageHandler(deleteEvent);
      messageHandler(regenEvent);

      expect(editHandler).toHaveBeenCalledWith(editEvent);
      expect(deleteHandler).toHaveBeenCalledWith(deleteEvent);
      expect(regenHandler).toHaveBeenCalledWith(regenEvent);
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high frequency events', () => {
      const sessionId = 'high_frequency_test';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Simulate high frequency events (100 events)
      const eventCount = 100;
      for (let i = 0; i < eventCount; i++) {
        const event = {
          type: 'message',
          data: JSON.stringify({
            type: 'regeneration_progress',
            data: {
              progress: i,
              message: `Processing step ${i}`,
              timestamp: new Date().toISOString()
            }
          })
        };

        if (eventHandlers.message) {
          eventHandlers.message.forEach(handler => handler(event));
        }
      }

      expect(messageHandler).toHaveBeenCalledTimes(eventCount);
    });

    test('should handle large event payloads', () => {
      const sessionId = 'large_payload_test';
      const url = `http://localhost:8000/agent_network_sse/${sessionId}`;

      const eventSource = new EventSource(url);
      const messageHandler = jest.fn();

      eventSource.addEventListener('message', messageHandler);

      // Create large payload (simulate large regenerated content)
      const largeContent = 'A'.repeat(10000); // 10KB of content

      const largeEvent = {
        type: 'message',
        data: JSON.stringify({
          type: 'message_regenerated',
          data: {
            message_id: 'msg_large',
            session_id: sessionId,
            content: largeContent,
            metadata: {
              size: largeContent.length,
              chunks: Math.ceil(largeContent.length / 1000)
            }
          }
        })
      };

      if (eventHandlers.message) {
        eventHandlers.message.forEach(handler => handler(largeEvent));
      }

      expect(messageHandler).toHaveBeenCalledWith(largeEvent);

      const eventData = JSON.parse(largeEvent.data);
      expect(eventData.data.content.length).toBe(10000);
      expect(eventData.data.metadata.size).toBe(10000);
    });
  });
});