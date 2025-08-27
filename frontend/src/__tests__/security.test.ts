/**
 * Comprehensive Security Testing Suite
 * Tests XSS protection, input validation, sanitization, and security utilities
 */

import { describe, test, expect, beforeEach, afterEach, vi } from '@jest/globals';
import { 
  sanitizeHtml, 
  sanitizeText, 
  sanitizeCode,
  containsMaliciousPatterns,
  isAllowedFileType,
  isValidUuid,
  setInnerHTMLSafely,
  setTextContentSafely,
  createSafeElement,
  sanitizeUrl,
  isSafeExternalUrl,
  isRateLimited,
  generateCSRFToken,
  isValidCSRFToken,
  chatMessageSchema,
  sseEventSchema,
  jwtTokenSchema,
  logSecurityViolation
} from '@/lib/security';

import {
  processCSPViolation,
  getNonce,
  addInlineScript,
  loadExternalScript,
  validateCSPDirective,
  buildCSPHeader,
  hasCSPEnabled
} from '@/lib/csp';

import {
  getCORSConfig,
  isOriginAllowed,
  generateCORSHeaders,
  handleSSECORS,
  createCORSAwareFetch,
  validateCORSHeaders
} from '@/lib/cors';

import {
  decodeJWT,
  validateJWTPayload,
  validateAccessToken,
  generateSecureToken,
  hashString,
  verifyHash,
  timingSafeEqual
} from '@/lib/auth-security';

// Mock DOM environment
const mockDocument = {
  createElement: vi.fn(),
  querySelector: vi.fn(),
  head: { appendChild: vi.fn() },
  body: { appendChild: vi.fn() }
};

const mockWindow = {
  location: { origin: 'https://test.example.com', href: 'https://test.example.com/test' },
  crypto: { getRandomValues: vi.fn() }
};

// @ts-ignore
global.document = mockDocument;
// @ts-ignore
global.window = mockWindow;

