/**
 * Security Utilities for Vana AI Research Platform
 * 
 * Provides comprehensive security utilities including:
 * - Secure token storage with encryption
 * - Input validation and sanitization
 * - CSRF token management
 * - Rate limiting
 * - Security headers and CSP
 */

import DOMPurify from 'isomorphic-dompurify';

// ============================================================================
// Encryption Utilities
// ============================================================================

/**
 * Simple symmetric encryption for client-side token storage
 * Note: This is for obfuscation only, not cryptographically secure storage
 * Real security comes from httpOnly cookies and secure transmission
 */
class SimpleEncryption {
  private key: string;

  constructor(key?: string) {
    this.key = key || this.generateKey();
  }

  private generateKey(): string {
    return btoa(Math.random().toString(36).substring(2, 15) + 
                Math.random().toString(36).substring(2, 15));
  }

  encrypt(text: string): string {
    try {
      const encoded = btoa(text);
      return btoa(encoded + '::' + this.key);
    } catch (error) {
      console.warn('[Security] Encryption failed, storing plaintext');
      return text;
    }
  }

  decrypt(encryptedText: string): string {
    try {
      const decoded = atob(encryptedText);
      const [data, key] = decoded.split('::');
      if (key !== this.key) {
        throw new Error('Invalid key');
      }
      return atob(data);
    } catch (error) {
      // Fallback for plaintext or corrupted data
      return encryptedText;
    }
  }
}

// ============================================================================
// Secure Storage
// ============================================================================

export interface SecureStorageOptions {
  encrypt?: boolean;
  useSessionStorage?: boolean;
  prefix?: string;
}

export class SecureStorage {
  private encryption: SimpleEncryption;
  private options: Required<SecureStorageOptions>;

  constructor(options: SecureStorageOptions = {}) {
    this.options = {
      encrypt: true,
      useSessionStorage: false,
      prefix: 'vana_secure_',
      ...options
    };
    this.encryption = new SimpleEncryption();
  }

  /**
   * Store data securely
   */
  setItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;

    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      const fullKey = this.options.prefix + key;
      const dataToStore = this.options.encrypt ? this.encryption.encrypt(value) : value;
      
      storage.setItem(fullKey, dataToStore);
    } catch (error) {
      console.error('[Security] Failed to store secure item:', error);
    }
  }

  /**
   * Retrieve data securely
   */
  getItem(key: string): string | null {
    if (typeof window === 'undefined') return null;

    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      const fullKey = this.options.prefix + key;
      const storedData = storage.getItem(fullKey);
      
      if (!storedData) return null;
      
      return this.options.encrypt ? this.encryption.decrypt(storedData) : storedData;
    } catch (error) {
      console.error('[Security] Failed to retrieve secure item:', error);
      return null;
    }
  }

  /**
   * Remove data securely
   */
  removeItem(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      const fullKey = this.options.prefix + key;
      storage.removeItem(fullKey);
    } catch (error) {
      console.error('[Security] Failed to remove secure item:', error);
    }
  }

  /**
   * Clear all secure storage items
   */
  clear(): void {
    if (typeof window === 'undefined') return;

    try {
      const storage = this.options.useSessionStorage ? sessionStorage : localStorage;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.options.prefix)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => storage.removeItem(key));
    } catch (error) {
      console.error('[Security] Failed to clear secure storage:', error);
    }
  }
}

// ============================================================================
// Token Management
// ============================================================================

export class SecureTokenManager {
  private storage: SecureStorage;
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';
  private expiryKey = 'token_expiry';

  constructor() {
    this.storage = new SecureStorage({
      encrypt: true,
      useSessionStorage: false,
      prefix: 'vana_auth_'
    });
  }

