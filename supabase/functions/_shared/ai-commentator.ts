/**
 * AI Sidecar Commentator
 *
 * Uses GLM-4.5-AirX for ultra-fast semantic summarization of reasoning text.
 * Runs asynchronously alongside the main GLM-4.6 artifact generation stream.
 *
 * Architecture:
 * - GLM-4.6 (Thinker): Deep reasoning, artifact code generation
 * - GLM-4.5-AirX (Commentator): Fast status summaries for UI ticker
 *
 * The Commentator monitors the reasoning text stream and generates concise,
 * semantic status updates (e.g., "Designing authentication flow") that replace
 * brittle regex-based heuristics.
 *
 * Key Features:
 * - Buffer management with sentence-boundary detection
 * - Anti-flicker cooldown to prevent rapid status changes
 * - Sequence tracking to discard stale/out-of-order updates
 * - Timeout protection to prevent blocking the main stream
 * - Graceful degradation on errors
 *
 * @module ai-commentator
 */

import { MODELS } from './config.ts';

// GLM API configuration (reuse from glm-client.ts)
const GLM_API_KEY = Deno.env.get("GLM_API_KEY");
const GLM_BASE_URL = "https://api.z.ai/api/coding/paas/v4";

/**
 * Generation phases for contextual idle messages
 */
type GenerationPhase = 'analyzing' | 'planning' | 'implementing' | 'styling' | 'finalizing';

/**
 * Phase-aware idle messages shown when no new chunks arrive
 * Each phase has multiple messages that cycle to provide visual feedback
 */
const PHASE_IDLE_MESSAGES: Record<GenerationPhase, string[]> = {
  analyzing: [
    'Analyzing requirements',
    'Understanding the request',
    'Breaking down the problem',
  ],
  planning: [
    'Planning the approach',
    'Designing the solution',
    'Structuring the code',
  ],
  implementing: [
    'Writing the code',
    'Implementing logic',
    'Building components',
    'Generating code',
  ],
  styling: [
    'Adding styles',
    'Polishing the UI',
    'Refining the design',
  ],
  finalizing: [
    'Finalizing the artifact',
    'Completing generation',
    'Wrapping up',
  ],
};

/**
 * Configuration options for the AI Commentator
 */
export interface CommentatorConfig {
  /** Minimum buffer size before triggering a sidecar call (default: 150) */
  minBufferChars: number;
  /** Maximum buffer size - force flush even mid-sentence (default: 500) */
  maxBufferChars: number;
  /** Maximum time to wait before flushing buffer (default: 3000ms) */
  maxWaitMs: number;
  /** Minimum interval between status updates to prevent flickering (default: 1500ms) */
  minUpdateIntervalMs: number;
  /** Timeout for sidecar API calls (default: 2000ms) */
  timeoutMs: number;
  /** Maximum concurrent pending sidecar calls (default: 3) */
  maxPendingCalls: number;
  /** Interval for idle heartbeat messages when no chunks arrive (default: 8000ms) */
  idleHeartbeatMs: number;
}

/**
 * Internal state for the commentator
 */
interface CommentatorState {
  buffer: string;
  lastFlushTime: number;
  lastEmittedStatus: string;
  lastEmittedTimestamp: number;
  pendingCalls: number;
  sequenceId: number;
  /** Current generation phase for contextual idle messages */
  currentPhase: GenerationPhase;
  /** Index for cycling through idle messages within a phase */
  idleMessageIndex: number;
  /** Timestamp of last received chunk (for idle detection) */
  lastChunkTime: number;
  /** Whether we're currently in content generation (vs reasoning) */
  inContentPhase: boolean;
}

/**
 * System prompt for GLM-4.5-AirX to generate concise status updates
 *
 * The prompt is carefully engineered to:
 * 1. Force present-participle verbs (Analyzing, Designing, etc.)
 * 2. Avoid conversational language (I am, Let me, etc.)
 * 3. Keep outputs extremely brief (2-5 words)
 * 4. Focus on the ACTION being performed
 */
