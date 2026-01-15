import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Circuit Breaker States:
 * - closed: Normal operation, requests allowed
 * - open: Circuit is open, requests blocked to prevent cascading failures
 * - half-open: Testing recovery, allowing limited requests
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: number;
  state: CircuitState;
}

interface CircuitBreakerConfig {
  /**
   * Maximum number of consecutive failures before opening the circuit
   * @default 3
   */
  maxFailures?: number;

  /**
   * Time in milliseconds to wait before transitioning from open to half-open
   * @default 60000 (1 minute)
   */
  resetTimeout?: number;

  /**
   * Optional callback invoked when circuit state changes
   */
  onStateChange?: (state: CircuitState) => void;
}

/**
 * useCircuitBreaker - Circuit breaker pattern for preventing cascading failures
 *
 * Implements the circuit breaker pattern to prevent repeated failed requests
 * during outages or service degradation. After a configured number of failures,
 * the circuit "opens" and blocks subsequent requests for a cooldown period.
 *
 * After the cooldown, the circuit enters "half-open" state where it allows
 * a test request. If successful, the circuit closes; if it fails, the circuit
 * reopens and the cooldown restarts.
 *
 * This prevents network stampedes during recovery and improves user experience
 * by failing fast rather than waiting for timeouts.
 *
 * @param config - Configuration object
 * @returns Circuit breaker control interface
 *
 * @example
 * ```tsx
 * const { shouldAllowRequest, recordSuccess, recordFailure, state } = useCircuitBreaker({
 *   maxFailures: 3,
 *   resetTimeout: 60000,
 *   onStateChange: (state) => console.log('Circuit state:', state)
 * });
 *
 * const fetchData = async () => {
 *   if (!shouldAllowRequest()) {
 *     toast.error('Service temporarily unavailable. Please try again later.');
 *     return;
 *   }
 *
 *   try {
 *     const result = await fetch('/api/data');
 *     recordSuccess();
 *     return result;
 *   } catch (error) {
 *     recordFailure();
 *     throw error;
 *   }
 * };
 * ```
 */
export function useCircuitBreaker(config: CircuitBreakerConfig = {}) {
  const {
    maxFailures = 3,
    resetTimeout = 60000,
    onStateChange
  } = config;

  const [state, setState] = useState<CircuitBreakerState>({
    failureCount: 0,
    lastFailureTime: 0,
    state: 'closed'
  });

  const onStateChangeRef = useRef(onStateChange);

  // Keep callback ref up to date
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  /**
   * Records a failed request and updates circuit state
   */
  const recordFailure = useCallback(() => {
    setState(prev => {
      const newCount = prev.failureCount + 1;
      const newState: CircuitState = newCount >= maxFailures ? 'open' : prev.state;

      // Notify state change if circuit opens
      if (newState === 'open' && prev.state !== 'open') {
        onStateChangeRef.current?.('open');
      }

      return {
        failureCount: newCount,
        lastFailureTime: Date.now(),
        state: newState
      };
    });
  }, [maxFailures]);

  /**
   * Records a successful request and resets circuit state
   */
  const recordSuccess = useCallback(() => {
    setState(prev => {
      // Only reset if we were in a non-closed state
      if (prev.state !== 'closed') {
        onStateChangeRef.current?.('closed');
      }

      return {
        failureCount: 0,
        lastFailureTime: 0,
        state: 'closed'
      };
    });
  }, []);

  /**
   * Resets the circuit breaker to closed state manually
   */
  const reset = useCallback(() => {
    setState(prev => {
      if (prev.state !== 'closed') {
        onStateChangeRef.current?.('closed');
      }

      return {
        failureCount: 0,
        lastFailureTime: 0,
        state: 'closed'
      };
    });
  }, []);

  /**
   * Checks if a request should be allowed based on circuit state
   *
   * @returns true if request should proceed, false if blocked
   */
  const shouldAllowRequest = useCallback((): boolean => {
    // Always allow requests when circuit is closed
    if (state.state === 'closed') {
      return true;
    }

    // If circuit is open, check if enough time has passed to transition to half-open
    if (state.state === 'open') {
      const timeSinceFailure = Date.now() - state.lastFailureTime;

      if (timeSinceFailure > resetTimeout) {
        // Transition to half-open state to allow a test request
        setState(prev => {
          onStateChangeRef.current?.('half-open');
          return { ...prev, state: 'half-open' };
        });
        return true;
      }

      // Still in cooldown period
      return false;
    }

    // Half-open state: allow the request (it's a test request)
    return true;
  }, [state, resetTimeout]);

  /**
   * Gets the time remaining (in milliseconds) until the circuit will transition to half-open
   * Returns 0 if circuit is not open
   */
  const getTimeUntilRetry = useCallback((): number => {
    if (state.state !== 'open') {
      return 0;
    }

    const timeSinceFailure = Date.now() - state.lastFailureTime;
    const timeRemaining = resetTimeout - timeSinceFailure;

    return Math.max(0, timeRemaining);
  }, [state, resetTimeout]);

  return {
    /** Current circuit state */
    state: state.state,
    /** Whether the next request should be allowed */
    shouldAllowRequest,
    /** Record a successful request (closes circuit) */
    recordSuccess,
    /** Record a failed request (may open circuit) */
    recordFailure,
    /** Manually reset the circuit to closed state */
    reset,
    /** Get milliseconds until circuit will allow retry (0 if not open) */
    getTimeUntilRetry,
    /** Current consecutive failure count */
    failureCount: state.failureCount
  };
}
