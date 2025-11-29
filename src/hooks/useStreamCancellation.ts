import { useRef, useCallback, useState, useEffect } from "react";

export interface StreamCancellationState {
  /** Whether a stream is currently active */
  isStreaming: boolean;
  /** Cancel the active stream */
  cancelStream: () => void;
  /** Get the current AbortController for stream cancellation */
  getAbortController: () => AbortController;
  /** Mark stream as started */
  startStream: () => AbortController;
  /** Mark stream as completed */
  completeStream: () => void;
}

/**
 * Hook for managing stream cancellation via AbortController
 *
 * Provides centralized stream cancellation logic with proper cleanup.
 * Uses Web API's AbortController to cancel fetch requests.
 *
 * @example
 * ```tsx
 * const { isStreaming, cancelStream, startStream, completeStream } = useStreamCancellation();
 *
 * async function streamData() {
 *   const controller = startStream();
 *
 *   try {
 *     const response = await fetch(url, { signal: controller.signal });
 *     // ... process stream
 *     completeStream();
 *   } catch (error) {
 *     if (error.name === 'AbortError') {
 *       console.log('Stream cancelled');
 *     }
 *   }
 * }
 * ```
 */
export function useStreamCancellation(): StreamCancellationState {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  /**
   * Start a new stream and get AbortController for cancellation
   * Automatically aborts any previous stream
   */
  const startStream = useCallback((): AbortController => {
    // Cancel previous stream if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsStreaming(true);

    return controller;
  }, []);

  /**
   * Cancel the currently active stream
   * Safe to call even if no stream is active
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  /**
   * Mark stream as completed (normal completion, not cancelled)
   * Cleans up AbortController reference
   */
  const completeStream = useCallback(() => {
    abortControllerRef.current = null;
    setIsStreaming(false);
  }, []);

  /**
   * Get current AbortController (for advanced usage)
   * Returns a new controller if none exists
   */
  const getAbortController = useCallback((): AbortController => {
    if (!abortControllerRef.current) {
      const controller = new AbortController();
      abortControllerRef.current = controller;
    }
    return abortControllerRef.current;
  }, []);

  /**
   * Cleanup on unmount - abort any active stream to prevent memory leaks
   * and state updates on unmounted components
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    isStreaming,
    cancelStream,
    getAbortController,
    startStream,
    completeStream,
  };
}
