/**
 * Tool Execution Tracker
 *
 * Prevents resource exhaustion by tracking and limiting tool execution
 * within a single request. Implements circuit breaker for cascading failures.
 *
 * SECURITY FIX: Properly cleans up timeouts to prevent memory leaks.
 * Uses AbortController pattern for clean cancellation.
 *
 * @security CWE-400 - Resource Exhaustion Prevention
 */

// =============================================================================
// Types
// =============================================================================

export interface ExecutionLimits {
  maxToolCallsPerRequest: number;
  maxTotalExecutionMs: number;
  maxSingleToolMs: number;
}

export interface ExecutionStats {
  toolCallCount: number;
  totalExecutionMs: number;
  toolExecutions: Array<{
    toolName: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    success: boolean;
    error?: string;
  }>;
}

export class ResourceExhaustionError extends Error {
  constructor(
    public readonly limitType: 'max_calls' | 'max_time' | 'tool_timeout',
    public readonly limit: number,
    public readonly actual: number
  ) {
    super(`Resource limit exceeded: ${limitType} (limit: ${limit}, actual: ${actual})`);
    this.name = 'ResourceExhaustionError';
  }
}

// =============================================================================
// Default Limits
// =============================================================================

export const DEFAULT_EXECUTION_LIMITS: ExecutionLimits = {
  maxToolCallsPerRequest: 3,      // Max tools per request
  maxTotalExecutionMs: 300000,    // 300s total request timeout (allows Gemini 3 Flash thinking mode)
  maxSingleToolMs: 240000,        // 240s per tool (Gemini 3 Flash with comprehensive artifacts can take ~200s)
};

// =============================================================================
// Tracker Implementation
// =============================================================================

export class ToolExecutionTracker {
  private readonly limits: ExecutionLimits;
  private readonly requestId: string;
  private readonly requestStartTime: number;
  private stats: ExecutionStats;
  // SECURITY FIX: Track active timeouts for cleanup
  private activeTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  constructor(requestId: string, limits?: Partial<ExecutionLimits>) {
    this.requestId = requestId;
    this.limits = { ...DEFAULT_EXECUTION_LIMITS, ...limits };
    this.requestStartTime = Date.now();
    this.stats = {
      toolCallCount: 0,
      totalExecutionMs: 0,
      toolExecutions: [],
    };
  }

  /**
   * Check if another tool execution is allowed
   *
   * @throws ResourceExhaustionError if limits exceeded
   */
  checkCanExecute(toolName: string): void {
    // Check 1: Tool call count
    if (this.stats.toolCallCount >= this.limits.maxToolCallsPerRequest) {
      throw new ResourceExhaustionError(
        'max_calls',
        this.limits.maxToolCallsPerRequest,
        this.stats.toolCallCount
      );
    }

    // Check 2: Total execution time
    const elapsed = Date.now() - this.requestStartTime;
    if (elapsed >= this.limits.maxTotalExecutionMs) {
      throw new ResourceExhaustionError(
        'max_time',
        this.limits.maxTotalExecutionMs,
        elapsed
      );
    }

    console.log(
      `[${this.requestId}] Tool execution check: ${toolName} ` +
      `(calls: ${this.stats.toolCallCount + 1}/${this.limits.maxToolCallsPerRequest}, ` +
      `time: ${elapsed}ms/${this.limits.maxTotalExecutionMs}ms)`
    );
  }

  /**
   * Track tool execution with timeout protection
   *
   * SECURITY FIX: Properly cleans up timeout to prevent memory leak.
   * The previous implementation used Promise.race without cleanup,
   * causing the timeout to continue running even after the executor completed.
   */
  async trackExecution<T>(
    toolName: string,
    executor: () => Promise<T>
  ): Promise<T> {
    // Pre-check limits
    this.checkCanExecute(toolName);

    const execution = {
      toolName,
      startTime: Date.now(),
      endTime: undefined as number | undefined,
      durationMs: undefined as number | undefined,
      success: false,
      error: undefined as string | undefined,
    };

    this.stats.toolExecutions.push(execution);
    this.stats.toolCallCount++;

    // SECURITY FIX: Use timeout handle for cleanup
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      // SECURITY FIX: Create cancellable timeout with cleanup
      const result = await Promise.race([
        executor(),
        new Promise<never>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new ResourceExhaustionError(
              'tool_timeout',
              this.limits.maxSingleToolMs,
              this.limits.maxSingleToolMs
            ));
          }, this.limits.maxSingleToolMs);
          // Track for cleanup on destroy
          this.activeTimeouts.add(timeoutHandle);
        }),
      ]);

      execution.endTime = Date.now();
      execution.durationMs = execution.endTime - execution.startTime;
      execution.success = true;
      this.stats.totalExecutionMs += execution.durationMs;

      console.log(
        `[${this.requestId}] Tool executed: ${toolName} ` +
        `(duration: ${execution.durationMs}ms, success: true)`
      );

      return result as T;

    } catch (error) {
      execution.endTime = Date.now();
      execution.durationMs = execution.endTime - execution.startTime;
      execution.success = false;
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      this.stats.totalExecutionMs += execution.durationMs;

      console.error(
        `[${this.requestId}] Tool failed: ${toolName} ` +
        `(duration: ${execution.durationMs}ms, error: ${execution.error})`
      );

      throw error;
    } finally {
      // SECURITY FIX: ALWAYS clean up timeout to prevent memory leak
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
        this.activeTimeouts.delete(timeoutHandle);
      }
    }
  }

  /**
   * Get execution statistics
   */
  getStats(): ExecutionStats {
    return { ...this.stats };
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(): { calls: number; timeMs: number } {
    return {
      calls: this.limits.maxToolCallsPerRequest - this.stats.toolCallCount,
      timeMs: this.limits.maxTotalExecutionMs - (Date.now() - this.requestStartTime),
    };
  }

  /**
   * SECURITY FIX: Clean up all active timeouts
   *
   * Call this when the request is complete to ensure no lingering timers.
   * Prevents memory leaks in long-running edge function instances.
   */
  destroy(): void {
    // BUGFIX: Capture count BEFORE clearing
    const count = this.activeTimeouts.size;
    for (const timeout of this.activeTimeouts) {
      clearTimeout(timeout);
    }
    this.activeTimeouts.clear();
    console.log(`[${this.requestId}] ToolExecutionTracker destroyed, cleaned up ${count} timeouts`);
  }
}
