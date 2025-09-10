import { test, expect } from '@playwright/test';

test.describe('Vana Site Functionality Check', () => {
  test('should verify current site state matches Phase 1+2 expectations', async ({ page }) => {
    // Navigate to the site
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Take screenshot for visual inspection
    await page.screenshot({ path: 'tests/screenshots/homepage.png', fullPage: true });
    
    // Test 1: Check if basic page loads
    console.log('✅ Testing: Basic page load');
    await expect(page).toHaveTitle(/Vana|Next.js/);
    
    // Test 2: Check for chat interface elements
    console.log('✅ Testing: Chat interface presence');
    const chatElements = {
      chatInterface: page.locator('[data-testid="chat-interface"], .chat-interface, #chat-interface'),
      messageInput: page.locator('input[type="text"], textarea, [placeholder*="message"], [placeholder*="query"], [placeholder*="ask"]'),
      sendButton: page.locator('button[type="submit"], button:has-text("Send"), .send-button'),
      connectionStatus: page.locator('.connection-status, [data-testid="connection-status"]')
    };
    
    // Test 3: Check authentication status
    console.log('✅ Testing: Authentication status');
    const authElements = await page.locator('.auth, .login, .authentication').count();
    console.log(`Auth elements found: ${authElements}`);
    
    // Test 4: Check for sidebar/navigation
    console.log('✅ Testing: Sidebar/Navigation');
    const sidebarExists = await page.locator('.sidebar, [data-testid="sidebar"], nav').count() > 0;
    console.log(`Sidebar present: ${sidebarExists}`);
    
    // Test 5: Check for error boundaries/error handling
    console.log('✅ Testing: Error handling presence');
    // Look for any error messages or boundaries
    const errorElements = await page.locator('.error, [data-testid="error"], .error-boundary').count();
    console.log(`Error handling elements: ${errorElements}`);
    
    // Test 6: Console errors check
    console.log('✅ Testing: Console errors');
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`Console Error: ${msg.text()}`);
      }
    });
    
    // Test 7: Try to interact with input if present
    console.log('✅ Testing: Input interaction');
    try {
      const input = await chatElements.messageInput.first();
      if (await input.isVisible()) {
        await input.click();
        await input.fill('Test research query');
        console.log('✅ Input interaction successful');
      } else {
        console.log('⚠️ No visible input field found');
      }
    } catch (error) {
      console.log(`⚠️ Input interaction failed: ${error}`);
    }
    
    // Test 8: Check for SSE connection attempts
    console.log('✅ Testing: Network requests');
    const requests: string[] = [];
    page.on('request', request => {
      requests.push(`${request.method()} ${request.url()}`);
    });
    
    // Wait for any async operations
    await page.waitForTimeout(3000);
    
    // Test 9: Check for Google ADK backend connectivity
    console.log('✅ Testing: Backend connectivity');
    try {
      const response = await page.request.get('http://localhost:8000/health');
      console.log(`Backend health status: ${response.status()}`);
    } catch (error) {
      console.log(`⚠️ Backend not accessible: ${error}`);
    }
    
    // Report findings
    console.log('\n📊 FUNCTIONALITY CHECK RESULTS:');
    console.log('=====================================');
    
    // Check what we can actually see
    const pageContent = await page.content();
    const hasReactContent = pageContent.includes('react') || pageContent.includes('next');
    const hasVanaContent = pageContent.includes('vana') || pageContent.includes('Vana');
    const hasChatContent = pageContent.includes('chat') || pageContent.includes('message');
    
    console.log(`React/Next.js content: ${hasReactContent}`);
    console.log(`Vana branding: ${hasVanaContent}`);
    console.log(`Chat-related content: ${hasChatContent}`);
    console.log(`Network requests made: ${requests.length}`);
    console.log(`Console errors: ${consoleLogs.length}`);
    
    // Log actual page title and basic info
    const title = await page.title();
    const url = page.url();
    console.log(`Page Title: "${title}"`);
    console.log(`Current URL: ${url}`);
    
    // Final assessment
    console.log('\n🎯 EXPECTATION vs REALITY:');
    console.log('=====================================');
    console.log('Expected: Full chat interface with Google ADK integration');
    console.log('Expected: Real-time SSE connection and progress updates');  
    console.log('Expected: Authentication system (dev mode)');
    console.log('Expected: Error handling and connection status');
    
    // Take final screenshot
    await page.screenshot({ path: 'tests/screenshots/final-state.png', fullPage: true });
    
    // Print final results
    if (consoleLogs.length > 0) {
      console.log('\n⚠️ Console Errors Found:');
      consoleLogs.forEach(log => console.log(log));
    }
    
    if (requests.length > 0) {
      console.log('\n📡 Network Requests:');
      requests.slice(0, 10).forEach(req => console.log(req));
    }
  });
});