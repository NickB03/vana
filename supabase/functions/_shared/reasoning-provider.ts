/**
 * Reasoning Provider - Hybrid LLM + Phase-Based Status Generation
 *
 * Provides real-time reasoning updates during artifact generation by combining:
 * - Primary: LLM-based semantic status messages (GLM-4.5-air)
 * - Fallback: Phase-based template messages
 * - Circuit breaker pattern for LLM failures
 * - Anti-flicker and idle heartbeat mechanisms
 *
 * @example
 * ```typescript
 * const provider = new ReasoningProvider({
 *   requestId: 'req_123',
 *   onEvent: (event) => writer.write(`data: ${JSON.stringify(event)}\n\n`)
 * });
 *
 * await provider.start();
 * provider.processReasoningChunk('Analyzing user requirements...');
 * await provider.finalize('Created a calculator app');
 * provider.destroy();
 * ```
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Generation phase during artifact creation
 * Maps to different stages of the development process
 */
export type ThinkingPhase =
  | 'analyzing'     // Understanding requirements, analyzing context
  | 'planning'      // Designing architecture, planning approach
  | 'implementing'  // Writing core logic, building features
  | 'styling'       // Adding UI polish, styling components
  | 'finalizing';   // Final touches, optimization

/**
 * Reasoning event types emitted via SSE
 */
export type ReasoningEventType =
  | 'reasoning_status'    // Regular status update
  | 'reasoning_final'     // Final summary on completion
  | 'reasoning_heartbeat' // Idle keepalive signal
  | 'reasoning_error';    // Error notification

/**
 * SSE event emitted by the reasoning provider
 */
export interface ReasoningEvent {
  /** Event type for client-side routing */
  type: ReasoningEventType;

  /** Human-readable status message */
  message: string;

  /** Current thinking phase */
  phase: ThinkingPhase;

  /** Event metadata */
  metadata: {
    /** Request ID for correlation */
    requestId: string;

    /** Event timestamp (ISO 8601) */
    timestamp: string;

    /** Message source: 'llm' or 'fallback' */
    source: 'llm' | 'fallback';

    /** LLM provider name (if source is 'llm') */
    provider?: string;

    /** LLM model name (if source is 'llm') */
    model?: string;

    /** True if circuit breaker is open (LLM disabled) */
    circuitBreakerOpen?: boolean;
  };
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for the reasoning provider
 */
export interface ReasoningConfig {
  // ========== Buffering ==========

  /**
   * Minimum characters to buffer before calling LLM
   * Prevents excessive API calls for small chunks
   * @default 150
   */
  minBufferChars: number;

  /**
   * Maximum characters to buffer before forcing LLM call
   * Prevents stale updates during long reasoning blocks
   * @default 500
   */
  maxBufferChars: number;

  /**
   * Maximum time to wait before forcing LLM call (ms)
   * Ensures updates even with slow reasoning streams
   * @default 3000
   */
  maxWaitMs: number;

  // ========== Rate Limiting ==========

  /**
   * Minimum interval between status updates (ms)
   * Anti-flicker mechanism for smooth UI
   * @default 1500
   */
  minUpdateIntervalMs: number;

  /**
   * Maximum concurrent LLM calls in flight
   * Prevents request queue buildup
   * @default 3
   */
  maxPendingCalls: number;

  // ========== Timeouts ==========

  /**
   * LLM request timeout (ms)
   * Fail fast and fall back to phase messages
   * @default 2000
   */
  timeoutMs: number;

  /**
   * Idle heartbeat interval (ms)
   * Send keepalive when no reasoning chunks received
   * @default 8000
   */
  idleHeartbeatMs: number;

  // ========== Circuit Breaker ==========

  /**
   * Consecutive LLM failures before opening circuit
   * Disables LLM and falls back to phase messages
   * @default 3
   */
  circuitBreakerThreshold: number;

