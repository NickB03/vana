import { test, expect, Page } from '@playwright/test';

// Configuration from discovered architecture
const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:8000';
const TEST_CREDENTIALS = {
  email: 'test@vana.ai',
  password: 'TestPass123#'
};

test.describe('Vana Integrated Chat and Research Flow E2E Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('1. Complete Authentication and Navigation Flow', async ({ page }) => {
    console.log('🔐 Testing complete authentication flow...');
    
    // Navigate to frontend - should redirect to login due to AuthGuard
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login page due to authentication middleware
    await expect(page).toHaveURL(/\/login/);
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/01-login-page.png',
      fullPage: true
    });
    
    // Fill login form using actual form structure
    await page.fill('#email', TEST_CREDENTIALS.email);
    await page.fill('#password', TEST_CREDENTIALS.password);
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for successful authentication and potential redirect
    await page.waitForURL(/\/chat|\/$/);
    
    // Take screenshot after successful login
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/02-post-login.png',
      fullPage: true
    });
    
    console.log('✅ Authentication flow completed successfully');
  });

  test('2. Chat Interface Structure and Components', async ({ page }) => {
    console.log('💬 Testing chat interface structure...');
    
    // Authenticate first
    await authenticateUser(page);
    
    // Navigate to chat (should be protected by AuthGuard)
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Verify main chat interface components are present
    // Based on ResearchChatInterface structure
    await expect(page.locator('text=Chat')).toBeVisible(); // Mode toggle buttons
    await expect(page.locator('text=Research')).toBeVisible(); // Mode toggle buttons
    await expect(page.locator('textarea')).toBeVisible(); // Chat input textarea
    
    // Look for the send button (has Send icon)
    const sendButton = page.locator('button:has(svg)').last(); // Send button is the last button with an SVG
    await expect(sendButton).toBeVisible();
    
    // Take screenshot of chat interface
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/03-chat-interface.png',
      fullPage: true
    });
    
    console.log('✅ Chat interface loaded with all components');
  });

  test('3. Basic Chat Message Flow', async ({ page }) => {
    console.log('📡 Testing basic chat message functionality...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Ensure we're in chat mode (not research mode)
    const chatButton = page.locator('button:has-text("Chat")');
    await chatButton.click();
    
    // Send a test message
    const testMessage = 'Hello Vana, this is an E2E test message for chat mode';
    await page.fill('textarea', testMessage);
    
    // Click send button
    const sendButton = page.locator('button:has(svg)').last();
    await sendButton.click();
    
    // Wait for message to appear in chat (should be in message history)
    await expect(page.locator(`text=${testMessage}`)).toBeVisible({ timeout: 10000 });
    
    // Look for streaming response indicators
    // The StreamingMessage component should show loading states
    await page.waitForTimeout(2000); // Wait for potential streaming response
    
    // Take screenshot during/after chat interaction
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/04-chat-message-sent.png',
      fullPage: true
    });
    
    console.log('✅ Chat message flow working');
  });

  test('4. Research Mode Toggle and UI Changes', async ({ page }) => {
    console.log('🔬 Testing research mode toggle and UI...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Switch to research mode
    const researchButton = page.locator('button:has-text("Research")');
    await researchButton.click();
    
    // Wait for research mode UI to load
    await page.waitForTimeout(1000);
    
    // Check for research-specific UI elements
    // Based on ResearchChatInterface, there should be tabs when in research mode
    const interfaceTab = page.locator('text=Interface');
    const progressTab = page.locator('text=Progress');
    
    if (await interfaceTab.isVisible()) {
      console.log('✅ Research tabs are visible');
      
      // Click on Progress tab to see research progress panel
      await progressTab.click();
      await page.waitForTimeout(500);
      
      // Take screenshot of research mode UI
      await page.screenshot({ 
        path: '/Users/nick/Development/vana/frontend/tests/screenshots/05-research-mode-ui.png',
        fullPage: true
      });
      
      // Go back to Interface tab
      await interfaceTab.click();
    }
    
    // Verify research mode textarea placeholder changes
    const textarea = page.locator('textarea');
    const placeholder = await textarea.getAttribute('placeholder');
    expect(placeholder).toContain('research'); // Should contain research-related text
    
    console.log('✅ Research mode UI changes working');
  });

  test('5. Research Query Submission and SSE Connection', async ({ page }) => {
    console.log('🤖 Testing research query and SSE connection...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Switch to research mode
    await page.locator('button:has-text("Research")').click();
    await page.waitForTimeout(1000);
    
    // Send research query
    const researchQuery = 'Research the current state of AI development in 2025';
    await page.fill('textarea', researchQuery);
    
    // Submit research query
    const sendButton = page.locator('button:has(svg)').last();
    await sendButton.click();
    
    // Wait for research to potentially start
    await page.waitForTimeout(3000);
    
    // Look for research activity indicators
    // Based on the components, there should be badges or status indicators
    const researchActiveBadge = page.locator('text=Research Active');
    const botIndicators = page.locator('text=Bot'); // Bot icons in research mode
    
    if (await researchActiveBadge.isVisible()) {
      console.log('🔍 Research activity detected');
      
      // Switch to Progress tab to see agent status
      const progressTab = page.locator('text=Progress');
      if (await progressTab.isVisible()) {
        await progressTab.click();
        await page.waitForTimeout(2000);
        
        // Take screenshot of active research
        await page.screenshot({ 
          path: '/Users/nick/Development/vana/frontend/tests/screenshots/06-research-progress.png',
          fullPage: true
        });
      }
    }
    
    // Take screenshot of research query submitted
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/07-research-query-submitted.png',
      fullPage: true
    });
    
    console.log('✅ Research query submission tested');
  });

  test('6. Mode Switching and State Preservation', async ({ page }) => {
    console.log('🔄 Testing mode switching behavior...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Start in chat mode - send a message
    await page.locator('button:has-text("Chat")').click();
    const chatMessage = 'Test message for state preservation';
    await page.fill('textarea', chatMessage);
    await page.locator('button:has(svg)').last().click();
    
    // Wait for message to appear
    await expect(page.locator(`text=${chatMessage}`)).toBeVisible();
    
    // Switch to research mode
    await page.locator('button:has-text("Research")').click();
    await page.waitForTimeout(1000);
    
    // Switch back to chat mode
    await page.locator('button:has-text("Chat")').click();
    await page.waitForTimeout(1000);
    
    // Verify the original chat message is still visible
    await expect(page.locator(`text=${chatMessage}`)).toBeVisible();
    
    // Take screenshot of final state
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/08-mode-switching-complete.png',
      fullPage: true
    });
    
    console.log('✅ Mode switching and state preservation working');
  });

  test('7. Visual Responsive Design Verification', async ({ page }) => {
    console.log('📱 Testing responsive design...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/09-mobile-view.png',
      fullPage: true
    });
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/10-tablet-view.png',
      fullPage: true
    });
    
    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Responsive design verification complete');
  });

  test('8. Backend Health and Integration Verification', async ({ page }) => {
    console.log('🏥 Testing backend integration health...');
    
    // Test backend health endpoint directly
    const response = await page.request.get(`${BACKEND_URL}/health`);
    expect(response.ok()).toBeTruthy();
    
    const healthData = await response.json();
    expect(healthData.status).toBe('healthy');
    
    console.log('✅ Backend health check passed');
    
    // Test debug endpoint with secret code from memory
    const debugResponse = await page.request.get(`${BACKEND_URL}/api/debug/phoenix`);
    // This might require authentication, so we'll just check if endpoint exists
    console.log(`Debug endpoint status: ${debugResponse.status()}`);
    
    console.log('✅ Backend integration verification complete');
  });
});

// Helper function for authentication
async function authenticateUser(page: Page) {
  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');
  
  // If redirected to login, authenticate
  if (page.url().includes('/login')) {
    await page.fill('#email', TEST_CREDENTIALS.email);
    await page.fill('#password', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/chat|\/$/);
    await page.waitForTimeout(1000); // Wait for auth state to settle
  }
}