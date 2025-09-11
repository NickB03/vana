/**
 * Authentication Service Unit Tests
 * 
 * Basic tests to validate the authentication service functionality
 */

import { AuthService } from '@/lib/auth-service';

// Mock localStorage for testing
const mockStorage = {
  store: {} as Record<string, string>,
  getItem: jest.fn((key: string) => mockStorage.store[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage.store[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage.store[key];
  }),
  clear: jest.fn(() => {
    mockStorage.store = {};
  }),
};

// Mock apiClient
jest.mock('@/lib/api-client', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
  },
}));

describe('AuthService', () => {
  beforeEach(() => {
    // Reset mocks and storage
    jest.clearAllMocks();
    mockStorage.clear();
    
    // Mock window.localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
    });
  });

  describe('Token Management', () => {
    it('should get and set tokens correctly', () => {
      const testToken = 'test-token-123';
      
      // Initially no token
      expect(AuthService.getToken()).toBeNull();
      
      // Set token
      AuthService.setToken(testToken);
      expect(AuthService.getToken()).toBe(testToken);
      
      // Verify storage was called
      expect(mockStorage.setItem).toHaveBeenCalledWith('vana_auth_token', testToken);
    });

    it('should handle token expiry correctly', () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      const pastTime = Date.now() - 3600000; // 1 hour ago
      
      // Set future expiry
      AuthService.setTokenExpiry(futureTime);
      expect(AuthService.getTokenExpiry()).toBe(futureTime);
      
      // Set past expiry
      AuthService.setTokenExpiry(pastTime);
      expect(AuthService.getTokenExpiry()).toBe(pastTime);
    });

    it('should validate JWT token structure', () => {
      // Valid JWT structure
      const validJWT = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjo5OTk5OTk5OTk5fQ.Twm6jrNfZXbmUwpxz8SUdM_-1b7VQ_B4XHYcFYWGQMU';
      AuthService.setToken(validJWT);
      
      // Should recognize valid token structure
      expect(AuthService.isAuthenticated()).toBe(true);
      
      // Invalid token
      const invalidToken = 'invalid-token';
      AuthService.setToken(invalidToken);
      expect(AuthService.isAuthenticated()).toBe(false);
    });
  });

  describe('User Management', () => {
    it('should get and set user data correctly', () => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user'],
        permissions: ['read'],
      };
      
      // Initially no user
      expect(AuthService.getUser()).toBeNull();
      
      // Set user
      AuthService.setUser(testUser);
      const retrievedUser = AuthService.getUser();
      
      expect(retrievedUser).toEqual(testUser);
      expect(mockStorage.setItem).toHaveBeenCalledWith('vana_user_data', JSON.stringify(testUser));
    });

    it('should handle invalid user data gracefully', () => {
      // Set invalid JSON in storage
      mockStorage.store['vana_user_data'] = 'invalid-json{';
      
      const user = AuthService.getUser();
      expect(user).toBeNull();
      
      // Should clean up invalid data
      expect(mockStorage.removeItem).toHaveBeenCalledWith('vana_user_data');
    });
  });

  describe('Permission Helpers', () => {
    beforeEach(() => {
      const testUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user', 'moderator'],
        permissions: ['read', 'write'],
      };
      AuthService.setUser(testUser);
    });

    it('should check roles correctly', () => {
      expect(AuthService.hasRole('user')).toBe(true);
      expect(AuthService.hasRole('moderator')).toBe(true);
      expect(AuthService.hasRole('admin')).toBe(false);
    });

    it('should check permissions correctly', () => {
      expect(AuthService.hasPermission('read')).toBe(true);
      expect(AuthService.hasPermission('write')).toBe(true);
      expect(AuthService.hasPermission('delete')).toBe(false);
    });

    it('should check multiple roles correctly', () => {
      expect(AuthService.hasAnyRole(['admin', 'moderator'])).toBe(true);
      expect(AuthService.hasAnyRole(['admin', 'superuser'])).toBe(false);
      
      expect(AuthService.hasAllRoles(['user', 'moderator'])).toBe(true);
      expect(AuthService.hasAllRoles(['user', 'admin'])).toBe(false);
    });

    it('should return user roles and permissions', () => {
      expect(AuthService.getUserRoles()).toEqual(['user', 'moderator']);
      expect(AuthService.getUserPermissions()).toEqual(['read', 'write']);
    });
  });

  describe('Storage Management', () => {
    it('should handle remember me preference', () => {
      expect(AuthService.getRememberMe()).toBe(false);
      
      AuthService.setRememberMe(true);
      expect(AuthService.getRememberMe()).toBe(true);
      
      AuthService.setRememberMe(false);
      expect(AuthService.getRememberMe()).toBe(false);
    });

    it('should clear all auth data', () => {
      // Set some auth data
      AuthService.setToken('test-token');
      AuthService.setUser({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      });
      AuthService.setRememberMe(true);
      
      // Clear all data
      AuthService.clearAuthData();
      
      // Verify everything is cleared
      expect(AuthService.getToken()).toBeNull();
      expect(AuthService.getUser()).toBeNull();
      expect(mockStorage.removeItem).toHaveBeenCalledTimes(5); // All storage keys
    });
  });
});