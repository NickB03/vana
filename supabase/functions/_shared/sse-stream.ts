/**
 * Server-Sent Events (SSE) Streaming Utilities
 *
 * Provides progress updates during bundling for better UX.
 * The SSE format is simple text-based: `event: <type>\ndata: <json>\n\n`
 *
 * @example
 * const { stream, sendProgress, sendComplete } = createBundleProgressStream();
 * sendProgress({ stage: 'fetch', message: 'Fetching packages...', progress: 40 });
 * sendComplete({ success: true, bundleUrl: '...', ... });
 * return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
 *
 * IMPORTANT: Types must match frontend Zod schemas in src/types/bundleProgress.ts
 * When adding new event types or fields:
 * 1. Update Zod schemas in src/types/bundleProgress.ts
 * 2. Update types in this file to match
 * 3. Add validation tests in src/types/__tests__/bundleProgress.test.ts
 * 4. Frontend validates all SSE events against Zod schemas for type safety
 *
 * TODO: Consider importing shared schema when Deno Deploy supports npm packages.
 */

export type BundleStage = "validate" | "cache-check" | "fetch" | "bundle" | "upload";

export interface BundleProgress {
  stage: BundleStage;
  message: string;
  progress: number; // 0-100
}

export interface BundleComplete {
  success: true;
  bundleUrl: string;
  bundleSize: number;
  bundleTime: number;
  dependencies: string[];
  expiresAt: string;
  requestId: string;
  cacheHit?: boolean;
}

export interface BundleError {
  success: false;
  error: string;
  details?: string;
  requestId?: string;
}

export type BundleEvent =
  | { type: "progress"; data: BundleProgress }
  | { type: "complete"; data: BundleComplete }
  | { type: "error"; data: BundleError };

/**
 * Create an SSE stream for bundle progress.
 *
 * Returns a ReadableStream and helper functions to send events.
 * The stream auto-closes after sendComplete or sendError.
 *
 * CRITICAL: Uses streamClosed guard to prevent "cannot close or enqueue"
 * TypeErrors when client disconnects mid-stream (lines 74-88).
 * This pattern prevents server crashes from client navigation/refresh.
 *
 * @returns Stream and event sender functions
 */
export function createBundleProgressStream(): {
  stream: ReadableStream<Uint8Array>;
  sendProgress: (progress: BundleProgress) => void;
  sendComplete: (result: BundleComplete) => void;
  sendError: (error: BundleError) => void;
  close: () => void;
} {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  let streamClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      controller = ctrl;
    },
    cancel() {
      streamClosed = true;
      controller = null;
    },
  });

  const send = (event: string, data: unknown) => {
    // CRITICAL: streamClosed guard pattern (prevents server crashes)
    //
    // Problem: When a client disconnects (tab close, navigation, refresh),
    // the ReadableStream controller becomes closed. Attempting to enqueue or close
    // a closed controller throws: "TypeError: Cannot close or enqueue to a closed stream"
    //
    // Solution: Set streamClosed flag and check before all controller operations.
    //
    // When this happens:
    // - User navigates away from page during bundling
    // - Tab is closed mid-request
    // - Browser refresh while streaming
    // - Network interruption
    //
    // Pattern used in other Edge Functions:
    // - tool-calling-chat.ts (streaming AI responses)
    // - Any function using SSE or ReadableStream
    //
    // Alternative approaches considered but rejected:
    // - Checking controller.desiredSize (unreliable)
    // - Try-catch around every enqueue (verbose, hides other errors)
    // - Using AbortSignal (doesn't integrate with ReadableStream controllers)
    if (streamClosed || !controller) {
      console.warn(`SSE stream closed, ignoring event: ${event}`);
      return;
    }
    try {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(payload));
    } catch (error) {
      if (error instanceof TypeError && String(error).includes("cannot close or enqueue")) {
        streamClosed = true;
      } else {
        throw error;
      }
    }
  };

  const closeStream = () => {
    if (!streamClosed && controller) {
      try {
        controller.close();
      } catch {
        // Already closed
      }
      streamClosed = true;
    }
  };

  return {
    stream,
    sendProgress: (progress: BundleProgress) => send("progress", progress),
    sendComplete: (result: BundleComplete) => {
      send("complete", result);
      closeStream();
    },
    sendError: (error: BundleError) => {
      send("error", error);
      closeStream();
    },
    close: closeStream,
  };
}

/**
 * Stage progress percentages for consistent UX.
 */
export const STAGE_PROGRESS: Record<BundleStage, number> = {
  validate: 10,
  "cache-check": 20,
  fetch: 40,
  bundle: 70,
  upload: 90,
};

/**
 * Stage display messages.
 */
export const STAGE_MESSAGES: Record<BundleStage, string> = {
  validate: "Validating code...",
  "cache-check": "Checking cache...",
  fetch: "Resolving packages...",
  bundle: "Bundling code...",
  upload: "Uploading bundle...",
};

/**
 * Create a validated progress event for a stage.
 * Ensures progress is always 0-100 and message is non-empty.
 *
 * @param stage - Current bundling stage
 * @param customMessage - Optional custom message (overrides default)
 * @returns Frozen BundleProgress object with validated progress
 * @throws RangeError if stage progress is invalid (should never happen)
 */
export function createStageProgress(
  stage: BundleStage,
  customMessage?: string
): BundleProgress {
  const message = customMessage ?? STAGE_MESSAGES[stage];
  const progress = STAGE_PROGRESS[stage];

  // Runtime validation using factory function
  if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
    throw new RangeError(`Progress must be 0-100, got ${progress} for stage ${stage}`);
  }
  if (!message.trim()) {
    throw new Error("Progress message cannot be empty");
  }

  return Object.freeze({ stage, message, progress });
}
