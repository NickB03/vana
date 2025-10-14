/**
 * Server-Side CSRF Token Validation for Next.js API Routes
 *
 * Implements double-submit cookie pattern validation on the server-side.
 * Mirrors the backend CSRF middleware logic for consistent security.
 *
 * Security Benefits:
 * - Prevents CSRF attacks on SSE proxy endpoints
 * - Validates tokens using constant-time comparison
 * - Compatible with edge runtime
 * - Properly handles development vs production
 *
 * Reference: OWASP CSRF Prevention Cheat Sheet
 * https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */

import { NextRequest } from 'next/server';

// CSRF configuration constants (must match backend)
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_COOKIE = 'csrf_token';
const CSRF_TOKEN_LENGTH = 32; // 32 bytes = 256 bits of entropy

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * Edge runtime doesn't have crypto.timingSafeEqual, so we implement our own.
 * This prevents attackers from determining token validity by measuring response time.
 *
 * @param a First string to compare
 * @param b Second string to compare
 * @returns True if strings are equal, false otherwise
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validate CSRF token from request
 *
 * Implements double-submit cookie pattern:
 * 1. Token must be present in both cookie AND header
 * 2. Token values must match exactly
 * 3. Token must have correct format (hex string of expected length)
 *
 * @param request Next.js request object
 * @returns True if CSRF token is valid, false otherwise
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Skip CSRF validation in development mode
  if (isDevelopment) {
    console.log('[CSRF] Development mode - skipping validation');
    return true;
  }

  // Extract token from header (case-insensitive)
  const tokenHeader = request.headers.get(CSRF_TOKEN_HEADER) ||
                      request.headers.get('X-CSRF-Token');

  // Extract token from cookie
  const tokenCookie = request.cookies.get(CSRF_TOKEN_COOKIE)?.value;

  // Both token sources must be present
  if (!tokenHeader || !tokenCookie) {
    console.warn('[CSRF] Missing token:', {
      hasHeader: !!tokenHeader,
      hasCookie: !!tokenCookie,
    });
    return false;
  }

  // Validate token format (hex string of expected length)
  const expectedLength = CSRF_TOKEN_LENGTH * 2; // hex encoding doubles length
  if (tokenHeader.length !== expectedLength || tokenCookie.length !== expectedLength) {
    console.warn('[CSRF] Invalid token length:', {
      headerLength: tokenHeader.length,
      cookieLength: tokenCookie.length,
      expectedLength,
    });
    return false;
  }

  // Validate tokens are hex strings
  const hexPattern = /^[0-9a-f]+$/i;
  if (!hexPattern.test(tokenHeader) || !hexPattern.test(tokenCookie)) {
    console.warn('[CSRF] Invalid token format - not hex');
    return false;
  }

  // Constant-time comparison prevents timing attacks
  const isValid = timingSafeEqual(tokenHeader, tokenCookie);

  if (!isValid) {
    console.warn('[CSRF] Token mismatch');
  }

  return isValid;
}

/**
 * Get CSRF token from request cookies
 *
 * Useful for debugging and logging purposes.
 *
 * @param request Next.js request object
 * @returns CSRF token string or null if not found
 */
export function getCsrfTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(CSRF_TOKEN_COOKIE)?.value || null;
}

/**
 * Check if CSRF token exists in request
 *
 * @param request Next.js request object
 * @returns True if CSRF token cookie exists, false otherwise
 */
export function hasCsrfToken(request: NextRequest): boolean {
  return !!getCsrfTokenFromRequest(request);
}

/**
 * Log CSRF validation attempt
 *
 * Logs validation attempts for security monitoring.
 * Does NOT log token values (security risk).
 *
 * @param request Next.js request object
 * @param isValid Whether validation succeeded
 * @param reason Optional reason for failure
 */
export function logCsrfAttempt(
  request: NextRequest,
  isValid: boolean,
  reason?: string
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    path: request.nextUrl.pathname,
    method: request.method,
    valid: isValid,
    hasHeader: !!request.headers.get(CSRF_TOKEN_HEADER),
    hasCookie: !!request.cookies.get(CSRF_TOKEN_COOKIE),
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    reason,
  };

  if (isValid) {
    console.log('[CSRF] Validation successful:', {
      path: logData.path,
      timestamp: logData.timestamp,
    });
  } else {
    console.warn('[CSRF] Validation failed:', logData);
  }
}
