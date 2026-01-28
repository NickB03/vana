import { test, expect, setupMockedPage } from '../fixtures/base-test';
import { clearBrowserData, waitForNavigation } from '../fixtures/test-helpers';
import { UI_SELECTORS, TIMEOUTS } from '../fixtures/test-data';

/**
 * Routing Tests
 *
 * Tests for application routing behavior:
 * - Removed /landing route returns 404
 * - No redirect to /landing from home page
 * - Core routes load successfully
 *
 * These tests verify the landing page removal (refactor/remove-landing-page)
 * and ensure existing routes still work as expected.
 */

test.describe('Routing', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks BEFORE any navigation (critical for CI)
    await setupMockedPage(page);
    // Clear browser data before each test to ensure clean state
    await clearBrowserData(page);
  });

  test('should show 404 when navigating to removed /landing route', async ({ page }) => {
    await page.goto('/landing');
    await page.waitForLoadState('networkidle');

    // Should show NotFound component
    const notFoundText = page.locator('text=/not found|404/i');
    await expect(notFoundText).toBeVisible({ timeout: TIMEOUTS.medium });

    // Should NOT show landing page components
    const landingContent = page.locator('[data-testid="landing-hero"]');
    await expect(landingContent).not.toBeVisible();
  });

  test('should NOT redirect to /landing from home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify we're NOT on /landing
    await expect(page).not.toHaveURL(/\/landing/);

    // Should be on home/chat
    await expect(page).toHaveURL(/^\/(chat)?(\?.*)?$/);
  });

  test.describe('Core Routes', () => {
    const validRoutes = [
      { path: '/', name: 'home' },
      { path: '/auth', name: 'auth' },
    ];

    for (const route of validRoutes) {
      test(`should load ${route.name} route (${route.path}) successfully`, async ({ page }) => {
        await page.goto(route.path);
        await page.waitForLoadState('networkidle');

        // Should NOT show 404
        const notFound = page.locator('text=/not found|404/i');
        await expect(notFound).not.toBeVisible();

        // Page should have loaded
        const title = await page.title();
        expect(title).toBeTruthy();
        expect(title.length).toBeGreaterThan(0);
      });
    }
  });
});
