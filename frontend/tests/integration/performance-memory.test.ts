/**
 * Performance and Memory Leak Detection Tests
 * Tests system performance under load and detects memory leaks
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useSSEClient, useAgentNetwork } from '../../hooks/useSSEClient';
import { apiClient } from '../../src/lib/api-client';
import { authService } from '../../src/lib/auth';

describe('Performance and Memory Leak Detection Tests', () => {
  let cleanup: (() => void)[] = [];

  beforeEach(() => {
    global.EventSource.reset();
    // Mock performance.memory if not available
    if (!performance.memory) {
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 50 * 1024 * 1024, // 50MB initial
          totalJSHeapSize: 100 * 1024 * 1024, // 100MB total
          jsHeapSizeLimit: 2 * 1024 * 1024 * 1024 // 2GB limit
        },
        configurable: true
      });
    }
  });

  afterEach(() => {
    cleanup.forEach(fn => fn());
    cleanup = [];
    jest.clearAllMocks();
    global.EventSource.reset();
  });

  describe('SSE Connection Performance', () => {
    it('should handle rapid event processing without blocking UI', async () => {
      const sessionId = 'performance-rapid-events';
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      const startTime = performance.now();

      // Send 500 rapid events
      for (let i = 0; i < 500; i++) {
        act(() => {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'agent_progress',
            queryId: 'query-123',
            agentId: `agent-${i % 8}`,
            progress: i % 100,
            timestamp: new Date(Date.now() + i).toISOString(),
            currentTask: `Processing ${i}`
          }));
        });
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process 500 events in under 500ms (1ms per event)
      expect(processingTime).toBeLessThan(500);

      // Event history should be limited to prevent memory bloat
      expect(result.current.events.length).toBe(50);

      cleanup.push(() => result.current.disconnect());
    });

    it('should maintain consistent performance with long-running connections', async () => {
      const sessionId = 'performance-long-running';
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      const performanceMetrics: number[] = [];

      // Simulate 10 batches of events over time
      for (let batch = 0; batch < 10; batch++) {
        const batchStart = performance.now();

        for (let i = 0; i < 50; i++) {
          act(() => {
            eventSource.onmessage(testUtils.createMessageEvent({
              type: 'heartbeat',
              timestamp: new Date(Date.now() + (batch * 50) + i).toISOString()
            }));
          });
        }

        const batchEnd = performance.now();
        performanceMetrics.push(batchEnd - batchStart);
      }

      // Performance should remain consistent (no degradation over time)
      const avgFirstHalf = performanceMetrics.slice(0, 5).reduce((a, b) => a + b) / 5;
      const avgSecondHalf = performanceMetrics.slice(5, 10).reduce((a, b) => a + b) / 5;
      
      // Second half should not be more than 50% slower than first half
      expect(avgSecondHalf).toBeLessThan(avgFirstHalf * 1.5);

      cleanup.push(() => result.current.disconnect());
    });

    it('should handle concurrent connections efficiently', async () => {
      const connections: any[] = [];
      const startTime = performance.now();

      // Create 10 concurrent SSE connections
      for (let i = 0; i < 10; i++) {
        const { result } = renderHook(() => 
          useSSEClient({ sessionId: `concurrent-${i}` })
        );
        connections.push(result);
      }

      const setupTime = performance.now() - startTime;

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(10);
      });

      // Setup should be fast even with multiple connections
      expect(setupTime).toBeLessThan(100);

      // Send events to all connections simultaneously
      const eventStart = performance.now();

      connections.forEach((connection, index) => {
        const eventSource = global.EventSource.instances[index];
        for (let j = 0; j < 10; j++) {
          act(() => {
            eventSource.onmessage(testUtils.createMessageEvent({
              type: 'agent_progress',
              queryId: `query-${index}`,
              agentId: `agent-${j}`,
              progress: j * 10,
              timestamp: new Date().toISOString()
            }));
          });
        }
      });

      const eventTime = performance.now() - eventStart;

      // Should handle 100 events across 10 connections quickly
      expect(eventTime).toBeLessThan(200);

      // Clean up all connections
      connections.forEach(connection => {
        cleanup.push(() => connection.current.disconnect());
      });
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during SSE connection lifecycle', async () => {
      const initialMemory = performance.memory.usedJSHeapSize;
      const connections: any[] = [];

      // Create and destroy multiple connections
      for (let cycle = 0; cycle < 5; cycle++) {
        // Create 5 connections
        for (let i = 0; i < 5; i++) {
          const { result, unmount } = renderHook(() => 
            useSSEClient({ sessionId: `leak-test-${cycle}-${i}` })
          );
          connections.push({ result, unmount });
        }

        await waitFor(() => {
          expect(global.EventSource.instances.length).toBeGreaterThan(0);
        });

        // Send some events
        global.EventSource.instances.forEach(eventSource => {
          for (let j = 0; j < 20; j++) {
            act(() => {
              eventSource.onmessage(testUtils.createMessageEvent({
                type: 'heartbeat',
                timestamp: new Date().toISOString()
              }));
            });
          }
        });

        // Destroy connections
        connections.forEach(({ result, unmount }) => {
          result.current.disconnect();
          unmount();
        });
        connections.length = 0;
        global.EventSource.reset();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should clean up event listeners properly', async () => {
      const sessionId = 'listener-cleanup-test';
      const { result, unmount } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      
      // Verify event handlers are set
      expect(eventSource.onopen).toBeDefined();
      expect(eventSource.onmessage).toBeDefined();
      expect(eventSource.onerror).toBeDefined();

      // Store reference to handlers
      const originalHandlers = {
        onopen: eventSource.onopen,
        onmessage: eventSource.onmessage,
        onerror: eventSource.onerror
      };

      // Unmount component
      unmount();

      // Handlers should still exist but connection should be closed
      expect(eventSource.readyState).toBe(2); // CLOSED

      // No new events should be processed after unmount
      const initialEventCount = result.current.events.length;

      act(() => {
        if (eventSource.onmessage) {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          }));
        }
      });

      expect(result.current.events.length).toBe(initialEventCount);
    });

    it('should prevent memory leaks with large event histories', async () => {
      const sessionId = 'large-history-test';
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      const initialMemory = performance.memory.usedJSHeapSize;

      // Send 1000 events (much more than the 50 event limit)
      for (let i = 0; i < 1000; i++) {
        act(() => {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'agent_progress',
            queryId: 'query-123',
            agentId: `agent-${i}`,
            progress: i % 100,
            timestamp: new Date(Date.now() + i).toISOString(),
            data: {
              largeData: 'x'.repeat(1000), // 1KB per event
              metadata: {
                index: i,
                processed: new Date(),
                details: Array(100).fill(`detail-${i}`)
              }
            }
          }));
        });
      }

      const afterEventsMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = afterEventsMemory - initialMemory;

      // Should only keep 50 events, so memory increase should be bounded
      expect(result.current.events.length).toBe(50);
      
      // Memory increase should be reasonable (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('API Client Performance', () => {
    it('should handle concurrent API requests efficiently', async () => {
      const startTime = performance.now();
      
      // Mock successful responses
      for (let i = 0; i < 50; i++) {
        fetch.mockResolvedValueOnce(
          testUtils.mockApiResponse({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            requestId: i
          })
        );
      }

      // Make 50 concurrent requests
      const promises = Array(50).fill(null).map(() => 
        apiClient.checkConnection()
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();

      expect(results).toHaveLength(50);
      expect(results.every(r => r === true)).toBe(true);
      
      // Should complete all requests in reasonable time (< 1 second)
      const totalTime = endTime - startTime;
      expect(totalTime).toBeLessThan(1000);
    });

    it('should handle request timeout efficiently', async () => {
      // Mock slow response
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => {
          setTimeout(() => resolve(testUtils.mockApiResponse({})), 35000);
        })
      );

      const startTime = performance.now();

      await expect(apiClient.healthCheck())
        .rejects
        .toThrow('Request timeout');

      const endTime = performance.now();
      const actualTimeout = endTime - startTime;

      // Should timeout in approximately 30 seconds (API_TIMEOUT)
      expect(actualTimeout).toBeGreaterThan(29000);
      expect(actualTimeout).toBeLessThan(31000);
    }, 35000);

    it('should clean up aborted requests properly', async () => {
      const controller = apiClient.createAbortController();
      
      // Start a slow request
      fetch.mockImplementationOnce(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve(testUtils.mockApiResponse({})), 5000);
        })
      );

      const requestPromise = apiClient.get('/test', { signal: controller.signal });

      // Abort after 100ms
      setTimeout(() => controller.abort(), 100);

      const startTime = performance.now();

      await expect(requestPromise)
        .rejects
        .toThrow();

      const endTime = performance.now();
      const abortTime = endTime - startTime;

      // Should abort quickly (< 200ms)
      expect(abortTime).toBeLessThan(200);
    });
  });

  describe('Authentication Performance', () => {
    afterEach(async () => {
      await authService.logout();
    });

    it('should handle rapid authentication state changes', async () => {
      const iterations = 100;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        // Create dev session
        authService.createDevSession();
        expect(authService.isAuthenticated()).toBe(true);

        // Logout
        await authService.logout();
        expect(authService.isAuthenticated()).toBe(false);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 100 auth cycles in reasonable time
      expect(totalTime).toBeLessThan(1000);
    });

    it('should not leak memory during authentication cycles', async () => {
      const initialMemory = performance.memory.usedJSHeapSize;

      // Simulate many authentication cycles
      for (let i = 0; i < 50; i++) {
        fetch.mockResolvedValueOnce(
          testUtils.mockApiResponse({
            tokens: {
              access_token: `token-${i}`,
              refresh_token: `refresh-${i}`,
              token_type: 'Bearer',
              expires_in: 1800
            },
            user: {
              id: `user-${i}`,
              email: `test${i}@example.com`,
              first_name: 'Test',
              last_name: 'User'
            }
          })
        );

        await authService.login({
          email: `test${i}@example.com`,
          password: 'password'
        });

        await authService.logout();
      }

      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Component Rendering Performance', () => {
    it('should handle rapid state updates without performance issues', async () => {
      const { result } = renderHook(() => useAgentNetwork('perf-test-session'));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      const startTime = performance.now();

      // Rapid agent status updates
      for (let i = 0; i < 200; i++) {
        const agentId = `agent-${i % 10}`;
        
        act(() => {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'agent_progress',
            queryId: 'query-123',
            agentId,
            agentType: 'section_researcher',
            progress: i % 100,
            timestamp: new Date(Date.now() + i).toISOString(),
            currentTask: `Task ${i}`
          }));
        });
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should handle 200 updates quickly
      expect(renderTime).toBeLessThan(500);

      // Should maintain reasonable agent count
      expect(result.current.agents.length).toBeLessThanOrEqual(10);

      cleanup.push(() => result.current.disconnect());
    });

    it('should efficiently manage large result sets', async () => {
      const { result } = renderHook(() => 
        useSSEClient({ sessionId: 'large-results-test' })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      const startTime = performance.now();

      // Send many large result events
      for (let i = 0; i < 100; i++) {
        act(() => {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'partial_result',
            queryId: 'query-123',
            timestamp: new Date(Date.now() + i).toISOString(),
            content: 'Large content '.repeat(100), // ~1.3KB per result
            section: `Section ${i}`,
            agentId: `agent-${i % 8}`,
            confidence: 0.8 + (i % 20) * 0.01
          }));
        });
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Should process large results efficiently
      expect(processingTime).toBeLessThan(200);

      // Event history should be capped
      expect(result.current.events.length).toBe(50);

      cleanup.push(() => result.current.disconnect());
    });
  });

  describe('Resource Cleanup', () => {
    it('should properly clean up timers and intervals', async () => {
      const sessionId = 'timer-cleanup-test';
      const { result, unmount } = renderHook(() => 
        useSSEClient({ 
          sessionId, 
          autoReconnect: true,
          heartbeatTimeout: 1000
        })
      );

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      // Trigger heartbeat timer
      const eventSource = global.EventSource.getLatest();
      act(() => {
        eventSource.onmessage(testUtils.createMessageEvent({
          type: 'connection',
          status: 'connected',
          sessionId,
          timestamp: new Date().toISOString()
        }));
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Trigger reconnection timer
      act(() => {
        eventSource.onerror(new Event('error'));
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('reconnecting');
      });

      // Unmount should clean up all timers
      const initialTimerCount = jest.getTimerCount();
      unmount();
      const finalTimerCount = jest.getTimerCount();

      // Should not leave hanging timers
      expect(finalTimerCount).toBeLessThanOrEqual(initialTimerCount);
    });

    it('should handle memory cleanup during component unmounting', async () => {
      const initialMemory = performance.memory.usedJSHeapSize;
      const components: any[] = [];

      // Create multiple components with data
      for (let i = 0; i < 20; i++) {
        const { result, unmount } = renderHook(() => 
          useSSEClient({ sessionId: `cleanup-${i}` })
        );
        
        components.push({ result, unmount });

        await waitFor(() => {
          expect(global.EventSource.instances.length).toBe(i + 1);
        });

        // Add some data
        const eventSource = global.EventSource.getLatest();
        for (let j = 0; j < 10; j++) {
          act(() => {
            eventSource.onmessage(testUtils.createMessageEvent({
              type: 'heartbeat',
              timestamp: new Date().toISOString(),
              data: { large: 'x'.repeat(1000) }
            }));
          });
        }
      }

      const midMemory = performance.memory.usedJSHeapSize;

      // Clean up all components
      components.forEach(({ result, unmount }) => {
        result.current.disconnect();
        unmount();
      });

      global.EventSource.reset();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory.usedJSHeapSize;
      const netMemoryIncrease = finalMemory - initialMemory;

      // Net memory increase should be minimal after cleanup
      expect(netMemoryIncrease).toBeLessThan(2 * 1024 * 1024); // < 2MB
    });
  });

  describe('Load Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const sessionId = 'sustained-load-test';
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      const performanceData: number[] = [];

      // Simulate sustained load for 10 iterations
      for (let iteration = 0; iteration < 10; iteration++) {
        const iterationStart = performance.now();

        // Send batch of events
        for (let i = 0; i < 100; i++) {
          act(() => {
            eventSource.onmessage(testUtils.createMessageEvent({
              type: 'agent_progress',
              queryId: 'query-123',
              agentId: `agent-${i % 8}`,
              progress: (iteration * 100 + i) % 100,
              timestamp: new Date().toISOString(),
              currentTask: `Iteration ${iteration}, Task ${i}`
            }));
          });
        }

        const iterationEnd = performance.now();
        performanceData.push(iterationEnd - iterationStart);

        // Brief pause between iterations
        await testUtils.waitFor(10);
      }

      // Performance should remain stable across iterations
      const avgFirstHalf = performanceData.slice(0, 5).reduce((a, b) => a + b) / 5;
      const avgSecondHalf = performanceData.slice(5, 10).reduce((a, b) => a + b) / 5;

      // Later iterations should not be significantly slower
      const performanceDegradation = (avgSecondHalf - avgFirstHalf) / avgFirstHalf;
      expect(performanceDegradation).toBeLessThan(0.3); // < 30% degradation

      cleanup.push(() => result.current.disconnect());
    });

    it('should handle peak load scenarios', async () => {
      const sessionId = 'peak-load-test';
      const { result } = renderHook(() => useSSEClient({ sessionId }));

      await waitFor(() => {
        expect(global.EventSource.instances.length).toBe(1);
      });

      const eventSource = global.EventSource.getLatest();
      const startTime = performance.now();

      // Simulate peak load: 1000 events in rapid succession
      for (let i = 0; i < 1000; i++) {
        act(() => {
          eventSource.onmessage(testUtils.createMessageEvent({
            type: 'agent_progress',
            queryId: 'query-123',
            agentId: `agent-${i % 8}`,
            progress: i % 100,
            timestamp: new Date(Date.now() + i).toISOString(),
            currentTask: `Peak load task ${i}`,
            data: {
              payload: Array(50).fill(`data-${i}`), // Moderate payload
              metrics: {
                processingTime: i * 10,
                queueSize: i % 100,
                throughput: Math.random() * 1000
              }
            }
          }));
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle peak load within reasonable time (< 2 seconds)
      expect(totalTime).toBeLessThan(2000);

      // System should remain responsive
      expect(result.current.events.length).toBe(50); // Event history limit
      expect(result.current.connectionStatus).not.toBe('error');

      cleanup.push(() => result.current.disconnect());
    });
  });
});