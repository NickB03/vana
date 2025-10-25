/**
 * Request deduplication utility to prevent redundant API calls
 * Especially useful for mobile where network is expensive
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest<any>>();
const CACHE_DURATION = 5000; // 5 seconds

/**
 * Deduplicate requests by key
 * If a request with the same key is already in flight, return the existing promise
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  cacheDuration: number = CACHE_DURATION
): Promise<T> {
  const now = Date.now();
  const pending = pendingRequests.get(key);

  // Return existing request if still fresh
  if (pending && now - pending.timestamp < cacheDuration) {
    return pending.promise;
  }

  // Create new request
  const promise = requestFn().finally(() => {
    // Clean up after completion
    setTimeout(() => {
      const current = pendingRequests.get(key);
      if (current?.promise === promise) {
        pendingRequests.delete(key);
      }
    }, cacheDuration);
  });

  pendingRequests.set(key, { promise, timestamp: now });
  return promise;
}

/**
 * Clear all pending requests
 */
export function clearPendingRequests() {
  pendingRequests.clear();
}

/**
 * Get pending request count for monitoring
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}