  /**
   * Time to wait before attempting to close circuit (ms)
   * Retry LLM after cooldown period
   * @default 30000 (30 seconds)
   */
  circuitBreakerResetMs: number;
}

/**
 * Partial configuration for overriding defaults
 */
export type ReasoningConfigPartial = Partial<ReasoningConfig>;

/**
 * Default configuration values
 */
export const DEFAULT_REASONING_CONFIG: ReasoningConfig = {
  minBufferChars: 150,
  maxBufferChars: 500,
  maxWaitMs: 3000,
  minUpdateIntervalMs: 1500,
  maxPendingCalls: 3,
  timeoutMs: 2000,
  idleHeartbeatMs: 8000,
  circuitBreakerThreshold: 3,
  circuitBreakerResetMs: 30000,
};

// ============================================================================
// Phase Configuration
// ============================================================================

/**
 * Phase-specific configuration for fallback messages
 */
export interface PhaseConfig {
  /** Human-readable phase name */
  name: string;

  /** Fallback messages for this phase */
  messages: string[];

  /** Typical duration hint for progress estimation (ms) */
  typicalDurationMs?: number;
}

/**
 * Phase configuration map
 */
export type PhaseConfigMap = Record<ThinkingPhase, PhaseConfig>;

/**
 * Default phase configurations with fallback messages
 */
export const DEFAULT_PHASE_CONFIG: PhaseConfigMap = {
  analyzing: {
    name: 'Analyzing',
    messages: [
      'Analyzing requirements...',
      'Understanding the context...',
      'Evaluating approach...',
    ],
    typicalDurationMs: 2000,
  },
  planning: {
    name: 'Planning',
    messages: [
      'Designing the architecture...',
      'Planning component structure...',
      'Outlining implementation strategy...',
    ],
    typicalDurationMs: 3000,
  },
  implementing: {
    name: 'Implementing',
    messages: [
      'Building core functionality...',
      'Implementing features...',
      'Writing application logic...',
    ],
    typicalDurationMs: 5000,
  },
  styling: {
    name: 'Styling',
    messages: [
      'Adding visual polish...',
      'Styling components...',
      'Refining the interface...',
    ],
    typicalDurationMs: 2000,
  },
  finalizing: {
    name: 'Finalizing',
    messages: [
      'Finalizing implementation...',
      'Adding final touches...',
      'Completing the artifact...',
    ],
    typicalDurationMs: 1000,
  },
};

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Event callback for reasoning events
 */
export type ReasoningEventCallback = (event: ReasoningEvent) => void | Promise<void>;

/**
 * Options for creating a reasoning provider
 */
export interface ReasoningProviderOptions {
  /** Request ID for correlation and logging */
  requestId: string;

  /** Event callback for SSE emissions */
  onEvent: ReasoningEventCallback;

  /** Optional configuration overrides */
  config?: ReasoningConfigPartial;

  /** Optional phase configuration overrides */
  phaseConfig?: Partial<PhaseConfigMap>;

  /** Optional LLM client for dependency injection (for testing) */
  llmClient?: ILLMClient;
}

/**
 * Internal state of the reasoning provider
 */
export interface ProviderState {
  /** Current thinking phase */
  currentPhase: ThinkingPhase;

  /** Buffered reasoning text awaiting processing */
  buffer: string;

  /** Timestamp of last emitted event (for anti-flicker) */
  lastEmitTime: number;

  /** Number of pending LLM calls */
  pendingCalls: number;

  /** Timestamp of last buffer flush attempt */
  lastFlushAttempt: number;

  /** Whether provider has been destroyed */
  destroyed: boolean;

  /** Timestamp of last received reasoning chunk (for idle detection) */
  lastChunkTime: number;

  /** Circuit breaker state */
  circuitBreaker: {
    /** Number of consecutive failures */
    consecutiveFailures: number;

    /** Whether circuit is open (LLM disabled) */
    isOpen: boolean;

    /** Timestamp when circuit was opened */
    openedAt?: number;
  };
}

/**
 * LLM client interface for generating status messages
 * Abstraction for testability and provider swapping
 */
export interface ILLMClient {
  /**
   * Generate a concise status message from reasoning text
   *
   * @param reasoningText - Raw reasoning text to summarize
   * @param phase - Current thinking phase for context
   * @param requestId - Request ID for logging/correlation
   * @returns Promise resolving to status message
   * @throws Error if LLM call fails or times out
   */
  generateStatus(
    reasoningText: string,
    phase: ThinkingPhase,
    requestId: string
  ): Promise<string>;

