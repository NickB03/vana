/**
 * Google OAuth Client Implementation
 * Implements secure OAuth 2.0 flow with PKCE
 * @module google-oauth
 */

import { jwtDecode } from 'jwt-decode';
import { v4 as uuidv4 } from 'uuid';
import { tokenManager } from './token-manager';
import { secureStorage } from './secure-storage';
import type { AuthState } from '@/types/auth';

/**
 * Google OAuth configuration
 */
export interface GoogleOAuthConfig {
  clientId: string;
  redirectUri?: string;
  scope?: string;
  prompt?: 'none' | 'consent' | 'select_account';
  accessType?: 'online' | 'offline';
  responseType?: 'code' | 'token';
  state?: string;
  includeGrantedScopes?: boolean;
  loginHint?: string;
  hostedDomain?: string;
}

/**
 * Google ID Token payload
 */
export interface GoogleIdTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  iat: number;
  exp: number;
  jti?: string;
  hd?: string;
}

/**
 * OAuth error types
 */
export enum OAuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  INVALID_STATE = 'INVALID_STATE',
  USER_CANCELLED = 'USER_CANCELLED',
  POPUP_BLOCKED = 'POPUP_BLOCKED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * OAuth error class
 */
export class OAuthError extends Error {
  constructor(
    public type: OAuthErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}

/**
 * PKCE (Proof Key for Code Exchange) utilities
 */
class PKCEUtil {
  /**
   * Generate code verifier for PKCE
   */
  static generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate code challenge from verifier
   */
  static async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}

/**
 * CSRF protection utilities
 */
class CSRFProtection {
  private static readonly STATE_KEY = 'oauth_state';
  private static readonly STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

  /**
   * Generate and store CSRF state
   */
  static generateState(): string {
    const state = uuidv4();
    const expiry = Date.now() + this.STATE_EXPIRY;
    
    sessionStorage.setItem(this.STATE_KEY, JSON.stringify({
      state,
      expiry,
      timestamp: Date.now()
    }));
    
    return state;
  }