const COMMENTATOR_SYSTEM_PROMPT = `You are a concise status summarizer for an AI coding assistant.

TASK: Convert AI text (reasoning OR code) into a brief status update (2-5 words).

RULES:
1. Use present participle (-ing) verbs: "Analyzing", "Designing", "Writing"
2. Be specific but brief: "Designing authentication flow" NOT "Working on things"
3. Never use first person: NO "I am", "I will", "I'm"
4. Never be conversational: NO "Let me", "Now I'll", "Okay so"
5. Focus on the ACTION, not the thought process
6. If the input is actual code, describe WHAT is being built
7. If reasoning is meta-discussion or unclear, return: "Processing request"

EXAMPLES FOR REASONING TEXT:
Input: "I need to think about how the database schema should handle..."
Output: "Designing database schema"

Input: "Looking at the authentication middleware, I see that..."
Output: "Analyzing auth middleware"

Input: "The user wants a React component that can..."
Output: "Planning React component"

EXAMPLES FOR CODE GENERATION:
Input: "function handleClick() { setCount(c => c + 1) }"
Output: "Writing click handler"

Input: "<div className='flex items-center gap-2'>"
Output: "Building layout structure"

Input: "const [isOpen, setIsOpen] = useState(false)"
Output: "Adding state management"

Input: "import { motion } from 'framer-motion'"
Output: "Setting up animations"

Input: "async function fetchData() { const res = await fetch..."
Output: "Implementing data fetching"

OUTPUT: Return ONLY the status phrase, nothing else. No quotes, no punctuation at the end.`;

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CommentatorConfig = {
  minBufferChars: 150,
  maxBufferChars: 500,
  maxWaitMs: 3000,
  minUpdateIntervalMs: 1500,
  timeoutMs: 2000,
  maxPendingCalls: 3,
  idleHeartbeatMs: 8000, // Emit heartbeat every 8 seconds if no chunks
};

/**
 * AI Sidecar Commentator
 *
 * Monitors reasoning text and generates semantic status updates asynchronously.
 *
 * @example
 * ```typescript
 * const commentator = new AICommentator(
 *   async (status) => {
 *     controller.enqueue(encoder.encode(
 *       `event: thinking_update\ndata: ${JSON.stringify({ status })}\n\n`
 *     ));
 *   },
 *   requestId
 * );
 *
 * // In GLM stream callback:
 * onReasoningChunk: (chunk) => {
 *   commentator.push(chunk);
 * }
 *
 * // After stream ends:
 * await commentator.flush();
 * ```
 */
export class AICommentator {
  private config: CommentatorConfig;
  private state: CommentatorState;
  private onStatusUpdate: (status: string) => void | Promise<void>;
  private flushTimer: number | null = null;
  private idleHeartbeatTimer: number | null = null;
  private requestId: string;
  private enabled: boolean;

  constructor(
    onStatusUpdate: (status: string) => void | Promise<void>,
    requestId: string,
    config: Partial<CommentatorConfig & { _forceEnabled?: boolean }> = {}
  ) {
    // Extract test-only option
    const forceEnabled = config._forceEnabled;
    // deno-lint-ignore no-unused-vars
    const { _forceEnabled, ...cleanConfig } = config as CommentatorConfig & { _forceEnabled?: boolean };

    this.config = { ...DEFAULT_CONFIG, ...cleanConfig };
    this.onStatusUpdate = onStatusUpdate;
    this.requestId = requestId;
    this.enabled = forceEnabled ?? !!GLM_API_KEY;

    const now = Date.now();
    this.state = {
      buffer: '',
      lastFlushTime: now,
      lastEmittedStatus: '',
      lastEmittedTimestamp: 0,
      pendingCalls: 0,
      sequenceId: 0,
      currentPhase: 'analyzing',
      idleMessageIndex: 0,
      lastChunkTime: now,
      inContentPhase: false,
    };

    if (!this.enabled) {
      console.warn(`[${this.requestId}] AICommentator disabled: GLM_API_KEY not configured`);
    } else {
      console.log(`[${this.requestId}] AICommentator initialized (model: ${MODELS.GLM_4_5_AIR})`);
      // Start idle heartbeat timer
      this.startIdleHeartbeat();
    }
  }

