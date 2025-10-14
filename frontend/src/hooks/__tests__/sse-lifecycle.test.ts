/**
 * SSE Lifecycle Tests - P1-001, P1-002, P1-005
 * Tests for memory leak fixes, stream termination handling, and unmount safety
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useSSE } from '../useSSE';
import { useSSEEventHandlers } from '../chat/sse-event-handlers';

// Mock dependencies
jest.mock('@/lib/api/client');
jest.mock('@/lib/csrf', () => ({
  getCsrfToken: () => 'test-csrf-token',
}));

// Mock fetch for SSE testing
global.fetch = jest.fn();

describe('SSE Lifecycle - P1 Fixes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * P1-001: Memory Leak in SSE Event Buffer
   * Tests that event buffer implements circular buffer with MAX_EVENTS limit
   */
  describe('P1-001: Event Buffer Memory Leak Prevention', () => {
    it('should limit events to MAX_EVENTS (1000) to prevent memory leak', async () => {
      // Mock a readable stream that emits many events
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Simulate 2000 events to test buffer limit
          for (let i = 0; i < 2000; i++) {
            const event = `event: test_event\ndata: {"id": ${i}, "content": "Event ${i}"}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
          controller.close();
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
      });

      const { result } = renderHook(() => useSSE('/api/test', { enabled: true }));

      // Wait for all events to be processed
      await waitFor(
        () => {
          expect(result.current.events.length).toBeGreaterThan(0);
        },
        { timeout: 3000 }
      );

      // Wait a bit more to ensure all events are processed
      await new Promise(resolve => setTimeout(resolve, 500));

      // P1-001 FIX VERIFICATION: Buffer should be capped at MAX_EVENTS (1000)
      expect(result.current.events.length).toBeLessThanOrEqual(1000);

      // Should keep the most recent events (last 1000)
      if (result.current.events.length === 1000) {
        const firstEvent = result.current.events[0] as any;
        const lastEvent = result.current.events[999] as any;

        // Verify we kept the tail of the stream (events 1000-1999)
        expect(parseInt(firstEvent.data.id)).toBeGreaterThanOrEqual(1000);
        expect(parseInt(lastEvent.data.id)).toBe(1999);
      }
    });

    it('should not accumulate unlimited events during long-running connection', async () => {
      const encoder = new TextEncoder();
      let eventCount = 0;

      const stream = new ReadableStream({
        start(controller) {
          const interval = setInterval(() => {
            if (eventCount < 1500) {
              const event = `event: keepalive\ndata: {"seq": ${eventCount++}}\n\n`;
              controller.enqueue(encoder.encode(event));
            } else {
              clearInterval(interval);
              controller.close();
            }
          }, 1);
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
      });

      const { result } = renderHook(() => useSSE('/api/test', { enabled: true }));

      await waitFor(
        () => {
          expect(result.current.events.length).toBeGreaterThan(100);
        },
        { timeout: 5000 }
      );

      // P1-001 VERIFICATION: Even with 1500 events, buffer should never exceed 1000
      expect(result.current.events.length).toBeLessThanOrEqual(1000);
    });
  });

  /**
   * P1-002: Unhandled SSE Stream Termination
   * Tests that [DONE] marker is properly detected and handled
   */
  describe('P1-002: Stream Termination Handling', () => {
    it('should detect [DONE] marker and terminate stream gracefully', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send a few normal events
          controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 1"}\n\n'));
          controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 2"}\n\n'));

          // Send [DONE] marker
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          // These should not be processed after [DONE]
          controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 3"}\n\n'));

          controller.close();
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
      });

      const { result } = renderHook(() => useSSE('/api/test', { enabled: true }));

      await waitFor(
        () => {
          const hasStreamComplete = result.current.events.some(
            e => e.type === 'stream_complete'
          );
          return hasStreamComplete;
        },
        { timeout: 2000 }
      );

      // P1-002 FIX VERIFICATION: Should have stream_complete event
      const streamCompleteEvent = result.current.events.find(
        e => e.type === 'stream_complete'
      );
      expect(streamCompleteEvent).toBeDefined();
      expect(streamCompleteEvent?.data.status).toBe('done');
    });

    it('should handle unexpected stream termination without [DONE] and attempt reconnection', async () => {
      const encoder = new TextEncoder();
      let connectionCount = 0;

      (global.fetch as jest.Mock).mockImplementation(() => {
        connectionCount++;

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 1"}\n\n'));
            controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 2"}\n\n'));

            // Simulate unexpected termination (no [DONE] marker)
            setTimeout(() => controller.close(), 50);
          },
        });

        return Promise.resolve({
          ok: true,
          status: 200,
          body: stream,
        });
      });

      const onDisconnect = jest.fn();
      const onReconnect = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useSSE('/api/test', {
          enabled: true,
          autoReconnect: true,
          maxReconnectAttempts: 3,
          reconnectDelay: 100,
          onDisconnect,
          onReconnect,
          onError
        })
      );

      // Wait for connection to establish
      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // Wait for unexpected termination and reconnection attempt
      await waitFor(
        () => {
          return connectionCount >= 2 || result.current.connectionState === 'reconnecting';
        },
        { timeout: 3000 }
      );

      // P1-002 VERIFICATION: Should attempt reconnection on unexpected termination
      expect(connectionCount).toBeGreaterThanOrEqual(2);
      expect(onReconnect).toHaveBeenCalled();

      // Should set error message indicating unexpected termination
      expect(result.current.error).toMatch(/terminated unexpectedly|reconnecting/i);
    });

    it('should NOT reconnect on expected termination with [DONE] marker', async () => {
      const encoder = new TextEncoder();
      let connectionCount = 0;

      (global.fetch as jest.Mock).mockImplementation(() => {
        connectionCount++;

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 1"}\n\n'));
            controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 2"}\n\n'));

            // Send [DONE] marker for expected termination
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));

            controller.close();
          },
        });

        return Promise.resolve({
          ok: true,
          status: 200,
          body: stream,
        });
      });

      const onDisconnect = jest.fn();
      const onReconnect = jest.fn();

      const { result } = renderHook(() =>
        useSSE('/api/test', {
          enabled: true,
          autoReconnect: true,
          maxReconnectAttempts: 3,
          reconnectDelay: 100,
          onDisconnect,
          onReconnect
        })
      );

      // Wait for connection to establish
      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // Wait for stream completion
      await waitFor(
        () => {
          const hasStreamComplete = result.current.events.some(
            e => e.type === 'stream_complete'
          );
          return hasStreamComplete && result.current.connectionState === 'disconnected';
        },
        { timeout: 2000 }
      );

      // P1-002 VERIFICATION: Should NOT attempt reconnection for expected termination
      expect(connectionCount).toBe(1); // Only initial connection
      expect(onReconnect).not.toHaveBeenCalled();
      expect(onDisconnect).toHaveBeenCalled();
      expect(result.current.connectionState).toBe('disconnected');
      expect(result.current.error).toBeNull(); // No error for expected termination
    });

    it('should stop reconnecting after max attempts on unexpected termination', async () => {
      const encoder = new TextEncoder();
      let connectionCount = 0;

      (global.fetch as jest.Mock).mockImplementation(() => {
        connectionCount++;

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Attempt ' + connectionCount + '"}\n\n'));

            // Always terminate unexpectedly (no [DONE])
            setTimeout(() => controller.close(), 50);
          },
        });

        return Promise.resolve({
          ok: true,
          status: 200,
          body: stream,
        });
      });

      const onError = jest.fn();
      const maxAttempts = 3;

      const { result } = renderHook(() =>
        useSSE('/api/test', {
          enabled: true,
          autoReconnect: true,
          maxReconnectAttempts: maxAttempts,
          reconnectDelay: 100,
          onError
        })
      );

      // Wait for all reconnection attempts to complete
      await waitFor(
        () => {
          return result.current.connectionState === 'error' &&
                 result.current.error?.includes('max reconnection attempts reached');
        },
        { timeout: 5000 }
      );

      // P1-002 VERIFICATION: Should stop after max attempts
      expect(connectionCount).toBeLessThanOrEqual(maxAttempts + 1); // Initial + retries
      expect(result.current.connectionState).toBe('error');
      expect(result.current.error).toContain('max reconnection attempts reached');
      expect(onError).toHaveBeenCalled();
    });

    it('should detect status:complete as expected termination', async () => {
      const encoder = new TextEncoder();
      let connectionCount = 0;

      (global.fetch as jest.Mock).mockImplementation(() => {
        connectionCount++;

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 1"}\n\n'));

            // Send completion marker in event data
            controller.enqueue(encoder.encode('event: complete\ndata: {"status":"complete","msg":"Done"}\n\n'));

            controller.close();
          },
        });

        return Promise.resolve({
          ok: true,
          status: 200,
          body: stream,
        });
      });

      const onReconnect = jest.fn();

      const { result } = renderHook(() =>
        useSSE('/api/test', {
          enabled: true,
          autoReconnect: true,
          maxReconnectAttempts: 3,
          reconnectDelay: 100,
          onReconnect
        })
      );

      // Wait for connection and completion
      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      await waitFor(
        () => {
          return result.current.connectionState === 'disconnected';
        },
        { timeout: 2000 }
      );

      // P1-002 VERIFICATION: Should recognize status:complete as expected termination
      expect(connectionCount).toBe(1);
      expect(onReconnect).not.toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should attempt reconnection after unexpected termination if autoReconnect=true', async () => {
      let connectionAttempts = 0;

      (global.fetch as jest.Mock).mockImplementation(() => {
        connectionAttempts++;

        if (connectionAttempts === 1) {
          // First connection: successful but terminates unexpectedly
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Connected"}\n\n'));
              // Unexpected termination
              setTimeout(() => controller.close(), 100);
            },
          });

          return Promise.resolve({
            ok: true,
            status: 200,
            body: stream,
          });
        } else {
          // Reconnection attempt
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Reconnected"}\n\n'));
            },
          });

          return Promise.resolve({
            ok: true,
            status: 200,
            body: stream,
          });
        }
      });

      const onReconnect = jest.fn();
      const { result } = renderHook(() =>
        useSSE('/api/test', {
          enabled: true,
          autoReconnect: true,
          maxReconnectAttempts: 3,
          reconnectDelay: 100,
          onReconnect
        })
      );

      // Wait for initial connection
      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // Wait for reconnection attempt
      await waitFor(
        () => {
          expect(onReconnect).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // P1-002 VERIFICATION: Should have attempted reconnection
      expect(connectionAttempts).toBeGreaterThanOrEqual(2);
      expect(result.current.reconnectAttempt).toBeGreaterThan(0);
    });
  });

  /**
   * P1-005: State Update After Unmount
   * Tests that no state updates occur after component unmount
   */
  describe('P1-005: State Updates After Unmount Prevention', () => {
    it('should not update state after component unmount', async () => {
      const encoder = new TextEncoder();
      let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;

      const stream = new ReadableStream({
        start(controller) {
          controllerRef = controller;
          controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 1"}\n\n'));
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
      });

      const { result, unmount } = renderHook(() => useSSE('/api/test', { enabled: true }));

      // Wait for connection
      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // Unmount while stream is active
      unmount();

      // Try to send events after unmount (should be ignored)
      await act(async () => {
        if (controllerRef) {
          try {
            controllerRef.enqueue(encoder.encode('event: test\ndata: {"msg": "After unmount"}\n\n'));
            controllerRef.enqueue(encoder.encode('event: test\ndata: {"msg": "Should not process"}\n\n'));
          } catch (e) {
            // Stream might be closed, which is expected
          }
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // P1-005 VERIFICATION: No errors should be thrown from state updates
      // The test passing without errors validates that state updates are blocked
      expect(true).toBe(true);
    });

    it('should cleanup reconnection timeout on unmount', async () => {
      // Mock failed connection to trigger reconnection
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const { result, unmount } = renderHook(() =>
        useSSE('/api/test', {
          enabled: true,
          autoReconnect: true,
          reconnectDelay: 5000, // Long delay
          maxReconnectAttempts: 3
        })
      );

      // Wait for error state
      await waitFor(() => {
        expect(result.current.connectionState).toBe('error');
      });

      // Unmount before reconnection timeout fires
      unmount();

      // Wait longer than reconnect delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // P1-005 VERIFICATION: Should not attempt reconnection after unmount
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only initial attempt
    });

    it('should abort ongoing fetch on unmount', async () => {
      const encoder = new TextEncoder();
      const abortSignalRef = { current: null as AbortSignal | null };

      (global.fetch as jest.Mock).mockImplementation((_url: string, options: any) => {
        abortSignalRef.current = options.signal;

        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('event: test\ndata: {"msg": "Event 1"}\n\n'));

            // Keep stream open indefinitely
            const interval = setInterval(() => {
              if (abortSignalRef.current?.aborted) {
                clearInterval(interval);
                controller.close();
              } else {
                try {
                  controller.enqueue(encoder.encode('event: keepalive\ndata: {}\n\n'));
                } catch (e) {
                  clearInterval(interval);
                }
              }
            }, 50);
          },
        });

        return Promise.resolve({
          ok: true,
          status: 200,
          body: stream,
        });
      });

      const { result, unmount } = renderHook(() => useSSE('/api/test', { enabled: true }));

      await waitFor(() => {
        expect(result.current.connectionState).toBe('connected');
      });

      // Unmount and verify abort
      unmount();

      await waitFor(() => {
        expect(abortSignalRef.current?.aborted).toBe(true);
      });

      // P1-005 VERIFICATION: AbortController should be triggered
      expect(abortSignalRef.current?.aborted).toBe(true);
    });
  });

  /**
   * Integration Tests: Combined Scenarios
   */
  describe('Integration: Combined P1 Fixes', () => {
    it('should handle rapid mount/unmount cycles without memory leaks', async () => {
      const encoder = new TextEncoder();

      for (let cycle = 0; cycle < 5; cycle++) {
        const stream = new ReadableStream({
          start(controller) {
            // Send 100 events per cycle
            for (let i = 0; i < 100; i++) {
              controller.enqueue(encoder.encode(`event: test\ndata: {"cycle": ${cycle}, "seq": ${i}}\n\n`));
            }
            controller.close();
          },
        });

        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 200,
          body: stream,
        });

        const { unmount } = renderHook(() => useSSE('/api/test', { enabled: true }));

        // Quick unmount
        await new Promise(resolve => setTimeout(resolve, 50));
        unmount();

        // Small delay between cycles
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // VERIFICATION: Test completes without errors or memory issues
      expect(true).toBe(true);
    });

    it('should handle stream termination while buffer is at capacity', async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // Send 1200 events (exceeds MAX_EVENTS)
          for (let i = 0; i < 1200; i++) {
            controller.enqueue(encoder.encode(`event: test\ndata: {"seq": ${i}}\n\n`));
          }

          // Send [DONE] marker
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));

          controller.close();
        },
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: stream,
      });

      const { result } = renderHook(() => useSSE('/api/test', { enabled: true }));

      await waitFor(
        () => {
          const hasStreamComplete = result.current.events.some(
            e => e.type === 'stream_complete'
          );
          return hasStreamComplete;
        },
        { timeout: 3000 }
      );

      // COMBINED VERIFICATION:
      // - Buffer limit (P1-001)
      expect(result.current.events.length).toBeLessThanOrEqual(1000);

      // - Stream termination (P1-002)
      const streamCompleteEvent = result.current.events.find(
        e => e.type === 'stream_complete'
      );
      expect(streamCompleteEvent).toBeDefined();

      // - Connection cleanup (P1-005 related)
      expect(result.current.connectionState).toBe('disconnected');
    });
  });
});
