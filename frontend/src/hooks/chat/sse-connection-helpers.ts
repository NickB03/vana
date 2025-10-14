/**
 * SSE Connection State Management Helpers
 *
 * Provides utilities for managing SSE connection lifecycle to prevent race conditions
 * when rapidly sending sequential messages.
 *
 * PROBLEM SOLVED:
 * - Sequential messages sent within 100ms cause SSE connection conflicts
 * - Lost events from overlapping connections
 * - Arbitrary delays that don't guarantee clean disconnection
 *
 * SOLUTION:
 * - Proper connection state tracking (idle, connecting, connected, disconnecting, error)
 * - Message queue for pending operations
 * - Guaranteed wait for disconnection before reconnection
 * - Timeout handling (max 5 seconds wait)
 */

import { SSEHookReturn } from '../useSSE';

/**
 * Extended connection states beyond what useSSE provides
 */
export type ExtendedSSEState =
  | 'idle'           // Not initialized
  | 'disconnecting'  // Actively disconnecting
  | 'connecting'     // Actively connecting
  | 'connected'      // Ready for use
  | 'error';         // Error state

/**
 * Get the current extended connection state
 */
export function getExtendedSSEState(sse: SSEHookReturn | undefined): ExtendedSSEState {
  if (!sse) return 'idle';

  const { connectionState } = sse;

  switch (connectionState) {
    case 'connected':
      return 'connected';
    case 'connecting':
    case 'reconnecting':
      return 'connecting';
    case 'error':
      return 'error';
    case 'disconnected':
    default:
      return 'idle';
  }
}

/**
 * Wait for a specific SSE state with timeout
 * @param sse SSE connection hook return object
 * @param targetState The state to wait for
 * @param timeout Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when target state is reached
 * @throws Error if timeout is exceeded
 */
export async function waitForSSEState(
  sse: SSEHookReturn | undefined,
  targetState: ExtendedSSEState,
  timeout: number = 5000
): Promise<void> {
  if (!sse) {
    throw new Error('SSE connection not initialized');
  }

  const startTime = Date.now();
  const pollInterval = 50; // Check every 50ms

  return new Promise((resolve, reject) => {
    const checkState = () => {
      const currentState = getExtendedSSEState(sse);

      // Check if we've reached the target state
      if (currentState === targetState) {
        resolve();
        return;
      }

      // Check for timeout
      if (Date.now() - startTime > timeout) {
        reject(new Error(
          `SSE connection timeout: Expected state '${targetState}', ` +
          `but current state is '${currentState}' after ${timeout}ms`
        ));
        return;
      }

      // Check again after interval
      setTimeout(checkState, pollInterval);
    };

    checkState();
  });
}

/**
 * Ensure SSE is completely disconnected before proceeding
 *
 * This prevents race conditions where new connections start before old ones finish closing.
 *
 * @param sse SSE connection hook return object
 * @param timeout Maximum time to wait in milliseconds (default: 5000)
 * @throws Error if disconnection times out
 */
export async function ensureSSEDisconnected(
  sse: SSEHookReturn | undefined,
  timeout: number = 5000
): Promise<void> {
  if (!sse) {
    return; // Nothing to disconnect
  }

  const currentState = getExtendedSSEState(sse);

  console.log('[SSE Helper] ensureSSEDisconnected - current state:', currentState);

  // If already disconnected/idle, we're done
  if (currentState === 'idle') {
    return;
  }

  // Trigger disconnect if connected or connecting
  if (currentState === 'connected' || currentState === 'connecting') {
    console.log('[SSE Helper] Triggering disconnect from state:', currentState);
    sse.disconnect();
  }

  // Wait for disconnected state
  try {
    await waitForSSEState(sse, 'idle', timeout);
    console.log('[SSE Helper] Successfully disconnected');
  } catch (error) {
    console.error('[SSE Helper] Disconnection timeout:', error);
    throw error;
  }
}

/**
 * Ensure SSE is ready for use (connected and stable)
 *
 * This function:
 * 1. Disconnects any existing connection
 * 2. Waits for clean disconnection
 * 3. Returns, allowing caller to start new connection
 *
 * @param sse SSE connection hook return object
 * @param timeout Maximum time to wait in milliseconds (default: 5000)
 * @throws Error if preparation times out
 */
export async function ensureSSEReady(
  sse: SSEHookReturn | undefined,
  timeout: number = 5000
): Promise<void> {
  console.log('[SSE Helper] ensureSSEReady - starting');

  // Step 1: Ensure clean disconnection
  await ensureSSEDisconnected(sse, timeout);

  // Step 2: Small delay to ensure cleanup is complete
  // This is much smaller than the original 100ms arbitrary delay,
  // but ensures any cleanup tasks (like event listener removal) complete
  await new Promise(resolve => setTimeout(resolve, 10));

  console.log('[SSE Helper] SSE ready for new connection');
}

/**
 * Wait for SSE connection to be established
 *
 * After starting a connection, this ensures the connection is stable
 * before proceeding with operations that depend on it.
 *
 * @param sse SSE connection hook return object
 * @param timeout Maximum time to wait in milliseconds (default: 5000)
 * @throws Error if connection times out
 */
export async function waitForSSEConnection(
  sse: SSEHookReturn | undefined,
  timeout: number = 5000
): Promise<void> {
  if (!sse) {
    throw new Error('SSE connection not initialized');
  }

  console.log('[SSE Helper] waitForSSEConnection - waiting for connected state');

  try {
    await waitForSSEState(sse, 'connected', timeout);
    console.log('[SSE Helper] SSE connection established');
  } catch (error) {
    console.error('[SSE Helper] Connection timeout:', error);
    throw error;
  }
}

/**
 * Message queue for handling rapid sequential requests
 *
 * When multiple messages are sent rapidly, this queue ensures they are
 * processed sequentially, preventing SSE connection conflicts.
 */
export class SSEMessageQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;

  /**
   * Add a message operation to the queue
   * @param operation Async function that sends a message
   * @returns Promise that resolves when the operation completes
   */
  async enqueue(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await operation();
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued operations sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('[SSE Message Queue] Operation failed:', error);
          // Continue processing queue even if one operation fails
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get the current queue size
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is currently processing
   */
  get isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    this.queue = [];
    this.processing = false;
  }
}
