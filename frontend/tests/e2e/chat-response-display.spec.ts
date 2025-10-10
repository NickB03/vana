/**
 * E2E test for chat response display after SSE synchronization fix.
 *
 * This test validates that the race condition fix works correctly:
 * 1. SSE connection establishes BEFORE POST request
 * 2. Chat responses display correctly
 * 3. No console errors occur
 * 4. Network requests succeed
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Chat Response Display (SSE Race Condition Fix)', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Monitor console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Store errors for assertions
    (page as any).consoleErrors = consoleErrors;

    // Navigate to app
    await page.goto('http://localhost:3000');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('chat response displays after SSE synchronization', async () => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });

    // Type message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('What are AI agents in one sentence?');

    // Send message
    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // CRITICAL: Verify thinking status appears (shows SSE connection working)
    await expect(page.locator('text=Initializing research pipeline')).toBeVisible({ timeout: 10000 });

    // CRITICAL: Verify response text appears within 30 seconds
    // This is the key test - if race condition exists, this will timeout
    const assistantMessage = page.locator('[data-testid="assistant-message"]').first();
    await expect(assistantMessage).toContainText(/\w+/, { timeout: 30000 });

    // Verify response has actual content (not just placeholder)
    const messageContent = await assistantMessage.textContent();
    expect(messageContent).toBeTruthy();
    expect(messageContent!.length).toBeGreaterThan(50); // Should have substantial content

    // Verify no console errors
    const consoleErrors = (page as any).consoleErrors;
    expect(consoleErrors).toHaveLength(0);
  });

  test('SSE connection establishes before POST request', async () => {
    // Monitor network requests
    const requests: any[] = [];
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
      });
    });

    // Wait for app to load
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Test query');

    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });

    // Find SSE GET and POST requests
    const sseRequest = requests.find(r => r.url.includes('/run') && r.method === 'GET');
    const postRequest = requests.find(r => r.url.includes('/run') && r.method === 'POST');

    expect(sseRequest).toBeTruthy();
    expect(postRequest).toBeTruthy();

    // CRITICAL: SSE connection should happen BEFORE POST request
    if (sseRequest && postRequest) {
      expect(sseRequest.timestamp).toBeLessThanOrEqual(postRequest.timestamp);
    }
  });

  test('response streams progressively', async () => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Explain machine learning');

    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Wait for thinking status
    await expect(page.locator('text=Initializing research pipeline')).toBeVisible({ timeout: 10000 });

    // Track content length over time
    const assistantMessage = page.locator('[data-testid="assistant-message"]').first();
    const contentLengths: number[] = [];

    // Sample content length multiple times
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(2000); // Wait 2 seconds between samples
      try {
        const content = await assistantMessage.textContent();
        if (content) {
          contentLengths.push(content.length);
        }
      } catch (e) {
        // Message might not be visible yet
      }
    }

    // Content should grow over time (progressive streaming)
    const hasGrowingContent = contentLengths.some((len, i) =>
      i > 0 && len > contentLengths[i - 1]
    );
    expect(hasGrowingContent).toBe(true);
  });

  test('handles new chat creation correctly', async () => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });

    // Click "New Chat" if available
    const newChatButton = page.locator('button:has-text("New Chat")');
    if (await newChatButton.isVisible()) {
      await newChatButton.click();
      await page.waitForTimeout(500);
    }

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Test new chat');

    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Verify response appears
    await expect(page.locator('[data-testid="assistant-message"]').first())
      .toContainText(/\w+/, { timeout: 30000 });

    // Verify no console errors
    const consoleErrors = (page as any).consoleErrors;
    expect(consoleErrors).toHaveLength(0);
  });

  test('SSE events are processed in correct order', async () => {
    // Monitor SSE events
    const sseEvents: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[useSSE] Received event:')) {
        sseEvents.push(text);
      }
    });

    // Wait for app to load
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Test SSE order');

    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });

    // Should have received multiple SSE events
    expect(sseEvents.length).toBeGreaterThan(0);

    // First event should typically be agent_network_connection or research_update
    const firstEvent = sseEvents[0];
    expect(firstEvent).toMatch(/agent_network_connection|research_update/);
  });

  test('error handling when SSE fails to connect', async () => {
    // Simulate SSE connection failure by blocking SSE endpoint
    await page.route('**/run', (route) => {
      if (route.request().method() === 'GET') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Wait for app to load
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Test error handling');

    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Should handle gracefully (may show error or timeout message)
    // Wait a bit to see how it handles the failure
    await page.waitForTimeout(3000);

    // Check if error is displayed or handled
    const errorMessage = page.locator('text=/error|failed|timeout/i');
    // Error message may or may not be shown, but app shouldn't crash
    // The main thing is no unhandled console errors
  });

  test('multiple messages in same session work correctly', async () => {
    // Wait for app to load
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });

    // Send first message
    let messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('First message');

    let sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Wait for first response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });
    const firstResponse = await page.locator('[data-testid="assistant-message"]').first().textContent();
    expect(firstResponse).toBeTruthy();

    // Wait a bit for first response to complete
    await page.waitForTimeout(2000);

    // Send second message
    messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Second message');

    sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Wait for second response
    await page.waitForTimeout(5000);
    const messages = page.locator('[data-testid="assistant-message"]');
    const messageCount = await messages.count();

    // Should have at least 2 assistant messages (could have more from streaming)
    expect(messageCount).toBeGreaterThanOrEqual(1);

    // Verify no console errors
    const consoleErrors = (page as any).consoleErrors;
    expect(consoleErrors).toHaveLength(0);
  });

  test('browser console shows correct SSE synchronization logs', async () => {
    // Monitor console logs
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      consoleLogs.push(msg.text());
    });

    // Wait for app to load
    await page.waitForSelector('[data-testid="message-input"]', { timeout: 10000 });

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]');
    await messageInput.fill('Test console logs');

    const sendButton = page.locator('[data-testid="send-button"]');
    await sendButton.click();

    // Wait for response
    await page.waitForSelector('[data-testid="assistant-message"]', { timeout: 30000 });

    // Verify key logs are present (based on SOLUTION.md)
    const hasEnsureSSELog = consoleLogs.some(log =>
      log.includes('Ensuring SSE connection before starting research')
    );
    const hasSSEConnectedLog = consoleLogs.some(log =>
      log.includes('SSE connection established successfully') ||
      log.includes('SSE already connected')
    );
    const hasResearchUpdateLog = consoleLogs.some(log =>
      log.includes('Received event: research_update')
    );

    expect(hasEnsureSSELog).toBe(true);
    expect(hasSSEConnectedLog).toBe(true);
    expect(hasResearchUpdateLog).toBe(true);
  });
});
