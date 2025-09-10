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
    
    // Set up automatic token refresh on 401 errors
    this.setupTokenRefreshHandler();
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
    if (!token.token) return true;
    
    try {
      const payload = JSON.parse(atob(token.token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      
      // Add 5 minute buffer for token refresh
      const bufferTime = 5 * 60 * 1000;
      return now >= (expiry - bufferTime);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return true; // If we can't decode, assume expired
    }
  }

  // ===== AUTHENTICATION METHODS =====

  async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      const response = await apiClient.login(credentials.email, credentials.password);
      
      // Transform Google ADK auth response to frontend format
      const token: AuthToken = {
        token: response.tokens.access_token,
        type: 'Bearer',
        expiresIn: response.tokens.expires_in || 1800, // 30 minutes default
        refreshToken: response.tokens.refresh_token,
      };

      // Transform Google ADK user response to frontend format
      const user: AuthUser = {
        id: response.user.id.toString(),
        email: response.user.email,
        displayName: this.getDisplayName(response.user),
        avatar: response.user.avatar,
        isVerified: response.user.is_verified || false,
        createdAt: new Date(response.user.created_at),
        lastLoginAt: new Date(response.user.last_login || Date.now()),
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
        ? this.transformApiError(error)
        : 'Login failed. Please check your credentials.';
      
      this.notifyListeners(errorMessage);
      throw error;
    }
  }

  private getDisplayName(user: { first_name?: string; last_name?: string; username?: string; email?: string }): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    if (user.username) {
      return user.username;
    }
    return user.email.split('@')[0];
  }

  private transformApiError(error: any): string {
    // Transform Google ADK error responses to user-friendly messages
    if (error.status === 401) {
      return 'Invalid email or password. Please try again.';
    }
    if (error.status === 409) {
      return 'An account with this email already exists.';
    }
    if (error.status === 400 && (error.message?.includes('password') || error.details?.includes('password'))) {
      return 'Password does not meet security requirements.';
    }
    if (error.status === 400 && error.message?.includes('invalid_grant')) {
      return 'Invalid credentials. Please check your email and password.';
    }
    return error.message || 'An error occurred. Please try again.';
  }

  async register(data: RegisterData): Promise<AuthUser> {
    try {
      // Transform frontend register data to Google ADK format
      const adkRegisterData = {
        email: data.email,
        username: data.email.split('@')[0], // Use email prefix as username
        password: data.password,
        first_name: data.displayName.split(' ')[0] || data.displayName,
        last_name: data.displayName.split(' ').slice(1).join(' ') || undefined,
      };
      
      const response = await apiClient.register(adkRegisterData);
      
      // Transform response and set auth state directly
      const token: AuthToken = {
        token: response.tokens.access_token,
        type: 'Bearer',
        expiresIn: response.tokens.expires_in || 1800,
        refreshToken: response.tokens.refresh_token,
      };

      const user: AuthUser = {
        id: response.user.id.toString(),
        email: response.user.email,
        displayName: this.getDisplayName(response.user),
        avatar: response.user.avatar,
        isVerified: response.user.is_verified || false,
        createdAt: new Date(response.user.created_at),
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
        ? this.transformApiError(error)
        : 'Registration failed. Please try again.';
      
      this.notifyListeners(errorMessage);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      // Try to logout on Google ADK backend with refresh token
      if (this.authToken?.refreshToken) {
        await apiClient.logout(this.authToken.refreshToken);
      }
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

      console.log('Refreshing authentication token...');
      const response = await apiClient.refreshToken(this.authToken.refreshToken);

      const newToken: AuthToken = {
        token: response.access_token,
        type: 'Bearer',
        expiresIn: response.expires_in || 1800,
        refreshToken: response.refresh_token || this.authToken.refreshToken,
      };

      this.authToken = newToken;
      
      if (this.currentUser) {
        this.storeAuth(newToken, this.currentUser);
      }
      
      apiClient.setAuthToken(newToken.token);
      this.notifyListeners();
      
      console.log('Token refreshed successfully');

    } catch (error) {
      console.error('Token refresh failed:', error);
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
      const response = await apiClient.getCurrentUser();
      
      const user: AuthUser = {
        id: response.id.toString(),
        email: response.email,
        displayName: this.getDisplayName(response),
        avatar: response.avatar,
        isVerified: response.is_verified || false,
        createdAt: new Date(response.created_at),
        lastLoginAt: new Date(response.last_login || Date.now()),
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

  // ===== AUTOMATIC TOKEN REFRESH =====

  private setupTokenRefreshHandler() {
    if (typeof window === 'undefined') return;

    // Listen for token expiration events from API client
    window.addEventListener('auth:token_expired', async (event: CustomEvent) => {
      if (!this.authToken?.refreshToken) {
        // No refresh token available, logout user
        await this.logout();
        return;
      }

      try {
        await this.refreshToken();
        console.log('Token automatically refreshed');
      } catch (error) {
        console.error('Automatic token refresh failed:', error);
        await this.logout();
      }
    });
  }

  /**
   * Validate current authentication state
   */
  async validateCurrentAuth(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      // Test the current token
      const isValid = await apiClient.validateAuth();
      if (!isValid) {
        // Token is invalid, try to refresh
        if (this.authToken?.refreshToken) {
          await this.refreshToken();
          return true;
        } else {
          // No refresh token, logout
          await this.logout();
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Auth validation failed:', error);
      return false;
    }
  }

  /**
   * Ensure user is authenticated before API calls
   */
  async ensureAuthenticated(): Promise<boolean> {
    if (this.isDevMode() && !this.isAuthenticated()) {
      this.createDevSession();
      return true;
    }

    return this.validateCurrentAuth();
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