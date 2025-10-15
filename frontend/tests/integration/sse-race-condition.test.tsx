/**
 * Integration tests for P0-001: SSE Race Condition Fix
 *
 * Tests the SSE connection state machine and message queue to ensure
 * rapid sequential messages don't cause connection conflicts.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import {
  ensureSSEReady,
  waitForSSEConnection,
  getExtendedSSEState,
  SSEMessageQueue,
  waitForSSEState
} from '@/hooks/chat/sse-connection-helpers';
import { SSEHookReturn, SSEConnectionState } from '@/hooks/useSSE';

// Mock SSE connection for testing
const createMockSSE = (initialState: SSEConnectionState = 'disconnected'): SSEHookReturn => {
  let state: SSEConnectionState = initialState;
  let isConnecting = false;

  const mock: SSEHookReturn = {
    connectionState: state,
    lastEvent: null,
    events: [],
    error: null,
    isConnected: state === 'connected',
    reconnectAttempt: 0,

    connect: jest.fn(() => {
      if (state === 'connected' || isConnecting) return;
      isConnecting = true;
      state = 'connecting';
      mock.connectionState = state;

      // Simulate async connection after 50ms
      setTimeout(() => {
        state = 'connected';
        mock.connectionState = state;
        mock.isConnected = true;
        isConnecting = false;
      }, 50);
    }),

    disconnect: jest.fn(() => {
      if (state === 'disconnected') return;
      state = 'disconnecting';
      mock.connectionState = 'disconnected';

      // Simulate async disconnection after 30ms
      setTimeout(() => {
        state = 'disconnected';
        mock.connectionState = state;
        mock.isConnected = false;
      }, 30);
    }),

    reconnect: jest.fn(),
    clearEvents: jest.fn(),
  };

  return mock;
};

describe('P0-001: SSE Race Condition Fix', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('ensureSSEReady', () => {
    it('should disconnect and wait for clean disconnection', async () => {
      const mockSSE = createMockSSE('connected');

      const promise = ensureSSEReady(mockSSE, 5000);

      // Fast-forward through disconnection
      await jest.runAllTimersAsync();

      await promise;

      expect(mockSSE.disconnect).toHaveBeenCalled();
      expect(mockSSE.connectionState).toBe('disconnected');
    });

    it('should handle already disconnected SSE', async () => {
      const mockSSE = createMockSSE('disconnected');

      const promise = ensureSSEReady(mockSSE, 5000);
      await jest.runAllTimersAsync();
      await promise;

      // Should not try to disconnect if already disconnected
      expect(mockSSE.disconnect).not.toHaveBeenCalled();
    });

    it('should handle undefined SSE', async () => {
      const promise = ensureSSEReady(undefined, 5000);
      await jest.runAllTimersAsync();
      await expect(promise).resolves.toBeUndefined();
    });

    it('should timeout if disconnection takes too long', async () => {
      const mockSSE = createMockSSE('connected');

      // Override disconnect to never complete
      mockSSE.disconnect = jest.fn(() => {
        mockSSE.connectionState = 'disconnecting';
        // Never transition to disconnected
      });

      const promise = ensureSSEReady(mockSSE, 100);

      await jest.advanceTimersByTime(150);

      await expect(promise).rejects.toThrow(/timeout/i);
    });
  });

  describe('waitForSSEConnection', () => {
    it('should wait for SSE to connect', async () => {
      const mockSSE = createMockSSE('disconnected');

      // Start connection
      mockSSE.connect();

      const promise = waitForSSEConnection(mockSSE, 5000);

      // Fast-forward through connection process
      await jest.runAllTimersAsync();

      await promise;

      expect(mockSSE.connectionState).toBe('connected');
    });

    it('should throw error for undefined SSE', async () => {
      await expect(waitForSSEConnection(undefined, 5000))
        .rejects.toThrow('SSE connection not initialized');
    });

    it('should timeout if connection takes too long', async () => {
      const mockSSE = createMockSSE('disconnected');

      // Override connect to never complete
      mockSSE.connect = jest.fn(() => {
        mockSSE.connectionState = 'connecting';
        // Never transition to connected
      });

      mockSSE.connect();

      const promise = waitForSSEConnection(mockSSE, 100);

      await jest.advanceTimersByTime(150);

      await expect(promise).rejects.toThrow(/timeout/i);
    });
  });

  describe('SSEMessageQueue', () => {
    it('should process messages sequentially', async () => {
      const queue = new SSEMessageQueue();
      const results: number[] = [];

      // Enqueue 3 operations that take different times
      const op1 = queue.enqueue(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        results.push(1);
      });

      const op2 = queue.enqueue(async () => {
        await new Promise(resolve => setTimeout(resolve, 30));
        results.push(2);
      });

      const op3 = queue.enqueue(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        results.push(3);
      });

      // Fast-forward through all operations
      await jest.runAllTimersAsync();

      await Promise.all([op1, op2, op3]);

      // Operations should complete in order, not by duration
      expect(results).toEqual([1, 2, 3]);
    });

    it('should handle rapid sequential enqueues', async () => {
      const queue = new SSEMessageQueue();
      const results: number[] = [];

      // Rapidly enqueue 10 operations
      const operations = Array.from({ length: 10 }, (_, i) =>
        queue.enqueue(async () => {
          results.push(i);
        })
      );

      await jest.runAllTimersAsync();
      await Promise.all(operations);

      // All operations should complete in order
      expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should continue processing queue if one operation fails', async () => {
      const queue = new SSEMessageQueue();
      const results: number[] = [];

      const op1 = queue.enqueue(async () => {
        results.push(1);
      });

      const op2 = queue.enqueue(async () => {
        throw new Error('Operation 2 failed');
      });

      const op3 = queue.enqueue(async () => {
        results.push(3);
      });

      await jest.runAllTimersAsync();

      await op1;
      await expect(op2).rejects.toThrow('Operation 2 failed');
      await op3;

      // Operations 1 and 3 should still complete
      expect(results).toEqual([1, 3]);
    });

    it('should track queue size and processing state', async () => {
      const queue = new SSEMessageQueue();

      expect(queue.size).toBe(0);
      expect(queue.isProcessing).toBe(false);

      const op1 = queue.enqueue(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(queue.size).toBe(1);

      // Start processing
      await jest.advanceTimersByTime(10);
      expect(queue.isProcessing).toBe(true);

      // Complete operation
      await jest.runAllTimersAsync();
      await op1;

      expect(queue.size).toBe(0);
      expect(queue.isProcessing).toBe(false);
    });

    it('should clear pending operations', async () => {
      const queue = new SSEMessageQueue();
      const results: number[] = [];

      queue.enqueue(async () => results.push(1));
      queue.enqueue(async () => results.push(2));
      queue.enqueue(async () => results.push(3));

      expect(queue.size).toBe(3);

      queue.clear();

      expect(queue.size).toBe(0);
      expect(queue.isProcessing).toBe(false);

      await jest.runAllTimersAsync();

      // No operations should have executed
      expect(results).toEqual([]);
    });
  });

  describe('Rapid Sequential Messages (Core Issue)', () => {
    it('should handle two messages sent within 100ms without race condition', async () => {
      const mockSSE = createMockSSE('disconnected');
      const queue = new SSEMessageQueue();
      const messageResults: string[] = [];

      // Simulate sending first message
      const message1 = queue.enqueue(async () => {
        await ensureSSEReady(mockSSE, 5000);
        mockSSE.connect();
        await waitForSSEConnection(mockSSE, 5000);
        messageResults.push('message1');
      });

      // Simulate sending second message 50ms later (< 100ms)
      setTimeout(() => {
        queue.enqueue(async () => {
          await ensureSSEReady(mockSSE, 5000);
          mockSSE.connect();
          await waitForSSEConnection(mockSSE, 5000);
          messageResults.push('message2');
        });
      }, 50);

      // Fast-forward through all operations
      await jest.runAllTimersAsync();
      await message1;

      // Both messages should complete successfully
      expect(messageResults).toEqual(['message1', 'message2']);
      expect(mockSSE.connectionState).toBe('connected');
    });

    it('should handle three rapid messages without conflicts', async () => {
      const mockSSE = createMockSSE('disconnected');
      const queue = new SSEMessageQueue();
      const connectionCalls: string[] = [];

      // Track all connect/disconnect calls
      const originalConnect = mockSSE.connect;
      const originalDisconnect = mockSSE.disconnect;

      mockSSE.connect = jest.fn(() => {
        connectionCalls.push('connect');
        originalConnect();
      });

      mockSSE.disconnect = jest.fn(() => {
        connectionCalls.push('disconnect');
        originalDisconnect();
      });

      // Send three rapid messages
      const ops = [1, 2, 3].map(i =>
        queue.enqueue(async () => {
          await ensureSSEReady(mockSSE, 5000);
          mockSSE.connect();
          await waitForSSEConnection(mockSSE, 5000);
        })
      );

      await jest.runAllTimersAsync();
      await Promise.all(ops);

      // Should have sequential disconnect-connect patterns
      // First message: connect
      // Second message: disconnect, connect
      // Third message: disconnect, connect
      expect(connectionCalls).toContain('connect');
      expect(connectionCalls).toContain('disconnect');

      // No overlapping connections
      expect(mockSSE.connectionState).toBe('connected');
    });

    it('should handle timeout scenarios gracefully', async () => {
      const mockSSE = createMockSSE('connected');

      // Simulate stuck connection that never disconnects
      mockSSE.disconnect = jest.fn(() => {
        // Intentionally never complete disconnection
      });

      const promise = ensureSSEReady(mockSSE, 100);

      await jest.advanceTimersByTime(150);

      await expect(promise).rejects.toThrow(/timeout/i);
    });
  });

  describe('getExtendedSSEState', () => {
    it('should map SSE connection states correctly', () => {
      expect(getExtendedSSEState(undefined)).toBe('idle');

      expect(getExtendedSSEState(createMockSSE('disconnected'))).toBe('idle');
      expect(getExtendedSSEState(createMockSSE('connecting'))).toBe('connecting');
      expect(getExtendedSSEState(createMockSSE('connected'))).toBe('connected');
      expect(getExtendedSSEState(createMockSSE('error'))).toBe('error');
    });
  });
});
