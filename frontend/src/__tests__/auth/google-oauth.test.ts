/**
 * Google OAuth Tests
 * Tests for OAuth implementation
 */

import { getGoogleOAuthClient, PKCEUtil, CSRFProtection, OAuthError, OAuthErrorType, GoogleOAuthClient } from '@/lib/auth/google-oauth';
import { tokenManager } from '@/lib/auth/token-manager';
import { secureStorage } from '@/lib/auth/secure-storage';

// Mock dependencies
jest.mock('@/lib/auth/token-manager');
jest.mock('@/lib/auth/secure-storage');

// Mock fetch
global.fetch = jest.fn();

// Add TextEncoder/TextDecoder polyfills for Node.js
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock crypto for PKCE
const mockCrypto = {
  getRandomValues: jest.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    digest: jest.fn(async () => new ArrayBuffer(32))
  }
};

Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

describe('Google OAuth Client', () => {
  let googleOAuthClient: GoogleOAuthClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    (fetch as jest.Mock).mockClear();
    // Set env variable for testing
    process.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] = 'test-client-id';
    googleOAuthClient = getGoogleOAuthClient();
  });

  describe('PKCE Utilities', () => {
    it('should generate code verifier', () => {
      const verifier = PKCEUtil.generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(verifier.length).toBeGreaterThan(40);
      expect(verifier).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it('should generate code challenge from verifier', async () => {
      const verifier = PKCEUtil.generateCodeVerifier();
      const challenge = await PKCEUtil.generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    });
  });

  describe('CSRF Protection', () => {
    it('should generate and validate state', () => {
      const state = CSRFProtection.generateState();
      expect(state).toBeDefined();
      expect(state).toMatch(/^[a-f0-9\-]+$/);
      
      const isValid = CSRFProtection.validateState(state);
      expect(isValid).toBe(true);
    });

    it('should reject invalid state', () => {
      CSRFProtection.generateState();
      const isValid = CSRFProtection.validateState('invalid-state');
      expect(isValid).toBe(false);
    });

    it('should handle expired state', () => {
      jest.useFakeTimers();
      const state = CSRFProtection.generateState();
      
      // Fast forward 11 minutes (state expires in 10)
      jest.advanceTimersByTime(11 * 60 * 1000);
      
      const isValid = CSRFProtection.validateState(state);
      expect(isValid).toBe(false);
      
      jest.useRealTimers();
    });
  });

  describe('OAuth Flow', () => {
    it('should initialize OAuth flow with PKCE', async () => {
      (secureStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      
      const { authUrl, state } = await googleOAuthClient.initializeFlow();
      
      expect(authUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain('code_challenge=');
      expect(authUrl).toContain('code_challenge_method=S256');
      expect(state).toBeDefined();
      
      expect(secureStorage.setItem).toHaveBeenCalledWith(
        'pkce_verifier',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          secure: true
        })
      );
    });

    it('should handle OAuth callback successfully', async () => {
      const mockCode = 'test-auth-code';
      const mockState = CSRFProtection.generateState();
      const mockTokens = {
        access_token: 'test-access-token',
        id_token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhdWQiOiJ0ZXN0LWNsaWVudC1pZCIsInN1YiI6IjEyMzQ1Njc4OTAiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IlRlc3QgVXNlciIsImV4cCI6OTk5OTk5OTk5OX0',
        refresh_token: 'test-refresh-token',
        expires_in: 3600
      };
      
      (secureStorage.getItem as jest.Mock).mockResolvedValue('test-verifier');
      (secureStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (tokenManager.storeTokens as jest.Mock).mockResolvedValue(undefined);
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTokens
      });
      
      const result = await googleOAuthClient.handleCallback(mockCode, mockState);
      
      expect(result.isAuthenticated).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@test.com');
      expect(tokenManager.storeTokens).toHaveBeenCalled();
    });

    it('should reject callback with invalid state', async () => {
      const mockCode = 'test-auth-code';
      const invalidState = 'invalid-state';
      
      await expect(
        googleOAuthClient.handleCallback(mockCode, invalidState)
      ).rejects.toThrow(OAuthError);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockRefreshToken = 'test-refresh-token';
      const mockNewTokens = {
        access_token: 'new-access-token',
        id_token: 'new-id-token',
        expires_in: 3600
      };
      
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValue(mockRefreshToken);
      (tokenManager.storeTokens as jest.Mock).mockResolvedValue(undefined);
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockNewTokens
      });
      
      await googleOAuthClient.refreshTokens();
      
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      );
      
      expect(tokenManager.storeTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: mockNewTokens.access_token,
          idToken: mockNewTokens.id_token
        })
      );
    });

    it('should handle refresh failure', async () => {
      (tokenManager.getRefreshToken as jest.Mock).mockResolvedValue(null);
      
      await expect(googleOAuthClient.refreshTokens()).rejects.toThrow(
        'No refresh token available'
      );
    });
  });

  describe('Logout', () => {
    it('should clear tokens and session on logout', async () => {
      (tokenManager.clearTokens as jest.Mock).mockResolvedValue(undefined);
      (fetch as jest.Mock).mockResolvedValue({ ok: true });
      
      await googleOAuthClient.logout();
      
      expect(tokenManager.clearTokens).toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw configuration error without client ID', () => {
      // Test with empty client ID
      expect(() => {
        new GoogleOAuthClient({ clientId: '' });
      }).toThrow('Google OAuth client ID is required');
    });

    it('should handle network errors during token exchange', async () => {
      const mockCode = 'test-auth-code';
      const mockState = CSRFProtection.generateState();
      
      (secureStorage.getItem as jest.Mock).mockResolvedValue('test-verifier');
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' })
      });
      
      await expect(
        googleOAuthClient.handleCallback(mockCode, mockState)
      ).rejects.toThrow('Failed to exchange authorization code');
    });
  });
});