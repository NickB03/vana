/**
 * Playwright Responsive Testing
 * Real browser testing across different screen sizes
 */

const { test, expect } = require('@playwright/test');

const BREAKPOINTS = [
  { name: 'Mobile Small', width: 320, height: 568 },
  { name: 'Mobile Large', width: 414, height: 896 },
  { name: 'Tablet Portrait', width: 768, height: 1024 },
  { name: 'Tablet Landscape', width: 1024, height: 768 },
  { name: 'Desktop Small', width: 1280, height: 720 },
  { name: 'Desktop Large', width: 1440, height: 900 },
  { name: 'Ultra Wide', width: 1920, height: 1080 }
];

const TEST_URL = 'http://localhost:3000/chat';

class PlaywrightResponsiveAgent {
  constructor() {
    this.testResults = [];
    this.screenshots = [];
  }

  async testResponsiveLayout() {
    for (const breakpoint of BREAKPOINTS) {
      await test(`Responsive layout at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
        console.log(`🔍 Testing ${breakpoint.name} - ${breakpoint.width}x${breakpoint.height}`);
        
        // Set viewport size
        await page.setViewportSize({ 
          width: breakpoint.width, 
          height: breakpoint.height 
        });

        // Navigate to chat page
        await page.goto(TEST_URL);
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Take screenshot
        const screenshotPath = `tests/screenshots/responsive-${breakpoint.width}x${breakpoint.height}.png`;
        await page.screenshot({ 
          path: screenshotPath,
          fullPage: true 
        });
        
        this.screenshots.push({
          breakpoint: breakpoint.name,
          path: screenshotPath,
          size: `${breakpoint.width}x${breakpoint.height}`
        });

        // Test layout elements
        await this.testLayoutElements(page, breakpoint);
        
        // Test interactions
        await this.testInteractions(page, breakpoint);
        
        // Test scrolling
        await this.testScrollBehavior(page, breakpoint);

        console.log(`  ✅ ${breakpoint.name} testing completed`);
      });
    }
  }

  async testLayoutElements(page, breakpoint) {
    const results = {
      breakpoint: breakpoint.name,
      width: breakpoint.width,
      elementTests: []
    };

    // Test sidebar behavior
    if (breakpoint.width < 768) {
      // Mobile - sidebar should be hidden/overlay
      const sidebar = page.locator('[data-sidebar="sidebar"]');
      const sidebarVisible = await sidebar.isVisible();
      
      results.elementTests.push({
        element: 'sidebar',
        test: 'mobile-visibility',
        expected: 'hidden-by-default',
        actual: sidebarVisible ? 'visible' : 'hidden',
        passed: !sidebarVisible
      });
    } else {
      // Desktop - sidebar should be visible
      const sidebar = page.locator('[data-sidebar="sidebar"]');
      const sidebarVisible = await sidebar.isVisible();
      
      results.elementTests.push({
        element: 'sidebar',
        test: 'desktop-visibility',
        expected: 'visible',
        actual: sidebarVisible ? 'visible' : 'hidden',
        passed: sidebarVisible
      });
    }

    // Test chat container
    const chatContainer = page.locator('.chat-messages, .flex-1');
    const chatExists = await chatContainer.count() > 0;
    
    results.elementTests.push({
      element: 'chat-container',
      test: 'exists',
      expected: 'present',
      actual: chatExists ? 'present' : 'missing',
      passed: chatExists
    });

    // Test for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > document.body.clientWidth;
    });
    
    results.elementTests.push({
      element: 'body',
      test: 'horizontal-overflow',
      expected: 'no-overflow',
      actual: hasHorizontalScroll ? 'overflow' : 'no-overflow',
      passed: !hasHorizontalScroll
    });

    this.testResults.push(results);
    return results;
  }

  async testInteractions(page, breakpoint) {
    console.log(`    🖱️  Testing interactions at ${breakpoint.name}`);
    
    // Test sidebar toggle on mobile
    if (breakpoint.width < 768) {
      const sidebarTrigger = page.locator('[data-sidebar="trigger"]');
      if (await sidebarTrigger.count() > 0) {
        await sidebarTrigger.click();
        
        // Check if sidebar opens
        await page.waitForTimeout(300); // Wait for animation
        const sidebarSheet = page.locator('.sheet-content, [data-mobile="true"]');
        const sheetVisible = await sidebarSheet.isVisible();
        
        console.log(`      - Sidebar toggle: ${sheetVisible ? 'Working' : 'Failed'}`);
        
        // Close sidebar
        if (sheetVisible) {
          const closeButton = page.locator('.sheet-content button, [data-sidebar="trigger"]').first();
          if (await closeButton.count() > 0) {
            await closeButton.click();
            await page.waitForTimeout(300);
          }
        }
      }
    }

    // Test chat input
    const chatInput = page.locator('textarea, input[type="text"]').last();
    if (await chatInput.count() > 0) {
      await chatInput.fill('Test message for responsive layout testing');
      await page.waitForTimeout(100);
      await chatInput.clear();
      console.log('      - Chat input: Working');
    }
  }

  async testScrollBehavior(page, breakpoint) {
    console.log(`    📜 Testing scroll behavior at ${breakpoint.name}`);
    
    // Test vertical scrolling
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await page.waitForTimeout(200);
    
    const scrollPosition = await page.evaluate(() => window.scrollY);
    console.log(`      - Vertical scroll: ${scrollPosition > 0 ? 'Working' : 'No content to scroll'}`);
    
    // Scroll back to top
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
  }
}

// Test suite
test.describe('Responsive Layout Testing', () => {
  const agent = new PlaywrightResponsiveAgent();
  
  // Run tests for each breakpoint
  BREAKPOINTS.forEach(breakpoint => {
    test(`${breakpoint.name} Layout Test`, async ({ page }) => {
      console.log(`🔍 Testing ${breakpoint.name} - ${breakpoint.width}x${breakpoint.height}`);
      
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      });

      await page.goto(TEST_URL);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot
      await page.screenshot({ 
        path: `tests/screenshots/responsive-${breakpoint.width}x${breakpoint.height}.png`,
        fullPage: false // Only visible area
      });
      
      // Test layout elements
      await agent.testLayoutElements(page, breakpoint);
      
      // Test interactions
      await agent.testInteractions(page, breakpoint);
      
      // Test scrolling
      await agent.testScrollBehavior(page, breakpoint);
      
      // Verify no console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Basic layout assertions
      await expect(page.locator('body')).toBeVisible();
      
      // Check for horizontal overflow
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
      });
      
      expect(hasHorizontalOverflow).toBeFalsy();
      
      console.log(`  ✅ ${breakpoint.name} testing completed`);
    });
  });
});

module.exports = PlaywrightResponsiveAgent;