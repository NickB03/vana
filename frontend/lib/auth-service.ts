/**
 * Authentication Service
 * 
 * Core service for handling authentication operations including:
 * - JWT token management and validation
 * - Secure storage of authentication data
 * - API communication for auth endpoints
 * - Token refresh and expiry handling
 * - User session management
 */

import { apiClient } from '@/lib/api-client';
import { z } from 'zod';

// ============================================================================
// Types and Schemas
// ============================================================================

const AuthResponseSchema = z.object({
  user: z.object({
    id: z.union([z.string(), z.number()]).transform(String),
    email: z.string().email(),
    username: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    is_active: z.boolean().optional(),
    is_verified: z.boolean().optional(),
    is_superuser: z.boolean().optional(),
    google_cloud_identity: z.string().nullable().optional(),
    last_login: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    roles: z.array(z.object({
      id: z.number(),
      name: z.string(),
      description: z.string().optional(),
      is_active: z.boolean().optional(),
      created_at: z.string().optional(),
      permissions: z.array(z.object({
        id: z.number(),
        name: z.string(),
        description: z.string().optional(),
        resource: z.string(),
        action: z.string(),
        created_at: z.string().optional(),
      })).optional(),
    })).optional(),
  }),
  tokens: z.object({
    access_token: z.string(),
    refresh_token: z.string(),
    token_type: z.string().default('bearer'),
    expires_in: z.number(),
  }),
});

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
  lastLogin: z.string().optional(),
  isEmailVerified: z.boolean().optional(),
  preferences: z.record(z.any()).optional(),
});

export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type User = z.infer<typeof UserSchema>;

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  TOKEN: 'vana_auth_token',
  USER: 'vana_user_data',
  REFRESH_TOKEN: 'vana_refresh_token',
  TOKEN_EXPIRY: 'vana_token_expiry',
  REMEMBER_ME: 'vana_remember_me',
} as const;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely parse JSON from storage
 */
function parseStorageJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Get storage instance based on remember me preference
 */
function getStorage(): Storage {
  if (typeof window === 'undefined') {
    // Server-side fallback
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      length: 0,
      key: () => null,
    };
  }

  const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
  return rememberMe ? localStorage : sessionStorage;
}

/**
 * Validate JWT token structure
 */
function isValidJWT(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decode header and payload to verify structure
    const header = JSON.parse(atob(parts[0]));
    const payload = JSON.parse(atob(parts[1]));

    return header.typ === 'JWT' && payload.exp && payload.iat;
  } catch {
    return false;
  }
}

/**
 * Decode JWT payload
 */
function decodeJWT(token: string): { exp?: number; [key: string]: unknown } {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp <= currentTime;
}

// ============================================================================
// AuthService Implementation
// ============================================================================

