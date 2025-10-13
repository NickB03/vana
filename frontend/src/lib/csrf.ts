/**
 * CSRF Token Management for Cookie-Based Authentication
 *
 * Implements client-side CSRF protection using double-submit cookie pattern.
 * Required for secure cookie-based authentication to prevent CSRF attacks.
 *
 * How it works:
 * 1. Server sets CSRF token as non-HttpOnly cookie
 * 2. Client reads cookie value and includes it in request header
 * 3. Server validates header matches cookie
 * 4. CSRF attack fails because attacker cannot read cookie value
 *
 * Security benefits:
 * - Prevents cross-site request forgery
 * - Works with HttpOnly authentication cookies
 * - Compatible with SPA architectures
 * - No server-side session storage required
 */

/**
 * Get CSRF token from cookie
 *
 * @returns CSRF token string or null if not found
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') {
    // Server-side rendering - no cookies available
    return null;
  }

  // Parse cookies to find CSRF token
  // Cookie format: "csrf_token=abc123; other_cookie=xyz"
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Add CSRF token to request headers
 *
 * Use this function to add CSRF protection to all state-changing requests
 * (POST, PUT, DELETE, PATCH). GET requests don't need CSRF protection.
 *
 * @param headers Existing headers object (optional)
 * @returns Headers object with CSRF token added
 *
 * @example
 * ```typescript
 * // Basic usage
 * fetch('/api/resource', {
 *   method: 'POST',
 *   headers: addCsrfHeader(),
 *   body: JSON.stringify(data)
 * });
 *
 * // With existing headers
 * fetch('/api/resource', {
 *   method: 'DELETE',
 *   headers: addCsrfHeader({
 *     'Content-Type': 'application/json',
 *     'Authorization': 'Bearer token'
 *   })
 * });
 * ```
 */
export function addCsrfHeader(headers: HeadersInit = {}): HeadersInit {
  const csrfToken = getCsrfToken();

  if (csrfToken) {
    // Add CSRF token to headers
    // Backend expects token in X-CSRF-Token header
    return {
      ...headers,
      'X-CSRF-Token': csrfToken,
    };
  }

  // No token available - return headers unchanged
  // This might happen on first request before cookie is set
  return headers;
}

/**
 * Check if CSRF token is available
 *
 * Useful for checking if security is properly initialized
 *
 * @returns True if CSRF token exists, false otherwise
 */
export function hasCsrfToken(): boolean {
  return getCsrfToken() !== null;
}

/**
 * Wait for CSRF token to be available
 *
 * Useful when initializing application to ensure security is ready
 *
 * @param timeout Maximum time to wait in milliseconds (default: 5000)
 * @returns Promise that resolves when token is available or rejects on timeout
 */
export function waitForCsrfToken(timeout: number = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const token = getCsrfToken();
    if (token) {
      resolve(token);
      return;
    }

    // Poll for token
    const startTime = Date.now();
    const interval = setInterval(() => {
      const token = getCsrfToken();
      if (token) {
        clearInterval(interval);
        resolve(token);
        return;
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        reject(new Error('CSRF token not available after timeout'));
      }
    }, 100);
  });
}
