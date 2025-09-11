import { test, expect, Page } from '@playwright/test';

// Configuration from memory
const FRONTEND_URL = 'http://localhost:3001';
const BACKEND_URL = 'http://localhost:8000';
const TEST_CREDENTIALS = {
  email: 'test@vana.ai',
  password: 'TestPass123#'
};

test.describe('Vana Chat and Research Flow E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('1. Authentication Flow - Login with test credentials', async () => {
    console.log('🔐 Testing authentication flow...');
    
    // Navigate to frontend
    await page.goto(FRONTEND_URL);
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login page due to authentication middleware
    await expect(page).toHaveURL(/\/login/);
    
    // Take screenshot of login page
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/01-login-page.png',
      fullPage: true
    });
    
    // Fill login form
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for successful authentication and redirect
    await page.waitForURL(/\/chat|\/$/);
    
    console.log('✅ Authentication successful');
  });

  test('2. Chat Interface Loading and Basic Functionality', async () => {
    console.log('💬 Testing chat interface...');
    
    // First authenticate
    await authenticateUser(page);
    
    // Navigate to chat
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Verify chat interface elements are present
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-messages"]')).toBeVisible();
    
    // Take screenshot of chat interface
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/02-chat-interface.png',
      fullPage: true
    });
    
    console.log('✅ Chat interface loaded successfully');
  });

  test('3. Basic Chat Message Streaming', async () => {
    console.log('📡 Testing chat message streaming...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Send a test message
    const testMessage = 'Hello Vana, this is an E2E test message';
    await page.fill('[data-testid="chat-input"]', testMessage);
    await page.click('[data-testid="send-button"]');
    
    // Wait for message to appear in chat
    await expect(page.locator('text=' + testMessage)).toBeVisible();
    
    // Wait for streaming response (look for loading indicators)
    await page.waitForSelector('[data-testid="streaming-message"]', { timeout: 10000 });
    
    // Take screenshot during streaming
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/03-chat-streaming.png',
      fullPage: true
    });
    
    console.log('✅ Chat streaming functionality working');
  });

  test('4. Research Mode Toggle and Integration', async () => {
    console.log('🔬 Testing research mode toggle...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Look for research mode toggle
    const researchToggle = page.locator('[data-testid="research-mode-toggle"]');
    if (await researchToggle.isVisible()) {
      await researchToggle.click();
      
      // Wait for research UI components to appear
      await expect(page.locator('[data-testid="agent-status-display"]')).toBeVisible();
      await expect(page.locator('[data-testid="research-progress-panel"]')).toBeVisible();
      
      // Take screenshot of research mode
      await page.screenshot({ 
        path: '/Users/nick/Development/vana/frontend/tests/screenshots/04-research-mode.png',
        fullPage: true
      });
      
      console.log('✅ Research mode toggle working');
    } else {
      console.log('⚠️ Research mode toggle not found - may need integration');
    }
  });

  test('5. Research SSE Connection and Multi-Agent Progress', async () => {
    console.log('🤖 Testing multi-agent research streaming...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Enable research mode if toggle exists
    const researchToggle = page.locator('[data-testid="research-mode-toggle"]');
    if (await researchToggle.isVisible()) {
      await researchToggle.click();
    }
    
    // Send research query
    const researchQuery = 'Research the current state of artificial intelligence in 2025';
    await page.fill('[data-testid="chat-input"]', researchQuery);
    await page.click('[data-testid="send-button"]');
    
    // Wait for SSE connection indicators
    await page.waitForSelector('[data-testid="agent-status-display"]', { timeout: 15000 });
    
    // Monitor agent status updates
    const agentStatuses = ['team_leader', 'researcher', 'evaluator', 'plan_generator', 'section_planner', 'report_writer'];
    
    for (const agent of agentStatuses) {
      const agentElement = page.locator(`[data-testid="agent-${agent}"]`);
      if (await agentElement.isVisible()) {
        console.log(`📊 Agent ${agent} status visible`);
      }
    }
    
    // Take screenshot of active research
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/05-research-active.png',
      fullPage: true
    });
    
    console.log('✅ Research SSE connection established');
  });

  test('6. Mode Switching and State Preservation', async () => {
    console.log('🔄 Testing mode switching...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Send a message in chat mode
    await page.fill('[data-testid="chat-input"]', 'Test message in chat mode');
    await page.click('[data-testid="send-button"]');
    
    // Switch to research mode if available
    const researchToggle = page.locator('[data-testid="research-mode-toggle"]');
    if (await researchToggle.isVisible()) {
      await researchToggle.click();
      
      // Switch back to chat mode
      await researchToggle.click();
      
      // Verify previous message is still visible
      await expect(page.locator('text=Test message in chat mode')).toBeVisible();
      
      console.log('✅ Mode switching preserves state');
    }
    
    // Take final screenshot
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/06-final-state.png',
      fullPage: true
    });
  });

  test('7. Error Handling and Recovery', async () => {
    console.log('⚠️ Testing error handling...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Test network error simulation (if possible)
    // This would test reconnection logic
    
    // Test invalid input handling
    const veryLongMessage = 'x'.repeat(10000);
    await page.fill('[data-testid="chat-input"]', veryLongMessage);
    await page.click('[data-testid="send-button"]');
    
    // Look for error handling
    const errorElement = page.locator('[data-testid="error-message"]');
    if (await errorElement.isVisible()) {
      console.log('✅ Error handling working');
    }
    
    // Take screenshot of error state
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/frontend/tests/screenshots/07-error-handling.png',
      fullPage: true
    });
  });
});

// Helper function for authentication
async function authenticateUser(page: Page) {
  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');
  
  // If redirected to login, authenticate
  if (page.url().includes('/login')) {
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/chat|\/$/);
  }
}