export class AuthService {
  /**
   * Login with email and password
   */
  static async login(email: string, password: string, rememberMe = false): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', {
        email,
        password,
      }, {
        schema: AuthResponseSchema,
      });

      // Store authentication data
      this.setRememberMe(rememberMe);
      this.setToken(response.tokens.access_token);
      this.setUser(response.user);
      
      if (response.tokens.refresh_token) {
        this.setRefreshToken(response.tokens.refresh_token);
      }

      // Calculate and store token expiry
      const expiryTime = Date.now() + (response.tokens.expires_in * 1000);
      this.setTokenExpiry(expiryTime);

      return response;
    } catch (error) {
      // Clear any partial authentication state
      this.clearAuthData();
      throw error;
    }
  }

  /**
   * Logout and clear authentication data
   */
  static async logout(): Promise<void> {
    try {
      // Attempt to notify server of logout
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with local logout even if server call fails
      console.warn('Server logout failed:', error);
    } finally {
      // Always clear local authentication data
      this.clearAuthData();
    }
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<{ message: string; user: User }> {
    if (data.password !== data.confirmPassword) {
      throw new Error('Passwords do not match');
    }

    return await apiClient.post('/auth/register', {
      name: data.name,
      email: data.email,
      password: data.password,
    });
  }

  /**
   * Refresh authentication token
   */
  static async refreshToken(): Promise<string> {
    const currentToken = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (!currentToken) {
      throw new Error('No token to refresh');
    }

    try {
      const response = await apiClient.post('/auth/refresh', {
        refresh_token: refreshToken,
      }, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      const newToken = response.access_token;
      
      // Update stored token
      this.setToken(newToken);
      
      // Update expiry time
      if (response.expires_in) {
        const expiryTime = Date.now() + (response.expires_in * 1000);
        this.setTokenExpiry(expiryTime);
      }

      return newToken;
    } catch (error) {
      // On refresh failure, clear auth data
      this.clearAuthData();
      throw error;
    }
  }

  /**
   * Validate token with server
   */
  static async validateToken(token?: string): Promise<boolean> {
    const tokenToValidate = token || this.getToken();
    
    if (!tokenToValidate) return false;
    
    // Check JWT structure first
    if (!isValidJWT(tokenToValidate)) return false;
    
    // Check if token is expired
    if (isTokenExpired(tokenToValidate)) return false;

    try {
      await apiClient.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current authentication status
   */
  static isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    
    // Basic validation without server call
    return isValidJWT(token) && !isTokenExpired(token);
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<{ message: string }> {
    return await apiClient.post('/auth/reset-password', { email });
  }

  /**
   * Confirm password reset with token
   */
  static async confirmPasswordReset(token: string, password: string): Promise<{ message: string }> {
    return await apiClient.post('/auth/reset-password/confirm', {
      token,
      password,
    });
  }

  /**
   * Verify email with token
   */
  static async verifyEmail(token: string): Promise<{ message: string }> {
    return await apiClient.post('/auth/verify-email', { token });
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await apiClient.get('/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      schema: UserSchema,
    });

    // Update stored user data
    this.setUser(response);
    
    return response;
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: Partial<User>): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await apiClient.put('/auth/profile', updates, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      schema: UserSchema,
    });

    // Update stored user data
    this.setUser(response);
    
    return response;
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  /**
   * Get stored authentication token
   */
  static getToken(): string | null {
    return getStorage().getItem(STORAGE_KEYS.TOKEN);
  }

  /**
   * Set authentication token
   */
  static setToken(token: string): void {
    getStorage().setItem(STORAGE_KEYS.TOKEN, token);
    
    // Also set as HTTP-only cookie for middleware
    if (typeof document !== 'undefined') {
      // Set secure cookie for middleware access
      const isSecure = window.location.protocol === 'https:';
      const expiry = new Date();
      expiry.setTime(expiry.getTime() + (30 * 60 * 1000)); // 30 minutes
      
      document.cookie = `vana_auth_token=${token}; expires=${expiry.toUTCString()}; path=/; ${isSecure ? 'secure; ' : ''}samesite=strict`;
    }
  }

  /**
   * Get stored refresh token
   */
  static getRefreshToken(): string | null {
    return getStorage().getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * Set refresh token
   */
  static setRefreshToken(token: string): void {
    getStorage().setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  /**
   * Get token expiry timestamp
   */
  static getTokenExpiry(): number | null {
    const expiry = getStorage().getItem(STORAGE_KEYS.TOKEN_EXPIRY);
    return expiry ? parseInt(expiry, 10) : null;
  }

  /**
   * Set token expiry timestamp
   */
  static setTokenExpiry(timestamp: number): void {
    getStorage().setItem(STORAGE_KEYS.TOKEN_EXPIRY, timestamp.toString());
  }

  // ============================================================================
  // User Management
  // ============================================================================

  /**
   * Get stored user data
   */
  static getUser(): User | null {
    const userData = getStorage().getItem(STORAGE_KEYS.USER);
    if (!userData) return null;

    try {
      const parsed = JSON.parse(userData);
      return UserSchema.parse(parsed);
    } catch {
      // Clear invalid user data
      getStorage().removeItem(STORAGE_KEYS.USER);
      return null;
    }
  }

  /**
   * Set user data
   */
  static setUser(user: User): void {
    getStorage().setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  // ============================================================================
  // Storage Management
  // ============================================================================

  /**
   * Set remember me preference
   */
  static setRememberMe(remember: boolean): void {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, remember.toString());
  }

  /**
   * Get remember me preference
   */
  static getRememberMe(): boolean {
    return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
  }

  /**
   * Clear all authentication data
   */
  static clearAuthData(): void {
    // Clear from both storage types to ensure complete cleanup
    [localStorage, sessionStorage].forEach(storage => {
      Object.values(STORAGE_KEYS).forEach(key => {
        storage.removeItem(key);
      });
    });
    
    // Clear the auth cookie as well
    if (typeof document !== 'undefined') {
      document.cookie = 'vana_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; samesite=strict';
    }
  }

  // ============================================================================
  // Permission Helpers
  // ============================================================================

  /**
   * Check if current user has specific role
   */
  static hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.roles?.includes(role) ?? false;
  }

  /**
   * Check if current user has specific permission
   */
  static hasPermission(permission: string): boolean {
    const user = this.getUser();
    return user?.permissions?.includes(permission) ?? false;
  }

  /**
   * Check if current user has any of the specified roles
   */
  static hasAnyRole(roles: string[]): boolean {
    const user = this.getUser();
    if (!user?.roles) return false;
    
    return roles.some(role => user.roles!.includes(role));
  }

  /**
   * Check if current user has all of the specified roles
   */
  static hasAllRoles(roles: string[]): boolean {
    const user = this.getUser();
    if (!user?.roles) return false;
    
    return roles.every(role => user.roles!.includes(role));
  }

  /**
   * Get user's roles
   */
  static getUserRoles(): string[] {
    const user = this.getUser();
    return user?.roles ?? [];
  }

  /**
   * Get user's permissions
   */
  static getUserPermissions(): string[] {
    const user = this.getUser();
    return user?.permissions ?? [];
  }
}

export default AuthService;