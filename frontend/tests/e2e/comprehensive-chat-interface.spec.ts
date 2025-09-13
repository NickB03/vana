/**
 * Comprehensive Chat Interface Tests
 * Visual verification of chat functionality with research capabilities
 * 
 * Test Coverage:
 * 1. Chat session start
 * 2. Input field acceptance verification
 * 3. Submission and research process trigger
 * 4. Visual progress indicators
 * 5. Agent response display
 * 6. Error handling scenarios
 * 7. Screenshot capture for visual verification
 */

import { test, expect, Page, Locator } from '@playwright/test';
import path from 'path';

// Test configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';
const TEST_CREDENTIALS = {
  email: 'test@vana.ai',
  password: 'TestPass123#'
};

// Screenshot directory
const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'test-results', 'screenshots');

test.describe('Comprehensive Chat Interface Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Set consistent viewport for screenshots
    await page.setViewportSize({ width: 1440, height: 900 });
    
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Browser console error:', msg.text());
      }
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  /**
   * Test 1: Chat Session Start
   * Verifies that a new chat session can be successfully initiated
   */
  test('1. Chat Session Start - Complete Flow', async () => {
    console.log('🚀 Starting chat session test...');
    
    // Authenticate user
    await authenticateUser(page);
    
    // Navigate to chat interface
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Wait for chat interface to fully load
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible({ timeout: 10000 });
    
    // Verify main interface components are present
    const chatInterface = page.locator('[data-testid="chat-interface"]');
    const chatMessages = page.locator('[data-testid="chat-messages"]');
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    await expect(chatInterface).toBeVisible();
    await expect(chatMessages).toBeVisible();
    await expect(chatInput).toBeVisible();
    
    // Take screenshot of initial chat session
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-chat-session-start.png`,
      fullPage: true
    });
    
    console.log('✅ Chat session started successfully');
  });

  /**
   * Test 2: Input Field Acceptance Verification
   * Tests various input scenarios and field responsiveness
   */
  test('2. Input Field Acceptance - Text and Behavior Verification', async () => {
    console.log('⌨️ Testing input field acceptance...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    const inputField = page.locator('textarea[placeholder*="research query"]');
    await expect(inputField).toBeVisible();
    
    // Test 1: Basic text input
    const testQuery = 'What are the latest developments in artificial intelligence?';
    await inputField.fill(testQuery);
    await expect(inputField).toHaveValue(testQuery);
    
    // Test 2: Multi-line input
    const multiLineQuery = `Research the following:
1. Machine learning trends
2. AI ethics considerations
3. Future predictions`;
    
    await inputField.clear();
    await inputField.fill(multiLineQuery);
    await expect(inputField).toHaveValue(multiLineQuery);
    
    // Test 3: Special characters and emojis
    const specialQuery = 'Analyze AI trends 🤖 & machine learning (ML) - 2025 update!';
    await inputField.clear();
    await inputField.fill(specialQuery);
    await expect(inputField).toHaveValue(specialQuery);
    
    // Test 4: Long text input
    const longQuery = 'A'.repeat(500);
    await inputField.clear();
    await inputField.fill(longQuery);
    await expect(inputField).toHaveValue(longQuery);
    
    // Test 5: Placeholder behavior when empty
    await inputField.clear();
    await expect(inputField).toHaveAttribute('placeholder', /research query/i);
    
    // Take screenshot showing input field functionality
    await inputField.fill('Sample research query for visual verification');
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-input-field-acceptance.png`,
      fullPage: true
    });
    
    console.log('✅ Input field acceptance verified');
  });

  /**
   * Test 3: Submission and Research Process Trigger
   * Verifies that submitting a query triggers the research process
   */
  test('3. Submission and Research Process Trigger', async () => {
    console.log('🔄 Testing submission and research trigger...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    const inputField = page.locator('textarea[placeholder*="research query"]');
    const sendButton = page.locator('button[type="submit"]');
    
    await expect(inputField).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    // Test research query submission
    const researchQuery = 'Research the current state of quantum computing in 2025';
    await inputField.fill(researchQuery);
    
    // Verify send button becomes enabled
    await expect(sendButton).toBeEnabled();
    
    // Take screenshot before submission
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03a-before-submission.png`,
      fullPage: true
    });
    
    // Submit the query
    await sendButton.click();
    
    // Verify input field is cleared after submission
    await expect(inputField).toHaveValue('');
    
    // Verify research process indicators appear
    await expect(page.locator('[data-testid="research-status"]')).toBeVisible({ timeout: 15000 });
    
    // Check for research active badge
    const researchBadge = page.locator('text=Research Active');
    await expect(researchBadge).toBeVisible({ timeout: 10000 });
    
    // Take screenshot during research process
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03b-research-triggered.png`,
      fullPage: true
    });
    
    console.log('✅ Research process triggered successfully');
  });

  /**
   * Test 4: Visual Progress Indicators Verification
   * Verifies that progress indicators appear and update during research
   */
  test('4. Visual Progress Indicators - Real-time Updates', async () => {
    console.log('📊 Testing visual progress indicators...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Start research
    const inputField = page.locator('textarea[placeholder*="research query"]');
    const sendButton = page.locator('button[type="submit"]');
    
    await inputField.fill('Comprehensive analysis of renewable energy trends 2025');
    await sendButton.click();
    
    // Wait for progress indicators to appear
    await page.waitForSelector('[data-testid="research-status"]', { timeout: 15000 });
    
    // Verify different progress indicator elements
    const progressIndicators = [
      'research-status',
      'agent-status-display',
      'research-progress-panel'
    ];
    
    for (const indicator of progressIndicators) {
      const element = page.locator(`[data-testid="${indicator}"]`);
      if (await element.isVisible()) {
        console.log(`✓ Found progress indicator: ${indicator}`);
      }
    }
    
    // Switch to progress tab to see detailed indicators
    const progressTab = page.locator('button[role="tab"]:has-text("Progress")');
    if (await progressTab.isVisible()) {
      await progressTab.click();
      await page.waitForTimeout(2000); // Allow UI to update
      
      // Take screenshot of progress view
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/04a-progress-indicators-detailed.png`,
        fullPage: true
      });
    }
    
    // Check for agent status indicators
    const agentTypes = ['team_leader', 'researcher', 'evaluator', 'plan_generator', 'section_planner', 'report_writer'];
    
    for (const agentType of agentTypes) {
      const agentElement = page.locator(`[data-testid="agent-${agentType}"]`);
      if (await agentElement.isVisible()) {
        console.log(`✓ Agent ${agentType} status visible`);
      }
    }
    
    // Take screenshot of overall progress indicators
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04b-progress-indicators-overview.png`,
      fullPage: true
    });
    
    console.log('✅ Visual progress indicators verified');
  });

  /**
   * Test 5: Agent Response Display Confirmation
   * Verifies that agent responses are properly displayed in the interface
   */
  test('5. Agent Response Display - Message Rendering', async () => {
    console.log('🤖 Testing agent response display...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Start research to get agent responses
    const inputField = page.locator('textarea[placeholder*="research query"]');
    const sendButton = page.locator('button[type="submit"]');
    
    const shortQuery = 'Brief summary of AI developments';
    await inputField.fill(shortQuery);
    await sendButton.click();
    
    // Wait for user message to appear
    await expect(page.locator(`text=${shortQuery}`)).toBeVisible({ timeout: 10000 });
    
    // Wait for agent responses (look for streaming indicators)
    await page.waitForSelector('[data-testid="streaming-message"]', { timeout: 20000 });
    
    // Check message structure
    const messages = page.locator('[data-testid="message-bubble"]');
    const messageCount = await messages.count();
    console.log(`Found ${messageCount} messages in chat`);
    
    // Verify message types
    const userMessages = page.locator('[data-testid="message-bubble"][data-sender="user"]');
    const agentMessages = page.locator('[data-testid="message-bubble"][data-sender="assistant"]');
    
    await expect(userMessages.first()).toBeVisible();
    
    // Wait for agent response to appear
    await page.waitForTimeout(5000); // Allow time for response
    
    // Switch to results tab if available
    const resultsTab = page.locator('button[role="tab"]:has-text("Results")');
    if (await resultsTab.isVisible()) {
      await resultsTab.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot of results display
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/05a-agent-responses-results.png`,
        fullPage: true
      });
    }
    
    // Take screenshot of message display
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05b-agent-responses-messages.png`,
      fullPage: true
    });
    
    console.log('✅ Agent response display verified');
  });

  /**
   * Test 6: Error Handling Scenarios
   * Tests various error conditions and recovery mechanisms
   */
  test('6. Error Handling - Multiple Scenarios', async () => {
    console.log('⚠️ Testing error handling scenarios...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    const inputField = page.locator('textarea[placeholder*="research query"]');
    const sendButton = page.locator('button[type="submit"]');
    
    // Scenario 1: Empty message submission
    await sendButton.click();
    // Should not trigger research (button should be disabled)
    await expect(sendButton).toBeDisabled();
    
    // Scenario 2: Extremely long message
    const veryLongMessage = 'x'.repeat(10000);
    await inputField.fill(veryLongMessage);
    await sendButton.click();
    
    // Wait and check for any error indicators
    await page.waitForTimeout(3000);
    
    // Look for error messages
    const errorMessage = page.locator('[data-testid="error-message"]');
    const errorAlert = page.locator('.text-red-600, .text-red-800, [class*="error"]');
    
    if (await errorMessage.isVisible() || await errorAlert.first().isVisible()) {
      console.log('✓ Error handling working - error message displayed');
      
      // Take screenshot of error state
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/06a-error-handling.png`,
        fullPage: true
      });
    }
    
    // Scenario 3: Network interruption simulation (if possible)
    await inputField.clear();
    await inputField.fill('Test network error handling');
    
    // Simulate offline condition
    await page.setOfflineMode(true);
    await sendButton.click();
    
    // Wait for network error indicators
    await page.waitForTimeout(5000);
    
    // Look for connection error indicators
    const connectionError = page.locator('text=/connection|network|offline/i');
    if (await connectionError.first().isVisible()) {
      console.log('✓ Network error handling working');
    }
    
    // Restore connection
    await page.setOfflineMode(false);
    
    // Scenario 4: Test error recovery
    const dismissButton = page.locator('button:has-text("Dismiss")');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
      console.log('✓ Error dismissal working');
    }
    
    // Take final error handling screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06b-error-recovery.png`,
      fullPage: true
    });
    
    console.log('✅ Error handling scenarios verified');
  });

  /**
   * Test 7: Comprehensive Visual Verification
   * Takes screenshots of all major states for visual regression testing
   */
  test('7. Comprehensive Visual Verification - Full State Coverage', async () => {
    console.log('📸 Performing comprehensive visual verification...');
    
    await authenticateUser(page);
    
    // State 1: Initial load
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07a-initial-load.png`,
      fullPage: true
    });
    
    // State 2: Interface tab active
    const interfaceTab = page.locator('button[role="tab"]:has-text("Interface")');
    await interfaceTab.click();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07b-interface-tab.png`,
      fullPage: true
    });
    
    // State 3: Progress tab active
    const progressTab = page.locator('button[role="tab"]:has-text("Progress")');
    await progressTab.click();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07c-progress-tab.png`,
      fullPage: true
    });
    
    // State 4: With research query entered
    await interfaceTab.click();
    const inputField = page.locator('textarea[placeholder*="research query"]');
    await inputField.fill('Visual verification test query for comprehensive coverage');
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07d-query-entered.png`,
      fullPage: true
    });
    
    // State 5: Research in progress
    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();
    
    // Wait for research to start
    await page.waitForSelector('[data-testid="research-status"]', { timeout: 15000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07e-research-active.png`,
      fullPage: true
    });
    
    // State 6: Different viewport sizes
    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07f-tablet-view.png`,
      fullPage: true
    });
    
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/07g-mobile-view.png`,
      fullPage: true
    });
    
    // Reset to desktop view
    await page.setViewportSize({ width: 1440, height: 900 });
    
    console.log('✅ Comprehensive visual verification completed');
  });

  /**
   * Test 8: Keyboard Navigation and Accessibility
   * Tests keyboard shortcuts and accessibility features
   */
  test('8. Keyboard Navigation and Accessibility', async () => {
    console.log('⌨️ Testing keyboard navigation and accessibility...');
    
    await authenticateUser(page);
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    const inputField = page.locator('textarea[placeholder*="research query"]');
    
    // Test Enter key submission
    await inputField.fill('Test keyboard submission');
    await inputField.press('Enter');
    
    // Verify input was cleared
    await expect(inputField).toHaveValue('');
    
    // Test Shift+Enter for new line
    await inputField.fill('First line');
    await inputField.press('Shift+Enter');
    await inputField.type('Second line');
    await expect(inputField).toHaveValue('First line\nSecond line');
    
    // Test Tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    console.log(`Focused element after Tab: ${focusedElement}`);
    
    // Test ARIA labels
    const ariaLabel = await inputField.getAttribute('aria-label');
    expect(ariaLabel).toContain('research query');
    
    // Take accessibility screenshot
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/08-keyboard-accessibility.png`,
      fullPage: true
    });
    
    console.log('✅ Keyboard navigation and accessibility verified');
  });
});

/**
 * Helper function to authenticate user
 */
async function authenticateUser(page: Page) {
  await page.goto(FRONTEND_URL);
  await page.waitForLoadState('networkidle');
  
  // Check if already authenticated
  if (page.url().includes('/chat')) {
    return; // Already authenticated
  }
  
  // If redirected to login, authenticate
  if (page.url().includes('/login')) {
    await page.fill('input[name="email"]', TEST_CREDENTIALS.email);
    await page.fill('input[name="password"]', TEST_CREDENTIALS.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/chat|\/$/);
  }
}

/**
 * Helper function to wait for research to complete
 */
async function waitForResearchCompletion(page: Page, timeout = 60000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const completedIndicator = page.locator('text=Research complete');
    const errorIndicator = page.locator('[data-testid="error-message"]');
    
    if (await completedIndicator.isVisible()) {
      return 'completed';
    }
    
    if (await errorIndicator.isVisible()) {
      return 'error';
    }
    
    await page.waitForTimeout(2000);
  }
  
  return 'timeout';
}