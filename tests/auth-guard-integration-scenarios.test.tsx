/**
 * Integration Tests for Real-World AuthGuard Scenarios
 * 
 * This test suite simulates real-world scenarios including:
 * 1. Cross-tab authentication synchronization
 * 2. Network interruption recovery
 * 3. Session timeout handling
 * 4. Multi-step authentication flows
 * 5. Permission changes during active sessions
 */

import React, { useState } from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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
  usePathname: () => '/dashboard',
}));

describe('AuthGuard Real-World Integration Scenarios', () => {
  const ProtectedContent = () => <div data-testid="dashboard">Dashboard Content</div>;
  const LoginForm = () => <div data-testid="login-form">Please login</div>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Set up default successful stabilization
    mockUseAuthStabilization.mockReturnValue({
      isStable: true,
      isInitialized: true,
      stableAuth: true,
      stableUser: { id: '1', roles: ['user'] },
      canSafelyRedirect: jest.fn(() => true),
      addRedirectToHistory: jest.fn(),
      wouldCreateRedirectLoop: jest.fn(() => false),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Cross-Tab Authentication Synchronization', () => {
    it('should handle login in another tab', async () => {
      // Start unauthenticated
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

      const { rerender } = render(
        <AuthGuard fallback={<LoginForm />}>
          <ProtectedContent />
        </AuthGuard>
      );

      // Initially should show login form
      expect(screen.getByTestId('login-form')).toBeInTheDocument();

      // Simulate login in another tab (storage event)
      act(() => {
        // Auth context detects change from localStorage/other tab
        mockUseAuth.mockReturnValue({
          user: { id: '1', roles: ['user'] },
          isAuthenticated: true,
          isLoading: false,
        } as any);

        // Initially destabilized due to change
        mockUseAuthStabilization.mockReturnValue({
          isStable: false,
          isInitialized: true,
          stableAuth: false,
          stableUser: null,
          canSafelyRedirect: jest.fn(() => false),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard fallback={<LoginForm />}>
            <ProtectedContent />
          </AuthGuard>
        );
      });

      // Should show loading during stabilization
      expect(screen.getByText('Initializing...')).toBeInTheDocument();

      // Wait for stabilization
      act(() => {
        mockUseAuthStabilization.mockReturnValue({
          isStable: true,
          isInitialized: true,
          stableAuth: true,
          stableUser: { id: '1', roles: ['user'] },
          canSafelyRedirect: jest.fn(() => true),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard fallback={<LoginForm />}>
            <ProtectedContent />
          </AuthGuard>
        );

        jest.advanceTimersByTime(200);
      });

      // Should now show protected content
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
      });
    });

    it('should handle logout in another tab', async () => {
      // Start authenticated
      mockUseAuth.mockReturnValue({
        user: { id: '1', roles: ['user'] },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      const { rerender } = render(
        <AuthGuard fallback={<LoginForm />}>
          <ProtectedContent />
        </AuthGuard>
      );

      // Initially should show protected content
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Simulate logout in another tab
      act(() => {
        mockUseAuth.mockReturnValue({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        } as any);

        // Destabilize temporarily
        mockUseAuthStabilization.mockReturnValue({
          isStable: false,
          isInitialized: true,
          stableAuth: true, // Still old stable state
          stableUser: { id: '1', roles: ['user'] },
          canSafelyRedirect: jest.fn(() => false),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard fallback={<LoginForm />}>
            <ProtectedContent />
          </AuthGuard>
        );
      });

      // Stabilize with logged out state
      act(() => {
        mockUseAuthStabilization.mockReturnValue({
          isStable: true,
          isInitialized: true,
          stableAuth: false,
          stableUser: null,
          canSafelyRedirect: jest.fn(() => true),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard fallback={<LoginForm />}>
            <ProtectedContent />
          </AuthGuard>
        );

        jest.advanceTimersByTime(200);
      });

      // Should show login form
      await waitFor(() => {
        expect(screen.getByTestId('login-form')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
      });
    });
  });

  describe('Network Interruption Recovery', () => {
    it('should handle network interruption during auth check', async () => {
      // Start with loading state (network request in progress)
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
        canSafelyRedirect: jest.fn(() => false),
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: jest.fn(() => false),
      });

      const { rerender } = render(
        <AuthGuard fallback={<LoginForm />}>
          <ProtectedContent />
        </AuthGuard>
      );

      // Should show loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate network failure -> success cycle
      const networkStates = [
        { loading: false, authenticated: false, user: null }, // Failed
        { loading: true, authenticated: false, user: null },  // Retrying
        { loading: false, authenticated: true, user: { id: '1' } }, // Success
      ];

      for (const [index, state] of networkStates.entries()) {
        act(() => {
          mockUseAuth.mockReturnValue({
            user: state.user,
            isAuthenticated: state.authenticated,
            isLoading: state.loading,
          } as any);

          // Keep unstable during network issues
          if (index < networkStates.length - 1) {
            mockUseAuthStabilization.mockReturnValue({
              isStable: false,
              isInitialized: false,
              stableAuth: false,
              stableUser: null,
              canSafelyRedirect: jest.fn(() => false),
              addRedirectToHistory: jest.fn(),
              wouldCreateRedirectLoop: jest.fn(() => false),
            });
          } else {
            // Final success state
            mockUseAuthStabilization.mockReturnValue({
              isStable: true,
              isInitialized: true,
              stableAuth: true,
              stableUser: { id: '1' },
              canSafelyRedirect: jest.fn(() => true),
              addRedirectToHistory: jest.fn(),
              wouldCreateRedirectLoop: jest.fn(() => false),
            });
          }

          rerender(
            <AuthGuard fallback={<LoginForm />}>
              <ProtectedContent />
            </AuthGuard>
          );

          jest.advanceTimersByTime(100);
        });
      }

      // Should eventually show protected content
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });

    it('should handle intermittent connectivity', async () => {
      let authState = {
        user: { id: '1', roles: ['user'] },
        isAuthenticated: true,
        isLoading: false,
      };

      mockUseAuth.mockReturnValue(authState as any);

      const { rerender } = render(
        <AuthGuard fallback={<LoginForm />}>
          <ProtectedContent />
        </AuthGuard>
      );

      // Initially authenticated
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Simulate connection drops causing auth state to flicker
      const connectivityStates = [
        { loading: true, authenticated: true },   // Connection checking
        { loading: false, authenticated: false }, // Brief disconnection
        { loading: true, authenticated: false },  // Reconnecting
        { loading: false, authenticated: true },  // Reconnected
      ];

      for (const [index, state] of connectivityStates.entries()) {
        act(() => {
          mockUseAuth.mockReturnValue({
            user: state.authenticated ? { id: '1', roles: ['user'] } : null,
            isAuthenticated: state.authenticated,
            isLoading: state.loading,
          } as any);

          // Keep unstable during connectivity issues
          mockUseAuthStabilization.mockReturnValue({
            isStable: false,
            isInitialized: true,
            stableAuth: true, // Keep stable auth during flicker
            stableUser: { id: '1', roles: ['user'] },
            canSafelyRedirect: jest.fn(() => false),
            addRedirectToHistory: jest.fn(),
            wouldCreateRedirectLoop: jest.fn(() => false),
          });

          rerender(
            <AuthGuard fallback={<LoginForm />}>
              <ProtectedContent />
            </AuthGuard>
          );

          jest.advanceTimersByTime(50);
        });

        // During instability, should show loading or keep current content
        const loadingElement = screen.queryByText('Initializing...');
        const dashboardElement = screen.queryByTestId('dashboard');
        expect(loadingElement || dashboardElement).toBeInTheDocument();
      }

      // Final stabilization
      act(() => {
        mockUseAuthStabilization.mockReturnValue({
          isStable: true,
          isInitialized: true,
          stableAuth: true,
          stableUser: { id: '1', roles: ['user'] },
          canSafelyRedirect: jest.fn(() => true),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard fallback={<LoginForm />}>
            <ProtectedContent />
          </AuthGuard>
        );

        jest.advanceTimersByTime(200);
      });

      // Should maintain access throughout
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Session Timeout Handling', () => {
    it('should handle gradual session expiration', async () => {
      // Start authenticated
      mockUseAuth.mockReturnValue({
        user: { id: '1', roles: ['user'], tokenExpiry: Date.now() + 60000 },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      const { rerender } = render(
        <AuthGuard fallback={<LoginForm />}>
          <ProtectedContent />
        </AuthGuard>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Simulate token approaching expiry
      act(() => {
        mockUseAuth.mockReturnValue({
          user: { id: '1', roles: ['user'], tokenExpiry: Date.now() + 5000 },
          isAuthenticated: true,
          isLoading: false,
        } as any);

        // Destabilize during token refresh
        mockUseAuthStabilization.mockReturnValue({
          isStable: false,
          isInitialized: true,
          stableAuth: true,
          stableUser: { id: '1', roles: ['user'] },
          canSafelyRedirect: jest.fn(() => false),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard fallback={<LoginForm />}>
            <ProtectedContent />
          </AuthGuard>
        );
      });

      // Simulate token expiration
      act(() => {
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

        rerender(
          <AuthGuard fallback={<LoginForm />}>
            <ProtectedContent />
          </AuthGuard>
        );

        jest.advanceTimersByTime(200);
      });

      // Should show login form after token expires
      await waitFor(() => {
        expect(screen.getByTestId('login-form')).toBeInTheDocument();
        expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
      });
    });
  });

  describe('Multi-Step Authentication Flows', () => {
    it('should handle 2FA authentication flow', async () => {
      // Start with initial login success but 2FA required
      mockUseAuth.mockReturnValue({
        user: { id: '1', requires2FA: true },
        isAuthenticated: false, // Not fully authenticated until 2FA
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

      const TwoFactorForm = () => <div data-testid="two-factor">Enter 2FA Code</div>;

      const { rerender } = render(
        <AuthGuard 
          fallback={<TwoFactorForm />}
          customPermissionCheck={(user) => user && !user.requires2FA}
        >
          <ProtectedContent />
        </AuthGuard>
      );

      // Should show 2FA form
      expect(screen.getByTestId('two-factor')).toBeInTheDocument();

      // Complete 2FA
      act(() => {
        mockUseAuth.mockReturnValue({
          user: { id: '1', roles: ['user'] },
          isAuthenticated: true,
          isLoading: false,
        } as any);

        mockUseAuthStabilization.mockReturnValue({
          isStable: false, // Destabilize during 2FA completion
          isInitialized: true,
          stableAuth: false,
          stableUser: null,
          canSafelyRedirect: jest.fn(() => false),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard 
            fallback={<TwoFactorForm />}
            customPermissionCheck={(user) => user && !user.requires2FA}
          >
            <ProtectedContent />
          </AuthGuard>
        );
      });

      // Stabilize after 2FA
      act(() => {
        mockUseAuthStabilization.mockReturnValue({
          isStable: true,
          isInitialized: true,
          stableAuth: true,
          stableUser: { id: '1', roles: ['user'] },
          canSafelyRedirect: jest.fn(() => true),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard 
            fallback={<TwoFactorForm />}
            customPermissionCheck={(user) => user && !user.requires2FA}
          >
            <ProtectedContent />
          </AuthGuard>
        );

        jest.advanceTimersByTime(200);
      });

      // Should show protected content after successful 2FA
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
        expect(screen.queryByTestId('two-factor')).not.toBeInTheDocument();
      });
    });
  });

  describe('Permission Changes During Active Sessions', () => {
    it('should handle role changes during active session', async () => {
      // Start with user role
      mockUseAuth.mockReturnValue({
        user: { id: '1', roles: ['user'] },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      const AdminPanel = () => <div data-testid="admin-panel">Admin Panel</div>;
      const AccessDenied = () => <div data-testid="access-denied">Access Denied</div>;

      const { rerender } = render(
        <AuthGuard 
          requiredRoles={['admin']} 
          unauthorizedComponent={<AccessDenied />}
        >
          <AdminPanel />
        </AuthGuard>
      );

      // Should show access denied initially
      await waitFor(() => {
        expect(screen.getByTestId('access-denied')).toBeInTheDocument();
      });

      // Simulate role upgrade
      act(() => {
        mockUseAuth.mockReturnValue({
          user: { id: '1', roles: ['user', 'admin'] },
          isAuthenticated: true,
          isLoading: false,
        } as any);

        // Destabilize during role change
        mockUseAuthStabilization.mockReturnValue({
          isStable: false,
          isInitialized: true,
          stableAuth: true,
          stableUser: { id: '1', roles: ['user'] }, // Old stable state
          canSafelyRedirect: jest.fn(() => false),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard 
            requiredRoles={['admin']} 
            unauthorizedComponent={<AccessDenied />}
          >
            <AdminPanel />
          </AuthGuard>
        );
      });

      // Stabilize with new roles
      act(() => {
        mockUseAuthStabilization.mockReturnValue({
          isStable: true,
          isInitialized: true,
          stableAuth: true,
          stableUser: { id: '1', roles: ['user', 'admin'] },
          canSafelyRedirect: jest.fn(() => true),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard 
            requiredRoles={['admin']} 
            unauthorizedComponent={<AccessDenied />}
          >
            <AdminPanel />
          </AuthGuard>
        );

        jest.advanceTimersByTime(200);
      });

      // Should now show admin panel
      await waitFor(() => {
        expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
        expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
      });
    });

    it('should handle permission revocation during active session', async () => {
      // Start with admin access
      mockUseAuth.mockReturnValue({
        user: { id: '1', roles: ['admin'] },
        isAuthenticated: true,
        isLoading: false,
      } as any);

      const AdminPanel = () => <div data-testid="admin-panel">Admin Panel</div>;
      const AccessDenied = () => <div data-testid="access-denied">Access Denied</div>;

      const { rerender } = render(
        <AuthGuard 
          requiredRoles={['admin']} 
          unauthorizedComponent={<AccessDenied />}
        >
          <AdminPanel />
        </AuthGuard>
      );

      // Should show admin panel initially
      await waitFor(() => {
        expect(screen.getByTestId('admin-panel')).toBeInTheDocument();
      });

      // Simulate permission revocation
      act(() => {
        mockUseAuth.mockReturnValue({
          user: { id: '1', roles: ['user'] }, // Admin role removed
          isAuthenticated: true,
          isLoading: false,
        } as any);

        // Destabilize during permission change
        mockUseAuthStabilization.mockReturnValue({
          isStable: false,
          isInitialized: true,
          stableAuth: true,
          stableUser: { id: '1', roles: ['admin'] }, // Old stable state
          canSafelyRedirect: jest.fn(() => false),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard 
            requiredRoles={['admin']} 
            unauthorizedComponent={<AccessDenied />}
          >
            <AdminPanel />
          </AuthGuard>
        );
      });

      // Stabilize with revoked permissions
      act(() => {
        mockUseAuthStabilization.mockReturnValue({
          isStable: true,
          isInitialized: true,
          stableAuth: true,
          stableUser: { id: '1', roles: ['user'] },
          canSafelyRedirect: jest.fn(() => true),
          addRedirectToHistory: jest.fn(),
          wouldCreateRedirectLoop: jest.fn(() => false),
        });

        rerender(
          <AuthGuard 
            requiredRoles={['admin']} 
            unauthorizedComponent={<AccessDenied />}
          >
            <AdminPanel />
          </AuthGuard>
        );

        jest.advanceTimersByTime(200);
      });

      // Should now show access denied
      await waitFor(() => {
        expect(screen.getByTestId('access-denied')).toBeInTheDocument();
        expect(screen.queryByTestId('admin-panel')).not.toBeInTheDocument();
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should handle many rapid state changes efficiently', async () => {
      const renderStartTime = performance.now();
      
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
        canSafelyRedirect: jest.fn(() => false),
        addRedirectToHistory: jest.fn(),
        wouldCreateRedirectLoop: jest.fn(() => false),
      });

      const { rerender } = render(
        <AuthGuard fallback={<LoginForm />}>
          <ProtectedContent />
        </AuthGuard>
      );

      // Simulate 50 rapid state changes
      for (let i = 0; i < 50; i++) {
        act(() => {
          mockUseAuth.mockReturnValue({
            user: i % 3 === 0 ? { id: `${i}` } : null,
            isAuthenticated: i % 3 === 0,
            isLoading: i % 2 === 0,
          } as any);

          rerender(
            <AuthGuard fallback={<LoginForm />}>
              <ProtectedContent />
            </AuthGuard>
          );

          jest.advanceTimersByTime(10);
        });
      }

      // Final stabilization
      act(() => {
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

        rerender(
          <AuthGuard fallback={<LoginForm />}>
            <ProtectedContent />
          </AuthGuard>
        );

        jest.advanceTimersByTime(200);
      });

      const renderEndTime = performance.now();
      const totalRenderTime = renderEndTime - renderStartTime;

      // Should complete within reasonable time despite many state changes
      expect(totalRenderTime).toBeLessThan(1000); // Less than 1 second

      // Should eventually show correct content
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });
  });
});