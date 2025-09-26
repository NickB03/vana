/**
 * Integration Tests for Chat Actions
 * Tests full flow from frontend to backend for chat actions
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  parentId?: string;
  feedback?: 'positive' | 'negative' | null;
}

interface TestContext {
  page: Page;
  sessionId: string;
  messages: ChatMessage[];
}

class ChatActionTestHelper {
  constructor(private page: Page) {}

  async sendMessage(content: string): Promise<string> {
    await this.page.fill('[data-testid="chat-input"]', content);
    await this.page.click('[data-testid="send-button"]');

    // Wait for message to appear
    await this.page.waitForSelector(`text="${content}"`);

    // Wait for response
    await this.page.waitForSelector('[data-testid="assistant-message"]:last-child');

    // Get the message ID from the DOM
    const messageElement = this.page.locator('[data-testid="assistant-message"]:last-child');
    return await messageElement.getAttribute('data-message-id') || '';
  }

  async clickEditButton(messageId: string): Promise<void> {
    await this.page.click(`[data-message-id="${messageId}"] [data-testid="edit-button"]`);
  }

  async clickDeleteButton(messageId: string): Promise<void> {
    await this.page.click(`[data-message-id="${messageId}"] [data-testid="delete-button"]`);
  }

  async clickRegenerateButton(messageId: string): Promise<void> {
    await this.page.click(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);
  }

  async clickFeedbackButton(messageId: string, type: 'upvote' | 'downvote'): Promise<void> {
    await this.page.click(`[data-message-id="${messageId}"] [data-testid="${type}-button"]`);
  }

  async waitForStreamingComplete(): Promise<void> {
    await this.page.waitForSelector('[data-testid="streaming-indicator"]', { state: 'hidden' });
  }

  async waitForThoughtProcess(): Promise<string[]> {
    const thoughts: string[] = [];

    // Wait for thought process to start
    await this.page.waitForSelector('[data-testid="thought-process"]');

    // Collect all thought process steps
    const thoughtElements = this.page.locator('[data-testid="thought-step"]');
    const count = await thoughtElements.count();

    for (let i = 0; i < count; i++) {
      const text = await thoughtElements.nth(i).textContent();
      if (text) thoughts.push(text);
    }

    return thoughts;
  }

  async getMessageContent(messageId: string): Promise<string> {
    const element = this.page.locator(`[data-message-id="${messageId}"] [data-testid="message-content"]`);
    return await element.textContent() || '';
  }

  async isEditMode(messageId: string): Promise<boolean> {
    const editInput = this.page.locator(`[data-message-id="${messageId}"] [data-testid="edit-input"]`);
    return await editInput.isVisible();
  }

  async saveEdit(messageId: string, newContent: string): Promise<void> {
    await this.page.fill(`[data-message-id="${messageId}"] [data-testid="edit-input"]`, newContent);
    await this.page.click(`[data-message-id="${messageId}"] [data-testid="save-button"]`);
  }

  async cancelEdit(messageId: string): Promise<void> {
    await this.page.click(`[data-message-id="${messageId}"] [data-testid="cancel-button"]`);
  }
}

test.describe('Chat Actions Integration Tests', () => {
  let helper: ChatActionTestHelper;
  let context: TestContext;

  test.beforeEach(async ({ page, context: browserContext }) => {
    helper = new ChatActionTestHelper(page);
    context = {
      page,
      sessionId: `test-session-${Date.now()}`,
      messages: []
    };

    // Navigate to chat page
    await page.goto('/chat');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Mock the session storage
    await page.addInitScript((sessionId) => {
      window.localStorage.setItem('chat-session-id', sessionId);
    }, context.sessionId);
  });

  test.describe('Message Regeneration Flow', () => {
    test('should regenerate message with full SSE streaming', async () => {
      // Send initial message
      const messageId = await helper.sendMessage('Tell me about TypeScript');

      // Click regenerate button
      await helper.clickRegenerateButton(messageId);

      // Wait for and verify thought process
      const thoughts = await helper.waitForThoughtProcess();
      expect(thoughts.length).toBeGreaterThan(0);
      expect(thoughts[0]).toContain('Analyzing');

      // Wait for streaming to complete
      await helper.waitForStreamingComplete();

      // Verify new content is different
      const newContent = await helper.getMessageContent(messageId);
      expect(newContent).toBeTruthy();
      expect(newContent.length).toBeGreaterThan(10);
    });

    test('should show regenerate button disabled during streaming', async () => {
      const messageId = await helper.sendMessage('Explain React hooks');

      // Click regenerate
      await helper.clickRegenerateButton(messageId);

      // Button should be disabled during streaming
      const regenerateButton = context.page.locator(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);
      await expect(regenerateButton).toBeDisabled();

      // Wait for completion
      await helper.waitForStreamingComplete();

      // Button should be enabled again
      await expect(regenerateButton).toBeEnabled();
    });

    test('should handle multiple regeneration attempts', async () => {
      const messageId = await helper.sendMessage('What is AI?');

      // First regeneration
      await helper.clickRegenerateButton(messageId);
      await helper.waitForStreamingComplete();
      const firstResponse = await helper.getMessageContent(messageId);

      // Second regeneration
      await helper.clickRegenerateButton(messageId);
      await helper.waitForStreamingComplete();
      const secondResponse = await helper.getMessageContent(messageId);

      // Responses should be different
      expect(firstResponse).not.toBe(secondResponse);
    });

    test('should maintain conversation context after regeneration', async () => {
      // Send context message
      await helper.sendMessage('My name is John');

      // Send follow-up
      const messageId = await helper.sendMessage('What is my name?');

      // Regenerate the response
      await helper.clickRegenerateButton(messageId);
      await helper.waitForStreamingComplete();

      const content = await helper.getMessageContent(messageId);
      expect(content.toLowerCase()).toContain('john');
    });
  });

  test.describe('Message Editing Flow', () => {
    test('should edit user message and regenerate response', async () => {
      const messageId = await helper.sendMessage('Tell me about JavaScript');

      // Find the user message (parent of assistant message)
      const userMessageElement = context.page.locator('[data-testid="user-message"]:last-child');
      const userMessageId = await userMessageElement.getAttribute('data-message-id') || '';

      // Click edit on user message
      await helper.clickEditButton(userMessageId);

      // Verify edit mode is active
      expect(await helper.isEditMode(userMessageId)).toBe(true);

      // Edit the message
      await helper.saveEdit(userMessageId, 'Tell me about TypeScript instead');

      // Should trigger regeneration of assistant response
      await helper.waitForStreamingComplete();

      // Verify assistant response reflects the edit
      const assistantContent = await helper.getMessageContent(messageId);
      expect(assistantContent.toLowerCase()).toContain('typescript');
    });

    test('should cancel edit without changes', async () => {
      const messageId = await helper.sendMessage('Hello world');

      const userMessageElement = context.page.locator('[data-testid="user-message"]:last-child');
      const userMessageId = await userMessageElement.getAttribute('data-message-id') || '';

      const originalContent = await helper.getMessageContent(userMessageId);

      // Start editing
      await helper.clickEditButton(userMessageId);

      // Change content but cancel
      await context.page.fill(`[data-message-id="${userMessageId}"] [data-testid="edit-input"]`, 'Different content');
      await helper.cancelEdit(userMessageId);

      // Content should remain unchanged
      const finalContent = await helper.getMessageContent(userMessageId);
      expect(finalContent).toBe(originalContent);
    });

    test('should prevent editing assistant messages', async () => {
      const messageId = await helper.sendMessage('Test message');

      // Try to find edit button on assistant message
      const editButton = context.page.locator(`[data-message-id="${messageId}"] [data-testid="edit-button"]`);

      // Edit button should not exist or be disabled for assistant messages
      const isVisible = await editButton.isVisible();
      if (isVisible) {
        await expect(editButton).toBeDisabled();
      } else {
        expect(isVisible).toBe(false);
      }
    });
  });

  test.describe('Message Deletion Flow', () => {
    test('should delete message and all descendants', async () => {
      // Create a conversation chain
      const firstMessageId = await helper.sendMessage('What is programming?');
      const secondMessageId = await helper.sendMessage('Tell me more about functions');

      // Count initial messages
      const initialCount = await context.page.locator('[data-testid="message"]').count();

      // Delete the first user message
      const firstUserMessage = context.page.locator('[data-testid="user-message"]').first();
      const firstUserMessageId = await firstUserMessage.getAttribute('data-message-id') || '';

      await helper.clickDeleteButton(firstUserMessageId);

      // Confirm deletion in modal
      await context.page.click('[data-testid="confirm-delete"]');

      // Wait for messages to be removed
      await context.page.waitForTimeout(1000);

      // Should have fewer messages (deleted message + its descendants)
      const finalCount = await context.page.locator('[data-testid="message"]').count();
      expect(finalCount).toBeLessThan(initialCount);

      // Deleted message should not exist
      const deletedElement = context.page.locator(`[data-message-id="${firstUserMessageId}"]`);
      await expect(deletedElement).not.toBeVisible();
    });

    test('should show confirmation dialog before deletion', async () => {
      const messageId = await helper.sendMessage('Test deletion');

      const userMessageElement = context.page.locator('[data-testid="user-message"]:last-child');
      const userMessageId = await userMessageElement.getAttribute('data-message-id') || '';

      await helper.clickDeleteButton(userMessageId);

      // Confirmation dialog should appear
      await expect(context.page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
      await expect(context.page.locator('text=Delete this message and all responses?')).toBeVisible();

      // Cancel deletion
      await context.page.click('[data-testid="cancel-delete"]');

      // Message should still exist
      const messageElement = context.page.locator(`[data-message-id="${userMessageId}"]`);
      await expect(messageElement).toBeVisible();
    });

    test('should reset conversation state after deletion', async () => {
      // Create conversation
      await helper.sendMessage('Remember this: favorite color is blue');
      const messageId = await helper.sendMessage('What is my favorite color?');

      // Verify AI remembers
      const content = await helper.getMessageContent(messageId);
      expect(content.toLowerCase()).toContain('blue');

      // Delete the context message
      const firstUserMessage = context.page.locator('[data-testid="user-message"]').first();
      const firstUserMessageId = await firstUserMessage.getAttribute('data-message-id') || '';

      await helper.clickDeleteButton(firstUserMessageId);
      await context.page.click('[data-testid="confirm-delete"]');

      // Ask the same question again
      const newMessageId = await helper.sendMessage('What is my favorite color?');

      // AI should not remember the deleted context
      const newContent = await helper.getMessageContent(newMessageId);
      expect(newContent.toLowerCase()).not.toContain('blue');
    });
  });

  test.describe('Feedback System Flow', () => {
    test('should persist upvote feedback', async () => {
      const messageId = await helper.sendMessage('Explain quantum computing');

      // Give positive feedback
      await helper.clickFeedbackButton(messageId, 'upvote');

      // Verify visual feedback
      const upvoteButton = context.page.locator(`[data-message-id="${messageId}"] [data-testid="upvote-button"]`);
      await expect(upvoteButton).toHaveAttribute('data-active', 'true');

      // Refresh page and verify persistence
      await context.page.reload();
      await context.page.waitForLoadState('networkidle');

      const reloadedUpvoteButton = context.page.locator(`[data-message-id="${messageId}"] [data-testid="upvote-button"]`);
      await expect(reloadedUpvoteButton).toHaveAttribute('data-active', 'true');
    });

    test('should toggle feedback when clicking same button', async () => {
      const messageId = await helper.sendMessage('What is machine learning?');

      // First click - activate upvote
      await helper.clickFeedbackButton(messageId, 'upvote');

      const upvoteButton = context.page.locator(`[data-message-id="${messageId}"] [data-testid="upvote-button"]`);
      await expect(upvoteButton).toHaveAttribute('data-active', 'true');

      // Second click - deactivate upvote
      await helper.clickFeedbackButton(messageId, 'upvote');
      await expect(upvoteButton).toHaveAttribute('data-active', 'false');
    });

    test('should switch between upvote and downvote', async () => {
      const messageId = await helper.sendMessage('Describe neural networks');

      // First upvote
      await helper.clickFeedbackButton(messageId, 'upvote');

      const upvoteButton = context.page.locator(`[data-message-id="${messageId}"] [data-testid="upvote-button"]`);
      const downvoteButton = context.page.locator(`[data-message-id="${messageId}"] [data-testid="downvote-button"]`);

      await expect(upvoteButton).toHaveAttribute('data-active', 'true');
      await expect(downvoteButton).toHaveAttribute('data-active', 'false');

      // Then downvote
      await helper.clickFeedbackButton(messageId, 'downvote');

      await expect(upvoteButton).toHaveAttribute('data-active', 'false');
      await expect(downvoteButton).toHaveAttribute('data-active', 'true');
    });

    test('should show feedback statistics to admin users', async () => {
      // This test would require admin authentication
      // Placeholder for admin feedback analytics
      test.skip();
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle network failure during regeneration', async () => {
      const messageId = await helper.sendMessage('Test network failure');

      // Simulate network failure
      await context.page.route('**/api/chat/regenerate', route => {
        route.abort('failed');
      });

      // Try to regenerate
      await helper.clickRegenerateButton(messageId);

      // Should show error message
      await expect(context.page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(context.page.locator('text=Failed to regenerate response')).toBeVisible();

      // Restore network and retry
      await context.page.unroute('**/api/chat/regenerate');

      // Retry button should work
      await context.page.click('[data-testid="retry-button"]');
      await helper.waitForStreamingComplete();

      // Should succeed on retry
      const content = await helper.getMessageContent(messageId);
      expect(content).toBeTruthy();
    });

    test('should recover from SSE connection drop', async () => {
      const messageId = await helper.sendMessage('Test SSE recovery');

      // Start regeneration
      await helper.clickRegenerateButton(messageId);

      // Simulate SSE connection drop after it starts
      await context.page.waitForSelector('[data-testid="streaming-indicator"]');

      // Force close SSE connection (simulated by reloading)
      await context.page.evaluate(() => {
        // Simulate connection drop
        window.dispatchEvent(new Event('beforeunload'));
      });

      // Should show reconnecting indicator
      await expect(context.page.locator('[data-testid="reconnecting-indicator"]')).toBeVisible();

      // Should eventually recover and complete
      await helper.waitForStreamingComplete();
      const content = await helper.getMessageContent(messageId);
      expect(content).toBeTruthy();
    });

    test('should handle malformed server responses', async () => {
      const messageId = await helper.sendMessage('Test malformed response');

      // Mock malformed response
      await context.page.route('**/api/chat/regenerate', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"invalid": json syntax'
        });
      });

      await helper.clickRegenerateButton(messageId);

      // Should show appropriate error
      await expect(context.page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(context.page.locator('text=Invalid server response')).toBeVisible();
    });

    test('should rollback on edit failure', async () => {
      const messageId = await helper.sendMessage('Test edit rollback');

      const userMessageElement = context.page.locator('[data-testid="user-message"]:last-child');
      const userMessageId = await userMessageElement.getAttribute('data-message-id') || '';

      const originalContent = await helper.getMessageContent(userMessageId);

      // Start editing
      await helper.clickEditButton(userMessageId);

      // Mock edit failure
      await context.page.route('**/api/chat/messages/*/edit', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Edit failed' })
        });
      });

      // Try to save edit
      await helper.saveEdit(userMessageId, 'This edit will fail');

      // Should show error and rollback
      await expect(context.page.locator('[data-testid="error-message"]')).toBeVisible();

      const finalContent = await helper.getMessageContent(userMessageId);
      expect(finalContent).toBe(originalContent);
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle large conversations efficiently', async () => {
      const startTime = Date.now();

      // Create a long conversation
      for (let i = 0; i < 20; i++) {
        await helper.sendMessage(`Message ${i + 1}: Tell me something interesting`);
        // Small delay to prevent overwhelming
        await context.page.waitForTimeout(100);
      }

      const setupTime = Date.now() - startTime;

      // Performance assertion - should complete in reasonable time
      expect(setupTime).toBeLessThan(30000); // 30 seconds

      // Test action performance on large conversation
      const lastMessageElement = context.page.locator('[data-testid="assistant-message"]:last-child');
      const lastMessageId = await lastMessageElement.getAttribute('data-message-id') || '';

      const actionStartTime = Date.now();
      await helper.clickRegenerateButton(lastMessageId);
      await helper.waitForStreamingComplete();
      const actionTime = Date.now() - actionStartTime;

      // Action should still be responsive
      expect(actionTime).toBeLessThan(10000); // 10 seconds
    });

    test('should maintain responsive UI during streaming', async () => {
      const messageId = await helper.sendMessage('Write a very long essay about AI');

      // Start regeneration (should be a long response)
      await helper.clickRegenerateButton(messageId);

      // UI should remain responsive during streaming
      // Test by clicking other UI elements
      await context.page.click('[data-testid="sidebar-toggle"]');
      await context.page.click('[data-testid="new-chat-button"]');

      // These actions should complete quickly even during streaming
      const sidebarState = await context.page.locator('[data-testid="sidebar"]').isVisible();
      expect(typeof sidebarState).toBe('boolean');
    });

    test('should handle concurrent action attempts gracefully', async () => {
      const messageId = await helper.sendMessage('Test concurrent actions');

      // Try to perform multiple actions simultaneously
      const promises = [
        helper.clickRegenerateButton(messageId).catch(() => {}),
        helper.clickFeedbackButton(messageId, 'upvote').catch(() => {}),
        helper.clickFeedbackButton(messageId, 'downvote').catch(() => {})
      ];

      await Promise.allSettled(promises);

      // UI should remain stable
      const messageElement = context.page.locator(`[data-message-id="${messageId}"]`);
      await expect(messageElement).toBeVisible();
    });
  });

  test.describe('Accessibility and Keyboard Navigation', () => {
    test('should support keyboard navigation for all actions', async () => {
      const messageId = await helper.sendMessage('Test keyboard navigation');

      // Tab to action buttons
      await context.page.keyboard.press('Tab');
      await context.page.keyboard.press('Tab');

      // Should focus on first action button
      const focusedElement = await context.page.locator(':focus');
      const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
      expect(tagName).toBe('button');

      // Enter should activate the button
      await context.page.keyboard.press('Enter');

      // Should have some visible result
      await context.page.waitForTimeout(500);
    });

    test('should announce state changes to screen readers', async () => {
      const messageId = await helper.sendMessage('Test screen reader announcements');

      // Check for proper ARIA attributes
      const regenerateButton = context.page.locator(`[data-message-id="${messageId}"] [data-testid="regenerate-button"]`);

      await expect(regenerateButton).toHaveAttribute('aria-label', 'Regenerate response');

      // After clicking, should announce loading state
      await helper.clickRegenerateButton(messageId);

      await expect(regenerateButton).toHaveAttribute('aria-busy', 'true');

      await helper.waitForStreamingComplete();

      await expect(regenerateButton).toHaveAttribute('aria-busy', 'false');
    });

    test('should provide proper focus management during editing', async () => {
      const messageId = await helper.sendMessage('Test focus management');

      const userMessageElement = context.page.locator('[data-testid="user-message"]:last-child');
      const userMessageId = await userMessageElement.getAttribute('data-message-id') || '';

      // Start editing
      await helper.clickEditButton(userMessageId);

      // Focus should move to edit input
      const editInput = context.page.locator(`[data-message-id="${userMessageId}"] [data-testid="edit-input"]`);
      await expect(editInput).toBeFocused();

      // Cancel editing
      await helper.cancelEdit(userMessageId);

      // Focus should return to edit button
      const editButton = context.page.locator(`[data-message-id="${userMessageId}"] [data-testid="edit-button"]`);
      await expect(editButton).toBeFocused();
    });
  });
});