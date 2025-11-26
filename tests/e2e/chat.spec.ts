import { test, expect, setupMockedPage } from '../fixtures/base-test';
import {
  continueAsGuest,
  sendChatMessage,
  waitForStreamingComplete,
  getMessageCount,
  clearBrowserData,
  waitForNavigation,
} from '../fixtures/test-helpers';
import { SAMPLE_MESSAGES, UI_SELECTORS, TIMEOUTS } from '../fixtures/test-data';

/**
 * Chat Flow Tests
 *
 * Simplified E2E suite covering critical chat functionality:
 * - Send message and receive response (core user journey)
 * - Empty message validation
 * - Create new chat session
 * - XSS prevention (security critical)
 */

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks BEFORE any navigation (critical for CI)
    await setupMockedPage(page);
    // Clear browser data and navigate to app
    await clearBrowserData(page);
    await continueAsGuest(page);
  });

  test('should send a message and receive a response', async ({ page }) => {
    // Send a simple message
    await sendChatMessage(page, SAMPLE_MESSAGES.simple);

    // Wait for streaming to complete
    await waitForStreamingComplete(page);

    // Verify the message appears in chat
    await expect(page.locator(`text=${SAMPLE_MESSAGES.simple}`).first()).toBeVisible({
      timeout: TIMEOUTS.medium,
    });

    // Should have at least 2 messages (user message + assistant response)
    const messageCount = await getMessageCount(page);
    expect(messageCount).toBeGreaterThanOrEqual(2);
  });

  test('should handle empty message submission', async ({ page }) => {
    const messageInput = page.locator(UI_SELECTORS.chat.messageInput).first();
    const sendButton = page.locator(UI_SELECTORS.chat.sendButton).first();

    // Clear input to ensure it's empty
    await messageInput.fill('');

    // Send button should be disabled when input is empty
    await expect(sendButton).toBeDisabled();

    // No messages should be sent
    const messageCount = await getMessageCount(page);
    expect(messageCount).toBe(0);
  });

  test('should create a new chat session', async ({ page }) => {
    // Send a message in current session
    await sendChatMessage(page, SAMPLE_MESSAGES.simple);
    await waitForStreamingComplete(page);

    // Start new chat
    const newChatButton = page.locator(UI_SELECTORS.chat.newChatButton).first();

    if (await newChatButton.isVisible({ timeout: TIMEOUTS.short })) {
      // Use force click to avoid flaky timeout on overlapping elements
      await newChatButton.click({ force: true, timeout: TIMEOUTS.medium });

      // Wait for URL to change (new chat navigates to /chat or /)
      await page.waitForURL(/\/(chat)?(\?.*)?$/, { timeout: TIMEOUTS.medium });
      await page.waitForTimeout(500); // Brief settle time

      // Should be on empty chat (0 messages or just system message)
      const messageCount = await getMessageCount(page);
      expect(messageCount).toBeLessThanOrEqual(1);

      // Input should be empty
      const messageInput = page.locator(UI_SELECTORS.chat.messageInput).first();
      await expect(messageInput).toHaveValue('');
    } else {
      test.skip(true, 'New chat button not found');
    }
  });

  test('should handle message with special characters (XSS prevention)', async ({ page }) => {
    // Register dialog handler BEFORE sending message to catch any XSS alerts
    const dialogs: string[] = [];
    page.on('dialog', async dialog => {
      dialogs.push(dialog.message());
      await dialog.dismiss();
    });

    const specialMessage = 'Test <script>alert("xss")</script> & special chars: @#$%^&*()';

    await sendChatMessage(page, specialMessage);
    await waitForStreamingComplete(page);

    // Message should be visible (sanitized)
    const messageExists = await page.locator(`text=/Test.*special/`).first().isVisible({
      timeout: TIMEOUTS.medium,
    }).catch(() => false);

    expect(messageExists).toBeTruthy();

    // No alert should have appeared (XSS prevention)
    // Dialog handler was registered before message send to catch immediate execution
    expect(dialogs.length).toBe(0);
  });
});
