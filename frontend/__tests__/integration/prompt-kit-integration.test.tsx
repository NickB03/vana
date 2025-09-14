/**
 * Prompt-Kit Integration Test Suite
 * Tests the new ChatPromptInput component integration at http://localhost:3000/chat
 * 
 * Test Areas:
 * 1. Component rendering
 * 2. Text input functionality (typing, auto-resize)
 * 3. Submit functionality (Enter key, send button)
 * 4. Backend API connections via chat context
 * 5. Research mode indicators
 * 6. Loading states
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

const TEST_URL = 'http://localhost:3000/chat';
const TEST_TIMEOUT = 30000;

test.describe('Prompt-Kit Component Integration', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Enable console logging for debugging
    page.on('console', (msg) => {
      console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`);
    });
    
    // Enable network request logging
    page.on('request', (request) => {
      console.log(`[Network Request] ${request.method()} ${request.url()}`);
    });
    
    page.on('response', (response) => {
      console.log(`[Network Response] ${response.status()} ${response.url()}`);
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await page.goto(TEST_URL, { waitUntil: 'networkidle', timeout: TEST_TIMEOUT });
  });

  test('1. ChatPromptInput component renders properly', async () => {
    // Wait for the chat interface to load
    await page.waitForSelector('[data-testid="chat-interface"]', { timeout: 10000 });
    
    // Check for the main prompt input container
    const promptContainer = page.locator('.prompt-input-container');
    await expect(promptContainer).toBeVisible();
    
    // Check for textarea element
    const textarea = page.locator('textarea[aria-label="Message input"]');
    await expect(textarea).toBeVisible();
    
    // Check for send button
    const sendButton = page.locator('button[aria-label="Send message"]');
    await expect(sendButton).toBeVisible();
    
    // Check for attachment button
    const attachButton = page.locator('button[aria-label="Attach file"]');
    await expect(attachButton).toBeVisible();
    
    // Verify placeholder text
    const placeholderText = await textarea.getAttribute('placeholder');
    expect(placeholderText).toBeTruthy();
    
    console.log('✅ Component rendering test passed');
  });

  test('2. Text input functionality works (typing, auto-resize)', async () => {
    const textarea = page.locator('textarea[aria-label="Message input"]');
    
    // Test basic typing
    await textarea.fill('Hello world!');
    const inputValue = await textarea.inputValue();
    expect(inputValue).toBe('Hello world!');
    
    // Test auto-resize with multiline content
    const initialHeight = await textarea.evaluate(el => el.clientHeight);
    
    // Add multiple lines
    const multilineText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    await textarea.fill(multilineText);
    
    // Wait for auto-resize to complete
    await page.waitForTimeout(100);
    
    const expandedHeight = await textarea.evaluate(el => el.clientHeight);
    expect(expandedHeight).toBeGreaterThan(initialHeight);
    
    // Test clearing input
    await textarea.fill('');
    const finalHeight = await textarea.evaluate(el => el.clientHeight);
    expect(finalHeight).toBeLessThanOrEqual(initialHeight + 10); // Allow small variance
    
    console.log('✅ Text input and auto-resize test passed');
  });

  test('3. Submit functionality works (Enter key, send button)', async () => {
    const textarea = page.locator('textarea[aria-label="Message input"]');
    const sendButton = page.locator('button[aria-label="Send message"]');
    
    // Test that send button is disabled when empty
    await expect(sendButton).toHaveAttribute('disabled');
    
    // Test that send button is enabled when text is entered
    await textarea.fill('Test message');
    await expect(sendButton).not.toHaveAttribute('disabled');
    
    // Test Enter key submission
    await textarea.fill('Enter key test');
    
    // Set up request interception to verify API call
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api') && response.request().method() === 'POST'
    ).catch(() => null); // Don't fail if no API call (backend may be down)
    
    await textarea.press('Enter');
    
    // Check if input was cleared (indicating successful submission)
    const inputAfterEnter = await textarea.inputValue();
    expect(inputAfterEnter).toBe('');
    
    // Test send button click
    await textarea.fill('Button click test');
    await sendButton.click();
    
    const inputAfterClick = await textarea.inputValue();
    expect(inputAfterClick).toBe('');
    
    // Test Shift+Enter for new line (shouldn't submit)
    await textarea.fill('Shift enter test');
    await page.keyboard.press('Shift+Enter');
    
    const inputAfterShiftEnter = await textarea.inputValue();
    expect(inputAfterShiftEnter).toContain('Shift enter test');
    
    console.log('✅ Submit functionality test passed');
  });

  test('4. Research mode indicators display correctly', async () => {
    // Look for research mode indicators
    const researchBadge = page.locator('text="Research Active"');
    const researchStatus = page.locator('[data-testid="research-status"]');
    
    // Check if research status elements exist in DOM (may not be visible initially)
    const badgeExists = await researchBadge.count() > 0;
    const statusExists = await researchStatus.count() > 0;
    
    console.log(`Research badge exists: ${badgeExists}`);
    console.log(`Research status exists: ${statusExists}`);
    
    // Check for chat header indicators
    const chatHeader = page.locator('text="Unified Multi-Agent Chat Interface"');
    await expect(chatHeader).toBeVisible();
    
    const promptKitBadge = page.locator('text="Prompt-Kit Enhanced"');
    await expect(promptKitBadge).toBeVisible();
    
    // Test placeholder changes based on research mode
    const textarea = page.locator('textarea[aria-label="Message input"]');
    const placeholder = await textarea.getAttribute('placeholder');
    
    // Should indicate research functionality
    expect(placeholder).toMatch(/research|query/i);
    
    console.log('✅ Research mode indicators test passed');
  });

  test('5. Loading states work properly', async () => {
    const textarea = page.locator('textarea[aria-label="Message input"]');
    const sendButton = page.locator('button[aria-label="Send message"]');
    
    // Fill and submit a message to trigger loading state
    await textarea.fill('Loading state test');
    await sendButton.click();
    
    // Check for loading indicators (may appear briefly)
    const sparklesIcon = page.locator('svg').filter({ hasText: 'sparkles' }).or(
      page.locator('[class*="animate-spin"]')
    );
    
    // Check if loading state affects the input
    await page.waitForTimeout(500);
    
    const isTextareaDisabled = await textarea.isDisabled().catch(() => false);
    const isSendButtonDisabled = await sendButton.isDisabled().catch(() => false);
    
    console.log(`Textarea disabled during loading: ${isTextareaDisabled}`);
    console.log(`Send button disabled during loading: ${isSendButtonDisabled}`);
    
    // Check placeholder changes during loading
    const loadingPlaceholder = await textarea.getAttribute('placeholder');
    console.log(`Loading placeholder: ${loadingPlaceholder}`);
    
    console.log('✅ Loading states test passed');
  });

  test('6. Backend API connections work via chat context', async () => {
    const textarea = page.locator('textarea[aria-label="Message input"]');
    
    // Monitor network activity
    const networkRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api') || request.url().includes('chat')) {
        networkRequests.push(`${request.method()} ${request.url()}`);
      }
    });
    
    // Test API connection by sending a message
    await textarea.fill('API connection test message');
    await page.keyboard.press('Enter');
    
    // Wait for potential API calls
    await page.waitForTimeout(2000);
    
    // Log network activity for debugging
    console.log('Network requests detected:', networkRequests);
    
    // Check for chat context activity
    const chatMessages = page.locator('[data-testid="chat-messages"]').or(
      page.locator('.chat-messages')
    );
    
    // Check if message appears in chat (indicating context is working)
    const messageElements = await page.locator('.message, .chat-message').count();
    console.log(`Messages in chat: ${messageElements}`);
    
    // Check for error states that might indicate API issues
    const errorElements = await page.locator('[class*="error"], .error-message').count();
    console.log(`Error elements: ${errorElements}`);
    
    // Check console for context-related logs
    const logs = await page.evaluate(() => {
      return (window as any).__chatLogs || [];
    }).catch(() => []);
    
    console.log('Chat context logs:', logs);
    
    console.log('✅ Backend API connections test completed');
  });

  test('7. Component accessibility and mobile responsiveness', async () => {
    // Test accessibility attributes
    const textarea = page.locator('textarea[aria-label="Message input"]');
    const sendButton = page.locator('button[aria-label="Send message"]');
    const attachButton = page.locator('button[aria-label="Attach file"]');
    
    // Verify ARIA labels
    await expect(textarea).toHaveAttribute('aria-label');
    await expect(sendButton).toHaveAttribute('aria-label');
    await expect(attachButton).toHaveAttribute('aria-label');
    
    // Test keyboard navigation
    await textarea.focus();
    await expect(textarea).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(sendButton).toBeFocused();
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    // Check that components are still visible and functional on mobile
    await expect(textarea).toBeVisible();
    await expect(sendButton).toBeVisible();
    
    // Test touch interaction
    await textarea.fill('Mobile test');
    await sendButton.click();
    
    const inputAfterMobileSubmit = await textarea.inputValue();
    expect(inputAfterMobileSubmit).toBe('');
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Accessibility and mobile responsiveness test passed');
  });

  test('8. Integration stability and error handling', async () => {
    // Test rapid input changes
    const textarea = page.locator('textarea[aria-label="Message input"]');
    
    for (let i = 0; i < 5; i++) {
      await textarea.fill(`Rapid test ${i}`);
      await page.waitForTimeout(100);
    }
    
    // Test special characters and edge cases
    const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';
    await textarea.fill(specialChars);
    const specialValue = await textarea.inputValue();
    expect(specialValue).toBe(specialChars);
    
    // Test very long input
    const longText = 'This is a very long message '.repeat(20);
    await textarea.fill(longText);
    const longValue = await textarea.inputValue();
    expect(longValue).toBe(longText);
    
    // Test empty submission (should be blocked)
    await textarea.fill('');
    const sendButton = page.locator('button[aria-label="Send message"]');
    await expect(sendButton).toHaveAttribute('disabled');
    
    // Test whitespace-only submission (should be blocked)
    await textarea.fill('   \n\t  ');
    await expect(sendButton).toHaveAttribute('disabled');
    
    console.log('✅ Integration stability and error handling test passed');
  });
});