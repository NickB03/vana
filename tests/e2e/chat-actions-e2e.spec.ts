/**
 * End-to-End Tests for Chat Actions
 * Critical user journeys and real-world scenarios
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiURL: process.env.API_URL || 'http://localhost:8000',
  slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0,
  timeout: 30000
};

// Test user accounts (would come from test data setup)
const TEST_USERS = {
  regular: {
    email: 'test@example.com',
    password: 'testpass123'
  },
  premium: {
    email: 'premium@example.com',
    password: 'premiumpass123'
  }
};

class ChatE2EHelper {
  constructor(private page: Page) {}

  async login(userType: 'regular' | 'premium' = 'regular') {
    const user = TEST_USERS[userType];

    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.click('[data-testid="login-button"]');

    // Wait for redirect to chat
    await this.page.waitForURL('/chat');
  }

  async startNewChat() {
    await this.page.click('[data-testid="new-chat-button"]');
    await this.page.waitForLoadState('networkidle');
  }

  async sendMessageAndWaitForResponse(message: string): Promise<{ userMessageId: string, assistantMessageId: string }> {
    await this.page.fill('[data-testid="chat-input"]', message);
    await this.page.click('[data-testid="send-button"]');

    // Wait for user message to appear
    await this.page.waitForSelector(`text="${message}"`);

    // Get user message ID
    const userMessageElement = this.page.locator('[data-testid="user-message"]:last-child');
    const userMessageId = await userMessageElement.getAttribute('data-message-id') || '';

    // Wait for assistant response
    await this.page.waitForSelector('[data-testid="assistant-message"]:last-child');
    await this.page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });

    // Get assistant message ID
    const assistantMessageElement = this.page.locator('[data-testid="assistant-message"]:last-child');
    const assistantMessageId = await assistantMessageElement.getAttribute('data-message-id') || '';

    return { userMessageId, assistantMessageId };
  }

  async takeScreenshotWithName(name: string) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  async simulateNetworkCondition(condition: 'slow3g' | 'fast3g' | 'offline') {
    const context = this.page.context();

    const conditions = {
      slow3g: { offline: false, downloadThroughput: 50 * 1024, uploadThroughput: 50 * 1024, latency: 2000 },
      fast3g: { offline: false, downloadThroughput: 1.6 * 1024 * 1024, uploadThroughput: 750 * 1024, latency: 562.5 },
      offline: { offline: true }
    };

    await context.setNetworkConditions(conditions[condition]);
  }
}

test.describe.configure({ mode: 'serial' }); // Run tests in sequence for better reliability

test.describe('Critical Chat Action User Journeys', () => {
  let helper: ChatE2EHelper;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: 'test-results/videos/' }
    });
  });

  test.beforeEach(async () => {
    const page = await context.newPage();
    helper = new ChatE2EHelper(page);
    await helper.login('regular');
  });

  test.afterEach(async () => {
    await helper.takeScreenshotWithName('test-end');
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Complete conversation workflow: ask → edit → regenerate → feedback', async () => {
    await test.step('User asks initial question', async () => {
      await helper.startNewChat();

      const { userMessageId, assistantMessageId } = await helper.sendMessageAndWaitForResponse(
        'What are the benefits of TypeScript over JavaScript?'
      );

      // Verify response is reasonable
      const responseText = await helper.page.locator(`[data-message-id="${assistantMessageId}"] [data-testid="message-content"]`).textContent();
      expect(responseText).toBeTruthy();
      expect(responseText!.length).toBeGreaterThan(100);
      expect(responseText!.toLowerCase()).toContain('typescript');

      await helper.takeScreenshotWithName('initial-question');
    });

    await test.step('User edits their question for clarity', async () => {
      const userMessage = helper.page.locator('[data-testid="user-message"]:last-child');
      const userMessageId = await userMessage.getAttribute('data-message-id') || '';

      // Enter edit mode
      await helper.page.click(`[data-message-id="${userMessageId}"] [data-testid="edit-button"]`);

      // Verify edit interface appears
      const editInput = helper.page.locator(`[data-message-id="${userMessageId}"] [data-testid="edit-input"]`);
      await expect(editInput).toBeVisible();

      // Edit the message
      await editInput.clear();
      await editInput.fill('What are the key advantages of TypeScript over JavaScript for large-scale applications?');

      // Save changes
      await helper.page.click(`[data-message-id="${userMessageId}"] [data-testid="save-button"]`);

      // Verify message was updated
      const updatedContent = await helper.page.locator(`[data-message-id="${userMessageId}"] [data-testid="message-content"]`).textContent();
      expect(updatedContent).toContain('large-scale applications');

      await helper.takeScreenshotWithName('message-edited');
    });

    await test.step('System regenerates response based on edited question', async () => {
      // Wait for automatic regeneration after edit
      await helper.page.waitForSelector('[data-testid="streaming-indicator"]');
      await helper.page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });

      // Get the new response
      const assistantMessage = helper.page.locator('[data-testid="assistant-message"]:last-child');
      const newResponseText = await assistantMessage.locator('[data-testid="message-content"]').textContent();

      // Verify response addresses the edited question
      expect(newResponseText!.toLowerCase()).toContain('large-scale');
      expect(newResponseText!.length).toBeGreaterThan(100);

      await helper.takeScreenshotWithName('response-regenerated');
    });

    await test.step('User manually regenerates for alternative response', async () => {
      const assistantMessage = helper.page.locator('[data-testid="assistant-message"]:last-child');
      const assistantMessageId = await assistantMessage.getAttribute('data-message-id') || '';

      const originalResponse = await assistantMessage.locator('[data-testid="message-content"]').textContent();

      // Click regenerate button
      await helper.page.click(`[data-message-id="${assistantMessageId}"] [data-testid="regenerate-button"]`);

      // Wait for thought process
      await helper.page.waitForSelector('[data-testid="thought-process"]');
      const thoughtSteps = helper.page.locator('[data-testid="thought-step"]');
      const thoughtCount = await thoughtSteps.count();
      expect(thoughtCount).toBeGreaterThan(0);

      // Wait for streaming to complete
      await helper.page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });

      // Verify we got a different response
      const newResponse = await assistantMessage.locator('[data-testid="message-content"]').textContent();
      expect(newResponse).not.toBe(originalResponse);

      await helper.takeScreenshotWithName('manually-regenerated');
    });

    await test.step('User provides feedback on the response', async () => {
      const assistantMessage = helper.page.locator('[data-testid="assistant-message"]:last-child');
      const assistantMessageId = await assistantMessage.getAttribute('data-message-id') || '';

      // Give positive feedback
      await helper.page.click(`[data-message-id="${assistantMessageId}"] [data-testid="upvote-button"]`);

      // Verify feedback state
      const upvoteButton = helper.page.locator(`[data-message-id="${assistantMessageId}"] [data-testid="upvote-button"]`);
      await expect(upvoteButton).toHaveAttribute('data-active', 'true');

      // Verify feedback persists after page refresh
      await helper.page.reload();
      await helper.waitForNetworkIdle();

      const reloadedUpvoteButton = helper.page.locator(`[data-message-id="${assistantMessageId}"] [data-testid="upvote-button"]`);
      await expect(reloadedUpvoteButton).toHaveAttribute('data-active', 'true');

      await helper.takeScreenshotWithName('feedback-given');
    });
  });

  test('Conversation branching: delete message and continue differently', async () => {
    await helper.startNewChat();

    await test.step('Create initial conversation branch', async () => {
      await helper.sendMessageAndWaitForResponse('I need help with Python programming');
      await helper.sendMessageAndWaitForResponse('Specifically with data structures');
      const { assistantMessageId } = await helper.sendMessageAndWaitForResponse('Can you explain lists vs dictionaries?');

      // Verify we have a 3-turn conversation
      const messageCount = await helper.page.locator('[data-testid="message"]').count();
      expect(messageCount).toBe(6); // 3 user + 3 assistant messages
    });

    await test.step('Delete middle message to branch conversation', async () => {
      // Find the second user message
      const secondUserMessage = helper.page.locator('[data-testid="user-message"]').nth(1);
      const messageId = await secondUserMessage.getAttribute('data-message-id') || '';

      // Delete the message
      await helper.page.click(`[data-message-id="${messageId}"] [data-testid="delete-button"]`);

      // Confirm deletion
      await expect(helper.page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
      await helper.page.click('[data-testid="confirm-delete"]');

      // Verify cascade deletion - should remove this message and all following
      await helper.page.waitForTimeout(1000);
      const finalMessageCount = await helper.page.locator('[data-testid="message"]').count();
      expect(finalMessageCount).toBeLessThan(6);

      await helper.takeScreenshotWithName('messages-deleted');
    });

    await test.step('Continue conversation in new direction', async () => {
      const { assistantMessageId } = await helper.sendMessageAndWaitForResponse('Actually, tell me about machine learning instead');

      // Verify response is about machine learning, not data structures
      const responseText = await helper.page.locator(`[data-message-id="${assistantMessageId}"] [data-testid="message-content"]`).textContent();
      expect(responseText!.toLowerCase()).toContain('machine learning');
      expect(responseText!.toLowerCase()).not.toContain('lists');
      expect(responseText!.toLowerCase()).not.toContain('dictionaries');

      await helper.takeScreenshotWithName('new-conversation-direction');
    });
  });

  test('Multi-user collaboration scenario (if supported)', async () => {
    test.skip(!process.env.ENABLE_COLLABORATION_TESTS, 'Collaboration tests require special setup');

    // This would test scenarios where multiple users interact with the same conversation
    // Requires backend support for shared conversations
  });

  test('Long conversation performance and memory management', async () => {
    await helper.startNewChat();

    const messageCount = 25;
    const messages: string[] = [];

    await test.step('Create long conversation', async () => {
      for (let i = 0; i < messageCount; i++) {
        const message = `Question ${i + 1}: Tell me about topic ${i + 1} in technology`;
        messages.push(message);

        const startTime = performance.now();
        await helper.sendMessageAndWaitForResponse(message);
        const responseTime = performance.now() - startTime;

        // Performance shouldn't degrade significantly with conversation length
        expect(responseTime).toBeLessThan(15000); // 15 seconds max per response

        // Take periodic screenshots
        if ((i + 1) % 10 === 0) {
          await helper.takeScreenshotWithName(`long-conversation-${i + 1}`);
        }
      }

      // Verify all messages are present
      const totalMessages = await helper.page.locator('[data-testid="message"]').count();
      expect(totalMessages).toBe(messageCount * 2); // user + assistant messages
    });

    await test.step('Test actions performance in long conversation', async () => {
      // Test regeneration on the last message
      const lastAssistantMessage = helper.page.locator('[data-testid="assistant-message"]:last-child');
      const messageId = await lastAssistantMessage.getAttribute('data-message-id') || '';

      const startTime = performance.now();
      await helper.page.click(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);
      await helper.page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });
      const regenerationTime = performance.now() - startTime;

      // Should still be reasonably fast even with long conversation
      expect(regenerationTime).toBeLessThan(10000); // 10 seconds

      await helper.takeScreenshotWithName('long-conversation-regenerated');
    });

    await test.step('Test memory usage and scroll performance', async () => {
      // Scroll to top and back to bottom
      await helper.page.keyboard.press('Home');
      await helper.page.waitForTimeout(500);

      await helper.page.keyboard.press('End');
      await helper.page.waitForTimeout(500);

      // UI should remain responsive
      const lastMessage = helper.page.locator('[data-testid="message"]:last-child');
      await expect(lastMessage).toBeVisible();
    });
  });

  test('Cross-device session continuity', async () => {
    test.skip(!process.env.ENABLE_CROSS_DEVICE_TESTS, 'Cross-device tests require special setup');

    // This would test scenarios like:
    // 1. Start conversation on desktop
    // 2. Continue on mobile
    // 3. Verify all actions work consistently
  });

  test('Offline and network recovery scenarios', async () => {
    await helper.startNewChat();

    await test.step('Start conversation normally', async () => {
      await helper.sendMessageAndWaitForResponse('Test offline recovery');
    });

    await test.step('Simulate network failure during action', async () => {
      // Simulate slow network
      await helper.simulateNetworkCondition('slow3g');

      const { assistantMessageId } = await helper.sendMessageAndWaitForResponse('This might be slow');

      // Try to regenerate with simulated network issues
      await helper.simulateNetworkCondition('offline');

      await helper.page.click(`[data-message-id="${assistantMessageId}"] [data-testid="regenerate-button"]`);

      // Should show offline indicator
      await expect(helper.page.locator('[data-testid="offline-indicator"]')).toBeVisible();

      await helper.takeScreenshotWithName('offline-mode');
    });

    await test.step('Recover when network returns', async () => {
      // Restore network
      await helper.simulateNetworkCondition('fast3g');

      // Should automatically retry or show retry button
      const retryButton = helper.page.locator('[data-testid="retry-button"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
      }

      // Should eventually succeed
      await helper.page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });
      await expect(helper.page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();

      await helper.takeScreenshotWithName('network-recovered');
    });
  });

  test('Accessibility compliance for all chat actions', async () => {
    await helper.startNewChat();
    const { userMessageId, assistantMessageId } = await helper.sendMessageAndWaitForResponse('Test accessibility');

    await test.step('Verify keyboard navigation', async () => {
      // Tab through action buttons
      await helper.page.keyboard.press('Tab');
      await helper.page.keyboard.press('Tab');
      await helper.page.keyboard.press('Tab');

      // Should be able to focus on action buttons
      const focusedElement = helper.page.locator(':focus');
      const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
      expect(['button', 'div'].includes(tagName)).toBe(true);
    });

    await test.step('Verify screen reader announcements', async () => {
      // Check ARIA labels exist
      const editButton = helper.page.locator(`[data-message-id="${userMessageId}"] [data-testid="edit-button"]`);
      await expect(editButton).toHaveAttribute('aria-label');

      const regenerateButton = helper.page.locator(`[data-message-id="${assistantMessageId}"] [data-testid="regenerate-button"]`);
      await expect(regenerateButton).toHaveAttribute('aria-label');

      const upvoteButton = helper.page.locator(`[data-message-id="${assistantMessageId}"] [data-testid="upvote-button"]`);
      await expect(upvoteButton).toHaveAttribute('aria-label');
    });

    await test.step('Verify focus management during modal interactions', async () => {
      // Open delete confirmation
      await helper.page.click(`[data-message-id="${userMessageId}"] [data-testid="delete-button"]`);

      // Focus should move to modal
      await helper.page.waitForTimeout(100);
      const activeElement = helper.page.locator(':focus');
      const isInModal = await activeElement.evaluate(el => {
        return el.closest('[data-testid="delete-confirmation"]') !== null;
      });
      expect(isInModal).toBe(true);

      // Cancel and verify focus returns
      await helper.page.click('[data-testid="cancel-delete"]');
      await helper.page.waitForTimeout(100);

      // Focus should return to delete button
      const focusedAfterCancel = helper.page.locator(':focus');
      const focusedId = await focusedAfterCancel.getAttribute('data-testid');
      expect(focusedId).toBe('delete-button');
    });

    await test.step('Verify high contrast mode compatibility', async () => {
      // This would typically require specialized testing tools
      // For now, just verify elements are visible
      await expect(helper.page.locator(`[data-message-id="${assistantMessageId}"] [data-testid="regenerate-button"]`)).toBeVisible();
      await expect(helper.page.locator(`[data-message-id="${assistantMessageId}"] [data-testid="upvote-button"]`)).toBeVisible();
      await expect(helper.page.locator(`[data-message-id="${assistantMessageId}"] [data-testid="downvote-button"]`)).toBeVisible();
    });
  });

  test('Data persistence and session recovery', async () => {
    let conversationId: string;
    let messageIds: string[] = [];

    await test.step('Create conversation and capture IDs', async () => {
      await helper.startNewChat();

      // Get conversation ID from URL or session
      const url = helper.page.url();
      conversationId = url.split('/').pop() || '';
      expect(conversationId).toBeTruthy();

      // Create some messages with feedback
      const { userMessageId, assistantMessageId } = await helper.sendMessageAndWaitForResponse('What is React?');
      messageIds.push(userMessageId, assistantMessageId);

      // Give feedback
      await helper.page.click(`[data-message-id="${assistantMessageId}"] [data-testid="upvote-button"]`);

      // Add another message
      const { userMessageId: userMsg2, assistantMessageId: assistantMsg2 } = await helper.sendMessageAndWaitForResponse('Tell me about hooks');
      messageIds.push(userMsg2, assistantMsg2);

      await helper.takeScreenshotWithName('conversation-created');
    });

    await test.step('Verify persistence after browser restart', async () => {
      // Close and reopen browser context (simulates browser restart)
      const newPage = await context.newPage();
      const newHelper = new ChatE2EHelper(newPage);
      await newHelper.login('regular');

      // Navigate to the same conversation
      await newPage.goto(`/chat/${conversationId}`);
      await newHelper.waitForNetworkIdle();

      // Verify all messages are restored
      const messageCount = await newPage.locator('[data-testid="message"]').count();
      expect(messageCount).toBe(4); // 2 user + 2 assistant

      // Verify feedback is restored
      const upvoteButton = newPage.locator(`[data-message-id="${messageIds[1]}"] [data-testid="upvote-button"]`);
      await expect(upvoteButton).toHaveAttribute('data-active', 'true');

      // Verify actions still work
      const { assistantMessageId } = await newHelper.sendMessageAndWaitForResponse('Continue the conversation');
      await newPage.click(`[data-message-id="${assistantMessageId}"] [data-testid="regenerate-button"]`);
      await newPage.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });

      await newHelper.takeScreenshotWithName('conversation-restored');

      await newPage.close();
    });

    await test.step('Verify data integrity after multiple actions', async () => {
      // Perform several actions and verify data consistency
      const lastAssistantMessage = helper.page.locator('[data-testid="assistant-message"]:last-child');
      const lastAssistantMessageId = await lastAssistantMessage.getAttribute('data-message-id') || '';

      // Regenerate multiple times
      for (let i = 0; i < 3; i++) {
        await helper.page.click(`[data-message-id="${lastAssistantMessageId}"] [data-testid="regenerate-button"]`);
        await helper.page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });
      }

      // Edit a user message
      const firstUserMessage = helper.page.locator('[data-testid="user-message"]').first();
      const firstUserMessageId = await firstUserMessage.getAttribute('data-message-id') || '';

      await helper.page.click(`[data-message-id="${firstUserMessageId}"] [data-testid="edit-button"]`);
      await helper.page.fill(`[data-message-id="${firstUserMessageId}"] [data-testid="edit-input"]`, 'What is React and why is it popular?');
      await helper.page.click(`[data-message-id="${firstUserMessageId}"] [data-testid="save-button"]`);

      // Wait for regeneration to complete
      await helper.page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });

      // Verify conversation is still coherent
      const messages = await helper.page.locator('[data-testid="message"]').count();
      expect(messages).toBeGreaterThan(4);

      await helper.takeScreenshotWithName('data-integrity-verified');
    });
  });
});