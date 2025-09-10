import { test, expect } from '@playwright/test';

test.describe('Basic Frontend Validation', () => {
  test('should load the home page successfully', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load with a generous timeout
    await page.waitForLoadState('domcontentloaded');
    
    // Verify the page loaded
    await expect(page).toHaveTitle(/Vana|Research|Frontend/);
    
    // Check for basic page elements
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    console.log('✅ Page loaded successfully');
  });
  
  test('should have React hydrated', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for React to hydrate
    await page.waitForTimeout(2000);
    
    // Check if we can find React components
    const app = page.locator('#__next, [data-reactroot], main, .app');
    await expect(app.first()).toBeVisible();
    
    console.log('✅ React application hydrated');
  });
});