  /**
   * Validate CSRF state
   */
  static validateState(state: string): boolean {
    const stored = sessionStorage.getItem(this.STATE_KEY);
    if (!stored) return false;
    
    try {
      const { state: storedState, expiry } = JSON.parse(stored);
      sessionStorage.removeItem(this.STATE_KEY);
      
      if (Date.now() > expiry) {
        throw new OAuthError(
          OAuthErrorType.INVALID_STATE,
          'OAuth state expired'
        );
      }
      
      return state === storedState;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Google OAuth client
 */
export class GoogleOAuthClient {
  private config: GoogleOAuthConfig;
  private codeVerifier?: string;
  private refreshTimer?: NodeJS.Timeout;

  constructor(config: GoogleOAuthConfig) {
    this.config = {
      scope: 'openid email profile',
      responseType: 'code',
      accessType: 'offline',
      prompt: 'select_account',
      includeGrantedScopes: true,
      ...config
    };
    
    if (!this.config.clientId) {
      throw new OAuthError(
        OAuthErrorType.CONFIGURATION_ERROR,
        'Google OAuth client ID is required'
      );
    }
  }

  /**
   * Initialize OAuth flow with PKCE
   */
  async initializeFlow(): Promise<{ authUrl: string; state: string }> {
    // Generate PKCE parameters
    this.codeVerifier = PKCEUtil.generateCodeVerifier();
    const codeChallenge = await PKCEUtil.generateCodeChallenge(this.codeVerifier);
    
    // Generate CSRF state
    const state = CSRFProtection.generateState();
    
    // Store PKCE verifier securely
    await secureStorage.setItem('pkce_verifier', this.codeVerifier, {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      maxAge: 600 // 10 minutes
    });
    
    // Build authorization URL
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri || `${window.location.origin}/auth/callback`,
      response_type: this.config.responseType!,
      scope: this.config.scope!,
      access_type: this.config.accessType!,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      prompt: this.config.prompt!,
      include_granted_scopes: this.config.includeGrantedScopes!.toString()
    });
    
    if (this.config.loginHint) {
      params.append('login_hint', this.config.loginHint);
    }
    
    if (this.config.hostedDomain) {
      params.append('hd', this.config.hostedDomain);
    }
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    
    return { authUrl, state };
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(code: string, state: string): Promise<AuthState> {
    // Validate CSRF state
    if (!CSRFProtection.validateState(state)) {
      throw new OAuthError(
        OAuthErrorType.INVALID_STATE,
        'Invalid OAuth state parameter'
      );
    }
    
    // Retrieve PKCE verifier
    const codeVerifier = await secureStorage.getItem('pkce_verifier');
    if (!codeVerifier) {
      throw new OAuthError(
        OAuthErrorType.INVALID_STATE,
        'PKCE code verifier not found'
      );
    }
    
    // Exchange authorization code for tokens
    const tokens = await this.exchangeCodeForTokens(code, codeVerifier);
    
    // Decode and validate ID token
    const idToken = tokens.id_token;
    const payload = this.decodeAndValidateIdToken(idToken);
    
    // Store tokens securely
    await tokenManager.storeTokens({
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in
    });
    
    // Setup automatic token refresh
    this.setupTokenRefresh(tokens.expires_in);
    
    // Clean up PKCE verifier
    await secureStorage.removeItem('pkce_verifier');
    
    // Return auth state
    return {
      user: {
        id: parseInt(payload.sub, 10) || 0,
        email: payload.email || '',
        username: payload.email?.split('@')[0] || '',
        first_name: payload.given_name,
        last_name: payload.family_name,
        full_name: payload.name || '',
        is_active: true,
        is_verified: payload.email_verified || false,
        is_superuser: false,
        google_cloud_identity: payload.sub,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      tokens: {
        access_token: tokens.access_token,
        token_type: 'Bearer',
        expires_in: tokens.expires_in,
        refresh_token: tokens.refresh_token || null,
        issued_at: Date.now()
      },
      isLoading: false,
      error: null
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<any> {
    const response = await fetch('/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        client_id: this.config.clientId,
        redirect_uri: this.config.redirectUri || `${window.location.origin}/auth/callback`,
        grant_type: 'authorization_code'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new OAuthError(
        OAuthErrorType.NETWORK_ERROR,
        'Failed to exchange authorization code',
        error
      );
    }
    
    return response.json();
  }

  /**
   * Decode and validate ID token
   */
  private decodeAndValidateIdToken(idToken: string): GoogleIdTokenPayload {
    try {
      const payload = jwtDecode<GoogleIdTokenPayload>(idToken);
      
      // Validate issuer
      if (!['https://accounts.google.com', 'accounts.google.com'].includes(payload.iss)) {
        throw new OAuthError(
          OAuthErrorType.INVALID_TOKEN,
          'Invalid token issuer'
        );
      }
      
      // Validate audience
      if (payload.aud !== this.config.clientId) {
        throw new OAuthError(
          OAuthErrorType.INVALID_TOKEN,
          'Invalid token audience'
        );
      }
      
      // Validate expiration
      if (payload.exp * 1000 < Date.now()) {
        throw new OAuthError(
          OAuthErrorType.EXPIRED_TOKEN,
          'ID token has expired'
        );
      }
      
      return payload;
    } catch (error) {
      if (error instanceof OAuthError) throw error;
      
      throw new OAuthError(
        OAuthErrorType.INVALID_TOKEN,
        'Failed to decode ID token',
        error
      );
    }
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(expiresIn: number): void {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;
    
    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshTokens();
      } catch (error) {
        console.error('Token refresh failed:', error);
        // Emit event for app to handle
        window.dispatchEvent(new CustomEvent('auth:refresh-failed', {
          detail: error
        }));
      }
    }, refreshTime);
  }

  /**
   * Refresh access token
   */
  async refreshTokens(): Promise<void> {
    const refreshToken = await tokenManager.getRefreshToken();
    
    if (!refreshToken) {
      throw new OAuthError(
        OAuthErrorType.INVALID_TOKEN,
        'No refresh token available'
      );
    }
    
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        grant_type: 'refresh_token'
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new OAuthError(
        OAuthErrorType.NETWORK_ERROR,
        'Failed to refresh tokens',
        error
      );
    }
    
    const tokens = await response.json();
    
    // Store new tokens
    await tokenManager.storeTokens({
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token || refreshToken,
      expiresIn: tokens.expires_in
    });
    
    // Setup next refresh
    this.setupTokenRefresh(tokens.expires_in);
    
    // Emit event for app to handle
    window.dispatchEvent(new CustomEvent('auth:tokens-refreshed', {
      detail: { expiresIn: tokens.expires_in }
    }));
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    // Clear refresh timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    // Clear tokens
    await tokenManager.clearTokens();
    
    // Clear session storage
    sessionStorage.removeItem(CSRFProtection['STATE_KEY']);
    
    // Call logout API
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    // Emit logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  /**
   * Get current authentication status
   */
  async getAuthStatus(): Promise<boolean> {
    const hasValidToken = await tokenManager.hasValidToken();
    
    if (!hasValidToken) {
      // Try to refresh if we have a refresh token
      const refreshToken = await tokenManager.getRefreshToken();
      if (refreshToken) {
        try {
          await this.refreshTokens();
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
    
    return true;
  }
}

// Create singleton instance with lazy initialization
let googleOAuthClientInstance: GoogleOAuthClient | null = null;

export const getGoogleOAuthClient = (): GoogleOAuthClient => {
  if (!googleOAuthClientInstance) {
    const clientId = process.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'] || '';
    if (!clientId && typeof window !== 'undefined') {
      console.warn('Google OAuth client ID not configured');
    }
    googleOAuthClientInstance = new GoogleOAuthClient({
      clientId: clientId || 'test-client-id' // Fallback for testing
    });
  }
  return googleOAuthClientInstance;
};

// Export for convenience
export const googleOAuthClient = typeof window !== 'undefined' 
  ? getGoogleOAuthClient() 
  : null;

// Export utilities for testing
export { PKCEUtil, CSRFProtection };
