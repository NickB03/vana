/**
 * Next.js Middleware - Edge Runtime Compatible
 * Combines security headers (CSP) and authentication
 */

import { NextRequest, NextResponse } from 'next/server';

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

/**
 * Create a cryptographically secure nonce suitable for use in a Content Security Policy.
 *
 * Produces a 16-byte random value encoded as a 32-character lowercase hex string.
 *
 * @returns A hex-encoded nonce (32 hex characters) that can be used in `script-src`/`style-src` CSP directives.
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build the Content-Security-Policy header value used by the Vana frontend.
 *
 * Returns a single CSP string composed from a curated set of directives tailored
 * for Next.js edge runtime. The `nonce` is injected into script/style directives
 * to allow trusted inline resources; `isDevelopment` enables relaxed sources
 * (localhosts, webpack, ws) needed during development.
 *
 * @param nonce - A cryptographic nonce value to be included as `nonce-<value>` in script/style directives.
 * @param isDevelopment - When true, enables development-only sources (hot-reload, local websockets, localhost APIs).
 * @returns The final CSP header string (to be set as the value of Content-Security-Policy).
 */
function getCSPHeader(nonce: string, isDevelopment: boolean): string {
  const baseConfig = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Monaco Editor sandboxed separately - no unsafe-eval in main CSP
      // "'unsafe-eval'", // REMOVED for security - sandbox Monaco instead
      "'wasm-unsafe-eval'", // Required for WebAssembly
      // Development mode requirements
      ...(isDevelopment ? [
        "'unsafe-inline'", // For development hot reload
        "webpack://*",
        "http://localhost:*",
        "ws://localhost:*"
      ] : []),
      // Trusted CDNs
      "https://fonts.googleapis.com",
      "https://cdnjs.cloudflare.com",
      "https://unpkg.com",
      // Next.js chunks and runtime
      "https://vercel.live",
      "https://*.vercel.app",
      "https://*.vercel-analytics.com"
    ],
    'script-src-elem': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(isDevelopment ? ["'unsafe-inline'"] : []),
      "https://fonts.googleapis.com",
      "https://vercel.live"
    ],
    'style-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'unsafe-inline'", // Required for styled-components and CSS-in-JS
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com"
    ],
    'style-src-elem': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind and component styles
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com"
    ],
    'img-src': [
      "'self'",
      "data:",
      "blob:",
      "https:",
      "http:", // For development images
      "https://vercel.live",
      "https://*.vercel.app"
    ],
    'font-src': [
      "'self'",
      "data:",
      "https://fonts.gstatic.com",
      "https://fonts.googleapis.com"
    ],
    'connect-src': [
      "'self'",
      // Backend API endpoints
      "http://localhost:8000",
      "ws://localhost:8000",
      "https://localhost:8000",
      "wss://localhost:8000",
      // SSE endpoints
      "http://localhost:8000/agent_network_sse",
      "http://localhost:8000/agent_network_events",
      // Development WebSocket connections
      ...(isDevelopment ? [
        "http://localhost:*",
        "ws://localhost:*",
        "https://localhost:*",
        "wss://localhost:*"
      ] : []),
      // External APIs (if needed)
      "https://api.github.com",
      "https://vercel.live",
      "https://*.vercel.app",
      "https://*.vercel-analytics.com"
    ],
    'worker-src': [
      "'self'",
      "blob:",
      // Monaco Editor workers
      "https://cdnjs.cloudflare.com"
    ],
    'child-src': [
      "'self'",
      "blob:"
    ],
    'frame-src': [
      "'none'"
    ],
    'frame-ancestors': [
      "'none'"
    ],
    'object-src': [
      "'none'"
    ],
    'base-uri': [
      "'self'"
    ],
    'form-action': [
      "'self'",
      // OAuth callback endpoints
      "https://accounts.google.com",
      "https://github.com"
    ],
    'manifest-src': [
      "'self'"
    ],
    'media-src': [
      "'self'",
      "data:",
      "blob:"
    ],
    // Prefetch directives for performance
    'prefetch-src': [
      "'self'",
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com"
    ]
  };

  // Build the CSP string
  const cspDirectives = Object.entries(baseConfig)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');

  return cspDirectives;
}

