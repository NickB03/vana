import { test, expect } from '@playwright/test';

/**
 * Visual Regression Testing for User Workflow
 * 
 * This test suite captures and compares screenshots to detect
 * visual regressions in the user workflow interface.
 */

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
};

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });

  Object.entries(VIEWPORTS).forEach(([deviceType, viewport]) => {
    test(`${deviceType} - Initial chat interface`, async ({ page }) => {
      await page.setViewportSize(viewport);
      
      // Wait for fonts to load
      await page.waitForTimeout(1000);
      
      // Hide dynamic elements that might cause flaky tests
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"], 
          .cursor-blink,
          .loading-indicator {
            display: none !important;
          }
        `
      });
      
      await expect(page).toHaveScreenshot(`${deviceType}-initial-interface.png`, {
        fullPage: true,
        animations: 'disabled',
        mask: [
          page.locator('[data-testid="timestamp"]'),
          page.locator('.cursor-blink')
        ]
      });
    });

    test(`${deviceType} - User message in chat`, async ({ page }) => {
      await page.setViewportSize(viewport);
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('What are the benefits of renewable energy?');
      await chatInput.press('Enter');
      
      // Wait for message to appear
      await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
      await page.waitForTimeout(500); // Allow animations to settle
      
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"], 
          .cursor-blink,
          .loading-indicator {
            display: none !important;
          }
        `
      });
      
      await expect(page).toHaveScreenshot(`${deviceType}-user-message.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test(`${deviceType} - Research plan display`, async ({ page }) => {
      await page.setViewportSize(viewport);
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Analyze AI impact on healthcare');
      await chatInput.press('Enter');
      
      // Wait for research plan
      await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1000); // Allow content to load
      
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"], 
          .cursor-blink,
          .loading-indicator {
            display: none !important;
          }
        `
      });
      
      await expect(page).toHaveScreenshot(`${deviceType}-research-plan.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test(`${deviceType} - Agent status card positioning`, async ({ page }) => {
      await page.setViewportSize(viewport);
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Quick test for agent cards');
      await chatInput.press('Enter');
      
      // Wait for research plan and approve
      await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
      await page.locator('[data-testid="approve-button"]').click();
      
      // Wait for agent card
      const agentCard = page.locator('[data-testid="agent-status-card"]');
      if (await agentCard.isVisible({ timeout: 10000 })) {
        await page.waitForTimeout(1000); // Allow positioning to settle
        
        await page.addStyleTag({
          content: `
            [data-testid="timestamp"], 
            .cursor-blink,
            .loading-indicator,
            .progress-bar {
              display: none !important;
            }
            [data-testid="agent-status-card"] .progress {
              animation: none !important;
            }
          `
        });
        
        await expect(page).toHaveScreenshot(`${deviceType}-agent-card-positioned.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      }
    });

    test(`${deviceType} - Agent response streaming`, async ({ page }) => {
      await page.setViewportSize(viewport);
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Brief test response');
      await chatInput.press('Enter');
      
      // Complete workflow
      await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
      await page.locator('[data-testid="approve-button"]').click();
      
      // Wait for response to start
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(2000); // Allow some content to stream
      
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"], 
          .cursor-blink,
          .loading-indicator,
          .typing-indicator {
            display: none !important;
          }
        `
      });
      
      await expect(page).toHaveScreenshot(`${deviceType}-response-streaming.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Layout Stress Tests', () => {
    test('Long conversation visual test', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Add multiple messages to test scroll and layout
      const messages = [
        'First message in conversation',
        'Second message with more content',
        'Third message to test scrolling behavior'
      ];
      
      for (let i = 0; i < messages.length; i++) {
        await chatInput.fill(messages[i]);
        await chatInput.press('Enter');
        await page.waitForTimeout(1000);
        
        // Skip the workflow for visual test purposes
        if (i === 0) {
          // Just verify first message appears
          await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
        }
      }
      
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"], 
          .cursor-blink,
          .loading-indicator {
            display: none !important;
          }
        `
      });
      
      await expect(page).toHaveScreenshot('long-conversation-layout.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('Agent cards overflow handling', async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 600 }); // Smaller viewport
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Test multiple agents scenario');
      await chatInput.press('Enter');
      
      await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
      await page.locator('[data-testid="approve-button"]').click();
      
      // Mock multiple agent cards for visual testing
      await page.evaluate(() => {
        const container = document.querySelector('[data-testid="agent-cards-container"]');
        if (container) {
          for (let i = 0; i < 3; i++) {
            const mockCard = document.createElement('div');
            mockCard.setAttribute('data-testid', 'agent-status-card');
            mockCard.className = 'mock-agent-card';
            mockCard.innerHTML = `
              <div class="agent-card-content">
                <h4>Agent ${i + 1}</h4>
                <p>Processing research task...</p>
                <div class="progress-bar"></div>
              </div>
            `;
            container.appendChild(mockCard);
          }
        }
      });
      
      await page.waitForTimeout(1000);
      
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"], 
          .cursor-blink,
          .loading-indicator {
            display: none !important;
          }
          .mock-agent-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            margin: 8px 0;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .progress-bar {
            height: 4px;
            background: #3b82f6;
            border-radius: 2px;
            margin-top: 8px;
          }
        `
      });
      
      await expect(page).toHaveScreenshot('agent-cards-overflow.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Error States Visual Tests', () => {
    test('Network error state', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      
      // Mock network failure
      await page.route('**/api/run_sse/**', route => {
        route.abort('failed');
      });
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('This should trigger an error');
      await chatInput.press('Enter');
      
      // Wait for error state
      await expect(
        page.locator('[data-testid="error-message"], [data-testid="network-error"]')
      ).toBeVisible({ timeout: 10000 });
      
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"], 
          .cursor-blink,
          .loading-indicator {
            display: none !important;
          }
        `
      });
      
      await expect(page).toHaveScreenshot('network-error-state.png', {
        animations: 'disabled'
      });
    });

    test('Empty state', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      
      // Just the initial empty chat interface
      await page.waitForTimeout(1000);
      
      await page.addStyleTag({
        content: `
          [data-testid="timestamp"], 
          .cursor-blink,
          .loading-indicator {
            display: none !important;
          }
        `
      });
      
      await expect(page).toHaveScreenshot('empty-chat-state.png', {
        animations: 'disabled'
      });
    });
  });
});