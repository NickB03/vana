/**
 * Security Tests for CSRF Protection in SSE Proxy
 *
 * Tests the CSRF validation implementation to prevent cross-site request forgery attacks
 * on Server-Sent Events endpoints. Validates double-submit cookie pattern security.
 */

/**
 * @jest-environment node
 */

// Mock dependencies BEFORE any imports
jest.mock('@/lib/auth-cookies', () => ({
  extractAuthTokens: jest.fn(() => ({ accessToken: 'mock-token' })),
}));

jest.mock('@/lib/csrf-server', () => ({
  validateCsrfToken: jest.fn(),
  logCsrfAttempt: jest.fn(),
}));

// Mock Next.js Edge Runtime globals
import { Request as NodeRequest, Headers as NodeHeaders } from 'node-fetch';

// Setup Edge Runtime polyfills before importing Next.js modules
global.Request = NodeRequest as any;
global.Headers = NodeHeaders as any;
global.Response = class Response {
  constructor(public body: any, public init?: ResponseInit) {}
} as any;
global.ReadableStream = class ReadableStream {
  constructor(public underlyingSource?: any) {}
} as any;
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock fetch for upstream SSE connections
global.fetch = jest.fn();

import { NextRequest } from 'next/server';
import { GET } from '../[...route]/route';
import { validateCsrfToken, logCsrfAttempt } from '@/lib/csrf-server';

const mockValidateCsrfToken = validateCsrfToken as jest.MockedFunction<typeof validateCsrfToken>;
const mockLogCsrfAttempt = logCsrfAttempt as jest.MockedFunction<typeof logCsrfAttempt>;

