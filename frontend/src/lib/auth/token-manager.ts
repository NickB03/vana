/**
 * Token Manager - Secure JWT Storage and Management
 * Implements secure token storage with automatic refresh
 * @module token-manager
 */

import { jwtDecode } from 'jwt-decode';
import { secureStorage } from './secure-storage';

/**
 * Token storage keys
 */
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  ID_TOKEN: 'id_token',
  REFRESH_TOKEN: 'refresh_token',
  EXPIRES_AT: 'expires_at',
  TOKEN_TYPE: 'token_type'
} as const;

/**
 * Token storage options
 */
interface TokenStorageOptions {
  accessToken: string;
  idToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType?: string;
}

/**
 * Token validation result
 */
interface TokenValidation {
  isValid: boolean;
  isExpired: boolean;
  expiresIn?: number;
  needsRefresh: boolean;
}

/**
 * JWT payload base interface
 */
interface JWTPayload {
  exp?: number;
  iat?: number;
  nbf?: number;
  iss?: string;
  sub?: string;
  aud?: string | string[];
  jti?: string;
}

/**
 * Token manager class for secure token handling
 */
class TokenManager {
  private readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  private readonly TOKEN_BUFFER = 60 * 1000; // 1 minute buffer
  private refreshPromise: Promise<void> | null = null;
  private memoryTokens: Map<string, string> = new Map();

  /**
   * Store tokens securely
   */
  async storeTokens(options: TokenStorageOptions): Promise<void> {
    const {
      accessToken,
      idToken,
      refreshToken,
      expiresIn,
      tokenType = 'Bearer'
    } = options;

    // Calculate expiration time
    const expiresAt = Date.now() + (expiresIn * 1000);

    // Store tokens in secure storage (httpOnly cookies)
    const storageOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'strict' as const,
      maxAge: expiresIn
    };

