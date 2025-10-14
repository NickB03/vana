/**
 * Security Tests for SSE Proxy Authentication
 * Tests for P0-003: Authentication Bypass Vulnerability Fix
 */

/**
 * @jest-environment node
 */

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

import { NextRequest } from 'next/server';
import { GET } from '../[...route]/route';

// Mock extractAuthTokens
jest.mock('@/lib/auth-cookies', () => ({
  extractAuthTokens: jest.fn((request: any) => {
    const authHeader = request.headers.get('authorization');
    return {
      accessToken: authHeader?.replace('Bearer ', '') || null,
      refreshToken: null,
    };
  }),
}));

// Mock CSRF validation (always valid for these auth tests)
jest.mock('@/lib/csrf-server', () => ({
  validateCsrfToken: jest.fn(() => true),
  logCsrfAttempt: jest.fn(),
}));

// Mock fetch for upstream SSE connections
global.fetch = jest.fn();

describe('SSE Proxy Authentication Security (P0-003)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.ALLOW_UNAUTHENTICATED_SSE;
  });

  describe('Localhost Development Access', () => {
    it('should allow unauthenticated access from localhost:3000', async () => {
      const request = new NextRequest('http://localhost:3000/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'localhost:3000',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      // Mock successful upstream response
      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: test\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');
    });

    it('should allow unauthenticated access from 127.0.0.1:3000', async () => {
      const request = new NextRequest('http://127.0.0.1:3000/api/sse/test', {
        method: 'GET',
        headers: {
          host: '127.0.0.1:3000',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: test\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });

    it('should allow unauthenticated access from bare localhost', async () => {
      const request = new NextRequest('http://localhost/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'localhost',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: test\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe('Production Security (Blocking Unauthorized Access)', () => {
    it('should block unauthenticated access from production domain', async () => {
      const request = new NextRequest('https://app.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'app.example.com',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
      expect(response.headers.get('www-authenticate')).toContain('Bearer');
      const body = await response.text();
      expect(body).toContain('Unauthorized');
    });

    it('should block unauthenticated access from staging domain', async () => {
      const request = new NextRequest('https://staging.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'staging.example.com',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });

    it('should allow authenticated access from production domain', async () => {
      const request = new NextRequest('https://app.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'app.example.com',
          authorization: 'Bearer valid-jwt-token',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: test\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-jwt-token',
          }),
        })
      );
    });
  });

  describe('Explicit Allowlist (ALLOW_UNAUTHENTICATED_SSE)', () => {
    it('should allow unauthenticated access from allowlisted host', async () => {
      process.env.ALLOW_UNAUTHENTICATED_SSE = 'dev.example.com:3000,test.example.com:3000';

      const request = new NextRequest('https://dev.example.com:3000/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'dev.example.com:3000',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: test\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });

    it('should block unauthenticated access from non-allowlisted host', async () => {
      process.env.ALLOW_UNAUTHENTICATED_SSE = 'dev.example.com:3000';

      const request = new NextRequest('https://prod.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'prod.example.com',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });

    it('should handle empty allowlist correctly', async () => {
      process.env.ALLOW_UNAUTHENTICATED_SSE = '';

      const request = new NextRequest('https://app.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'app.example.com',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });

    it('should handle allowlist with spaces correctly', async () => {
      process.env.ALLOW_UNAUTHENTICATED_SSE = ' dev.example.com:3000 , test.example.com:3000 ';

      const request = new NextRequest('https://test.example.com:3000/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'test.example.com:3000',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: test\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
    });
  });

  describe('Security Edge Cases', () => {
    it('should not allow localhost-like domains in production', async () => {
      const request = new NextRequest('https://localhost.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'localhost.example.com',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });

    it('should not allow 127.0.0.1-like domains in production', async () => {
      const request = new NextRequest('https://127.0.0.1.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: '127.0.0.1.example.com',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });

    it('should handle missing host header', async () => {
      const request = new NextRequest('https://example.com/api/sse/test', {
        method: 'GET',
      });

      const params = Promise.resolve({ route: ['test'] });

      const response = await GET(request, { params });

      // Missing host should result in unauthorized (empty string doesn't match localhost)
      expect(response.status).toBe(401);
    });

    it('should enforce authentication even with malformed tokens', async () => {
      const request = new NextRequest('https://app.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'app.example.com',
          authorization: 'malformed-not-bearer',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const response = await GET(request, { params });

      expect(response.status).toBe(401);
    });
  });

  describe('Security Logging', () => {
    let consoleWarnSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should log security warnings when blocking requests', async () => {
      const request = new NextRequest('https://app.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'app.example.com',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      await GET(request, { params });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SSE Proxy Security] Blocked unauthenticated request from:',
        'app.example.com'
      );
    });

    it('should log warnings when allowing unauthenticated localhost access', async () => {
      const request = new NextRequest('http://localhost:3000/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'localhost:3000',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: test\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      });

      await GET(request, { params });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SSE Proxy Security] Allowing unauthenticated access for:',
        'localhost:3000'
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[SSE Proxy Security] Reason:',
        'Local development'
      );
    });

    it('should log security check details', async () => {
      const request = new NextRequest('https://app.example.com/api/sse/test', {
        method: 'GET',
        headers: {
          host: 'app.example.com',
          authorization: 'Bearer token',
        },
      });

      const params = Promise.resolve({ route: ['test'] });

      const mockReader = {
        read: jest.fn()
          .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: test\n\n') })
          .mockResolvedValueOnce({ done: true }),
        releaseLock: jest.fn(),
        cancel: jest.fn(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => mockReader,
        },
      });

      await GET(request, { params });

      expect(consoleLogSpy).toHaveBeenCalledWith('[SSE Proxy Security] Host:', 'app.example.com');
      expect(consoleLogSpy).toHaveBeenCalledWith('[SSE Proxy Security] Is local development:', false);
      expect(consoleLogSpy).toHaveBeenCalledWith('[SSE Proxy Security] Is allowlisted host:', false);
      expect(consoleLogSpy).toHaveBeenCalledWith('[SSE Proxy Security] Has access token:', true);
    });
  });
});
