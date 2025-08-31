import { test } from '@playwright/test';

test.describe('Capture Current UI State', () => {
  test('capture homepage', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Wait for page to fully load
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'current-ui-homepage.png',
      fullPage: true 
    });
    
    console.log('✅ Homepage screenshot captured: current-ui-homepage.png');
  });

  test('capture with sidebar expanded', async ({ page }) => {
    // Navigate to homepage
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Click sidebar trigger to expand if needed
    const sidebarTrigger = page.locator('[data-sidebar="trigger"]').first();
    if (await sidebarTrigger.isVisible()) {
      await sidebarTrigger.click();
      await page.waitForTimeout(500); // Wait for animation
    }
    
    // Take screenshot with expanded sidebar
    await page.screenshot({ 
      path: 'current-ui-sidebar-expanded.png',
      fullPage: true 
    });
    
    console.log('✅ Sidebar expanded screenshot captured: current-ui-sidebar-expanded.png');
  });
});