  /**
   * Generate a final summary message
   *
   * @param reasoningHistory - Complete reasoning text history
   * @param artifactDescription - Description of created artifact
   * @param requestId - Request ID for logging/correlation
   * @returns Promise resolving to final summary
   * @throws Error if LLM call fails or times out
   */
  generateFinalSummary(
    reasoningHistory: string,
    artifactDescription: string,
    requestId: string
  ): Promise<string>;
}

/**
 * Reasoning provider interface for testability
 *
 * Manages real-time reasoning status updates during artifact generation
 * with hybrid LLM + phase-based fallback strategy.
 */
export interface IReasoningProvider {
  /**
   * Start the reasoning provider
   * Initializes timers and emits first status
   */
  start(): Promise<void>;

  /**
   * Process a chunk of reasoning text
   * Buffers text and triggers LLM status generation when appropriate
   *
   * @param chunk - Reasoning text chunk
   */
  processReasoningChunk(chunk: string): Promise<void>;

  /**
   * Update the current thinking phase
   * Triggers immediate status emission with new phase context
   *
   * @param phase - New thinking phase
   */
  setPhase(phase: ThinkingPhase): Promise<void>;

  /**
   * Finalize reasoning and emit summary
   * Should be called when artifact generation completes
   *
   * @param artifactDescription - Brief description of created artifact
   */
  finalize(artifactDescription: string): Promise<void>;

  /**
   * Clean up resources and stop all timers
   * Must be called when reasoning is complete or cancelled
   */
  destroy(): void;

  /**
   * Get current provider state (for debugging/testing)
   */
  getState(): Readonly<ProviderState>;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * LLM response for status generation
 */
export interface LLMStatusResponse {
  /** Generated status message */
  message: string;

  /** Provider name (e.g., 'z.ai') */
  provider: string;

  /** Model name (e.g., 'glm-4.5-air') */
  model: string;

  /** Response latency in milliseconds */
  latencyMs: number;
}

/**
 * Error type for LLM failures
 */
export interface LLMError extends Error {
  /** Error code for categorization */
  code: 'TIMEOUT' | 'API_ERROR' | 'INVALID_RESPONSE' | 'UNKNOWN';

  /** Provider name if available */
  provider?: string;

  /** Original error if wrapped */
  cause?: Error;
}

// ============================================================================
// Helper Type Guards
// ============================================================================

/**
 * Type guard for ReasoningEvent
 */
export function isReasoningEvent(value: unknown): value is ReasoningEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'message' in value &&
    'phase' in value &&
    'metadata' in value
  );
}

/**
 * Type guard for LLMError
 */
export function isLLMError(error: unknown): error is LLMError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as LLMError).code === 'string'
  );
}

// ============================================================================
// GLM Client Implementation
// ============================================================================

/**
 * GLM-4.5-air client for ultra-fast status generation
 *
 * Uses Z.ai Coding API endpoint for GLM models. Designed for speed:
 * - Small, focused prompts
 * - Strict timeout enforcement
 * - Structured error handling
 */
export class GLMClient implements ILLMClient {
  private readonly apiKey: string;
  // Z.ai Coding API endpoint (see https://docs.z.ai/devpack/tool/others)
  private readonly baseUrl = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
  // Using GLM-4.5-air for fast status generation (lightweight variant optimized for speed)
  private readonly model = 'glm-4.5-air';
  private readonly timeoutMs: number;

