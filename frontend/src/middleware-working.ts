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
import { jwtVerify, importSPKI, type JWTPayload } from 'jose';

// JWT Configuration
const JWT_SECRET = process.env['JWT_SECRET'] || '';
const JWT_PUBLIC_KEY = process.env['JWT_PUBLIC_KEY'] || '';
const JWT_ISSUER = process.env['JWT_ISSUER'] || 'vana-api';
const JWT_AUDIENCE = process.env['JWT_AUDIENCE'] || 'vana-frontend';
const JWKS_URL = process.env['JWKS_URL'] || '';
const CLOCK_SKEW_SECONDS = 30; // Allow 30 seconds clock skew

// Import storage implementations
import { StorageInterface } from '@/lib/storage';
import { RedisStorage, RedisConfig } from '@/lib/redis-storage';
import { InMemoryStorage } from '@/lib/in-memory-storage';

// Rate limiting configuration interfaces are defined inline where used

interface RequestValidationResult {
  isValid: boolean;
  error?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface VerifiedJWTPayload extends JWTPayload {
  role?: string;
  permissions?: string[];
  userId?: string;
  email?: string;
}

// Security incidents store
const securityIncidents = new Map<string, number>();

// Redis URL parser utility function
/**
 * Parse Redis URL string into config object
 * Supports formats like:
 * - redis://localhost:6379
 * - redis://password@host:6379/0
 * - redis://host (uses default port 6379)
 * - rediss://host:port (SSL, treated same as redis://)
 */
function parseRedisUrl(redisUrl: string): RedisConfig {
  try {
    // Handle Edge Runtime compatibility by using standard URL constructor
    const url = new URL(redisUrl);
    
    // Validate protocol
    if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
      throw new Error('Invalid protocol: must be redis: or rediss:');
    }
    
    // Extract host (remove IPv6 brackets if present)
    const host = url.hostname.replace(/^\[|\]$/g, '') || 'localhost';
    
    // Extract port with protocol-aware defaults
    let port: number;
    if (url.port) {
      port = parseInt(url.port, 10);
      // Harden port validation with Number.isInteger check
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('Invalid port: must be a valid integer between 1-65535');
      }
    } else {
      // Protocol-aware defaults: 6380 for rediss (SSL), 6379 for redis
      port = url.protocol === 'rediss:' ? 6380 : 6379;
    }
    
    // Extract username from userinfo
    const username = url.username || undefined;
    
    // Extract password from userinfo
    const password = url.password || undefined;
    
    // Set TLS based on protocol
    const tls = url.protocol === 'rediss:';
    
    // Extract database number from pathname
    let db: number | undefined = undefined;
    if (url.pathname && url.pathname !== '/') {
      const dbPath = url.pathname.substring(1); // Remove leading slash
      const dbNum = parseInt(dbPath, 10);
      if (!isNaN(dbNum) && dbNum >= 0) {
        db = dbNum;
      }
    }
    
    return {
      host,
      port,
      username,
      password,
      tls,
      db
    };
  } catch (error) {
    // Fallback for malformed URLs - don't expose the URL to prevent credential leaks
    console.error('Failed to parse Redis URL:', error);
    throw new Error('Invalid Redis URL format');
  }
}

// Initialize storage based on environment
let storage: StorageInterface;

// Initialize storage with Redis if available, otherwise fallback to in-memory
const initializeStorage = (): StorageInterface => {
  const redisUrl = process.env['REDIS_URL'];
  
  if (redisUrl) {
    try {
      // Parse the Redis URL string into a config object
      const redisConfig = parseRedisUrl(redisUrl);
      return new RedisStorage(redisConfig);
    } catch (error) {
      console.warn('Failed to initialize Redis storage, falling back to in-memory:', error);
      return new InMemoryStorage();
    }
  } else {
    return new InMemoryStorage();
  }
};

storage = initializeStorage();

// Rate limiting configurations
const RATE_LIMITS = {
  api: { requests: 100, window: 60000 }, // 100 requests per minute for API
  sse: { requests: 10, window: 60000 },  // 10 SSE connections per minute
  auth: { requests: 20, window: 300000 }, // 20 auth requests per 5 minutes
  default: { requests: 200, window: 60000 } // 200 requests per minute default
};

