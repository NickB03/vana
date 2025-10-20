/**
 * CSRF Token Proxy - Fetch CSRF token from backend
 *
 * This endpoint proxies CSRF token requests to the backend and forwards
 * the Set-Cookie header to the client. This ensures the CSRF token cookie
 * is properly set in the browser.
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  try {
    console.log('[CSRF Proxy] Fetching CSRF token from backend');

    // Backend sets CSRF cookie on any GET request, so use /health endpoint
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('[CSRF Proxy] Backend error:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch CSRF token' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Create response with health data
    const nextResponse = NextResponse.json({ success: true, health: data });

    // Forward Set-Cookie headers from backend to client
    const setCookieHeaders = response.headers.get('set-cookie');
    if (setCookieHeaders) {
      // In development, remove Secure flag from cookies since we're on HTTP
      const isDevelopment = process.env.NODE_ENV === 'development';
      const modifiedCookie = isDevelopment
        ? setCookieHeaders.replace(/;\s*Secure/gi, '')
        : setCookieHeaders;

      nextResponse.headers.set('Set-Cookie', modifiedCookie);
      console.log('[CSRF Proxy] CSRF token cookie set (dev mode: Secure flag removed)');
    }

    return nextResponse;

  } catch (error) {
    console.error('[CSRF Proxy] Failed to fetch CSRF token:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CSRF token' },
      { status: 500 }
    );
  }
}