  /**
   * Store authentication token securely
   */
  setToken(token: string, expiresIn?: number): void {
    this.storage.setItem(this.tokenKey, token);
    
    if (expiresIn) {
      const expiry = Date.now() + (expiresIn * 1000);
      this.storage.setItem(this.expiryKey, expiry.toString());
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    const token = this.storage.getItem(this.tokenKey);
    const expiry = this.storage.getItem(this.expiryKey);
    
    // Check if token is expired
    if (token && expiry && Date.now() > parseInt(expiry)) {
      this.clearToken();
      return null;
    }
    
    return token;
  }

  /**
   * Store refresh token
   */
  setRefreshToken(refreshToken: string): void {
    this.storage.setItem(this.refreshTokenKey, refreshToken);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.storage.getItem(this.refreshTokenKey);
  }

  /**
   * Clear all tokens
   */
  clearToken(): void {
    this.storage.removeItem(this.tokenKey);
    this.storage.removeItem(this.refreshTokenKey);
    this.storage.removeItem(this.expiryKey);
  }

  /**
   * Check if token exists and is valid
   */
  isTokenValid(): boolean {
    const token = this.getToken();
    return token !== null;
  }
}

// ============================================================================
// Input Validation & Sanitization
// ============================================================================

export class InputValidator {
  /**
   * Sanitize HTML content to prevent XSS
   */
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'code', 'pre'],
      ALLOWED_ATTR: []
    });
  }

  /**
   * Validate and sanitize user message
   */
  static validateMessage(message: string): { isValid: boolean; sanitized: string; errors: string[] } {
    const errors: string[] = [];
    
    // Check length
    if (!message || message.trim().length === 0) {
      errors.push('Message cannot be empty');
    }
    
    if (message.length > 10000) {
      errors.push('Message too long (max 10,000 characters)');
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(message)) {
        errors.push('Message contains potentially dangerous content');
        break;
      }
    }
    
    const sanitized = this.sanitizeHtml(message.trim());
    
    return {
      isValid: errors.length === 0,
      sanitized,
      errors
    };
  }

  /**
   * Validate email address
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL
   */
  static validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
}

// ============================================================================
// CSRF Protection
// ============================================================================

export class CSRFProtection {
  private tokenKey = 'csrf_token';
  
  /**
   * Generate CSRF token
   */
  generateToken(): string {
    const token = btoa(Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15) + 
                      Date.now().toString());
    
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(this.tokenKey, token);
    }
    
    return token;
  }

  /**
   * Get current CSRF token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(this.tokenKey);
  }

  /**
   * Validate CSRF token
   */
  validateToken(token: string): boolean {
    const storedToken = this.getToken();
    return storedToken !== null && storedToken === token;
  }

  /**
   * Clear CSRF token
   */
  clearToken(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(this.tokenKey);
    }
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

export class ClientRateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number = 10, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  /**
   * Check if request should be rate limited
   */
  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    
    // Filter attempts within the window
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (validAttempts.length >= this.maxAttempts) {
      return true;
    }
    
    // Add current attempt
    validAttempts.push(now);
    this.attempts.set(identifier, validAttempts);
    
    return false;
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const now = Date.now();
    const attempts = this.attempts.get(identifier) || [];
    const validAttempts = attempts.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxAttempts - validAttempts.length);
  }

  /**
   * Reset attempts for identifier
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// ============================================================================
// Security Headers
// ============================================================================

export const SECURITY_HEADERS = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-* should be removed in production
    "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
    "font-src 'self' fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self' localhost:8000 *.googleapis.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Security headers
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'interest-cohort=()'
  ].join(', '),
  
  // HSTS (only add in production with HTTPS)
  // 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

// ============================================================================
// Singleton Instances
// ============================================================================

export const tokenManager = new SecureTokenManager();
export const csrfProtection = new CSRFProtection();
export const rateLimiter = new ClientRateLimiter();

// ============================================================================
// Security Utilities
// ============================================================================

/**
 * Generate secure random string
 */
export function generateSecureRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback for non-secure environments
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
}

/**
 * Check if running in secure context (HTTPS)
 */
export function isSecureContext(): boolean {
  if (typeof window === 'undefined') return true;
  return window.isSecureContext;
}

/**
 * Log security events (could be extended to send to security monitoring)
 */
export function logSecurityEvent(event: string, details: Record<string, unknown>): void {
  console.warn(`[SECURITY] ${event}:`, details);
  
  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Implement security event logging to monitoring service
  }
}