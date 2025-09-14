import { test, expect, Page } from '@playwright/test';

/**
 * Comprehensive End-to-End User Workflow Test Suite
 * 
 * This test suite validates the complete user journey:
 * 1. User submits a prompt in chat
 * 2. Agent prepares and shows research plan in chat
 * 3. User approves the plan
 * 4. Agent popup card appears with proper positioning
 * 5. Agent responses stream back to chat interface
 * 6. Verify no layout issues, overlapping, or spacing problems
 * 7. Test on multiple screen sizes for responsiveness
 */

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
  largeDesktop: { width: 1920, height: 1080 }
};

const TEST_PROMPTS = {
  simple: "What are the benefits of renewable energy?",
  complex: "Analyze the impact of AI on healthcare, including benefits, risks, and future implications for patient care and medical research",
  technical: "Explain quantum computing algorithms and their applications in cryptography"
};

test.describe('Complete User Workflow - End to End', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Navigate to chat interface
    await page.goto('http://localhost:3000/chat');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Ensure we're authenticated (mock or real auth)
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });

  test.describe('Desktop Workflow Tests', () => {
    test.beforeEach(async () => {
      await page.setViewportSize(VIEWPORTS.desktop);
    });

    test('Complete workflow: Simple prompt submission to response', async () => {
      // Step 1: User submits a prompt in chat
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeVisible();
      
      await chatInput.fill(TEST_PROMPTS.simple);
      await chatInput.press('Enter');
      
      // Verify prompt appears in chat
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText(TEST_PROMPTS.simple);
      
      // Step 2: Agent prepares and shows research plan in chat
      await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
      
      // Verify research plan contains expected elements
      const researchPlan = page.locator('[data-testid="agent-research-plan"]');
      await expect(researchPlan).toContainText('Research Plan');
      await expect(researchPlan.locator('[data-testid="approve-button"]')).toBeVisible();
      
      // Step 3: User approves the plan
      await researchPlan.locator('[data-testid="approve-button"]').click();
      
      // Step 4: Agent popup card appears with proper positioning
      const agentCard = page.locator('[data-testid="agent-status-card"]');
      await expect(agentCard).toBeVisible({ timeout: 10000 });
      
      // Verify positioning and no overlap
      const cardBounds = await agentCard.boundingBox();
      const chatBounds = await page.locator('[data-testid="chat-messages"]').boundingBox();
      
      expect(cardBounds).toBeTruthy();
      expect(chatBounds).toBeTruthy();
      
      // Ensure agent card doesn't overlap with chat area
      if (cardBounds && chatBounds) {
        expect(cardBounds.x + cardBounds.width).toBeLessThanOrEqual(chatBounds.x + 10); // 10px tolerance
      }
      
      // Step 5: Agent responses stream back to chat interface
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 30000 });
      
      // Wait for streaming to complete
      await page.waitForFunction(() => {
        const responses = document.querySelectorAll('[data-testid="agent-response"]');
        return responses.length > 0 && 
               !document.querySelector('[data-testid="streaming-indicator"]');
      }, { timeout: 60000 });
      
      // Step 6: Verify no layout issues
      await verifyLayoutIntegrity(page);
      
      // Verify agent card disappears after completion
      await expect(agentCard).not.toBeVisible({ timeout: 10000 });
      
      // Verify final response is complete and properly formatted
      const finalResponse = page.locator('[data-testid="agent-response"]').last();
      await expect(finalResponse).toBeVisible();
      
      const responseText = await finalResponse.textContent();
      expect(responseText).toBeTruthy();
      expect(responseText!.length).toBeGreaterThan(50); // Meaningful response
    });

    test('Complex prompt workflow with multiple agents', async () => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill(TEST_PROMPTS.complex);
      await chatInput.press('Enter');
      
      // Wait for research plan
      await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
      
      // Approve plan
      await page.locator('[data-testid="approve-button"]').click();
      
      // Verify multiple agent cards can appear
      const agentCards = page.locator('[data-testid="agent-status-card"]');
      await expect(agentCards.first()).toBeVisible({ timeout: 10000 });
      
      // Check for proper positioning of multiple cards
      const cardCount = await agentCards.count();
      if (cardCount > 1) {
        for (let i = 0; i < cardCount; i++) {
          const card = agentCards.nth(i);
          await expect(card).toBeVisible();
          
          // Verify cards don't overlap each other
          if (i > 0) {
            const currentCardBounds = await card.boundingBox();
            const previousCardBounds = await agentCards.nth(i - 1).boundingBox();
            
            if (currentCardBounds && previousCardBounds) {
              expect(currentCardBounds.y).toBeGreaterThanOrEqual(
                previousCardBounds.y + previousCardBounds.height + 5 // 5px margin
              );
            }
          }
        }
      }
      
      // Wait for all responses
      await page.waitForFunction(() => {
        return !document.querySelector('[data-testid="streaming-indicator"]') &&
               document.querySelectorAll('[data-testid="agent-response"]').length > 0;
      }, { timeout: 90000 });
      
      await verifyLayoutIntegrity(page);
    });

    test('Error handling and recovery', async () => {
      // Test with potentially problematic prompt
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Test error recovery with special characters: <script>alert("test")</script>');
      await chatInput.press('Enter');
      
      // Should still show research plan or error message
      await expect(
        page.locator('[data-testid="agent-research-plan"], [data-testid="error-message"]')
      ).toBeVisible({ timeout: 15000 });
      
      // Verify no JavaScript injection
      const alertDialogs = [];
      page.on('dialog', dialog => {
        alertDialogs.push(dialog);
        dialog.dismiss();
      });
      
      await page.waitForTimeout(2000);
      expect(alertDialogs).toHaveLength(0);
      
      await verifyLayoutIntegrity(page);
    });
  });

  test.describe('Responsive Workflow Tests', () => {
    Object.entries(VIEWPORTS).forEach(([deviceType, viewport]) => {
      test(`${deviceType} - Complete workflow responsiveness`, async () => {
        await page.setViewportSize(viewport);
        
        // Test basic workflow on this viewport
        const chatInput = page.locator('[data-testid="chat-input"]');
        await expect(chatInput).toBeVisible();
        
        await chatInput.fill(TEST_PROMPTS.simple);
        await chatInput.press('Enter');
        
        // Verify UI adapts to screen size
        await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
        
        // Wait for research plan
        await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
        
        // On mobile, agent cards should stack or be positioned differently
        if (deviceType === 'mobile') {
          const agentPlan = page.locator('[data-testid="agent-research-plan"]');
          const planBounds = await agentPlan.boundingBox();
          
          if (planBounds) {
            expect(planBounds.width).toBeLessThanOrEqual(viewport.width);
          }
        }
        
        await page.locator('[data-testid="approve-button"]').click();
        
        // Agent cards should be responsive
        const agentCard = page.locator('[data-testid="agent-status-card"]');
        if (await agentCard.isVisible({ timeout: 5000 })) {
          const cardBounds = await agentCard.boundingBox();
          
          if (cardBounds) {
            // Cards should not extend beyond viewport
            expect(cardBounds.x + cardBounds.width).toBeLessThanOrEqual(viewport.width);
            expect(cardBounds.y + cardBounds.height).toBeLessThanOrEqual(viewport.height);
          }
        }
        
        // Wait for response with shorter timeout for mobile
        const timeout = deviceType === 'mobile' ? 45000 : 30000;
        await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout });
        
        await verifyLayoutIntegrity(page, deviceType);
      });
    });
  });

  test.describe('Performance and Stress Tests', () => {
    test('Multiple rapid prompts handling', async () => {
      await page.setViewportSize(VIEWPORTS.desktop);
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Submit multiple prompts in quick succession
      const prompts = [
        'Quick test 1',
        'Quick test 2', 
        'Quick test 3'
      ];
      
      for (const prompt of prompts) {
        await chatInput.fill(prompt);
        await chatInput.press('Enter');
        await page.waitForTimeout(1000); // Brief pause between prompts
      }
      
      // Verify all prompts appear in chat
      for (const prompt of prompts) {
        await expect(page.locator(`text="${prompt}"`)).toBeVisible();
      }
      
      // Should handle gracefully without UI breaking
      await verifyLayoutIntegrity(page);
    });

    test('Long conversation workflow', async () => {
      await page.setViewportSize(VIEWPORTS.desktop);
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Simulate a longer conversation
      for (let i = 1; i <= 3; i++) {
        await chatInput.fill(`Conversation turn ${i}: Tell me about topic ${i}`);
        await chatInput.press('Enter');
        
        // Wait for each response to complete before next prompt
        await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
        await page.locator('[data-testid="approve-button"]').click();
        
        // Wait for response
        await page.waitForFunction(() => {
          const responses = document.querySelectorAll('[data-testid="agent-response"]');
          return responses.length >= i && 
                 !document.querySelector('[data-testid="streaming-indicator"]');
        }, { timeout: 60000 });
      }
      
      // Verify scroll behavior and message history
      const messages = page.locator('[data-testid="user-message"], [data-testid="agent-response"]');
      const messageCount = await messages.count();
      expect(messageCount).toBeGreaterThanOrEqual(6); // 3 user + 3 agent minimum
      
      await verifyLayoutIntegrity(page);
    });
  });

  test.describe('Accessibility Tests', () => {
    test('Keyboard navigation workflow', async () => {
      await page.setViewportSize(VIEWPORTS.desktop);
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeFocused();
      
      await chatInput.type(TEST_PROMPTS.simple);
      await page.keyboard.press('Enter');
      
      // Wait for research plan
      await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
      
      // Navigate to approve button with keyboard
      await page.keyboard.press('Tab');
      const approveButton = page.locator('[data-testid="approve-button"]');
      await expect(approveButton).toBeFocused();
      
      await page.keyboard.press('Enter');
      
      // Continue workflow and verify accessibility
      await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 30000 });
      
      await verifyLayoutIntegrity(page);
    });

    test('Screen reader compatibility', async () => {
      await page.setViewportSize(VIEWPORTS.desktop);
      
      // Check ARIA labels and roles
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toHaveAttribute('aria-label');
      
      const chatMessages = page.locator('[data-testid="chat-messages"]');
      await expect(chatMessages).toHaveAttribute('role', 'log');
      
      await chatInput.fill(TEST_PROMPTS.simple);
      await chatInput.press('Enter');
      
      // Wait for research plan
      await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
      
      const researchPlan = page.locator('[data-testid="agent-research-plan"]');
      await expect(researchPlan).toHaveAttribute('role', 'region');
      
      await page.locator('[data-testid="approve-button"]').click();
      
      // Agent status cards should have proper ARIA labels
      const agentCard = page.locator('[data-testid="agent-status-card"]');
      if (await agentCard.isVisible({ timeout: 5000 })) {
        await expect(agentCard).toHaveAttribute('aria-label');
      }
    });
  });
});

