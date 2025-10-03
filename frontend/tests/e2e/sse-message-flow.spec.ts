import { test, expect } from '@playwright/test';

/**
 * Test SSE connection establishes after sending a message
 */
test('SSE connection establishes after sending message', async ({ page }) => {
  // Array to collect console logs
  const consoleLogs: string[] = [];

  // Listen to console messages
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log('BROWSER:', text);
  });

  // Navigate to homepage
  await page.goto('http://localhost:3000');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Check if we're on home page (no input visible) and need to start a new chat
  const promptSuggestions = page.locator('text=Start researching').first();
  if (await promptSuggestions.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking prompt suggestion to start chat...');
    await promptSuggestions.click();
  } else {
    // Try clicking "New Chat" button if visible
    const newChatButton = page.locator('button:has-text("New Chat")').first();
    if (await newChatButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('Clicking New Chat button...');
      await newChatButton.click();
    }
  }

  // Find and fill input field
  const input = page.getByPlaceholder('Ask anything');
  await input.waitFor({ state: 'visible', timeout: 5000 });
  await input.fill('test message');

  // Find and click submit button
  const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has(svg)').last();
  await submitButton.click();

  // Wait for logs that indicate SSE connection attempt
  await page.waitForTimeout(2000);

  // Check console logs
  console.log('\n=== ALL CONSOLE LOGS ===');
  consoleLogs.forEach(log => console.log(log));
  console.log('=== END LOGS ===\n');

  // Verify key log statements appear
  const hasSessionCreated = consoleLogs.some(log =>
    log.includes('currentSessionId') && !log.includes('null')
  );

  const hasSSEEnabled = consoleLogs.some(log =>
    log.includes('enabled: true') || log.includes('"enabled":true')
  );

  const hasSSEConnect = consoleLogs.some(log =>
    log.includes('[useSSE] connect()') || log.includes('Connecting to SSE')
  );

  // Log findings
  console.log('\nTest Results:');
  console.log('- Session created:', hasSessionCreated);
  console.log('- SSE enabled:', hasSSEEnabled);
  console.log('- SSE connect called:', hasSSEConnect);

  // Assert SSE connection was attempted
  expect(hasSessionCreated, 'Session should be created with non-null ID').toBe(true);
  expect(hasSSEEnabled, 'SSE should be enabled after session creation').toBe(true);
  expect(hasSSEConnect, 'SSE connect() should be called').toBe(true);

  // Verify SSE connection established successfully
  const hasSSEConnected = consoleLogs.some(log =>
    log.includes('SSE connection established successfully')
  );
  expect(hasSSEConnected, 'SSE connection should be established').toBe(true);

  // Verify no SSE blocking messages after fix
  const hasSSEBlocked = consoleLogs.some(log => log.includes('connect() blocked'));
  expect(hasSSEBlocked, 'SSE should not be blocked after mountedRef fix').toBe(false);
});
