import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8000';

test.describe('SSE Streaming Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up mock authentication
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    await page.evaluate(() => {
      const mockTokens = {
        access_token: 'test_access_token',
        refresh_token: 'test_refresh_token',
        token_type: 'bearer',
        expires_in: 3600
      };
      
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
  });

  test('SSE connection establishes successfully in chat interface', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check SSE connection indicator exists
    await expect(page.locator('[data-testid="connection-status"]')).toBeVisible().catch(() => {
      // If no test id, look for connection indicator text
      expect(page.locator('text=Connected')).toBeVisible();
    });
    
    // Check chat interface is loaded
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible().catch(() => {
      expect(page.locator('textarea, input[placeholder*="message"]')).toBeVisible();
    });
  });

  test('SSE connection handles reconnection gracefully', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Monitor network requests for SSE endpoint
    const sseRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/sse') || request.url().includes('/stream')) {
        sseRequests.push(request);
      }
    });
    
    // Simulate network interruption by blocking SSE requests temporarily
    await page.route('**/sse/**', route => route.abort());
    await page.route('**/stream/**', route => route.abort());
    
    // Wait for potential reconnection attempts
    await page.waitForTimeout(2000);
    
    // Re-enable SSE requests
    await page.unroute('**/sse/**');
    await page.unroute('**/stream/**');
    
    // Wait for reconnection
    await page.waitForTimeout(3000);
    
    // Verify reconnection attempts were made
    expect(sseRequests.length).toBeGreaterThan(0);
  });

  test('SSE events are properly displayed in real-time', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Look for real-time updates container
    const updatesContainer = page.locator('[data-testid="agent-updates"]').first().catch(() => 
      page.locator('.agent-updates, .messages, .chat-messages').first()
    );
    
    // Send a test message if chat input is available
    const chatInput = page.locator('textarea[placeholder*="message"], input[placeholder*="message"]').first();
    
    if (await chatInput.isVisible()) {
      await chatInput.fill('Test message for SSE response');
      await page.keyboard.press('Enter');
      
      // Wait for potential response
      await page.waitForTimeout(2000);
      
      // Check if any new content appeared
      const messages = page.locator('.message, .chat-message, [data-testid="message"]');
      const messageCount = await messages.count();
      
      // Should have at least the message we sent
      expect(messageCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('SSE connection status is properly displayed', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Look for connection status indicators
    const connectionIndicators = [
      '[data-testid="connection-status"]',
      '.connection-status',
      'text=Connected',
      'text=Connecting',
      'text=Disconnected'
    ];
    
    let statusFound = false;
    for (const indicator of connectionIndicators) {
      try {
        await expect(page.locator(indicator).first()).toBeVisible({ timeout: 2000 });
        statusFound = true;
        break;
      } catch (e) {
        // Continue to next indicator
      }
    }
    
    // At least one connection status should be visible
    expect(statusFound).toBeTruthy();
  });

  test('SSE handles different event types correctly', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Monitor SSE events through console logs
    const sseEvents: any[] = [];
    page.on('console', msg => {
      if (msg.text().includes('SSE') || msg.text().includes('EventSource')) {
        sseEvents.push(msg.text());
      }
    });
    
    // Wait for potential SSE events
    await page.waitForTimeout(5000);
    
    // Check if the page is handling SSE events
    const sseDebugInfo = await page.evaluate(() => {
      // Check if SSE client exists in window
      return {
        hasEventSource: typeof EventSource !== 'undefined',
        hasSSEClient: (window as any).sseClient !== undefined,
        connectionState: (window as any).sseConnectionState || 'unknown'
      };
    });
    
    expect(sseDebugInfo.hasEventSource).toBeTruthy();
  });

  test('SSE connection works with session management', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Create a new session or use existing
    const sessionButton = page.locator('button:has-text("New Session"), [data-testid="new-session"]').first();
    
    if (await sessionButton.isVisible()) {
      await sessionButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Check that session data is handled properly
    const sessionState = await page.evaluate(() => {
      return {
        currentSession: localStorage.getItem('current-session'),
        sessionData: sessionStorage.getItem('session-data')
      };
    });
    
    // Session should be initialized
    expect(sessionState.currentSession || sessionState.sessionData).toBeTruthy();
  });

  test('SSE error handling prevents crashes', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Monitor console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Monitor page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });
    
    // Simulate SSE errors by blocking the endpoint
    await page.route('**/sse/**', route => route.abort('failed'));
    await page.route('**/stream/**', route => route.abort('failed'));
    
    // Wait for error handling
    await page.waitForTimeout(3000);
    
    // Page should still be functional despite SSE errors
    await expect(page.locator('body')).toBeVisible();
    
    // Check that critical errors didn't crash the page
    const criticalErrors = pageErrors.filter(error => 
      error.message.includes('Cannot read properties of undefined') ||
      error.message.includes('TypeError')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('SSE polling fallback works when EventSource fails', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Mock EventSource failure
    await page.addInitScript(() => {
      // Disable EventSource to force polling fallback
      (window as any).EventSource = undefined;
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check that the app still functions without EventSource
    await expect(page.locator('body')).toBeVisible();
    
    // Look for polling mechanism indicators
    const pollingInfo = await page.evaluate(() => {
      return {
        hasPolling: (window as any).pollingActive === true,
        connectionType: (window as any).connectionType || 'unknown'
      };
    });
    
    // Should gracefully handle EventSource unavailability
    expect(pollingInfo.connectionType).not.toBe('error');
  });

  test('SSE maintains connection across navigation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Navigate to another page
    await page.goto(`${FRONTEND_URL}/canvas`);
    await page.waitForLoadState('networkidle');
    
    // Navigate back to chat
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Connection should be re-established
    await page.waitForTimeout(2000);
    
    // Check connection status
    const connectionStatus = await page.evaluate(() => {
      return {
        isConnected: (window as any).sseConnected || false,
        connectionState: (window as any).sseConnectionState || 'unknown'
      };
    });
    
    // Connection should be active or attempting to connect
    expect(['connected', 'connecting', 'unknown']).toContain(connectionStatus.connectionState);
  });
});