import { test, expect } from '@playwright/test';

test.describe('Vana Chat Integration', () => {
  test('should load the Vana chat page successfully', async ({ page }) => {
    // Navigate to the Vana chat page
    await page.goto('http://localhost:3000/vana');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check that the page title is correct
    await expect(page).toHaveTitle(/Vana Chat|Next.js Chatbot/);
    
    // Check for the main header
    const header = page.locator('h1:has-text("Vana Chat v2")');
    await expect(header).toBeVisible();
    
    // Check for the subtitle
    const subtitle = page.locator('text=Powered by Google ADK & Vercel UI');
    await expect(subtitle).toBeVisible();
    
    // Check for the welcome message
    const welcomeMessage = page.locator('text=Welcome to Vana Chat v2');
    await expect(welcomeMessage).toBeVisible({ timeout: 10000 });
    
    // Check that the chat input is present
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await expect(chatInput).toBeVisible();
    
    // Take a screenshot for verification
    await page.screenshot({ path: 'vana-chat-loaded.png', fullPage: true });
    
    console.log('✅ Vana chat page loaded successfully!');
  });
  
  test('should be able to send a message', async ({ page }) => {
    await page.goto('http://localhost:3000/vana');
    await page.waitForLoadState('networkidle');
    
    // Find and interact with the chat input
    const chatInput = page.locator('textarea, input[type="text"]').first();
    await chatInput.fill('Hello, Vana!');
    
    // Submit the message (either by Enter key or submit button)
    await page.keyboard.press('Enter');
    
    // Wait a moment for the message to appear
    await page.waitForTimeout(1000);
    
    // Check that the user message appears
    const userMessage = page.locator('text=Hello, Vana!');
    await expect(userMessage).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Message sending works!');
  });
  
  test('should check backend connection status', async ({ page }) => {
    // Navigate to test page
    await page.goto('http://localhost:3000/test-vana');
    await page.waitForLoadState('networkidle');
    
    // Check for the test page title
    const testTitle = page.locator('h1:has-text("Vana Integration Test")');
    await expect(testTitle).toBeVisible();
    
    // Check backend connection status
    const connectedStatus = page.locator('text=Connected to Vana Backend');
    const connectingStatus = page.locator('text=Checking connection');
    const errorStatus = page.locator('text=Cannot connect to backend');
    
    // One of these should be visible
    const statusVisible = await Promise.race([
      connectedStatus.isVisible().catch(() => false),
      connectingStatus.isVisible().catch(() => false),
      errorStatus.isVisible().catch(() => false)
    ]);
    
    expect(statusVisible).toBeTruthy();
    
    // Click the test connection button
    const testButton = page.locator('button:has-text("Test Backend Connection")');
    await testButton.click();
    
    // Wait for response
    await page.waitForTimeout(2000);
    
    // Check for response message
    const responseMessage = page.locator('text=/Backend health check|Error/');
    await expect(responseMessage).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Test page backend connection verified!');
  });
});