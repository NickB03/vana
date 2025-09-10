/**
 * Authentication Integration for Vana Frontend
 * Integrates with FastAPI backend authentication system
 */

import { apiClient, ApiError, isApiError } from './api-client';
import { UserSession, UserPreferences } from '../types/chat';

// ===== AUTHENTICATION TYPES =====

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthToken {
  token: string;
  type: 'Bearer';
  expiresIn: number;
  refreshToken?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  token: AuthToken | null;
  error: string | null;
}

// ===== STORAGE KEYS =====

const AUTH_TOKEN_KEY = 'vana_auth_token';
const AUTH_USER_KEY = 'vana_auth_user';
const REFRESH_TOKEN_KEY = 'vana_refresh_token';

// ===== AUTHENTICATION SERVICE =====

export class AuthService {
  private static instance: AuthService;
  private currentUser: AuthUser | null = null;
  private authToken: AuthToken | null = null;
  private listeners: Set<(state: AuthState) => void> = new Set();

  private constructor() {
    // Load existing auth from localStorage on initialization
    this.loadStoredAuth();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // ===== STATE MANAGEMENT =====

  getAuthState(): AuthState {
    return {
      isAuthenticated: !!this.currentUser && !!this.authToken,
      isLoading: false,
      user: this.currentUser,
      token: this.authToken,
      error: null,
    };
  }

  addListener(listener: (state: AuthState) => void) {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.getAuthState());
  }

  removeListener(listener: (state: AuthState) => void) {
    this.listeners.delete(listener);
  }