describe('Security Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('XSS Protection', () => {
    test('should sanitize basic HTML properly', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    test('should remove dangerous script tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toContain('<p>Safe content</p>');
    });

    test('should remove event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('alert');
    });

    test('should sanitize dangerous URLs', () => {
      const input = '<a href="javascript:alert(1)">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    test('should handle malformed HTML gracefully', () => {
      const input = '<script><script>alert(1)</script></script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    test('should strip all HTML from text sanitization', () => {
      const input = '<p>Text with <script>alert(1)</script> content</p>';
      const result = sanitizeText(input);
      expect(result).toBe('Text with  content');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<script>');
    });

    test('should preserve code formatting in code sanitization', () => {
      const input = '<pre><code class="language-js">const x = 1;</code></pre>';
      const result = sanitizeCode(input);
      expect(result).toContain('<pre>');
      expect(result).toContain('<code');
      expect(result).toContain('const x = 1;');
    });

    test('should remove scripts from code blocks', () => {
      const input = '<code>const x = 1;<script>alert(1)</script></code>';
      const result = sanitizeCode(input);
      expect(result).toContain('const x = 1;');
      expect(result).not.toContain('<script>');
    });
  });

  describe('Malicious Pattern Detection', () => {
    test('should detect script injection patterns', () => {
      const maliciousInputs = [
        '<script>alert(1)</script>',
        'javascript:alert(1)',
        'onload=alert(1)',
        'eval(maliciousCode)',
        'data:text/html,<script>alert(1)</script>'
      ];

      maliciousInputs.forEach(input => {
        expect(containsMaliciousPatterns(input)).toBe(true);
      });
    });

    test('should not flag safe content', () => {
      const safeInputs = [
        'Hello world',
        '<p>Safe HTML content</p>',
        'https://example.com/image.png',
        'function normalFunction() { return true; }',
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
      ];

      safeInputs.forEach(input => {
        expect(containsMaliciousPatterns(input)).toBe(false);
      });
    });

    test('should detect SQL injection patterns', () => {
      const sqlInjectionInputs = [
        "'; DROP TABLE users; --",
        "' OR 1=1 --",
        "' UNION SELECT * FROM users --"
      ];

      sqlInjectionInputs.forEach(input => {
        expect(containsMaliciousPatterns(input)).toBe(true);
      });
    });

    test('should detect path traversal patterns', () => {
      const pathTraversalInputs = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '....//....//etc/passwd'
      ];

      pathTraversalInputs.forEach(input => {
        expect(containsMaliciousPatterns(input)).toBe(true);
      });
    });
  });

  describe('Input Validation', () => {
    test('should validate chat messages correctly', () => {
      const validMessage = {
        content: 'Hello, this is a valid message',
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        files: [{
          name: 'test.txt',
          size: 1024,
          type: 'text/plain'
        }]
      };

      const result = chatMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    test('should reject messages with malicious content', () => {
      const maliciousMessage = {
        content: '<script>alert("xss")</script>',
        sessionId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = chatMessageSchema.safeParse(maliciousMessage);
      expect(result.success).toBe(false);
    });

    test('should reject messages that are too long', () => {
      const longMessage = {
        content: 'a'.repeat(10000),
        sessionId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = chatMessageSchema.safeParse(longMessage);
      expect(result.success).toBe(false);
    });

    test('should validate SSE events correctly', () => {
      const validEvent = {
        type: 'agent_response_chunk',
        data: { content: 'Hello' },
        id: 'event-123',
        timestamp: new Date().toISOString()
      };

      const result = sseEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    test('should reject invalid SSE event types', () => {
      const invalidEvent = {
        type: 'invalid_event_type',
        data: { content: 'Hello' }
      };

      const result = sseEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    test('should validate JWT tokens correctly', () => {
      const validToken = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
        role: 'user'
      };

      const result = jwtTokenSchema.safeParse(validToken);
      expect(result.success).toBe(true);
    });

    test('should reject JWT tokens with invalid email', () => {
      const invalidToken = {
        sub: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      const result = jwtTokenSchema.safeParse(invalidToken);
      expect(result.success).toBe(false);
    });
  });

  describe('File Type Validation', () => {
    test('should allow safe file types', () => {
      const safeTypes = [
        'image/png',
        'image/jpeg',
        'text/plain',
        'application/json',
        'application/pdf'
      ];

      safeTypes.forEach(type => {
        expect(isAllowedFileType(type)).toBe(true);
      });
    });

    test('should reject dangerous file types', () => {
      const dangerousTypes = [
        'application/x-executable',
        'application/javascript',
        'text/html',
        'application/x-msdownload'
      ];

      dangerousTypes.forEach(type => {
        expect(isAllowedFileType(type)).toBe(false);
      });
    });
  });

  describe('UUID Validation', () => {
    test('should validate correct UUIDs', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUuids.forEach(uuid => {
        expect(isValidUuid(uuid)).toBe(true);
      });
    });

    test('should reject invalid UUIDs', () => {
      const invalidUuids = [
        '123e4567-e89b-12d3-a456-42661417400',
        'not-a-uuid',
        '123e4567e89b12d3a456426614174000',
        ''
      ];

      invalidUuids.forEach(uuid => {
        expect(isValidUuid(uuid)).toBe(false);
      });
    });
  });

  describe('URL Sanitization', () => {
    test('should sanitize valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'mailto:test@example.com',
        'tel:+1234567890'
      ];

      validUrls.forEach(url => {
        const result = sanitizeUrl(url);
        expect(result).toBeTruthy();
        expect(result).toMatch(/^(https?|mailto|tel):/);
      });
    });

    test('should reject dangerous URLs', () => {
      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox("xss")',
        'file:///etc/passwd'
      ];

      dangerousUrls.forEach(url => {
        expect(sanitizeUrl(url)).toBeNull();
      });
    });

    test('should validate safe external URLs', () => {
      const safeUrls = [
        'https://example.com',
        'https://github.com/user/repo'
      ];

      safeUrls.forEach(url => {
        expect(isSafeExternalUrl(url)).toBe(true);
      });
    });

    test('should reject unsafe external URLs', () => {
      const unsafeUrls = [
        'http://example.com', // Not HTTPS
        'https://malicious.tk', // Suspicious TLD
        'https://spam.ml'
      ];

      unsafeUrls.forEach(url => {
        expect(isSafeExternalUrl(url)).toBe(false);
      });
    });
  });

  describe('Rate Limiting', () => {
    test('should allow requests within limits', () => {
      const key = 'test-key-1';
      
      // Should allow first request
      expect(isRateLimited(key, 5, 60000)).toBe(false);
      expect(isRateLimited(key, 5, 60000)).toBe(false);
      expect(isRateLimited(key, 5, 60000)).toBe(false);
    });

    test('should block requests exceeding limits', () => {
      const key = 'test-key-2';
      
      // Use up the limit
      for (let i = 0; i < 5; i++) {
        isRateLimited(key, 5, 60000);
      }
      
      // Next request should be blocked
      expect(isRateLimited(key, 5, 60000)).toBe(true);
    });
  });

  describe('CSRF Protection', () => {
    beforeEach(() => {
      // Mock crypto.getRandomValues
      vi.mocked(mockWindow.crypto.getRandomValues).mockImplementation((array: Uint8Array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      });
    });

    test('should generate valid CSRF tokens', () => {
      const token = generateCSRFToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(isValidCSRFToken(token)).toBe(true);
    });

    test('should reject invalid CSRF tokens', () => {
      const invalidTokens = [
        'short',
        'g'.repeat(64), // Invalid hex
        'a'.repeat(63), // Too short
        'a'.repeat(65)  // Too long
      ];

      invalidTokens.forEach(token => {
        expect(isValidCSRFToken(token)).toBe(false);
      });
    });
  });

  describe('DOM Manipulation Security', () => {
    beforeEach(() => {
      const mockElement = {
        innerHTML: '',
        textContent: '',
        setAttribute: vi.fn(),
        appendChild: vi.fn()
      };

      vi.mocked(mockDocument.createElement).mockReturnValue(mockElement as any);
    });

    test('should safely set innerHTML with sanitization', () => {
      const element = mockDocument.createElement('div');
      const content = '<p>Safe content</p><script>alert(1)</script>';
      
      setInnerHTMLSafely(element, content);
      
      expect(element.innerHTML).toContain('<p>Safe content</p>');
      expect(element.innerHTML).not.toContain('<script>');
    });

    test('should safely set text content', () => {
      const element = mockDocument.createElement('div');
      const content = '<script>alert(1)</script>Regular text';
      
      setTextContentSafely(element, content);
      
      expect(element.textContent).toBe('<script>alert(1)</script>Regular text');
    });

    test('should create safe elements with validation', () => {
      const element = createSafeElement('div', { 
        id: 'test-id',
        class: 'test-class',
        onclick: 'alert(1)' // Should be filtered out
      }, 'Test content');
      
      expect(element).toBeTruthy();
      expect(vi.mocked(mockDocument.createElement)).toHaveBeenCalledWith('div');
    });

    test('should reject dangerous element types', () => {
      const element = createSafeElement('script', {}, 'alert(1)');
      expect(element).toBeNull();
    });
  });
});

describe('CSP Utilities', () => {
  test('should process CSP violations correctly', () => {
    const violation = {
      'csp-report': {
        'document-uri': 'https://example.com',
        'referrer': '',
        'violated-directive': 'script-src',
        'effective-directive': 'script-src',
        'original-policy': 'script-src self',
        'disposition': 'enforce',
        'blocked-uri': 'https://malicious.com/evil.js',
        'line-number': 10,
        'column-number': 5,
        'source-file': 'https://example.com/page.html',
        'status-code': 200,
        'script-sample': 'alert(1)'
      }
    };

    expect(() => processCSPViolation(violation)).not.toThrow();
  });

  test('should validate CSP directives', () => {
    const validDirectives = ['script-src', 'style-src', 'default-src'];
    const invalidDirectives = ['invalid-directive', 'fake-src'];

    validDirectives.forEach(directive => {
      expect(validateCSPDirective(directive)).toBe(true);
    });

    invalidDirectives.forEach(directive => {
      expect(validateCSPDirective(directive)).toBe(false);
    });
  });

  test('should build CSP headers correctly', () => {
    const config = {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'"],
      'invalid-directive': ['ignored'] // Should be filtered out
    };

    const result = buildCSPHeader(config);
    expect(result).toContain("default-src 'self'");
    expect(result).toContain("script-src 'self' 'unsafe-inline'");
    expect(result).not.toContain('invalid-directive');
  });
});

describe('CORS Utilities', () => {
  test('should validate allowed origins', () => {
    const allowedOrigins = ['https://example.com', 'https://app.example.com'];
    
    expect(isOriginAllowed('https://example.com', allowedOrigins)).toBe(true);
    expect(isOriginAllowed('https://malicious.com', allowedOrigins)).toBe(false);
    expect(isOriginAllowed(null, allowedOrigins)).toBe(false);
  });

  test('should generate CORS headers correctly', () => {
    const origin = 'https://example.com';
    const method = 'POST';
    const config = getCORSConfig();
    
    const headers = generateCORSHeaders(origin, method, config);
    
    expect(headers).toHaveProperty('Access-Control-Allow-Origin');
    expect(headers).toHaveProperty('Vary');
  });

  test('should handle SSE CORS correctly', () => {
    const origin = 'https://example.com';
    const result = handleSSECORS(origin);
    
    expect(result).toHaveProperty('headers');
    expect(result).toHaveProperty('isValid');
    expect(result.headers['Content-Type']).toBe('text/event-stream');
    expect(result.headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
  });

  test('should validate CORS headers', () => {
    const mockResponse = {
      headers: new Map([
        ['access-control-allow-origin', 'https://example.com'],
        ['access-control-allow-credentials', 'true']
      ])
    } as any;

    mockResponse.headers.get = (key: string) => mockResponse.headers.get(key.toLowerCase());

    const isValid = validateCORSHeaders(mockResponse, 'https://example.com');
    expect(isValid).toBe(true);
  });
});

describe('Auth Security', () => {
  test('should decode JWT tokens safely', () => {
    // Create a test JWT (header.payload.signature)
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ 
      sub: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    }));
    const signature = 'fake-signature';
    const token = `${header}.${payload}.${signature}`;

    const result = decodeJWT(token);
    expect(result.header).toBeTruthy();
    expect(result.payload).toBeTruthy();
    expect(result.payload?.email).toBe('test@example.com');
  });

  test('should reject malformed JWT tokens', () => {
    const invalidTokens = [
      'invalid.token',
      'too.few.parts',
      'too.many.parts.here.invalid',
      ''
    ];

    invalidTokens.forEach(token => {
      const result = decodeJWT(token);
      expect(result.error).toBeTruthy();
      expect(result.payload).toBeNull();
    });
  });

  test('should generate secure tokens', () => {
    const token1 = generateSecureToken(32);
    const token2 = generateSecureToken(32);
    
    expect(token1).toMatch(/^[a-f0-9]{64}$/);
    expect(token2).toMatch(/^[a-f0-9]{64}$/);
    expect(token1).not.toBe(token2); // Should be unique
  });

  test('should perform timing-safe string comparison', () => {
    const string1 = 'test-string';
    const string2 = 'test-string';
    const string3 = 'different-string';

    expect(timingSafeEqual(string1, string2)).toBe(true);
    expect(timingSafeEqual(string1, string3)).toBe(false);
    expect(timingSafeEqual('short', 'longer-string')).toBe(false);
  });

  test('should hash and verify strings correctly', async () => {
    const input = 'test-password';
    const hash = await hashString(input);
    
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(await verifyHash(input, hash)).toBe(true);
    expect(await verifyHash('wrong-password', hash)).toBe(false);
  });
});

describe('Security Logging', () => {
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  test('should log security violations in development', () => {
    process.env.NODE_ENV = 'development';
    
    logSecurityViolation('xss_attempt', { 
      source: 'test', 
      content: '<script>alert(1)</script>' 
    });
    
    expect(console.warn).toHaveBeenCalled();
  });

  test('should not log to console in production', () => {
    process.env.NODE_ENV = 'production';
    
    logSecurityViolation('csrf_failure', { 
      source: 'test',
      token: 'invalid-token'
    });
    
    // In production, it should use monitoring service instead of console
    // This test verifies it doesn't leak to console
    expect(console.warn).not.toHaveBeenCalled();
  });
});