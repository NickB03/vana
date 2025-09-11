/**
 * Authentication E2E Tests
 * 
 * End-to-end tests for complete authentication flows using Playwright:
 * - Full login/logout workflows
 * - Registration and email verification
 * - Password reset flows
 * - Protected route navigation
 * - Session persistence across page reloads
 * - Multi-tab authentication state
 * - Token expiration scenarios
 * - Error recovery flows
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:8000';

// Test users
const TEST_USERS = {
  valid: {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User'
  },
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User'
  },
  unverified: {
    email: 'unverified@example.com',
    password: 'password123',
    name: 'Unverified User'
  }
};

// Helper functions
class AuthHelper {
  constructor(private page: Page) {}

  async login(credentials = TEST_USERS.valid) {
    await this.page.goto(`${BASE_URL}/login`);
    
    // Fill login form
    await this.page.fill('[data-testid="email-input"]', credentials.email);
    await this.page.fill('[data-testid="password-input"]', credentials.password);
    
    // Submit form
    await this.page.click('[data-testid="login-submit"]');
    
    // Wait for redirect or success indicator
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  async logout() {
    // Click profile dropdown
    await this.page.click('[data-testid="profile-dropdown"]');
    
    // Click logout
    await this.page.click('[data-testid="logout-button"]');
    
    // Wait for redirect to login page
    await this.page.waitForURL('**/login', { timeout: 5000 });
  }

  async expectAuthenticated() {
    // Check for authenticated user indicator
    await expect(this.page.locator('[data-testid="user-avatar"]')).toBeVisible();
    
    // Check that login page is not accessible
    await this.page.goto(`${BASE_URL}/login`);
    await expect(this.page).toHaveURL(/.*dashboard.*/);
  }

  async expectUnauthenticated() {
    // Check for login form
    await expect(this.page.locator('[data-testid="login-form"]')).toBeVisible();
    
    // Check that protected pages redirect
    await this.page.goto(`${BASE_URL}/dashboard`);
    await expect(this.page).toHaveURL(/.*login.*/);
  }

  async getStoredToken() {
    return await this.page.evaluate(() => {
      return localStorage.getItem('vana_auth_token');
    });
  }

  async clearAuthStorage() {
    await this.page.evaluate(() => {
      localStorage.removeItem('vana_auth_token');
      localStorage.removeItem('vana_user_data');
      sessionStorage.clear();
    });
  }
}

