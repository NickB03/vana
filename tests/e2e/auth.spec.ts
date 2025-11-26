import { test, expect, setupMockedPage } from '../fixtures/base-test';
import { navigateToApp, clearBrowserData, waitForNavigation } from '../fixtures/test-helpers';
import { UI_SELECTORS, TIMEOUTS } from '../fixtures/test-data';

/**
 * Authentication & Core Access Tests
 *
 * Simplified E2E suite covering critical user journeys:
 * - Application loads successfully (smoke test)
 * - Guest mode access (automatic - no button required)
 * - Auth page displays correctly
 * - Session persistence across refresh
 *
 * Note: This app uses automatic guest mode where the home page
 * shows the chat interface directly without requiring authentication.
 */

test.describe('Core Application Access', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks BEFORE any navigation (critical for CI)
    await setupMockedPage(page);
    // Clear browser data before each test to ensure clean state
    await clearBrowserData(page);
  });

  test('should load the application homepage', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Verify page loaded (should have some content)
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Page should have a title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should show chat interface on home page (automatic guest mode)', async ({ page }) => {
    await navigateToApp(page);

    // Home page should show chat interface for guests
    const messageInput = page.locator(UI_SELECTORS.chat.messageInput).first();

    // The chat input should be available after navigation helper completes
    await expect(messageInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // Verify we're on the main page (not redirected to auth)
    await expect(page).toHaveURL(/^(?!.*\/auth)/);
  });

  test('should show login form on auth page', async ({ page }) => {
    await page.goto('/auth');
    await waitForNavigation(page);

    // Check if we're redirected away (already authenticated)
    const currentUrl = page.url();
    if (!currentUrl.includes('/auth')) {
      test.skip(true, 'Already authenticated, skipping login form test');
      return;
    }

    // Should see email input
    const emailInput = page.locator(UI_SELECTORS.auth.emailInput).first();
    await expect(emailInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // Should see password input
    const passwordInput = page.locator(UI_SELECTORS.auth.passwordInput).first();
    await expect(passwordInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // Should see submit button
    const submitButton = page.locator(UI_SELECTORS.auth.loginButton).first();
    await expect(submitButton).toBeVisible({ timeout: TIMEOUTS.medium });
  });

  test('should persist guest session across page refresh', async ({ page }) => {
    await navigateToApp(page);

    // Check if message input is visible
    const messageInput = page.locator(UI_SELECTORS.chat.messageInput).first();
    await expect(messageInput).toBeVisible({ timeout: TIMEOUTS.medium });

    // Refresh the page
    await page.reload();
    await waitForNavigation(page);

    // Navigate through landing if needed
    await navigateToApp(page);

    // Should NOT be redirected to auth page
    await expect(page).not.toHaveURL(/\/auth/);

    // Chat input should still be accessible
    await expect(messageInput).toBeVisible({ timeout: TIMEOUTS.medium });
  });
});