  constructor(apiKey: string, timeoutMs: number = 2000) {
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async generateStatus(
    reasoningText: string,
    phase: ThinkingPhase,
    requestId: string
  ): Promise<string> {
    const startTime = Date.now();

    const prompt = `You are a UI status generator. Given this AI reasoning text, write a SHORT status message (5-10 words) describing what the AI is currently doing.

Phase: ${phase}
Reasoning: ${reasoningText.slice(0, 500)}

Requirements:
- Use present continuous tense ("Analyzing...", "Building...", "Designing...")
- Be specific but concise
- No punctuation at end except "..."
- Focus on the CURRENT action, not the overall goal

Status:`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 50,
          temperature: 0.3,
          // Disable thinking mode for status generation - we want direct output
          thinking: { type: 'disabled' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new Error(`GLM API error: ${response.status}`) as LLMError;
        error.code = 'API_ERROR';
        error.provider = 'z.ai';
        throw error;
      }

      const data = await response.json();
      // Z.ai response format: choices[0].message.content
      const message = data.choices?.[0]?.message?.content?.trim();

      if (!message) {
        // Debug: log the actual response structure to understand the format
        console.warn(`[ReasoningProvider:${requestId}] Unexpected GLM response:`, JSON.stringify(data).substring(0, 500));
        const error = new Error('Empty response from GLM') as LLMError;
        error.code = 'INVALID_RESPONSE';
        error.provider = 'z.ai';
        throw error;
      }

      const latencyMs = Date.now() - startTime;
      console.log(`[ReasoningProvider:${requestId}] GLM status generated in ${latencyMs}ms: "${message}"`);

      return message;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        const error = new Error(`GLM request timed out after ${this.timeoutMs}ms`) as LLMError;
        error.code = 'TIMEOUT';
        error.provider = 'z.ai';
        throw error;
      }

      if (isLLMError(err)) {
        throw err;
      }

      const error = new Error(`GLM request failed: ${err}`) as LLMError;
      error.code = 'UNKNOWN';
      error.provider = 'z.ai';
      error.cause = err instanceof Error ? err : undefined;
      throw error;
    }
  }

  async generateFinalSummary(
    reasoningHistory: string,
    artifactDescription: string,
    requestId: string
  ): Promise<string> {
    const startTime = Date.now();

    const prompt = `You are a UI status generator. Write a brief completion message (8-15 words) summarizing what was created.

Artifact: ${artifactDescription}
Context: ${reasoningHistory.slice(-1000)}

Requirements:
- Past tense ("Created...", "Built...", "Designed...")
- Highlight the key feature or capability
- Professional but friendly tone
- End with period

Summary:`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs * 1.5); // Longer timeout for final

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 75,
          temperature: 0.4,
          // Disable thinking mode for summary generation - we want direct output
          thinking: { type: 'disabled' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new Error(`GLM API error: ${response.status}`) as LLMError;
        error.code = 'API_ERROR';
        error.provider = 'z.ai';
        throw error;
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content?.trim();

      if (!message) {
        const error = new Error('Empty response from GLM') as LLMError;
        error.code = 'INVALID_RESPONSE';
        error.provider = 'z.ai';
        throw error;
      }

      const latencyMs = Date.now() - startTime;
      console.log(`[ReasoningProvider:${requestId}] Final summary generated in ${latencyMs}ms: "${message}"`);

      return message;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        const error = new Error(`GLM request timed out`) as LLMError;
        error.code = 'TIMEOUT';
        error.provider = 'z.ai';
        throw error;
      }

      if (isLLMError(err)) {
        throw err;
      }

      const error = new Error(`GLM request failed: ${err}`) as LLMError;
      error.code = 'UNKNOWN';
      error.provider = 'z.ai';
      error.cause = err instanceof Error ? err : undefined;
      throw error;
    }
  }
}

// ============================================================================
// Phase Detection
// ============================================================================

/**
 * Keywords that indicate specific thinking phases
 */
const PHASE_KEYWORDS: Record<ThinkingPhase, string[]> = {
  analyzing: [
    'understand', 'analyze', 'consider', 'examine', 'review',
    'requirement', 'need', 'want', 'looking at', 'thinking about',
  ],
  planning: [
    'plan', 'design', 'architect', 'structure', 'organize',
    'approach', 'strategy', 'component', 'layout', 'framework',
  ],
  implementing: [
    'implement', 'build', 'create', 'code', 'write',
    'function', 'class', 'logic', 'algorithm', 'handler',
  ],
  styling: [
    'style', 'css', 'tailwind', 'color', 'theme',
    'responsive', 'animation', 'visual', 'ui', 'ux',
  ],
  finalizing: [
    'final', 'finish', 'complete', 'polish', 'refine',
    'optimize', 'clean', 'review', 'test', 'verify',
  ],
};

/**
 * Detect the thinking phase from reasoning text
 */
function detectPhase(text: string, currentPhase: ThinkingPhase): ThinkingPhase {
  const lowerText = text.toLowerCase();

  // Score each phase based on keyword matches
  const scores: Record<ThinkingPhase, number> = {
    analyzing: 0,
    planning: 0,
    implementing: 0,
    styling: 0,
    finalizing: 0,
  };

  for (const [phase, keywords] of Object.entries(PHASE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        scores[phase as ThinkingPhase] += 1;
      }
    }
  }

  // Find highest scoring phase
  let bestPhase = currentPhase;
  let bestScore = 0;

  for (const [phase, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestPhase = phase as ThinkingPhase;
    }
  }

  // Only change phase if we have strong signal (2+ keyword matches)
  return bestScore >= 2 ? bestPhase : currentPhase;
}

