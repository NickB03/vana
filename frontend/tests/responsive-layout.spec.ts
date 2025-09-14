import { test, expect, Page, devices } from '@playwright/test';

// Define our test viewports for comprehensive coverage
const TEST_VIEWPORTS = {
  mobile_small: { width: 320, height: 568 }, // iPhone SE
  mobile_medium: { width: 375, height: 812 }, // iPhone 12/13
  mobile_large: { width: 414, height: 896 }, // iPhone 14 Plus
  tablet_portrait: { width: 768, height: 1024 }, // iPad
  tablet_landscape: { width: 1024, height: 768 }, // iPad landscape
  desktop_small: { width: 1024, height: 768 }, // Small desktop
  desktop_medium: { width: 1440, height: 900 }, // Standard desktop
  desktop_large: { width: 1920, height: 1080 }, // Large desktop
  ultrawide: { width: 2560, height: 1440 }, // Ultra-wide display
};

class ResponsiveLayoutTester {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async setViewport(viewport: { width: number; height: number }) {
    await this.page.setViewportSize(viewport);
  }

  async navigateToChat() {
    // Navigate to login first if not authenticated
    await this.page.goto('http://localhost:3002/login');
    
    // Try to login with test credentials or skip if already logged in
    try {
      await this.page.fill('input[type="email"]', 'test@example.com');
      await this.page.fill('input[type="password"]', 'testpassword');
      await this.page.click('button[type="submit"]');
      await this.page.waitForURL('**/chat', { timeout: 5000 });
    } catch {
      // If login form not found or already authenticated, go directly to chat
      await this.page.goto('http://localhost:3002/chat');
    }
    
    // Wait for chat interface to load
    await this.page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  }

  async testChatContainerLayout() {
    const chatContainer = this.page.locator('[data-testid="chat-interface"]');
    await expect(chatContainer).toBeVisible();
    
    // Check if chat container has proper height and width
    const containerBox = await chatContainer.boundingBox();
    expect(containerBox).not.toBeNull();
    expect(containerBox!.width).toBeGreaterThan(0);
    expect(containerBox!.height).toBeGreaterThan(0);
    
    return {
      width: containerBox!.width,
      height: containerBox!.height,
      isVisible: true
    };
  }

  async testAgentStatusCards() {
    // Look for agent status cards container
    const agentCards = this.page.locator('.agent-grid, [data-testid="agent-cards"]');
    
    if (await agentCards.isVisible()) {
      const cardsBox = await agentCards.boundingBox();
      const cardElements = await agentCards.locator('> *').count();
      
      return {
        visible: true,
        width: cardsBox?.width || 0,
        height: cardsBox?.height || 0,
        cardCount: cardElements
      };
    }
    
    return { visible: false, width: 0, height: 0, cardCount: 0 };
  }

  async testInputArea() {
    const chatInput = this.page.locator('textarea, input[type="text"]').first();
    await expect(chatInput).toBeVisible();
    
    const inputBox = await chatInput.boundingBox();
    const isAccessible = inputBox ? inputBox.height >= 44 : false; // WCAG minimum touch target
    
    return {
      visible: true,
      width: inputBox?.width || 0,
      height: inputBox?.height || 0,
      accessibleHeight: isAccessible
    };
  }

  async testSidebarBehavior() {
    const sidebar = this.page.locator('[data-sidebar="sidebar"]');
    
    if (await sidebar.isVisible()) {
      const sidebarBox = await sidebar.boundingBox();
      
      return {
        visible: true,
        width: sidebarBox?.width || 0,
        height: sidebarBox?.height || 0
      };
    }
    
    return { visible: false, width: 0, height: 0 };
  }

  async testScrollBehavior() {
    const scrollableAreas = this.page.locator('.overflow-y-auto, .overflow-x-auto, .agent-scroll-area');
    const scrollableCount = await scrollableAreas.count();
    
    const results = [];
    for (let i = 0; i < scrollableCount; i++) {
      const area = scrollableAreas.nth(i);
      const box = await area.boundingBox();
      results.push({
        index: i,
        width: box?.width || 0,
        height: box?.height || 0,
        hasOverflow: await area.evaluate(el => 
          el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth
        )
      });
    }
    
    return results;
  }

  async testTouchTargets() {
    const interactiveElements = this.page.locator('button, a, input, textarea, select, [role="button"]');
    const elementsCount = await interactiveElements.count();
    
    const tooSmallTargets = [];
    for (let i = 0; i < Math.min(elementsCount, 20); i++) { // Test first 20 elements
      const element = interactiveElements.nth(i);
      const box = await element.boundingBox();
      
      if (box && (box.width < 44 || box.height < 44)) {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase());
        tooSmallTargets.push({
          index: i,
          tagName,
          width: box.width,
          height: box.height
        });
      }
    }
    
