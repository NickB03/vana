import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCircuitBreaker } from './useCircuitBreaker';

describe('useCircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start in closed state', () => {
      const { result } = renderHook(() => useCircuitBreaker());

      expect(result.current.state).toBe('closed');
      expect(result.current.failureCount).toBe(0);
      expect(result.current.shouldAllowRequest()).toBe(true);
    });

    it('should accept custom configuration', () => {
      const onStateChange = vi.fn();
      const { result } = renderHook(() =>
        useCircuitBreaker({
          maxFailures: 5,
          resetTimeout: 30000,
          onStateChange
        })
      );

      expect(result.current.state).toBe('closed');
    });
  });

  describe('failure tracking', () => {
    it('should increment failure count on recordFailure', () => {
      const { result } = renderHook(() => useCircuitBreaker({ maxFailures: 3 }));

      act(() => {
        result.current.recordFailure();
      });

      expect(result.current.failureCount).toBe(1);
      expect(result.current.state).toBe('closed');
    });

    it('should open circuit after max failures', () => {
      const onStateChange = vi.fn();
      const { result } = renderHook(() =>
        useCircuitBreaker({ maxFailures: 3, onStateChange })
      );

      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
        result.current.recordFailure();
      });

      expect(result.current.state).toBe('open');
      expect(result.current.failureCount).toBe(3);
      expect(onStateChange).toHaveBeenCalledWith('open');
      expect(onStateChange).toHaveBeenCalledTimes(1);
    });

    it('should block requests when circuit is open', () => {
      const { result } = renderHook(() => useCircuitBreaker({ maxFailures: 3 }));

      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
        result.current.recordFailure();
      });

      expect(result.current.shouldAllowRequest()).toBe(false);
    });
  });

  describe('reset timeout and half-open state', () => {
    it('should transition to half-open after reset timeout', () => {
      const onStateChange = vi.fn();
      const { result } = renderHook(() =>
        useCircuitBreaker({
          maxFailures: 3,
          resetTimeout: 60000,
          onStateChange
        })
      );

      // Open the circuit
      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
        result.current.recordFailure();
      });

      expect(result.current.state).toBe('open');
      expect(onStateChange).toHaveBeenCalledWith('open');

      // Advance time past reset timeout
      act(() => {
        vi.advanceTimersByTime(60001);
      });

      // Check if request is allowed (should transition to half-open)
      let allowed = false;
      act(() => {
        allowed = result.current.shouldAllowRequest();
      });

      expect(allowed).toBe(true);
      expect(result.current.state).toBe('half-open');
      expect(onStateChange).toHaveBeenCalledWith('half-open');
    });

    it('should close circuit on success in half-open state', () => {
      const onStateChange = vi.fn();
      const { result } = renderHook(() =>
        useCircuitBreaker({
          maxFailures: 3,
          resetTimeout: 60000,
          onStateChange
        })
      );

      // Open the circuit
      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
        result.current.recordFailure();
      });

      // Advance time to half-open
      act(() => {
        vi.advanceTimersByTime(60001);
        result.current.shouldAllowRequest();
      });

      expect(result.current.state).toBe('half-open');

      // Record success to close circuit
      act(() => {
        result.current.recordSuccess();
      });

      expect(result.current.state).toBe('closed');
      expect(result.current.failureCount).toBe(0);
      expect(onStateChange).toHaveBeenCalledWith('closed');
    });

    it('should reopen circuit on failure in half-open state', () => {
      const onStateChange = vi.fn();
      const { result } = renderHook(() =>
        useCircuitBreaker({
          maxFailures: 3,
          resetTimeout: 60000,
          onStateChange
        })
      );

      // Open the circuit
      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
        result.current.recordFailure();
      });

      // Advance time to half-open
      act(() => {
        vi.advanceTimersByTime(60001);
        result.current.shouldAllowRequest();
      });

      expect(result.current.state).toBe('half-open');

      // Record another failure
      act(() => {
        result.current.recordFailure();
      });

      expect(result.current.state).toBe('open');
      expect(result.current.shouldAllowRequest()).toBe(false);
    });
  });

  describe('getTimeUntilRetry', () => {
    it('should return 0 when circuit is closed', () => {
      const { result } = renderHook(() => useCircuitBreaker());

      expect(result.current.getTimeUntilRetry()).toBe(0);
    });

    it('should return remaining time when circuit is open', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ maxFailures: 3, resetTimeout: 60000 })
      );

      // Open the circuit
      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
        result.current.recordFailure();
      });

      expect(result.current.state).toBe('open');

      // Should have ~60 seconds remaining
      const timeRemaining = result.current.getTimeUntilRetry();
      expect(timeRemaining).toBeGreaterThan(59000);
      expect(timeRemaining).toBeLessThanOrEqual(60000);

      // Advance time by 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should have ~30 seconds remaining
      const timeRemaining2 = result.current.getTimeUntilRetry();
      expect(timeRemaining2).toBeGreaterThan(29000);
      expect(timeRemaining2).toBeLessThanOrEqual(30000);
    });

    it('should return 0 when time has passed', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ maxFailures: 3, resetTimeout: 60000 })
      );

      // Open the circuit
      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
        result.current.recordFailure();
      });

      // Advance time past reset timeout
      act(() => {
        vi.advanceTimersByTime(60001);
      });

      const timeRemaining = result.current.getTimeUntilRetry();
      expect(timeRemaining).toBe(0);
    });
  });

  describe('manual reset', () => {
    it('should reset circuit to closed state', () => {
      const onStateChange = vi.fn();
      const { result } = renderHook(() =>
        useCircuitBreaker({ maxFailures: 3, onStateChange })
      );

      // Open the circuit
      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
        result.current.recordFailure();
      });

      expect(result.current.state).toBe('open');

      // Manual reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('closed');
      expect(result.current.failureCount).toBe(0);
      expect(result.current.shouldAllowRequest()).toBe(true);
      expect(onStateChange).toHaveBeenCalledWith('closed');
    });
  });

  describe('recordSuccess', () => {
    it('should reset failure count and close circuit', () => {
      const { result } = renderHook(() => useCircuitBreaker({ maxFailures: 3 }));

      // Record some failures
      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
      });

      expect(result.current.failureCount).toBe(2);

      // Record success
      act(() => {
        result.current.recordSuccess();
      });

      expect(result.current.state).toBe('closed');
      expect(result.current.failureCount).toBe(0);
    });
  });

  describe('exponential backoff scenario', () => {
    it('should prevent repeated failures within timeout window', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ maxFailures: 3, resetTimeout: 60000 })
      );

      // Simulate 3 rapid failures
      act(() => {
        result.current.recordFailure();
        result.current.recordFailure();
        result.current.recordFailure();
      });

      expect(result.current.state).toBe('open');

      // Try to make requests during cooldown - should all be blocked
      const blockedRequests = [];
      for (let i = 0; i < 10; i++) {
        act(() => {
          vi.advanceTimersByTime(5000); // 5 seconds
        });
        blockedRequests.push(result.current.shouldAllowRequest());
      }

      // All requests within the first 50 seconds should be blocked
      expect(blockedRequests.every(allowed => !allowed)).toBe(true);

      // After reset timeout, should allow test request
      act(() => {
        vi.advanceTimersByTime(10001); // Total: 60+ seconds
      });

      let allowed = false;
      act(() => {
        allowed = result.current.shouldAllowRequest();
      });

      expect(allowed).toBe(true);
      expect(result.current.state).toBe('half-open');
    });
  });
});
