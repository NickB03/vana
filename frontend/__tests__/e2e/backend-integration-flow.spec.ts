/**
 * End-to-End Backend Integration Flow Tests
 * 
 * Tests complete user workflows from login to research streaming.
 * Validates the entire application stack working together.
 */

import { test, expect, type Page } from '@playwright/test';
import { E2E_USER } from '../constants/test-config';
import { testUtils } from '../integration/api-client-backend.test';

// Test configuration
const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:3002';
const TEST_TIMEOUT = 60000;

// Test data
const TEST_USER = {
  email: 'test@vana.ai',
  password: E2E_USER.password,
  fullName: 'E2E Test User'
};

test.describe('Backend Integration E2E Flow', () => {
  test.beforeAll(async () => {
    // Verify both backend and frontend are running
    const backendReady = await testUtils.waitForBackend();
    if (!backendReady) {
      throw new Error('Backend server must be running on http://localhost:8000');
    }

    try {
      await fetch(FRONTEND_URL);
    } catch {
      throw new Error('Frontend server must be running on http://localhost:3002');
    }
  });

  test('Complete user workflow: registration → login → research streaming', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);

    // Step 1: Navigate to application
    await page.goto(FRONTEND_URL);
    await expect(page).toHaveTitle(/Vana/i);

    // Step 2: Register new user
    await page.click('a[href="/register"]');
    await expect(page).toHaveURL(/\/register/);
    
    await page.fill('input[name="fullName"]', TEST_USER.fullName);
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.fill('input[name="confirmPassword"]', TEST_USER.password);
    
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard or login on successful registration
    await page.waitForURL(/\/(?:login|$)/, { timeout: 10000 });

    // Step 3: Login if redirected to login page
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await page.fill('input[name="email"]', TEST_USER.email);
      await page.fill('input[name="password"]', TEST_USER.password);
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/\/(?!login|register)/, { timeout: 10000 });
    }

    // Step 4: Verify authenticated state
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    
    // Step 5: Test chat/research functionality
    const testMessage = 'Hello, this is an E2E integration test message';
    
    // Find chat input (may be in different locations depending on design)
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await expect(chatInput).toBeVisible();
    
    await chatInput.fill(testMessage);
    await page.keyboard.press('Enter');
    
    // Step 6: Verify streaming response
    // Look for streaming message indicators
    await expect(page.locator('[data-testid="streaming-message"], .streaming, .loading')).toBeVisible({ timeout: 5000 });
    
    // Wait for response to complete
    await expect(page.locator('[data-testid="message-content"]').first()).toBeVisible({ timeout: 30000 });
    
    // Step 7: Verify message was processed
    const messageContent = await page.locator('[data-testid="message-content"]').first().textContent();
    expect(messageContent).toBeTruthy();
    expect(messageContent!.length).toBeGreaterThan(0);
  });

  test('API health check integration', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Test direct API call from frontend
    const healthResponse = await page.evaluate(async () => {
      const response = await fetch('http://localhost:8000/health');
      return await response.json();
    });
    
    expect(healthResponse.status).toBe('healthy');
    expect(healthResponse.service).toBe('vana');
  });

  test('Authentication flow with backend validation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);
    
    // Test invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"], .error, [role="alert"]')).toBeVisible();
    
    // Test valid credentials (if user exists)
    await page.fill('input[name="email"]', TEST_USER.email);
    await page.fill('input[name="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    // Should either succeed or show appropriate error
    try {
      await page.waitForURL(/\/(?!login)/, { timeout: 5000 });
      // Login succeeded
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    } catch {
      // Login might fail if user doesn't exist - check for appropriate error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    }
  });

  test('Real-time streaming integration', async ({ page }) => {
    // This test assumes user is logged in
    await page.goto(FRONTEND_URL);
    
    // Try to access chat functionality
    const chatInput = page.locator('textarea, input[placeholder*="message"], input[placeholder*="chat"]').first();
    
    if (await chatInput.isVisible()) {
      const testMessage = 'Test real-time streaming';
      await chatInput.fill(testMessage);
      await page.keyboard.press('Enter');
      
      // Look for streaming indicators
      const streamingIndicator = page.locator('[data-testid="streaming"], .streaming, .typing');
      
      // Wait for either streaming to start or message to appear
      await Promise.race([
        streamingIndicator.waitFor({ state: 'visible', timeout: 5000 }),
        page.locator('[data-testid="message-content"]').waitFor({ timeout: 10000 })
      ]);
      
      // Verify some response was received
      const messages = page.locator('[data-testid="message-content"], .message-content');
      await expect(messages.first()).toBeVisible({ timeout: 30000 });
    } else {
      // If chat input is not visible, might need authentication first
      console.log('Chat functionality requires authentication');
    }
  });

  test('Error handling and recovery', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Test network error simulation (if possible)
    // This test validates graceful degradation
    
    // Test API error handling
    const errorResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8000/nonexistent-endpoint');
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText
        };
      } catch (error) {
        return {
          error: error.message
        };
      }
    });
    
    expect(errorResponse.ok).toBe(false);
    expect(errorResponse.status).toBe(404);
  });

  test('Performance benchmarks', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Measure page load time
    const loadTime = await page.evaluate(() => {
      return performance.timing.loadEventEnd - performance.timing.navigationStart;
    });
    
    expect(loadTime).toBeLessThan(5000); // Page should load in less than 5 seconds
    
    // Test API response time
    const apiStartTime = Date.now();
    await page.evaluate(async () => {
      await fetch('http://localhost:8000/health');
    });
    const apiTime = Date.now() - apiStartTime;
    
    expect(apiTime).toBeLessThan(2000); // API should respond in less than 2 seconds
  });
});

