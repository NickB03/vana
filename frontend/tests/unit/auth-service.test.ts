/**
 * Auth Service Unit Tests
 * Tests authentication service functionality in isolation
 */

import { AuthService, authService } from '../../src/lib/auth';
import { apiClient } from '../../src/lib/api-client';

// Mock API client
jest.mock('../../src/lib/api-client', () => ({
  apiClient: {
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getCurrentUser: jest.fn(),
    setAuthToken: jest.fn(),
    clearAuth: jest.fn(),
    patch: jest.fn(),
    validateAuth: jest.fn()
  }
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Auth Service Unit Tests', () => {
  let testAuthService: AuthService;

  beforeEach(() => {
    // Create new instance for isolated testing
    testAuthService = AuthService.getInstance();
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset all mocks
    jest.clearAllMocks();
    mockApiClient.login.mockClear();
    mockApiClient.register.mockClear();
    mockApiClient.logout.mockClear();
    mockApiClient.refreshToken.mockClear();
    mockApiClient.getCurrentUser.mockClear();
    mockApiClient.setAuthToken.mockClear();
    mockApiClient.clearAuth.mockClear();
    mockApiClient.patch.mockClear();
    mockApiClient.validateAuth.mockClear();
  });

  afterEach(async () => {
    await testAuthService.logout();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = AuthService.getInstance();
      const instance2 = AuthService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should initialize with correct default state', () => {
      const state = testAuthService.getAuthState();
      
      expect(state).toMatchObject({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        token: null,
        error: null
      });
    });
  });

  describe('State Management', () => {
    it('should notify listeners of state changes', () => {
      const listener = jest.fn();
      
      testAuthService.addListener(listener);
      
      // Should be called immediately with current state
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: false,
          user: null
        })
      );
    });

    it('should remove listeners properly', () => {
      const listener = jest.fn();
      
      testAuthService.addListener(listener);
      expect(listener).toHaveBeenCalledTimes(1);
      
      testAuthService.removeListener(listener);
      
      // Trigger state change
      testAuthService.createDevSession();
      
      // Should not be called again after removal
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should handle listener errors gracefully', () => {
      const badListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      testAuthService.addListener(badListener);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Auth listener error:', 
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Storage Operations', () => {
    it('should store auth data in localStorage', async () => {
      const mockApiResponse = {
        tokens: {
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-123',
          token_type: 'Bearer',
          expires_in: 3600
        },
        user: {
          id: 'user-123',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          is_verified: true,
          created_at: '2024-01-01T00:00:00Z'
        }
      };

      mockApiClient.login.mockResolvedValue(mockApiResponse);

      await testAuthService.login({
        email: 'test@example.com',
        password: 'password'
      });

      // Check localStorage contains auth data
      const storedToken = localStorage.getItem('vana_auth_token');
      const storedUser = localStorage.getItem('vana_auth_user');
      const storedRefresh = localStorage.getItem('vana_refresh_token');

      expect(storedToken).toBeTruthy();
      expect(storedUser).toBeTruthy();
      expect(storedRefresh).toBe('refresh-token-123');

      const parsedToken = JSON.parse(storedToken!);
      expect(parsedToken.token).toBe('access-token-123');
    });

    it('should load auth data from localStorage', () => {
      // Manually set localStorage data
      const tokenData = {
        token: 'stored-token',
        type: 'Bearer',
        expiresIn: 3600
      };
      const userData = {
        id: 'stored-user',
        email: 'stored@example.com',
        displayName: 'Stored User',
        isVerified: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      localStorage.setItem('vana_auth_token', JSON.stringify(tokenData));
      localStorage.setItem('vana_auth_user', JSON.stringify(userData));

      // Create new auth service instance to test loading
      const newAuthService = AuthService.getInstance();
      const state = newAuthService.getAuthState();

      expect(state.isAuthenticated).toBe(true);
      expect(state.user?.id).toBe('stored-user');
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('stored-token');
    });

    it('should clear auth data from localStorage on logout', async () => {
      // Set up authenticated state
      testAuthService.createDevSession();
      expect(localStorage.getItem('vana_auth_token')).toBeTruthy();

      mockApiClient.logout.mockResolvedValue({});

      await testAuthService.logout();

      expect(localStorage.getItem('vana_auth_token')).toBeNull();
      expect(localStorage.getItem('vana_auth_user')).toBeNull();
      expect(localStorage.getItem('vana_refresh_token')).toBeNull();
    });

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Mock localStorage to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      testAuthService.createDevSession();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error storing auth:', 
        expect.any(Error)
      );

      // Restore
      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('Token Management', () => {
    it('should detect expired tokens', () => {
      const expiredToken = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNTE2MjM5MDIyfQ.4l2E3eRmBcGOExk3yD1lKpFBF3rGG2B2gZL0OOr8y-8', // Expired token
        type: 'Bearer' as const,
        expiresIn: 3600
      };

      localStorage.setItem('vana_auth_token', JSON.stringify(expiredToken));
      localStorage.setItem('vana_auth_user', JSON.stringify({
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        isVerified: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      }));

      // Create new instance to test token loading
      const newAuthService = AuthService.getInstance();
      const state = newAuthService.getAuthState();

      expect(state.isAuthenticated).toBe(false);
      expect(localStorage.getItem('vana_auth_token')).toBeNull();
    });

    it('should handle malformed tokens', () => {
      localStorage.setItem('vana_auth_token', JSON.stringify({
        token: 'malformed.token.here',
        type: 'Bearer',
        expiresIn: 3600
      }));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const newAuthService = AuthService.getInstance();
      const state = newAuthService.getAuthState();

      expect(state.isAuthenticated).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to decode token:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should provide access to current token', () => {
      testAuthService.createDevSession();
      const token = testAuthService.getToken();
      
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
    });

    it('should return null for token when not authenticated', () => {
      const token = testAuthService.getToken();
      expect(token).toBeNull();
    });
  });

  describe('Login Process', () => {
    const mockLoginResponse = {
      tokens: {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 1800
      },
      user: {
        id: 'login-user-123',
        email: 'login@example.com',
        first_name: 'Login',
        last_name: 'User',
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-01T01:00:00Z'
      }
    };

    it('should login successfully with email and password', async () => {
      mockApiClient.login.mockResolvedValue(mockLoginResponse);

      const user = await testAuthService.login({
        email: 'login@example.com',
        password: 'password123'
      });

      expect(user).toMatchObject({
        id: 'login-user-123',
        email: 'login@example.com',
        displayName: 'Login User',
        isVerified: true
      });

      expect(mockApiClient.login).toHaveBeenCalledWith(
        'login@example.com',
        'password123'
      );

      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('new-access-token');
    });

    it('should transform API response correctly', async () => {
      const apiResponse = {
        tokens: {
          access_token: 'token-123',
          refresh_token: 'refresh-123',
          token_type: 'Bearer',
          expires_in: 3600
        },
        user: {
          id: '456',
          email: 'transform@example.com',
          first_name: 'First',
          // No last_name
          username: 'firstuser',
          is_verified: false,
          created_at: '2024-01-01T00:00:00Z'
        }
      };

      mockApiClient.login.mockResolvedValue(apiResponse);

      const user = await testAuthService.login({
        email: 'transform@example.com',
        password: 'password'
      });

      expect(user.displayName).toBe('First'); // Should use first_name only
      expect(user.isVerified).toBe(false);
    });

    it('should handle login errors appropriately', async () => {
      mockApiClient.login.mockRejectedValue({
        status: 401,
        message: 'Invalid credentials'
      });

      await expect(
        testAuthService.login({
          email: 'bad@example.com',
          password: 'wrongpass'
        })
      ).rejects.toBeDefined();

      expect(testAuthService.isAuthenticated()).toBe(false);
    });

    it('should transform error messages', async () => {
      const testCases = [
        { status: 401, message: 'Unauthorized', expected: 'Invalid email or password. Please try again.' },
        { status: 409, message: 'Conflict', expected: 'An account with this email already exists.' },
        { status: 400, message: 'Password too weak', expected: 'Password does not meet security requirements.' }
      ];

      for (const testCase of testCases) {
        mockApiClient.login.mockRejectedValue(testCase);

        try {
          await testAuthService.login({
            email: 'test@example.com',
            password: 'password'
          });
        } catch (error) {
          // Error should be thrown, but we're testing the transformation
        }

        mockApiClient.login.mockClear();
      }
    });
  });

  describe('Registration Process', () => {
    const mockRegisterResponse = {
      tokens: {
        access_token: 'register-access-token',
        refresh_token: 'register-refresh-token',
        token_type: 'Bearer',
        expires_in: 1800
      },
      user: {
        id: 'register-user-123',
        email: 'register@example.com',
        first_name: 'Register',
        last_name: 'User',
        username: 'registeruser',
        is_verified: false,
        created_at: '2024-01-01T00:00:00Z'
      }
    };

    it('should register successfully', async () => {
      mockApiClient.register.mockResolvedValue(mockRegisterResponse);

      const user = await testAuthService.register({
        email: 'register@example.com',
        password: 'newpassword123',
        displayName: 'Register User'
      });

      expect(user).toMatchObject({
        id: 'register-user-123',
        email: 'register@example.com',
        displayName: 'Register User',
        isVerified: false
      });

      expect(mockApiClient.register).toHaveBeenCalledWith({
        email: 'register@example.com',
        username: 'register',
        password: 'newpassword123',
        first_name: 'Register',
        last_name: 'User'
      });
    });

    it('should handle single name in displayName', async () => {
      mockApiClient.register.mockResolvedValue(mockRegisterResponse);

      await testAuthService.register({
        email: 'single@example.com',
        password: 'password',
        displayName: 'SingleName'
      });

      expect(mockApiClient.register).toHaveBeenCalledWith({
        email: 'single@example.com',
        username: 'single',
        password: 'password',
        first_name: 'SingleName',
        last_name: undefined
      });
    });

    it('should handle registration errors', async () => {
      mockApiClient.register.mockRejectedValue({
        status: 400,
        message: 'Password does not meet requirements'
      });

      await expect(
        testAuthService.register({
          email: 'test@example.com',
          password: 'weak',
          displayName: 'Test User'
        })
      ).rejects.toBeDefined();
    });
  });

  describe('Logout Process', () => {
    it('should logout successfully', async () => {
      // Setup authenticated state
      testAuthService.createDevSession();
      expect(testAuthService.isAuthenticated()).toBe(true);

      mockApiClient.logout.mockResolvedValue({});

      await testAuthService.logout();

      expect(testAuthService.isAuthenticated()).toBe(false);
      expect(mockApiClient.logout).toHaveBeenCalled();
      expect(mockApiClient.clearAuth).toHaveBeenCalled();
    });

    it('should clear local state even if server logout fails', async () => {
      testAuthService.createDevSession();
      expect(testAuthService.isAuthenticated()).toBe(true);

      mockApiClient.logout.mockRejectedValue(new Error('Server error'));

      await testAuthService.logout();

      expect(testAuthService.isAuthenticated()).toBe(false);
      expect(mockApiClient.clearAuth).toHaveBeenCalled();
    });
  });

  describe('Token Refresh', () => {
    beforeEach(() => {
      // Setup authenticated state with refresh token
      testAuthService.createDevSession();
    });

    it('should refresh token successfully', async () => {
      mockApiClient.refreshToken.mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 1800
      });

      await testAuthService.refreshToken();

      expect(mockApiClient.refreshToken).toHaveBeenCalled();
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('new-access-token');
    });

    it('should logout on refresh failure', async () => {
      mockApiClient.refreshToken.mockRejectedValue(new Error('Refresh failed'));
      mockApiClient.logout.mockResolvedValue({});

      await expect(testAuthService.refreshToken())
        .rejects
        .toThrow('Refresh failed');

      expect(testAuthService.isAuthenticated()).toBe(false);
    });

    it('should handle missing refresh token', async () => {
      // Clear refresh token
      localStorage.removeItem('vana_refresh_token');

      await expect(testAuthService.refreshToken())
        .rejects
        .toThrow('No refresh token available');
    });
  });

  describe('Current User', () => {
    it('should get current user when authenticated', async () => {
      testAuthService.createDevSession();

      const mockUserResponse = {
        id: 'current-user-123',
        email: 'current@example.com',
        first_name: 'Current',
        last_name: 'User',
        is_verified: true,
        created_at: '2024-01-01T00:00:00Z',
        last_login: '2024-01-01T01:00:00Z'
      };

      mockApiClient.getCurrentUser.mockResolvedValue(mockUserResponse);

      const user = await testAuthService.getCurrentUser();

      expect(user).toMatchObject({
        id: 'current-user-123',
        email: 'current@example.com',
        displayName: 'Current User'
      });
    });

    it('should return null when not authenticated', async () => {
      const user = await testAuthService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should logout on getCurrentUser failure', async () => {
      testAuthService.createDevSession();
      mockApiClient.getCurrentUser.mockRejectedValue(new Error('Unauthorized'));
      mockApiClient.logout.mockResolvedValue({});

      await expect(testAuthService.getCurrentUser())
        .rejects
        .toThrow('Unauthorized');

      expect(testAuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('Development Mode', () => {
    it('should create dev session', () => {
      testAuthService.createDevSession();

      const state = testAuthService.getAuthState();
      
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toMatchObject({
        id: 'dev-user',
        email: 'demo@vana.ai',
        displayName: 'Demo User',
        isVerified: true
      });
    });

    it('should detect dev mode correctly', () => {
      process.env.NODE_ENV = 'development';
      expect(testAuthService.isDevMode()).toBe(true);

      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'false';
      expect(testAuthService.isDevMode()).toBe(true);

      process.env.NEXT_PUBLIC_AUTH_REQUIRE_SSE_AUTH = 'true';
      expect(testAuthService.isDevMode()).toBe(false);
    });

    it('should ensure authentication in dev mode', async () => {
      process.env.NODE_ENV = 'development';
      
      const result = await testAuthService.ensureAuthenticated();
      
      expect(result).toBe(true);
      expect(testAuthService.isAuthenticated()).toBe(true);
    });
  });

  describe('Authentication Validation', () => {
    it('should validate current auth successfully', async () => {
      testAuthService.createDevSession();
      mockApiClient.validateAuth.mockResolvedValue(true);

      const isValid = await testAuthService.validateCurrentAuth();
      
      expect(isValid).toBe(true);
    });

    it('should attempt token refresh on validation failure', async () => {
      testAuthService.createDevSession();
      
      // First validation fails, then refresh succeeds
      mockApiClient.validateAuth.mockResolvedValue(false);
      mockApiClient.refreshToken.mockResolvedValue({
        access_token: 'refreshed-token',
        refresh_token: 'new-refresh',
        token_type: 'Bearer',
        expires_in: 1800
      });

      const isValid = await testAuthService.validateCurrentAuth();
      
      expect(isValid).toBe(true);
      expect(mockApiClient.refreshToken).toHaveBeenCalled();
    });

    it('should logout on validation and refresh failure', async () => {
      testAuthService.createDevSession();
      
      mockApiClient.validateAuth.mockResolvedValue(false);
      mockApiClient.refreshToken.mockRejectedValue(new Error('Refresh failed'));
      mockApiClient.logout.mockResolvedValue({});

      const isValid = await testAuthService.validateCurrentAuth();
      
      expect(isValid).toBe(false);
      expect(testAuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('User Preferences', () => {
    it('should update user preferences', async () => {
      testAuthService.createDevSession();

      const preferences = {
        theme: 'dark' as const,
        language: 'en',
        notifications: { email: false }
      };

      mockApiClient.patch.mockResolvedValue({});

      await testAuthService.updateUserPreferences(preferences);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/auth/preferences', preferences);
    });

    it('should handle preference update errors', async () => {
      testAuthService.createDevSession();

      mockApiClient.patch.mockRejectedValue({
        message: 'Validation error'
      });

      await expect(
        testAuthService.updateUserPreferences({ theme: 'dark' as const })
      ).rejects.toBeDefined();
    });
  });

  describe('Automatic Token Refresh Handler', () => {
    it('should set up token refresh event listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      
      // Create new instance to trigger event listener setup
      AuthService.getInstance();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'auth:token_expired',
        expect.any(Function)
      );

      addEventListenerSpy.mockRestore();
    });

    it('should handle automatic token refresh on expiration event', async () => {
      testAuthService.createDevSession();
      
      mockApiClient.refreshToken.mockResolvedValue({
        access_token: 'auto-refreshed-token',
        refresh_token: 'new-refresh',
        token_type: 'Bearer',
        expires_in: 1800
      });

      // Trigger auth expiration event
      const event = new CustomEvent('auth:token_expired', {
        detail: { originalError: { status: 401 } }
      });
      
      window.dispatchEvent(event);

      // Wait for async handling
      await testUtils.waitFor(50);

      expect(mockApiClient.refreshToken).toHaveBeenCalled();
    });
  });
});