// ============================================================================
// Reasoning Provider Implementation
// ============================================================================

/**
 * Hybrid reasoning provider implementation
 *
 * Combines LLM-based status generation with phase-based fallback:
 * - Buffers reasoning text until threshold reached
 * - Calls LLM to generate semantic status message
 * - Falls back to phase templates on LLM failure
 * - Circuit breaker prevents repeated LLM failures
 * - Anti-flicker cooldown ensures smooth UI updates
 */
export class ReasoningProvider implements IReasoningProvider {
  private readonly requestId: string;
  private readonly onEvent: ReasoningEventCallback;
  private readonly config: ReasoningConfig;
  private readonly phaseConfig: PhaseConfigMap;
  private readonly llmClient: ILLMClient;

  private state: ProviderState;
  private reasoningHistory: string = '';
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private phaseMessageIndex: Record<ThinkingPhase, number> = {
    analyzing: 0,
    planning: 0,
    implementing: 0,
    styling: 0,
    finalizing: 0,
  };

  constructor(options: ReasoningProviderOptions) {
    this.requestId = options.requestId;
    this.onEvent = options.onEvent;
    this.config = { ...DEFAULT_REASONING_CONFIG, ...options.config };
    this.phaseConfig = { ...DEFAULT_PHASE_CONFIG, ...options.phaseConfig };

    // Use injected LLM client or create default
    const apiKey = Deno.env.get('GLM_API_KEY');
    this.llmClient = options.llmClient ??
      (apiKey ? new GLMClient(apiKey, this.config.timeoutMs) : this.createFallbackClient());

    this.state = {
      currentPhase: 'analyzing',
      buffer: '',
      lastEmitTime: 0,
      pendingCalls: 0,
      lastFlushAttempt: 0,
      destroyed: false,
      lastChunkTime: Date.now(),
      circuitBreaker: {
        consecutiveFailures: 0,
        isOpen: false,
      },
    };
  }

  /**
   * Create a fallback client that always fails (triggers phase fallback)
   */
  private createFallbackClient(): ILLMClient {
    return {
      generateStatus: async () => {
        throw new Error('No GLM_API_KEY configured');
      },
      generateFinalSummary: async () => {
        throw new Error('No GLM_API_KEY configured');
      },
    };
  }

  async start(): Promise<void> {
    if (this.state.destroyed) {
      console.warn(`[ReasoningProvider:${this.requestId}] Cannot start destroyed provider`);
      return;
    }

    console.log(`[ReasoningProvider:${this.requestId}] Starting with config:`, {
      minBufferChars: this.config.minBufferChars,
      maxWaitMs: this.config.maxWaitMs,
      circuitBreakerThreshold: this.config.circuitBreakerThreshold,
    });

    // Emit initial status
    await this.emitStatus('Analyzing your request...', 'fallback');

    // Start heartbeat timer
    this.startHeartbeat();
  }

  async processReasoningChunk(chunk: string): Promise<void> {
    if (this.state.destroyed) return;

    // Update last chunk time for idle detection
    this.state.lastChunkTime = Date.now();

    // Accumulate in buffer
    this.state.buffer += chunk;
    this.reasoningHistory += chunk;

    // Detect phase changes
    const detectedPhase = detectPhase(this.state.buffer, this.state.currentPhase);
    if (detectedPhase !== this.state.currentPhase) {
      console.log(`[ReasoningProvider:${this.requestId}] Phase transition: ${this.state.currentPhase} → ${detectedPhase}`);
      this.state.currentPhase = detectedPhase;
    }

    // Check if we should flush
    const shouldFlush =
      this.state.buffer.length >= this.config.minBufferChars ||
      (this.state.buffer.length > 0 && Date.now() - this.state.lastFlushAttempt > this.config.maxWaitMs);

    if (shouldFlush) {
      await this.flush();
    } else if (!this.flushTimer) {
      // Schedule flush for max wait time
      this.flushTimer = setTimeout(() => {
        this.flush().catch(console.error);
      }, this.config.maxWaitMs);
    }
  }

