/**
 * Next.js Middleware - Edge Runtime Compatible
 * Comprehensive security middleware with:
 * - Content Security Policy headers
 * - Rate limiting for API endpoints
 * - CORS configuration for SSE endpoints
 * - Request validation middleware
 * - Authentication middleware
 * - Security logging and monitoring
 */

import { NextRequest, NextResponse } from 'next/server';

// Rate limiting configuration
interface RateLimit {
  count: number;
  resetTime: number;
}

interface RequestValidationResult {
  isValid: boolean;
  error?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, RateLimit>();
const securityIncidents = new Map<string, number>();

// Rate limiting configurations
const RATE_LIMITS = {
  api: { requests: 100, window: 60000 }, // 100 requests per minute for API
  sse: { requests: 10, window: 60000 },  // 10 SSE connections per minute
  auth: { requests: 20, window: 300000 }, // 20 auth requests per 5 minutes
  default: { requests: 200, window: 60000 } // 200 requests per minute default
} as const;

// SSE endpoints that need special CORS handling
const SSE_ENDPOINTS = [
  '/api/sse',
  '/agent_network_sse',
  '/agent_network_events'
];

// High-risk patterns for request validation
const SECURITY_PATTERNS = {
  sqlInjection: /(union|select|insert|update|delete|drop|create|alter|exec|script)/i,
  xss: /<script|javascript:|on\w+=/i,
  pathTraversal: /\.\.[\\/\\]|\.[\\/\\]\.[\\/\\]/,
  commandInjection: /[;&|`$(){}\\[\\]]/,
  suspiciousHeaders: /[<>"']/
};

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
 * Get client IP address from request headers
 */
function getClientIP(request: NextRequest): string {
  // Check common proxy headers in order of preference
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to request IP
  return request.ip || 'unknown';
}

/**
 * Rate limiting implementation
 */
function checkRateLimit(
  identifier: string, 
  config: { requests: number; window: number }
): { allowed: boolean; resetTime?: number } {
  const now = Date.now();
  const key = identifier;
  const rateLimit = rateLimitStore.get(key);
  
  if (!rateLimit || now > rateLimit.resetTime) {
    // Reset or create new rate limit
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.window
    });
    return { allowed: true };
  }
  
  if (rateLimit.count >= config.requests) {
    return {
      allowed: false,
      resetTime: rateLimit.resetTime
    };
  }
  
  rateLimit.count++;
  return { allowed: true };
}

/**
 * Request validation to detect malicious patterns
 */
function validateRequest(request: NextRequest): RequestValidationResult {
  const url = request.url;
  const userAgent = request.headers.get('user-agent') || '';
  const referer = request.headers.get('referer') || '';
  
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  
  // Check URL for suspicious patterns
  if (SECURITY_PATTERNS.sqlInjection.test(url) ||
      SECURITY_PATTERNS.xss.test(url) ||
      SECURITY_PATTERNS.pathTraversal.test(url)) {
    return {
      isValid: false,
      error: 'Suspicious URL pattern detected',
      riskLevel: 'high'
    };
  }
  
  // Check for command injection patterns in query parameters
  if (SECURITY_PATTERNS.commandInjection.test(url)) {
    riskLevel = 'medium';
  }
  
  // Check user agent for suspicious patterns
  if (!userAgent || userAgent.length < 10 || userAgent.length > 512) {
    riskLevel = 'medium';
  }
  
  // Check headers for XSS attempts
  for (const [key, value] of request.headers.entries()) {
    if (SECURITY_PATTERNS.suspiciousHeaders.test(value)) {
      return {
        isValid: false,
        error: 'Suspicious header content detected',
        riskLevel: 'high'
      };
    }
  }
  
  return {
    isValid: true,
    riskLevel
  };
}

/**
 * Log security incidents for monitoring
 */
function logSecurityIncident(
  request: NextRequest,
  incidentType: string,
  details: Record<string, any>
): void {
  const clientIP = getClientIP(request);
  const timestamp = new Date().toISOString();
  const userAgent = request.headers.get('user-agent');
  
  // Increment incident counter for this IP
  const currentCount = securityIncidents.get(clientIP) || 0;
  securityIncidents.set(clientIP, currentCount + 1);
  
  const incident = {
    timestamp,
    clientIP,
    userAgent,
    url: request.url,
    method: request.method,
    incidentType,
    incidentCount: currentCount + 1,
    ...details
  };
  
  // In production, send to logging service
  console.warn('Security incident detected:', JSON.stringify(incident, null, 2));
  
  // If too many incidents from same IP, consider it high risk
  if (currentCount >= 5) {
    console.error(`High risk IP detected: ${clientIP} (${currentCount + 1} incidents)`);
  }
}

/**
 * CORS configuration for different endpoint types
 */
function getCORSHeaders(
  request: NextRequest, 
  endpointType: 'api' | 'sse' | 'default'
): Record<string, string> {
  const origin = request.headers.get('origin');
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Allowed origins
  const allowedOrigins = isDevelopment 
    ? ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8000']
    : [process.env.FRONTEND_URL].filter(Boolean);
  
  const headers: Record<string, string> = {};
  
  // Check if origin is allowed
  if (origin && (allowedOrigins.includes(origin) || isDevelopment)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  // SSE-specific CORS headers
  if (endpointType === 'sse') {
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Headers'] = [
      'Cache-Control',
      'Authorization',
      'Content-Type',
      'Last-Event-ID',
      'Accept'
    ].join(', ');
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Max-Age'] = '86400'; // 24 hours
    
    // SSE-specific headers
    headers['Cache-Control'] = 'no-cache';
    headers['Connection'] = 'keep-alive';
    headers['X-Accel-Buffering'] = 'no';
  } else if (endpointType === 'api') {
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Allow-Headers'] = [
      'Authorization',
      'Content-Type',
      'Accept',
      'X-Requested-With',
      'X-CSRF-Token'
    ].join(', ');
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Max-Age'] = '3600'; // 1 hour
  }
  
  return headers;
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
      // Backend API endpoints with explicit SSE support
      "http://localhost:8000",
      "ws://localhost:8000",
      "https://localhost:8000",
      "wss://localhost:8000",
      // SSE endpoints - explicitly allowed for all environments
      "http://localhost:8000/agent_network_sse",
      "http://localhost:8000/agent_network_events",
      "http://localhost:8000/api/sse",
      // Production SSE endpoints
      ...(!isDevelopment ? [
        process.env.BACKEND_URL,
        process.env.BACKEND_WSS_URL
      ].filter(Boolean) : []),
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
  const clientIP = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  
  console.log('🔒 Middleware running for:', pathname, 'from IP:', clientIP);
  
  // Skip middleware for static assets and internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') && !pathname.includes('/api/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // 1. REQUEST VALIDATION
  const validation = validateRequest(request);
  if (!validation.isValid) {
    logSecurityIncident(request, 'REQUEST_VALIDATION_FAILED', {
      error: validation.error,
      riskLevel: validation.riskLevel
    });
    
    return NextResponse.json(
      { error: 'Request validation failed', code: 'INVALID_REQUEST' },
      { status: 400 }
    );
  }
  
  // Log medium/high risk requests
  if (validation.riskLevel !== 'low') {
    logSecurityIncident(request, 'SUSPICIOUS_REQUEST', {
      riskLevel: validation.riskLevel,
      url: request.url
    });
  }

  // 2. RATE LIMITING
  const rateLimitKey = `${clientIP}:${pathname}`;
  let rateLimitConfig = RATE_LIMITS.default;
  
  // Determine rate limit based on endpoint type
  if (pathname.startsWith('/api/auth/')) {
    rateLimitConfig = RATE_LIMITS.auth;
  } else if (SSE_ENDPOINTS.some(endpoint => pathname.includes(endpoint))) {
    rateLimitConfig = RATE_LIMITS.sse;
  } else if (pathname.startsWith('/api/')) {
    rateLimitConfig = RATE_LIMITS.api;
  }
  
  const rateLimit = checkRateLimit(rateLimitKey, rateLimitConfig);
  if (!rateLimit.allowed) {
    logSecurityIncident(request, 'RATE_LIMIT_EXCEEDED', {
      rateLimitConfig,
      resetTime: rateLimit.resetTime
    });
    
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((rateLimit.resetTime! - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimit.resetTime! - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': rateLimitConfig.requests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetTime!.toString()
        }
      }
    );
    
    return response;
  }

  // 3. CORS HANDLING
  let corsHeaders: Record<string, string> = {};
  if (request.method === 'OPTIONS') {
    // Handle preflight requests
    let endpointType: 'api' | 'sse' | 'default' = 'default';
    
    if (SSE_ENDPOINTS.some(endpoint => pathname.includes(endpoint))) {
      endpointType = 'sse';
    } else if (pathname.startsWith('/api/')) {
      endpointType = 'api';
    }
    
    corsHeaders = getCORSHeaders(request, endpointType);
    
    const response = new NextResponse(null, { 
      status: 204,
      headers: corsHeaders
    });
    
    return response;
  }

  const response = NextResponse.next();
  const nonce = generateNonce();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 4. SECURITY HEADERS
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
  
  // Add rate limiting headers
  const remaining = rateLimitConfig.requests - (rateLimitStore.get(rateLimitKey)?.count || 0);
  response.headers.set('X-RateLimit-Limit', rateLimitConfig.requests.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, remaining).toString());
  response.headers.set('X-RateLimit-Reset', (Date.now() + rateLimitConfig.window).toString());

  // Add nonce to request headers for use in components
  response.headers.set('x-nonce', nonce);
  
  // Add security context headers
  response.headers.set('X-Content-Risk-Level', validation.riskLevel);
  response.headers.set('X-Security-Processed', 'true');

  // 5. CORS HEADERS FOR NON-OPTIONS REQUESTS
  if (pathname.startsWith('/api/') || SSE_ENDPOINTS.some(endpoint => pathname.includes(endpoint))) {
    let endpointType: 'api' | 'sse' | 'default' = 'api';
    
    if (SSE_ENDPOINTS.some(endpoint => pathname.includes(endpoint))) {
      endpointType = 'sse';
    }
    
    const corsHeaders = getCORSHeaders(request, endpointType);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Report-To header for CSP violation reporting (production only)
  if (!isDevelopment) {
    response.headers.set('Report-To', JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [{ url: '/api/csp-report' }],
      include_subdomains: true
    }));
  }
  
  // 6. SECURITY MONITORING
  // Log successful requests for monitoring (only in development for now)
  if (isDevelopment && pathname.startsWith('/api/')) {
    console.log(`✅ API request processed: ${request.method} ${pathname} from ${clientIP}`);
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
    return response;
  }

  // 7. AUTHENTICATION MIDDLEWARE
  // Check for authentication tokens
  const accessToken = request.cookies.get('access_token')?.value;
  const idToken = request.cookies.get('id_token')?.value;
  const authHeader = request.headers.get('authorization');
  
  // Extract bearer token if present
  let bearerToken: string | null = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7);
  }
  
  // Determine if authentication is required
  const requiresAuth = !PUBLIC_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
  
  if (requiresAuth) {
    // Check if we have any form of authentication
    if (!accessToken && !idToken && !bearerToken) {
      logSecurityIncident(request, 'UNAUTHENTICATED_ACCESS_ATTEMPT', {
        pathname,
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
        hasBearerToken: !!bearerToken
      });
      
      // For API routes, return JSON error
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { 
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer realm="Vana API"',
              ...corsHeaders
            }
          }
        );
      }
      
      // For regular routes, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    try {
      // Validate token using Edge Runtime compatible parsing
      const tokenToValidate = bearerToken || idToken;
      const payload = tokenToValidate ? parseJWTPayload(tokenToValidate) : null;
      
      if (!payload) {
        throw new Error('Invalid token format');
      }
      
      // Check token expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        logSecurityIncident(request, 'EXPIRED_TOKEN_ACCESS', {
          pathname,
          tokenExp: payload.exp,
          currentTime: Date.now() / 1000
        });
        
        // Token expired
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Token expired', code: 'TOKEN_EXPIRED' },
            { 
              status: 401,
              headers: {
                'WWW-Authenticate': 'Bearer realm="Vana API" error="invalid_token"',
                ...corsHeaders
              }
            }
          );
        }
        
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        url.searchParams.set('redirect', pathname);
        url.searchParams.set('reason', 'session_expired');
        
        // Clear expired cookies
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.cookies.delete('access_token');
        redirectResponse.cookies.delete('id_token');
        return redirectResponse;
      }

      // Check admin routes with prefix-based protection
      if (pathname.startsWith('/admin')) {
        if (!payload.role || payload.role !== 'admin') {
          logSecurityIncident(request, 'UNAUTHORIZED_ADMIN_ACCESS', {
            pathname,
            userRole: payload.role,
            userId: payload.sub
          });
          
          if (pathname.startsWith('/api/')) {
            return NextResponse.json(
              { error: 'Insufficient privileges', code: 'FORBIDDEN' },
              { 
                status: 403,
                headers: corsHeaders
              }
            );
          }
          
          const url = request.nextUrl.clone();
          url.pathname = '/403';
          return NextResponse.redirect(url);
        }
      }

      // Add user info to response headers for downstream use
      response.headers.set('x-user-id', payload.sub || '');
      response.headers.set('x-user-email', payload.email || '');
      response.headers.set('x-user-role', payload.role || 'user');
      response.headers.set('x-authenticated', 'true');
      
      // Log successful authentication for monitoring
      if (isDevelopment) {
        console.log(`🔐 Authenticated request: ${payload.email || payload.sub} -> ${pathname}`);
      }
      
    } catch (error) {
      logSecurityIncident(request, 'AUTHENTICATION_ERROR', {
        pathname,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
        hasBearerToken: !!bearerToken
      });
      
      // Invalid token
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Invalid authentication credentials', code: 'INVALID_TOKEN' },
          { 
            status: 401,
            headers: {
              'WWW-Authenticate': 'Bearer realm="Vana API" error="invalid_token"',
              ...corsHeaders
            }
          }
        );
      }
      
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      url.searchParams.set('redirect', pathname);
      url.searchParams.set('error', 'invalid_token');
      
      // Clear invalid cookies
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.cookies.delete('access_token');
      redirectResponse.cookies.delete('id_token');
      return redirectResponse;
    }
  } else {
    // Public route - just add authentication status
    response.headers.set('x-authenticated', (!!accessToken || !!idToken || !!bearerToken).toString());
  }
  
  return response;
}

// Configure which routes use middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files) 
     * - favicon.ico (favicon file)
     * - static assets (js, css, images, etc.)
     * 
     * But DO include:
     * - API routes (for authentication and rate limiting)
     * - SSE endpoints (for CORS and auth)
     * - All page routes (for CSP and auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)).*)',
  ],
};

// Export utility functions for use in API routes if needed
export {
  getClientIP,
  checkRateLimit,
  validateRequest,
  logSecurityIncident,
  getCORSHeaders
};