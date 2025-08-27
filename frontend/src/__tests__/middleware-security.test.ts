/**
 * Comprehensive security middleware tests
 */

import { NextRequest } from 'next/server';
import { 
  middleware, 
  getClientIP, 
  checkRateLimit, 
  validateRequest, 
  getCORSHeaders 
} from '../middleware-working';

// Mock crypto.getRandomValues for testing
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  },
  writable: true
});

// Mock atob for JWT parsing
global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');

describe('Security Middleware', () => {
  beforeEach(() => {
    // Clear any existing rate limits
    jest.clearAllMocks();
    // Reset process.env for each test
    process.env.NODE_ENV = 'test';
  });

  describe('getClientIP', () => {
    it('should extract IP from X-Forwarded-For header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1'
        }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.1');
    });

    it('should extract IP from X-Real-IP header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: {
          'x-real-ip': '192.168.1.2'
        }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.2');
    });

    it('should extract IP from CF-Connecting-IP header', () => {
      const request = new NextRequest('http://localhost/test', {
        headers: {
          'cf-connecting-ip': '192.168.1.3'
        }
      });
      
      expect(getClientIP(request)).toBe('192.168.1.3');
    });

    it('should fallback to unknown for missing IP', () => {
      const request = new NextRequest('http://localhost/test');
      expect(getClientIP(request)).toBe('unknown');
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const config = { requests: 5, window: 60000 };
      const result = checkRateLimit('test-key', config);
      
      expect(result.allowed).toBe(true);
      expect(result.resetTime).toBeUndefined();
    });

    it('should deny requests exceeding rate limit', () => {
      const config = { requests: 1, window: 60000 };
      
      // First request should be allowed
      let result = checkRateLimit('test-key-2', config);
      expect(result.allowed).toBe(true);
      
      // Second request should be denied
      result = checkRateLimit('test-key-2', config);
      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeDefined();
    });

    it('should reset rate limit after window expires', async () => {
      const config = { requests: 1, window: 100 }; // 100ms window
      
      // First request
      let result = checkRateLimit('test-key-3', config);
      expect(result.allowed).toBe(true);
      
      // Second request should be denied
      result = checkRateLimit('test-key-3', config);
      expect(result.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Third request should be allowed again
      result = checkRateLimit('test-key-3', config);
      expect(result.allowed).toBe(true);
    });
  });

  describe('Request Validation', () => {
    it('should allow valid requests', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'user-agent': 'Mozilla/5.0 (Test Browser)',
          'content-type': 'application/json'
        }
      });
      
      const result = validateRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should detect SQL injection attempts', () => {
      const request = new NextRequest('http://localhost/api/test?id=1 UNION SELECT * FROM users');
      
      const result = validateRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Suspicious URL pattern detected');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect XSS attempts', () => {
      const request = new NextRequest('http://localhost/api/test?data=<script>alert(1)</script>');
      
      const result = validateRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Suspicious URL pattern detected');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect path traversal attempts', () => {
      const request = new NextRequest('http://localhost/api/test?file=../../../etc/passwd');
      
      const result = validateRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Suspicious URL pattern detected');
      expect(result.riskLevel).toBe('high');
    });

    it('should detect suspicious headers', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'custom-header': '<script>alert(1)</script>'
        }
      });
      
      const result = validateRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Suspicious header content detected');
      expect(result.riskLevel).toBe('high');
    });

    it('should flag suspicious user agents', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'user-agent': 'Bot' // Too short
        }
      });
      
      const result = validateRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.riskLevel).toBe('medium');
    });
  });

  describe('CORS Headers', () => {
    it('should set appropriate CORS headers for API endpoints', () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'origin': 'http://localhost:3000'
        }
      });
      
      const headers = getCORSHeaders(request, 'api');
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Access-Control-Allow-Methods']).toContain('POST');
    });

    it('should set SSE-specific CORS headers', () => {
      const request = new NextRequest('http://localhost/api/sse', {
        headers: {
          'origin': 'http://localhost:3000'
        }
      });
      
      const headers = getCORSHeaders(request, 'sse');
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers['Cache-Control']).toBe('no-cache');
      expect(headers['Connection']).toBe('keep-alive');
      expect(headers['X-Accel-Buffering']).toBe('no');
    });

    it('should not set origin for unauthorized origins in production', () => {
      process.env.NODE_ENV = 'production';
      
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'origin': 'http://malicious-site.com'
        }
      });
      
      const headers = getCORSHeaders(request, 'api');
      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('Middleware Integration', () => {
    it('should skip static assets', async () => {
      const request = new NextRequest('http://localhost/_next/static/css/app.css');
      const response = await middleware(request);
      
      expect(response.status).toBe(200);
    });

    it('should apply rate limiting to API routes', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.100'
        }
      });
      
      // Mock rate limit exceeded
      jest.spyOn(require('../middleware-working'), 'checkRateLimit')
        .mockReturnValue({ allowed: false, resetTime: Date.now() + 60000 });
      
      const response = await middleware(request);
      expect(response.status).toBe(429);
      
      const body = await response.json();
      expect(body.error).toBe('Rate limit exceeded');
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle validation failures', async () => {
      const request = new NextRequest('http://localhost/api/test?id=1 UNION SELECT');
      
      // Mock the validateRequest function to return invalid result
      jest.spyOn(require('../middleware-working'), 'validateRequest')
        .mockReturnValue({
          isValid: false,
          error: 'Suspicious URL pattern detected',
          riskLevel: 'high'
        });
      
      const response = await middleware(request);
      
      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.error).toBe('Request validation failed');
      expect(body.code).toBe('INVALID_REQUEST');
    });

    it('should handle OPTIONS preflight requests', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'OPTIONS',
        headers: {
          'origin': 'http://localhost:3000',
          'access-control-request-method': 'POST'
        }
      });
      
      const response = await middleware(request);
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
    });

    it('should require authentication for protected routes', async () => {
      const request = new NextRequest('http://localhost/dashboard');
      const response = await middleware(request);
      
      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get('location')).toContain('/auth/login');
    });

    it('should allow authenticated requests', async () => {
      // Mock valid JWT payload
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJleHAiOjk5OTk5OTk5OTl9.example';
      
      const request = new NextRequest('http://localhost/dashboard', {
        headers: {
          'cookie': `id_token=${validToken}`
        }
      });
      
      // Mock JWT parsing to return valid payload
      jest.spyOn(require('../middleware-working'), 'parseJWTPayload')
        .mockReturnValue({
          sub: '1234567890',
          email: 'test@example.com', 
          role: 'user',
          exp: 9999999999
        });
      
      const response = await middleware(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('x-authenticated')).toBe('true');
    });
  });

  describe('Security Headers', () => {
    it('should set comprehensive security headers', async () => {
      const request = new NextRequest('http://localhost/dashboard');
      const response = await middleware(request);
      
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy();
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(response.headers.get('X-Security-Processed')).toBe('true');
    });

    it('should include rate limit headers', async () => {
      const request = new NextRequest('http://localhost/api/test');
      const response = await middleware(request);
      
      expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('should set CSP headers for SSE endpoints', async () => {
      const request = new NextRequest('http://localhost/api/sse');
      const response = await middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toContain('connect-src');
      expect(csp).toContain('agent_network_sse');
    });
  });
});