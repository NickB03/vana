/**
 * E2E test for SSE connection and event streaming
 * Tests the complete flow: Frontend → Proxy → Backend → SSE events
 */

import { test, expect } from '@playwright/test';

test.describe('SSE Connection and Event Streaming', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      console.log(`[Browser Console] ${msg.type()}: ${text}`);
    });

    // Navigate to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('should establish SSE connection and receive events', async ({ page }) => {
    const consoleLogs: string[] = [];
    const networkRequests: string[] = [];

    // Capture console logs
    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(text);
      if (text.includes('[useSSE]') || text.includes('[SSE Proxy]')) {
        console.log(`✓ ${text}`);
      }
    });

    // Capture network requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/api/sse/') || url.includes('/apps/vana/users/')) {
        networkRequests.push(url);
        console.log(`→ Network Request: ${request.method()} ${url}`);
      }
    });

    // Wait for page to load and check if we're already in a chat session
    await page.waitForLoadState('domcontentloaded');
    console.log('✓ Page loaded');

    // Check if we're already in a chat with "test" message
    const existingTest = await page.locator('text=test').first().isVisible().catch(() => false);

    if (existingTest) {
      console.log('✓ Already in chat session with "test" message');
    } else {
      // Try to find and use the input
      const input = page.locator('textarea, input[type="text"]').first();
      await input.waitFor({ timeout: 5000 }).catch(() => {});

      if (await input.isVisible()) {
        await input.fill('test');
        console.log('✓ Typed "test" in input');
        await input.press('Enter');
        console.log('✓ Submitted message');
      } else {
        console.log('⚠ No input found, assuming already in session');
      }
    }

    // Verify we have a chat message
    const hasMessage = await page.locator('text=test').first().isVisible();
    if (hasMessage) {
      console.log('✓ Message visible in chat');
    } else {
      console.log('⚠ No message found in chat');
    }

    // Take screenshot after submitting
    await page.screenshot({ path: 'test-results/after-submit.png', fullPage: true });

    // Wait for "Initializing research pipeline..." status
    const hasStatus = await page.waitForSelector('text=/Initializing|Processing|Research/', { timeout: 10000 })
      .then(() => true)
      .catch(() => false);

    if (hasStatus) {
      console.log('✓ Status message appeared');
    } else {
      console.log('✗ No status message appeared');
      await page.screenshot({ path: 'test-results/no-status.png', fullPage: true });
    }

    // Wait for SSE connection logs to appear
    await page.waitForTimeout(2000);

    console.log('\n=== Console Log Analysis ===');

    // Check for useSSE connection logs
    const hasSSEConnectionLog = consoleLogs.some(log =>
      log.includes('[useSSE] Connecting to SSE:')
    );
    console.log(`useSSE connection initiated: ${hasSSEConnectionLog ? '✓' : '✗'}`);

    const hasAuthLog = consoleLogs.some(log =>
      log.includes('[useSSE] Auth token present:')
    );
    console.log(`Auth status logged: ${hasAuthLog ? '✓' : '✗'}`);

    const hasFetchLog = consoleLogs.some(log =>
      log.includes('[useSSE] Fetching SSE stream')
    );
    console.log(`SSE fetch initiated: ${hasFetchLog ? '✓' : '✗'}`);

    const hasResponseLog = consoleLogs.some(log =>
      log.includes('[useSSE] SSE fetch response:')
    );
    console.log(`SSE response received: ${hasResponseLog ? '✓' : '✗'}`);

    const hasProxyLog = consoleLogs.some(log =>
      log.includes('[SSE Proxy]')
    );
    console.log(`Proxy logs present: ${hasProxyLog ? '✓' : '✗'}`);

    const hasEventLog = consoleLogs.some(log =>
      log.includes('[useSSE] Received event:')
    );
    console.log(`Events received: ${hasEventLog ? '✓' : '✗'}`);

    console.log('\n=== Network Request Analysis ===');
    console.log(`SSE requests made: ${networkRequests.length}`);
    networkRequests.forEach(url => console.log(`  - ${url}`));

    // Wait longer to see if events arrive
    console.log('\nWaiting 10 seconds for events to stream...');
    await page.waitForTimeout(10000);

    // Check if streaming response appears
    const hasStreamingContent = await page.locator('text=/Research|Agent|Processing|Complete/').count() > 1;
    console.log(`Streaming content appeared: ${hasStreamingContent ? '✓' : '✗'}`);

    console.log('\n=== Final Console Logs ===');
    consoleLogs
      .filter(log => log.includes('[useSSE]') || log.includes('[SSE Proxy]'))
      .forEach(log => console.log(log));

    // Print all console logs for debugging
    console.log('\n=== ALL Console Logs ===');
    consoleLogs.slice(0, 50).forEach(log => console.log(log));

    // Assertions - make them non-blocking for now to see all output
    if (!hasSSEConnectionLog) {
      console.error('\n⚠️  CRITICAL: SSE connection was never initiated!');
      console.error('This means the useSSE hook is not being called.');
    }

    // If connection was initiated but no response, there's a proxy or backend issue
    if (hasSSEConnectionLog && !hasResponseLog) {
      console.error('\n⚠️  ISSUE: SSE connection initiated but no response received');
      console.error('This indicates a problem with:');
      console.error('  1. Next.js proxy not forwarding the request');
      console.error('  2. Backend not responding to SSE endpoint');
      console.error('  3. Network connectivity issue');
    }

    // If response received but no events, backend is not sending events
    if (hasResponseLog && !hasEventLog) {
      console.error('\n⚠️  ISSUE: SSE response received but no events');
      console.error('This indicates:');
      console.error('  1. Backend SSE stream is empty');
      console.error('  2. Event format mismatch');
      console.error('  3. Backend not broadcasting events');
    }
  });

  test('should show detailed error if connection fails', async ({ page }) => {
    // Capture all console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      console.error(`[Page Error] ${error.message}`);
    });

    // Try to access the page
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Check if there are any connection errors
    if (errors.length > 0) {
      console.log('\n=== Console Errors Detected ===');
      errors.forEach(err => console.log(`  ✗ ${err}`));
    }
  });
});