// SSE endpoints that need special CORS handling
const SSE_ENDPOINTS = [
  '/api/sse',
  '/agent_network_sse',
  '/agent_network_events'
];

// Import the new security validator
import securityValidator, { 
  ValidationContext, 
  configureSecurityValidator 
} from '@/lib/security-validator';

// Configure security validator with custom settings
configureSecurityValidator({
  minEntropyThreshold: 0.6,
  maxRiskScore: 100,
  // Disable certain rules that might cause false positives in your app
  disabledRules: process.env.NODE_ENV === 'development' ? ['high_entropy'] : [],
  // Map common field names to types
  fieldTypeMapping: {
    'search': 'search',
    'q': 'search',
    'query': 'search',
    'message': 'comment',
    'feedback': 'comment',
    'description': 'comment'
  }
});

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
    const firstIP = forwardedFor.split(',')[0];
    return firstIP ? firstIP.trim() : 'unknown';
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  // Fallback to request IP (safely check for socket property)
  const reqWithSocket = request as any;
  if (reqWithSocket.socket?.remoteAddress) {
    return reqWithSocket.socket.remoteAddress;
  }

  return 'unknown';
}

/**
 * Rate limiting implementation using pluggable storage
 */
async function checkRateLimit(
  identifier: string, 
  config: { requests: number; window: number }
): Promise<{ allowed: boolean; resetTime?: number; remaining?: number }> {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  const windowSeconds = Math.floor(config.window / 1000);
  
  try {
    // Try to increment the counter
    const count = await storage.increment(key, 1, windowSeconds);
    
    if (count === 1) {
      // First request in this window
      return { 
        allowed: true, 
        remaining: config.requests - 1,
        resetTime: now + config.window
      };
    } else if (count <= config.requests) {
      // Within limit
      return { 
        allowed: true, 
        remaining: config.requests - count,
        resetTime: now + config.window
      };
    } else {
      // Exceeded limit
      return { 
        allowed: false, 
        remaining: 0,
        resetTime: now + (windowSeconds * 1000)
      };
    }
  } catch (error) {
    console.error('Rate limit check failed, allowing request:', error);
    // Fail open - allow the request if storage fails
    return { allowed: true, remaining: config.requests };
  }
}

/**
 * Request validation using context-aware security patterns
 */
