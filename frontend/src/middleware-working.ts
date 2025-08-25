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
 * Generate a cryptographically secure nonce for CSP
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Content Security Policy configuration for Vana frontend
 * Enhanced for Next.js 15 with comprehensive security directives
 */
function getCSPHeader(nonce: string, isDevelopment: boolean): string {
  const baseConfig = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      // Monaco Editor and worker requirements
      "'unsafe-eval'", // Required for Monaco Editor
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
 * Additional security headers for enhanced protection
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
 * Simple JWT payload extraction without using jwt-decode (which uses eval)
 * This is safe for Edge Runtime environment
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