  async setPhase(phase: ThinkingPhase): Promise<void> {
    if (this.state.destroyed) return;

    if (phase !== this.state.currentPhase) {
      console.log(`[ReasoningProvider:${this.requestId}] Manual phase set: ${this.state.currentPhase} → ${phase}`);
      this.state.currentPhase = phase;

      // Emit immediate status for phase change
      await this.emitFallbackStatus();
    }
  }

  async finalize(artifactDescription: string): Promise<void> {
    if (this.state.destroyed) return;

    console.log(`[ReasoningProvider:${this.requestId}] Finalizing with description: "${artifactDescription}"`);

    // Flush any remaining buffer
    if (this.state.buffer.length > 0) {
      await this.flush();
    }

    // Try to generate LLM summary
    let finalMessage: string;
    let source: 'llm' | 'fallback' = 'fallback';

    if (!this.state.circuitBreaker.isOpen) {
      try {
        finalMessage = await this.llmClient.generateFinalSummary(
          this.reasoningHistory,
          artifactDescription,
          this.requestId
        );
        source = 'llm';
        this.recordSuccess();
      } catch (error) {
        console.warn(`[ReasoningProvider:${this.requestId}] Final summary LLM failed, using fallback:`, error);
        this.recordFailure();
        finalMessage = `Created ${artifactDescription}.`;
      }
    } else {
      finalMessage = `Created ${artifactDescription}.`;
    }

    // Emit final event
    await this.emitEvent({
      type: 'reasoning_final',
      message: finalMessage,
      phase: 'finalizing',
      metadata: {
        requestId: this.requestId,
        timestamp: new Date().toISOString(),
        source,
        provider: source === 'llm' ? 'z.ai' : undefined,
        model: source === 'llm' ? 'glm-4.5-air' : undefined,
      },
    });

    // Clean up
    this.destroy();
  }