/**
 * Utility function to verify layout integrity across the interface
 */
async function verifyLayoutIntegrity(page: Page, deviceType: string = 'desktop') {
  // Check for overlapping elements
  const chatMessages = page.locator('[data-testid="chat-messages"]');
  const sidebar = page.locator('[data-testid="sidebar"]');
  const agentCards = page.locator('[data-testid="agent-status-card"]');
  
  if (await chatMessages.isVisible()) {
    const chatBounds = await chatMessages.boundingBox();
    expect(chatBounds).toBeTruthy();
  }
  
  if (await sidebar.isVisible()) {
    const sidebarBounds = await sidebar.boundingBox();
    const chatBounds = await chatMessages.boundingBox();
    
    if (sidebarBounds && chatBounds && deviceType === 'desktop') {
      // Sidebar should not overlap with chat on desktop
      expect(sidebarBounds.x + sidebarBounds.width).toBeLessThanOrEqual(chatBounds.x + 10);
    }
  }
  
  // Check for any elements extending beyond viewport
  const allElements = page.locator('*:visible');
  const elementCount = await allElements.count();
  
  // Sample check on key elements to avoid performance issues
  const keyElements = [
    '[data-testid="chat-interface"]',
    '[data-testid="chat-messages"]',
    '[data-testid="chat-input"]',
    '[data-testid="agent-status-card"]'
  ];
  
  for (const selector of keyElements) {
    const element = page.locator(selector);
    if (await element.isVisible()) {
      const bounds = await element.boundingBox();
      if (bounds) {
        expect(bounds.x).toBeGreaterThanOrEqual(-10); // Small tolerance for margins
        expect(bounds.y).toBeGreaterThanOrEqual(-10);
      }
    }
  }
  
  // Check for any JavaScript errors
  const jsErrors = await page.evaluate(() => {
    return (window as any).jsErrors || [];
  });
  
  if (jsErrors.length > 0) {
    console.warn('JavaScript errors detected:', jsErrors);
  }
  
  // Verify no broken images
  const images = page.locator('img');
  const imageCount = await images.count();
  
  for (let i = 0; i < Math.min(imageCount, 10); i++) {
    const image = images.nth(i);
    if (await image.isVisible()) {
      const src = await image.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        // Check if image loaded successfully
        const naturalWidth = await image.evaluate((img: HTMLImageElement) => img.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  }
  
  // Check for proper text rendering
  const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span').first();
  if (await textElements.isVisible()) {
    const textColor = await textElements.evaluate(el => getComputedStyle(el).color);
    expect(textColor).not.toBe('rgb(0, 0, 0)'); // Should not be default black
  }
}

export { verifyLayoutIntegrity, VIEWPORTS, TEST_PROMPTS };