function validateRequest(request: NextRequest): RequestValidationResult {
  const url = request.url;
  const userAgent = request.headers.get('user-agent') || '';
  const contentType = request.headers.get('content-type') || '';
  
  let overallRiskLevel: 'low' | 'medium' | 'high' = 'low';
  let validationErrors: string[] = [];
  
  // Parse URL components for targeted validation
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;
  
  // Validate URL path with appropriate context
  const pathValidation = securityValidator.validateInput(pathname, {
    fieldType: 'url',
    fieldName: 'pathname',
    minLength: 1,
    maxLength: 2048
  });
  
  if (!pathValidation.isValid) {
    const highSeverityViolations = pathValidation.violations.filter(v => v.severity === 'high');
    if (highSeverityViolations.length > 0) {
      const firstViolation = highSeverityViolations[0];
      return {
        isValid: false,
        error: `Security violation in URL path: ${firstViolation?.description || 'Unknown violation'}`,
        riskLevel: 'high'
      };
    }
  }
  
  // Validate query parameters with appropriate context
  const paramValidations: Record<string, any> = {};
  for (const [key, value] of searchParams.entries()) {
    // Determine field type based on parameter name
    let fieldType: ValidationContext['fieldType'] = 'general';
    
    // Common search/query parameters should be validated as search fields
    if (['q', 'query', 'search', 'term', 'keyword'].includes(key.toLowerCase())) {
      fieldType = 'search';
    } else if (key.toLowerCase().includes('code') || key.toLowerCase().includes('sql')) {
      fieldType = 'code';
    } else if (key.toLowerCase().includes('file') || key.toLowerCase().includes('path')) {
      fieldType = 'filename';
    }
    
    const paramValidation = securityValidator.validateInput(value, {
      fieldType,
      fieldName: key,
      contentType,
      minLength: 1,
      maxLength: 1024,
      // Skip certain patterns for known safe parameters
      skipPatterns: fieldType === 'search' ? ['sql_injection_union', 'command_injection_pipe'] : []
    });
    
    paramValidations[key] = paramValidation;
    
    if (!paramValidation.isValid) {
      const firstViolation = paramValidation.violations[0];
      validationErrors.push(`Parameter '${key}': ${firstViolation?.description || 'Invalid parameter'}`);
      overallRiskLevel = 'high';
    } else if (paramValidation.riskScore > 50) {
      overallRiskLevel = overallRiskLevel === 'high' ? 'high' : 'medium';
    }
  }
  
  // Validate critical headers with appropriate context
  const headerValidations: Record<string, any> = {};
  const criticalHeaders = ['referer', 'origin', 'x-forwarded-for', 'x-real-ip'];
  
  for (const headerName of criticalHeaders) {
    const headerValue = request.headers.get(headerName);
    if (headerValue) {
      const headerValidation = securityValidator.validateInput(headerValue, {
        fieldType: headerName === 'referer' || headerName === 'origin' ? 'url' : 'general',
        fieldName: headerName,
        maxLength: 512,
        // Headers shouldn't contain HTML or script content
        skipPatterns: ['sql_injection_union', 'sql_injection_drop']
      });
      
      headerValidations[headerName] = headerValidation;
      
      if (!headerValidation.isValid) {
        return {
          isValid: false,
          error: `Suspicious content in ${headerName} header`,
          riskLevel: 'high'
        };
      }
    }
  }
  
  // Check user agent for suspicious patterns (but be lenient)
  if (userAgent) {
    const uaValidation = securityValidator.validateInput(userAgent, {
      fieldType: 'general',
      fieldName: 'user-agent',
      minLength: 5,
      maxLength: 1024,
      // User agents can contain various special characters, so skip most patterns
      skipPatterns: [
        'command_injection_pipe',
        'command_injection_backtick',
        'command_injection_dollar',
        'sql_injection_union',
        'xss_script_tag'
      ]
    });
    
    if (uaValidation.riskScore > 80) {
      overallRiskLevel = 'medium';
    }
  } else {
    // Missing user agent is suspicious but not blocking
    overallRiskLevel = overallRiskLevel === 'low' ? 'medium' : overallRiskLevel;
  }
  
  // Calculate final risk level based on all validations
  const totalRiskScore = 
    (pathValidation.riskScore || 0) +
    Object.values(paramValidations).reduce((sum: number, v: any) => sum + (v.riskScore || 0), 0) +
    Object.values(headerValidations).reduce((sum: number, v: any) => sum + (v.riskScore || 0), 0);
  
  if (totalRiskScore > 80) {
    overallRiskLevel = 'high';
  } else if (totalRiskScore > 40) {
    overallRiskLevel = 'medium';
  }
  
  // Return validation result
  if (validationErrors.length > 0 && overallRiskLevel === 'high') {
    return {
      isValid: false,
      error: validationErrors[0],
      riskLevel: 'high'
    };
  }
  
  return {
    isValid: true,
    riskLevel: overallRiskLevel
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
    : [process.env['FRONTEND_URL']].filter(Boolean);
  
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
      // Only allow connections to our own API proxy endpoints
      "/api/sse",
      "/api/agent-network/events",
      // Production SSE endpoints
      ...(!isDevelopment ? [
        process.env['BACKEND_URL'],
        process.env['BACKEND_WSS_URL']
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
 * Verify JWT with proper signature validation using jose library
 * This is safe and compatible with Edge Runtime environment
 */
async function verifyJWT(token: string): Promise<VerifiedJWTPayload | null> {
  try {
    let secret: Uint8Array | CryptoKey;
    
    // Determine the key type and import it
    if (JWT_PUBLIC_KEY) {
      // Use RSA/ECDSA public key if available
      const publicKey = await importSPKI(JWT_PUBLIC_KEY, 'RS256');
      secret = publicKey as CryptoKey;
    } else if (JWKS_URL) {
      // Use JWKS endpoint if configured (would need additional implementation)
      // For now, fall back to symmetric key
      if (!JWT_SECRET) {
        console.error('No JWT secret or public key configured');
        return null;
      }
      secret = new TextEncoder().encode(JWT_SECRET);
    } else if (JWT_SECRET) {
      // Use symmetric key (HS256)
      secret = new TextEncoder().encode(JWT_SECRET);
    } else {
      console.error('No JWT verification key configured');
      return null;
    }
    
    // Verify the JWT with proper validation
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER || undefined,
      audience: JWT_AUDIENCE || undefined,
      clockTolerance: CLOCK_SKEW_SECONDS,
      algorithms: JWT_PUBLIC_KEY ? ['RS256', 'ES256'] : ['HS256']
    });
    
    return payload as VerifiedJWTPayload;
  } catch (error) {
    // Log the verification error for security monitoring
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Legacy JWT payload extraction (DEPRECATED - DO NOT USE)
 * Kept for reference only - this function does NOT verify signatures
 */
// @ts-ignore - Legacy function kept for reference
function unsafeParseJWTPayload(token: string): Record<string, any> | null {
  console.warn('SECURITY WARNING: Using unsafe JWT parsing without signature verification');
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    if (!payload) return null;
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);
  
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
  
  const rateLimit = await checkRateLimit(rateLimitKey, rateLimitConfig);
  if (!rateLimit.allowed) {
    logSecurityIncident(request, 'RATE_LIMIT_EXCEEDED', {
      rateLimitConfig,
      resetTime: rateLimit.resetTime
    });
    
    const response = NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(((rateLimit.resetTime || 0) - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil(((rateLimit.resetTime || 0) - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': rateLimitConfig.requests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (rateLimit.resetTime || 0).toString()
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
  const remaining = rateLimit.remaining !== undefined ? rateLimit.remaining : rateLimitConfig.requests;
  response.headers.set('X-RateLimit-Limit', rateLimitConfig.requests.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, remaining).toString());
  response.headers.set('X-RateLimit-Reset', (rateLimit.resetTime || (Date.now() + rateLimitConfig.window)).toString());

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
      // Properly verify token with signature validation
      const tokenToValidate = bearerToken || idToken;
      
      if (!tokenToValidate) {
        throw new Error('No token provided');
      }
      
      // Verify JWT signature and validate claims
      const payload = await verifyJWT(tokenToValidate);
      
      if (!payload) {
        // Log security incident for failed verification
        logSecurityIncident(request, 'JWT_VERIFICATION_FAILED', {
          pathname,
          tokenType: bearerToken ? 'bearer' : 'id',
          timestamp: new Date().toISOString()
        });
        throw new Error('JWT verification failed');
      }
      
      // Token expiration is already checked by jose during verification
      // But we can do additional custom expiry checks if needed
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime - CLOCK_SKEW_SECONDS) {
        logSecurityIncident(request, 'EXPIRED_TOKEN_ACCESS', {
          pathname,
          tokenExp: payload.exp,
          currentTime: currentTime
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
        // Ensure payload has proper type from verified JWT
        const verifiedPayload = payload as VerifiedJWTPayload;
        if (!verifiedPayload.role || verifiedPayload.role !== 'admin') {
          logSecurityIncident(request, 'UNAUTHORIZED_ADMIN_ACCESS', {
            pathname,
            userRole: verifiedPayload.role || 'none',
            userId: verifiedPayload.sub || 'unknown'
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
      const verifiedPayload = payload as VerifiedJWTPayload;
      response.headers.set('x-user-id', verifiedPayload.sub || '');
      response.headers.set('x-user-email', verifiedPayload.email || '');
      response.headers.set('x-user-role', verifiedPayload.role || 'user');
      response.headers.set('x-authenticated', 'true');
      
      // Log successful authentication for monitoring
      if (isDevelopment) {
        console.log(`🔐 Authenticated request: ${verifiedPayload.email || verifiedPayload.sub} -> ${pathname}`);
      }
      
    } catch (error) {
      // Token verification or validation failed
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logSecurityIncident(request, 'JWT_VERIFICATION_ERROR', {
        pathname,
        error: errorMessage,
        hasAccessToken: !!accessToken,
        hasIdToken: !!idToken,
        hasBearerToken: !!bearerToken,
        timestamp: new Date().toISOString()
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