    return {
      totalElements: elementsCount,
      tooSmallTargets,
      wcagCompliant: tooSmallTargets.length === 0
    };
  }

  async checkForHorizontalScroll() {
    const hasHorizontalScroll = await this.page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    return hasHorizontalScroll;
  }

  async testPerformance() {
    const startTime = Date.now();
    
    // Trigger some UI interactions
    await this.page.hover('button').catch(() => {}); // Try to hover on first button
    await this.page.click('body'); // Click somewhere safe
    
    const endTime = Date.now();
    const interactionTime = endTime - startTime;
    
    return {
      interactionTime,
      performant: interactionTime < 100 // Should be under 100ms
    };
  }

  async captureLayoutScreenshot(viewportName: string) {
    return await this.page.screenshot({
      fullPage: true,
      path: `/Users/nick/Development/vana/frontend/tests/screenshots/layout-${viewportName}.png`
    });
  }
}

// Helper function to run comprehensive layout tests
async function runLayoutTests(page: Page, viewportName: string, viewport: { width: number; height: number }) {
  const tester = new ResponsiveLayoutTester(page);
  
  console.log(`\n🔍 Testing ${viewportName} (${viewport.width}x${viewport.height})`);
  
  await tester.setViewport(viewport);
  await tester.navigateToChat();
  
  const results = {
    viewport: { name: viewportName, ...viewport },
    chatContainer: await tester.testChatContainerLayout(),
    agentCards: await tester.testAgentStatusCards(),
    inputArea: await tester.testInputArea(),
    sidebar: await tester.testSidebarBehavior(),
    scrollBehavior: await tester.testScrollBehavior(),
    touchTargets: await tester.testTouchTargets(),
    hasHorizontalScroll: await tester.checkForHorizontalScroll(),
    performance: await tester.testPerformance()
  };
  
  // Capture screenshot for visual verification
  await tester.captureLayoutScreenshot(viewportName);
  
  return results;
}

