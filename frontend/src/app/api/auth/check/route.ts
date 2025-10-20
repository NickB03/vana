import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication check proxy endpoint
 * Prevents 404 errors by providing a placeholder auth check
 *
 * This endpoint checks if the user has valid authentication cookies
 * by proxying to the backend or returning a default response.
 */
export async function GET(request: NextRequest) {
  const backendUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8000';

  try {
    // Try to check auth status with backend
    const response = await fetch(`${backendUrl}/api/auth/check`, {
      headers: {
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || '',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data);
    }

    // If backend doesn't have this endpoint, return default
    return NextResponse.json({
      authenticated: false,
      user: null
    });
  } catch (error) {
    console.warn('[Auth Check Proxy] Backend check failed, returning default:', error);
    // Return unauthenticated status on error
    return NextResponse.json({
      authenticated: false,
      user: null
    });
  }
}
