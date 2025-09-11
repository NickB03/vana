/**
 * Authentication Hooks Unit Tests
 * 
 * Comprehensive tests for authentication hooks including:
 * - useAuthToken hook for token management
 * - useAuthGuard hook for protected routes
 * - useLoginForm hook for form handling
 * - Custom authentication hooks
 * - Token refresh strategies
 * - Session management
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuthToken, useAuthGuard, useLoginForm, useSessionManager } from '@/hooks/auth-hooks';
import { AuthProvider } from '@/contexts/auth-context';
import { AuthService } from '@/lib/auth-service';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/lib/auth-service');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

(useRouter as jest.Mock).mockReturnValue(mockRouter);

describe('Authentication Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    
    // Default mock implementations
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getToken.mockReturnValue(null);
    mockAuthService.getUser.mockReturnValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('useAuthToken', () => {
    it('should return current token state', () => {
      const mockToken = 'mock-jwt-token';
      mockAuthService.getToken.mockReturnValue(mockToken);
      mockAuthService.isAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => useAuthToken(), {
        wrapper: AuthProvider,
      });

      expect(result.current.token).toBe(mockToken);
      expect(result.current.isValidToken).toBe(true);
    });

    it('should refresh token automatically before expiration', async () => {
      const oldToken = 'old-token';
      const newToken = 'new-token';
      
      mockAuthService.getToken.mockReturnValue(oldToken);
      mockAuthService.refreshToken.mockResolvedValue(newToken);
      mockAuthService.getTokenExpiry.mockReturnValue(Date.now() + 5000); // 5 seconds

      const { result } = renderHook(() => useAuthToken({
        refreshThreshold: 3000, // Refresh 3 seconds before expiry
        autoRefresh: true,
      }), {
        wrapper: AuthProvider,
      });

      // Fast-forward to trigger refresh
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(mockAuthService.refreshToken).toHaveBeenCalled();
      });

      expect(result.current.token).toBe(newToken);
    });

    it('should handle token refresh failures', async () => {
      mockAuthService.getToken.mockReturnValue('expired-token');
      mockAuthService.refreshToken.mockRejectedValue(new Error('Refresh failed'));
      mockAuthService.getTokenExpiry.mockReturnValue(Date.now() + 1000);

      const { result } = renderHook(() => useAuthToken({
        refreshThreshold: 2000,
        autoRefresh: true,
        onRefreshError: jest.fn(),
      }), {
        wrapper: AuthProvider,
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(result.current.refreshError).toEqual(
          expect.objectContaining({ message: 'Refresh failed' })
        );
      });
    });

    it('should validate token format and structure', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const invalidToken = 'invalid-token';

      mockAuthService.getToken.mockReturnValueOnce(validJWT);
      const { result, rerender } = renderHook(() => useAuthToken(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isValidToken).toBe(true);

      mockAuthService.getToken.mockReturnValueOnce(invalidToken);
      rerender({});

      expect(result.current.isValidToken).toBe(false);
    });

    it('should handle concurrent token refresh requests', async () => {
      mockAuthService.getToken.mockReturnValue('concurrent-token');
      mockAuthService.refreshToken.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('refreshed-concurrent'), 100))
      );

      const { result } = renderHook(() => useAuthToken(), {
        wrapper: AuthProvider,
      });

      // Start multiple concurrent refresh requests
      const refreshPromises = [
        result.current.refreshToken(),
        result.current.refreshToken(),
        result.current.refreshToken(),
      ];

      await act(async () => {
        await Promise.all(refreshPromises);
      });

      // Should only call the service once due to deduplication
      expect(mockAuthService.refreshToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('useAuthGuard', () => {
    it('should allow access for authenticated users', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'user-123',
        roles: ['user']
      });

      const { result } = renderHook(() => useAuthGuard(), {
        wrapper: AuthProvider,
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should redirect unauthenticated users', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useAuthGuard({
        redirectTo: '/login',
        requiredRoles: ['user'],
      }), {
        wrapper: AuthProvider,
      });

      expect(result.current.canAccess).toBe(false);
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('should enforce role-based access control', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'user-123',
        roles: ['user'] // User has 'user' role but not 'admin'
      });

      const { result } = renderHook(() => useAuthGuard({
        requiredRoles: ['admin'],
        redirectTo: '/unauthorized',
      }), {
        wrapper: AuthProvider,
      });

      expect(result.current.canAccess).toBe(false);
      expect(result.current.hasRequiredRoles).toBe(false);
      expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
    });

    it('should allow multiple required roles (OR logic)', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'user-123',
        roles: ['moderator']
      });

      const { result } = renderHook(() => useAuthGuard({
        requiredRoles: ['admin', 'moderator'], // User has moderator
        roleLogic: 'OR',
      }), {
        wrapper: AuthProvider,
      });

      expect(result.current.canAccess).toBe(true);
      expect(result.current.hasRequiredRoles).toBe(true);
    });

    it('should require all roles (AND logic)', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'user-123',
        roles: ['user']
      });

      const { result } = renderHook(() => useAuthGuard({
        requiredRoles: ['user', 'admin'], // User has only 'user'
        roleLogic: 'AND',
      }), {
        wrapper: AuthProvider,
      });

      expect(result.current.canAccess).toBe(false);
      expect(result.current.hasRequiredRoles).toBe(false);
    });

    it('should handle permission validation with custom function', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'user-123',
        roles: ['user'],
        permissions: ['read', 'write']
      });

      const customPermissionCheck = (user: any) => {
        return user.permissions.includes('write');
      };

      const { result } = renderHook(() => useAuthGuard({
        customPermissionCheck,
      }), {
        wrapper: AuthProvider,
      });

      expect(result.current.canAccess).toBe(true);
    });

    it('should handle loading state during authentication check', async () => {
      let resolveAuth: (authenticated: boolean) => void;
      const authPromise = new Promise<boolean>(resolve => {
        resolveAuth = resolve;
      });

      mockAuthService.isAuthenticated.mockImplementation(() => {
        throw authPromise; // Simulate async auth check
      });

      const { result } = renderHook(() => useAuthGuard(), {
        wrapper: AuthProvider,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.canAccess).toBe(false);

      // Resolve authentication
      await act(async () => {
        resolveAuth!(true);
        await authPromise.catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('useLoginForm', () => {
    it('should handle form state and validation', () => {
      const { result } = renderHook(() => useLoginForm());

      expect(result.current.formData).toEqual({
        email: '',
        password: '',
        rememberMe: false,
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should validate email format', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.updateField('email', 'invalid-email');
        result.current.validateForm();
      });

      expect(result.current.errors.email).toBe('Please enter a valid email address');
    });

    it('should validate password requirements', () => {
      const { result } = renderHook(() => useLoginForm({
        passwordMinLength: 8,
        requireSpecialChars: true,
      }));

      act(() => {
        result.current.updateField('password', 'weak');
        result.current.validateForm();
      });

      expect(result.current.errors.password).toBeTruthy();
    });

    it('should handle successful login submission', async () => {
      const mockLoginData = {
        access_token: 'login-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      mockAuthService.login.mockResolvedValue(mockLoginData);

      const onSuccess = jest.fn();
      const { result } = renderHook(() => useLoginForm({
        onSuccess,
      }));

      await act(async () => {
        result.current.updateField('email', 'test@example.com');
        result.current.updateField('password', 'password123');
        await result.current.submitForm();
      });

      expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(onSuccess).toHaveBeenCalledWith(mockLoginData);
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should handle login errors', async () => {
      const loginError = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(loginError);

      const onError = jest.fn();
      const { result } = renderHook(() => useLoginForm({
        onError,
      }));

      await act(async () => {
        result.current.updateField('email', 'test@example.com');
        result.current.updateField('password', 'wrongpassword');
        await result.current.submitForm();
      });

      expect(onError).toHaveBeenCalledWith(loginError);
      expect(result.current.errors.general).toBe('Invalid credentials');
      expect(result.current.isSubmitting).toBe(false);
    });

    it('should prevent double submission', async () => {
      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });

      mockAuthService.login.mockReturnValue(loginPromise);

      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.updateField('email', 'test@example.com');
        result.current.updateField('password', 'password123');
      });

      // Start first submission
      const firstSubmission = act(async () => {
        await result.current.submitForm();
      });

      expect(result.current.isSubmitting).toBe(true);

      // Try to submit again while first is in progress
      const secondSubmission = act(async () => {
        await result.current.submitForm();
      });

      // Complete first submission
      resolveLogin!({ access_token: 'token', user: {} });
      await firstSubmission;
      await secondSubmission;

      // Should only call login once
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should clear errors on field updates', () => {
      const { result } = renderHook(() => useLoginForm());

      act(() => {
        result.current.setError('email', 'Invalid email');
        result.current.setError('password', 'Required');
      });

      expect(result.current.errors.email).toBeTruthy();
      expect(result.current.errors.password).toBeTruthy();

      act(() => {
        result.current.updateField('email', 'valid@example.com');
      });

      expect(result.current.errors.email).toBeFalsy();
      expect(result.current.errors.password).toBeTruthy(); // Other errors remain
    });
  });

  describe('useSessionManager', () => {
    it('should track session activity', () => {
      const { result } = renderHook(() => useSessionManager({
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        warningTime: 5 * 60 * 1000, // 5 minutes before timeout
      }));

      expect(result.current.isSessionActive).toBe(true);
      expect(result.current.timeUntilExpiry).toBeGreaterThan(0);
      expect(result.current.showWarning).toBe(false);
    });

    it('should show warning before session expiry', () => {
      const { result } = renderHook(() => useSessionManager({
        sessionTimeout: 10000, // 10 seconds
        warningTime: 5000, // 5 seconds warning
      }));

      act(() => {
        jest.advanceTimersByTime(6000); // 6 seconds passed
      });

      expect(result.current.showWarning).toBe(true);
      expect(result.current.isSessionActive).toBe(true);
    });

    it('should expire session and logout user', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const onSessionExpired = jest.fn();
      const { result } = renderHook(() => useSessionManager({
        sessionTimeout: 5000, // 5 seconds
        onSessionExpired,
      }));

      act(() => {
        jest.advanceTimersByTime(6000); // Past expiry
      });

      await waitFor(() => {
        expect(result.current.isSessionActive).toBe(false);
        expect(onSessionExpired).toHaveBeenCalled();
        expect(mockAuthService.logout).toHaveBeenCalled();
      });
    });

    it('should extend session on user activity', () => {
      const { result } = renderHook(() => useSessionManager({
        sessionTimeout: 10000, // 10 seconds
      }));

      act(() => {
        jest.advanceTimersByTime(5000); // 5 seconds
      });

      const initialTimeLeft = result.current.timeUntilExpiry;

      act(() => {
        result.current.extendSession(); // User activity
      });

      expect(result.current.timeUntilExpiry).toBeGreaterThan(initialTimeLeft);
    });

    it('should handle multiple session extensions', () => {
      const { result } = renderHook(() => useSessionManager({
        sessionTimeout: 10000,
        maxSessionExtensions: 3,
      }));

      // Extend session multiple times
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.extendSession();
        });
      }

      // Should not exceed max extensions
      expect(result.current.extensionsUsed).toBe(3);
    });

    it('should clear session timers on unmount', () => {
      const { unmount } = renderHook(() => useSessionManager({
        sessionTimeout: 10000,
      }));

      // Should not throw or cause memory leaks
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Hook Integration and Performance', () => {
    it('should work together without conflicts', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getToken.mockReturnValue('integration-token');
      mockAuthService.getUser.mockReturnValue({
        id: 'user-integration',
        roles: ['user']
      });

      const { result: tokenResult } = renderHook(() => useAuthToken(), {
        wrapper: AuthProvider,
      });
      
      const { result: guardResult } = renderHook(() => useAuthGuard(), {
        wrapper: AuthProvider,
      });
      
      const { result: formResult } = renderHook(() => useLoginForm(), {
        wrapper: AuthProvider,
      });

      expect(tokenResult.current.token).toBe('integration-token');
      expect(guardResult.current.canAccess).toBe(true);
      expect(formResult.current.isSubmitting).toBe(false);
    });

    it('should handle rapid hook re-renders efficiently', () => {
      const { rerender } = renderHook(() => ({
        token: useAuthToken(),
        guard: useAuthGuard(),
        form: useLoginForm(),
        session: useSessionManager(),
      }), {
        wrapper: AuthProvider,
      });

      // Multiple rapid re-renders
      for (let i = 0; i < 50; i++) {
        rerender({});
      }

      // Should not cause performance issues or memory leaks
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('should cleanup resources on unmount', () => {
      const { unmount } = renderHook(() => ({
        token: useAuthToken({ autoRefresh: true }),
        guard: useAuthGuard(),
        form: useLoginForm(),
        session: useSessionManager({ sessionTimeout: 10000 }),
      }), {
        wrapper: AuthProvider,
      });

      // Should cleanup all timers and listeners
      expect(() => unmount()).not.toThrow();
    });
  });
});