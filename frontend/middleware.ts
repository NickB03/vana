/**
 * Temporary Middleware Bypass for Development
 * All authentication and security checks disabled
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // DEVELOPMENT MODE: Bypass all middleware logic
  console.log(`[Dev Mode] Allowing all requests: ${request.method} ${request.nextUrl.pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};