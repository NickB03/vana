/**
 * Token Exchange API Route
 * Exchanges authorization code for tokens
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
    const {
      code,
      code_verifier,
      client_id,
      redirect_uri,
      grant_type = 'authorization_code'
    } = body;

    // Validate required parameters
    if (!code || !code_verifier || !client_id || !redirect_uri) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Exchange code for tokens with Google
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id,
        client_secret: process.env['GOOGLE_CLIENT_SECRET'] || '',
        redirect_uri,
        grant_type,
        code_verifier
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      return NextResponse.json(
        { error: error.error_description || 'Token exchange failed' },
        { status: tokenResponse.status }
      );
    }

    const tokens = await tokenResponse.json();
    const cookieStore = await cookies();

    // Store tokens in httpOnly cookies
    cookieStore.set('access_token', tokens.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.expires_in
    });

    cookieStore.set('id_token', tokens.id_token, {
      ...COOKIE_OPTIONS,
      maxAge: tokens.expires_in
    });

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
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}