  /**
   * Push new reasoning text to the buffer
   *
   * This is called for each reasoning chunk received from GLM-4.6.
   * The buffer accumulates text until flush conditions are met.
   *
   * @param text - Reasoning text chunk from GLM-4.6
   */
  push(text: string): void {
    if (!this.enabled) return;

    this.state.buffer += text;
    this.state.lastChunkTime = Date.now();

    // Detect phase transitions from reasoning content
    this.detectPhase(text);

    // Reset idle heartbeat when we receive new content
    this.resetIdleHeartbeat();

    this.checkFlush();
  }

  /**
   * Notify commentator that content generation has started
   * (reasoning phase is complete, now generating artifact code)
   */
  notifyContentPhase(): void {
    if (!this.enabled) return;

    this.state.inContentPhase = true;
    this.state.currentPhase = 'implementing';
    this.state.lastChunkTime = Date.now();
    this.resetIdleHeartbeat();

    console.log(`[${this.requestId}] Commentator: Entering content generation phase`);
  }

  /**
   * Detect current generation phase from reasoning text
   */
  private detectPhase(text: string): void {
    const lowerText = text.toLowerCase();

    // Phase detection keywords
    if (lowerText.includes('css') || lowerText.includes('style') || lowerText.includes('tailwind') || lowerText.includes('color')) {
      this.state.currentPhase = 'styling';
    } else if (lowerText.includes('implement') || lowerText.includes('code') || lowerText.includes('function') || lowerText.includes('component')) {
      this.state.currentPhase = 'implementing';
    } else if (lowerText.includes('plan') || lowerText.includes('design') || lowerText.includes('structure') || lowerText.includes('approach')) {
      this.state.currentPhase = 'planning';
    } else if (lowerText.includes('final') || lowerText.includes('complete') || lowerText.includes('finish')) {
      this.state.currentPhase = 'finalizing';
    }
    // Keep current phase if no keywords match
  }

  /**
   * Start the idle heartbeat timer
   */
  private startIdleHeartbeat(): void {
    this.idleHeartbeatTimer = setInterval(() => {
      this.emitIdleHeartbeat();
    }, this.config.idleHeartbeatMs);
  }

  /**
   * Reset the idle heartbeat timer (call when new chunk arrives)
   */
  private resetIdleHeartbeat(): void {
    if (this.idleHeartbeatTimer !== null) {
      clearInterval(this.idleHeartbeatTimer);
    }
    this.startIdleHeartbeat();
  }

  /**
   * Stop the idle heartbeat timer
   */
  private stopIdleHeartbeat(): void {
    if (this.idleHeartbeatTimer !== null) {
      clearInterval(this.idleHeartbeatTimer);
      this.idleHeartbeatTimer = null;
    }
  }

  /**
   * Emit a contextual heartbeat message when idle
   */
  private async emitIdleHeartbeat(): Promise<void> {
    const now = Date.now();
    const idleTime = now - this.state.lastChunkTime;

    // Only emit if we've been idle for at least half the heartbeat interval
    if (idleTime < this.config.idleHeartbeatMs / 2) {
      return;
    }

    // Get the appropriate message for current phase
    const messages = PHASE_IDLE_MESSAGES[this.state.currentPhase];
    const message = messages[this.state.idleMessageIndex % messages.length];

    // Cycle to next message for next heartbeat
    this.state.idleMessageIndex++;

    // Add ellipsis to indicate ongoing work
    const statusWithEllipsis = message + '...';

    // Check if it's different from last emitted (avoid exact duplicates)
    if (statusWithEllipsis.toLowerCase() === this.state.lastEmittedStatus.toLowerCase()) {
      // Skip if same as last
      return;
    }

    // Emit the heartbeat status (bypass anti-flicker for heartbeats)
    this.state.lastEmittedStatus = statusWithEllipsis;
    this.state.lastEmittedTimestamp = now;

    console.log(`[${this.requestId}] 💓 Idle heartbeat (${Math.round(idleTime / 1000)}s idle, phase: ${this.state.currentPhase}): "${statusWithEllipsis}"`);

    try {
      await this.onStatusUpdate(statusWithEllipsis);
    } catch (err) {
      console.error(`[${this.requestId}] Heartbeat callback error:`, err);
    }
  }