// Main test suite
test.describe('Responsive Layout Testing', () => {
  
  test.beforeAll(async () => {
    // Create screenshots directory
    const fs = require('fs');
    const screenshotDir = '/Users/nick/Development/vana/frontend/tests/screenshots';
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  // Test each viewport size
  Object.entries(TEST_VIEWPORTS).forEach(([viewportName, viewport]) => {
    test(`should render correctly on ${viewportName}`, async ({ page }) => {
      const results = await runLayoutTests(page, viewportName, viewport);
      
      // Basic layout assertions
      expect(results.chatContainer.isVisible).toBe(true);
      expect(results.chatContainer.width).toBeGreaterThan(0);
      expect(results.chatContainer.height).toBeGreaterThan(0);
      
      // Input accessibility
      expect(results.inputArea.visible).toBe(true);
      if (viewport.width <= 1024) { // Mobile and tablet
        expect(results.inputArea.accessibleHeight).toBe(true);
      }
      
      // No horizontal scrolling
      expect(results.hasHorizontalScroll).toBe(false);
      
      // Touch targets for mobile
      if (viewport.width <= 768) {
        expect(results.touchTargets.tooSmallTargets.length).toBe(0);
      }
      
      // Performance
      expect(results.performance.performant).toBe(true);
      
      // Log results for debugging
      console.log(`Results for ${viewportName}:`, JSON.stringify(results, null, 2));
    });
  });

  test('should handle viewport transitions smoothly', async ({ page }) => {
    const tester = new ResponsiveLayoutTester(page);
    await tester.navigateToChat();
    
    // Test transitions between different sizes
    const transitions = [
      { from: TEST_VIEWPORTS.mobile_small, to: TEST_VIEWPORTS.desktop_medium },
      { from: TEST_VIEWPORTS.desktop_medium, to: TEST_VIEWPORTS.tablet_portrait },
      { from: TEST_VIEWPORTS.tablet_portrait, to: TEST_VIEWPORTS.mobile_large }
    ];
    
    for (const transition of transitions) {
      await tester.setViewport(transition.from);
      await page.waitForTimeout(500); // Allow layout to settle
      
      await tester.setViewport(transition.to);
      await page.waitForTimeout(500); // Allow layout to settle
      
      // Check that layout is still functional after transition
      const chatContainer = page.locator('[data-testid="chat-interface"]');
      await expect(chatContainer).toBeVisible();
      
      // Ensure no horizontal scroll after transition
      const hasHorizontalScroll = await tester.checkForHorizontalScroll();
      expect(hasHorizontalScroll).toBe(false);
    }
  });

  test('should handle orientation changes on mobile', async ({ page }) => {
    const tester = new ResponsiveLayoutTester(page);
    
    // Test portrait to landscape on mobile
    await tester.setViewport({ width: 375, height: 812 }); // Portrait
    await tester.navigateToChat();
    
    let results = await runLayoutTests(page, 'mobile_portrait', { width: 375, height: 812 });
    expect(results.chatContainer.isVisible).toBe(true);
    
    // Switch to landscape
    await tester.setViewport({ width: 812, height: 375 }); // Landscape
    await page.waitForTimeout(500);
    
    results = await runLayoutTests(page, 'mobile_landscape', { width: 812, height: 375 });
    expect(results.chatContainer.isVisible).toBe(true);
    expect(results.hasHorizontalScroll).toBe(false);
  });

  test('should maintain proper agent card layout across screen sizes', async ({ page }) => {
    const tester = new ResponsiveLayoutTester(page);
    await tester.navigateToChat();
    
    // Simulate starting a research session to show agent cards
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await chatInput.fill('test research query');
    await chatInput.press('Enter');
    
    // Wait a moment for potential agent cards to appear
    await page.waitForTimeout(2000);
    
    // Test agent cards layout on different screen sizes
    const testSizes = [
      { name: 'mobile', ...TEST_VIEWPORTS.mobile_medium },
      { name: 'tablet', ...TEST_VIEWPORTS.tablet_portrait },
      { name: 'desktop', ...TEST_VIEWPORTS.desktop_medium }
    ];
    
    for (const size of testSizes) {
      await tester.setViewport(size);
      await page.waitForTimeout(500);
      
      const agentCardResults = await tester.testAgentStatusCards();
      
      // Agent cards should either be visible or properly hidden
      if (agentCardResults.visible) {
        expect(agentCardResults.width).toBeGreaterThan(0);
        expect(agentCardResults.height).toBeGreaterThan(0);
      }
      
      // Check for proper responsive behavior based on screen size
      if (size.width <= 768) {
        // Mobile: agent cards should be horizontal or bottom sheet
        const agentContainer = page.locator('.agent-grid').first();
        if (await agentContainer.isVisible()) {
          const containerClass = await agentContainer.getAttribute('class');
          // Should have mobile-appropriate classes
          expect(containerClass).toMatch(/flex|overflow-x-auto/);
        }
      } else {
        // Desktop: agent cards should be sidebar
        const agentContainer = page.locator('.lg\\:w-80').first();
        if (await agentContainer.isVisible()) {
          const containerBox = await agentContainer.boundingBox();
          expect(containerBox?.width).toBeGreaterThanOrEqual(280); // lg:w-80 = 320px
        }
      }
    }
  });
});

// Performance-specific tests
test.describe('Layout Performance Testing', () => {
  test('should render without layout shifts', async ({ page }) => {
    const tester = new ResponsiveLayoutTester(page);
    
    // Monitor layout shifts
    await page.addInitScript(() => {
      (window as any).layoutShifts = [];
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            (window as any).layoutShifts.push(entry);
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    
    await tester.navigateToChat();
    await page.waitForTimeout(3000); // Wait for initial rendering
    
    const layoutShifts = await page.evaluate(() => (window as any).layoutShifts);
    const cumulativeLayoutShift = layoutShifts.reduce((sum: number, entry: any) => sum + entry.value, 0);
    
    // CLS should be less than 0.1 (good score)
    expect(cumulativeLayoutShift).toBeLessThan(0.1);
  });

  test('should handle rapid viewport changes', async ({ page }) => {
    const tester = new ResponsiveLayoutTester(page);
    await tester.navigateToChat();
    
    // Rapidly change viewport sizes
    const sizes = [
      TEST_VIEWPORTS.mobile_small,
      TEST_VIEWPORTS.desktop_large,
      TEST_VIEWPORTS.tablet_portrait,
      TEST_VIEWPORTS.ultrawide,
      TEST_VIEWPORTS.mobile_medium
    ];
    
    for (let i = 0; i < 5; i++) {
      await tester.setViewport(sizes[i % sizes.length]);
      await page.waitForTimeout(100); // Quick transitions
    }
    
    // Final check that layout is still functional
    const finalResults = await tester.testChatContainerLayout();
    expect(finalResults.isVisible).toBe(true);
    
    const hasHorizontalScroll = await tester.checkForHorizontalScroll();
    expect(hasHorizontalScroll).toBe(false);
  });
});

// Export helper for use in other tests
export { ResponsiveLayoutTester, TEST_VIEWPORTS };