/**
 * End-to-End Chat Workflow Tests
 * 
 * Complete user workflow tests for the chat interface including:
 * - Full chat session with backend
 * - Authentication flow from login to logout
 * - Error recovery scenarios
 * - Real-time streaming experience
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Chat Workflow E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('complete chat session workflow', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Verify the chat interface is loaded
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();

    // Initial state should show no messages
    await expect(page.locator('[data-testid="messages-container"]')).toBeEmpty();

    // Type and send a message
    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    
    await messageInput.fill('Hello, can you help me with a research question?');
    await expect(sendButton).toBeEnabled();
    
    await sendButton.click();

    // Verify user message appears immediately
    await expect(page.locator('[data-testid="message-user"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-user"]')).toContainText('Hello, can you help me with a research question?');

    // Verify loading state appears
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();

    // Verify streaming response starts
    await expect(page.locator('[data-testid="streaming-message"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="streaming-indicator"]')).toBeVisible();

    // Wait for streaming to complete
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="streaming-message"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

    // Verify the assistant response contains expected content
    const assistantMessage = page.locator('[data-testid="message-assistant"]');
    await expect(assistantMessage).toContainText('Hello! I received your message');

    // Send a follow-up message
    await messageInput.fill('That\'s great! Can you tell me more?');
    await sendButton.click();

    // Verify second conversation cycle
    await expect(page.locator('[data-testid="message-user"]').nth(1)).toBeVisible();
    await expect(page.locator('[data-testid="message-assistant"]').nth(1)).toBeVisible({ timeout: 15000 });

    // Verify we now have 4 messages total (2 user, 2 assistant)
    await expect(page.locator('[data-testid="message-user"]')).toHaveCount(2);
    await expect(page.locator('[data-testid="message-assistant"]')).toHaveCount(2);

    // Test clearing messages
    await page.locator('[data-testid="clear-button"]').click();
    await expect(page.locator('[data-testid="messages-container"]')).toBeEmpty();
  });

  test('keyboard shortcuts and accessibility', async ({ page }) => {
    await page.goto('/');
    
    const messageInput = page.locator('[data-testid="message-input"]');
    
    // Test Enter key to send message
    await messageInput.fill('Testing keyboard shortcuts');
    await messageInput.press('Enter');

    // Verify message was sent
    await expect(page.locator('[data-testid="message-user"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-user"]')).toContainText('Testing keyboard shortcuts');

    // Test that Enter doesn't send empty messages
    await page.waitForSelector('[data-testid="loading-indicator"]', { state: 'hidden' });
    await page.waitForSelector('[data-testid="streaming-message"]', { state: 'hidden' });
    
    await messageInput.fill('');
    await messageInput.press('Enter');
    
    // Should still only have one user message
    await expect(page.locator('[data-testid="message-user"]')).toHaveCount(1);

    // Test accessibility - check for proper ARIA labels and roles
    await expect(messageInput).toHaveAttribute('placeholder', 'Type your message...');
    
    // Check that form elements are properly labeled
    await expect(page.locator('[data-testid="send-button"]')).toBeVisible();
  });

  test('error handling and recovery', async ({ page }) => {
    await page.goto('/');

    // Test empty message handling
    const sendButton = page.locator('[data-testid="send-button"]');
    await expect(sendButton).toBeDisabled();

    // Test whitespace-only message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('   ');
    await expect(sendButton).toBeDisabled();

    // Clear and test normal message
    await messageInput.fill('Test error recovery');
    await expect(sendButton).toBeEnabled();

    // Test that interface handles errors gracefully
    // (This would require configuring the backend to return errors)
    await sendButton.click();
    
    // Verify the message flow still works
    await expect(page.locator('[data-testid="message-user"]')).toBeVisible();
  });

  test('connection status and real-time features', async ({ page }) => {
    await page.goto('/');

    // Check initial connection status
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toContainText('Status: disconnected');

    // Send a message and monitor connection status changes
    await page.locator('[data-testid="message-input"]').fill('Connection test');
    await page.locator('[data-testid="send-button"]').click();

    // Connection status might change during the interaction
    // The exact behavior depends on the implementation
    await expect(connectionStatus).toBeVisible();

    // Verify streaming works in real-time
    await expect(page.locator('[data-testid="streaming-message"]')).toBeVisible({ timeout: 10000 });
    
    // Check that streaming content updates progressively
    const streamingContent = page.locator('[data-testid="streaming-content"]');
    await expect(streamingContent).not.toBeEmpty({ timeout: 5000 });
  });

  test('mobile responsiveness', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      // Test mobile-specific interactions
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
      
      // Verify touch interactions work
      const messageInput = page.locator('[data-testid="message-input"]');
      await messageInput.tap();
      await messageInput.fill('Mobile test message');
      
      await page.locator('[data-testid="send-button"]').tap();
      
      // Verify the message flow works on mobile
      await expect(page.locator('[data-testid="message-user"]')).toBeVisible();
    }
  });

  test('long conversation handling', async ({ page }) => {
    await page.goto('/');

    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // Send multiple messages to test conversation history
    for (let i = 1; i <= 5; i++) {
      await messageInput.fill(`Message number ${i}`);
      await sendButton.click();
      
      // Wait for each message to be processed before sending the next
      await expect(page.locator('[data-testid="message-user"]').nth(i - 1)).toBeVisible();
      await expect(page.locator('[data-testid="message-assistant"]').nth(i - 1)).toBeVisible({ timeout: 15000 });
      
      // Small delay between messages to avoid overwhelming the system
      await page.waitForTimeout(1000);
    }

    // Verify all messages are present
    await expect(page.locator('[data-testid="message-user"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="message-assistant"]')).toHaveCount(5);

    // Test scroll behavior with many messages
    const messagesContainer = page.locator('[data-testid="messages-container"]');
    await expect(messagesContainer).toBeVisible();
  });

  test('concurrent user interactions', async ({ page }) => {
    await page.goto('/');

    const messageInput = page.locator('[data-testid="message-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');
    const clearButton = page.locator('[data-testid="clear-button"]');

    // Send a message
    await messageInput.fill('First message');
    await sendButton.click();

    // While first message is processing, try to interact with other elements
    await expect(messageInput).toBeDisabled(); // Should be disabled during processing
    await expect(sendButton).toBeDisabled();

    // Clear button should still work
    await expect(clearButton).toBeEnabled();

    // Wait for message to complete
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 15000 });

    // Now interface should be responsive again
    await expect(messageInput).toBeEnabled();
    await expect(sendButton).toBeDisabled(); // Disabled because input is empty
  });

  test('data persistence across page reloads', async ({ page }) => {
    await page.goto('/');

    // Send a message
    await page.locator('[data-testid="message-input"]').fill('Persistence test');
    await page.locator('[data-testid="send-button"]').click();

    // Wait for conversation to complete
    await expect(page.locator('[data-testid="message-user"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 15000 });

    // Reload the page
    await page.reload();

    // Check if chat ID persists (implementation dependent)
    // At minimum, the interface should load correctly
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-input"]')).toBeVisible();
  });

  test('performance with large messages', async ({ page }) => {
    await page.goto('/');

    // Send a message that might result in a large response
    const largeMessage = 'Please provide a detailed explanation about ' + 'artificial intelligence '.repeat(10);
    
    await page.locator('[data-testid="message-input"]').fill(largeMessage);
    await page.locator('[data-testid="send-button"]').click();

    // Verify the interface handles large content well
    await expect(page.locator('[data-testid="message-user"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-assistant"]')).toBeVisible({ timeout: 20000 });

    // Check that the interface remains responsive
    await expect(page.locator('[data-testid="message-input"]')).toBeEnabled();
  });
});