  destroy(): void {
    if (this.state.destroyed) return;

    console.log(`[ReasoningProvider:${this.requestId}] Destroying provider`);

    this.state.destroyed = true;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getState(): Readonly<ProviderState> {
    return { ...this.state };
  }

  // ========== Private Methods ==========

  private async flush(): Promise<void> {
    if (this.state.destroyed || this.state.buffer.length === 0) return;

    // Clear pending flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    this.state.lastFlushAttempt = Date.now();

    // Check anti-flicker cooldown
    const timeSinceLastEmit = Date.now() - this.state.lastEmitTime;
    if (timeSinceLastEmit < this.config.minUpdateIntervalMs) {
      // Schedule flush after cooldown
      this.flushTimer = setTimeout(() => {
        this.flush().catch(console.error);
      }, this.config.minUpdateIntervalMs - timeSinceLastEmit);
      return;
    }

    // Check pending call limit
    if (this.state.pendingCalls >= this.config.maxPendingCalls) {
      console.log(`[ReasoningProvider:${this.requestId}] Max pending calls reached, using fallback`);
      await this.emitFallbackStatus();
      this.state.buffer = '';
      return;
    }

    // Check circuit breaker
    if (this.state.circuitBreaker.isOpen) {
      // Check if we should try to close
      const openDuration = Date.now() - (this.state.circuitBreaker.openedAt ?? 0);
      if (openDuration >= this.config.circuitBreakerResetMs) {
        console.log(`[ReasoningProvider:${this.requestId}] Circuit breaker half-open, attempting LLM call`);
        // Try a single call to see if LLM recovered
      } else {
        await this.emitFallbackStatus();
        this.state.buffer = '';
        return;
      }
    }

    // Try LLM call
    const bufferContent = this.state.buffer;
    this.state.buffer = '';
    this.state.pendingCalls++;

    try {
      const message = await this.llmClient.generateStatus(
        bufferContent,
        this.state.currentPhase,
        this.requestId
      );

      this.state.pendingCalls--;
      this.recordSuccess();
      await this.emitStatus(message, 'llm');
    } catch (error) {
      this.state.pendingCalls--;
      this.recordFailure();

      console.warn(`[ReasoningProvider:${this.requestId}] LLM call failed:`, error);
      await this.emitFallbackStatus();
    }
  }

  private async emitFallbackStatus(): Promise<void> {
    const phase = this.state.currentPhase;
    const messages = this.phaseConfig[phase].messages;

    // Rotate through messages
    const index = this.phaseMessageIndex[phase] % messages.length;
    this.phaseMessageIndex[phase]++;

    await this.emitStatus(messages[index], 'fallback');
  }

  private async emitStatus(message: string, source: 'llm' | 'fallback'): Promise<void> {
    await this.emitEvent({
      type: 'reasoning_status',
      message,
      phase: this.state.currentPhase,
      metadata: {
        requestId: this.requestId,
        timestamp: new Date().toISOString(),
        source,
        provider: source === 'llm' ? 'z.ai' : undefined,
        model: source === 'llm' ? 'glm-4.5-air' : undefined,
        circuitBreakerOpen: this.state.circuitBreaker.isOpen,
      },
    });
  }

  private async emitEvent(event: ReasoningEvent): Promise<void> {
    this.state.lastEmitTime = Date.now();

    try {
      await this.onEvent(event);
    } catch (error) {
      console.error(`[ReasoningProvider:${this.requestId}] Failed to emit event:`, error);
    }
  }

  private recordSuccess(): void {
    if (this.state.circuitBreaker.isOpen) {
      console.log(`[ReasoningProvider:${this.requestId}] Circuit breaker closing after successful call`);
    }
    this.state.circuitBreaker.consecutiveFailures = 0;
    this.state.circuitBreaker.isOpen = false;
    this.state.circuitBreaker.openedAt = undefined;
  }

  private recordFailure(): void {
    this.state.circuitBreaker.consecutiveFailures++;

    if (
      !this.state.circuitBreaker.isOpen &&
      this.state.circuitBreaker.consecutiveFailures >= this.config.circuitBreakerThreshold
    ) {
      console.warn(
        `[ReasoningProvider:${this.requestId}] Circuit breaker OPEN after ${this.state.circuitBreaker.consecutiveFailures} failures`
      );
      this.state.circuitBreaker.isOpen = true;
      this.state.circuitBreaker.openedAt = Date.now();
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
    }

    const checkIdle = async () => {
      if (this.state.destroyed) return;

      const idleTime = Date.now() - this.state.lastChunkTime;
      if (idleTime >= this.config.idleHeartbeatMs) {
        // Emit heartbeat
        await this.emitEvent({
          type: 'reasoning_heartbeat',
          message: this.phaseConfig[this.state.currentPhase].messages[0],
          phase: this.state.currentPhase,
          metadata: {
            requestId: this.requestId,
            timestamp: new Date().toISOString(),
            source: 'fallback',
          },
        });
      }

      // Schedule next check
      this.heartbeatTimer = setTimeout(checkIdle, this.config.idleHeartbeatMs);
    };

    this.heartbeatTimer = setTimeout(checkIdle, this.config.idleHeartbeatMs);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a no-op reasoning provider for testing or disabled scenarios
 *
 * @returns IReasoningProvider that does nothing
 */
export function createNoOpReasoningProvider(): IReasoningProvider {
  const noOpState: ProviderState = {
    currentPhase: 'analyzing',
    buffer: '',
    lastEmitTime: 0,
    pendingCalls: 0,
    lastFlushAttempt: 0,
    destroyed: false,
    lastChunkTime: Date.now(),
    circuitBreaker: {
      consecutiveFailures: 0,
      isOpen: false,
    },
  };

  return {
    start: async () => {},
    processReasoningChunk: async () => {},
    setPhase: async () => {},
    finalize: async () => {},
    destroy: () => {},
    getState: () => noOpState,
  };
}

/**
 * Create a reasoning provider with sensible defaults
 *
 * @param requestId - Request ID for correlation
 * @param onEvent - Callback for emitting events
 * @param options - Optional configuration overrides
 * @returns Configured IReasoningProvider
 */
export function createReasoningProvider(
  requestId: string,
  onEvent: ReasoningEventCallback,
  options?: {
    config?: ReasoningConfigPartial;
    phaseConfig?: Partial<PhaseConfigMap>;
    llmClient?: ILLMClient;
  }
): IReasoningProvider {
  return new ReasoningProvider({
    requestId,
    onEvent,
    config: options?.config,
    phaseConfig: options?.phaseConfig,
    llmClient: options?.llmClient,
  });
}