  /**
   * Check if we should flush the buffer and trigger a sidecar call
   *
   * Flush conditions:
   * 1. Buffer exceeds maxBufferChars (force flush)
   * 2. Buffer exceeds minBufferChars AND ends with sentence boundary
   * 3. Buffer exceeds minBufferChars AND maxWaitMs has elapsed
   */
  private checkFlush(): void {
    const { buffer, lastFlushTime } = this.state;
    const { minBufferChars, maxBufferChars, maxWaitMs } = this.config;
    const timeSinceFlush = Date.now() - lastFlushTime;

    // Clear any existing timer
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Condition 1: Force flush if we hit max chars
    if (buffer.length >= maxBufferChars) {
      this.triggerSidecarCall();
      return;
    }

    // Condition 2: Flush on sentence boundary if we have enough content
    if (buffer.length >= minBufferChars && /[.!?]\s*$/.test(buffer)) {
      this.triggerSidecarCall();
      return;
    }

    // Condition 3: Flush on timeout if we have enough content
    if (buffer.length >= minBufferChars && timeSinceFlush >= maxWaitMs) {
      this.triggerSidecarCall();
      return;
    }

    // Schedule a timer for max wait (if we have enough content)
    if (buffer.length >= minBufferChars) {
      const remainingWait = Math.max(0, maxWaitMs - timeSinceFlush);
      this.flushTimer = setTimeout(() => this.triggerSidecarCall(), remainingWait);
    }
  }

  /**
   * Trigger an async sidecar call (fire-and-forget with timeout)
   *
   * The call runs in the background and doesn't block the main stream.
   * Multiple calls may be in flight simultaneously, but we limit concurrency.
   */
  private triggerSidecarCall(): void {
    const { maxPendingCalls } = this.config;

    // Drop if too many pending calls (backpressure)
    if (this.state.pendingCalls >= maxPendingCalls) {
      console.log(`[${this.requestId}] Commentator backpressure: dropping call`);
      this.state.buffer = '';
      this.state.lastFlushTime = Date.now();
      return;
    }

    const bufferSnapshot = this.state.buffer;
    const sequenceId = ++this.state.sequenceId;

    // Reset buffer and update flush time
    this.state.buffer = '';
    this.state.lastFlushTime = Date.now();
    this.state.pendingCalls++;

    // Fire async call (don't await - non-blocking)
    this.callGLMAirX(bufferSnapshot, sequenceId)
      .catch(err => {
        console.warn(`[${this.requestId}] Commentator error:`, err.message);
      })
      .finally(() => {
        this.state.pendingCalls--;
      });
  }

