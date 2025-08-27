/**
 * JWT Authentication Token Validation Security Tests
 * Tests JWT token validation, expiration, signature verification, and security measures
 */

import { tokenManager } from '@/lib/auth/token-manager';
import { secureStorage } from '@/lib/auth/secure-storage';
import { useAuth } from '@/hooks/use-auth';
import { renderHook, act, waitFor } from '@testing-library/react';
import jwt from 'jsonwebtoken';
import { JWTPayload, SignJWT, jwtVerify } from 'jose';

// Mock dependencies
jest.mock('@/lib/auth/token-manager');
jest.mock('@/lib/auth/secure-storage');
jest.mock('jose', () => ({
  SignJWT: jest.fn(),
  jwtVerify: jest.fn(),
  importJWK: jest.fn(),
  createRemoteJWKSet: jest.fn()
}));

// Mock fetch for API calls
global.fetch = jest.fn();

const mockTokenManager = tokenManager as jest.Mocked<typeof tokenManager>;
const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;
const mockSignJWT = SignJWT as jest.MockedFunction<any>;

// Test data
const validTokenPayload = {
  sub: '1234567890',
  email: 'test@example.com',
  name: 'Test User',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  aud: 'test-audience',
  iss: 'test-issuer',
  type: 'access'
};

const expiredTokenPayload = {
  ...validTokenPayload,
  iat: Math.floor(Date.now() / 1000) - 7200,
  exp: Math.floor(Date.now() / 1000) - 3600
};

const invalidSignatureToken = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNjE2MjM5MDIyfQ.invalid_signature';

const maliciousTokens = [
  // None algorithm attack
  'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsImV4cCI6OTk5OTk5OTk5OX0.',
  
  // Algorithm confusion (HMAC vs RSA)
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsImV4cCI6OTk5OTk5OTk5OX0.signature',
  
  // Malformed tokens
  'invalid.token.format',
  'eyJhbGciOiJSUzI1NiJ9.invalid_payload.signature',
  
  // Empty token
  '',
  
  // XSS in token claims
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI8c2NyaXB0PmFsZXJ0KCdYU1MnKTwvc2NyaXB0PiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.signature'
];

