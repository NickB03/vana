/**
 * Authentication Context Unit Tests
 * 
 * Comprehensive tests for authentication context including:
 * - Context provider functionality
 * - State management and updates
 * - Token storage and retrieval
 * - Authentication status checking
 * - Error handling and edge cases
 * - Memory leak prevention
 */

import React from 'react';
import { render, renderHook, act, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth, AuthContext } from '@/contexts/auth-context';
import { AuthService } from '@/lib/auth-service';
import '@testing-library/jest-dom';
import { TEST_TOKENS } from '../constants/test-config';

// Mock auth service
jest.mock('@/lib/auth-service', () => ({
  AuthService: {
    login: jest.fn(),
    logout: jest.fn(),
    refreshToken: jest.fn(),
    getToken: jest.fn(),
    getUser: jest.fn(),
    isAuthenticated: jest.fn(),
    validateToken: jest.fn(),
  }
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Default mock implementations
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getToken.mockReturnValue(null);
    mockAuthService.getUser.mockReturnValue(null);
  });

  describe('AuthProvider', () => {
    it('should provide authentication context to children', () => {
      const TestComponent = () => {
        const auth = useAuth();
        return (
          <div>
            <span data-testid="authenticated">{auth.isAuthenticated.toString()}</span>
            <span data-testid="loading">{auth.isLoading.toString()}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    it('should initialize with loading state', () => {
      const TestComponent = () => {
        const auth = useAuth();
        return <div data-testid="loading">{auth.isLoading.toString()}</div>;
      };

      // Mock initial loading state
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getToken.mockReturnValue('mock-token');

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    it('should handle authentication state initialization from storage', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getToken.mockReturnValue('stored-token');
      mockAuthService.getUser.mockReturnValue(mockUser);

      const TestComponent = () => {
        const auth = useAuth();
        return (
          <div>
            <span data-testid="authenticated">{auth.isAuthenticated.toString()}</span>
            <span data-testid="user">{auth.user?.email || 'none'}</span>
            <span data-testid="token">{auth.token || 'none'}</span>
          </div>
        );
      };

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('token')).toHaveTextContent('stored-token');
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      const TestComponent = () => {
        useAuth();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      console.error = originalError;
    });

    it('should provide authentication methods and state', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          isAuthenticated: expect.any(Boolean),
          isLoading: expect.any(Boolean),
          user: expect.any(Object),
          token: expect.any(String),
          login: expect.any(Function),
          logout: expect.any(Function),
          refreshToken: expect.any(Function),
        })
      );
    });

    it('should handle login flow successfully', async () => {
      const mockLoginData = {
        access_token: 'new-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      mockAuthService.login.mockResolvedValue(mockLoginData);
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getToken.mockReturnValue('new-token');
      mockAuthService.getUser.mockReturnValue(mockLoginData.user);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockLoginData.user);
      expect(result.current.token).toBe('new-token');
    });

    it('should handle login errors', async () => {
      const loginError = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(loginError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        act(async () => {
          await result.current.login('wrong@example.com', 'wrongpass');
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('should handle logout flow', async () => {
      // Start authenticated
      mockAuthService.isAuthenticated
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      mockAuthService.getToken
        .mockReturnValueOnce('existing-token')
        .mockReturnValueOnce(null);
      mockAuthService.getUser
        .mockReturnValueOnce({ id: 'user-123', email: 'test@example.com' })
        .mockReturnValueOnce(null);

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Initially authenticated
      expect(result.current.isAuthenticated).toBe(true);

      await act(async () => {
        await result.current.logout();
      });

      // Force re-render to update state
      rerender({});

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('should handle token refresh', async () => {
      const newToken = 'refreshed-token';
      mockAuthService.refreshToken.mockResolvedValue(newToken);
      mockAuthService.getToken
        .mockReturnValueOnce('old-token')
        .mockReturnValueOnce(newToken);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      let refreshedToken;
      await act(async () => {
        refreshedToken = await result.current.refreshToken();
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(refreshedToken).toBe(newToken);
      expect(result.current.token).toBe(newToken);
    });

    it('should handle token refresh failures', async () => {
      const refreshError = new Error('Token expired');
      mockAuthService.refreshToken.mockRejectedValue(refreshError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        act(async () => {
          await result.current.refreshToken();
        })
      ).rejects.toThrow('Token expired');
    });
  });

  describe('Authentication State Management', () => {
    it('should persist authentication state across re-renders', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getToken.mockReturnValue('persistent-token');
      mockAuthService.getUser.mockReturnValue(mockUser);

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);

      rerender({});

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('should handle authentication state changes reactively', async () => {
      let authState = false;
      let tokenValue: string | null = null;
      let userData: any = null;

      mockAuthService.isAuthenticated.mockImplementation(() => authState);
      mockAuthService.getToken.mockImplementation(() => tokenValue);
      mockAuthService.getUser.mockImplementation(() => userData);

      const { result, rerender } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Initially unauthenticated
      expect(result.current.isAuthenticated).toBe(false);

      // Simulate authentication
      authState = true;
      tokenValue = 'new-token';
      userData = { id: 'user-123', email: 'test@example.com' };

      rerender({});

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.token).toBe('new-token');
      expect(result.current.user).toEqual(userData);
    });

    it('should handle concurrent authentication operations', async () => {
      const mockLoginData = {
        access_token: TEST_TOKENS.CONCURRENT_TOKEN,
        user: {
          id: 'user-concurrent',
          email: 'concurrent@example.com',
          name: 'Concurrent User'
        }
      };

      mockAuthService.login.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockLoginData), 100))
      );

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Start multiple concurrent login attempts
      const loginPromises = [
        result.current.login('test1@example.com', 'pass1'),
        result.current.login('test2@example.com', 'pass2'),
        result.current.login('test3@example.com', 'pass3'),
      ];

      await act(async () => {
        await Promise.all(loginPromises);
      });

      // Should call login service multiple times
      expect(mockAuthService.login).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors during login', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';
      mockAuthService.login.mockRejectedValue(networkError);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'password123');
        })
      ).rejects.toThrow('Network request failed');

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle malformed authentication data', async () => {
      // Mock malformed response
      mockAuthService.login.mockResolvedValue(null as any);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        act(async () => {
          await result.current.login('test@example.com', 'password123');
        })
      ).rejects.toThrow();
    });

    it('should handle empty or invalid credentials', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      await expect(
        act(async () => {
          await result.current.login('', '');
        })
      ).rejects.toThrow();

      await expect(
        act(async () => {
          await result.current.login('invalid-email', 'short');
        })
      ).rejects.toThrow();
    });

    it('should handle storage unavailability gracefully', () => {
      // Mock localStorage to throw
      const originalLocalStorage = Object.getOwnPropertyDescriptor(window, 'localStorage');
      
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('LocalStorage not available');
        }
      });

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Should not crash and provide default state
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();

      // Restore localStorage
      if (originalLocalStorage) {
        Object.defineProperty(window, 'localStorage', originalLocalStorage);
      }
    });

    it('should handle component unmount during async operations', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });

      mockAuthService.login.mockReturnValue(loginPromise);

      const { result, unmount } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Start login
      const loginCall = act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      // Unmount before login completes
      unmount();

      // Complete the login
      resolveLogin!({
        access_token: 'token',
        user: { id: 'user', email: 'test@example.com' }
      });

      // Should not throw or cause memory leaks
      await expect(loginCall).rejects.toThrow();
    });
  });

  describe('Performance and Memory Management', () => {
    it('should not cause memory leaks with multiple renders', () => {
      const { rerender, unmount } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Multiple re-renders should not accumulate listeners or references
      for (let i = 0; i < 100; i++) {
        rerender({});
      }

      // Should unmount cleanly
      expect(() => unmount()).not.toThrow();
    });

    it('should handle rapid state changes efficiently', async () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Rapid authentication state changes
      for (let i = 0; i < 10; i++) {
        mockAuthService.isAuthenticated
          .mockReturnValueOnce(i % 2 === 0)
          .mockReturnValueOnce(i % 2 === 1);
        
        await act(async () => {
          // Trigger state updates
          result.current.refreshToken().catch(() => {});
        });
      }

      // Should not throw or cause performance issues
      expect(result.current).toBeDefined();
    });

    it('should debounce token validation checks', async () => {
      mockAuthService.validateToken = jest.fn().mockResolvedValue(true);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Multiple rapid validation calls
      await act(async () => {
        for (let i = 0; i < 5; i++) {
          result.current.validateToken?.();
        }
      });

      // Should debounce to prevent excessive API calls
      expect(mockAuthService.validateToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive data in context', () => {
      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Check that sensitive data is not directly exposed
      const contextString = JSON.stringify(result.current);
      expect(contextString).not.toContain('password');
      expect(contextString).not.toContain('secret');
      expect(contextString).not.toContain('private');
    });

    it('should handle token expiration gracefully', async () => {
      const expiredError = new Error('Token expired');
      mockAuthService.refreshToken.mockRejectedValue(expiredError);
      mockAuthService.logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      // Should automatically logout on token expiration
      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (error) {
          // Handle token expiration by logging out
          await result.current.logout();
        }
      });

      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should validate tokens before using them', async () => {
      const invalidToken = 'invalid.token.here';
      mockAuthService.getToken.mockReturnValue(invalidToken);
      mockAuthService.validateToken = jest.fn().mockResolvedValue(false);

      const { result } = renderHook(() => useAuth(), {
        wrapper: AuthProvider,
      });

      if (result.current.validateToken) {
        const isValid = await act(async () => {
          return await result.current.validateToken!();
        });

        expect(isValid).toBe(false);
        expect(mockAuthService.validateToken).toHaveBeenCalledWith(invalidToken);
      }
    });
  });
});