  /**
   * Call GLM-4.5-AirX for status summarization
   *
   * @param reasoningText - Buffered reasoning text to summarize
   * @param sequenceId - Sequence ID for ordering/staleness detection
   */
  private async callGLMAirX(reasoningText: string, sequenceId: number): Promise<void> {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      // Extract model name from "provider/model-name" format (like glm-client.ts)
      const modelName = MODELS.GLM_4_5_AIR.split('/').pop();

      const response = await fetch(`${GLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GLM_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: COMMENTATOR_SYSTEM_PROMPT },
            // Use last 800 chars to fit context and focus on recent reasoning
            { role: 'user', content: reasoningText.slice(-800) }
          ],
          max_tokens: 25, // Status updates are very short
          temperature: 0, // Deterministic output
          stream: false,  // No streaming for micro-requests
          thinking: { type: 'disabled' } // No deep thinking needed for summarization
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`[${this.requestId}] Commentator API error ${response.status}: ${errorText.slice(0, 100)}`);
        return;
      }

      const data = await response.json();
      const status = data.choices?.[0]?.message?.content?.trim();

      if (!status) {
        console.warn(`[${this.requestId}] Commentator returned empty status`);
        return;
      }

      // Validate and emit the status
      await this.emitStatus(status, sequenceId, Date.now() - startTime);

    } catch (err) {
      clearTimeout(timeout);

      if (err instanceof Error && err.name === 'AbortError') {
        console.warn(`[${this.requestId}] Commentator timeout after ${this.config.timeoutMs}ms`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Emit a status update if it passes validation checks
   *
   * Validation:
   * 1. Not stale (sequence ID is recent enough)
   * 2. Not duplicate (different from last emitted status)
   * 3. Not too soon (anti-flicker cooldown)
   *
   * @param status - Status text from GLM-4.5-AirX
   * @param sequenceId - Sequence ID of the sidecar call
   * @param latencyMs - Time taken for the API call
   */
  private async emitStatus(status: string, sequenceId: number, latencyMs: number): Promise<void> {
    const now = Date.now();
    const { lastEmittedTimestamp, lastEmittedStatus } = this.state;
    const { minUpdateIntervalMs } = this.config;

    // Clean up status: remove quotes, periods, excessive whitespace
    const cleanStatus = status
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\.$/, '')          // Remove trailing period
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .trim();

    // Reject if empty after cleaning
    if (!cleanStatus) {
      return;
    }

    // Reject out-of-order updates (stale) - allow 2 sequence numbers of slack
    if (sequenceId < this.state.sequenceId - 2) {
      console.log(`[${this.requestId}] Discarding stale commentator update (seq ${sequenceId}, current ${this.state.sequenceId})`);
      return;
    }

    // Deduplicate identical consecutive statuses
    if (cleanStatus.toLowerCase() === lastEmittedStatus.toLowerCase()) {
      return;
    }

    // Anti-flicker: minimum interval between updates
    if (now - lastEmittedTimestamp < minUpdateIntervalMs) {
      console.log(`[${this.requestId}] Anti-flicker: skipping "${cleanStatus}" (${now - lastEmittedTimestamp}ms since last)`);
      return;
    }

    // Update state
    this.state.lastEmittedStatus = cleanStatus;
    this.state.lastEmittedTimestamp = now;

    console.log(`[${this.requestId}] Commentator status: "${cleanStatus}" in ${latencyMs}ms`);

    // Emit to callback
    try {
      await this.onStatusUpdate(cleanStatus);
    } catch (err) {
      console.error(`[${this.requestId}] Commentator callback error:`, err);
    }
  }

  /**
   * Flush any remaining buffer and wait for pending calls
   *
   * Call this at the end of the reasoning stream to ensure all
   * status updates are processed.
   */
  async flush(): Promise<void> {
    // Stop idle heartbeat
    this.stopIdleHeartbeat();

    // Clear pending timer
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // If buffer has significant content, trigger final call
    if (this.state.buffer.length >= 50) {
      this.triggerSidecarCall();
    }

    // Wait briefly for pending calls (best effort, don't block forever)
    const maxWait = 2000;
    const startWait = Date.now();

    while (this.state.pendingCalls > 0 && Date.now() - startWait < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (this.state.pendingCalls > 0) {
      console.log(`[${this.requestId}] Commentator flush: ${this.state.pendingCalls} calls still pending after ${maxWait}ms`);
    }
  }

  /**
   * Get current stats for logging/debugging
   */
  getStats(): { pendingCalls: number; sequenceId: number; bufferLength: number } {
    return {
      pendingCalls: this.state.pendingCalls,
      sequenceId: this.state.sequenceId,
      bufferLength: this.state.buffer.length,
    };
  }
}

/**
 * Create a no-op commentator for testing or when disabled
 */
export function createNoOpCommentator(): AICommentator {
  return new AICommentator(() => {}, 'noop', { minBufferChars: Infinity });
}
