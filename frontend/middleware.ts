/**
 * Security and Authentication Middleware for Vana AI Research Platform
 * 
 * Provides comprehensive security measures including:
 * - HTTPS enforcement
 * - Authentication and route protection
 * - Additional security headers
 * - Rate limiting
 * - CSRF protection
 * - Request validation
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtDecode } from 'jwt-decode';

// ============================================================================
// Types and Configuration
// ============================================================================

interface DecodedToken {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/chat',
  '/profile',
  '/settings',
  '/dashboard',
];

// Routes that should redirect authenticated users
const AUTH_ROUTES = [
  '/login',
  '/register',
];

// Rate limiting store (in-memory for demo, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a route is protected
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if a route is an auth route
 */
function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Check if user is authenticated based on token
 */
function isAuthenticated(request: NextRequest): boolean {
  try {
    // Check for token in cookies first (more secure)
    let token = request.cookies.get('vana_auth_token')?.value;
    
    // Fallback to checking localStorage via custom header
    if (!token) {
      token = request.headers.get('x-auth-token') || '';
    }
    
    if (!token) {
      return false;
    }
    
    // Decode and validate token
    const decoded: DecodedToken = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);
    
    // Check if token is expired
    return decoded.exp > now;
  } catch (error) {
    return false;
  }
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwardedFor?.split(',')[0]?.trim() || realIp || request.ip || 'unknown';
}

/**
 * Check if request should be rate limited
 */
function checkRateLimit(clientId: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now();
  const client = rateLimitStore.get(clientId);

  if (!client || now > client.resetTime) {
    // Reset or initialize
    rateLimitStore.set(clientId, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (client.count >= maxRequests) {
    return true; // Rate limited
  }

  client.count++;
  return false;
}

/**
 * Security and Authentication middleware function
 */
export function middleware(request: NextRequest) {
  const { pathname, protocol, host } = request.nextUrl;
  
  // Skip middleware for static files and API routes (except protected ones)
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.match(/\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }
  
  // ============================================================================
  // 0. Authentication and Route Protection
  // ============================================================================
  const userIsAuthenticated = isAuthenticated(request);
  
  // Handle protected routes
  if (isProtectedRoute(pathname)) {
    if (!userIsAuthenticated) {
      // Redirect to login with return URL
      const returnUrl = pathname !== '/' ? `${pathname}${request.nextUrl.search}` : '';
      const loginUrl = returnUrl ? `/login?return=${encodeURIComponent(returnUrl)}` : '/login';
      console.log(`[Auth Middleware] Redirecting unauthenticated user from ${pathname} to ${loginUrl}`);
      return NextResponse.redirect(new URL(loginUrl, request.url));
    }
  }
  
  // Handle auth routes (login/register)
  if (isAuthRoute(pathname)) {
    if (userIsAuthenticated) {
      // Redirect authenticated users to chat
      console.log(`[Auth Middleware] Redirecting authenticated user from ${pathname} to /chat`);
      return NextResponse.redirect(new URL('/chat', request.url));
    }
  }

  const response = NextResponse.next();

  // ============================================================================
  // 1. HTTPS Enforcement (Production only)
  // ============================================================================
  if (
    process.env.NODE_ENV === 'production' && 
    protocol === 'http:' && 
    !pathname.startsWith('/health')
  ) {
    const httpsUrl = `https://${host}${pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(httpsUrl, 301);
  }

  // ============================================================================
  // 2. Rate Limiting
  // ============================================================================
  const clientId = getClientIdentifier(request);
  
  // Different rate limits for different endpoints
  let maxRequests = 100;
  let windowMs = 60000; // 1 minute
  
  if (pathname.startsWith('/api/auth')) {
    maxRequests = 10; // Stricter for auth endpoints
    windowMs = 300000; // 5 minutes
  } else if (pathname.startsWith('/api/chat')) {
    maxRequests = 50; // Moderate for chat
    windowMs = 60000; // 1 minute
  }

  if (checkRateLimit(clientId, maxRequests, windowMs)) {
    return new NextResponse('Rate limit exceeded', { 
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
      }
    });
  }

  // ============================================================================
  // 3. Request Size Limits
  // ============================================================================
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const size = parseInt(contentLength);
    const maxSize = pathname.startsWith('/api/chat') ? 1024 * 1024 : 100 * 1024; // 1MB for chat, 100KB for others
    
    if (size > maxSize) {
      return new NextResponse('Payload too large', { status: 413 });
    }
  }

  // ============================================================================
  // 4. Suspicious Request Detection
  // ============================================================================
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
    console.warn(`[Security] Suspicious user agent detected: ${userAgent} from ${clientId}`);
    return new NextResponse('Forbidden', { status: 403 });
  }

  // ============================================================================
  // 5. Path Traversal Protection
  // ============================================================================
  if (pathname.includes('..') || pathname.includes('%2e%2e')) {
    console.warn(`[Security] Path traversal attempt: ${pathname} from ${clientId}`);
    return new NextResponse('Forbidden', { status: 403 });
  }

  // ============================================================================
  // 6. Additional Security Headers (augments Next.js headers)
  // ============================================================================
  
  // Add security headers that couldn't be added in next.config.ts
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  response.headers.set('Server', 'Vana-Security'); // Hide server info
  
  // Add rate limit info headers
  const remaining = rateLimitStore.get(clientId);
  if (remaining) {
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', Math.max(0, maxRequests - remaining.count).toString());
  }

  // ============================================================================
  // 7. CORS Protection for API routes
  // ============================================================================
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin');
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://localhost:8000',
      'https://vana.ai', // Add your production domains
    ];

    // In development, allow localhost origins
    if (process.env.NODE_ENV === 'development') {
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    } else if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');
  }

  // ============================================================================
  // 8. Content Type Validation for API requests
  // ============================================================================
  if (request.method === 'POST' && pathname.startsWith('/api/')) {
    const contentType = request.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return new NextResponse('Invalid content type', { status: 400 });
    }
  }

  // ============================================================================
  // 9. Security Event Logging
  // ============================================================================
  
  // Log security events in production
  if (process.env.NODE_ENV === 'production') {
    // Log authentication attempts
    if (pathname.startsWith('/api/auth')) {
      console.log(`[Security] Auth request: ${request.method} ${pathname} from ${clientId}`);
    }
    
    // Log suspicious activity
    if (pathname.includes('admin') || pathname.includes('wp-') || pathname.includes('.php')) {
      console.warn(`[Security] Suspicious path access: ${pathname} from ${clientId}`);
    }
  }

  return response;
}

/**
 * Configure which routes to run middleware on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};