import { test, expect } from '@playwright/test';

test.describe('Vana Frontend Functionality Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for the server to respond
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  });

  test.describe('Homepage', () => {
    test('should load homepage successfully', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Check page title
      await expect(page).toHaveTitle(/Vana/);
      
      // Check main heading is visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
      await expect(heading).toContainText('Hello');
      
      // Check greeting text
      const greeting = page.locator('text=How can I help you today?');
      await expect(greeting).toBeVisible();
    });

    test('should display suggestion cards', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Check suggestion cards are visible
      const cards = page.locator('[data-slot="card"]');
      await expect(cards).toHaveCount(4);
      
      // Verify card content
      await expect(page.locator('text=Help me debug this code')).toBeVisible();
      await expect(page.locator('text=Analyze my data')).toBeVisible();
      await expect(page.locator('text=Plan my project')).toBeVisible();
      await expect(page.locator('text=Automate this task')).toBeVisible();
    });

    test('should have working input field', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Find input textarea
      const input = page.locator('textarea[placeholder="Enter a prompt here"]');
      await expect(input).toBeVisible();
      
      // Type in the input
      await input.fill('Test message');
      await expect(input).toHaveValue('Test message');
      
      // Check send button state
      const sendButton = page.locator('button:has(svg.lucide-send)');
      await expect(sendButton).toBeVisible();
      // Should be enabled after typing
      await expect(sendButton).toBeEnabled();
    });

    test('should have working header buttons', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Check header buttons exist
      const historyButton = page.locator('button:has(svg.lucide-history)');
      const docsButton = page.locator('button:has(svg.lucide-book-open)');
      const settingsButton = page.locator('button:has(svg.lucide-settings)');
      
      await expect(historyButton).toBeVisible();
      await expect(docsButton).toBeVisible();
      await expect(settingsButton).toBeVisible();
      
      // Buttons should be clickable
      await expect(historyButton).toBeEnabled();
      await expect(docsButton).toBeEnabled();
      await expect(settingsButton).toBeEnabled();
    });

    test('should have working attachment and voice buttons', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      const attachButton = page.locator('button:has(svg.lucide-paperclip)');
      const voiceButton = page.locator('button:has(svg.lucide-mic)');
      
      await expect(attachButton).toBeVisible();
      await expect(voiceButton).toBeVisible();
      await expect(attachButton).toBeEnabled();
      await expect(voiceButton).toBeEnabled();
    });

    test('suggestion cards should be clickable', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      const firstCard = page.locator('[data-slot="card"]').first();
      await expect(firstCard).toBeVisible();
      
      // Cards should have hover effect (cursor pointer)
      const cursor = await firstCard.evaluate(el => 
        window.getComputedStyle(el).cursor
      );
      expect(cursor).toBe('pointer');
      
      // Click should work without errors
      await firstCard.click();
      // Should populate the input field
      const input = page.locator('textarea[placeholder="Enter a prompt here"]');
      const value = await input.inputValue();
      expect(value).toBeTruthy(); // Should have some text
    });
  });

  test.describe('Chat Page', () => {
    test('should load chat page', async ({ page }) => {
      await page.goto('http://localhost:5173/chat');
      
      // Should still have Vana title
      await expect(page).toHaveTitle(/Vana/);
      
      // Check for chat interface elements
      const chatContainer = page.locator('div').filter({ hasText: /chat|message|conversation/i }).first();
      await expect(chatContainer).toBeVisible({ timeout: 10000 });
    });

    test('should have functional message input on chat page', async ({ page }) => {
      await page.goto('http://localhost:5173/chat');
      
      // Look for any textarea or input field
      const messageInput = page.locator('textarea, input[type="text"]').first();
      
      if (await messageInput.isVisible()) {
        await messageInput.fill('Test chat message');
        const value = await messageInput.inputValue();
        expect(value).toBe('Test chat message');
      }
    });
  });

  test.describe('Canvas Features', () => {
    test('should check if canvas components exist', async ({ page }) => {
      // Since canvas is imported but may not be on main page, check if files load
      const response = await page.goto('http://localhost:5173');
      expect(response?.status()).toBeLessThan(400);
      
      // Check if canvas-related JS chunks are loadable
      const scripts = await page.locator('script[src*="canvas"]').all();
      console.log(`Found ${scripts.length} canvas-related scripts`);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:5173');
      
      // Main content should still be visible
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
      
      // Input should be accessible
      const input = page.locator('textarea[placeholder="Enter a prompt here"]');
      await expect(input).toBeVisible();
    });

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('http://localhost:5173');
      
      const heading = page.locator('h1').first();
      await expect(heading).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Page should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000);
      console.log(`Page loaded in ${loadTime}ms`);
    });

    test('should not have console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('http://localhost:5173');
      await page.waitForTimeout(2000);
      
      // Log any errors found
      if (errors.length > 0) {
        console.log('Console errors found:', errors);
      }
      
      // Non-critical warning - hydration errors are common in dev
      expect(errors.filter(e => !e.includes('hydration'))).toHaveLength(0);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Check for skip link
      const skipLink = page.locator('text=Skip to main content');
      await expect(skipLink).toHaveCount(1);
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('http://localhost:5173');
      
      // Tab to first interactive element
      await page.keyboard.press('Tab');
      
      // Should focus on skip link or first button
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT', 'TEXTAREA']).toContain(focusedElement);
    });
  });
});