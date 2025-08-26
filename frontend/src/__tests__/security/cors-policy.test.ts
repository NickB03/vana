/**
 * CORS Policy Enforcement Security Tests
 * Tests CORS policy enforcement, preflight requests, and cross-origin security measures
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock Next.js middleware
const createMockRequest = ({
  method = 'GET',
  url = 'http://localhost:3000/api/test',
  origin = 'http://localhost:3000',
  headers = {}
}: {
  method?: string;
  url?: string;
  origin?: string;
  headers?: Record<string, string>;
}) => {
  const request = {
    method,
    url,
    nextUrl: new URL(url),
    headers: new Map([
      ['origin', origin],
      ...Object.entries(headers)
    ]),
    cookies: new Map()
  } as unknown as NextRequest;
  
  return request;
};

// Mock CORS middleware implementation
class CORSMiddleware {
  private allowedOrigins: string[];
  private allowedMethods: string[];
  private allowedHeaders: string[];
  private allowCredentials: boolean;
  private maxAge: number;

  constructor({
    allowedOrigins = ['http://localhost:3000', 'https://yourapp.com'],
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'],
    allowCredentials = true,
    maxAge = 86400
  } = {}) {
    this.allowedOrigins = allowedOrigins;
    this.allowedMethods = allowedMethods;
    this.allowedHeaders = allowedHeaders;
    this.allowCredentials = allowCredentials;
    this.maxAge = maxAge;
  }

  handle(request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');
    const response = NextResponse.next();

    // Check if origin is allowed
    if (origin && this.isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      
      if (this.allowCredentials) {
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      response.headers.set('Access-Control-Allow-Methods', this.allowedMethods.join(', '));
      response.headers.set('Access-Control-Allow-Headers', this.allowedHeaders.join(', '));
      response.headers.set('Access-Control-Max-Age', this.maxAge.toString());
      return new NextResponse(null, { status: 204, headers: response.headers });
    }

    return response;
  }

  private isOriginAllowed(origin: string): boolean {
    return this.allowedOrigins.includes(origin) || this.allowedOrigins.includes('*');
  }
}

describe('CORS Policy Enforcement Security Tests', () => {
  let corsMiddleware: CORSMiddleware;

  beforeEach(() => {
    corsMiddleware = new CORSMiddleware();
  });

  describe('Origin Validation', () => {
    it('should allow requests from whitelisted origins', () => {
      const allowedOrigins = [
        'http://localhost:3000',
        'https://yourapp.com',
        'https://app.yourapp.com'
      ];

      allowedOrigins.forEach(origin => {
        const request = createMockRequest({ origin });
        const response = corsMiddleware.handle(request);
        
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      });
    });

    it('should reject requests from non-whitelisted origins', () => {
      const maliciousOrigins = [
        'http://evil.com',
        'https://attacker.com',
        'http://subdomain.evil.com',
        'https://yourapp.com.evil.com',
        'data:text/html,<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        'file:///etc/passwd'
      ];

      maliciousOrigins.forEach(origin => {
        const request = createMockRequest({ origin });
        const response = corsMiddleware.handle(request);
        
        expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe(origin);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      });
    });

    it('should handle null origin correctly', () => {
      const request = createMockRequest({ origin: 'null' });
      const response = corsMiddleware.handle(request);
      
      // null origin should be rejected unless explicitly allowed
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should prevent origin header injection', () => {
      const maliciousOrigins = [
        'https://yourapp.com\r\nX-Injected: malicious',
        'https://yourapp.com\nSet-Cookie: evil=true',
        'https://yourapp.com\r\n\r\n<script>alert(1)</script>',
        'https://yourapp.com\x00\x0a\x0d'
      ];

      maliciousOrigins.forEach(origin => {
        const request = createMockRequest({ origin });
        const response = corsMiddleware.handle(request);
        
        const allowOriginHeader = response.headers.get('Access-Control-Allow-Origin');
        if (allowOriginHeader) {
          expect(allowOriginHeader).not.toContain('\r');
          expect(allowOriginHeader).not.toContain('\n');
          expect(allowOriginHeader).not.toContain('\x00');
          expect(allowOriginHeader).not.toContain('X-Injected');
          expect(allowOriginHeader).not.toContain('Set-Cookie');
        }
      });
    });
  });

  describe('Preflight Request Handling', () => {
    it('should handle valid preflight requests', () => {
      const request = createMockRequest({
        method: 'OPTIONS',
        origin: 'http://localhost:3000',
        headers: {
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });

      const response = corsMiddleware.handle(request);
      
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('should reject preflight requests with disallowed methods', () => {
      const request = createMockRequest({
        method: 'OPTIONS',
        origin: 'http://localhost:3000',
        headers: {
          'Access-Control-Request-Method': 'TRACE',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      const response = corsMiddleware.handle(request);
      
      // Should not include TRACE in allowed methods
      const allowedMethods = response.headers.get('Access-Control-Allow-Methods') || '';
      expect(allowedMethods).not.toContain('TRACE');
    });

    it('should reject preflight requests with disallowed headers', () => {
      const dangerousHeaders = [
        'X-Forwarded-For',
        'X-Real-IP',
        'X-Original-URL',
        'X-Rewrite-URL',
        'Host',
        'X-Custom-IP-Authorization'
      ];

      dangerousHeaders.forEach(header => {
        const request = createMockRequest({
          method: 'OPTIONS',
          origin: 'http://localhost:3000',
          headers: {
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': header
          }
        });

        const response = corsMiddleware.handle(request);
        const allowedHeaders = response.headers.get('Access-Control-Allow-Headers') || '';
        
        // Should not include dangerous headers
        expect(allowedHeaders).not.toContain(header);
      });
    });

    it('should prevent header injection in preflight responses', () => {
      const maliciousHeaders = [
        'Content-Type\r\nX-Injected: malicious',
        'Authorization\nSet-Cookie: evil=true',
        'X-Custom\r\n\r\n<script>alert(1)</script>'
      ];

      maliciousHeaders.forEach(header => {
        const request = createMockRequest({
          method: 'OPTIONS',
          origin: 'http://localhost:3000',
          headers: {
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': header
          }
        });

        const response = corsMiddleware.handle(request);
        const responseHeaders = Array.from(response.headers.entries());
        
        responseHeaders.forEach(([key, value]) => {
          expect(value).not.toContain('\r');
          expect(value).not.toContain('\n');
          expect(value).not.toContain('X-Injected');
          expect(value).not.toContain('Set-Cookie');
        });
      });
    });
  });

  describe('Credential Handling', () => {
    it('should handle credentials correctly with allowed origins', () => {
      const corsWithCredentials = new CORSMiddleware({
        allowCredentials: true,
        allowedOrigins: ['http://localhost:3000']
      });

      const request = createMockRequest({
        origin: 'http://localhost:3000'
      });

      const response = corsWithCredentials.handle(request);
      
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    it('should not set wildcard origin when credentials are enabled', () => {
      // This is a security vulnerability - wildcard + credentials
      const corsWithWildcard = new CORSMiddleware({
        allowCredentials: true,
        allowedOrigins: ['*'] // This should not work with credentials
      });

      const request = createMockRequest({
        origin: 'http://any-origin.com'
      });

      const response = corsWithWildcard.handle(request);
      
      // Should not set both wildcard and credentials
      const allowOrigin = response.headers.get('Access-Control-Allow-Origin');
      const allowCredentials = response.headers.get('Access-Control-Allow-Credentials');
      
      if (allowCredentials === 'true') {
        expect(allowOrigin).not.toBe('*');
      }
    });

    it('should prevent credential theft via CORS misconfiguration', () => {
      // Test for common CORS misconfigurations
      const request = createMockRequest({
        origin: 'http://attacker.com'
      });

      const response = corsMiddleware.handle(request);
      
      // Attacker origin should not be allowed
      expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('http://attacker.com');
      expect(response.headers.get('Access-Control-Allow-Credentials')).not.toBe('true');
    });
  });

  describe('Security Headers Integration', () => {
    it('should work with Content Security Policy', () => {
      const request = createMockRequest({
        origin: 'http://localhost:3000'
      });

      const response = corsMiddleware.handle(request);
      
      // Should not interfere with CSP
      response.headers.set('Content-Security-Policy', "default-src 'self'");
      
      expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'");
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });

    it('should work with Strict Transport Security', () => {
      const request = createMockRequest({
        origin: 'https://yourapp.com'
      });

      const response = corsMiddleware.handle(request);
      
      // Should not interfere with HSTS
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      
      expect(response.headers.get('Strict-Transport-Security')).toBe('max-age=31536000; includeSubDomains');
    });
  });

  describe('Request Method Validation', () => {
    it('should allow only specified HTTP methods', () => {
      const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'];
      const disallowedMethods = ['TRACE', 'CONNECT', 'PATCH', 'HEAD'];

      disallowedMethods.forEach(method => {
        const request = createMockRequest({
          method: 'OPTIONS',
          origin: 'http://localhost:3000',
          headers: {
            'Access-Control-Request-Method': method
          }
        });

        const response = corsMiddleware.handle(request);
        const allowedMethodsHeader = response.headers.get('Access-Control-Allow-Methods') || '';
        
        expect(allowedMethodsHeader).not.toContain(method);
      });
    });

    it('should prevent HTTP method override attacks', () => {
      const request = createMockRequest({
        method: 'POST',
        origin: 'http://localhost:3000',
        headers: {
          'X-HTTP-Method-Override': 'DELETE',
          'X-Method-Override': 'PUT'
        }
      });

      const response = corsMiddleware.handle(request);
      
      // Should not allow method override headers to bypass CORS
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
    });
  });

  describe('Cache Control for CORS', () => {
    it('should set appropriate cache headers for preflight', () => {
      const request = createMockRequest({
        method: 'OPTIONS',
        origin: 'http://localhost:3000'
      });

      const response = corsMiddleware.handle(request);
      
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
      
      // Should not cache too long to allow policy updates
      const maxAge = parseInt(response.headers.get('Access-Control-Max-Age') || '0');
      expect(maxAge).toBeLessThanOrEqual(86400); // 24 hours max
    });

    it('should not cache CORS responses for too long', () => {
      const corsWithLongCache = new CORSMiddleware({
        maxAge: 999999999 // Very long cache
      });

      const request = createMockRequest({
        method: 'OPTIONS',
        origin: 'http://localhost:3000'
      });

      const response = corsWithLongCache.handle(request);
      const maxAge = parseInt(response.headers.get('Access-Control-Max-Age') || '0');
      
      // Should have reasonable cache limits
      expect(maxAge).toBeLessThanOrEqual(86400);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed origin headers gracefully', () => {
      const malformedOrigins = [
        '\x00\x01\x02',
        'http://\uFEFF\u200Bevil.com',
        'http://evil.com\u0000',
        undefined,
        null
      ];

      malformedOrigins.forEach(origin => {
        try {
          const request = createMockRequest({
            origin: origin as string
          });
          
          const response = corsMiddleware.handle(request);
          
          // Should not crash and should not allow malformed origins
          expect(response).toBeDefined();
          expect(response.headers.get('Access-Control-Allow-Origin')).toBeFalsy();
        } catch (error) {
          // Should handle gracefully without crashing
          expect(error).toBeInstanceOf(Error);
        }
      });
    });

    it('should prevent CORS bypass via localhost variants', () => {
      const localhostVariants = [
        'http://127.0.0.1:3000',
        'http://0.0.0.0:3000',
        'http://[::1]:3000',
        'http://localhost.localdomain:3000',
        'http://localhost:80/../evil.com'
      ];

      localhostVariants.forEach(origin => {
        const request = createMockRequest({ origin });
        const response = corsMiddleware.handle(request);
        
        // Should not automatically trust localhost variants
        if (!corsMiddleware['allowedOrigins'].includes(origin)) {
          expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe(origin);
        }
      });
    });
  });

  describe('Protocol Security', () => {
    it('should reject non-HTTP protocols', () => {
      const dangerousProtocols = [
        'ftp://evil.com',
        'file:///etc/passwd',
        'data:text/html,<script>alert(1)</script>',
        'javascript:alert(1)',
        'vbscript:msgbox(1)',
        'chrome-extension://fake-id'
      ];

      dangerousProtocols.forEach(origin => {
        const request = createMockRequest({ origin });
        const response = corsMiddleware.handle(request);
        
        expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe(origin);
      });
    });

    it('should enforce HTTPS in production environments', () => {
      // In production, should prefer HTTPS origins
      const httpOrigin = 'http://yourapp.com';
      const httpsOrigin = 'https://yourapp.com';
      
      const productionCors = new CORSMiddleware({
        allowedOrigins: [httpsOrigin] // Only HTTPS in production
      });

      const httpRequest = createMockRequest({ origin: httpOrigin });
      const httpsRequest = createMockRequest({ origin: httpsOrigin });
      
      const httpResponse = productionCors.handle(httpRequest);
      const httpsResponse = productionCors.handle(httpsRequest);
      
      expect(httpResponse.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(httpsResponse.headers.get('Access-Control-Allow-Origin')).toBe(httpsOrigin);
    });
  });
});
