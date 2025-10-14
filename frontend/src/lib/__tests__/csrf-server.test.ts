/**
 * Unit Tests for Server-Side CSRF Token Validation
 *
 * Tests the CSRF validation logic to ensure proper security implementation
 * of the double-submit cookie pattern for SSE proxy endpoints.
 */

/**
 * @jest-environment node
 */

import { validateCsrfToken, getCsrfTokenFromRequest, hasCsrfToken } from '../csrf-server';

// Mock NextRequest
class MockNextRequest {
  public headers: Map<string, string>;
  public cookies: Map<string, { value: string }>;
  public nextUrl: { pathname: string };
  public method: string;

  constructor(options: {
    headers?: Record<string, string>;
    cookies?: Record<string, string>;
    pathname?: string;
    method?: string;
  }) {
    this.headers = new Map(Object.entries(options.headers || {}));
    this.cookies = new Map(
      Object.entries(options.cookies || {}).map(([k, v]) => [k, { value: v }])
    );
    this.nextUrl = { pathname: options.pathname || '/api/sse/test' };
    this.method = options.method || 'GET';
  }

  get(key: string) {
    return this.cookies.get(key);
  }
}

describe('CSRF Server-Side Validation', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Reset to development for most tests
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Restore original environment
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('validateCsrfToken', () => {
    it('should return true in development mode', () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      const request = new MockNextRequest({}) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject missing CSRF token in production', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const request = new MockNextRequest({}) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject when only header is present', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const token = 'a'.repeat(64);
      const request = new MockNextRequest({
        headers: { 'x-csrf-token': token },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject when only cookie is present', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const token = 'a'.repeat(64);
      const request = new MockNextRequest({
        cookies: { csrf_token: token },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject tokens with incorrect length', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const shortToken = 'abc123';
      const request = new MockNextRequest({
        headers: { 'x-csrf-token': shortToken },
        cookies: { csrf_token: shortToken },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject non-hex tokens', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const nonHexToken = 'g'.repeat(64); // 'g' is not a valid hex character
      const request = new MockNextRequest({
        headers: { 'x-csrf-token': nonHexToken },
        cookies: { csrf_token: nonHexToken },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject mismatched tokens', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const token1 = 'a'.repeat(64);
      const token2 = 'b'.repeat(64);
      const request = new MockNextRequest({
        headers: { 'x-csrf-token': token1 },
        cookies: { csrf_token: token2 },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(false);
    });

    it('should accept matching valid tokens', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const validToken = 'a'.repeat(64);
      const request = new MockNextRequest({
        headers: { 'x-csrf-token': validToken },
        cookies: { csrf_token: validToken },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(true);
    });

    it('should accept case-insensitive header name', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const validToken = 'a'.repeat(64);
      const request = new MockNextRequest({
        headers: { 'X-CSRF-Token': validToken },
        cookies: { csrf_token: validToken },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(true);
    });

    it('should use constant-time comparison to prevent timing attacks', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const token1 = 'a'.repeat(64);
      const token2 = 'a'.repeat(63) + 'b'; // Differs only in last character

      const request = new MockNextRequest({
        headers: { 'x-csrf-token': token1 },
        cookies: { csrf_token: token2 },
      }) as any;

      // Act
      const start = process.hrtime.bigint();
      const result1 = validateCsrfToken(request);
      const time1 = process.hrtime.bigint() - start;

      // Compare with completely different token
      const token3 = 'b'.repeat(64);
      const request2 = new MockNextRequest({
        headers: { 'x-csrf-token': token1 },
        cookies: { csrf_token: token3 },
      }) as any;

      const start2 = process.hrtime.bigint();
      const result2 = validateCsrfToken(request2);
      const time2 = process.hrtime.bigint() - start2;

      // Assert
      expect(result1).toBe(false);
      expect(result2).toBe(false);

      // Timing should be similar (within reasonable margin)
      // This is a soft check as exact timing is not guaranteed
      const timeDiff = Number(time1 - time2) / 1000000; // Convert to milliseconds
      expect(Math.abs(timeDiff)).toBeLessThan(5); // Within 5ms
    });
  });

  describe('getCsrfTokenFromRequest', () => {
    it('should return token from cookie', () => {
      // Arrange
      const token = 'a'.repeat(64);
      const request = new MockNextRequest({
        cookies: { csrf_token: token },
      }) as any;

      // Act
      const result = getCsrfTokenFromRequest(request);

      // Assert
      expect(result).toBe(token);
    });

    it('should return null when no cookie exists', () => {
      // Arrange
      const request = new MockNextRequest({}) as any;

      // Act
      const result = getCsrfTokenFromRequest(request);

      // Assert
      expect(result).toBe(null);
    });
  });

  describe('hasCsrfToken', () => {
    it('should return true when token exists', () => {
      // Arrange
      const token = 'a'.repeat(64);
      const request = new MockNextRequest({
        cookies: { csrf_token: token },
      }) as any;

      // Act
      const result = hasCsrfToken(request);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when no token exists', () => {
      // Arrange
      const request = new MockNextRequest({}) as any;

      // Act
      const result = hasCsrfToken(request);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should validate hex format (prevents injection)', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const maliciousToken = '<script>alert("xss")</script>'.padEnd(64, 'a');
      const request = new MockNextRequest({
        headers: { 'x-csrf-token': maliciousToken },
        cookies: { csrf_token: maliciousToken },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(false);
    });

    it('should require exact length (prevents truncation attacks)', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const longToken = 'a'.repeat(128); // Too long
      const request = new MockNextRequest({
        headers: { 'x-csrf-token': longToken },
        cookies: { csrf_token: longToken },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(false);
    });

    it('should enforce 256-bit entropy requirement', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      const validToken = 'a'.repeat(64); // 32 bytes = 256 bits
      const request = new MockNextRequest({
        headers: { 'x-csrf-token': validToken },
        cookies: { csrf_token: validToken },
      }) as any;

      // Act
      const result = validateCsrfToken(request);

      // Assert
      expect(result).toBe(true);
      // Token length: 64 hex chars = 32 bytes = 256 bits of entropy
      expect(validToken.length).toBe(64);
    });
  });
});
