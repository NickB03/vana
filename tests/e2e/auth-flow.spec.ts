import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:8000';

test.describe('Authentication Flow End-to-End', () => {
  
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
        // Ignore localStorage errors in some browser contexts
        console.log('Could not clear localStorage:', e);
      }
    });
  });

  test('Unauthenticated user can access login page', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Should not redirect and show login form
    await expect(page).toHaveURL(`${FRONTEND_URL}/auth/login`);
    
    // Check login form elements are present
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Google')).toBeVisible();
    await expect(page.locator('text=Don\'t have an account?')).toBeVisible();
  });

  test('Login page has proper responsive design', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    const loginCard = page.locator('div[class*="max-w-md"]').first();
    await expect(loginCard).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await expect(loginCard).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await expect(loginCard).toBeVisible();
  });

  test('Protected routes redirect unauthenticated users to login', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Should redirect to login page
    await expect(page).toHaveURL(`${FRONTEND_URL}/auth/login`);
    
    // Should show login form
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('Login form validation works correctly', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
    
    // Test invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();
    
    // Test short password
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', '123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
  });

  test('Login attempt with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show loading state briefly
    await expect(page.locator('text=Signing in...')).toBeVisible();
    
    // Should show error message
    await expect(page.locator('[class*="text-red-600"]')).toBeVisible();
  });

  test('Switch between login and register forms works', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Should start with login form
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('text=Don\'t have an account?')).toBeVisible();
    
    // Click switch to register
    await page.click('text=Sign up');
    
    // Should show register form
    await expect(page.locator('text=Create account')).toBeVisible();
    await expect(page.locator('text=Already have an account?')).toBeVisible();
    
    // Switch back to login
    await page.click('text=Sign in');
    
    // Should show login form again
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('No infinite redirect loop occurs', async ({ page }) => {
    // Monitor navigation events to detect infinite loops
    const navigationPromises: Promise<void>[] = [];
    let navigationCount = 0;
    
    page.on('framenavigated', () => {
      navigationCount++;
    });
    
    // Navigate to login page
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Wait a reasonable time for any redirects to complete
    await page.waitForTimeout(3000);
    
    // Should not have excessive redirects
    expect(navigationCount).toBeLessThan(5);
    
    // Should be on login page
    await expect(page).toHaveURL(`${FRONTEND_URL}/auth/login`);
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('AuthGuard loading states work properly', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Should not show "Redirecting to login..." on the login page itself
    await expect(page.locator('text=Redirecting to login...')).not.toBeVisible();
    
    // Should show login form
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('Backend health endpoint is accessible', async ({ page }) => {
    const response = await page.request.get(`${BACKEND_URL}/health`);
    expect(response.ok()).toBeTruthy();
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
    expect(health.service).toBe('vana');
  });
});

test.describe('Cross-Browser Compatibility', () => {
  
  test('Login page renders correctly in different browsers', async ({ page, browserName }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Take screenshot for visual regression testing
    await page.screenshot({ 
      path: `.claude_workspace/reports/screenshots/login-${browserName}.png`,
      fullPage: true 
    });
    
    // Check essential elements are visible regardless of browser
    await expect(page.locator('text=Welcome back')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check form is properly sized
    const loginCard = page.locator('[class*="max-w-md"]').first();
    const boundingBox = await loginCard.boundingBox();
    
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThan(300);
      expect(boundingBox.width).toBeLessThan(600);
      expect(boundingBox.height).toBeGreaterThan(400);
    }
  });
});