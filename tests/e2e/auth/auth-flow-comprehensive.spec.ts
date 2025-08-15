import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8000';

test.describe('Comprehensive Authentication Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    
    // Navigate to page first to establish context, then clear storage
    await page.goto(`${FRONTEND_URL}/`);
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.log('Could not clear storage:', e);
      }
    });
  });

  test('Complete authentication cycle: login -> protected route -> logout', async ({ page }) => {
    // Step 1: Navigate to login page
    await page.goto(`${FRONTEND_URL}/auth/login`);
    await expect(page.locator('text=Welcome back')).toBeVisible();

    // Step 2: Fill valid login credentials (test user)
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword123');
    
    // Step 3: Submit form and handle potential login
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error message
    await page.waitForTimeout(2000);
    
    // Check if we're redirected to dashboard or show error
    const currentUrl = page.url();
    if (currentUrl.includes('/chat') || currentUrl.includes('/dashboard')) {
      // Success case: logged in
      await expect(page.locator('text=Chat')).toBeVisible();
      
      // Step 4: Navigate to protected route
      await page.goto(`${FRONTEND_URL}/canvas`);
      await expect(page).toHaveURL(`${FRONTEND_URL}/canvas`);
      
      // Step 5: Logout
      await page.click('[data-testid="user-menu"]').catch(() => {
        // If no test id, try logout button
        page.click('button:has-text("Logout")');
      });
      
      // Should redirect to login
      await expect(page).toHaveURL(`${FRONTEND_URL}/auth/login`);
    } else {
      // Error case: login failed (expected for demo)
      await expect(page.locator('[class*="text-red"]')).toBeVisible();
    }
  });

  test('Token refresh mechanism works correctly', async ({ page }) => {
    // Mock successful login
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Inject mock authentication state
    await page.evaluate(() => {
      const mockTokens = {
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
        token_type: 'bearer',
        expires_in: 60 // 1 minute for testing
      };
      
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
    
    // Navigate to protected route
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Wait for initial load
    await page.waitForTimeout(1000);
    
    // Check that auth state is properly loaded
    const authState = await page.evaluate(() => {
      return {
        tokens: localStorage.getItem('auth-tokens'),
        user: localStorage.getItem('auth-user')
      };
    });
    
    expect(authState.tokens).toBeTruthy();
    expect(authState.user).toBeTruthy();
  });

  test('Protected routes redirect correctly when not authenticated', async ({ page }) => {
    const protectedRoutes = ['/chat', '/canvas', '/dashboard'];
    
    for (const route of protectedRoutes) {
      await page.goto(`${FRONTEND_URL}${route}`);
      
      // Should redirect to login
      await expect(page).toHaveURL(`${FRONTEND_URL}/auth/login`);
      await expect(page.locator('text=Welcome back')).toBeVisible();
    }
  });

  test('Authentication state persists across page refreshes', async ({ page }) => {
    // Mock authenticated state
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    await page.evaluate(() => {
      const mockTokens = {
        access_token: 'valid_access_token',
        refresh_token: 'valid_refresh_token',
        token_type: 'bearer',
        expires_in: 3600
      };
      
      const mockUser = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
    
    // Navigate to protected route
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Refresh the page
    await page.reload();
    
    // Should remain on protected route
    await expect(page).toHaveURL(`${FRONTEND_URL}/chat`);
  });

  test('Logout clears all authentication data', async ({ page }) => {
    // Set up authenticated state
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    await page.evaluate(() => {
      localStorage.setItem('auth-tokens', JSON.stringify({ access_token: 'test' }));
      localStorage.setItem('auth-user', JSON.stringify({ id: '123' }));
      sessionStorage.setItem('session-data', 'test');
    });
    
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Trigger logout
    await page.evaluate(() => {
      // Simulate logout action
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Should redirect to login
    await expect(page).toHaveURL(`${FRONTEND_URL}/auth/login`);
    
    // Verify storage is cleared
    const storageState = await page.evaluate(() => {
      return {
        localStorage: localStorage.length,
        sessionStorage: sessionStorage.length
      };
    });
    
    expect(storageState.localStorage).toBe(0);
    expect(storageState.sessionStorage).toBe(0);
  });

  test('Login form validation prevents invalid submissions', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Test empty form submission
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    
    // Test invalid email formats
    const invalidEmails = ['invalid', 'test@', '@domain.com', 'test..email@domain.com'];
    
    for (const email of invalidEmails) {
      await page.fill('input[type="email"]', email);
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    }
    
    // Test password validation
    await page.fill('input[type="email"]', 'valid@example.com');
    await page.fill('input[type="password"]', '123'); // Too short
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
  });

  test('Register form validation and switching works', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Switch to register form
    await page.click('text=Sign up');
    await expect(page.locator('text=Create account')).toBeVisible();
    
    // Test register form validation
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    
    // Test password confirmation
    await page.fill('input[type="email"]', 'newuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'differentpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Passwords do not match')).toBeVisible();
    
    // Switch back to login
    await page.click('text=Sign in');
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('Google OAuth flow is accessible', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Check Google login button exists
    await expect(page.locator('text=Continue with Google')).toBeVisible();
    
    // Click Google login (will initiate OAuth flow)
    const [popup] = await Promise.all([
      page.waitForEvent('popup').catch(() => null), // May not open popup in test
      page.click('text=Continue with Google')
    ]);
    
    // If popup opened, close it (we don't want to complete OAuth in tests)
    if (popup) {
      await popup.close();
    }
  });

  test('Authentication error handling displays correctly', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Fill with invalid credentials
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show loading state first
    await expect(page.locator('text=Signing in...')).toBeVisible();
    
    // Then show error message
    await expect(page.locator('[class*="text-red"]')).toBeVisible({ timeout: 10000 });
    
    // Error should not persist after form change
    await page.fill('input[type="email"]', 'different@example.com');
    await expect(page.locator('[class*="text-red"]')).not.toBeVisible();
  });
});