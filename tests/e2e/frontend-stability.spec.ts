import { test, expect } from '@playwright/test';

test.describe('Frontend Stability', () => {
  test('should load homepage without errors', async ({ page }) => {
    // Listen for console errors
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(message.text());
      }
    });

    // Navigate to homepage
    await page.goto('http://localhost:3000');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check that the page loads without JavaScript errors
    expect(errors).toHaveLength(0);

    // Verify essential elements are present
    await expect(page.locator('h1')).toContainText('Hi, I\'m Vana');
    
    // Verify the main input is present and functional
    const textarea = page.locator('textarea[placeholder*="What can I help you with today?"]');
    await expect(textarea).toBeVisible();
    
    // Test that we can type in the input
    await textarea.fill('Test message');
    await expect(textarea).toHaveValue('Test message');
    
    // Verify suggestion buttons are present
    await expect(page.locator('button:has-text("Content Creation")')).toBeVisible();
    
    // Verify sidebar is present
    await expect(page.locator('text=New Chat')).toBeVisible();
  });

  test('should not show Fast Refresh reload warnings', async ({ page }) => {
    // Monitor for specific error patterns
    const reloadWarnings: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (text.includes('Fast Refresh had to perform a full reload') || 
          text.includes('runtime error')) {
        reloadWarnings.push(text);
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit to ensure no delayed errors
    await page.waitForTimeout(2000);

    expect(reloadWarnings).toHaveLength(0);
  });

  test('should handle environment configuration correctly', async ({ page }) => {
    // Monitor for environment-related errors
    const envErrors: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (text.includes('Invalid environment configuration') || 
          text.includes('Expected string, received')) {
        envErrors.push(text);
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    expect(envErrors).toHaveLength(0);
  });

  test('should have working interactive elements', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Test sidebar toggle
    const sidebarTrigger = page.locator('[data-sidebar="trigger"]');
    await expect(sidebarTrigger).toBeVisible();
    
    // Test suggestion buttons are clickable
    const suggestionButton = page.locator('button:has-text("Content Creation")');
    await expect(suggestionButton).toBeVisible();
    await suggestionButton.click();
    
    // Verify the click worked (input should be focused or filled)
    const textarea = page.locator('textarea');
    await expect(textarea).toBeFocused();
  });

  test('should load without zod version conflicts', async ({ page }) => {
    // Monitor specifically for zod-related errors
    const zodErrors: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (text.toLowerCase().includes('zod')) {
        zodErrors.push(text);
      }
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check for any zod-related errors
    expect(zodErrors).toHaveLength(0);
  });
});