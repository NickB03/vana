/**
 * Circuit Breaker Pattern Implementation
 *
 * Provides resilience for external API calls (e.g., Gemini, OpenRouter) by:
 * - Failing fast when a service is unhealthy (open state)
 * - Gradually testing recovery (half-open state)
 * - Normal operation when healthy (closed state)
 *
 * State Machine:
 * ```
 *   [CLOSED] ---(failure threshold exceeded)---> [OPEN]
 *      ^                                            |
 *      |                                            v
 *      +----------(success)---- [HALF-OPEN] <---(timeout)
 *                                    |
 *                                    +---(failure)---> [OPEN]
 * ```
 *
 * NOTE: In Deno Edge Functions, module-level state may reset on cold starts.
 * This provides "soft" resilience within a function's lifetime but won't
 * persist across isolate restarts. This is acceptable for our use case.
 *
 * @module circuit-breaker
 */

import { CircuitBreakerOpenError } from './errors.ts';

/**
 * Circuit breaker states
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Configuration options for the circuit breaker
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms to wait before transitioning from open to half-open (default: 30000) */
  resetTimeoutMs?: number;
  /** Name for logging purposes (default: 'CircuitBreaker') */
  name?: string;
}

/**
 * Internal state tracking for the circuit breaker
 */
interface CircuitBreakerState {
  /** Current state of the circuit */
  state: CircuitState;
  /** Count of consecutive failures */
  failureCount: number;
  /** Timestamp when circuit was opened */
  openedAt: number | null;
  /** Last successful call timestamp */
  lastSuccessAt: number | null;
  /** Last failure call timestamp */
  lastFailureAt: number | null;
  /** Total calls made */
  totalCalls: number;
  /** Total failures */
  totalFailures: number;
  /** Total successes */
  totalSuccesses: number;
}

/**
 * Circuit Breaker class for wrapping external API calls.
 *
 * @example
 * ```typescript
 * const circuitBreaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeoutMs: 30000,
 *   name: 'GeminiAPI'
 * });
 *
 * // Normal usage
 * const result = await circuitBreaker.call(() => callGemini(messages));
 *
 * // With fallback
 * const result = await circuitBreaker.call(
 *   () => callGemini(messages),
 *   () => callFallbackModel(messages)
 * );
 * ```
 */
export class CircuitBreaker {
  private readonly config: Required<CircuitBreakerConfig>;
  private state: CircuitBreakerState;

  constructor(config: CircuitBreakerConfig = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      resetTimeoutMs: config.resetTimeoutMs ?? 30000,
      name: config.name ?? 'CircuitBreaker'
    };

    this.state = {
      state: 'closed',
      failureCount: 0,
      openedAt: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0
    };

