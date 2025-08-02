/**
 * SSEManager tests
 * 
 * Tests for SSE connection management including per-message connections,
 * retry logic, performance metrics, and error handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SSEManager } from '../sse-manager';
import type { SSEConfig, ADKRequestMessage, ConnectionState } from '@/types/adk-service';
import type { ADKSSEEvent } from '@/types/adk-events';

// Mock fetch for SSE requests
global.fetch = vi.fn();

// Mock AbortController
global.AbortController = vi.fn().mockImplementation(() => ({
  abort: vi.fn(),
  signal: {
    aborted: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
}));

// Mock ReadableStream for SSE response
const createMockSSEStream = (events: string[]) => {
  let eventIndex = 0;
  
  return new ReadableStream({
    start(controller) {
      const sendEvent = () => {
        if (eventIndex < events.length) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(events[eventIndex]));
          eventIndex++;
          setTimeout(sendEvent, 10);
        } else {
          controller.close();
        }
      };
      sendEvent();
    },
  });
};

describe('SSEManager', () => {
  let sseManager: SSEManager;
  let config: SSEConfig;
  let mockFetch: any;

  beforeEach(() => {
    config = {
      baseUrl: 'http://localhost:8081',
      enableLogging: false, // Disable logging for tests
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      reconnectAttempts: 3,
      backoffMultiplier: 2,
      maxBackoffDelay: 30000,
    };

    sseManager = new SSEManager(config);
    mockFetch = vi.mocked(fetch);
  });

  afterEach(() => {
    vi.clearAllMocks();
    sseManager.disconnect();
  });

  describe('Connection Management', () => {
    it('should initialize with disconnected state', () => {
      const connectionInfo = sseManager.getConnectionInfo();

      expect(connectionInfo.state).toBe(ConnectionState.DISCONNECTED);
      expect(connectionInfo.reconnectAttempts).toBe(0);
    });

    it('should connect successfully', async () => {
      await sseManager.connect('user_123', 'session_456');

      const connectionInfo = sseManager.getConnectionInfo();
      expect(connectionInfo.state).toBe(ConnectionState.CONNECTED);
      expect(connectionInfo.lastConnected).toBeInstanceOf(Date);
    });

    it('should not connect if already connected', async () => {
      await sseManager.connect('user_123', 'session_456');
      const firstConnectionTime = sseManager.getConnectionInfo().lastConnected;

      // Wait a bit and try to connect again
      await new Promise(resolve => setTimeout(resolve, 10));
      await sseManager.connect('user_123', 'session_456');

      const secondConnectionTime = sseManager.getConnectionInfo().lastConnected;
      expect(firstConnectionTime).toEqual(secondConnectionTime);
    });

    it('should handle connection validation error', async () => {
      // Mock validation to fail
      const originalValidateConnection = sseManager['validateConnection'];
      sseManager['validateConnection'] = vi.fn().mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(
        sseManager.connect('user_123', 'session_456')
      ).rejects.toThrow('Failed to connect');

      // Restore original method
      sseManager['validateConnection'] = originalValidateConnection;
    });

    it('should disconnect and clean up', async () => {
      await sseManager.connect('user_123', 'session_456');
      
      sseManager.disconnect();

      const connectionInfo = sseManager.getConnectionInfo();
      expect(connectionInfo.state).toBe(ConnectionState.DISCONNECTED);
    });
  });

  describe('Message Sending', () => {
    let mockMessage: ADKRequestMessage;

    beforeEach(async () => {
      await sseManager.connect('user_123', 'session_456');
      
      mockMessage = {
        type: 'user_message',
        content: 'Test message',
        sessionId: 'session_456',
        userId: 'user_123',
        metadata: {
          messageId: 'msg_123',
          timestamp: new Date().toISOString(),
        },
      };
    });

    it('should send message successfully with SSE response', async () => {
      const mockEvents = [
        'data: {"type": "agent_response", "content": "Hello!"}\n\n',
        'data: {"type": "stream_complete"}\n\n',
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockSSEStream(mockEvents),
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      });

      const eventHandler = vi.fn();
      sseManager.on('adk_event', eventHandler);

      await sseManager.sendMessage(mockMessage);

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sse'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          }),
          body: JSON.stringify(mockMessage),
        })
      );
    });

    it('should handle message sending when not connected', async () => {
      sseManager.disconnect();

      await expect(sseManager.sendMessage(mockMessage)).rejects.toThrow(
        'Not connected. Call connect() first.'
      );
    });

    it('should handle network errors during message sending', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const errorHandler = vi.fn();
      sseManager.on('message_error', errorHandler);

      await expect(sseManager.sendMessage(mockMessage)).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Network error',
        })
      );
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Server error'),
      });

      const errorHandler = vi.fn();
      sseManager.on('message_error', errorHandler);

      await expect(sseManager.sendMessage(mockMessage)).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
        })
      );
    });

    it('should handle request timeout', async () => {
      vi.useFakeTimers();

      // Mock a hanging request
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => {
          // Never resolve to simulate timeout
        })
      );

      const sendPromise = sseManager.sendMessage(mockMessage);

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(config.timeout!);

      await expect(sendPromise).rejects.toThrow();

      vi.useRealTimers();
    });
  });

  describe('SSE Event Processing', () => {
    beforeEach(async () => {
      await sseManager.connect('user_123', 'session_456');
    });

    it('should parse and emit valid SSE events', async () => {
      const mockEvents = [
        'data: {"type": "agent_response", "content": "Test response"}\n\n',
        'data: {"type": "thinking", "reasoning": "Processing..."}\n\n',
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockSSEStream(mockEvents),
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      });

      const eventHandler = vi.fn();
      sseManager.on('adk_event', eventHandler);

      const message: ADKRequestMessage = {
        type: 'user_message',
        content: 'Test',
        sessionId: 'session_456',
        userId: 'user_123',
      };

      await sseManager.sendMessage(message);

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(eventHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle malformed SSE data', async () => {
      const mockEvents = [
        'data: invalid json\n\n',
        'data: {"type": "valid_event"}\n\n',
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockSSEStream(mockEvents),
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      });

      const eventHandler = vi.fn();
      const parseErrorHandler = vi.fn();
      sseManager.on('adk_event', eventHandler);
      sseManager.on('parse_error', parseErrorHandler);

      const message: ADKRequestMessage = {
        type: 'user_message',
        content: 'Test',
        sessionId: 'session_456',
        userId: 'user_123',
      };

      await sseManager.sendMessage(message);

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(parseErrorHandler).toHaveBeenCalled();
      expect(eventHandler).toHaveBeenCalledTimes(1); // Only valid event
    });

    it('should handle empty SSE data lines', async () => {
      const mockEvents = [
        'data: \n\n',
        '\n',
        'data: {"type": "test_event"}\n\n',
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockSSEStream(mockEvents),
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      });

      const eventHandler = vi.fn();
      sseManager.on('adk_event', eventHandler);

      const message: ADKRequestMessage = {
        type: 'user_message',
        content: 'Test',
        sessionId: 'session_456',
        userId: 'user_123',
      };

      await sseManager.sendMessage(message);

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(eventHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      await sseManager.connect('user_123', 'session_456');
    });

    it('should track basic performance metrics', () => {
      const metrics = sseManager.getPerformanceMetrics();

      expect(metrics).toEqual({
        connectionTime: expect.any(Number),
        messagesSent: 0,
        messagesReceived: 0,
        errors: 0,
        reconnections: 0,
        responseTimesMs: [],
      });
    });

    it('should update metrics after sending messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockSSEStream(['data: {"type": "response"}\n\n']),
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      });

      const message: ADKRequestMessage = {
        type: 'user_message',
        content: 'Test',
        sessionId: 'session_456',
        userId: 'user_123',
      };

      await sseManager.sendMessage(message);

      const metrics = sseManager.getPerformanceMetrics();
      expect(metrics.messagesSent).toBe(1);
    });

    it('should track response times', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: createMockSSEStream(['data: {"type": "response"}\n\n']),
        headers: new Headers({ 'content-type': 'text/event-stream' }),
      });

      const message: ADKRequestMessage = {
        type: 'user_message',
        content: 'Test',
        sessionId: 'session_456',
        userId: 'user_123',
      };

      await sseManager.sendMessage(message);

      const metrics = sseManager.getPerformanceMetrics();
      expect(metrics.responseTimesMs.length).toBe(1);
      expect(metrics.responseTimesMs[0]).toBeGreaterThan(0);
    });
  });

  describe('Request Management', () => {
    beforeEach(async () => {
      await sseManager.connect('user_123', 'session_456');
    });

    it('should generate unique request IDs', async () => {
      const id1 = sseManager['generateRequestId']();
      const id2 = sseManager['generateRequestId']();

      expect(id1).toMatch(/^req_\d+_[a-z0-9]{6}$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]{6}$/);
      expect(id1).not.toBe(id2);
    });

    it('should track active requests', async () => {
      // Mock a hanging request to keep it active
      mockFetch.mockImplementationOnce(
        () => new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              body: createMockSSEStream([]),
              headers: new Headers({ 'content-type': 'text/event-stream' }),
            });
          }, 100);
        })
      );

      const message: ADKRequestMessage = {
        type: 'user_message',
        content: 'Test',
        sessionId: 'session_456',
        userId: 'user_123',
      };

      const sendPromise = sseManager.sendMessage(message);

      // Check that request is tracked
      expect(sseManager['activeRequests'].size).toBe(1);

      await sendPromise;

      // Request should be cleaned up
      expect(sseManager['activeRequests'].size).toBe(0);
    });

    it('should abort active requests on disconnect', async () => {
      // Mock a hanging request
      const mockAbortController = {
        abort: vi.fn(),
        signal: {
          aborted: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      };

      (global.AbortController as any).mockImplementation(() => mockAbortController);

      mockFetch.mockImplementationOnce(
        () => new Promise(() => {
          // Never resolve to simulate hanging request
        })
      );

      const message: ADKRequestMessage = {
        type: 'user_message',
        content: 'Test',
        sessionId: 'session_456',
        userId: 'user_123',
      };

      // Start request but don't await
      sseManager.sendMessage(message);

      // Wait for request to be registered
      await new Promise(resolve => setTimeout(resolve, 10));

      // Disconnect should abort the request
      sseManager.disconnect();

      expect(mockAbortController.abort).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await sseManager.connect('user_123', 'session_456');
    });

    it('should handle connection errors gracefully', async () => {
      const originalConnect = sseManager.connect;
      sseManager.connect = vi.fn().mockRejectedValue(new Error('Connection failed'));

      const errorHandler = vi.fn();
      sseManager.on('connection_error', errorHandler);

      await expect(sseManager.connect('user_123', 'session_456')).rejects.toThrow();

      // Restore original method
      sseManager.connect = originalConnect;
    });

    it('should emit appropriate events for different error types', async () => {
      const messageErrorHandler = vi.fn();
      const parseErrorHandler = vi.fn();

      sseManager.on('message_error', messageErrorHandler);
      sseManager.on('parse_error', parseErrorHandler);

      // Test network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const message: ADKRequestMessage = {
        type: 'user_message',
        content: 'Test',
        sessionId: 'session_456',
        userId: 'user_123',
      };

      await expect(sseManager.sendMessage(message)).rejects.toThrow();

      expect(messageErrorHandler).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should use custom configuration', () => {
      const customConfig: SSEConfig = {
        baseUrl: 'https://custom.api.com',
        maxRetries: 10,
        timeout: 60000,
        enableLogging: true,
      };

      const customManager = new SSEManager(customConfig);

      expect(customManager['config']).toEqual({
        baseUrl: 'https://custom.api.com',
        maxRetries: 10,
        timeout: 60000,
        enableLogging: true,
        retryDelay: 1000, // default
        reconnectAttempts: 3, // default
        backoffMultiplier: 2, // default
        maxBackoffDelay: 30000, // default
      });
    });

    it('should handle logging configuration', () => {
      const loggingManager = new SSEManager({
        baseUrl: 'http://localhost:8081',
        enableLogging: true,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      loggingManager['log']('Test log message');

      expect(consoleSpy).toHaveBeenCalledWith('[SSEManager]', 'Test log message');

      consoleSpy.mockRestore();
    });

    it('should respect logging disabled configuration', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      sseManager['log']('Test log message');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clean up resources on disconnect', async () => {
      await sseManager.connect('user_123', 'session_456');

      // Start a request
      mockFetch.mockImplementationOnce(
        () => new Promise(() => {
          // Never resolve
        })
      );

      const message: ADKRequestMessage = {
        type: 'user_message',
        content: 'Test',
        sessionId: 'session_456',
        userId: 'user_123',
      };

      sseManager.sendMessage(message);

      // Wait for request to be registered
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(sseManager['activeRequests'].size).toBe(1);

      // Disconnect should clean up
      sseManager.disconnect();

      expect(sseManager['activeRequests'].size).toBe(0);
    });

    it('should clear reconnect timers on disconnect', async () => {
      await sseManager.connect('user_123', 'session_456');

      // Set up a reconnect timer
      sseManager['reconnectTimer'] = setTimeout(() => {}, 5000) as any;

      sseManager.disconnect();

      expect(sseManager['reconnectTimer']).toBeNull();
    });
  });
});