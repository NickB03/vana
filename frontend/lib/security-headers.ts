/**
 * Security Headers Configuration
 * Environment-driven CSP policy to prevent XSS attacks
 * 
 * CRITICAL SECURITY FIX:
 * - Production: NO unsafe-inline, NO unsafe-eval (strict CSP)
 * - Development: Allow unsafe directives only for HMR and dev tools
 */

import * as crypto from 'crypto';

interface SecurityHeader {
  key: string;
  value: string;
}

interface HeaderRule {
  source: string;
  headers: SecurityHeader[];
}

/**
 * Generate cryptographically secure nonce for inline scripts
 * Used only in production with strict CSP
 */
export function generateCSPNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Environment-specific Content Security Policy configuration
 * Implements strict security in production while maintaining dev workflow
 */
function getContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === 'development';
  const isProd = process.env.NODE_ENV === 'production';
  
  // Base CSP directives for all environments
  const baseDirectives = [
    "default-src 'self'",
    "font-src 'self' fonts.gstatic.com data:",
    "img-src 'self' data: blob: *.githubusercontent.com",
    "frame-src 'none'",
    "object-src 'none'", 
    "base-uri 'self'",
    "form-action 'self'"
  ];

  if (isDev) {
    // Development: Allow unsafe directives for hot reload and dev tools
    console.log('🔓 [CSP Dev Mode] Allowing unsafe directives for development');
    
    return [
      ...baseDirectives,
      // Dev only: Allow eval for HMR, webpack dev tools
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval'",
      // Dev only: Allow inline styles for HMR
      "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
      // Dev: Local servers and API endpoints
      "connect-src 'self' localhost:* ws://localhost:* wss://localhost:* *.googleapis.com *.google.com *.openrouter.ai *.anthropic.com"
    ].join('; ');
  } 
  
  if (isProd) {
    // Production: STRICT CSP - NO unsafe directives
    console.log('🔒 [CSP Prod Mode] Enforcing strict CSP policy - NO unsafe directives');
    
    return [
      ...baseDirectives,
      // Prod: NO unsafe-inline/eval - use nonces/hashes only
      "script-src 'self' 'strict-dynamic'",
      // Prod: NO unsafe-inline styles - external stylesheets only  
      "style-src 'self' fonts.googleapis.com",
      // Prod: HTTPS-only connections
      "connect-src 'self' https: wss:",
      // Prod: Force HTTPS upgrade
      "upgrade-insecure-requests",
      // Prod: Prevent mixed content
      "block-all-mixed-content"
    ].join('; ');
  }

  // Fallback: Default to strict policy
  return [
    ...baseDirectives,
    "script-src 'self'",
    "style-src 'self'",
    "connect-src 'self'"
  ].join('; ');
}

/**
 * Comprehensive security headers for all environments
 * Implements defense-in-depth security strategy
 */
export function createSecureHeaders(): HeaderRule[] {
  const isProd = process.env.NODE_ENV === 'production';
  
  return [
    {
      // Apply security headers to all routes
      source: '/(.*)',
      headers: [
        // Content Security Policy - Environment-driven strict policy
        {
          key: 'Content-Security-Policy',
          value: getContentSecurityPolicy()
        },
        
        // Prevent clickjacking attacks
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        
        // Prevent MIME type sniffing
        {
          key: 'X-Content-Type-Options', 
          value: 'nosniff'
        },
        
        // XSS Protection (legacy but still useful)
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        
        // Referrer Policy - Protect sensitive URLs
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        
        // Permissions Policy - Restrict dangerous APIs
        {
          key: 'Permissions-Policy',
          value: [
            'camera=()',
            'microphone=()',
            'geolocation=()',
            'interest-cohort=()',
            'browsing-topics=()',
            'payment=()',
            'usb=()',
            'serial=()',
            'bluetooth=()'
          ].join(', ')
        },
        
        // Cross-Origin Embedder Policy (enhanced security)
        {
          key: 'Cross-Origin-Embedder-Policy',
          value: 'require-corp'
        },
        
        // Cross-Origin Opener Policy 
        {
          key: 'Cross-Origin-Opener-Policy',
          value: 'same-origin'
        },
        
        // Cross-Origin Resource Policy
        {
          key: 'Cross-Origin-Resource-Policy',
          value: 'same-origin'
        },
        
        // Strict Transport Security (HTTPS only in production)
        ...(isProd ? [{
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload'
        }] : [])
      ]
    },
    
    // API Routes - Additional security for API endpoints  
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'no-cache, no-store, must-revalidate, private'
        },
        {
          key: 'Pragma', 
          value: 'no-cache'
        },
        {
          key: 'Expires',
          value: '0'
        },
        {
          key: 'X-Robots-Tag',
          value: 'noindex, nofollow'
        }
      ]
    }
  ];
}

/**
 * Validate CSP policy configuration
 * Returns validation results for security testing
 */
export function validateCSPConfiguration(): {
  isValid: boolean;
  environment: string;
  hasUnsafeDirectives: boolean;
  warnings: string[];
  recommendations: string[];
} {
  const csp = getContentSecurityPolicy();
  const isDev = process.env.NODE_ENV === 'development';
  
  const hasUnsafeInline = csp.includes("'unsafe-inline'");
  const hasUnsafeEval = csp.includes("'unsafe-eval'");
  const hasUnsafeDirectives = hasUnsafeInline || hasUnsafeEval;
  
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  if (hasUnsafeDirectives && !isDev) {
    warnings.push('CRITICAL: unsafe directives found in non-development environment');
    recommendations.push('Remove all unsafe-* directives from production CSP');
  }
  
  if (!csp.includes('strict-dynamic') && !isDev) {
    recommendations.push('Consider using strict-dynamic for better script security');
  }
  
  return {
    isValid: !hasUnsafeDirectives || isDev,
    environment: process.env.NODE_ENV || 'unknown',
    hasUnsafeDirectives,
    warnings,
    recommendations
  };
}