    // Store each token separately for granular control
    await Promise.all([
      secureStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken, storageOptions),
      secureStorage.setItem(TOKEN_KEYS.ID_TOKEN, idToken, storageOptions),
      refreshToken && secureStorage.setItem(
        TOKEN_KEYS.REFRESH_TOKEN,
        refreshToken,
        { ...storageOptions, maxAge: 30 * 24 * 60 * 60 } // 30 days for refresh token
      ),
      secureStorage.setItem(TOKEN_KEYS.EXPIRES_AT, expiresAt.toString(), storageOptions),
      secureStorage.setItem(TOKEN_KEYS.TOKEN_TYPE, tokenType, storageOptions)
    ].filter(Boolean));

    // Also store in memory for immediate access (not the refresh token)
    this.memoryTokens.set(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
    this.memoryTokens.set(TOKEN_KEYS.ID_TOKEN, idToken);
    this.memoryTokens.set(TOKEN_KEYS.EXPIRES_AT, expiresAt.toString());
    this.memoryTokens.set(TOKEN_KEYS.TOKEN_TYPE, tokenType);

    // Emit storage event
    this.emitTokenEvent('tokens-stored', { expiresAt });
  }

  /**
   * Get access token
   */
  async getAccessToken(): Promise<string | null> {
    // Check memory first
    const memoryToken = this.memoryTokens.get(TOKEN_KEYS.ACCESS_TOKEN);
    if (memoryToken && await this.isTokenValid(memoryToken)) {
      return memoryToken;
    }

    // Fallback to secure storage
    const token = await secureStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
    
    if (token && await this.isTokenValid(token)) {
      // Update memory cache
      this.memoryTokens.set(TOKEN_KEYS.ACCESS_TOKEN, token);
      return token;
    }

    return null;
  }

  /**
   * Get ID token
   */
  async getIdToken(): Promise<string | null> {
    // Check memory first
    const memoryToken = this.memoryTokens.get(TOKEN_KEYS.ID_TOKEN);
    if (memoryToken && await this.isTokenValid(memoryToken)) {
      return memoryToken;
    }

    // Fallback to secure storage
    const token = await secureStorage.getItem(TOKEN_KEYS.ID_TOKEN);
    
    if (token && await this.isTokenValid(token)) {
      // Update memory cache
      this.memoryTokens.set(TOKEN_KEYS.ID_TOKEN, token);
      return token;
    }

    return null;
  }

  /**
   * Get refresh token (never stored in memory)
   */
  async getRefreshToken(): Promise<string | null> {
    return secureStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
  }

  /**
   * Get token type
   */
  async getTokenType(): Promise<string> {
    const memoryType = this.memoryTokens.get(TOKEN_KEYS.TOKEN_TYPE);
    if (memoryType) return memoryType;

    const type = await secureStorage.getItem(TOKEN_KEYS.TOKEN_TYPE);
    return type || 'Bearer';
  }

  /**
   * Get authorization header value
   */
  async getAuthorizationHeader(): Promise<string | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    const tokenType = await this.getTokenType();
    return `${tokenType} ${token}`;
  }

  /**
   * Check if tokens exist and are valid
   */
  async hasValidToken(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return false;

    const validation = await this.validateToken(token);
    return validation.isValid && !validation.isExpired;
  }

  /**
   * Validate a token
   */
  async validateToken(token: string): Promise<TokenValidation> {
    try {
      const payload = jwtDecode<JWTPayload>(token);
      
      if (!payload.exp) {
        return {
          isValid: true, // Token without expiry is considered valid
          isExpired: false,
          needsRefresh: false
        };
      }

      const now = Date.now();
      const expiresAt = payload.exp * 1000;
      const expiresIn = expiresAt - now;

      const isExpired = expiresIn <= this.TOKEN_BUFFER;
      const needsRefresh = expiresIn <= this.REFRESH_THRESHOLD;

      return {
        isValid: true,
        isExpired,
        expiresIn: Math.max(0, expiresIn),
        needsRefresh
      };
    } catch (error) {
      return {
        isValid: false,
        isExpired: true,
        needsRefresh: true
      };
    }
  }

  /**
   * Check if a token is valid (not expired)
   */
  private async isTokenValid(token: string): Promise<boolean> {
    const validation = await this.validateToken(token);
    return validation.isValid && !validation.isExpired;
  }

  /**
   * Check if tokens need refresh
   */
  async needsRefresh(): Promise<boolean> {
    const token = await this.getAccessToken();
    if (!token) return true;

    const validation = await this.validateToken(token);
    return validation.needsRefresh;
  }

  /**
   * Get time until token expiry
   */
  async getTimeUntilExpiry(): Promise<number | null> {
    const expiresAt = this.memoryTokens.get(TOKEN_KEYS.EXPIRES_AT) ||
                     await secureStorage.getItem(TOKEN_KEYS.EXPIRES_AT);
    
    if (!expiresAt) return null;

    const expiry = parseInt(expiresAt, 10);
    return Math.max(0, expiry - Date.now());
  }

  /**
   * Clear all tokens
   */
  async clearTokens(): Promise<void> {
    // Clear from secure storage
    await Promise.all([
      secureStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN),
      secureStorage.removeItem(TOKEN_KEYS.ID_TOKEN),
      secureStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN),
      secureStorage.removeItem(TOKEN_KEYS.EXPIRES_AT),
      secureStorage.removeItem(TOKEN_KEYS.TOKEN_TYPE)
    ]);

    // Clear memory tokens
    this.memoryTokens.clear();

    // Clear refresh promise
    this.refreshPromise = null;

    // Emit clear event
    this.emitTokenEvent('tokens-cleared');
  }

  /**
   * Decode token without validation (for debugging)
   */
  decodeToken<T = any>(token: string): T | null {
    try {
      return jwtDecode<T>(token);
    } catch {
      return null;
    }
  }

  /**
   * Extract claims from ID token
   */
  async getIdTokenClaims<T = any>(): Promise<T | null> {
    const idToken = await this.getIdToken();
    if (!idToken) return null;

    return this.decodeToken<T>(idToken);
  }

  /**
   * Ensure single refresh operation
   */
  async ensureRefresh(refreshFn: () => Promise<void>): Promise<void> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = refreshFn()
      .finally(() => {
        this.refreshPromise = null;
      });

    return this.refreshPromise;
  }

  /**
   * Monitor token expiry
   */
  startExpiryMonitor(callback: () => void): () => void {
    let timeoutId: NodeJS.Timeout | null = null;

    const scheduleCheck = async () => {
      const timeUntilExpiry = await this.getTimeUntilExpiry();
      
      if (timeUntilExpiry && timeUntilExpiry > 0) {
        // Schedule callback 5 minutes before expiry
        const delay = Math.max(0, timeUntilExpiry - this.REFRESH_THRESHOLD);
        
        timeoutId = setTimeout(() => {
          callback();
          scheduleCheck(); // Reschedule after callback
        }, delay);
      }
    };

    scheduleCheck();

    // Return cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }

  /**
   * Emit token-related events
   */
  private emitTokenEvent(type: string, detail?: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(`token:${type}`, { detail }));
    }
  }

  /**
   * Get token statistics (for debugging)
   */
  async getTokenStats(): Promise<{
    hasAccessToken: boolean;
    hasIdToken: boolean;
    hasRefreshToken: boolean;
    isValid: boolean;
    needsRefresh: boolean;
    expiresIn: number | null;
  }> {
    const accessToken = await this.getAccessToken();
    const idToken = await this.getIdToken();
    const refreshToken = await this.getRefreshToken();
    const timeUntilExpiry = await this.getTimeUntilExpiry();

    let isValid = false;
    let needsRefresh = false;

    if (accessToken) {
      const validation = await this.validateToken(accessToken);
      isValid = validation.isValid && !validation.isExpired;
      needsRefresh = validation.needsRefresh;
    }

    return {
      hasAccessToken: !!accessToken,
      hasIdToken: !!idToken,
      hasRefreshToken: !!refreshToken,
      isValid,
      needsRefresh,
      expiresIn: timeUntilExpiry
    };
  }
}

// Export singleton instance
export const tokenManager = new TokenManager();

// Export types
export type { TokenStorageOptions, TokenValidation, JWTPayload };