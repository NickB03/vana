import { test, expect } from '@playwright/test';

/**
 * Integration Testing for User Workflow
 * 
 * This test suite validates the integration between frontend
 * and backend components throughout the user workflow.
 */

const API_BASE_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3000';

test.describe('Integration Workflow Tests', () => {
  let authToken: string;

  test.beforeEach(async ({ page }) => {
    // Set up authentication if needed
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Wait for chat interface to be ready
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
  });

  test('Frontend-Backend authentication flow', async ({ page }) => {
    // Test authentication integration
    const loginRequest = page.waitForRequest('**/auth/login');
    
    // If login form exists, test the flow
    const loginButton = page.locator('[data-testid="login-button"]');
    if (await loginButton.isVisible()) {
      // Fill login form
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'testpassword');
      await loginButton.click();
      
      // Wait for login request
      const request = await loginRequest;
      expect(request.url()).toContain('/auth/login');
      expect(request.method()).toBe('POST');
      
      // Verify successful authentication
      await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test('Chat message API integration', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();
    
    // Monitor API requests
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('/api/') || request.url().includes('localhost:8000')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });
    
    // Monitor API responses
    const apiResponses: any[] = [];
    page.on('response', response => {
      if (response.url().includes('/api/') || response.url().includes('localhost:8000')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });
    
    // Submit a message
    await chatInput.fill('Integration test message for API');
    await chatInput.press('Enter');
    
    // Verify message appears in UI
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Integration test message for API');
    
    // Wait a moment for API calls
    await page.waitForTimeout(2000);
    
    // Verify API integration
    console.log('API Requests:', apiRequests);
    console.log('API Responses:', apiResponses);
    
    // Should have made requests to backend
    expect(apiRequests.length).toBeGreaterThan(0);
    
    // Check for successful responses
    const successfulResponses = apiResponses.filter(res => res.status >= 200 && res.status < 400);
    expect(successfulResponses.length).toBeGreaterThan(0);
  });

  test('SSE (Server-Sent Events) integration', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    // Monitor network for SSE connections
    const sseConnections: any[] = [];
    page.on('response', response => {
      if (response.headers()['content-type']?.includes('text/event-stream') ||
          response.url().includes('/api/run_sse/')) {
        sseConnections.push({
          url: response.url(),
          status: response.status(),
          headers: response.headers()
        });
      }
    });
    
    // Submit message that should trigger SSE
    await chatInput.fill('Test SSE streaming integration');
    await chatInput.press('Enter');
    
    // Wait for research plan (first step in workflow)
    await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
    
    // Approve the plan to start SSE streaming
    await page.locator('[data-testid="approve-button"]').click();
    
    // Wait for agent response to start streaming
    await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 30000 });
    
    // Wait a bit longer to capture SSE activity
    await page.waitForTimeout(5000);
    
    console.log('SSE Connections:', sseConnections);
    
    // Verify SSE connection was established
    expect(sseConnections.length).toBeGreaterThan(0);
    
    // Verify streaming content appears incrementally
    const agentResponse = page.locator('[data-testid="agent-response"]').last();
    const responseText = await agentResponse.textContent();
    
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(10); // Some content streamed
  });

  test('Research workflow API integration', async ({ page }) => {
    let researchApiCalled = false;
    let researchSessionId = '';
    
    // Monitor for research API calls
    page.on('request', request => {
      if (request.url().includes('/api/run_sse/research_')) {
        researchApiCalled = true;
        const urlParts = request.url().split('/');
        researchSessionId = urlParts[urlParts.length - 1];
        console.log('Research API called with session ID:', researchSessionId);
      }
    });
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Research API integration test - analyze climate change impacts');
    await chatInput.press('Enter');
    
    // Wait for research plan
    await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
    
    // Verify research API was called for plan generation
    expect(researchApiCalled).toBeTruthy();
    expect(researchSessionId).toBeTruthy();
    
    // Approve and continue workflow
    await page.locator('[data-testid="approve-button"]').click();
    
    // Monitor agent status updates
    const agentCard = page.locator('[data-testid="agent-status-card"]');
    if (await agentCard.isVisible({ timeout: 10000 })) {
      // Verify agent status updates
      await expect(agentCard).toContainText(/Processing|Analyzing|Researching/i);
    }
    
    // Wait for final response
    await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout: 45000 });
    
    const finalResponse = page.locator('[data-testid="agent-response"]').last();
    const responseText = await finalResponse.textContent();
    
    // Verify meaningful research content
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(100);
    expect(responseText).toMatch(/climate|impact|research|analysis/i);
  });

  test('Error handling integration', async ({ page }) => {
    // Test various error scenarios
    
    // 1. Network timeout
    await page.route('**/api/run_sse/**', route => {
      // Delay response to simulate timeout
      setTimeout(() => route.fulfill({
        status: 408,
        body: 'Request Timeout'
      }), 10000);
    });
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Test timeout error handling');
    await chatInput.press('Enter');
    
    // Should show error message or graceful fallback
    await expect(
      page.locator('[data-testid="error-message"], [data-testid="timeout-error"], [data-testid="retry-button"]')
    ).toBeVisible({ timeout: 15000 });
    
    // Clear route override
    await page.unroute('**/api/run_sse/**');
    
    // 2. Test server error handling
    await page.route('**/api/run_sse/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
        headers: { 'Content-Type': 'application/json' }
      });
    });
    
    await chatInput.fill('Test server error handling');
    await chatInput.press('Enter');
    
    // Should handle server error gracefully
    await expect(
      page.locator('[data-testid="error-message"], [data-testid="server-error"]')
    ).toBeVisible({ timeout: 10000 });
    
    await page.unroute('**/api/run_sse/**');
  });

  test('Real-time updates integration', async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Test real-time updates integration');
    await chatInput.press('Enter');
    
    // Wait for research plan
    await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
    await page.locator('[data-testid="approve-button"]').click();
    
    // Monitor for real-time updates
    const agentCard = page.locator('[data-testid="agent-status-card"]');
    if (await agentCard.isVisible({ timeout: 10000 })) {
      // Check that status updates in real-time
      const initialStatus = await agentCard.textContent();
      console.log('Initial agent status:', initialStatus);
      
      // Wait for status to change
      await page.waitForFunction(
        (card, initial) => {
          const current = card.textContent();
          return current !== initial;
        },
        agentCard,
        initialStatus,
        { timeout: 15000 }
      );
      
      const updatedStatus = await agentCard.textContent();
      console.log('Updated agent status:', updatedStatus);
      
      expect(updatedStatus).not.toBe(initialStatus);
    }
    
    // Verify streaming content updates
    const agentResponse = page.locator('[data-testid="agent-response"]');
    await expect(agentResponse).toBeVisible({ timeout: 30000 });
    
    // Check for incremental content updates
    let previousLength = 0;
    let contentGrowing = false;
    
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(2000);
      const currentText = await agentResponse.textContent() || '';
      
      if (currentText.length > previousLength) {
        contentGrowing = true;
        console.log(`Content length increased: ${previousLength} -> ${currentText.length}`);
      }
      
      previousLength = currentText.length;
    }
    
    // Content should grow over time (streaming)
    expect(contentGrowing).toBeTruthy();
  });

  test('State management integration', async ({ page }) => {
    // Test that state persists across interactions
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    // First interaction
    await chatInput.fill('First state test message');
    await chatInput.press('Enter');
    
    await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
    
    // Second interaction
    await chatInput.fill('Second state test message');
    await chatInput.press('Enter');
    
    await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Second state test message');
    
    // Verify both messages persist in state
    const allUserMessages = page.locator('[data-testid="user-message"]');
    const messageCount = await allUserMessages.count();
    
    expect(messageCount).toBeGreaterThanOrEqual(2);
    
    // Verify messages maintain order
    const firstMessage = await allUserMessages.first().textContent();
    const lastMessage = await allUserMessages.last().textContent();
    
    expect(firstMessage).toContain('First state test message');
    expect(lastMessage).toContain('Second state test message');
  });

  test('Cross-browser compatibility', async ({ browserName, page }) => {
    console.log(`Testing integration on: ${browserName}`);
    
    // Test basic workflow across different browsers
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible();
    
    await chatInput.fill(`Cross-browser test on ${browserName}`);
    await chatInput.press('Enter');
    
    // Verify message appears
    await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
    
    // Test that research plan works across browsers
    await expect(page.locator('[data-testid="agent-research-plan"]')).toBeVisible({ timeout: 15000 });
    
    const researchPlan = page.locator('[data-testid="agent-research-plan"]');
    await expect(researchPlan).toContainText('Research Plan');
    
    // Test interaction works
    await page.locator('[data-testid="approve-button"]').click();
    
    // Different browsers might have slightly different timing
    const timeout = browserName === 'webkit' ? 45000 : 30000;
    await expect(page.locator('[data-testid="agent-response"]')).toBeVisible({ timeout });
    
    console.log(`${browserName} integration test completed successfully`);
  });

  test('API versioning and compatibility', async ({ page }) => {
    // Test that frontend works with current API version
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    // Monitor API version headers
    let apiVersion = '';
    page.on('response', response => {
      const version = response.headers()['api-version'] || response.headers()['x-api-version'];
      if (version) {
        apiVersion = version;
      }
    });
    
    await chatInput.fill('API version compatibility test');
    await chatInput.press('Enter');
    
    // Wait for API calls
    await page.waitForTimeout(3000);
    
    if (apiVersion) {
      console.log('API Version detected:', apiVersion);
    }
    
    // Verify workflow still works regardless of API version
    await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
  });
});

test.describe('Database Integration Tests', () => {
  test('Data persistence integration', async ({ page }) => {
    // Test that user data persists through the workflow
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
    
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Data persistence test message');
    await chatInput.press('Enter');
    
    // Verify message persists after page reload
    await page.reload();
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
    
    // Check if message history is maintained
    const messageHistory = page.locator('[data-testid="user-message"]');
    if (await messageHistory.first().isVisible({ timeout: 5000 })) {
      const messageText = await messageHistory.first().textContent();
      expect(messageText).toContain('Data persistence test message');
    }
  });

  test('Session management integration', async ({ page, context }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
    
    // Start a workflow
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.fill('Session management test');
    await chatInput.press('Enter');
    
    await expect(page.locator('[data-testid="user-message"]').last()).toBeVisible();
    
    // Open new tab with same session
    const newPage = await context.newPage();
    await newPage.goto(`${FRONTEND_URL}/chat`);
    await newPage.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
    
    // Check if session state is shared
    const messageInNewTab = newPage.locator('[data-testid="user-message"]');
    if (await messageInNewTab.first().isVisible({ timeout: 5000 })) {
      const messageText = await messageInNewTab.first().textContent();
      expect(messageText).toContain('Session management test');
    }
    
    await newPage.close();
  });
});