/**
 * Comprehensive tests for connection resilience features
 * Tests SSE connection reliability, error handling, and recovery mechanisms
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useEnhancedSSEClient } from '../hooks/useEnhancedSSEClient';
import ConnectionErrorHandler, { ConnectionErrorType } from '../utils/connection-error-handler';

// Mock EventSource
class MockEventSource {
  public readyState: number = 0;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public url: string;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = 1;
      this.onopen?.(new Event('open'));
    }, 100);
  }

  close() {
    this.readyState = 2;
  }

  dispatchMessage(data: any) {
    const event = new MessageEvent('message', { data: JSON.stringify(data) });
    this.onmessage?.(event);
  }

  dispatchError() {
    const event = new Event('error');
    this.onerror?.(event);
  }
}

// Mock apiClient
const mockApiClient = {
  createAuthenticatedEventSource: jest.fn()
};

// Mock navigator
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(navigator, 'connection', {
  writable: true,
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50
  },
});

describe('Enhanced SSE Client Connection Resilience', () => {
  let mockEventSource: MockEventSource;
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockEventSource = new MockEventSource('http://test.com/sse');
    mockApiClient.createAuthenticatedEventSource.mockReturnValue(mockEventSource);
    
    // Reset navigator.onLine
    (navigator as any).onLine = true;
  });

  describe('Basic Connection Management', () => {
    test('should establish connection successfully', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ sessionId: 'test-session' })
      );

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('connected');
      });

      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBeNull();
    });

    test('should handle connection timeout', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          connectionTimeout: 100
        })
      );

      // Don't trigger onopen to simulate timeout
      mockApiClient.createAuthenticatedEventSource.mockReturnValue({
        ...mockEventSource,
        onopen: null
      });

      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
      }, { timeout: 200 });

      expect(result.current.error).toBe('Connection timeout');
    });

    test('should disconnect cleanly', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ sessionId: 'test-session' })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.isConnected).toBe(false);
    });
  });

  describe('Exponential Backoff and Jitter', () => {
    test('should implement exponential backoff with jitter', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          initialRetryDelay: 1000,
          maxRetryDelay: 10000,
          jitterFactor: 0.1,
          maxRetries: 3
        })
      );

      // Simulate connection failures
      let reconnectDelays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((callback, delay) => {
        if (delay && delay > 100) { // Filter out connection timeouts
          reconnectDelays.push(delay);
        }
        return originalSetTimeout(callback, 10); // Execute quickly for testing
      }) as any;

      // Trigger multiple connection failures
      for (let i = 0; i < 3; i++) {
        act(() => {
          mockEventSource.dispatchError();
        });
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      global.setTimeout = originalSetTimeout;

      // Verify exponential backoff pattern
      expect(reconnectDelays.length).toBeGreaterThan(0);
      for (let i = 1; i < reconnectDelays.length; i++) {
        expect(reconnectDelays[i]).toBeGreaterThan(reconnectDelays[i - 1]);
      }
    });

    test('should respect maximum retry delay', async () => {
      const maxRetryDelay = 5000;
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          initialRetryDelay: 1000,
          maxRetryDelay,
          maxRetries: 10
        })
      );

      let maxDelay = 0;
      global.setTimeout = jest.fn((callback, delay) => {
        if (delay && delay > 100) {
          maxDelay = Math.max(maxDelay, delay);
        }
        return setTimeout(callback, 10);
      }) as any;

      // Trigger many failures to exceed max delay
      for (let i = 0; i < 8; i++) {
        act(() => {
          mockEventSource.dispatchError();
        });
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      expect(maxDelay).toBeLessThanOrEqual(maxRetryDelay * 1.1); // Allow for jitter
    });
  });

  describe('Circuit Breaker Pattern', () => {
    test('should open circuit breaker after repeated failures', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          enableCircuitBreaker: true,
          maxRetries: 10
        })
      );

      // Simulate 5 consecutive failures to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        act(() => {
          mockEventSource.dispatchError();
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      await waitFor(() => {
        expect(result.current.circuitBreaker.state).toBe('open');
      });

      expect(result.current.connectionStatus).toBe('circuit-open');
      expect(result.current.canReconnect).toBe(false);
    });

    test('should transition to half-open after timeout', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          enableCircuitBreaker: true
        })
      );

      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        act(() => {
          mockEventSource.dispatchError();
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for circuit breaker timeout (mocked to be short)
      act(() => {
        result.current.circuitBreaker.nextAttemptTime = Date.now() - 1000;
      });

      // Should transition to half-open
      await waitFor(() => {
        expect(result.current.circuitBreaker.state).toBe('half-open');
      });
    });

    test('should close circuit breaker on successful connection', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          enableCircuitBreaker: true
        })
      );

      // Open circuit breaker
      for (let i = 0; i < 5; i++) {
        act(() => {
          mockEventSource.dispatchError();
        });
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Move to half-open
      act(() => {
        result.current.circuitBreaker.nextAttemptTime = Date.now() - 1000;
      });

      // Simulate successful connection
      act(() => {
        mockEventSource.dispatchMessage({
          type: 'connection',
          status: 'connected',
          sessionId: 'test-session',
          timestamp: new Date().toISOString()
        });
      });

      await waitFor(() => {
        expect(result.current.circuitBreaker.state).toBe('closed');
      });
    });
  });

  describe('Memory Management', () => {
    test('should respect event queue size limits', async () => {
      const eventQueueSize = 5;
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          eventQueueSize
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send more events than queue size
      for (let i = 0; i < 10; i++) {
        act(() => {
          mockEventSource.dispatchMessage({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          });
        });
      }

      expect(result.current.events.length).toBeLessThanOrEqual(eventQueueSize);
      expect(result.current.eventQueueOverflow).toBe(true);
    });

    test('should track event processing time', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          enableMetrics: true
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send some events
      for (let i = 0; i < 3; i++) {
        act(() => {
          mockEventSource.dispatchMessage({
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          });
        });
      }

      expect(result.current.metrics.eventProcessingTime).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track connection metrics', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          enableMetrics: true
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      expect(result.current.metrics.totalConnections).toBe(1);
      expect(result.current.metrics.connectionQuality).toBeDefined();
      expect(result.current.metrics.uptime).toBeGreaterThan(0);
    });

    test('should update connection quality based on performance', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          enableMetrics: true
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Simulate poor latency
      act(() => {
        result.current.diagnostics.latency = [1500, 1600, 1700]; // High latency
      });

      // Should update connection quality
      await waitFor(() => {
        expect(result.current.metrics.connectionQuality).toBe('poor');
      });
    });

    test('should collect network diagnostics', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          enableDiagnostics: true
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      const diagnostics = result.current.getDiagnostics();
      
      expect(diagnostics).toHaveProperty('connectionUptime');
      expect(diagnostics).toHaveProperty('eventProcessingTime');
      expect(diagnostics).toHaveProperty('circuitBreakerState');
    });
  });

  describe('Heartbeat Monitoring', () => {
    test('should detect heartbeat timeout', async () => {
      const heartbeatTimeout = 200;
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          heartbeatTimeout
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Don't send heartbeat within timeout period
      await waitFor(() => {
        expect(result.current.connectionStatus).toBe('error');
      }, { timeout: heartbeatTimeout + 100 });

      expect(result.current.error).toBe('Connection heartbeat timeout');
    });

    test('should reset heartbeat timer on message received', async () => {
      const { result } = renderHook(() => 
        useEnhancedSSEClient({ 
          sessionId: 'test-session',
          heartbeatTimeout: 1000
        })
      );

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Send heartbeat to reset timer
      act(() => {
        mockEventSource.dispatchMessage({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        });
      });

      expect(result.current.lastHeartbeat).toBeDefined();
      expect(result.current.timeSinceLastHeartbeat).toBeLessThan(100);
    });
  });
});

describe('Connection Error Handler', () => {
  let errorHandler: ConnectionErrorHandler;

  beforeEach(() => {
    errorHandler = new ConnectionErrorHandler();
  });

  describe('Error Classification', () => {
    test('should classify network unreachable errors', () => {
      (navigator as any).onLine = false;
      
      const error = errorHandler.analyzeError(new Error('Network unreachable'));
      
      expect(error.type).toBe('network_unreachable');
      expect(error.severity).toBe('high');
      expect(error.recoverable).toBe(true);
    });

    test('should classify authentication errors', () => {
      const error = errorHandler.analyzeError({ status: 401, message: 'Unauthorized' });
      
      expect(error.type).toBe('authentication_failed');
      expect(error.severity).toBe('critical');
      expect(error.recoverable).toBe(false);
    });

    test('should classify timeout errors', () => {
      const error = errorHandler.analyzeError(new Error('Connection timeout'));
      
      expect(error.type).toBe('connection_timeout');
      expect(error.severity).toBe('medium');
      expect(error.recoverable).toBe(true);
      expect(error.retryDelay).toBeGreaterThan(0);
    });

    test('should classify rate limiting errors', () => {
      const error = errorHandler.analyzeError({ status: 429, message: 'Too many requests' });
      
      expect(error.type).toBe('rate_limited');
      expect(error.severity).toBe('medium');
      expect(error.recoverable).toBe(true);
      expect(error.retryDelay).toBeGreaterThanOrEqual(30000);
    });
  });

  describe('Recovery Strategies', () => {
    test('should provide appropriate retry delays', () => {
      const errors: { error: any; expectedMinDelay: number }[] = [
        { error: new Error('Connection timeout'), expectedMinDelay: 1000 },
        { error: { status: 429 }, expectedMinDelay: 25000 },
        { error: new Error('Server error'), expectedMinDelay: 8000 },
      ];

      errors.forEach(({ error, expectedMinDelay }) => {
        const result = errorHandler.analyzeError(error);
        expect(result.retryDelay).toBeGreaterThanOrEqual(expectedMinDelay);
      });
    });

    test('should generate helpful user messages', () => {
      const error = errorHandler.analyzeError(new Error('DNS resolution failed'));
      
      expect(error.message).toContain('resolve server address');
      expect(error.suggestedAction).toContain('DNS');
    });

    test('should track error patterns', () => {
      // Generate multiple errors
      for (let i = 0; i < 5; i++) {
        errorHandler.analyzeError(new Error('Connection timeout'));
      }

      const stats = errorHandler.getErrorStatistics();
      
      expect(stats.totalErrors).toBe(5);
      expect(stats.errorsByType['connection_timeout']).toBe(5);
      expect(stats.mostCommonError).toBe('connection_timeout');
    });
  });

  describe('Network Scenario Detection', () => {
    test('should detect server overload scenario', () => {
      // Generate errors typical of server overload
      errorHandler.analyzeError(new Error('Connection timeout'));
      errorHandler.analyzeError({ status: 429 });
      errorHandler.analyzeError(new Error('Connection refused'));

      const scenario = errorHandler.detectScenario();
      
      expect(scenario?.name).toBe('Server Overload');
    });

    test('should detect network outage scenario', () => {
      (navigator as any).onLine = false;
      
      errorHandler.analyzeError(new Error('Network unreachable'));
      errorHandler.analyzeError(new Error('DNS resolution failed'));

      const scenario = errorHandler.detectScenario();
      
      expect(scenario?.name).toBe('Temporary Network Outage');
    });
  });

  describe('Error History Management', () => {
    test('should maintain error history within limits', () => {
      // Generate more errors than the limit
      for (let i = 0; i < 150; i++) {
        errorHandler.analyzeError(new Error(`Error ${i}`));
      }

      const stats = errorHandler.getErrorStatistics();
      
      // Should not exceed reasonable limits
      expect(stats.totalErrors).toBeLessThanOrEqual(100);
    });

    test('should clear history when requested', () => {
      errorHandler.analyzeError(new Error('Test error'));
      
      let stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(1);

      errorHandler.clearHistory();
      
      stats = errorHandler.getErrorStatistics();
      expect(stats.totalErrors).toBe(0);
    });
  });
});

describe('Integration Tests', () => {
  test('should handle complete connection lifecycle with errors', async () => {
    const { result } = renderHook(() => 
      useEnhancedSSEClient({ 
        sessionId: 'integration-test',
        enableCircuitBreaker: true,
        enableMetrics: true,
        maxRetries: 3
      })
    );

    // 1. Establish connection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // 2. Simulate network issues
    act(() => {
      mockEventSource.dispatchError();
    });

    await waitFor(() => {
      expect(result.current.connectionStatus).toBe('reconnecting');
    });

    // 3. Successful reconnection
    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // 4. Check metrics were updated
    expect(result.current.metrics.reconnectionCount).toBeGreaterThan(0);
    expect(result.current.metrics.totalConnections).toBeGreaterThan(1);
  });

  test('should integrate error handler with SSE client', async () => {
    const errorHandler = new ConnectionErrorHandler();
    const { result } = renderHook(() => 
      useEnhancedSSEClient({ sessionId: 'error-integration-test' })
    );

    // Register error handler
    result.current.on('onError', (event: any) => {
      const error = errorHandler.analyzeError(event);
      expect(error.type).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.recoverable).toBeDefined();
    });

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    // Trigger error event
    act(() => {
      mockEventSource.dispatchMessage({
        type: 'error',
        sessionId: 'error-integration-test',
        message: 'Test error',
        timestamp: new Date().toISOString()
      });
    });
  });
});