    console.log(
      `[${this.config.name}] Initialized with threshold=${this.config.failureThreshold}, ` +
      `resetTimeout=${this.config.resetTimeoutMs}ms`
    );
  }

  /**
   * Get the current circuit state.
   */
  getState(): CircuitState {
    // Check if we should transition from open to half-open
    if (this.state.state === 'open' && this.shouldTransitionToHalfOpen()) {
      this.transitionTo('half-open');
    }
    return this.state.state;
  }

  /**
   * Get the current failure count.
   */
  getFailureCount(): number {
    return this.state.failureCount;
  }

  /**
   * Get circuit breaker statistics.
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    totalCalls: number;
    totalSuccesses: number;
    totalFailures: number;
    successRate: number;
  } {
    const successRate = this.state.totalCalls > 0
      ? this.state.totalSuccesses / this.state.totalCalls
      : 1;

    return {
      state: this.getState(),
      failureCount: this.state.failureCount,
      totalCalls: this.state.totalCalls,
      totalSuccesses: this.state.totalSuccesses,
      totalFailures: this.state.totalFailures,
      successRate: Math.round(successRate * 100) / 100
    };
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * @param fn - The async function to execute
   * @param fallback - Optional fallback function to call when circuit is open
   * @returns The result of fn or fallback
   * @throws CircuitBreakerOpenError if circuit is open and no fallback provided
   */
  async call<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    this.state.totalCalls++;

    // Check current state (also handles open->half-open transition)
    const currentState = this.getState();

    if (currentState === 'open') {
      return this.handleOpenState(fallback);
    }

    // Execute the function
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  /**
   * Manually reset the circuit breaker to closed state.
   * Useful for testing or administrative resets.
   */
  reset(): void {
    const previousState = this.state.state;
    this.state.state = 'closed';
    this.state.failureCount = 0;
    this.state.openedAt = null;

    if (previousState !== 'closed') {
      console.log(
        `[${this.config.name}] MANUAL RESET: ${previousState} -> closed`
      );

      // Log structured event for monitoring
      this.logStateChange(previousState, 'closed', 'manual_reset');
    }
  }

  /**
   * Check if the circuit should transition from open to half-open.
   */
  private shouldTransitionToHalfOpen(): boolean {
    if (this.state.state !== 'open' || this.state.openedAt === null) {
      return false;
    }
    return Date.now() - this.state.openedAt >= this.config.resetTimeoutMs;
  }

  /**
   * Handle the case when circuit is in open state.
   */
  private async handleOpenState<T>(
    fallback?: () => Promise<T>
  ): Promise<T> {
    const resetAt = new Date(
      (this.state.openedAt ?? Date.now()) + this.config.resetTimeoutMs
    );

    console.log(
      `[${this.config.name}] Circuit OPEN - rejecting request. ` +
      `Resets at ${resetAt.toISOString()}`
    );

    // If fallback is provided, use it
    if (fallback) {
      const secondsUntilReset = Math.ceil((resetAt.getTime() - Date.now()) / 1000);

      console.log(
        `[${this.config.name}] WARNING: Using fallback function. ` +
        `Circuit is OPEN due to service degradation. ` +
        `Primary service will be retried in ${secondsUntilReset}s.`
      );

      // Log structured event for monitoring
      console.log(JSON.stringify({
        event: 'circuit_breaker_fallback_used',
        circuitName: this.config.name,
        secondsUntilReset,
        resetAt: resetAt.toISOString(),
        totalFailures: this.state.totalFailures,
        failureCount: this.state.failureCount,
        timestamp: new Date().toISOString()
      }));

      try {
        const result = await fallback();
        // Don't count fallback success as circuit recovery
        console.warn(
          `[${this.config.name}] Fallback succeeded but service is DEGRADED. ` +
          `Using secondary provider. Primary service will be retried in ${secondsUntilReset}s.`
        );
        return result;
      } catch (fallbackError) {
        console.error(
          `[${this.config.name}] CRITICAL: Fallback also failed. ` +
          `Both primary and fallback services unavailable. ` +
          `Circuit will reset in ${secondsUntilReset}s.`,
          fallbackError
        );
        throw fallbackError;
      }
    }

    // No fallback - throw error
    throw new CircuitBreakerOpenError(resetAt);
  }

  /**
   * Handle successful call completion.
   */
  private onSuccess(): void {
    this.state.totalSuccesses++;
    this.state.lastSuccessAt = Date.now();

    if (this.state.state === 'half-open') {
      // Success in half-open state -> close the circuit
      this.transitionTo('closed');
    }

    // Reset failure count on success (circuit is healthy)
    this.state.failureCount = 0;
  }

  /**
   * Handle call failure.
   */
  private onFailure(error: unknown): void {
    this.state.totalFailures++;
    this.state.failureCount++;
    this.state.lastFailureAt = Date.now();

    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(
      `[${this.config.name}] Call failed (count: ${this.state.failureCount}): ${errorMessage}`
    );

    if (this.state.state === 'half-open') {
      // Failure in half-open state -> reopen the circuit
      this.transitionTo('open');
    } else if (
      this.state.state === 'closed' &&
      this.state.failureCount >= this.config.failureThreshold
    ) {
      // Threshold exceeded -> open the circuit
      this.transitionTo('open');
    }
  }

  /**
   * Transition to a new state with logging.
   */
  private transitionTo(newState: CircuitState): void {
    const previousState = this.state.state;

    if (previousState === newState) {
      return; // No transition needed
    }

    this.state.state = newState;

    if (newState === 'open') {
      this.state.openedAt = Date.now();
    } else if (newState === 'closed') {
      this.state.failureCount = 0;
      this.state.openedAt = null;
    }

    console.log(
      `[${this.config.name}] State transition: ${previousState} -> ${newState}`
    );

    // Log structured event for monitoring
    this.logStateChange(previousState, newState, 'automatic');
  }

  /**
   * Log state change event as structured JSON for monitoring.
   */
  private logStateChange(
    from: CircuitState,
    to: CircuitState,
    trigger: 'automatic' | 'manual_reset'
  ): void {
    // Calculate success rate
    const successRate = this.state.totalCalls > 0
      ? this.state.totalSuccesses / this.state.totalCalls
      : 1;

    // Structured event for all state changes
    const event = {
      event: 'circuit_breaker_state_change',
      circuitName: this.config.name,
      from,
      to,
      trigger,
      failures: this.state.failureCount,
      totalCalls: this.state.totalCalls,
      totalFailures: this.state.totalFailures,
      totalSuccesses: this.state.totalSuccesses,
      successRate: Math.round(successRate * 100) / 100,
      timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(event));

    // ERROR-level logging when circuit opens (critical event)
    if (to === 'open') {
      const resetAt = new Date(Date.now() + this.config.resetTimeoutMs);
      console.error(
        `🚨 [${this.config.name}] CIRCUIT BREAKER OPENED - Service degraded! ` +
        `Failures: ${this.state.failureCount}/${this.config.failureThreshold}, ` +
        `Success rate: ${Math.round(successRate * 100)}%, ` +
        `Resets at: ${resetAt.toISOString()}`
      );

      // TODO: Integrate with monitoring service (Sentry/Datadog/CloudWatch)
      // Example: Sentry.captureMessage('Circuit breaker opened', { level: 'error', extra: event });
    }
  }
}

/**
 * Create a pre-configured circuit breaker for Gemini API calls.
 *
 * Default configuration:
 * - 5 failures to open (handles temporary blips)
 * - 30 second reset timeout (gives API time to recover)
 *
 * @returns Configured CircuitBreaker instance
 */
export function createGeminiCircuitBreaker(): CircuitBreaker {
  return new CircuitBreaker({
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    name: 'GeminiAPI'
  });
}
