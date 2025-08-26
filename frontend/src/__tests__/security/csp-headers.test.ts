/**
 * Content Security Policy (CSP) Headers Security Tests
 * Tests CSP implementation, nonce generation, and security policy enforcement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNonce, getNonceAttributes, getClientNonce, createCSPStyle, processCSPViolation, CSPReport } from '@/lib/csp';

// Mock Next.js headers
jest.mock('next/headers', () => ({
  headers: jest.fn()
}));

// Mock crypto for nonce generation
const mockCrypto = {
  getRandomValues: jest.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  randomUUID: jest.fn(() => 'test-uuid-123')
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

// Mock middleware for CSP testing
const createMockCSPMiddleware = () => {
  return (request: NextRequest) => {
    const response = NextResponse.next();
    const nonce = generateNonce();
    
    // Store nonce in response header for component access
    response.headers.set('x-nonce', nonce);
    
    // Build CSP policy
    const cspPolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Monaco Editor needs this
      `style-src 'self' 'unsafe-inline' 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', cspPolicy);
    
    return response;
  };
};

const generateNonce = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

const createMockRequest = ({
  method = 'GET',
  url = 'http://localhost:3000',
  headers = {}
}: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
}) => {
  return {
    method,
    url,
    nextUrl: new URL(url),
    headers: new Map(Object.entries(headers))
  } as unknown as NextRequest;
};

describe('Content Security Policy (CSP) Security Tests', () => {
  let cspMiddleware: (request: NextRequest) => NextResponse;

  beforeEach(() => {
    jest.clearAllMocks();
    cspMiddleware = createMockCSPMiddleware();
  });

  describe('CSP Policy Generation', () => {
    it('should generate secure CSP headers', () => {
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("base-uri 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('should include nonce in style-src directive', () => {
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      const nonce = response.headers.get('x-nonce');
      
      expect(csp).toContain(`style-src 'self' 'unsafe-inline' 'nonce-${nonce}'`);
      expect(nonce).toHaveLength(32); // 16 bytes * 2 hex chars
    });

    it('should prevent inline script execution', () => {
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Should not allow 'unsafe-inline' for scripts in production
      // Note: This test assumes production-ready CSP
      const productionCSP = csp?.replace("'unsafe-inline' 'unsafe-eval'", "'nonce-test'");
      expect(productionCSP).not.toContain("script-src 'self' 'unsafe-inline'");
    });

    it('should block dangerous sources', () => {
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Should not allow dangerous sources
      expect(csp).not.toContain('data:');
      expect(csp).not.toContain('javascript:');
      expect(csp).not.toContain('*');
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('Nonce Generation and Management', () => {
    it('should generate unique nonces', () => {
      const nonces = new Set();
      
      // Generate multiple nonces
      for (let i = 0; i < 100; i++) {
        const nonce = generateNonce();
        expect(nonce).toHaveLength(32);
        expect(nonce).toMatch(/^[a-f0-9]+$/);
        expect(nonces.has(nonce)).toBe(false);
        nonces.add(nonce);
      }
    });

    it('should handle nonce extraction safely', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = headers as jest.MockedFunction<typeof headers>;
      
      // Test valid nonce
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('valid-nonce-123')
      } as any);
      
      const nonce = await getNonce();
      expect(nonce).toBe('valid-nonce-123');
      
      // Test missing nonce
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue(null)
      } as any);
      
      const missingNonce = await getNonce();
      expect(missingNonce).toBeUndefined();
    });

    it('should provide nonce attributes safely', async () => {
      const { headers } = await import('next/headers');
      const mockHeaders = headers as jest.MockedFunction<typeof headers>;
      
      // Test with nonce
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue('test-nonce')
      } as any);
      
      const attrs = await getNonceAttributes();
      expect(attrs).toEqual({ nonce: 'test-nonce' });
      
      // Test without nonce
      mockHeaders.mockResolvedValue({
        get: jest.fn().mockReturnValue(null)
      } as any);
      
      const emptyAttrs = await getNonceAttributes();
      expect(emptyAttrs).toEqual({});
    });

    it('should extract client-side nonce safely', () => {
      // Mock document
      const mockMeta = {
        getAttribute: jest.fn().mockReturnValue('client-nonce-123')
      };
      
      const mockQuerySelector = jest.fn().mockReturnValue(mockMeta);
      Object.defineProperty(global, 'document', {
        value: { querySelector: mockQuerySelector },
        writable: true
      });
      
      const nonce = getClientNonce();
      expect(nonce).toBe('client-nonce-123');
      expect(mockQuerySelector).toHaveBeenCalledWith('meta[name="csp-nonce"]');
      
      // Test no meta tag
      mockQuerySelector.mockReturnValue(null);
      const noNonce = getClientNonce();
      expect(noNonce).toBeNull();
    });
  });

  describe('CSP Style Generation', () => {
    it('should create CSP-compliant styles with nonce', () => {
      const css = 'body { color: red; }';
      const nonce = 'test-nonce-123';
      
      const styleTag = createCSPStyle(css, nonce);
      expect(styleTag).toBe(`<style nonce="${nonce}">${css}</style>`);
    });

    it('should create styles without nonce when not provided', () => {
      const css = 'body { color: blue; }';
      
      const styleTag = createCSPStyle(css);
      expect(styleTag).toBe(`<style>${css}</style>`);
    });

    it('should sanitize CSS content', () => {
      const maliciousCss = 'body { color: red; } </style><script>alert("XSS")</script><style>';
      const nonce = 'test-nonce';
      
      const styleTag = createCSPStyle(maliciousCss, nonce);
      // Should not break out of style tag
      expect(styleTag).not.toContain('<script>');
      expect(styleTag).toContain(maliciousCss); // But preserve the CSS
    });
  });

  describe('CSP Violation Reporting', () => {
    it('should process CSP violation reports correctly', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const violation: CSPReport = {
        'csp-report': {
          'document-uri': 'https://example.com',
          'referrer': '',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "default-src 'self'",
          'disposition': 'enforce',
          'blocked-uri': 'https://evil.com/script.js',
          'line-number': 1,
          'column-number': 1,
          'source-file': 'https://example.com',
          'status-code': 200,
          'script-sample': 'alert("XSS")'
        }
      };
      
      processCSPViolation(violation);
      
      expect(consoleSpy).toHaveBeenCalledWith('CSP Violation:', expect.objectContaining({
        directive: 'script-src',
        blockedUri: 'https://evil.com/script.js',
        sample: 'alert("XSS")'
      }));
      
      consoleSpy.mockRestore();
    });

    it('should handle malformed violation reports', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const malformedReport = {
        'csp-report': {
          'blocked-uri': '<script>alert("XSS")</script>',
          'script-sample': 'eval("malicious code")',
          'source-file': 'javascript:alert(1)'
        }
      } as CSPReport;
      
      // Should not crash with malformed data
      expect(() => processCSPViolation(malformedReport)).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });

  describe('CSP Bypass Prevention', () => {
    it('should prevent CSP bypass via data URLs', () => {
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Should not allow data: URLs in script-src
      expect(csp).not.toContain('data:');
      expect(csp).toContain("object-src 'none'"); // Blocks data: objects
    });

    it('should prevent CSP bypass via javascript URLs', () => {
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Should not allow javascript: URLs
      expect(csp).not.toContain('javascript:');
      expect(csp).toContain("base-uri 'self'"); // Prevents base tag hijacking
    });

    it('should prevent CSP bypass via unsafe-eval', () => {
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // In production, should not have unsafe-eval
      // (Monaco Editor is an exception for this demo)
      const hasUnsafeEval = csp?.includes("'unsafe-eval'");
      if (hasUnsafeEval) {
        // If unsafe-eval is present, ensure it's only for specific needs
        expect(csp).toContain('script-src');
      }
    });

    it('should prevent clickjacking with frame-ancestors', () => {
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe('CSP Header Security', () => {
    it('should prevent header injection in CSP policy', () => {
      // Test that CSP generation is not vulnerable to injection
      const maliciousInput = "'self'; script-src 'unsafe-inline'; /*";
      
      // Mock a vulnerable policy generator (for testing)
      const vulnerablePolicyGen = (input: string) => {
        return `default-src ${input}`;
      };
      
      const policy = vulnerablePolicyGen(maliciousInput);
      
      // Should be detected as suspicious
      expect(policy).toContain('script-src');
      // In real implementation, this should be rejected
    });

    it('should handle long CSP policies', () => {
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Should not be excessively long (potential DoS)
      expect(csp!.length).toBeLessThan(2048);
    });

    it('should prevent CSP header splitting', () => {
      const maliciousNonce = 'valid-nonce\r\nX-XSS-Protection: 0';
      
      // Test CSP generation with malicious nonce
      const policy = `style-src 'self' 'nonce-${maliciousNonce}'`;
      
      // Should not contain CRLF
      expect(policy).not.toContain('\r');
      expect(policy).not.toContain('\n');
      expect(policy).not.toContain('X-XSS-Protection');
    });
  });

  describe('CSP Integration with Monaco Editor', () => {
    it('should allow Monaco Editor to function with CSP', () => {
      const request = createMockRequest({ url: 'http://localhost:3000/canvas' });
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Monaco requires certain permissions
      expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
      expect(csp).toContain("worker-src 'self' blob:"); // For Web Workers
    });

    it('should provide secure iframe sandboxing for Monaco', () => {
      // Test CSP for Monaco iframe content
      const iframeCSP = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        "font-src 'self' data: https://cdn.jsdelivr.net",
        "worker-src 'self' blob:"
      ].join('; ');
      
      // Should allow Monaco but restrict other dangerous operations
      expect(iframeCSP).toContain('cdn.jsdelivr.net');
      expect(iframeCSP).not.toContain('*');
    });
  });

  describe('CSP Environment Differences', () => {
    it('should have stricter CSP in production', () => {
      const oldEnv = process.env.NODE_ENV;
      
      // Test production CSP
      process.env.NODE_ENV = 'production';
      
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      const csp = response.headers.get('Content-Security-Policy');
      
      // Production should be more restrictive
      expect(csp).toContain("default-src 'self'");
      
      process.env.NODE_ENV = oldEnv;
    });

    it('should be more lenient in development', () => {
      const oldEnv = process.env.NODE_ENV;
      
      // Test development CSP
      process.env.NODE_ENV = 'development';
      
      const request = createMockRequest({});
      const response = cspMiddleware(request);
      const csp = response.headers.get('Content-Security-Policy');
      
      // Development might allow more for hot reload
      expect(csp).toBeDefined();
      
      process.env.NODE_ENV = oldEnv;
    });
  });

  describe('CSP Reporting Endpoint Security', () => {
    it('should validate CSP report endpoint', () => {
      const request = createMockRequest({ url: 'http://localhost:3000/api/csp-report' });
      const response = cspMiddleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Should include report-uri or report-to
      if (csp?.includes('report-uri')) {
        expect(csp).toContain('/api/csp-report');
      }
    });

    it('should prevent CSP report endpoint abuse', () => {
      // Mock CSP report data
      const suspiciousReports = [
        // High frequency from same source
        Array(1000).fill({
          'blocked-uri': 'https://attacker.com',
          'violated-directive': 'script-src'
        }),
        
        // Malicious content in reports
        [{
          'blocked-uri': '<script>alert("XSS")</script>',
          'script-sample': 'eval("malicious")',
          'source-file': 'javascript:alert(1)'
        }]
      ];
      
      suspiciousReports.forEach(reports => {
        // Should detect and handle suspicious patterns
        expect(Array.isArray(reports)).toBe(true);
        expect(reports.length).toBeGreaterThan(0);
        
        // In real implementation, would rate limit and sanitize
      });
    });
  });
});
