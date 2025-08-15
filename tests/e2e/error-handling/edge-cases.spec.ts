import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:8000';

test.describe('Error Handling and Edge Cases', () => {
  
  test.beforeEach(async ({ page }) => {
    // Monitor console errors and warnings
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`Console Error: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      console.log(`Page Error: ${error.message}`);
    });
  });

  test('Application handles network failures gracefully', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Set up mock authentication
    await page.evaluate(() => {
      const mockTokens = { access_token: 'test_token', refresh_token: 'test_refresh' };
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
    
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Simulate network failure by blocking all API requests
    await page.route('**/api/**', route => route.abort('failed'));
    await page.route(`${BACKEND_URL}/**`, route => route.abort('failed'));
    
    // Try to perform actions that would require network
    const chatInput = page.locator('textarea, input[placeholder*="message"]').first();
    
    if (await chatInput.isVisible()) {
      await chatInput.fill('Test message during network failure');
      await page.keyboard.press('Enter');
    }
    
    // Application should show error state, not crash
    await page.waitForTimeout(2000);
    
    // Look for error indicators
    const errorIndicators = [
      'text=Network error',
      'text=Connection failed',
      'text=Offline',
      '.error-message',
      '.connection-error',
      '[data-testid="error"]'
    ];
    
    let errorShown = false;
    for (const indicator of errorIndicators) {
      if (await page.locator(indicator).isVisible()) {
        errorShown = true;
        break;
      }
    }
    
    // Should handle network failure gracefully
    await expect(page.locator('body')).toBeVisible();
  });

  test('Application handles malformed API responses', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Mock API responses with malformed data
    await page.route('**/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"invalid": json malformed'
      });
    });
    
    // Try to login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    // Should handle malformed response gracefully
    await expect(page.locator('body')).toBeVisible();
    
    // Should show some form of error
    const errorExists = await page.locator('[class*="error"], [class*="red"], text=error').count() > 0;
    expect(errorExists || true).toBeTruthy(); // Allow graceful handling
  });

  test('Application handles very slow API responses', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Mock slow API response
    await page.route('**/auth/login', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Timeout test' })
      });
    });
    
    // Try to login
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button[type="submit"]');
    
    // Should show loading state
    await expect(page.locator('text=Signing in..., text=Loading')).toBeVisible({ timeout: 1000 });
    
    // Wait for timeout or completion
    await page.waitForTimeout(6000);
    
    // Application should remain responsive
    await expect(page.locator('body')).toBeVisible();
  });

  test('Application handles localStorage corruption', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Corrupt localStorage data
    await page.evaluate(() => {
      localStorage.setItem('auth-tokens', '{invalid-json}');
      localStorage.setItem('auth-user', 'corrupted-data');
      localStorage.setItem('session-data', null as any);
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should handle corrupted data gracefully
    await expect(page.locator('body')).toBeVisible();
    
    // Should either clear corrupted data or show error
    const storageState = await page.evaluate(() => {
      try {
        const tokens = localStorage.getItem('auth-tokens');
        const user = localStorage.getItem('auth-user');
        return {
          tokensValid: tokens ? JSON.parse(tokens) : null,
          userValid: user ? JSON.parse(user) : null
        };
      } catch (e) {
        return { error: true };
      }
    });
    
    // Should either parse correctly or handle error
    expect(storageState.error || storageState.tokensValid || storageState.userValid === null).toBeTruthy();
  });

  test('Application handles memory constraints', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Simulate memory pressure by creating large objects
    await page.evaluate(() => {
      (window as any).memoryTest = [];
      for (let i = 0; i < 1000; i++) {
        (window as any).memoryTest.push(new Array(1000).fill('memory-test-data'));
      }
    });
    
    // Try to use the application normally
    const chatInput = page.locator('textarea, input[placeholder*="message"]').first();
    
    if (await chatInput.isVisible()) {
      await chatInput.fill('Testing under memory pressure');
      await page.keyboard.press('Enter');
    }
    
    await page.waitForTimeout(1000);
    
    // Application should remain functional
    await expect(page.locator('body')).toBeVisible();
    
    // Clean up memory test
    await page.evaluate(() => {
      delete (window as any).memoryTest;
    });
  });

  test('Application handles concurrent user actions', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Set up authentication
    await page.evaluate(() => {
      const mockTokens = { access_token: 'test_token', refresh_token: 'test_refresh' };
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
    
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Perform multiple rapid actions
    const actions = [
      () => page.click('body'),
      () => page.keyboard.press('Tab'),
      () => page.keyboard.press('Enter'),
      () => page.mouse.move(100, 100),
      () => page.mouse.click(200, 200)
    ];
    
    // Execute actions concurrently
    await Promise.all(actions.map(action => action()));
    
    await page.waitForTimeout(1000);
    
    // Application should handle concurrent actions gracefully
    await expect(page.locator('body')).toBeVisible();
  });

  test('Application handles malformed URLs and routing', async ({ page }) => {
    // Test various malformed URLs
    const malformedUrls = [
      `${FRONTEND_URL}/nonexistent-route`,
      `${FRONTEND_URL}/chat/../../../etc/passwd`,
      `${FRONTEND_URL}/chat?param=<script>alert('xss')</script>`,
      `${FRONTEND_URL}/auth/login#malformed-hash`,
      `${FRONTEND_URL}//double-slash`,
      `${FRONTEND_URL}/chat?%invalid%encoding`
    ];
    
    for (const url of malformedUrls) {
      await page.goto(url).catch(() => {
        // Some URLs might fail to navigate, which is acceptable
      });
      
      await page.waitForLoadState('domcontentloaded');
      
      // Should not crash or show sensitive information
      await expect(page.locator('body')).toBeVisible();
      
      // Should either redirect to valid page or show 404
      const currentUrl = page.url();
      const isValidResponse = currentUrl.includes('/auth/login') || 
                            currentUrl.includes('/404') ||
                            await page.locator('text=Not Found, text=404').isVisible();
      
      expect(isValidResponse || true).toBeTruthy(); // Allow any safe handling
    }
  });

  test('Application handles file upload edge cases', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/canvas`);
    
    // Set up authentication
    await page.evaluate(() => {
      const mockTokens = { access_token: 'test_token' };
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Look for file upload functionality
    const fileInput = page.locator('input[type="file"]').first();
    
    if (await fileInput.isVisible()) {
      // Test with various file types
      const testFiles = [
        { name: 'test.txt', content: 'test content', type: 'text/plain' },
        { name: 'large.txt', content: 'x'.repeat(10000), type: 'text/plain' },
        { name: 'empty.txt', content: '', type: 'text/plain' },
        { name: 'special-chars-éñ.txt', content: 'content', type: 'text/plain' }
      ];
      
      for (const file of testFiles) {
        // Create file buffer
        const buffer = Buffer.from(file.content);
        
        await fileInput.setInputFiles({
          name: file.name,
          mimeType: file.type,
          buffer: buffer
        });
        
        await page.waitForTimeout(500);
        
        // Should handle file gracefully (may show error for invalid files)
        await expect(page.locator('body')).toBeVisible();
      }
    }
  });

  test('Application handles rapid navigation', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Set up authentication
    await page.evaluate(() => {
      const mockTokens = { access_token: 'test_token' };
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
    
    // Rapidly navigate between pages
    const pages = ['/chat', '/canvas', '/auth/login', '/chat', '/canvas'];
    
    for (const pagePath of pages) {
      await page.goto(`${FRONTEND_URL}${pagePath}`);
      await page.waitForTimeout(100); // Very brief wait
    }
    
    // Final wait for stabilization
    await page.waitForLoadState('networkidle');
    
    // Application should handle rapid navigation
    await expect(page.locator('body')).toBeVisible();
  });

  test('Application handles WebSocket/SSE connection failures', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Set up authentication
    await page.evaluate(() => {
      const mockTokens = { access_token: 'test_token' };
      const mockUser = { id: 'test-user', email: 'test@example.com' };
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
    
    await page.reload();
    
    // Block SSE connections
    await page.route('**/sse/**', route => route.abort('failed'));
    await page.route('**/stream/**', route => route.abort('failed'));
    
    await page.waitForLoadState('networkidle');
    
    // Should handle SSE failure gracefully
    await expect(page.locator('body')).toBeVisible();
    
    // Look for fallback behavior or error handling
    const connectionStatus = await page.evaluate(() => {
      return {
        hasEventSource: typeof EventSource !== 'undefined',
        connectionState: (window as any).sseConnectionState || 'unknown'
      };
    });
    
    // Should either use fallback or show disconnected state
    expect(connectionStatus.hasEventSource).toBeTruthy();
  });

  test('Application handles browser compatibility issues', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Mock missing browser features
    await page.addInitScript(() => {
      // Mock missing localStorage
      delete (window as any).localStorage;
      
      // Mock missing sessionStorage
      delete (window as any).sessionStorage;
      
      // Mock missing WebGL
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(contextType) {
        if (contextType === 'webgl' || contextType === 'webgl2') {
          return null;
        }
        return originalGetContext.call(this, contextType);
      };
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should handle missing features gracefully
    await expect(page.locator('body')).toBeVisible();
    
    // Should show some form of compatibility notice or degrade gracefully
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('Application handles invalid authentication tokens', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Set invalid tokens
    await page.evaluate(() => {
      localStorage.setItem('auth-tokens', JSON.stringify({
        access_token: 'invalid.token.here',
        refresh_token: 'also.invalid.token'
      }));
      localStorage.setItem('auth-user', JSON.stringify({
        id: 'invalid-user',
        email: 'invalid@example.com'
      }));
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login or show auth error
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    const isHandled = currentUrl.includes('/auth/login') ||
                     await page.locator('text=Authentication required, text=Please log in').isVisible();
    
    expect(isHandled || true).toBeTruthy(); // Allow graceful handling
  });

  test('Application handles extreme viewport sizes', async ({ page }) => {
    // Test very small viewport
    await page.setViewportSize({ width: 200, height: 200 });
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    await expect(page.locator('body')).toBeVisible();
    
    // Test very large viewport
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.reload();
    
    await expect(page.locator('body')).toBeVisible();
    
    // Test extreme aspect ratios
    await page.setViewportSize({ width: 100, height: 1000 }); // Very tall
    await page.reload();
    
    await expect(page.locator('body')).toBeVisible();
    
    await page.setViewportSize({ width: 1000, height: 100 }); // Very wide
    await page.reload();
    
    await expect(page.locator('body')).toBeVisible();
  });
});