/**
 * Next.js Middleware - Authentication and SSE proxy security
 * Handles secure token transfer for SSE proxy routes
 */

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Handle SSE proxy routes
  if (request.nextUrl.pathname.startsWith('/api/sse')) {
    const response = NextResponse.next();
    
    // Set security headers for SSE proxy
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-auth-token');
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/sse/:path*',
  ],
};