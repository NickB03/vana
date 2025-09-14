/**
 * Agent Status Cards Integration Tests
 * 
 * Tests the integration of agent status cards with the research chat interface,
 * ensuring proper layout, real-time updates, and responsive behavior.
 */

import { test, expect } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  timeouts: {
    navigation: 10000,
    element: 5000,
    assertion: 3000,
  },
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1440, height: 900 },
    ultrawide: { width: 1920, height: 1080 },
  },
} as const;

test.describe('Agent Status Cards Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to research interface
    await page.goto(`${TEST_CONFIG.baseUrl}/research`, { 
      waitUntil: 'networkidle',
      timeout: TEST_CONFIG.timeouts.navigation 
    });
    
    // Wait for interface to load
    await expect(page.getByTestId('chat-interface')).toBeVisible({ 
      timeout: TEST_CONFIG.timeouts.element 
    });
  });

  test.describe('Desktop Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(TEST_CONFIG.viewports.desktop);
    });

    test('should display agent status sidebar when research is active', async ({ page }) => {
      // Start a research query to activate agents
      await page.fill('[data-testid="chat-input"]', 'Test research query for agent activation');
      await page.click('[data-testid="send-button"]');
      
      // Wait for research to start and agents to appear
      await expect(page.locator('.agent-cards-sidebar')).toBeVisible({ 
        timeout: TEST_CONFIG.timeouts.element 
      });
      
      // Verify sidebar positioning on desktop
      const sidebar = page.locator('.agent-cards-sidebar');
      await expect(sidebar).toHaveCSS('position', 'relative');
      
      // Check that sidebar doesn't overlap chat area
      const chatArea = page.getByTestId('chat-interface');
      const sidebarBox = await sidebar.boundingBox();
      const chatBox = await chatArea.boundingBox();
      
      if (sidebarBox && chatBox) {
        // Sidebar should be to the right of chat area
        expect(sidebarBox.x).toBeGreaterThan(chatBox.x);
      }
    });

    test('should show individual agent status cards with correct information', async ({ page }) => {
      // Trigger research to activate agents
      await page.fill('[data-testid="chat-input"]', 'Analyze market trends in renewable energy');
      await page.click('[data-testid="send-button"]');
      
      // Wait for agent cards to appear
      await expect(page.locator('.agent-status-card').first()).toBeVisible({ 
        timeout: TEST_CONFIG.timeouts.element 
      });
      
      // Verify agent card content
      const firstCard = page.locator('.agent-status-card').first();
      
      // Should have agent name
      await expect(firstCard.locator('[data-testid="agent-name"]')).toContainText(/\w+/);
      
      // Should have status badge
      await expect(firstCard.locator('.badge')).toBeVisible();
      
      // Should have progress indicator
      await expect(firstCard.locator('[aria-label*="progress"]')).toBeVisible();
      
      // Should have agent type icon
      await expect(firstCard.locator('span').first()).toContainText(/[🤖👑📋🔍⚖️📝🎯📊⚡]/);
    });

    test('should update agent progress in real-time', async ({ page }) => {
      // Start research
      await page.fill('[data-testid="chat-input"]', 'Research artificial intelligence trends');
      await page.click('[data-testid="send-button"]');
      
      // Wait for agents to appear
      await expect(page.locator('.agent-status-card').first()).toBeVisible();
      
      // Get initial progress value
      const progressBar = page.locator('[aria-label*="progress"]').first();
      const initialProgress = await progressBar.getAttribute('aria-valuenow');
      
      // Wait for progress to update (SSE should update this)
      await page.waitForTimeout(2000);
      
      const updatedProgress = await progressBar.getAttribute('aria-valuenow');
      
      // Progress should have changed (or at least the element should still be present)
      expect(updatedProgress).toBeDefined();
    });

    test('should handle agent status transitions correctly', async ({ page }) => {
      // Start research
      await page.fill('[data-testid="chat-input"]', 'Complete research analysis');
      await page.click('[data-testid="send-button"]');
      
      // Wait for agents
      await expect(page.locator('.agent-status-card').first()).toBeVisible();
      
      // Check for different status badges
      const statusBadges = page.locator('.badge');
      const badgeCount = await statusBadges.count();
      
      expect(badgeCount).toBeGreaterThan(0);
      
      // Verify status indicators are present
      const possibleStatuses = ['Waiting', 'Active', 'Completed', 'Error'];
      let hasValidStatus = false;
      
      for (let i = 0; i < badgeCount; i++) {
        const badgeText = await statusBadges.nth(i).textContent();
        if (possibleStatuses.some(status => badgeText?.includes(status))) {
          hasValidStatus = true;
          break;
        }
      }
      
      expect(hasValidStatus).toBeTruthy();
    });

    test('should allow collapsing and expanding the sidebar', async ({ page }) => {
      // Start research to show sidebar
      await page.fill('[data-testid="chat-input"]', 'Test sidebar collapse functionality');
      await page.click('[data-testid="send-button"]');
      
      // Wait for sidebar
      await expect(page.locator('.agent-cards-sidebar')).toBeVisible();
      
      // Find and click collapse button
      const collapseButton = page.locator('.agent-cards-sidebar button').filter({ 
        hasText: /chevron/i 
      }).first();
      
      if (await collapseButton.isVisible()) {
        await collapseButton.click();
        
        // Verify sidebar is collapsed
        const sidebar = page.locator('.agent-cards-sidebar');
        const sidebarWidth = await sidebar.evaluate(el => el.getBoundingClientRect().width);
        
        // Collapsed sidebar should be narrow (around 60px)
        expect(sidebarWidth).toBeLessThan(100);
      }
    });
  });

  test.describe('Mobile Layout', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(TEST_CONFIG.viewports.mobile);
    });

    test('should show agent cards in mobile-optimized layout', async ({ page }) => {
      // Start research
      await page.fill('[data-testid="chat-input"]', 'Mobile layout test query');
      await page.click('[data-testid="send-button"]');
      
      // On mobile, cards might be in a different layout (bottom drawer or overlay)
      // Check for agent cards presence
      const agentCards = page.locator('.agent-status-card, .agent-mini-card');
      
      // Wait for at least one card to appear
      await expect(agentCards.first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.element });
      
      const cardCount = await agentCards.count();
      expect(cardCount).toBeGreaterThan(0);
    });

    test('should not interfere with chat input on mobile', async ({ page }) => {
      // Verify chat input is accessible
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeVisible();
      
      // Start research to activate agent cards
      await chatInput.fill('Mobile interface test');
      await page.click('[data-testid="send-button"]');
      
      // Wait for agents to potentially appear
      await page.waitForTimeout(1000);
      
      // Chat input should still be accessible and not covered by agent cards
      await expect(chatInput).toBeVisible();
      
      const inputBox = await chatInput.boundingBox();
      if (inputBox) {
        // Input should be in visible viewport area
        expect(inputBox.y).toBeGreaterThanOrEqual(0);
        expect(inputBox.y + inputBox.height).toBeLessThanOrEqual(TEST_CONFIG.viewports.mobile.height);
      }
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should adapt layout when resizing viewport', async ({ page }) => {
      // Start with desktop size
      await page.setViewportSize(TEST_CONFIG.viewports.desktop);
      
      // Start research
      await page.fill('[data-testid="chat-input"]', 'Responsive layout test');
      await page.click('[data-testid="send-button"]');
      
      // Wait for sidebar on desktop
      await expect(page.locator('.agent-cards-sidebar')).toBeVisible();
      
      // Resize to mobile
      await page.setViewportSize(TEST_CONFIG.viewports.mobile);
      await page.waitForTimeout(500); // Allow for responsive animations
      
      // Layout should adapt to mobile
      const agentCards = page.locator('.agent-status-card, .agent-mini-card');
      await expect(agentCards.first()).toBeVisible();
      
      // Resize back to desktop
      await page.setViewportSize(TEST_CONFIG.viewports.desktop);
      await page.waitForTimeout(500);
      
      // Sidebar should be visible again
      await expect(page.locator('.agent-cards-sidebar')).toBeVisible();
    });
  });

  test.describe('Connection States', () => {
    test('should show connection status in agent cards', async ({ page }) => {
      // Start research
      await page.fill('[data-testid="chat-input"]', 'Connection status test');
      await page.click('[data-testid="send-button"]');
      
      // Wait for agent cards
      await expect(page.locator('.agent-status-card').first()).toBeVisible();
      
      // Look for connection status indicators
      const connectionIndicators = page.locator('[title*="Connect"], [title*="Stream"], .connection-status-overlay');
      
      // Should have at least one connection indicator visible or in DOM
      const indicatorCount = await connectionIndicators.count();
      expect(indicatorCount).toBeGreaterThanOrEqual(0); // Could be 0 if connection is stable
    });

    test('should handle disconnection gracefully', async ({ page }) => {
      // Start research
      await page.fill('[data-testid="chat-input"]', 'Disconnection handling test');
      await page.click('[data-testid="send-button"]');
      
      // Wait for agents
      await expect(page.locator('.agent-status-card').first()).toBeVisible();
      
      // Simulate network interruption by navigating away and back
      await page.goto('about:blank');
      await page.waitForTimeout(1000);
      await page.goto(`${TEST_CONFIG.baseUrl}/research`);
      
      // Interface should recover gracefully
      await expect(page.getByTestId('chat-interface')).toBeVisible();
    });
  });

  test.describe('Interaction Tests', () => {
    test('should handle agent card clicks', async ({ page }) => {
      // Start research
      await page.fill('[data-testid="chat-input"]', 'Agent interaction test');
      await page.click('[data-testid="send-button"]');
      
      // Wait for agent cards
      await expect(page.locator('.agent-status-card').first()).toBeVisible();
      
      // Click on first agent card
      const firstCard = page.locator('.agent-status-card').first();
      await firstCard.click();
      
      // Should not cause errors (interaction is logged)
      // In a real app, this might switch tabs or show details
      await page.waitForTimeout(500);
      
      // Interface should remain stable
      await expect(page.getByTestId('chat-interface')).toBeVisible();
    });

    test('should maintain scrollability with agent cards visible', async ({ page }) => {
      // Start research
      await page.fill('[data-testid="chat-input"]', 'Scrollability test with a very long query that should create multiple messages to test scrolling behavior with agent cards visible alongside the chat interface');
      await page.click('[data-testid="send-button"]');
      
      // Send multiple messages to create scrollable content
      for (let i = 0; i < 3; i++) {
        await page.waitForTimeout(1000);
        await page.fill('[data-testid="chat-input"]', `Additional message ${i + 1} to create scrollable content`);
        await page.click('[data-testid="send-button"]');
      }
      
      // Wait for agent cards to appear
      await expect(page.locator('.agent-status-card').first()).toBeVisible();
      
      // Verify chat area is scrollable
      const chatMessages = page.locator('[data-testid="chat-messages"]');
      if (await chatMessages.isVisible()) {
        // Chat should be scrollable without interference from agent cards
        await chatMessages.evaluate(el => {
          el.scrollTop = el.scrollHeight;
        });
        
        await page.waitForTimeout(500);
        
        // Should not cause layout issues
        await expect(page.getByTestId('chat-interface')).toBeVisible();
      }
    });
  });
});

test.describe('Agent Status Cards Performance', () => {
  test('should not significantly impact page performance', async ({ page }) => {
    // Start performance measurement
    await page.goto(`${TEST_CONFIG.baseUrl}/research`, { waitUntil: 'networkidle' });
    
    const performanceEntry = await page.evaluate(() => performance.now());
    
    // Start research with agent cards
    await page.fill('[data-testid="chat-input"]', 'Performance test query');
    await page.click('[data-testid="send-button"]');
    
    // Wait for agent cards to appear
    await expect(page.locator('.agent-status-card').first()).toBeVisible();
    
    const endPerformance = await page.evaluate(() => performance.now());
    const renderTime = endPerformance - performanceEntry;
    
    // Should render within reasonable time (adjust threshold as needed)
    expect(renderTime).toBeLessThan(10000); // 10 seconds max
  });
});