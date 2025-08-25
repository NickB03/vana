/**
 * Logout API Route
 * Clears all authentication tokens
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Clear all auth-related cookies
    const authCookies = [
      'access_token',
      'id_token',
      'refresh_token',
      'token_type',
      'expires_at'
    ];
    
    authCookies.forEach(cookieName => {
      cookieStore.delete(cookieName);
    });
    
    // Also clear any session cookies
    const allCookies = cookieStore.getAll();
    allCookies.forEach(cookie => {
      if (cookie.name.startsWith('__secure_') || 
          cookie.name.startsWith('__session_')) {
        cookieStore.delete(cookie.name);
      }
    });
    
    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Support GET for easier testing
  return POST();
}