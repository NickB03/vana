/**
 * Secure Storage - HttpOnly Cookie Management
 * Implements secure client-side storage with server-side validation
 * @module secure-storage
 */

import Cookies from 'js-cookie';

/**
 * Storage options for secure cookies
 */
export interface SecureStorageOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number; // in seconds
  domain?: string;
  path?: string;
}

/**
 * Encryption utilities for sensitive data
 */
class EncryptionUtil {
  private readonly algorithm = 'AES-GCM';
  private readonly keyLength = 256;
  private cryptoKey?: CryptoKey;

  /**
   * Initialize encryption key
   */
  async initializeKey(): Promise<void> {
    if (this.cryptoKey) return;

    // Derive key from browser fingerprint and salt
    const fingerprint = await this.getBrowserFingerprint();
    const salt = this.getSalt();
    
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(fingerprint + salt),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    this.cryptoKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new TextEncoder().encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.algorithm, length: this.keyLength },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Get browser fingerprint for key derivation
   */
  private async getBrowserFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      navigator.hardwareConcurrency?.toString() || '0',
      screen.width.toString(),
      screen.height.toString(),
      screen.colorDepth.toString(),
      new Date().getTimezoneOffset().toString()
    ];

    const fingerprint = components.join('|');
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(fingerprint)
    );

    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }

  /**
   * Get or generate salt
   */
  private getSalt(): string {
    const storageKey = '__ss_salt';
    let salt = localStorage.getItem(storageKey);
    
    if (!salt) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      salt = btoa(String.fromCharCode(...array));
      localStorage.setItem(storageKey, salt);
    }
    
    return salt;
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string): Promise<string> {
    await this.initializeKey();
    if (!this.cryptoKey) throw new Error('Encryption key not initialized');

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(data);

    const encryptedData = await crypto.subtle.encrypt(
      { name: this.algorithm, iv },
      this.cryptoKey,
      encodedData
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: string): Promise<string> {
    await this.initializeKey();
    if (!this.cryptoKey) throw new Error('Encryption key not initialized');

    const combined = new Uint8Array(
      atob(encryptedData).split('').map(c => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decryptedData = await crypto.subtle.decrypt(
      { name: this.algorithm, iv },
      this.cryptoKey,
      data
    );

    return new TextDecoder().decode(decryptedData);
  }
}

/**
 * Secure storage class for managing httpOnly cookies
 */
class SecureStorage {
  private readonly encryptionUtil = new EncryptionUtil();
  private readonly cookiePrefix = '__secure_';
  private readonly sessionPrefix = '__session_';
  private readonly memoryCache = new Map<string, { value: string; expires?: number }>();

  /**
   * Set item in secure storage
   */
  async setItem(
    key: string,
    value: string,
    options: SecureStorageOptions = {}
  ): Promise<void> {
    const {
      httpOnly = true,
      secure = true,
      sameSite = 'strict',
      maxAge = 3600, // 1 hour default
      domain,
      path = '/'
    } = options;

    // For httpOnly cookies, we need server-side handling
    if (httpOnly) {
      await this.setHttpOnlyCookie(key, value, options);
    } else {
      // For non-httpOnly, use js-cookie with encryption
      const encryptedValue = await this.encryptionUtil.encrypt(value);
      
      Cookies.set(this.cookiePrefix + key, encryptedValue, {
        secure,
        sameSite,
        expires: maxAge / 86400, // Convert seconds to days
        domain,
        path
      });
    }

    // Also store in memory cache for quick access
    this.memoryCache.set(key, {
      value,
      expires: maxAge ? Date.now() + (maxAge * 1000) : undefined
    });
  }

  /**
   * Get item from secure storage
   */
  async getItem(key: string): Promise<string | null> {
    // Check memory cache first
    const cached = this.memoryCache.get(key);
    if (cached) {
      if (!cached.expires || cached.expires > Date.now()) {
        return cached.value;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // Try to get from httpOnly cookie via API
    const httpOnlyValue = await this.getHttpOnlyCookie(key);
    if (httpOnlyValue) {
      // Update memory cache
      this.memoryCache.set(key, { value: httpOnlyValue });
      return httpOnlyValue;
    }

    // Fallback to regular cookie
    const cookieValue = Cookies.get(this.cookiePrefix + key);
    if (cookieValue) {
      try {
        const decryptedValue = await this.encryptionUtil.decrypt(cookieValue);
        // Update memory cache
        this.memoryCache.set(key, { value: decryptedValue });
        return decryptedValue;
      } catch {
        // If decryption fails, remove the corrupted cookie
        Cookies.remove(this.cookiePrefix + key);
        return null;
      }
    }

    return null;
  }

  /**
   * Remove item from secure storage
   */
  async removeItem(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove httpOnly cookie via API
    await this.removeHttpOnlyCookie(key);

    // Remove regular cookie
    Cookies.remove(this.cookiePrefix + key);
  }

  /**
   * Clear all secure storage
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear all cookies with our prefix
    const allCookies = Cookies.get();
    Object.keys(allCookies).forEach(key => {
      if (key.startsWith(this.cookiePrefix) || key.startsWith(this.sessionPrefix)) {
        Cookies.remove(key);
      }
    });

    // Clear httpOnly cookies via API
    await this.clearHttpOnlyCookies();
  }

  /**
   * Set httpOnly cookie via API
   */
  private async setHttpOnlyCookie(
    key: string,
    value: string,
    options: SecureStorageOptions
  ): Promise<void> {
    const response = await fetch('/api/auth/cookie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'set',
        key,
        value,
        options
      })
    });

    if (!response.ok) {
      throw new Error('Failed to set secure cookie');
    }
  }

  /**
   * Get httpOnly cookie via API
   */
  private async getHttpOnlyCookie(key: string): Promise<string | null> {
    try {
      const response = await fetch('/api/auth/cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'get',
          key
        })
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.value || null;
    } catch {
      return null;
    }
  }

  /**
   * Remove httpOnly cookie via API
   */
  private async removeHttpOnlyCookie(key: string): Promise<void> {
    await fetch('/api/auth/cookie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'remove',
        key
      })
    });
  }

  /**
   * Clear all httpOnly cookies via API
   */
  private async clearHttpOnlyCookies(): Promise<void> {
    await fetch('/api/auth/cookie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'clear'
      })
    });
  }

  /**
   * Set session storage (non-persistent)
   */
  setSessionItem(key: string, value: string): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(this.sessionPrefix + key, value);
    }
  }

  /**
   * Get session storage
   */
  getSessionItem(key: string): string | null {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return sessionStorage.getItem(this.sessionPrefix + key);
    }
    return null;
  }

  /**
   * Remove session storage
   */
  removeSessionItem(key: string): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(this.sessionPrefix + key);
    }
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    try {
      const testKey = '__test_storage';
      const testValue = 'test';
      
      Cookies.set(testKey, testValue);
      const retrieved = Cookies.get(testKey);
      Cookies.remove(testKey);
      
      return retrieved === testValue;
    } catch {
      return false;
    }
  }

  /**
   * Get storage size (approximate)
   */
  getStorageSize(): number {
    let totalSize = 0;
    
    // Calculate cookie sizes
    const allCookies = Cookies.get();
    Object.entries(allCookies).forEach(([key, value]) => {
      if (key.startsWith(this.cookiePrefix) || key.startsWith(this.sessionPrefix)) {
        totalSize += key.length + value.length;
      }
    });
    
    // Calculate session storage size
    if (typeof window !== 'undefined' && window.sessionStorage) {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.sessionPrefix)) {
          const value = sessionStorage.getItem(key);
          if (value) {
            totalSize += key.length + value.length;
          }
        }
      }
    }
    
    return totalSize;
  }

  /**
   * Export storage data (for debugging)
   */
  async exportData(): Promise<Record<string, any>> {
    const data: Record<string, any> = {
      cookies: {},
      session: {},
      memory: {}
    };
    
    // Export cookies
    const allCookies = Cookies.get();
    Object.entries(allCookies).forEach(([key, value]) => {
      if (key.startsWith(this.cookiePrefix)) {
        data['cookies'][key] = value;
      }
    });
    
    // Export session storage
    if (typeof window !== 'undefined' && window.sessionStorage) {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.sessionPrefix)) {
          data['session'][key] = sessionStorage.getItem(key);
        }
      }
    }
    
    // Export memory cache
    this.memoryCache.forEach((value, key) => {
      data['memory'][key] = value;
    });
    
    return data;
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Export utilities for testing
export { EncryptionUtil };