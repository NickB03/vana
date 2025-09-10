/**
 * SSE Connection Resilience Tests
 * Tests connection stability, reconnection logic, and network resilience
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSSEClient } from '../../hooks/useSSEClient';

describe('SSE Connection Resilience Tests', () => {
  const sessionId = 'resilience-test-session';
  let cleanup: (() => void)[] = [];

  beforeEach(() => {
    global.EventSource.reset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup.forEach(fn => fn());
    cleanup = [];
    jest.clearAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Connection Stability', () => {
    it('should establish connection successfully', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId, autoReconnect: false })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
        expect(result.current.connectionStatus).toBe('connecting');
      });

      // Simulate successful connection
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onopen) {
          eventSource.onopen(new Event('open'));
        }
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connecting');
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should handle immediate connection failure', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId, autoReconnect: false })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Simulate immediate connection failure
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
        expect(result.current.error).toBeTruthy();
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should maintain connection state accurately', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId })
      );

      // Initial state
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isReconnecting).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connecting');
      });

      // Simulate connection event
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'connection',
            status: 'connected',
            sessionId,
            timestamp: new Date().toISOString()
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.connectionStatus).toBe('connected');
        expect(result.current.isHealthy).toBe(true);
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Automatic Reconnection', () => {
    it('should reconnect after connection loss', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ 
          sessionId, 
          autoReconnect: true,
          maxRetries: 3,
          retryDelay: 1000
        })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Establish connection
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'connection',
            status: 'connected',
            sessionId,
            timestamp: new Date().toISOString()
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate connection loss
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
        expect(result.current.isReconnecting).toBe(true);
      });

      // Fast-forward timer to trigger reconnection
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        // Should have created a new EventSource instance
        expect(global.EventSource.instances.length).toBe(2);
        expect(result.current.retryCount).toBe(1);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should use exponential backoff for retries', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ 
          sessionId, 
          autoReconnect: true,
          maxRetries: 3,
          retryDelay: 100 // Start with 100ms
        })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Simulate repeated failures
      const simulateFailure = () => {
        act(() => {
          const eventSource = global.EventSource.getLatest();
          if (eventSource.onerror) {
            eventSource.onerror(new Event('error'));
          }
        });
      };

      // First failure - should retry after 100ms
      simulateFailure();

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.retryCount).toBe(1);
      });

      // Second failure - should retry after 200ms (exponential backoff)
      simulateFailure();

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(result.current.retryCount).toBe(2);
      });

      // Third failure - should retry after 400ms
      simulateFailure();

      act(() => {
        jest.advanceTimersByTime(400);
      });

      await waitFor(() => {
        expect(result.current.retryCount).toBe(3);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should stop retrying after max attempts', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ 
          sessionId, 
          autoReconnect: true,
          maxRetries: 2,
          retryDelay: 100
        })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Simulate failures exceeding max retries
      for (let i = 0; i < 3; i++) {
        act(() => {
          const eventSource = global.EventSource.getLatest();
          if (eventSource.onerror) {
            eventSource.onerror(new Event('error'));
          }
        });

        if (i < 2) { // Only advance timer for retries
          act(() => {
            jest.advanceTimersByTime(100 * Math.pow(2, i));
          });
        }

        await waitFor(() => {
          expect(result.current.retryCount).toBe(Math.min(i + 1, 2));
        });
      }

      // Should give up after max retries
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
        expect(result.current.isReconnecting).toBe(false);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should reset retry count on successful connection', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ 
          sessionId, 
          autoReconnect: true,
          maxRetries: 3,
          retryDelay: 100
        })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Simulate failure and retry
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.retryCount).toBe(1);
      });

      // Simulate successful reconnection
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'connection',
            status: 'connected',
            sessionId,
            timestamp: new Date().toISOString()
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
        expect(result.current.retryCount).toBe(0);
        expect(result.current.error).toBeNull();
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Manual Reconnection', () => {
    it('should allow manual reconnection', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId, autoReconnect: false })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Simulate connection failure
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
      });

      // Manual reconnect
      act(() => {
        result.current.reconnect();
      });

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(2);
        expect(result.current.connectionStatus).toBe('connecting');
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should disconnect cleanly before reconnecting', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const firstEventSource = global.EventSource.getLatest();
      const closeSpy = jest.spyOn(firstEventSource, 'close');

      // Manual reconnect
      act(() => {
        result.current.reconnect();
      });

      expect(closeSpy).toHaveBeenCalled();

      // Should create new connection after delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(2);
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Heartbeat Monitoring', () => {
    it('should track heartbeat timing', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId, heartbeatTimeout: 5000 })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const heartbeatTime = new Date();

      // Send heartbeat
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'heartbeat',
            timestamp: heartbeatTime.toISOString()
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.lastHeartbeat).toBeTruthy();
        expect(result.current.timeSinceLastHeartbeat).toBeLessThan(1000);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should detect heartbeat timeout', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ 
          sessionId, 
          heartbeatTimeout: 1000 // 1 second timeout
        })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Establish connection
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'connection',
            status: 'connected',
            sessionId,
            timestamp: new Date().toISOString()
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Wait for heartbeat timeout
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.error).toContain('heartbeat timeout');
        expect(result.current.connectionStatus).toBe('error');
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should reset heartbeat timeout on each heartbeat', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ 
          sessionId, 
          heartbeatTimeout: 2000 
        })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Establish connection
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'connection',
            status: 'connected',
            sessionId,
            timestamp: new Date().toISOString()
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send heartbeat before timeout
      act(() => {
        jest.advanceTimersByTime(1500);
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          }));
        }
      });

      // Should not timeout yet
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      // Connection should still be healthy
      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.error).toBeNull();

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Connection Cleanup', () => {
    it('should clean up connections on unmount', async () => {
      const { result, unmount } = renderHook(() => 
        useSSEClient({ sessionId })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      const closeSpy = jest.spyOn(eventSource, 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });

    it('should prevent reconnection after disconnect', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId, autoReconnect: true })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Disconnect manually
      act(() => {
        result.current.disconnect();
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('disconnected');
      });

      // Simulate error after disconnect - should not reconnect
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should remain disconnected
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.isReconnecting).toBe(false);
    });

    it('should clear timers on disconnect', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ 
          sessionId, 
          autoReconnect: true,
          retryDelay: 1000
        })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Trigger reconnection
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
      });

      // Disconnect before retry timer fires
      act(() => {
        result.current.disconnect();
      });

      // Fast-forward timer
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not have created new connection
      expect(result.current.connectionStatus).toBe('disconnected');
    });
  });

  describe('Connection Health Monitoring', () => {
    it('should report connection health accurately', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Initially not healthy (not connected)
      expect(result.current.isHealthy).toBe(false);

      // Establish connection
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'connection',
            status: 'connected',
            sessionId,
            timestamp: new Date().toISOString()
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(true);
      });

      // Simulate error
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onerror) {
          eventSource.onerror(new Event('error'));
        }
      });

      await waitFor(() => {
        expect(result.current.isHealthy).toBe(false);
      });

      cleanup.push(() => result.current.disconnect());
    });

    it('should track time since last heartbeat', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Initially no heartbeat
      expect(result.current.timeSinceLastHeartbeat).toBeNull();

      const heartbeatTime = Date.now();

      // Send heartbeat
      act(() => {
        const eventSource = global.EventSource.getLatest();
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'heartbeat',
            timestamp: new Date(heartbeatTime).toISOString()
          }));
        }
      });

      await waitFor(() => {
        expect(result.current.timeSinceLastHeartbeat).toBeLessThan(100);
      });

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.timeSinceLastHeartbeat).toBeGreaterThan(4900);
      });

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid connection/disconnection cycles', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId, autoReconnect: false })
      );

      for (let i = 0; i < 5; i++) {
        // Connect
        act(() => {
          result.current.connect();
        });

        await waitFor(() => {
          expect(result.current.connectionStatus).toBe('connecting');
        });

        // Disconnect
        act(() => {
          result.current.disconnect();
        });

        await waitFor(() => {
          expect(result.current.connectionStatus).toBe('disconnected');
        });
      }

      // Final state should be stable
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.error).toBeNull();
    });

    it('should handle multiple simultaneous reconnection attempts', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId, autoReconnect: false })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Trigger multiple reconnection attempts
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.reconnect();
        });
      }

      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should not create excessive connections
      expect(global.EventSource.instances.length).toBeLessThan(5);

      cleanup.push(() => result.current.disconnect());
    });
  });
});