test.describe('Advanced Backend Integration Scenarios', () => {
  test('Session persistence across page reloads', async ({ page }) => {
    // This test validates session management
    await page.goto(FRONTEND_URL);
    
    // If there's stored session data, verify it persists
    const hasStoredSession = await page.evaluate(() => {
      return !!(sessionStorage.getItem('vana_chat_id') || localStorage.getItem('vana_auth_token'));
    });
    
    if (hasStoredSession) {
      // Reload page and verify session persists
      await page.reload();
      
      const sessionAfterReload = await page.evaluate(() => {
        return {
          chatId: sessionStorage.getItem('vana_chat_id'),
          hasAuth: !!localStorage.getItem('vana_auth_token')
        };
      });
      
      expect(sessionAfterReload.chatId).toBeTruthy();
    }
  });

  test('Concurrent user interactions', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Test multiple simultaneous interactions
    const promises = [];
    
    // Health check
    promises.push(
      page.evaluate(async () => {
        const response = await fetch('http://localhost:8000/health');
        return response.json();
      })
    );
    
    // Agent network history
    promises.push(
      page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:8000/agent_network_history?limit=10');
          return response.json();
        } catch (error) {
          return { error: error.message };
        }
      })
    );
    
    const results = await Promise.all(promises);
    
    // At least health check should succeed
    expect(results[0]).toHaveProperty('status');
  });

  test('Browser compatibility and features', async ({ page }) => {
    await page.goto(FRONTEND_URL);
    
    // Test EventSource support (required for SSE)
    const hasEventSource = await page.evaluate(() => {
      return typeof EventSource !== 'undefined';
    });
    
    expect(hasEventSource).toBe(true);
    
    // Test fetch API support
    const hasFetch = await page.evaluate(() => {
      return typeof fetch !== 'undefined';
    });
    
    expect(hasFetch).toBe(true);
    
    // Test localStorage/sessionStorage
    const hasStorage = await page.evaluate(() => {
      return typeof Storage !== 'undefined' && 
             typeof localStorage !== 'undefined' && 
             typeof sessionStorage !== 'undefined';
    });
    
    expect(hasStorage).toBe(true);
  });
});

// Helper functions for E2E tests
export const e2eTestUtils = {
  /**
   * Wait for streaming to complete
   */
  async waitForStreamingComplete(page: Page, timeout = 30000): Promise<boolean> {
    try {
      // Wait for streaming indicators to disappear
      await page.locator('[data-testid="streaming"], .streaming, .loading').waitFor({ 
        state: 'hidden', 
        timeout 
      });
      
      // Ensure message content is visible
      await page.locator('[data-testid="message-content"]').waitFor({ timeout: 5000 });
      
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Simulate authentication for tests
   */
  async authenticateUser(page: Page, user = TEST_USER): Promise<boolean> {
    try {
      await page.goto(`${FRONTEND_URL}/login`);
      await page.fill('input[name="email"]', user.email);
      await page.fill('input[name="password"]', user.password);
      await page.click('button[type="submit"]');
      
      await page.waitForURL(/\/(?!login)/, { timeout: 10000 });
      
      // Verify authenticated state
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 5000 });
      
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Test API call from browser
   */
  async testApiCall(page: Page, endpoint: string, method = 'GET'): Promise<any> {
    return page.evaluate(async ([endpoint, method]) => {
      try {
        const response = await fetch(`http://localhost:8000${endpoint}`, { method });
        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    }, [endpoint, method] as const);
  }
};
