import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';

test.describe('Responsive Design Testing', () => {
  
  const viewports = [
    { name: 'mobile', width: 375, height: 667 }, // iPhone SE
    { name: 'mobile-large', width: 414, height: 896 }, // iPhone 11 Pro Max
    { name: 'tablet', width: 768, height: 1024 }, // iPad
    { name: 'tablet-landscape', width: 1024, height: 768 }, // iPad landscape
    { name: 'laptop', width: 1366, height: 768 }, // Laptop
    { name: 'desktop', width: 1920, height: 1080 }, // Desktop
    { name: 'ultrawide', width: 2560, height: 1440 } // Ultrawide
  ];

  test.beforeEach(async ({ page }) => {
    // Set up basic auth state for protected routes
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    await page.evaluate(() => {
      const mockTokens = {
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        token_type: 'bearer',
        expires_in: 3600
      };
      
      const mockUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
  });

  viewports.forEach(({ name, width, height }) => {
    test(`Login page layout works correctly on ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`${FRONTEND_URL}/auth/login`);
      
      // Take screenshot for visual regression
      await page.screenshot({ 
        path: `.claude_workspace/reports/screenshots/login-${name}-${width}x${height}.png`,
        fullPage: true 
      });
      
      // Check essential elements are visible
      await expect(page.locator('text=Welcome back')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Check login form is properly sized
      const loginForm = page.locator('form, [class*="login"], [class*="auth"]').first();
      const boundingBox = await loginForm.boundingBox();
      
      if (boundingBox) {
        // Form should not overflow viewport
        expect(boundingBox.width).toBeLessThanOrEqual(width);
        expect(boundingBox.height).toBeLessThanOrEqual(height);
        
        // Form should be reasonably sized
        if (width >= 768) {
          // On tablet and up, form should be centered with max width
          expect(boundingBox.width).toBeLessThanOrEqual(600);
        } else {
          // On mobile, form should use most of the width
          expect(boundingBox.width).toBeGreaterThan(width * 0.8);
        }
      }
    });
  });

  viewports.forEach(({ name, width, height }) => {
    test(`Chat interface adapts correctly on ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`${FRONTEND_URL}/chat`);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot
      await page.screenshot({ 
        path: `.claude_workspace/reports/screenshots/chat-${name}-${width}x${height}.png`,
        fullPage: true 
      });
      
      // Check chat interface elements
      const chatInput = page.locator('textarea, input[placeholder*="message"]').first();
      const messagesArea = page.locator('.messages, .chat-messages, [data-testid="messages"]').first();
      
      await expect(chatInput).toBeVisible();
      
      if (await messagesArea.isVisible()) {
        const messagesBox = await messagesArea.boundingBox();
        const inputBox = await chatInput.boundingBox();
        
        if (messagesBox && inputBox) {
          // Messages area should be above input
          expect(messagesBox.y).toBeLessThan(inputBox.y);
          
          // Elements should not overflow
          expect(messagesBox.width).toBeLessThanOrEqual(width);
          expect(inputBox.width).toBeLessThanOrEqual(width);
        }
      }
      
      // Test sidebar behavior on different screen sizes
      const sidebar = page.locator('.sidebar, [data-testid="sidebar"]').first();
      
      if (await sidebar.isVisible()) {
        const sidebarBox = await sidebar.boundingBox();
        
        if (sidebarBox) {
          if (width < 768) {
            // On mobile, sidebar might be collapsed or overlay
            expect(sidebarBox.width).toBeLessThan(width * 0.8);
          } else {
            // On larger screens, sidebar should be visible
            expect(sidebarBox.width).toBeGreaterThan(200);
          }
        }
      }
    });
  });

  viewports.forEach(({ name, width, height }) => {
    test(`Canvas interface scales properly on ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(`${FRONTEND_URL}/canvas`);
      await page.waitForLoadState('networkidle');
      
      // Take screenshot
      await page.screenshot({ 
        path: `.claude_workspace/reports/screenshots/canvas-${name}-${width}x${height}.png`,
        fullPage: true 
      });
      
      // Check canvas container
      const canvasContainer = page.locator('canvas, .canvas, [data-testid="canvas"]').first();
      
      if (await canvasContainer.isVisible()) {
        const canvasBox = await canvasContainer.boundingBox();
        
        if (canvasBox) {
          // Canvas should fit within viewport
          expect(canvasBox.width).toBeLessThanOrEqual(width);
          expect(canvasBox.height).toBeLessThanOrEqual(height);
          
          // Canvas should be reasonably sized
          expect(canvasBox.width).toBeGreaterThan(100);
          expect(canvasBox.height).toBeGreaterThan(100);
        }
      }
      
      // Check toolbar/controls are accessible
      const toolbar = page.locator('.toolbar, .controls, [data-testid="toolbar"]').first();
      
      if (await toolbar.isVisible()) {
        const toolbarBox = await toolbar.boundingBox();
        
        if (toolbarBox) {
          // Toolbar should not overflow
          expect(toolbarBox.width).toBeLessThanOrEqual(width);
          
          if (width < 768) {
            // On mobile, toolbar might be vertical or compact
            expect(toolbarBox.height).toBeLessThan(height * 0.3);
          }
        }
      }
    });
  });

  test('Navigation menu adapts to screen size', async ({ page }) => {
    const testSizes = [
      { width: 375, height: 667, expectHamburger: true },
      { width: 768, height: 1024, expectHamburger: true },
      { width: 1366, height: 768, expectHamburger: false }
    ];
    
    for (const { width, height, expectHamburger } of testSizes) {
      await page.setViewportSize({ width, height });
      await page.goto(`${FRONTEND_URL}/chat`);
      
      // Look for hamburger menu or navigation
      const hamburger = page.locator('.hamburger, [data-testid="menu-toggle"], button[aria-label*="menu"]').first();
      const navMenu = page.locator('nav, .navigation, [data-testid="navigation"]').first();
      
      if (expectHamburger) {
        // Mobile/tablet should have hamburger menu
        if (await hamburger.isVisible()) {
          await hamburger.click();
          await page.waitForTimeout(500);
          
          // Menu should appear
          await expect(navMenu).toBeVisible();
          
          // Click outside or close menu
          await page.click('body');
          await page.waitForTimeout(500);
        }
      } else {
        // Desktop should show full navigation
        if (await navMenu.isVisible()) {
          const navBox = await navMenu.boundingBox();
          if (navBox) {
            expect(navBox.width).toBeGreaterThan(100);
          }
        }
      }
    }
  });

  test('Text and elements remain readable at all sizes', async ({ page }) => {
    const criticalSizes = [
      { width: 320, height: 568 }, // iPhone 5/SE
      { width: 375, height: 667 }, // iPhone 6/7/8
      { width: 768, height: 1024 } // iPad
    ];
    
    for (const { width, height } of criticalSizes) {
      await page.setViewportSize({ width, height });
      await page.goto(`${FRONTEND_URL}/auth/login`);
      
      // Check text elements are properly sized
      const textElements = page.locator('h1, h2, h3, p, span, button, input, label');
      const count = await textElements.count();
      
      for (let i = 0; i < Math.min(count, 10); i++) {
        const element = textElements.nth(i);
        if (await element.isVisible()) {
          const styles = await element.evaluate((el) => {
            const computed = window.getComputedStyle(el);
            return {
              fontSize: computed.fontSize,
              lineHeight: computed.lineHeight,
              padding: computed.padding
            };
          });
          
          // Font size should be readable (at least 14px on mobile)
          const fontSize = parseInt(styles.fontSize);
          expect(fontSize).toBeGreaterThanOrEqual(width < 768 ? 14 : 12);
        }
      }
    }
  });

  test('Interactive elements are touch-friendly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Check button sizes
    const buttons = page.locator('button, input[type="submit"], a[role="button"]');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        
        if (box) {
          // Touch targets should be at least 44px (iOS guidelines)
          expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(44);
        }
      }
    }
    
    // Check form inputs
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      if (await input.isVisible()) {
        const box = await input.boundingBox();
        
        if (box) {
          // Form inputs should be tall enough for touch
          expect(box.height).toBeGreaterThanOrEqual(40);
        }
      }
    }
  });

  test('Layout does not break with very long content', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Inject very long content
    await page.evaluate(() => {
      const longText = 'This is a very long message that should test how the layout handles overflow content. '.repeat(50);
      
      // Try to add long content to chat
      const chatContainer = document.querySelector('.messages, .chat-messages, [data-testid="messages"]');
      if (chatContainer) {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = longText;
        messageDiv.className = 'test-long-message';
        chatContainer.appendChild(messageDiv);
      }
    });
    
    await page.waitForTimeout(500);
    
    // Check layout integrity
    const viewport = page.viewportSize();
    if (viewport) {
      const bodyBox = await page.locator('body').boundingBox();
      
      if (bodyBox) {
        // Page should not have horizontal overflow
        expect(bodyBox.width).toBeLessThanOrEqual(viewport.width + 20); // Allow small tolerance
      }
    }
    
    // Check long content is handled properly
    const longMessage = page.locator('.test-long-message');
    if (await longMessage.isVisible()) {
      const messageBox = await longMessage.boundingBox();
      
      if (messageBox && viewport) {
        // Long text should wrap or scroll, not overflow horizontally
        expect(messageBox.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });
});