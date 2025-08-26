/**
 * Next.js Middleware for Route Protection
 * Handles authentication and authorization at the edge
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/callback',
  '/auth/error',
  '/terms',
  '/privacy',
  '/support',
  '/api/auth/token',
  '/api/auth/refresh',
  '/api/auth/logout',
  '/api/auth/cookie',
  '/api/csp-report'
];

// Routes that require authentication
// TODO: Re-enable when auth middleware is fully implemented
// const PROTECTED_ROUTES = [
//   '/chat',
//   '/canvas',
//   '/agents',
//   '/settings',
//   '/profile'
// ];

// Admin-only routes - Using prefix-based protection for defense-in-depth
// Note: Currently using startsWith('/admin') check instead of array
// const ADMIN_ROUTES = [
//   '/admin',
//   '/admin/users',
//   '/admin/settings',
//   '/admin/analytics'
// ];

/**
 * Extracts and returns the payload object from a compact JWT string without using eval.
 *
 * The function expects a JWT in compact serialization (three dot-separated parts: `header.payload.signature`).
 * It base64-decodes the payload (handling URL-safe base64 and missing padding) and parses it as JSON.
 * Returns `null` for malformed tokens, decoding/parsing errors, or when the token does not have exactly three parts.
 *
 * @param token - JWT string in compact form (`header.payload.signature`)
 * @returns The parsed payload as an object, or `null` if the token is invalid or cannot be decoded
 */
function parseJWTPayload(token: string): Record<string, any> | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode base64 payload (second part)
    const payload = parts[1];
    // Add padding if needed for base64 decoding
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Edge middleware that enforces route checks for authentication and authorization.
 *
 * Currently performs lightweight routing decisions:
 * - Skips processing for static assets, image files, and most API routes (all `/api/*` except `/api/auth`).
 * - Allows requests to any path listed in `PUBLIC_ROUTES` (exact match or as a prefix).
 * - Temporarily disables full auth checks in development (logs a notice and forwards the request).
 *
 * When re-enabled, the middleware is intended to:
 * - Validate `access_token` / `id_token` cookies, handle expiration, redirect to `/auth/login` with a `redirect` query, and clear cookies as needed.
 * - Enforce admin-only access for paths starting with `/admin`.
 * - Inject basic user identifiers into request headers (`x-user-id`, `x-user-email`, `x-user-role`) for downstream use.
 *
 * @returns A `NextResponse` that either continues the request (`NextResponse.next()`) or redirects the client.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static assets and API routes (except auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  // TODO: Temporarily disable auth middleware for development
  // Re-enable when auth is fully implemented
  console.log('🔒 Auth middleware temporarily disabled for development');
  return NextResponse.next();

  // DISABLED AUTH CODE (re-enable when ready):
  // Check for authentication
  // const accessToken = request.cookies.get('access_token')?.value;
  // const idToken = request.cookies.get('id_token')?.value;
  
  // // Redirect to login if no tokens
  // if (!accessToken || !idToken) {
  //   const url = request.nextUrl.clone();
  //   url.pathname = '/auth/login';
  //   url.searchParams.set('redirect', pathname);
  //   return NextResponse.redirect(url);
  // }

  // try {
  //   // Validate token using Edge Runtime compatible parsing
  //   const payload = parseJWTPayload(idToken);
    
  //   if (!payload) {
  //     throw new Error('Invalid token format');
  //   }
    
  //   // Check token expiration
  //   if (payload.exp && payload.exp * 1000 < Date.now()) {
  //     // Token expired, attempt refresh or redirect to login
  //     const url = request.nextUrl.clone();
  //     url.pathname = '/auth/login';
  //     url.searchParams.set('redirect', pathname);
  //     url.searchParams.set('reason', 'session_expired');
      
  //     // Clear expired cookies
  //     const response = NextResponse.redirect(url);
  //     response.cookies.delete('access_token');
  //     response.cookies.delete('id_token');
  //     return response;
  //   }

  //   // Check admin routes with prefix-based protection for defense-in-depth
  //   // This blocks ALL paths starting with /admin for non-admin users
  //   if (pathname.startsWith('/admin')) {
  //     if (!payload.role || payload.role !== 'admin') {
  //       // Redirect to 403 Forbidden
  //       const url = request.nextUrl.clone();
  //       url.pathname = '/403';
  //       return NextResponse.redirect(url);
  //     }
  //   }

  //   // Add user info to headers for downstream use
  //   const requestHeaders = new Headers(request.headers);
  //   requestHeaders.set('x-user-id', payload.sub || '');
  //   requestHeaders.set('x-user-email', payload.email || '');
  //   requestHeaders.set('x-user-role', payload.role || 'user');

  //   return NextResponse.next({
  //     request: {
  //       headers: requestHeaders,
  //     },
  //   });
  // } catch (error) {
  //   // Invalid token, redirect to login
  //   console.error('Middleware auth error:', error);
  //   const url = request.nextUrl.clone();
  //   url.pathname = '/auth/login';
  //   url.searchParams.set('redirect', pathname);
  //   url.searchParams.set('error', 'invalid_token');
    
  //   // Clear invalid cookies
  //   const response = NextResponse.redirect(url);
  //   response.cookies.delete('access_token');
  //   response.cookies.delete('id_token');
  //   return response;
  // }
}

// Configure which routes use middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};