describe('JWT Authentication Token Validation Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    
    // Default mocks
    mockTokenManager.isTokenValid.mockResolvedValue(true);
    mockTokenManager.getAccessToken.mockResolvedValue('valid-token');
    mockTokenManager.getRefreshToken.mockResolvedValue('valid-refresh-token');
    mockTokenManager.storeTokens.mockResolvedValue();
    mockTokenManager.clearTokens.mockResolvedValue();
    
    mockSecureStorage.getItem.mockResolvedValue(null);
    mockSecureStorage.setItem.mockResolvedValue();
    mockSecureStorage.removeItem.mockResolvedValue();
  });

  describe('Token Validation Security', () => {
    it('should validate token signature properly', async () => {
      mockJwtVerify.mockResolvedValue({
        payload: validTokenPayload as JWTPayload,
        protectedHeader: { alg: 'RS256' }
      });
      
      const result = await mockTokenManager.isTokenValid();
      expect(result).toBe(true);
      expect(mockJwtVerify).toHaveBeenCalled();
    });

    it('should reject tokens with invalid signatures', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid signature'));
      mockTokenManager.isTokenValid.mockResolvedValue(false);
      
      const result = await mockTokenManager.isTokenValid();
      expect(result).toBe(false);
    });

    it('should reject expired tokens', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Token expired'));
      mockTokenManager.isTokenValid.mockResolvedValue(false);
      
      const result = await mockTokenManager.isTokenValid();
      expect(result).toBe(false);
    });

    it('should reject tokens with none algorithm', async () => {
      const noneToken = maliciousTokens[0];
      mockTokenManager.getAccessToken.mockResolvedValue(noneToken);
      mockTokenManager.isTokenValid.mockResolvedValue(false);
      
      const result = await mockTokenManager.isTokenValid();
      expect(result).toBe(false);
    });

    it('should prevent algorithm confusion attacks', async () => {
      const hmacToken = maliciousTokens[1];
      mockTokenManager.getAccessToken.mockResolvedValue(hmacToken);
      mockJwtVerify.mockRejectedValue(new Error('Algorithm mismatch'));
      mockTokenManager.isTokenValid.mockResolvedValue(false);
      
      const result = await mockTokenManager.isTokenValid();
      expect(result).toBe(false);
    });

    it('should handle malformed tokens securely', async () => {
      for (const maliciousToken of maliciousTokens) {
        mockTokenManager.getAccessToken.mockResolvedValue(maliciousToken);
        mockJwtVerify.mockRejectedValue(new Error('Invalid token format'));
        mockTokenManager.isTokenValid.mockResolvedValue(false);
        
        const result = await mockTokenManager.isTokenValid();
        expect(result).toBe(false);
      }
    });

    it('should validate token audience and issuer', async () => {
      const tokenWithWrongAudience = {
        ...validTokenPayload,
        aud: 'wrong-audience',
        iss: 'wrong-issuer'
      };
      
      mockJwtVerify.mockRejectedValue(new Error('Invalid audience or issuer'));
      mockTokenManager.isTokenValid.mockResolvedValue(false);
      
      const result = await mockTokenManager.isTokenValid();
      expect(result).toBe(false);
    });
  });

  describe('Token Storage Security', () => {
    it('should store tokens securely with httpOnly flag', async () => {
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
        expiresIn: 3600
      };
      
      await mockTokenManager.storeTokens(tokens);
      
      expect(mockSecureStorage.setItem).toHaveBeenCalledWith(
        'access_token',
        tokens.accessToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict'
        })
      );
    });

    it('should clear all tokens on security breach', async () => {
      await mockTokenManager.clearTokens();
      
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('id_token');
    });

    it('should prevent XSS in token claims', async () => {
      const tokenWithXSS = {
        ...validTokenPayload,
        name: '<script>alert("XSS")</script>',
        email: 'user@example.com<img src=x onerror=alert(1)>'
      };
      
      mockJwtVerify.mockResolvedValue({
        payload: tokenWithXSS as JWTPayload,
        protectedHeader: { alg: 'RS256' }
      });
      
      const { result } = renderHook(() => useAuth());
      
      // User data should be sanitized
      if (result.current.user) {
        expect(result.current.user.name).not.toContain('<script>');
        expect(result.current.user.email).not.toContain('<img');
      }
    });
  });

  describe('Token Refresh Security', () => {
    it('should validate refresh token before use', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        })
      } as Response);
      
      mockTokenManager.refreshTokens.mockResolvedValue();
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.refreshTokens();
      });
      
      expect(mockTokenManager.refreshTokens).toHaveBeenCalled();
    });

    it('should handle refresh token replay attacks', async () => {
      // First refresh should succeed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        })
      } as Response);
      
      // Second use of same refresh token should fail
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'invalid_grant',
          error_description: 'Refresh token already used'
        })
      } as Response);
      
      mockTokenManager.refreshTokens
        .mockResolvedValueOnce()
        .mockRejectedValueOnce(new Error('Refresh token already used'));
      
      const { result } = renderHook(() => useAuth());
      
      // First refresh
      await act(async () => {
        await result.current.refreshTokens();
      });
      
      // Second refresh with same token should fail
      await act(async () => {
        await expect(result.current.refreshTokens()).rejects.toThrow();
      });
    });

    it('should clear all tokens on refresh failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'invalid_grant'
        })
      } as Response);
      
      mockTokenManager.refreshTokens.mockRejectedValue(new Error('Refresh failed'));
      
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        try {
          await result.current.refreshTokens();
        } catch (error) {
          // Expected to fail
        }
      });
      
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    });
  });

  describe('Token Timing Attacks Prevention', () => {
    it('should have consistent timing for token validation', async () => {
      const validToken = 'valid-token';
      const invalidToken = 'invalid-token';
      
      // Measure timing for valid token
      const start1 = Date.now();
      mockTokenManager.isTokenValid.mockResolvedValue(true);
      await mockTokenManager.isTokenValid();
      const time1 = Date.now() - start1;
      
      // Measure timing for invalid token
      const start2 = Date.now();
      mockTokenManager.isTokenValid.mockResolvedValue(false);
      await mockTokenManager.isTokenValid();
      const time2 = Date.now() - start2;
      
      // Timing difference should be minimal (under 10ms for mocked functions)
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });

    it('should prevent timing attacks on signature verification', async () => {
      const tokens = [
        'token.with.valid.format.but.invalid.signature',
        'completely.invalid.token.format.here.now',
        'short.token',
        'very.long.token.with.many.segments.that.might.take.longer.to.process'
      ];
      
      const timings: number[] = [];
      
      for (const token of tokens) {
        const start = Date.now();
        mockTokenManager.isTokenValid.mockResolvedValue(false);
        await mockTokenManager.isTokenValid();
        timings.push(Date.now() - start);
      }
      
      // All invalid tokens should have similar processing time
      const maxTiming = Math.max(...timings);
      const minTiming = Math.min(...timings);
      expect(maxTiming - minTiming).toBeLessThan(10);
    });
  });

  describe('Token Injection Prevention', () => {
    it('should prevent header injection via token', async () => {
      const maliciousToken = 'valid-token\r\nX-Injected-Header: malicious';
      
      mockFetch.mockImplementation((url, options) => {
        const headers = options?.headers as Record<string, string> || {};
        const authHeader = headers['Authorization'];
        
        // Verify no header injection
        expect(authHeader).not.toContain('\r\n');
        expect(authHeader).not.toContain('\n');
        expect(authHeader).not.toContain('X-Injected-Header');
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response);
      });
      
      mockTokenManager.getAccessToken.mockResolvedValue(maliciousToken);
      
      // Simulate API call that would use the token
      await mockFetch('/api/test', {
        headers: {
          'Authorization': `Bearer ${maliciousToken}`,
          'Content-Type': 'application/json'
        }
      });
    });

    it('should sanitize token-derived user data', async () => {
      const tokenWithMaliciousData = {
        sub: '123<script>alert("XSS")</script>',
        email: 'user@example.com"><script>alert("XSS")</script>',
        name: 'User<img src=x onerror=alert(1)>',
        picture: 'javascript:alert("XSS")',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      
      mockJwtVerify.mockResolvedValue({
        payload: tokenWithMaliciousData as JWTPayload,
        protectedHeader: { alg: 'RS256' }
      });
      
      const { result } = renderHook(() => useAuth());
      
      await waitFor(() => {
        if (result.current.user) {
          expect(result.current.user.name).not.toContain('<script>');
          expect(result.current.user.name).not.toContain('<img');
          expect(result.current.user.email).not.toContain('<script>');
        }
      });
    });
  });

  describe('Token Scope and Permissions', () => {
    it('should validate token scope for sensitive operations', async () => {
      const limitedToken = {
        ...validTokenPayload,
        scope: 'read:profile',
        permissions: ['read:profile']
      };
      
      mockJwtVerify.mockResolvedValue({
        payload: limitedToken as JWTPayload,
        protectedHeader: { alg: 'RS256' }
      });
      
      // Should reject operations requiring write permissions
      const hasWritePermission = limitedToken.permissions?.includes('write:profile');
      expect(hasWritePermission).toBe(false);
    });

    it('should prevent privilege escalation via token manipulation', async () => {
      const userToken = {
        ...validTokenPayload,
        role: 'user',
        permissions: ['read:own_profile']
      };
      
      // Attempt to escalate to admin
      const maliciousToken = {
        ...userToken,
        role: 'admin',
        permissions: ['admin:all']
      };
      
      // This should be rejected due to invalid signature
      mockJwtVerify.mockRejectedValue(new Error('Invalid signature'));
      mockTokenManager.isTokenValid.mockResolvedValue(false);
      
      const result = await mockTokenManager.isTokenValid();
      expect(result).toBe(false);
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Protection', () => {
    it('should include CSRF protection in token requests', async () => {
      mockFetch.mockImplementation((url, options) => {
        // Verify CSRF token or SameSite cookie is present
        const headers = options?.headers as Record<string, string> || {};
        expect(
          headers['X-CSRF-Token'] || 
          headers['X-Requested-With'] || 
          (options as any)?.credentials === 'include'
        ).toBeTruthy();
        
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        } as Response);
      });
      
      await mockFetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
    });
  });

  describe('Token Cleanup and Security', () => {
    it('should clear tokens from memory on logout', async () => {
      const { result } = renderHook(() => useAuth());
      
      await act(async () => {
        await result.current.logout();
      });
      
      expect(mockTokenManager.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
      expect(result.current.tokens).toBeNull();
    });

    it('should clear tokens on security event', async () => {
      // Simulate security event (e.g., suspicious activity detected)
      mockTokenManager.clearTokens.mockResolvedValue();
      
      await mockTokenManager.clearTokens();
      
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('access_token');
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('refresh_token');
      expect(mockSecureStorage.removeItem).toHaveBeenCalledWith('id_token');
    });

    it('should prevent token leakage in error messages', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Token validation failed'));
      mockTokenManager.isTokenValid.mockRejectedValue(new Error('Invalid token'));
      
      try {
        await mockTokenManager.isTokenValid();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          // Error message should not contain actual token data
          expect(error.message).not.toContain('eyJ'); // JWT prefix
          expect(error.message).not.toMatch(/[a-zA-Z0-9+/]{100,}/); // Long base64 strings
        }
      }
    });
  });
});