test.describe('Authentication E2E Tests', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    
    // Clear any existing auth state
    await authHelper.clearAuthStorage();
    
    // Set up API mocks for consistent testing
    await page.route('**/auth/login', route => {
      const postData = route.request().postDataJSON();
      
      if (postData?.email === TEST_USERS.valid.email && postData?.password === TEST_USERS.valid.password) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock_jwt_token_e2e',
            token_type: 'bearer',
            expires_in: 3600,
            user: {
              id: 'e2e_user_123',
              email: TEST_USERS.valid.email,
              name: TEST_USERS.valid.name
            }
          })
        });
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid credentials' })
        });
      }
    });

    await page.route('**/auth/logout', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/auth/me', route => {
      const authHeader = route.request().headers()['authorization'];
      
      if (authHeader?.includes('mock_jwt_token_e2e')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'e2e_user_123',
            email: TEST_USERS.valid.email,
            name: TEST_USERS.valid.name,
            roles: ['user']
          })
        });
      } else {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Authentication required' })
        });
      }
    });
  });

  test.describe('Login Flow', () => {
    test('should complete successful login workflow', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Verify login page elements
      await expect(page.locator('h1')).toContainText('Sign In');
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();

      // Fill and submit form
      await page.fill('[data-testid="email-input"]', TEST_USERS.valid.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.valid.password);
      
      // Check remember me option
      await page.check('[data-testid="remember-me"]');
      
      await page.click('[data-testid="login-submit"]');

      // Wait for loading state
      await expect(page.locator('[data-testid="login-loading"]')).toBeVisible();

      // Wait for successful redirect
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Verify authenticated state
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
      await expect(page.locator('[data-testid="user-name"]')).toContainText(TEST_USERS.valid.name);

      // Verify token is stored
      const token = await authHelper.getStoredToken();
      expect(token).toBeTruthy();
    });

    test('should handle login validation errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Test empty form submission
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');

      // Test invalid email format
      await page.fill('[data-testid="email-input"]', 'invalid-email');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');

      // Test short password
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', '123');
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least');
    });

    test('should handle login authentication errors', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Use invalid credentials
      await page.fill('[data-testid="email-input"]', 'wrong@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-submit"]');

      // Check for error message
      await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
      
      // Verify still on login page
      await expect(page).toHaveURL(/.*login.*/);
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

      // Verify no token stored
      const token = await authHelper.getStoredToken();
      expect(token).toBeFalsy();
    });

    test('should clear errors when user starts typing', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Trigger validation error
      await page.click('[data-testid="login-submit"]');
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

      // Start typing in email field
      await page.fill('[data-testid="email-input"]', 't');
      
      // Error should disappear
      await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();
    });

    test('should show password visibility toggle', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      const passwordInput = page.locator('[data-testid="password-input"]');
      const toggleButton = page.locator('[data-testid="password-toggle"]');

      // Initially hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');

      // Click again to hide
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
      await expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    });
  });

  test.describe('Logout Flow', () => {
    test('should complete successful logout workflow', async ({ page }) => {
      // Login first
      await authHelper.login();
      await authHelper.expectAuthenticated();

      // Open profile dropdown
      await page.click('[data-testid="profile-dropdown"]');
      await expect(page.locator('[data-testid="profile-menu"]')).toBeVisible();

      // Click logout
      await page.click('[data-testid="logout-button"]');

      // Wait for redirect to login
      await page.waitForURL('**/login', { timeout: 5000 });

      // Verify logged out state
      await authHelper.expectUnauthenticated();

      // Verify token is cleared
      const token = await authHelper.getStoredToken();
      expect(token).toBeFalsy();
    });

    test('should logout from all tabs', async ({ context }) => {
      // Create two tabs
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      const auth1 = new AuthHelper(page1);
      const auth2 = new AuthHelper(page2);

      // Login in first tab
      await auth1.login();
      
      // Navigate to dashboard in second tab
      await page2.goto(`${BASE_URL}/dashboard`);
      await auth2.expectAuthenticated();

      // Logout from first tab
      await auth1.logout();

      // Second tab should also be logged out
      await page2.reload();
      await page2.waitForURL('**/login', { timeout: 5000 });
      await auth2.expectUnauthenticated();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected routes
      const protectedRoutes = ['/dashboard', '/profile', '/settings'];

      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        await page.waitForURL('**/login**', { timeout: 5000 });
        
        // Should include redirect parameter
        expect(page.url()).toContain(`redirect=${encodeURIComponent(route)}`);
      }
    });

    test('should allow authenticated users to access protected routes', async ({ page }) => {
      await authHelper.login();

      const protectedRoutes = ['/dashboard', '/profile', '/settings'];

      for (const route of protectedRoutes) {
        await page.goto(`${BASE_URL}${route}`);
        
        // Should stay on the protected route
        await expect(page).toHaveURL(`**${route}`);
        await authHelper.expectAuthenticated();
      }
    });

    test('should redirect after login when coming from protected route', async ({ page }) => {
      // Try to access protected route
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForURL('**/login**');

      // Login
      await page.fill('[data-testid="email-input"]', TEST_USERS.valid.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.valid.password);
      await page.click('[data-testid="login-submit"]');

      // Should redirect back to original route
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await expect(page).toHaveURL(/.*dashboard.*/);
    });
  });

  test.describe('Session Persistence', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      await authHelper.login();
      
      // Reload page
      await page.reload();
      
      // Should still be authenticated
      await authHelper.expectAuthenticated();
      
      // Verify user data is preserved
      await expect(page.locator('[data-testid="user-name"]')).toContainText(TEST_USERS.valid.name);
    });

    test('should maintain session across browser restart', async ({ browser }) => {
      const context1 = await browser.newContext();
      const page1 = await context1.newPage();
      const auth1 = new AuthHelper(page1);

      // Login and check remember me
      await page1.goto(`${BASE_URL}/login`);
      await page1.fill('[data-testid="email-input"]', TEST_USERS.valid.email);
      await page1.fill('[data-testid="password-input"]', TEST_USERS.valid.password);
      await page1.check('[data-testid="remember-me"]');
      await page1.click('[data-testid="login-submit"]');
      await page1.waitForURL('**/dashboard');

      // Close browser context (simulate browser restart)
      await context1.close();

      // Create new context (simulate fresh browser session)
      const context2 = await browser.newContext();
      const page2 = await context2.newPage();
      const auth2 = new AuthHelper(page2);

      // Should still be authenticated if remember me was checked
      await page2.goto(`${BASE_URL}/dashboard`);
      await auth2.expectAuthenticated();

      await context2.close();
    });

    test('should handle concurrent sessions correctly', async ({ context }) => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      const auth1 = new AuthHelper(page1);
      const auth2 = new AuthHelper(page2);

      // Login in first tab
      await auth1.login();
      
      // Second tab should also show authenticated state
      await page2.goto(`${BASE_URL}/dashboard`);
      await auth2.expectAuthenticated();

      // Logout from second tab
      await page2.click('[data-testid="profile-dropdown"]');
      await page2.click('[data-testid="logout-button"]');

      // First tab should also be logged out
      await page1.reload();
      await page1.waitForURL('**/login', { timeout: 5000 });
    });
  });

  test.describe('Token Management', () => {
    test('should handle token expiration gracefully', async ({ page }) => {
      await authHelper.login();

      // Mock expired token response
      await page.route('**/auth/me', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Token expired' })
        });
      });

      // Navigate to a page that requires authentication
      await page.goto(`${BASE_URL}/profile`);
      
      // Should redirect to login due to expired token
      await page.waitForURL('**/login', { timeout: 10000 });
      
      // Should show token expiration message
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });

    test('should refresh token automatically', async ({ page }) => {
      let refreshCalled = false;
      
      await page.route('**/auth/refresh', route => {
        refreshCalled = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'new_refreshed_token',
            expires_in: 3600
          })
        });
      });

      await authHelper.login();
      
      // Simulate token near expiration
      await page.evaluate(() => {
        // Trigger token refresh logic
        window.dispatchEvent(new Event('token-refresh-needed'));
      });

      // Wait for refresh to be called
      await page.waitForFunction(() => refreshCalled, { timeout: 5000 });
      
      // Should still be authenticated with new token
      await authHelper.expectAuthenticated();
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should initiate password reset request', async ({ page }) => {
      await page.route('**/auth/reset-password', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Reset email sent' })
        });
      });

      await page.goto(`${BASE_URL}/login`);
      
      // Click forgot password link
      await page.click('[data-testid="forgot-password-link"]');
      
      // Should navigate to reset page
      await expect(page).toHaveURL(/.*reset-password.*/);
      
      // Fill email and submit
      await page.fill('[data-testid="reset-email-input"]', TEST_USERS.valid.email);
      await page.click('[data-testid="reset-submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="reset-success"]')).toContainText('Reset email sent');
    });

    test('should complete password reset with valid token', async ({ page }) => {
      await page.route('**/auth/reset-password/confirm', route => {
        const postData = route.request().postDataJSON();
        
        if (postData?.token === 'valid_reset_token') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Password updated successfully' })
          });
        } else {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({ detail: 'Invalid or expired token' })
          });
        }
      });

      // Navigate to reset confirmation page with token
      await page.goto(`${BASE_URL}/reset-password/confirm?token=valid_reset_token`);
      
      // Fill new password
      await page.fill('[data-testid="new-password-input"]', 'newpassword123');
      await page.fill('[data-testid="confirm-password-input"]', 'newpassword123');
      
      await page.click('[data-testid="update-password-submit"]');
      
      // Should show success and redirect to login
      await expect(page.locator('[data-testid="password-update-success"]')).toBeVisible();
      await page.waitForURL('**/login', { timeout: 5000 });
    });
  });

  test.describe('Registration Flow', () => {
    test('should complete user registration', async ({ page }) => {
      await page.route('**/auth/register', route => {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Registration successful',
            user: {
              id: 'new_user_123',
              email: 'newuser@example.com',
              name: 'New User'
            }
          })
        });
      });

      await page.goto(`${BASE_URL}/register`);
      
      // Fill registration form
      await page.fill('[data-testid="register-name-input"]', 'New User');
      await page.fill('[data-testid="register-email-input"]', 'newuser@example.com');
      await page.fill('[data-testid="register-password-input"]', 'password123');
      await page.fill('[data-testid="register-confirm-password-input"]', 'password123');
      
      // Accept terms
      await page.check('[data-testid="accept-terms"]');
      
      await page.click('[data-testid="register-submit"]');
      
      // Should show success message
      await expect(page.locator('[data-testid="registration-success"]')).toContainText('Registration successful');
      
      // Should redirect to email verification page
      await page.waitForURL('**/verify-email', { timeout: 5000 });
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="remember-me"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
      
      // Should be able to submit with Enter
      await page.keyboard.press('Enter');
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Check form accessibility
      await expect(page.locator('form')).toHaveAttribute('role', 'form');
      await expect(page.locator('[data-testid="email-input"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="password-input"]')).toHaveAttribute('aria-label');
      
      // Check error messages are associated
      await page.click('[data-testid="login-submit"]');
      
      const emailInput = page.locator('[data-testid="email-input"]');
      const emailError = page.locator('[data-testid="email-error"]');
      
      await expect(emailError).toHaveAttribute('role', 'alert');
      await expect(emailInput).toHaveAttribute('aria-describedby');
    });
  });

  test.describe('Error Recovery', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network error
      await page.route('**/auth/login', route => {
        route.abort('failed');
      });

      await page.goto(`${BASE_URL}/login`);
      await page.fill('[data-testid="email-input"]', TEST_USERS.valid.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.valid.password);
      await page.click('[data-testid="login-submit"]');

      // Should show network error message
      await expect(page.locator('[data-testid="network-error"]')).toContainText('Network error');
      
      // Should show retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should retry failed requests', async ({ page }) => {
      let attemptCount = 0;
      
      await page.route('**/auth/login', route => {
        attemptCount++;
        
        if (attemptCount === 1) {
          // First attempt fails
          route.abort('failed');
        } else {
          // Second attempt succeeds
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              access_token: 'success_token',
              user: { id: '123', email: TEST_USERS.valid.email, name: TEST_USERS.valid.name }
            })
          });
        }
      });

      await page.goto(`${BASE_URL}/login`);
      await page.fill('[data-testid="email-input"]', TEST_USERS.valid.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.valid.password);
      await page.click('[data-testid="login-submit"]');

      // First attempt should fail
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
      
      // Retry should succeed
      await page.click('[data-testid="retry-button"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await authHelper.expectAuthenticated();
    });
  });
});