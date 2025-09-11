/**
 * Authentication Components Unit Tests
 * 
 * Comprehensive tests for authentication UI components including:
 * - Login form component
 * - Auth guard wrapper component  
 * - Profile dropdown component
 * - Authentication status indicators
 * - Protected route components
 * - Form validation and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/login-form';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ProfileDropdown } from '@/components/auth/profile-dropdown';
import { AuthStatus } from '@/components/auth/auth-status';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AuthProvider } from '@/contexts/auth-context';
import { AuthService } from '@/lib/auth-service';
import { useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/lib/auth-service');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
};

(useRouter as jest.Mock).mockReturnValue(mockRouter);

// Test wrapper with AuthProvider
const AuthWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('Authentication Components', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    
    // Default mock implementations
    mockAuthService.isAuthenticated.mockReturnValue(false);
    mockAuthService.getToken.mockReturnValue(null);
    mockAuthService.getUser.mockReturnValue(null);
  });

  describe('LoginForm', () => {
    const defaultProps = {
      onSuccess: jest.fn(),
      onError: jest.fn(),
    };

    it('should render login form with all fields', () => {
      render(
        <AuthWrapper>
          <LoginForm {...defaultProps} />
        </AuthWrapper>
      );

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should validate email format', async () => {
      render(
        <AuthWrapper>
          <LoginForm {...defaultProps} />
        </AuthWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });

    it('should validate password requirements', async () => {
      render(
        <AuthWrapper>
          <LoginForm {...defaultProps} minPasswordLength={8} />
        </AuthWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(passwordInput, 'weak');
      await user.click(submitButton);

      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });

    it('should handle successful login submission', async () => {
      const mockLoginData = {
        access_token: 'success-token',
        user: {
          id: 'user-success',
          email: 'success@example.com',
          name: 'Success User'
        }
      };

      mockAuthService.login.mockResolvedValue(mockLoginData);

      render(
        <AuthWrapper>
          <LoginForm {...defaultProps} />
        </AuthWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'success@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(mockAuthService.login).toHaveBeenCalledWith('success@example.com', 'password123');
        expect(defaultProps.onSuccess).toHaveBeenCalledWith(mockLoginData);
      });
    });

    it('should handle login errors', async () => {
      const loginError = new Error('Invalid credentials');
      mockAuthService.login.mockRejectedValue(loginError);

      render(
        <AuthWrapper>
          <LoginForm {...defaultProps} />
        </AuthWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(emailInput, 'error@example.com');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        expect(defaultProps.onError).toHaveBeenCalledWith(loginError);
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should toggle password visibility', async () => {
      render(
        <AuthWrapper>
          <LoginForm {...defaultProps} />
        </AuthWrapper>
      );

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByRole('button', { name: /show password/i });

      expect(passwordInput).toHaveAttribute('type', 'password');

      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();

      await user.click(toggleButton);

      expect(passwordInput).toHaveAttribute('type', 'password');
    });

    it('should handle remember me checkbox', async () => {
      render(
        <AuthWrapper>
          <LoginForm {...defaultProps} />
        </AuthWrapper>
      );

      const rememberCheckbox = screen.getByRole('checkbox', { name: /remember me/i });

      expect(rememberCheckbox).not.toBeChecked();

      await user.click(rememberCheckbox);

      expect(rememberCheckbox).toBeChecked();
    });

    it('should clear errors when typing in fields', async () => {
      const loginError = new Error('Login failed');
      mockAuthService.login.mockRejectedValue(loginError);

      render(
        <AuthWrapper>
          <LoginForm {...defaultProps} />
        </AuthWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Trigger error
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });

      // Clear error by typing
      await user.clear(emailInput);
      await user.type(emailInput, 'new@example.com');

      expect(screen.queryByText(/login failed/i)).not.toBeInTheDocument();
    });

    it('should handle keyboard navigation', async () => {
      render(
        <AuthWrapper>
          <LoginForm {...defaultProps} />
        </AuthWrapper>
      );

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const rememberCheckbox = screen.getByRole('checkbox', { name: /remember me/i });
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      // Tab through form elements
      await user.tab();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(rememberCheckbox).toHaveFocus();

      await user.tab();
      expect(submitButton).toHaveFocus();
    });
  });

  describe('AuthGuard', () => {
    const MockProtectedContent = () => <div data-testid="protected-content">Protected Content</div>;

    it('should render children when authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'user-authenticated',
        roles: ['user']
      });

      render(
        <AuthWrapper>
          <AuthGuard>
            <MockProtectedContent />
          </AuthGuard>
        </AuthWrapper>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should show login prompt when not authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      render(
        <AuthWrapper>
          <AuthGuard>
            <MockProtectedContent />
          </AuthGuard>
        </AuthWrapper>
      );

      expect(screen.getByText(/you need to be logged in/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should redirect to login page when configured', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      render(
        <AuthWrapper>
          <AuthGuard redirectTo="/login">
            <MockProtectedContent />
          </AuthGuard>
        </AuthWrapper>
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });

    it('should enforce role-based access', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'user-basic',
        roles: ['user'] // User doesn't have admin role
      });

      render(
        <AuthWrapper>
          <AuthGuard requiredRoles={['admin']}>
            <MockProtectedContent />
          </AuthGuard>
        </AuthWrapper>
      );

      expect(screen.getByText(/you don't have permission/i)).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should show loading state during authentication check', () => {
      mockAuthService.isAuthenticated.mockImplementation(() => {
        throw new Promise(() => {}); // Never resolves to simulate loading
      });

      render(
        <AuthWrapper>
          <AuthGuard>
            <MockProtectedContent />
          </AuthGuard>
        </AuthWrapper>
      );

      expect(screen.getByTestId('auth-loading')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should handle custom fallback component', () => {
      const CustomFallback = () => <div data-testid="custom-fallback">Custom Access Denied</div>;
      
      mockAuthService.isAuthenticated.mockReturnValue(false);

      render(
        <AuthWrapper>
          <AuthGuard fallback={<CustomFallback />}>
            <MockProtectedContent />
          </AuthGuard>
        </AuthWrapper>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('ProfileDropdown', () => {
    const mockUser = {
      id: 'profile-user',
      email: 'profile@example.com',
      name: 'Profile User',
      avatar: 'https://example.com/avatar.jpg'
    };

    it('should render user profile information', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue(mockUser);

      render(
        <AuthWrapper>
          <ProfileDropdown />
        </AuthWrapper>
      );

      expect(screen.getByText('Profile User')).toBeInTheDocument();
      expect(screen.getByText('profile@example.com')).toBeInTheDocument();
    });

    it('should show login button when not authenticated', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      render(
        <AuthWrapper>
          <ProfileDropdown />
        </AuthWrapper>
      );

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('should open dropdown menu on click', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue(mockUser);

      render(
        <AuthWrapper>
          <ProfileDropdown />
        </AuthWrapper>
      );

      const profileButton = screen.getByRole('button', { name: /profile menu/i });
      
      await user.click(profileButton);

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /sign out/i })).toBeInTheDocument();
    });

    it('should handle logout', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue(mockUser);
      mockAuthService.logout.mockResolvedValue(undefined);

      render(
        <AuthWrapper>
          <ProfileDropdown />
        </AuthWrapper>
      );

      const profileButton = screen.getByRole('button', { name: /profile menu/i });
      await user.click(profileButton);

      const logoutItem = screen.getByRole('menuitem', { name: /sign out/i });
      await user.click(logoutItem);

      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('should navigate to profile page', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue(mockUser);

      render(
        <AuthWrapper>
          <ProfileDropdown />
        </AuthWrapper>
      );

      const profileButton = screen.getByRole('button', { name: /profile menu/i });
      await user.click(profileButton);

      const profileItem = screen.getByRole('menuitem', { name: /profile/i });
      await user.click(profileItem);

      expect(mockRouter.push).toHaveBeenCalledWith('/profile');
    });

    it('should display user avatar', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue(mockUser);

      render(
        <AuthWrapper>
          <ProfileDropdown />
        </AuthWrapper>
      );

      const avatar = screen.getByRole('img', { name: /profile avatar/i });
      expect(avatar).toHaveAttribute('src', mockUser.avatar);
    });

    it('should show fallback avatar when no image provided', () => {
      const userWithoutAvatar = { ...mockUser, avatar: undefined };
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue(userWithoutAvatar);

      render(
        <AuthWrapper>
          <ProfileDropdown />
        </AuthWrapper>
      );

      expect(screen.getByText('PU')).toBeInTheDocument(); // Initials fallback
    });
  });

  describe('AuthStatus', () => {
    it('should show authenticated status', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'status-user',
        name: 'Status User'
      });

      render(
        <AuthWrapper>
          <AuthStatus />
        </AuthWrapper>
      );

      expect(screen.getByText(/authenticated as status user/i)).toBeInTheDocument();
      expect(screen.getByTestId('status-indicator-authenticated')).toBeInTheDocument();
    });

    it('should show unauthenticated status', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      render(
        <AuthWrapper>
          <AuthStatus />
        </AuthWrapper>
      );

      expect(screen.getByText(/not authenticated/i)).toBeInTheDocument();
      expect(screen.getByTestId('status-indicator-unauthenticated')).toBeInTheDocument();
    });

    it('should show session expiry warning', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getTokenExpiry.mockReturnValue(Date.now() + 5 * 60 * 1000); // 5 minutes

      render(
        <AuthWrapper>
          <AuthStatus showSessionInfo={true} />
        </AuthWrapper>
      );

      expect(screen.getByText(/session expires in/i)).toBeInTheDocument();
    });

    it('should handle session refresh', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getTokenExpiry.mockReturnValue(Date.now() + 60 * 1000); // 1 minute
      mockAuthService.refreshToken.mockResolvedValue('new-token');

      render(
        <AuthWrapper>
          <AuthStatus showSessionInfo={true} />
        </AuthWrapper>
      );

      const refreshButton = screen.getByRole('button', { name: /extend session/i });
      await user.click(refreshButton);

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
    });
  });

  describe('ProtectedRoute', () => {
    const MockComponent = () => <div data-testid="route-content">Route Content</div>;

    it('should render component when authorized', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'route-user',
        roles: ['user']
      });

      render(
        <AuthWrapper>
          <ProtectedRoute component={MockComponent} />
        </AuthWrapper>
      );

      expect(screen.getByTestId('route-content')).toBeInTheDocument();
    });

    it('should redirect when not authorized', () => {
      mockAuthService.isAuthenticated.mockReturnValue(false);

      render(
        <AuthWrapper>
          <ProtectedRoute 
            component={MockComponent}
            redirectTo="/login"
          />
        </AuthWrapper>
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/login');
      expect(screen.queryByTestId('route-content')).not.toBeInTheDocument();
    });

    it('should enforce role requirements', () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'route-user',
        roles: ['user'] // Missing admin role
      });

      render(
        <AuthWrapper>
          <ProtectedRoute 
            component={MockComponent}
            requiredRoles={['admin']}
            redirectTo="/unauthorized"
          />
        </AuthWrapper>
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/unauthorized');
    });

    it('should pass props to protected component', () => {
      const MockComponentWithProps = ({ testProp }: { testProp: string }) => (
        <div data-testid="route-content">{testProp}</div>
      );

      mockAuthService.isAuthenticated.mockReturnValue(true);

      render(
        <AuthWrapper>
          <ProtectedRoute 
            component={MockComponentWithProps}
            componentProps={{ testProp: 'test value' }}
          />
        </AuthWrapper>
      );

      expect(screen.getByText('test value')).toBeInTheDocument();
    });
  });

  describe('Component Accessibility', () => {
    it('should have proper ARIA labels for LoginForm', () => {
      render(
        <AuthWrapper>
          <LoginForm onSuccess={jest.fn()} onError={jest.fn()} />
        </AuthWrapper>
      );

      expect(screen.getByRole('form', { name: /login form/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    });

    it('should support keyboard navigation', async () => {
      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({
        id: 'keyboard-user',
        name: 'Keyboard User'
      });

      render(
        <AuthWrapper>
          <ProfileDropdown />
        </AuthWrapper>
      );

      const profileButton = screen.getByRole('button', { name: /profile menu/i });
      
      profileButton.focus();
      expect(profileButton).toHaveFocus();

      // Open menu with Enter key
      fireEvent.keyDown(profileButton, { key: 'Enter' });
      
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should announce status changes to screen readers', () => {
      const { rerender } = render(
        <AuthWrapper>
          <AuthStatus />
        </AuthWrapper>
      );

      // Check for status announcements
      expect(screen.getByRole('status')).toBeInTheDocument();

      mockAuthService.isAuthenticated.mockReturnValue(true);
      mockAuthService.getUser.mockReturnValue({ id: '1', name: 'User' });

      rerender(
        <AuthWrapper>
          <AuthStatus />
        </AuthWrapper>
      );

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });
});