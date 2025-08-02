/**
 * ADKClient tests
 * 
 * Tests for the unified ADK client service including initialization,
 * message sending, event handling, and service orchestration.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ADKClient } from '../adk-client';
import type { ADKConfig, Session, MessageMetadata } from '@/types/adk-service';
import type { ADKSSEEvent } from '@/types/adk-events';

// Mock dependencies
vi.mock('../session-service', () => ({
  SessionService: vi.fn().mockImplementation(() => ({
    getOrCreateSession: vi.fn().mockResolvedValue({
      id: 'session_123',
      userId: 'user_123',
      title: 'Test Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    getCurrentSession: vi.fn().mockReturnValue({
      id: 'session_123',
      userId: 'user_123',
      title: 'Test Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    clearSession: vi.fn(),
    refreshSession: vi.fn().mockResolvedValue({
      id: 'session_123',
      userId: 'user_123',
      title: 'Refreshed Session',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  })),
}));

vi.mock('../sse-manager', () => ({
  SSEManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    getConnectionInfo: vi.fn().mockReturnValue({
      state: 'CONNECTED',
      reconnectAttempts: 0,
    }),
    getPerformanceMetrics: vi.fn().mockReturnValue({
      connectionTime: 100,
      messagesSent: 5,
      messagesReceived: 3,
      errors: 0,
    }),
    on: vi.fn(),
  })),
}));

vi.mock('../message-transformer', () => ({
  MessageTransformer: vi.fn().mockImplementation(() => ({
    createUserMessage: vi.fn().mockReturnValue({
      type: 'user_message',
      content: 'Test message',
      metadata: { messageId: 'msg_123' },
    }),
    transformADKEvent: vi.fn().mockReturnValue([
      {
        type: 'message_received',
        data: { content: 'Agent response' },
      },
    ]),
  })),
}));

vi.mock('../event-store', () => ({
  EventStore: vi.fn().mockImplementation(() => ({
    addEvent: vi.fn(),
    getEventHistory: vi.fn().mockReturnValue([
      {
        id: 'evt_123',
        type: 'system:client_initialized',
        timestamp: Date.now(),
        sessionId: 'session_123',
        data: { userId: 'user_123' },
      },
    ]),
    subscribe: vi.fn().mockReturnValue(() => {}),
    clearEvents: vi.fn(),
    getDebugInfo: vi.fn().mockReturnValue({
      eventCount: 5,
      oldestEvent: Date.now() - 10000,
      newestEvent: Date.now(),
    }),
  })),
}));

describe('ADKClient', () => {
  let client: ADKClient;
  let config: ADKConfig;

  beforeEach(() => {
    config = {
      baseUrl: 'http://localhost:8081',
      apiKey: 'test-api-key',
      enableLogging: false, // Disable logging for tests
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
    };

    client = new ADKClient(config);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should create client with default configuration', () => {
      const defaultClient = new ADKClient({ baseUrl: 'http://localhost:8081' });
      expect(defaultClient).toBeInstanceOf(ADKClient);
    });

    it('should initialize client for a user', async () => {
      const userId = 'user_123';

      await client.initialize(userId);

      expect(client.isConnected()).toBe(true);
    });

    it('should handle initialization error', async () => {
      const mockSessionService = vi.mocked(client['sessionService']);
      mockSessionService.getOrCreateSession.mockRejectedValueOnce(
        new Error('Session creation failed')
      );

      await expect(client.initialize('user_123')).rejects.toThrow(
        'Session creation failed'
      );
    });

    it('should not reinitialize for same user', async () => {
      const userId = 'user_123';

      await client.initialize(userId);
      const sessionServiceSpy = vi.spied(client['sessionService'].getOrCreateSession);
      
      await client.initialize(userId);
      
      // Should not call getOrCreateSession again
      expect(sessionServiceSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Message Sending', () => {
    beforeEach(async () => {
      await client.initialize('user_123');
    });

    it('should send message successfully', async () => {
      const content = 'Test message content';
      const metadata: MessageMetadata = {
        messageId: 'msg_123',
        timestamp: new Date().toISOString(),
      };

      await client.sendMessage(content, metadata);

      const mockSSEManager = vi.mocked(client['sseManager']);
      expect(mockSSEManager.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user_message',
          content: 'Test message content',
        })
      );
    });

    it('should reject empty message content', async () => {
      await expect(client.sendMessage('')).rejects.toThrow(
        'Message content cannot be empty.'
      );

      await expect(client.sendMessage('   ')).rejects.toThrow(
        'Message content cannot be empty.'
      );
    });

    it('should reject message when not initialized', async () => {
      const uninitializedClient = new ADKClient(config);

      await expect(
        uninitializedClient.sendMessage('Test message')
      ).rejects.toThrow('Client not initialized. Call initialize() first.');
    });

    it('should handle send message error', async () => {
      const mockSSEManager = vi.mocked(client['sseManager']);
      mockSSEManager.sendMessage.mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(client.sendMessage('Test message')).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('Connection Management', () => {
    it('should get connection information', () => {
      const connectionInfo = client.getConnectionInfo();

      expect(connectionInfo).toEqual({
        state: 'CONNECTED',
        reconnectAttempts: 0,
      });
    });

    it('should check connection status', async () => {
      expect(client.isConnected()).toBe(false);

      await client.initialize('user_123');

      expect(client.isConnected()).toBe(true);
    });

    it('should disconnect client', async () => {
      await client.initialize('user_123');
      expect(client.isConnected()).toBe(true);

      client.disconnect();

      expect(client.isConnected()).toBe(false);
      const mockSSEManager = vi.mocked(client['sseManager']);
      expect(mockSSEManager.disconnect).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await client.initialize('user_123');
    });

    it('should get current session', () => {
      const session = client.getCurrentSession();

      expect(session).toEqual({
        id: 'session_123',
        userId: 'user_123',
        title: 'Test Session',
        status: 'active',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should refresh session', async () => {
      await client.refreshSession();

      const mockSessionService = vi.mocked(client['sessionService']);
      expect(mockSessionService.refreshSession).toHaveBeenCalled();
    });

    it('should handle refresh session error', async () => {
      const mockSessionService = vi.mocked(client['sessionService']);
      mockSessionService.refreshSession.mockRejectedValueOnce(
        new Error('Refresh failed')
      );

      await expect(client.refreshSession()).rejects.toThrow('Refresh failed');
    });
  });

  describe('Event Management', () => {
    beforeEach(async () => {
      await client.initialize('user_123');
    });

    it('should get event history', () => {
      const history = client.getEventHistory();

      expect(history).toEqual([
        {
          id: 'evt_123',
          type: 'system:client_initialized',
          timestamp: expect.any(Number),
          sessionId: 'session_123',
          data: { userId: 'user_123' },
        },
      ]);
    });

    it('should subscribe to events', () => {
      const mockCallback = vi.fn();
      const eventTypes = ['message_received', 'status_update'];

      const unsubscribe = client.subscribeToEvents(eventTypes, mockCallback);

      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
    });

    it('should clear event history', () => {
      client.clearEventHistory();

      const mockEventStore = vi.mocked(client['eventStore']);
      expect(mockEventStore.clearEvents).toHaveBeenCalled();
    });
  });

  describe('Debug Information', () => {
    beforeEach(async () => {
      await client.initialize('user_123');
    });

    it('should provide debug information', () => {
      const debugInfo = client.getDebugInfo();

      expect(debugInfo).toEqual({
        initialized: true,
        userId: 'user_123',
        session: expect.any(Object),
        connection: expect.any(Object),
        performance: expect.any(Object),
        events: expect.any(Object),
      });
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      await client.initialize('user_123');
    });

    it('should handle ADK events through event handlers', () => {
      // Test that event handlers are set up correctly
      const mockSSEManager = vi.mocked(client['sseManager']);
      expect(mockSSEManager.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockSSEManager.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(mockSSEManager.on).toHaveBeenCalledWith('adk_event', expect.any(Function));
    });

    it('should transform and emit UI events', () => {
      const mockEvent: ADKSSEEvent = {
        author: 'agent',
        content: 'Test response',
        timestamp: new Date().toISOString(),
      };

      const emitSpy = vi.spyOn(client, 'emit');

      // Simulate ADK event handling
      client['handleADKEvent'](mockEvent, 'request_123');

      expect(emitSpy).toHaveBeenCalledWith('message_received', expect.any(Object));
    });

    it('should handle ADK event processing errors', () => {
      const mockTransformer = vi.mocked(client['messageTransformer']);
      mockTransformer.transformADKEvent.mockImplementationOnce(() => {
        throw new Error('Transform error');
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const emitSpy = vi.spyOn(client, 'emit');

      const mockEvent: ADKSSEEvent = {
        author: 'agent',
        content: 'Test response',
        timestamp: new Date().toISOString(),
      };

      client['handleADKEvent'](mockEvent, 'request_123');

      expect(emitSpy).toHaveBeenCalledWith('error', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await client.initialize('user_123');
    });

    it('should track performance metrics', () => {
      const debugInfo = client.getDebugInfo();

      expect(debugInfo.performance).toEqual({
        connectionTime: 100,
        messagesSent: 5,
        messagesReceived: 3,
        errors: 0,
      });
    });
  });

  describe('Configuration', () => {
    it('should merge custom configuration with defaults', () => {
      const customConfig: ADKConfig = {
        baseUrl: 'http://custom.test',
        maxRetries: 10,
      };

      const customClient = new ADKClient(customConfig);

      // Verify configuration is merged properly
      expect(customClient['config']).toEqual({
        baseUrl: 'http://custom.test',
        maxRetries: 10,
        retryDelay: 1000, // default
        timeout: 30000, // default
        enableLogging: true, // default
      });
    });

    it('should handle logging configuration', () => {
      const loggingClient = new ADKClient({
        baseUrl: 'http://localhost:8081',
        enableLogging: true,
      });

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      loggingClient['log']('Test log message');

      expect(consoleSpy).toHaveBeenCalledWith('[ADKClient]', 'Test log message');

      consoleSpy.mockRestore();
    });

    it('should respect logging disabled configuration', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      client['log']('Test log message');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should emit errors from service operations', async () => {
      const mockSSEManager = vi.mocked(client['sseManager']);
      mockSSEManager.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const errorHandler = vi.fn();
      client.on('error', errorHandler);

      await expect(client.initialize('user_123')).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle service initialization errors gracefully', async () => {
      const mockSessionService = vi.mocked(client['sessionService']);
      mockSessionService.getOrCreateSession.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const errorHandler = vi.fn();
      client.on('error', errorHandler);

      await expect(client.initialize('user_123')).rejects.toThrow();

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Event ID Generation', () => {
    it('should generate unique event IDs', () => {
      const id1 = client['generateEventId']();
      const id2 = client['generateEventId']();

      expect(id1).toMatch(/^evt_\d+_[a-z0-9]{6}$/);
      expect(id2).toMatch(/^evt_\d+_[a-z0-9]{6}$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('System Events', () => {
    beforeEach(async () => {
      await client.initialize('user_123');
    });

    it('should add system events to store', () => {
      const mockEventStore = vi.mocked(client['eventStore']);

      client['addSystemEvent']('test_event', { data: 'test' });

      expect(mockEventStore.addEvent).toHaveBeenCalledWith({
        id: expect.stringMatching(/^evt_\d+_[a-z0-9]{6}$/),
        type: 'system:test_event',
        timestamp: expect.any(Number),
        sessionId: 'session_123',
        data: { data: 'test' },
      });
    });
  });
});