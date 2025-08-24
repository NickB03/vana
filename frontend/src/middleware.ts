/**
 * Next.js Middleware for Route Protection
 * Handles authentication and authorization at the edge
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

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

// Admin-only routes
// TODO: Re-enable when auth middleware is fully implemented
// const ADMIN_ROUTES = [
//   '/admin',
//   '/admin/users',
//   '/admin/settings',
//   '/admin/analytics'
// ];

interface JWTPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  email?: string;
  role?: string;
}

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

  // Check for authentication
  const accessToken = request.cookies.get('access_token')?.value;
  const idToken = request.cookies.get('id_token')?.value;
  
  // Redirect to login if no tokens
  if (!accessToken || !idToken) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  try {
    // Validate token
    const payload = jwtDecode<JWTPayload>(idToken);
    
    // Check token expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expired, attempt refresh or redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('redirect', pathname);
      url.searchParams.set('reason', 'session_expired');
      
      // Clear expired cookies
      const response = NextResponse.redirect(url);
      response.cookies.delete('access_token');
      response.cookies.delete('id_token');
      return response;
    }

    // TODO: Re-enable admin route protection when ADMIN_ROUTES is fully implemented
    // Check admin routes
    // if (ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    //   if (payload.role !== 'admin') {
    //     // Redirect to 403 Forbidden
    //     const url = request.nextUrl.clone();
    //     url.pathname = '/403';
    //     return NextResponse.redirect(url);
    //   }
    // }

    // Add user info to headers for downstream use
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.sub || '');
    requestHeaders.set('x-user-email', payload.email || '');
    requestHeaders.set('x-user-role', payload.role || 'user');

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // Invalid token, redirect to login
    console.error('Middleware auth error:', error);
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('redirect', pathname);
    url.searchParams.set('error', 'invalid_token');
    
    // Clear invalid cookies
    const response = NextResponse.redirect(url);
    response.cookies.delete('access_token');
    response.cookies.delete('id_token');
    return response;
  }
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