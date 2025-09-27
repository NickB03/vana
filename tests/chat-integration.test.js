const { test, expect } = require('@playwright/test');

test.describe('Chat Integration Test', () => {
  test('should connect frontend to backend and receive real responses', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Wait for the home page to load
    await expect(page.getByTestId('vana-home-page')).toBeVisible({ timeout: 10000 });

    // Find and click on a capability suggestion or type in the input
    const promptInput = page.locator('textarea[placeholder*="What can I help"]');
    await expect(promptInput).toBeVisible();

    // Type a test prompt
    const testPrompt = 'Hello, can you help me understand how Vana works?';
    await promptInput.fill(testPrompt);

    // Submit the prompt by clicking the send button
    const sendButton = page.locator('button[aria-label*="Send"], button:has(svg)').last();
    await sendButton.click();

    // Wait for navigation to chat view
    await expect(page.locator('[role="log"]')).toBeVisible({ timeout: 5000 });

    // Verify that the user message appears in the chat
    const userMessage = page.locator('[role="log"]').getByText(testPrompt);
    await expect(userMessage).toBeVisible({ timeout: 5000 });

    // Wait for the assistant response to start streaming
    // Look for any of the following indicators:
    // - "Initializing research pipeline..."
    // - "Research session acknowledged..."
    // - Progress indicators
    // - Actual response content
    const assistantResponse = page.locator('[role="log"] >> text=/Initializing|Research|Processing|I received/i');
    await expect(assistantResponse).toBeVisible({ timeout: 15000 });

    // Verify SSE connection is established
    // Check browser console for SSE connection logs
    page.on('console', msg => {
      if (msg.text().includes('EventSource') || msg.text().includes('SSE')) {
        console.log('SSE Log:', msg.text());
      }
    });

    // Wait a bit to see if streaming continues
    await page.waitForTimeout(3000);

    // Check if there's actual content beyond the initial message
    const responseContent = await page.locator('[role="log"]').textContent();
    expect(responseContent).toBeTruthy();
    expect(responseContent.length).toBeGreaterThan(100); // Should have substantial content

    // Verify no mock response indicators
    expect(responseContent).not.toContain('Mock response');
    expect(responseContent).not.toContain('This is a simulated');

    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/chat-integration-result.png', fullPage: true });

    console.log('✅ Chat integration test passed! Frontend is properly connected to backend.');
  });

  test('should handle SSE streaming events', async ({ page }) => {
    // Enable request interception to monitor SSE connections
    const sseConnections = [];

    page.on('response', response => {
      const url = response.url();
      const contentType = response.headers()['content-type'] || '';

      if (url.includes('/api/sse/') || contentType.includes('text/event-stream')) {
        sseConnections.push({
          url,
          status: response.status(),
          contentType
        });
      }
    });

    // Navigate to the app
    await page.goto('http://localhost:3000');

    // Submit a chat message
    const promptInput = page.locator('textarea[placeholder*="What can I help"]');
    await promptInput.fill('Test SSE streaming');

    const sendButton = page.locator('button:has(svg)').last();
    await sendButton.click();

    // Wait for chat view
    await page.waitForTimeout(5000);

    // Verify SSE connections were made
    expect(sseConnections.length).toBeGreaterThan(0);

    // Check that SSE connections returned success status
    const successfulSSE = sseConnections.filter(conn => conn.status === 200);
    expect(successfulSSE.length).toBeGreaterThan(0);

    console.log('SSE Connections detected:', sseConnections);
  });

  test('should maintain chat session state', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Send first message
    const promptInput = page.locator('textarea[placeholder*="What can I help"]');
    await promptInput.fill('First message');
    await page.locator('button:has(svg)').last().click();

    // Wait for response
    await page.waitForTimeout(3000);

    // Send second message
    const chatInput = page.locator('textarea[placeholder="Ask anything"]');
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Second message');
    await page.locator('button:has(svg)').last().click();

    // Verify both messages are in the chat history
    await expect(page.getByText('First message')).toBeVisible();
    await expect(page.getByText('Second message')).toBeVisible();

    // Verify session is maintained
    const messages = await page.locator('[role="log"]').locator('div').count();
    expect(messages).toBeGreaterThanOrEqual(4); // At least 2 user + 2 assistant messages
  });
});