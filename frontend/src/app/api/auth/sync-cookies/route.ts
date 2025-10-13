/**
 * Cookie Sync API Route - DEPRECATED
 *
 * SECURITY NOTICE: This route is deprecated as of CRIT-008 security enhancement.
 * JWT tokens are now managed exclusively through HttpOnly cookies set by the backend.
 *
 * New Approach (Secure):
 * - Backend sets HttpOnly cookies after authentication
 * - Tokens never exposed to JavaScript (XSS protection)
 * - Use /api/auth/set-tokens (backend) for secure cookie management
 *
 * This route remains for backwards compatibility but should not be used for new code.
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