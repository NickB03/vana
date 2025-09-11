/**
 * Authentication utilities for Vana AI Research Platform
 * 
 * Provides secure JWT token management, authentication state handling,
 * and integration with the Google ADK backend authentication system.
 */

import { jwtDecode } from 'jwt-decode';
import { apiService } from './api-client';

// ============================================================================
// Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  last_login: string | null;
  profile?: {
    avatar_url?: string;
    bio?: string;
    location?: string;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in?: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

export interface DecodedToken {
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

// ============================================================================
// Token Storage Utilities
// ============================================================================

const TOKEN_KEYS = {
  ACCESS: 'vana_auth_token',
  REFRESH: 'vana_refresh_token',
  USER: 'vana_user_data',
} as const;

/**
 * Secure token storage with automatic cleanup
 */
export class TokenStorage {
  /**
   * Store authentication tokens securely
   */
  static setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(TOKEN_KEYS.ACCESS, tokens.access_token);
      localStorage.setItem(TOKEN_KEYS.REFRESH, tokens.refresh_token);
    } catch (error) {
      console.error('Failed to store authentication tokens:', error);
      // Fallback to sessionStorage if localStorage fails
      try {
        sessionStorage.setItem(TOKEN_KEYS.ACCESS, tokens.access_token);
        sessionStorage.setItem(TOKEN_KEYS.REFRESH, tokens.refresh_token);
      } catch {
        console.error('Failed to store tokens in sessionStorage as well');
      }
    }
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    return (
      localStorage.getItem(TOKEN_KEYS.ACCESS) ||
      sessionStorage.getItem(TOKEN_KEYS.ACCESS)
    );
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    return (
      localStorage.getItem(TOKEN_KEYS.REFRESH) ||
      sessionStorage.getItem(TOKEN_KEYS.REFRESH)
    );
  }

  /**
   * Store user data
   */
  static setUser(user: User): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user data:', error);
      try {
        sessionStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
      } catch {
        console.error('Failed to store user data in sessionStorage');
      }
    }
  }

  /**
   * Get stored user data
   */
  static getUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const userData = 
        localStorage.getItem(TOKEN_KEYS.USER) ||
        sessionStorage.getItem(TOKEN_KEYS.USER);
      
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  static clear(): void {
    if (typeof window === 'undefined') return;
    
    Object.values(TOKEN_KEYS).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    const token = TokenStorage.getAccessToken();
    if (!token) return false;
    
    try {
      const decoded: DecodedToken = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp > now;
    } catch {
      return false;
    }
  }

  /**
   * Check if token is expired or will expire soon (within 5 minutes)
   */
  static isTokenExpiringSoon(): boolean {
    const token = TokenStorage.getAccessToken();
    if (!token) return true;
    
    try {
      const decoded: DecodedToken = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60;
      return decoded.exp <= now + fiveMinutes;
    } catch {
      return true;
    }
  }
}

// ============================================================================
// Authentication Service
// ============================================================================

export class AuthService {
  private static refreshPromise: Promise<boolean> | null = null;

  /**
   * Login with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Use form data for OAuth2 compliance
      const formData = new URLSearchParams();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);
      formData.append('grant_type', 'password');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const authResponse: AuthResponse = await response.json();
      
      // Store tokens and user data
      TokenStorage.setTokens(authResponse.tokens);
      TokenStorage.setUser(authResponse.user);
      
      return authResponse;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const authResponse: AuthResponse = await response.json();
      
      // Store tokens and user data
      TokenStorage.setTokens(authResponse.tokens);
      TokenStorage.setUser(authResponse.user);
      
      return authResponse;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      const refreshToken = TokenStorage.getRefreshToken();
      
      if (refreshToken) {
        // Call logout endpoint to revoke tokens
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TokenStorage.getAccessToken()}`,
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        });
        
        // Don't throw on logout errors - always clear local storage
        if (!response.ok) {
          console.warn('Server logout failed, but continuing with local cleanup');
        }
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      // Always clear local storage
      TokenStorage.clear();
    }
  }

  /**
   * Get current user from /auth/me endpoint
   */
  static async getCurrentUser(): Promise<User> {
    const token = TokenStorage.getAccessToken();
    if (!token) {
      throw new Error('No authentication token');
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const user: User = await response.json();
    TokenStorage.setUser(user); // Update cached user data
    return user;
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<boolean> {
    // Prevent multiple simultaneous refresh requests
    if (AuthService.refreshPromise) {
      return AuthService.refreshPromise;
    }

    AuthService.refreshPromise = (async () => {
      try {
        const refreshToken = TokenStorage.getRefreshToken();
        if (!refreshToken) {
          return false;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        });

        if (!response.ok) {
          TokenStorage.clear();
          return false;
        }

        const tokens: AuthTokens = await response.json();
        TokenStorage.setTokens(tokens);
        return true;
      } catch (error) {
        console.error('Token refresh failed:', error);
        TokenStorage.clear();
        return false;
      } finally {
        AuthService.refreshPromise = null;
      }
    })();

    return AuthService.refreshPromise;
  }

  /**
   * Automatically refresh token if needed
   */
  static async ensureValidToken(): Promise<boolean> {
    if (!TokenStorage.isAuthenticated()) {
      return false;
    }

    if (TokenStorage.isTokenExpiringSoon()) {
      return await AuthService.refreshToken();
    }

    return true;
  }
}