  private notifyListeners(error?: string | null) {
    const state: AuthState = {
      ...this.getAuthState(),
      error: error || null,
    };
    
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    });
  }

  // ===== STORAGE HELPERS =====

  private loadStoredAuth() {
    try {
      if (typeof window === 'undefined') return;

      const tokenData = localStorage.getItem(AUTH_TOKEN_KEY);
      const userData = localStorage.getItem(AUTH_USER_KEY);

      if (tokenData && userData) {
        this.authToken = JSON.parse(tokenData);
        this.currentUser = JSON.parse(userData);

        // Check if token is expired
        if (this.authToken && this.isTokenExpired(this.authToken)) {
          this.clearStoredAuth();
          this.authToken = null;
          this.currentUser = null;
        } else if (this.authToken) {
          // Set token in API client
          apiClient.setAuthToken(this.authToken.token);
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
      this.clearStoredAuth();
    }
  }

  private storeAuth(token: AuthToken, user: AuthUser) {
    try {
      if (typeof window === 'undefined') return;

      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(token));
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      
      if (token.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token.refreshToken);
      }
    } catch (error) {
      console.error('Error storing auth:', error);
    }
  }

  private clearStoredAuth() {
    try {
      if (typeof window === 'undefined') return;

      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing stored auth:', error);
    }
  }

  private isTokenExpired(token: AuthToken): boolean {
    if (!token.expiresIn) return false;
    
    try {
      const payload = JSON.parse(atob(token.token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= expiry;
    } catch {
      return true; // If we can't decode, assume expired
    }
  }

  // ===== AUTHENTICATION METHODS =====

  async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      const response = await apiClient.login(credentials.email, credentials.password);
      
      // Create auth token from response
      const token: AuthToken = {
        token: response.token,
        type: 'Bearer',
        expiresIn: 3600, // Default 1 hour
        refreshToken: response.refreshToken,
      };

      // Create user from response
      const user: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        displayName: response.user.displayName,
        avatar: response.user.avatar,
        isVerified: response.user.isVerified || false,
        createdAt: new Date(response.user.createdAt),
        lastLoginAt: new Date(),
      };

      // Store auth state
      this.authToken = token;
      this.currentUser = user;
      this.storeAuth(token, user);
      
      // Set token in API client
      apiClient.setAuthToken(token.token);
      
      this.notifyListeners();
      return user;

    } catch (error) {
      const errorMessage = isApiError(error) 
        ? error.message 
        : 'Login failed. Please check your credentials.';
      
      this.notifyListeners(errorMessage);
      throw error;
    }
  }

  async register(data: RegisterData): Promise<AuthUser> {
    try {
      const response = await apiClient.post('/auth/register', data);
      
      // Auto-login after successful registration
      return await this.login({
        email: data.email,
        password: data.password,
      });

    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : 'Registration failed. Please try again.';
      
      this.notifyListeners(errorMessage);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Try to logout on server
      await apiClient.logout();
    } catch (error) {
      // Don't throw on logout errors, just log them
      console.warn('Server logout failed:', error);
    } finally {
      // Always clear local auth state
      this.currentUser = null;
      this.authToken = null;
      this.clearStoredAuth();
      apiClient.clearAuth();
      this.notifyListeners();
    }
  }

  async refreshToken(): Promise<void> {
    try {
      if (!this.authToken?.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post('/auth/refresh', {
        refreshToken: this.authToken.refreshToken,
      });

      const newToken: AuthToken = {
        token: response.token,
        type: 'Bearer',
        expiresIn: response.expiresIn || 3600,
        refreshToken: response.refreshToken || this.authToken.refreshToken,
      };

      this.authToken = newToken;
      
      if (this.currentUser) {
        this.storeAuth(newToken, this.currentUser);
      }
      
      apiClient.setAuthToken(newToken.token);
      this.notifyListeners();

    } catch (error) {
      // If refresh fails, logout the user
      await this.logout();
      throw error;
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    if (!this.authToken) {
      return null;
    }

    try {
      const response = await apiClient.get('/auth/me');
      
      const user: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        displayName: response.user.displayName,
        avatar: response.user.avatar,
        isVerified: response.user.isVerified || false,
        createdAt: new Date(response.user.createdAt),
        lastLoginAt: new Date(response.user.lastLoginAt),
      };

      this.currentUser = user;
      
      if (this.authToken) {
        this.storeAuth(this.authToken, user);
      }
      
      this.notifyListeners();
      return user;

    } catch (error) {
      // If getting current user fails, clear auth
      await this.logout();
      throw error;
    }
  }

  async updateUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      await apiClient.patch('/auth/preferences', preferences);
      this.notifyListeners();
    } catch (error) {
      const errorMessage = isApiError(error)
        ? error.message
        : 'Failed to update preferences';
      
      this.notifyListeners(errorMessage);
      throw error;
    }
  }

  // ===== TOKEN MANAGEMENT =====

  getToken(): string | null {
    return this.authToken?.token || null;
  }

  isAuthenticated(): boolean {
    return !!(this.currentUser && this.authToken && !this.isTokenExpired(this.authToken));
  }

  // ===== DEV MODE HELPERS =====

  /**
   * For development/demo purposes - create a mock authenticated session
   */
  createDevSession(): void {
    const mockUser: AuthUser = {
      id: 'dev-user',
      email: 'demo@vana.ai',
      displayName: 'Demo User',
      avatar: undefined,
      isVerified: true,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    const mockToken: AuthToken = {
      token: 'dev-token-' + Date.now(),
      type: 'Bearer',
      expiresIn: 86400, // 24 hours
    };

    this.currentUser = mockUser;
    this.authToken = mockToken;
    this.storeAuth(mockToken, mockUser);
    apiClient.setAuthToken(mockToken.token);
    this.notifyListeners();
  }

  /**
   * Check if development mode is enabled
   */
  isDevMode(): boolean {
    return process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH === 'false' ||
           process.env.NODE_ENV === 'development';
  }
}

// ===== SINGLETON INSTANCE =====

export const authService = AuthService.getInstance();

// ===== REACT HOOK =====

import { useEffect, useState } from 'react';

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => authService.getAuthState());

  useEffect(() => {
    authService.addListener(setState);
    return () => authService.removeListener(setState);
  }, []);

  return {
    ...state,
    login: authService.login.bind(authService),
    register: authService.register.bind(authService),
    logout: authService.logout.bind(authService),
    refreshToken: authService.refreshToken.bind(authService),
    getCurrentUser: authService.getCurrentUser.bind(authService),
    updatePreferences: authService.updateUserPreferences.bind(authService),
    createDevSession: authService.createDevSession.bind(authService),
    isDevMode: authService.isDevMode.bind(authService),
  };
}

// ===== UTILITY FUNCTIONS =====

/**
 * Auto-setup auth for development
 */
export function setupDevAuth(): void {
  if (authService.isDevMode() && !authService.isAuthenticated()) {
    console.log('Setting up development auth session');
    authService.createDevSession();
  }
}

/**
 * Auth guard for protected routes
 */
export function requireAuth(): AuthUser | null {
  const authState = authService.getAuthState();
  
  if (!authState.isAuthenticated) {
    if (authService.isDevMode()) {
      authService.createDevSession();
      return authService.getAuthState().user;
    }
    return null;
  }
  
  return authState.user;
}

export default authService;