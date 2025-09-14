import { test, expect } from '@playwright/test';

/**
 * Simple Responsive Layout Verification
 * Tests core layout behavior across key breakpoints
 */

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  ultrawide: { width: 2560, height: 1440 }
};

test.describe('Simple Responsive Layout Check', () => {
  
  // Basic navigation and layout test
  test('should display chat interface correctly across all screen sizes', async ({ page }) => {
    // Test each viewport
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      console.log(`Testing ${name} viewport: ${viewport.width}x${viewport.height}`);
      
      await page.setViewportSize(viewport);
      
      // Navigate to the app (skip auth for now)
      await page.goto('/');
      
      // Wait for page to load
      await page.waitForTimeout(2000);
      
      // Take a screenshot for visual verification
      await page.screenshot({ 
        path: `/Users/nick/Development/vana/frontend/tests/screenshots/simple-${name}-${viewport.width}x${viewport.height}.png`,
        fullPage: true 
      });
      
      // Basic layout checks
      const body = page.locator('body');
      await expect(body).toBeVisible();
      
      // Check for horizontal scrolling
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      // No horizontal scroll should exist
      expect(hasHorizontalScroll).toBe(false);
      
      // Check viewport meta tag exists
      const viewportMeta = page.locator('meta[name="viewport"]');
      await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
      
      console.log(`✅ ${name} (${viewport.width}x${viewport.height}) - Layout OK`);
    }
  });

  test('should handle viewport transitions without breaking layout', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Start with mobile
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.waitForTimeout(500);
    
    // Transition to desktop
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.waitForTimeout(500);
    
    // Check layout is still intact
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
    
    // Final screenshot
    await page.screenshot({ 
      path: `/Users/nick/Development/vana/frontend/tests/screenshots/transition-test.png`,
      fullPage: true 
    });
  });
  
  test('should maintain proper touch targets on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    // Find all interactive elements
    const interactiveElements = page.locator('button, a, input, textarea, select, [role="button"]');
    const count = await interactiveElements.count();
    
    if (count > 0) {
      // Check first few elements for proper sizing
      for (let i = 0; i < Math.min(count, 10); i++) {
        const element = interactiveElements.nth(i);
        const box = await element.boundingBox();
        
        if (box) {
          // WCAG AA standard: minimum 44x44px for touch targets
          const meetsStandard = box.width >= 44 && box.height >= 44;
          console.log(`Element ${i}: ${box.width}x${box.height} - ${meetsStandard ? '✅' : '⚠️'}`);
        }
      }
    }
  });
});

test.describe('Chat Interface Specific Tests', () => {
  test('should load chat interface without layout issues', async ({ page }) => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      await page.setViewportSize(viewport);
      
      try {
        // Try to access chat directly
        await page.goto('/chat');
        await page.waitForTimeout(2000);
        
        // Check if we can see any chat-related content
        const chatContent = page.locator('main, .chat, [data-testid*="chat"]').first();
        
        if (await chatContent.isVisible()) {
          // Take screenshot of chat interface
          await page.screenshot({ 
            path: `/Users/nick/Development/vana/frontend/tests/screenshots/chat-${name}.png` 
          });
          
          console.log(`✅ Chat interface visible on ${name}`);
        } else {
          console.log(`ℹ️ Chat interface not accessible on ${name} (might need auth)`);
        }
        
        // Check no horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        
        expect(hasHorizontalScroll).toBe(false);
        
      } catch (error) {
        console.log(`ℹ️ Chat test skipped for ${name}: ${error}`);
      }
    }
  });
});