/**
 * Returns a set of HTTP security headers to apply to responses.
 *
 * The returned object includes headers that:
 * - prevent MIME type sniffing (X-Content-Type-Options),
 * - block framing (X-Frame-Options),
 * - enforce a strict referrer policy (Referrer-Policy),
 * - restrict browser features via Permissions-Policy,
 * - enforce cross-origin embedding/opener/resource policies,
 * and, when NODE_ENV is "production", adds Strict-Transport-Security for HSTS.
 *
 * @returns An object mapping header names to header values. The `Strict-Transport-Security`
 * header is only present when running in production.
 */
function getSecurityHeaders() {
  return {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    // Referrer policy for privacy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Permissions policy to restrict browser features
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'interest-cohort=()', // Disable FLoC
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()'
    ].join(', '),
    // HSTS for HTTPS enforcement (only in production)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    // Cross-Origin policies
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site'
  };
}

/**
 * Extracts and returns the decoded payload object from a JWT without executing code.
 *
 * Decodes the middle segment of a JWT (header.payload.signature) handling URL-safe
 * base64 variants and missing padding. Returns the parsed payload object, or `null`
 * if the token is not a valid JWT or if decoding/parsing fails.
 *
 * @param token - The JWT string to decode.
 * @returns The JWT payload as an object, or `null` on invalid format or parse errors.
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
 * Next.js Edge middleware that applies a nonce-based Content Security Policy and additional security headers,
 * while bypassing static/internal routes and public endpoints.
 *
 * This middleware:
 * - Skips processing for Next.js internals, static assets, and most API routes (except /api/auth).
 * - Generates a cryptographically secure nonce and builds a CSP using that nonce.
 * - Attaches the CSP (with reporting endpoints in production), other security headers, and an `x-nonce` header to the response.
 * - Sets a `Report-To` header for CSP reporting in production.
 * - Immediately returns for PUBLIC_ROUTES without performing authentication.
 *
 * Authentication scaffolding is present but currently disabled; when enabled the middleware will validate tokens,
 * handle expirations, enforce admin protection on /admin routes, and inject user info into request headers or
 * redirect unauthenticated requests to /auth/login.
 *
 * @param request - The NextRequest provided by the Next.js Edge runtime.
 * @returns A NextResponse with security headers applied, or a redirect/NextResponse produced by authentication logic when enabled.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🔒 Middleware running for:', pathname);
  
  // Skip middleware for static assets and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/') && !pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const nonce = generateNonce();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Apply CSP and security headers
  const cspHeader = getCSPHeader(nonce, isDevelopment);
  const cspWithReporting = isDevelopment 
    ? cspHeader 
    : `${cspHeader}; report-uri /api/csp-report; report-to csp-endpoint`;

  // Set CSP header
  response.headers.set('Content-Security-Policy', cspWithReporting);

  // Set additional security headers
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add nonce to request headers for use in components
  response.headers.set('x-nonce', nonce);

  // Report-To header for CSP violation reporting (production only)
  if (!isDevelopment) {
    response.headers.set('Report-To', JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [{ url: '/api/csp-report' }],
      include_subdomains: true
    }));
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return response;
  }

  // TODO: Enable authentication when ready
  // For now, just apply security headers without auth checks
  console.log('🔒 Auth middleware temporarily disabled for development');
  return response;

  // DISABLED AUTH CODE (uncomment and adjust when auth is ready):
  /*
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
    // Validate token using Edge Runtime compatible parsing
    const payload = parseJWTPayload(idToken);
    
    if (!payload) {
      throw new Error('Invalid token format');
    }
    
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

    // Check admin routes with prefix-based protection for defense-in-depth
    if (pathname.startsWith('/admin')) {
      if (!payload.role || payload.role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/403';
        return NextResponse.redirect(url);
      }
    }

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
  */
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