/**
 * Cookie Sync API Route - Secure token transfer from sessionStorage to HTTP-only cookies
 * Enables server-side authentication for SSE proxy while maintaining client-side token security
 */

import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies, clearAuthCookies } from '@/lib/auth-cookies';

interface SyncRequest {
  accessToken?: string;
  refreshToken?: string;
  expirationTime?: number;
}

/**
 * POST handler to sync tokens from client sessionStorage to server-side cookies
 */
export async function POST(request: NextRequest) {
  try {
    const body: SyncRequest = await request.json();
    const { accessToken, refreshToken, expirationTime } = body;

    const response = NextResponse.json({ success: true });

    if (accessToken && refreshToken) {
      // Set secure HTTP-only cookies
      setAuthCookies(response, {
        accessToken,
        refreshToken,
        expirationTime: expirationTime || null,
      });
    } else {
      // Clear cookies if no tokens provided
      clearAuthCookies(response);
    }

    return response;
  } catch (error) {
    console.error('Cookie sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync cookies' },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler to clear authentication cookies
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}