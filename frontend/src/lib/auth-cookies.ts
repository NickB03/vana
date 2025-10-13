/**
 * Authentication Cookie Management for SSE Proxy
 * Handles secure transfer of JWT tokens from sessionStorage to server-side cookies
 */

import { NextRequest, NextResponse } from 'next/server';

export interface AuthTokens {
  accessToken: string | null;
  refreshToken: string | null;
  expirationTime: number | null;
}

/**
 * Extract authentication tokens from various sources
 * Priority: Custom header > Cookies > None
 */
export function extractAuthTokens(request: NextRequest): AuthTokens {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;
  let expirationTime: number | null = null;

  // Try custom header first (from client-side sessionStorage)
  const authHeader = request.headers.get('x-auth-token');
  if (authHeader) {
    accessToken = authHeader;
  }

  // Try cookies as fallback
  if (!accessToken) {
    const accessCookie = request.cookies.get('vana_access_token');
    const refreshCookie = request.cookies.get('vana_refresh_token');
    const expirationCookie = request.cookies.get('vana_token_expiration');

    if (accessCookie?.value) {
      accessToken = accessCookie.value;
    }
    if (refreshCookie?.value) {
      refreshToken = refreshCookie.value;
    }
    if (expirationCookie?.value) {
      expirationTime = parseInt(expirationCookie.value, 10);
    }
  }

  return {
    accessToken,
    refreshToken,
    expirationTime,
  };
}

/**
 * Set secure HTTP-only cookies for authentication
 *
 * SameSite=lax provides CSRF protection while allowing:
 * - OAuth callbacks (e.g., Google OAuth redirect)
 * - Top-level navigation with cookies
 * - Legitimate cross-site GET requests
 *
 * Still blocks:
 * - Cross-site POST/PUT/DELETE (CSRF protection)
 * - Embedded iframes accessing cookies
 * - Third-party tracking
 *
 * Industry standard for authentication cookies (OWASP recommended).
 */
export function setAuthCookies(response: NextResponse, tokens: AuthTokens): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,  // OAuth-friendly CSRF protection
    path: '/',
  };

  if (tokens.accessToken) {
    response.cookies.set('vana_access_token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 60 * 60, // 1 hour
    });
  }

  if (tokens.refreshToken) {
    response.cookies.set('vana_refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  if (tokens.expirationTime) {
    response.cookies.set('vana_token_expiration', tokens.expirationTime.toString(), {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(response: NextResponse): void {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,  // Match setAuthCookies configuration
    path: '/',
    maxAge: 0,
  };

  response.cookies.set('vana_access_token', '', cookieOptions);
  response.cookies.set('vana_refresh_token', '', cookieOptions);
  response.cookies.set('vana_token_expiration', '', cookieOptions);
}

/**
 * Check if access token is expired
 */
export function isTokenExpired(expirationTime: number | null): boolean {
  if (!expirationTime) return true;
  // Consider token expired if it expires within 5 minutes
  return Date.now() >= (expirationTime - 300000);
}

/**
 * Client-side utility to sync sessionStorage tokens to cookies
 * Call this when tokens are updated on the client side
 */
export function syncTokensToCookies(): void {
  if (typeof window === 'undefined') return;

  try {
    const accessToken = sessionStorage.getItem('vana_access_token');
    const refreshToken = sessionStorage.getItem('vana_refresh_token');
    const expirationTime = sessionStorage.getItem('vana_token_expiration');

    if (accessToken && refreshToken) {
      // Send tokens to server to set secure cookies
      fetch('/api/auth/sync-cookies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          refreshToken,
          expirationTime: expirationTime ? parseInt(expirationTime, 10) : null,
        }),
      }).catch(error => {
        console.warn('Failed to sync tokens to cookies:', error);
      });
    }
  } catch (error) {
    console.warn('Failed to sync tokens to cookies:', error);
  }
}