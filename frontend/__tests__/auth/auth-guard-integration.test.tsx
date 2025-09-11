/**
 * Integration tests for AuthGuard component API consistency
 * 
 * Tests the unified AuthGuard interface and backward compatibility
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/contexts/auth-context';

// Mock the auth context
jest.mock('@/contexts/auth-context');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('AuthGuard API Consistency', () => {
  const MockProtectedContent = () => <div data-testid="protected-content">Protected Content</div>;
  const MockFallback = () => <div data-testid="fallback">Please login</div>;
  const MockUnauthorized = () => <div data-testid="unauthorized">Access denied</div>;
  const MockLoading = () => <div data-testid="loading">Loading...</div>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unified Props Interface', () => {
    it('should support fallback component instead of redirect', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      render(
        <AuthGuard fallback={<MockFallback />}>
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(screen.getByTestId('fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should support custom loading component', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      } as any);

      render(
        <AuthGuard loadingComponent={<MockLoading />}>
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should support custom unauthorized component', () => {
      const mockUser = { 
        roles: ['user'],
        permissions: []
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      } as any);

      render(
        <AuthGuard 
          requiredRoles={['admin']} 
          unauthorizedComponent={<MockUnauthorized />}
        >
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(screen.getByTestId('unauthorized')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should support requireAuth=false to skip authentication', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      render(
        <AuthGuard requireAuth={false}>
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should support roleLogic AND/OR', () => {
      const mockUser = { 
        roles: ['user'],
        permissions: []
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      } as any);

      // Test OR logic (default) - should pass
      const { rerender } = render(
        <AuthGuard 
          requiredRoles={['user', 'admin']} 
          roleLogic="OR"
        >
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();

      // Test AND logic - should fail
      rerender(
        <AuthGuard 
          requiredRoles={['user', 'admin']} 
          roleLogic="AND"
          unauthorizedComponent={<MockUnauthorized />}
        >
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(screen.getByTestId('unauthorized')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('Backward Compatibility', () => {
    it('should support redirectTo prop (backward compatibility)', () => {
      mockPush.mockClear();

      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      render(
        <AuthGuard redirectTo="/custom-login">
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(mockPush).toHaveBeenCalledWith('/custom-login');
    });

    it('should prioritize redirectTo over fallbackPath when both are provided', () => {
      mockPush.mockClear();

      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      render(
        <AuthGuard 
          redirectTo="/priority-login" 
          fallbackPath="/fallback-login"
        >
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(mockPush).toHaveBeenCalledWith('/priority-login');
    });
  });

  describe('Role and Permission Handling', () => {
    it('should handle role objects with name property', () => {
      const mockUser = { 
        roles: [{ name: 'admin' }],
        permissions: []
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      } as any);

      render(
        <AuthGuard requiredRoles={['admin']}>
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should handle permission objects with name property', () => {
      const mockUser = { 
        roles: [{
          name: 'editor',
          permissions: [{ name: 'write' }]
        }],
        permissions: []
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      } as any);

      render(
        <AuthGuard requiredPermissions={['write']}>
          <MockProtectedContent />
        </AuthGuard>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });
});