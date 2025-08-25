import { NextRequest, NextResponse } from 'next/server';

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
 * Middleware function to apply security headers
 */
export function middleware(_request: NextRequest) {
  console.log('🔒 CSP Middleware running for:', _request.nextUrl.pathname);
  
  const response = NextResponse.next();
  const nonce = generateNonce();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Generate CSP header
  const cspHeader = getCSPHeader(nonce, isDevelopment);

  // Apply CSP header with violation reporting
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

  return response;
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    '/',
    '/canvas/:path*',
    '/chat/:path*',
    '/auth/:path*',
  ],
};