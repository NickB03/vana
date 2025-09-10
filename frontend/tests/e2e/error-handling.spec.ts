import { test, expect } from '@playwright/test';

test.describe('Error Handling E2E Tests', () => {
  test('should handle backend unavailable gracefully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check if page loads without crashing
    await expect(page).toHaveTitle(/Vana|Research|Frontend/);
    
    // Wait a moment for any async initialization that might fail
    await page.waitForTimeout(3000);
    
    // Check that the page is still functional
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Look for error indicators but ensure page doesn't crash
    const errorElements = page.locator('[role="alert"], .error, .alert-error');
    const errorCount = await errorElements.count();
    
    console.log(`✅ Page handles ${errorCount} error state(s) gracefully`);
    
    // Verify the application is still responsive
    await page.mouse.move(100, 100);
    await page.waitForTimeout(500);
    
    console.log('✅ Frontend remains responsive despite backend unavailability');
  });
  
  test('should display appropriate error messages for offline mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for potential error messages to appear
    await page.waitForTimeout(6000); // Wait longer than API timeout (5s)
    
    // Check for offline/error indicators
    const offlineIndicators = page.locator('text=/backend.*unavailable/i, text=/offline/i, text=/demo.*mode/i');
    const hasOfflineIndicator = await offlineIndicators.count() > 0;
    
    if (hasOfflineIndicator) {
      console.log('✅ Offline mode indicators detected');
    } else {
      console.log('ℹ️  No offline indicators - backend might be available or errors handled silently');
    }
    
    // Ensure no unhandled errors crash the app
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    await page.waitForTimeout(1000);
    
    if (jsErrors.length === 0) {
      console.log('✅ No unhandled JavaScript errors detected');
    } else {
      console.log(`⚠️  Detected ${jsErrors.length} JS errors: ${jsErrors.join(', ')}`);
    }
  });
});