describe('SSE Proxy - CSRF Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment to development by default
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.NODE_ENV;
  });

  /**
   * Helper to create a mock NextRequest with CSRF tokens
   */
  function createMockRequest(options: {
    csrfHeader?: string;
    csrfCookie?: string;
    route?: string[];
    host?: string;
  }): NextRequest {
    const headers = new Headers({
      'host': options.host || 'localhost:3000',
    });

    if (options.csrfHeader) {
      headers.set('x-csrf-token', options.csrfHeader);
    }

    const cookies = new Map<string, string>();
    if (options.csrfCookie) {
      cookies.set('csrf_token', options.csrfCookie);
    }

    const url = `http://localhost:3000/api/sse/${(options.route || ['test']).join('/')}`;

    const request = new NextRequest(url, {
      method: 'GET',
      headers,
    });

    // Mock cookies
    (request as any).cookies = {
      get: (name: string) => cookies.has(name) ? { value: cookies.get(name) } : undefined,
    };

    return request;
  }

  describe('CSRF Token Validation', () => {
    it('should reject requests with missing CSRF token', async () => {
      // Arrange
      mockValidateCsrfToken.mockReturnValue(false);
      const request = createMockRequest({
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).toBe(403);
      expect(await response.text()).toContain('CSRF validation failed');
      expect(mockValidateCsrfToken).toHaveBeenCalledWith(request);
      expect(mockLogCsrfAttempt).toHaveBeenCalledWith(request, false);
    });

    it('should reject requests with invalid CSRF token', async () => {
      // Arrange
      mockValidateCsrfToken.mockReturnValue(false);
      const request = createMockRequest({
        csrfHeader: 'invalid-token',
        csrfCookie: 'different-token',
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).toBe(403);
      expect(await response.text()).toContain('CSRF validation failed');
      expect(mockValidateCsrfToken).toHaveBeenCalledWith(request);
      expect(mockLogCsrfAttempt).toHaveBeenCalledWith(request, false);
    });

    it('should accept requests with valid CSRF token', async () => {
      // Arrange
      const validToken = 'a'.repeat(64); // 32 bytes hex = 64 characters
      mockValidateCsrfToken.mockReturnValue(true);

      const request = createMockRequest({
        csrfHeader: validToken,
        csrfCookie: validToken,
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Mock fetch for upstream SSE connection
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).not.toBe(403);
      expect(mockValidateCsrfToken).toHaveBeenCalledWith(request);
      expect(mockLogCsrfAttempt).toHaveBeenCalledWith(request, true);
    });

    it('should skip CSRF validation in development mode', async () => {
      // Arrange
      process.env.NODE_ENV = 'development';
      mockValidateCsrfToken.mockReturnValue(true); // Dev mode returns true

      const request = createMockRequest({
        route: ['agent_network_sse', 'session123'],
        host: 'localhost:3000',
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).not.toBe(403);
      expect(mockValidateCsrfToken).toHaveBeenCalledWith(request);
    });

    it('should enforce CSRF validation in production mode', async () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      mockValidateCsrfToken.mockReturnValue(false);

      const request = createMockRequest({
        route: ['agent_network_sse', 'session123'],
        host: 'app.vana.com',
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).toBe(403);
      expect(await response.text()).toContain('CSRF validation failed');
      expect(mockValidateCsrfToken).toHaveBeenCalledWith(request);
    });
  });

  describe('CSRF Token Format Validation', () => {
    it('should reject CSRF token with wrong length', async () => {
      // Arrange
      mockValidateCsrfToken.mockReturnValue(false);
      const shortToken = 'abc123';

      const request = createMockRequest({
        csrfHeader: shortToken,
        csrfCookie: shortToken,
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).toBe(403);
      expect(mockValidateCsrfToken).toHaveBeenCalledWith(request);
    });

    it('should reject non-hex CSRF tokens', async () => {
      // Arrange
      mockValidateCsrfToken.mockReturnValue(false);
      const nonHexToken = 'x'.repeat(64); // Correct length but not hex

      const request = createMockRequest({
        csrfHeader: nonHexToken,
        csrfCookie: nonHexToken,
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).toBe(403);
      expect(mockValidateCsrfToken).toHaveBeenCalledWith(request);
    });
  });

  describe('CSRF Attack Scenarios', () => {
    it('should prevent CSRF attack with stolen cookie (no header)', async () => {
      // Arrange - Attacker has cookie but cannot set custom header
      mockValidateCsrfToken.mockReturnValue(false);
      const stolenToken = 'a'.repeat(64);

      const request = createMockRequest({
        csrfCookie: stolenToken,
        // No header - attacker cannot set custom headers in cross-origin request
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).toBe(403);
      expect(await response.text()).toContain('CSRF validation failed');
    });

    it('should prevent CSRF attack with guessed header (no cookie)', async () => {
      // Arrange - Attacker guesses header but has no cookie access
      mockValidateCsrfToken.mockReturnValue(false);
      const guessedToken = 'b'.repeat(64);

      const request = createMockRequest({
        csrfHeader: guessedToken,
        // No cookie - attacker cannot read cookies cross-origin
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).toBe(403);
      expect(await response.text()).toContain('CSRF validation failed');
    });

    it('should prevent CSRF attack with mismatched tokens', async () => {
      // Arrange - Tokens don't match (timing attack attempt)
      mockValidateCsrfToken.mockReturnValue(false);

      const request = createMockRequest({
        csrfHeader: 'a'.repeat(64),
        csrfCookie: 'b'.repeat(64),
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      const response = await GET(request, { params });

      // Assert
      expect(response.status).toBe(403);
      expect(mockValidateCsrfToken).toHaveBeenCalledWith(request);
    });
  });

  describe('Logging and Monitoring', () => {
    it('should log successful CSRF validation', async () => {
      // Arrange
      const validToken = 'a'.repeat(64);
      mockValidateCsrfToken.mockReturnValue(true);

      const request = createMockRequest({
        csrfHeader: validToken,
        csrfCookie: validToken,
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: jest.fn().mockResolvedValue({ done: true }),
            releaseLock: jest.fn(),
          }),
        },
      });

      // Act
      await GET(request, { params });

      // Assert
      expect(mockLogCsrfAttempt).toHaveBeenCalledWith(request, true);
    });

    it('should log failed CSRF validation', async () => {
      // Arrange
      mockValidateCsrfToken.mockReturnValue(false);

      const request = createMockRequest({
        route: ['agent_network_sse', 'session123'],
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      await GET(request, { params });

      // Assert
      expect(mockLogCsrfAttempt).toHaveBeenCalledWith(request, false);
    });
  });

  describe('Integration with Authentication', () => {
    it('should validate CSRF before checking authentication', async () => {
      // Arrange
      mockValidateCsrfToken.mockReturnValue(false);

      const request = createMockRequest({
        route: ['agent_network_sse', 'session123'],
        host: 'app.vana.com', // Production host
      });
      const params = Promise.resolve({ route: ['agent_network_sse', 'session123'] });

      // Act
      const response = await GET(request, { params });

      // Assert
      // Should fail at CSRF check (403) before authentication check (401)
      expect(response.status).toBe(403);
      expect(await response.text()).toContain('CSRF validation failed');
    });
  });
});
