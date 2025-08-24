/**
 * Token Refresh API Route
 * Refreshes access token using refresh token
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/'
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id } = body;
    
    // Get refresh token from httpOnly cookie
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 401 }
      );
    }

    if (!client_id) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Refresh tokens with Google
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id,
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token'
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      
      // If refresh token is invalid, clear all tokens
      if (tokenResponse.status === 400 || tokenResponse.status === 401) {
        cookieStore.delete('access_token');
        cookieStore.delete('id_token');
        cookieStore.delete('refresh_token');
      }
      
      return NextResponse.json(
        { error: error.error_description || 'Token refresh failed' },
        { status: tokenResponse.status }
      );
    }

    const tokens = await tokenResponse.json();

    // Update tokens in httpOnly cookies
    cookieStore.set('access_token', tokens.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.expires_in
    });

    if (tokens.id_token) {
      cookieStore.set('id_token', tokens.id_token, {
        ...COOKIE_OPTIONS,
        maxAge: tokens.expires_in
      });
    }

    // Update refresh token if a new one is provided
    if (tokens.refresh_token) {
      cookieStore.set('refresh_token', tokens.refresh_token, {
        ...COOKIE_OPTIONS,
        maxAge: 30 * 24 * 60 * 60 // 30 days
      });
    }

    // Return tokens (excluding refresh token for security)
    return NextResponse.json({
      access_token: tokens.access_token,
      id_token: tokens.id_token,
      expires_in: tokens.expires_in,
      token_type: tokens.token_type || 'Bearer',
      scope: tokens.scope
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}