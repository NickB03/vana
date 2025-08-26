/**
 * Authentication Security Utilities
 * Implements secure token validation, JWT verification, and session management
 */

import { jwtTokenSchema } from './security';
import { z } from 'zod';

// Node.js crypto import for server-side operations
let nodeCrypto: typeof import('crypto') | undefined;

// Conditionally import Node.js crypto for server-side operations.
// This uses top-level await, which is supported in modern bundlers and ES modules.
// It ensures that the crypto module is loaded before any other code in this module executes
// on the server. In the browser, this block is skipped.
if (typeof window === 'undefined') {
  try {
    nodeCrypto = await import('crypto');
  } catch (error) {
    console.error(
      'Failed to dynamically import Node.js crypto module. ' +
      'Server-side crypto-dependent functions will use fallbacks or may fail.',
      error
    );
  }
}

// ====================
// JWT Security Utilities
// ====================

export interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  exp: number;
  iat: number;
  aud?: string;
  iss?: string;
  role?: string;
  permissions?: string[];
  session_id?: string;
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  needsRefresh?: boolean;
}

/**
 * Safely decode JWT without verification (for client-side inspection only)
 * Never use this for authentication decisions - always verify on server
 */
export function decodeJWT(token: string): { header: JWTHeader | null; payload: JWTPayload | null; error?: string } {
  try {
    if (!token || typeof token !== 'string') {
      return { header: null, payload: null, error: 'Invalid token format' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return { header: null, payload: null, error: 'Invalid JWT structure' };
    }

    const decodeBase64Url = (base64Url: string) => {
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        return window.atob(base64);
      } else {
        // This is for server-side, assuming Buffer is available
        return Buffer.from(base64, 'base64').toString('utf8');
      }
    };

    // Decode header
    const headerDecoded = decodeBase64Url(parts[0]!);
    const header: JWTHeader = JSON.parse(headerDecoded);

    // Decode payload
    const payloadDecoded = decodeBase64Url(parts[1]!);
    const payload: JWTPayload = JSON.parse(payloadDecoded);

    return { header, payload };
  } catch (error) {
    return { 
      header: null, 
      payload: null, 
      error: `JWT decode failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Validate JWT payload structure and expiration (client-side only)
 */
export function validateJWTPayload(payload: any): TokenValidationResult {
  try {
    // Validate structure using Zod schema
    const validatedPayload = jwtTokenSchema.parse(payload);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (validatedPayload.exp < now) {
      return {
        valid: false,
        error: 'Token expired',
        needsRefresh: true
      };
    }

    // Check if token will expire soon (within 5 minutes)
    const fiveMinutesFromNow = now + (5 * 60);
    const needsRefresh = validatedPayload.exp < fiveMinutesFromNow;

    return {
      valid: true,
      payload: validatedPayload,
      needsRefresh
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof z.ZodError ? 
        `Token validation failed: ${error.issues.map(e => e.message).join(', ')}` :
        'Token validation failed'
    };
  }
}

/**
 * Validate access token client-side
 */
export function validateAccessToken(token: string): TokenValidationResult {
  if (!token) {
    return { valid: false, error: 'No token provided' };
  }

  const { payload, error } = decodeJWT(token);
  if (error || !payload) {
    return { valid: false, error: error || 'Failed to decode token' };
  }

  return validateJWTPayload(payload);
}

// ====================
// Secure Token Storage
// ====================

export interface TokenStorage {
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  sessionId?: string;
}

/**
 * Secure token storage manager using httpOnly cookies
 */
export class SecureTokenManager {
  private static instance: SecureTokenManager;

  private constructor() {}

  public static getInstance(): SecureTokenManager {
    if (!SecureTokenManager.instance) {
      SecureTokenManager.instance = new SecureTokenManager();
    }
    return SecureTokenManager.instance;
  }

  /**
   * Get tokens from secure httpOnly cookies via API
   */
  async getTokens(): Promise<TokenStorage | null> {
    try {
      const response = await fetch('/api/auth/token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          return null;
        }
        throw new Error(`Failed to get tokens: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(): Promise<TokenStorage | null> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Refresh token expired or invalid
          await this.clearTokens();
          return null;
        }
        throw new Error(`Failed to refresh tokens: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      await this.clearTokens();
      return null;
    }
  }

  /**
   * Clear all tokens (logout)
   */
  async clearTokens(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
    } catch (error) {
      console.error('Failed to clear tokens on server:', error);
    }
  }

  /**
   * Validate current session and refresh if needed
   */
  async validateAndRefreshSession(): Promise<TokenStorage | null> {
    const tokens = await this.getTokens();
    
    if (!tokens?.accessToken) {
      return null;
    }

    const validation = validateAccessToken(tokens.accessToken);
    
    if (!validation.valid) {
      if (validation.needsRefresh) {
        // Try to refresh
        return await this.refreshTokens();
      }
      // Token is invalid, clear session
      await this.clearTokens();
      return null;
    }

    if (validation.needsRefresh) {
      // Proactively refresh if expiring soon
      const refreshed = await this.refreshTokens();
      return refreshed || tokens; // Fallback to current tokens if refresh fails
    }

    return tokens;
  }
}

// ====================
// Session Security
// ====================

export interface SessionInfo {
  userId: string;
  email: string;
  role: string;
  sessionId: string;
  expiresAt: number;
  lastActivity: number;
  permissions: string[];
}

/**
 * Session security manager
 */
export class SessionSecurityManager {
  private static instance: SessionSecurityManager;
  private sessionCheckInterval: number | null = null;
  private lastActivityTime: number = Date.now();

  private constructor() {
    this.startActivityTracking();
  }

  public static getInstance(): SessionSecurityManager {
    if (!SessionSecurityManager.instance) {
      SessionSecurityManager.instance = new SessionSecurityManager();
    }
    return SessionSecurityManager.instance;
  }

  /**
   * Start tracking user activity for session management
   */
  private startActivityTracking(): void {
    if (typeof window === 'undefined') return;

    const updateActivity = () => {
      this.lastActivityTime = Date.now();
    };

    // Track various user activities
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Start periodic session validation
    this.startSessionValidation();
  }

  /**
   * Start periodic session validation
   */
  private startSessionValidation(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }

    this.sessionCheckInterval = window.setInterval(async () => {
      await this.validateSession();
    }, 60000); // Check every minute
  }

  /**
   * Validate current session
   */
  async validateSession(): Promise<boolean> {
    const tokenManager = SecureTokenManager.getInstance();
    const tokens = await tokenManager.validateAndRefreshSession();

    if (!tokens) {
      this.handleSessionExpired();
      return false;
    }

    return true;
  }

  /**
   * Handle session expiration
   */
  private handleSessionExpired(): void {
    console.warn('Session expired, redirecting to login');
    
    // Clear any sensitive data from memory/localStorage
    this.clearSensitiveData();
    
    // Redirect to login
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search;
      window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
    }
  }

  /**
   * Clear sensitive data from client-side storage
   */
  private clearSensitiveData(): void {
    // Clear localStorage items that might contain sensitive data
    const sensitiveKeys = ['user_data', 'session_data', 'temp_tokens'];
    sensitiveKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  /**
   * Get current session information
   */
  async getSessionInfo(): Promise<SessionInfo | null> {
    const tokenManager = SecureTokenManager.getInstance();
    const tokens = await tokenManager.getTokens();

    if (!tokens?.accessToken) {
      return null;
    }

    const validation = validateAccessToken(tokens.accessToken);
    if (!validation.valid || !validation.payload) {
      return null;
    }

    return {
      userId: validation.payload.sub,
      email: validation.payload.email,
      role: validation.payload.role || 'user',
      sessionId: validation.payload.session_id || '',
      expiresAt: validation.payload.exp * 1000,
      lastActivity: this.lastActivityTime,
      permissions: validation.payload.permissions || []
    };
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(permission: string): Promise<boolean> {
    const session = await this.getSessionInfo();
    return session?.permissions.includes(permission) || session?.role === 'admin' || false;
  }

  /**
   * Cleanup session manager
   */
  destroy(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }
}

// ====================
// Authentication State Manager
// ====================

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  error: string | null;
}

/**
 * Authentication state manager with security features
 */
export class AuthSecurityManager {
  private static instance: AuthSecurityManager;
  private state: AuthState = {
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null
  };
  private listeners: ((state: AuthState) => void)[] = [];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): AuthSecurityManager {
    if (!AuthSecurityManager.instance) {
      AuthSecurityManager.instance = new AuthSecurityManager();
    }
    return AuthSecurityManager.instance;
  }

  /**
   * Initialize authentication state
   */
  private async initialize(): Promise<void> {
    const sessionManager = SessionSecurityManager.getInstance();
    
    try {
      const sessionInfo = await sessionManager.getSessionInfo();
      
      if (sessionInfo) {
        this.updateState({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: sessionInfo.userId,
            email: sessionInfo.email,
            role: sessionInfo.role
          },
          error: null
        });
      } else {
        this.updateState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: null
        });
      }
    } catch (error) {
      this.updateState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error instanceof Error ? error.message : 'Authentication failed'
      });
    }
  }

  /**
   * Update authentication state and notify listeners
   */
  private updateState(newState: Partial<AuthState>): void {
    this.state = { ...this.state, ...newState };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Subscribe to authentication state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Refresh authentication state
   */
  async refresh(): Promise<void> {
    this.updateState({ isLoading: true });
    await this.initialize();
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const tokenManager = SecureTokenManager.getInstance();
    const sessionManager = SessionSecurityManager.getInstance();
    
    await tokenManager.clearTokens();
    sessionManager.destroy();
    
    this.updateState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      error: null
    });
  }
}

// ====================
// Security Utilities
// ====================

/**
 * Generate secure random string for CSRF tokens, nonces, etc.
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash string using Web Crypto API
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify hash against input
 */
export async function verifyHash(input: string, hash: string): Promise<boolean> {
  const inputHash = await hashString(input);
  return inputHash === hash;
}

/**
 * Timing-safe string comparison
 * Uses Node.js crypto.timingSafeEqual when available, falls back to manual implementation
 */
export function timingSafeEqual(a: string, b: string): boolean {
  // Server-side: use Node.js crypto.timingSafeEqual for true constant-time comparison
  if (nodeCrypto?.timingSafeEqual) {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    
    // Length check with dummy comparison to maintain constant time
    if (bufA.length !== bufB.length) {
      const maxLength = Math.max(bufA.length, bufB.length);
      const dummy1 = Buffer.alloc(maxLength);
      const dummy2 = Buffer.alloc(maxLength);
      nodeCrypto.timingSafeEqual(dummy1, dummy2);
      return false;
    }
    
    return nodeCrypto.timingSafeEqual(bufA, bufB);
  }
  
  // Client-side fallback: manual constant-time comparison
  const maxLength = Math.max(a.length, b.length);
  let result = a.length === b.length ? 0 : 1;
  for (let i = 0; i < maxLength; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }
  return result === 0;
}

/**
 * Secure token comparison using Node.js crypto when available
 */
export function secureTokenCompare(token1: string, token2: string): boolean {
  if (nodeCrypto?.timingSafeEqual) {
    const buf1 = Buffer.from(token1, 'utf8');
    const buf2 = Buffer.from(token2, 'utf8');
    
    // Length check with dummy comparison to maintain constant time
    if (buf1.length !== buf2.length) {
      const dummy = Buffer.alloc(32);
      nodeCrypto.timingSafeEqual(dummy, dummy);
      return false;
    }
    
    return nodeCrypto.timingSafeEqual(buf1, buf2);
  }
  
  // Fallback to existing timing-safe comparison
  return timingSafeEqual(token1, token2);
}

/**
 * Hash token using Node.js crypto or Web Crypto API
 */
export function hashToken(token: string): string {
  if (nodeCrypto?.createHash) {
    return nodeCrypto.createHash('sha256').update(token, 'utf8').digest('hex');
  }
  
  // For client-side, this should be handled async with Web Crypto API
  throw new Error('Token hashing requires server-side Node.js crypto or async Web Crypto API');
}

// ====================
// Export instances and utilities
// ====================

export const tokenManager = SecureTokenManager.getInstance();
export const sessionManager = SessionSecurityManager.getInstance();
export const authManager = AuthSecurityManager.getInstance();
