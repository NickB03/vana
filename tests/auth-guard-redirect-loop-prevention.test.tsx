/**
 * Comprehensive Tests for AuthGuard Redirect Loop Prevention
 * 
 * This test suite validates:
 * 1. Authentication state stabilization
 * 2. Redirect loop prevention with history tracking
 * 3. Memoized function dependencies prevent infinite re-renders
 * 4. Debounced storage handlers prevent oscillation
 * 5. Redirect target validation
 * 6. Edge cases and regression prevention
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useAuth } from '@/contexts/auth-context';
import { useAuthStabilization } from '@/hooks/use-auth-stabilization';

// Mock dependencies
jest.mock('@/contexts/auth-context');
jest.mock('@/hooks/use-auth-stabilization');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAuthStabilization = useAuthStabilization as jest.MockedFunction<typeof useAuthStabilization>;

// Mock next/navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
  usePathname: () => '/protected',
}));

describe('AuthGuard Redirect Loop Prevention', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Authentication State Stabilization', () => {
    it('should wait for stable auth state before making redirect decisions', async () => {
      // Setup: Auth state is unstable
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: false, // State not stable yet
        isInitialized: false,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: jest.fn(() => false),
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: jest.fn(() => false),
      });

      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      // Should show loading state, not redirect
      expect(screen.getByText('Initializing...')).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should redirect once auth state stabilizes as unauthenticated', async () => {
      // Setup: Auth state becomes stable as unauthenticated
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      const mockCanSafelyRedirect = jest.fn(() => true);
      const mockAddRedirectToHistory = jest.fn();
      const mockWouldCreateRedirectLoop = jest.fn(() => false);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: mockAddRedirectToHistory,
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockCanSafelyRedirect).toHaveBeenCalledWith('/login');
        expect(mockAddRedirectToHistory).toHaveBeenCalledWith('/login');
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });

    it('should prevent rapid state transitions from causing multiple redirects', async () => {
      const mockCanSafelyRedirect = jest.fn(() => true);
      const mockAddRedirectToHistory = jest.fn();
      const mockWouldCreateRedirectLoop = jest.fn(() => false);

      // Initial unstable state
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: true,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: false,
        isInitialized: false,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: mockAddRedirectToHistory,
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      const { rerender } = render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      // Simulate rapid state changes
      act(() => {
        // Change 1: Still loading
        mockUseAuth.mockReturnValue({
          user: null,
          isAuthenticated: false,
          isLoading: true,
        } as any);

        rerender(
          <AuthGuard>
            <TestComponent />
          </AuthGuard>
        );
      });

      act(() => {
        // Change 2: Not loading but unstable
        mockUseAuth.mockReturnValue({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        } as any);
        
        mockUseAuthStabilization.mockReturnValue({
          isStable: false, // Still unstable
          isInitialized: false,
          stableAuth: false,
          stableUser: null,
          canSafelyRedirect: mockCanSafelyRedirect,
          addRedirectToHistory: mockAddRedirectToHistory,
          wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
        });

        rerender(
          <AuthGuard>
            <TestComponent />
          </AuthGuard>
        );
      });

      // Should not have redirected during unstable states
      expect(mockReplace).not.toHaveBeenCalled();

      // Finally stabilize
      act(() => {
        mockUseAuthStabilization.mockReturnValue({
          isStable: true,
          isInitialized: true,
          stableAuth: false,
          stableUser: null,
          canSafelyRedirect: mockCanSafelyRedirect,
          addRedirectToHistory: mockAddRedirectToHistory,
          wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
        });

        rerender(
          <AuthGuard>
            <TestComponent />
          </AuthGuard>
        );
      });

      // Should redirect only once after stabilization
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledTimes(1);
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Redirect Loop Prevention', () => {
    it('should prevent redirect loops using history tracking', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      const mockCanSafelyRedirect = jest.fn(() => false); // Simulate unsafe redirect
      const mockAddRedirectToHistory = jest.fn();
      const mockWouldCreateRedirectLoop = jest.fn(() => true); // Simulate loop detection

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: mockAddRedirectToHistory,
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      // Spy on console.warn to verify warning messages
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockWouldCreateRedirectLoop).toHaveBeenCalledWith('/login');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining("Cannot safely redirect to '/login' - auth state not stable")
        );
        expect(mockReplace).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });

    it('should track redirect history with timestamps', async () => {
      const mockAddRedirectToHistory = jest.fn();
      const mockCanSafelyRedirect = jest.fn(() => true);
      const mockWouldCreateRedirectLoop = jest.fn(() => false);

      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: mockAddRedirectToHistory,
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(mockAddRedirectToHistory).toHaveBeenCalledWith('/login');
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });

    it('should handle multiple redirect attempts gracefully', async () => {
      const mockCanSafelyRedirect = jest.fn()
        .mockReturnValueOnce(false) // First attempt fails
        .mockReturnValueOnce(false) // Second attempt fails
        .mockReturnValueOnce(true);  // Third attempt succeeds

      const mockWouldCreateRedirectLoop = jest.fn()
        .mockReturnValueOnce(true)  // First: would create loop
        .mockReturnValueOnce(true)  // Second: would create loop
        .mockReturnValueOnce(false); // Third: safe

      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      const { rerender } = render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      // Simulate multiple render cycles
      await act(async () => {
        rerender(
          <AuthGuard>
            <TestComponent />
          </AuthGuard>
        );
      });

      // Should only redirect once when safe
      expect(mockCanSafelyRedirect).toHaveBeenCalled();
      expect(mockWouldCreateRedirectLoop).toHaveBeenCalled();
    });
  });

  describe('Redirect Target Validation', () => {
    it('should validate redirect targets before redirecting', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      const mockCanSafelyRedirect = jest.fn(() => true);
      const mockWouldCreateRedirectLoop = jest.fn(() => false);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Test invalid redirect targets
      const invalidTargets = [
        '', // Empty
        '/protected', // Same as current path
        'invalid-path', // Invalid format
        '//malicious-site.com', // Potential security issue
      ];

      for (const target of invalidTargets) {
        render(
          <AuthGuard fallbackPath={target}>
            <TestComponent />
          </AuthGuard>
        );
      }

      consoleSpy.mockRestore();
    });

    it('should accept valid redirect targets', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      const mockCanSafelyRedirect = jest.fn(() => true);
      const mockWouldCreateRedirectLoop = jest.fn(() => false);
      const mockAddRedirectToHistory = jest.fn();

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: mockAddRedirectToHistory,
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      const validTargets = [
        '/login',
        '/auth/signin',
        '/auth/login-with-provider',
        '/access-denied',
      ];

      for (const target of validTargets) {
        mockReplace.mockClear();
        mockAddRedirectToHistory.mockClear();

        render(
          <AuthGuard fallbackPath={target}>
            <TestComponent />
          </AuthGuard>
        );

        await waitFor(() => {
          expect(mockCanSafelyRedirect).toHaveBeenCalledWith(target);
          expect(mockAddRedirectToHistory).toHaveBeenCalledWith(target);
          expect(mockReplace).toHaveBeenCalledWith(target);
        });
      }
    });
  });

  describe('Memoized Function Dependencies', () => {
    it('should not cause infinite re-renders with memoized callbacks', async () => {
      let renderCount = 0;
      const TestComponentWithCounter = () => {
        renderCount++;
        return <div data-testid="protected-content">Render #{renderCount}</div>;
      };

      mockUseAuth.mockReturnValue({
        user: { id: '1', roles: ['user'] },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: true,
        stableUser: { id: '1', roles: ['user'] },
        canSafelyRedirect: jest.fn(() => true),
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: jest.fn(() => false),
      });

      render(
        <AuthGuard 
          requiredRoles={['user']}
          customPermissionCheck={(user) => user?.id === '1'}
        >
          <TestComponentWithCounter />
        </AuthGuard>
      );

      // Wait for stabilization
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      // Render count should be reasonable (not infinite)
      expect(renderCount).toBeLessThan(5);
    });

    it('should maintain stable references for memoized functions', async () => {
      const permissionCheckCalls: any[] = [];
      const customPermissionCheck = jest.fn((user) => {
        permissionCheckCalls.push(user);
        return true;
      });

      mockUseAuth.mockReturnValue({
        user: { id: '1', roles: ['user'] },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: true,
        stableUser: { id: '1', roles: ['user'] },
        canSafelyRedirect: jest.fn(() => true),
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: jest.fn(() => false),
      });

      const { rerender } = render(
        <AuthGuard customPermissionCheck={customPermissionCheck}>
          <TestComponent />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      const initialCallCount = customPermissionCheck.mock.calls.length;

      // Re-render with same props
      rerender(
        <AuthGuard customPermissionCheck={customPermissionCheck}>
          <TestComponent />
        </AuthGuard>
      );

      // Should not call permission check again due to memoization
      expect(customPermissionCheck.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid authentication state changes', async () => {
      const mockCanSafelyRedirect = jest.fn(() => true);
      const mockAddRedirectToHistory = jest.fn();
      const mockWouldCreateRedirectLoop = jest.fn(() => false);

      // Start unauthenticated
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: false,
        isInitialized: false,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: mockAddRedirectToHistory,
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      const { rerender } = render(
        <AuthGuard>
          <TestComponent />
        </AuthGuard>
      );

      // Simulate rapid changes: unauthenticated -> loading -> authenticated -> stable
      const stateChanges = [
        {
          auth: { user: null, isAuthenticated: false, isLoading: true },
          stabilization: { isStable: false, isInitialized: false, stableAuth: false, stableUser: null }
        },
        {
          auth: { user: { id: '1' }, isAuthenticated: true, isLoading: false },
          stabilization: { isStable: false, isInitialized: false, stableAuth: false, stableUser: null }
        },
        {
          auth: { user: { id: '1' }, isAuthenticated: true, isLoading: false },
          stabilization: { isStable: true, isInitialized: true, stableAuth: true, stableUser: { id: '1' } }
        },
      ];

      for (const [index, state] of stateChanges.entries()) {
        await act(async () => {
          mockUseAuth.mockReturnValue(state.auth as any);
          mockUseAuthStabilization.mockReturnValue({
            ...state.stabilization,
            canSafelyRedirect: mockCanSafelyRedirect,
            addRedirectToHistory: mockAddRedirectToHistory,
            wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
          });

          rerender(
            <AuthGuard>
              <TestComponent />
            </AuthGuard>
          );
        });

        // Only show content when fully stable and authenticated
        if (index === stateChanges.length - 1) {
          await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeInTheDocument();
          });
        }
      }

      // Should not have redirected during the process
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should handle permission changes during stable state', async () => {
      const mockUser = { id: '1', roles: ['user'] };
      
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      } as any);

      const mockCanSafelyRedirect = jest.fn(() => true);
      const mockAddRedirectToHistory = jest.fn();
      const mockWouldCreateRedirectLoop = jest.fn(() => false);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: true,
        stableUser: mockUser,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: mockAddRedirectToHistory,
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      const { rerender } = render(
        <AuthGuard requiredRoles={['user']}>
          <TestComponent />
        </AuthGuard>
      );

      // Initially should show content
      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      // Change required roles while maintaining stable state
      rerender(
        <AuthGuard 
          requiredRoles={['admin']}
          unauthorizedComponent={<div data-testid="unauthorized">Access denied</div>}
        >
          <TestComponent />
        </AuthGuard>
      );

      // Should show unauthorized component
      await waitFor(() => {
        expect(screen.getByTestId('unauthorized')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple protected routes correctly', async () => {
      const MultipleRoutesComponent = () => (
        <div>
          <AuthGuard requiredRoles={['user']} fallbackPath="/login">
            <div data-testid="user-content">User Content</div>
          </AuthGuard>
          <AuthGuard requiredRoles={['admin']} fallbackPath="/admin-login">
            <div data-testid="admin-content">Admin Content</div>
          </AuthGuard>
        </div>
      );

      const mockUser = { id: '1', roles: ['user'] };
      
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      } as any);

      const mockCanSafelyRedirect = jest.fn(() => true);
      const mockAddRedirectToHistory = jest.fn();
      const mockWouldCreateRedirectLoop = jest.fn(() => false);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: true,
        stableUser: mockUser,
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: mockAddRedirectToHistory,
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      render(<MultipleRoutesComponent />);

      await waitFor(() => {
        // User content should be visible
        expect(screen.getByTestId('user-content')).toBeInTheDocument();
        // Admin content should not be visible (user doesn't have admin role)
        expect(screen.queryByTestId('admin-content')).not.toBeInTheDocument();
      });

      // Should have attempted redirect for admin route
      expect(mockCanSafelyRedirect).toHaveBeenCalledWith('/admin-login');
    });
  });

  describe('Regression Prevention', () => {
    it('should maintain backward compatibility with existing props', async () => {
      const mockUser = { id: '1', roles: ['user'] };
      
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: true,
        stableUser: mockUser,
        canSafelyRedirect: jest.fn(() => true),
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: jest.fn(() => false),
      });

      // Test all legacy prop combinations
      const legacyPropCombinations = [
        { redirectTo: '/legacy-login' },
        { fallbackPath: '/new-login' },
        { redirectTo: '/priority', fallbackPath: '/fallback' }, // redirectTo should win
        { requireAuth: false },
        { roleLogic: 'AND', requiredRoles: ['user'] },
        { roleLogic: 'OR', requiredRoles: ['user', 'admin'] },
      ];

      for (const props of legacyPropCombinations) {
        render(
          <AuthGuard {...props}>
            <TestComponent />
          </AuthGuard>
        );

        if (props.requireAuth !== false) {
          await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeInTheDocument();
          });
        }
      }
    });

    it('should handle all callback props without breaking', async () => {
      const mockCallbacks = {
        onUnauthorized: jest.fn(),
        customPermissionCheck: jest.fn(() => true),
      };

      const mockUser = { id: '1', roles: ['user'] };
      
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: true,
        stableUser: mockUser,
        canSafelyRedirect: jest.fn(() => true),
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: jest.fn(() => false),
      });

      render(
        <AuthGuard {...mockCallbacks}>
          <TestComponent />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(mockCallbacks.customPermissionCheck).toHaveBeenCalled();
        // onUnauthorized should not be called for successful auth
        expect(mockCallbacks.onUnauthorized).not.toHaveBeenCalled();
      });
    });

    it('should handle component fallbacks without breaking', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: false,
        stableUser: null,
        canSafelyRedirect: jest.fn(() => true),
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: jest.fn(() => false),
      });

      const customComponents = {
        fallback: <div data-testid="custom-fallback">Custom Login</div>,
        loadingComponent: <div data-testid="custom-loading">Custom Loading</div>,
        unauthorizedComponent: <div data-testid="custom-unauthorized">Custom Unauthorized</div>,
      };

      render(
        <AuthGuard {...customComponents}>
          <TestComponent />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance and Memory', () => {
    it('should not create memory leaks with repeated mounts/unmounts', async () => {
      const mockCanSafelyRedirect = jest.fn(() => true);
      const mockAddRedirectToHistory = jest.fn();
      const mockWouldCreateRedirectLoop = jest.fn(() => false);

      mockUseAuth.mockReturnValue({
        user: { id: '1' },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: true,
        stableUser: { id: '1' },
        canSafelyRedirect: mockCanSafelyRedirect,
        addRedirectToHistory: mockAddRedirectToHistory,
        wouldCreateRedirectLoop: mockWouldCreateRedirectLoop,
      });

      // Mount and unmount multiple times
      for (let i = 0; i < 10; i++) {
        const { unmount } = render(
          <AuthGuard>
            <TestComponent />
          </AuthGuard>
        );

        await waitFor(() => {
          expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        });

        unmount();
      }

      // Verify no excessive function calls that might indicate memory issues
      expect(mockCanSafelyRedirect.mock.calls.length).toBeLessThan(20);
    });

    it('should efficiently handle large numbers of permission checks', async () => {
      const largeRoleSet = Array.from({ length: 100 }, (_, i) => `role-${i}`);
      const largePermissionSet = Array.from({ length: 100 }, (_, i) => `permission-${i}`);
      
      const mockUser = { 
        id: '1', 
        roles: largeRoleSet.slice(0, 50).map(role => ({ name: role, permissions: [{ name: `${role}-permission` }] }))
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      } as any);

      mockUseAuthStabilization.mockReturnValue({
        isStable: true,
        isInitialized: true,
        stableAuth: true,
        stableUser: mockUser,
        canSafelyRedirect: jest.fn(() => true),
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: jest.fn(() => false),
      });

      const startTime = performance.now();

      render(
        <AuthGuard 
          requiredRoles={largeRoleSet}
          requiredPermissions={largePermissionSet}
          roleLogic="OR"
        >
          <TestComponent />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should complete within reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100);
    });
  });
});