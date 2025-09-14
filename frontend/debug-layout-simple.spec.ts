import { test, expect } from '@playwright/test';

test.describe('Layout Debug', () => {
  test('Debug chat layout with screenshot', async ({ page }) => {
    // Navigate to the chat page
    await page.goto('http://localhost:3000/chat');
    
    // Wait a bit for the page to load
    await page.waitForTimeout(2000);
    
    // Take a screenshot to see the current state
    await page.screenshot({ 
      path: '/Users/nick/Development/vana/debug-layout.png', 
      fullPage: true 
    });
    
    // Get the sidebar element 
    const sidebar = await page.$('[data-sidebar="sidebar"]');
    if (sidebar) {
      const sidebarBox = await sidebar.boundingBox();
      console.log('Sidebar dimensions:', sidebarBox);
    }
    
    // Get the main content area
    const mainContent = await page.$('main');
    if (mainContent) {
      const mainBox = await mainContent.boundingBox();
      console.log('Main content dimensions:', mainBox);
    }
    
    // Check for overlapping elements
    const chatInterface = await page.$('[data-testid="chat-interface"]');
    if (chatInterface) {
      const chatBox = await chatInterface.boundingBox();
      console.log('Chat interface dimensions:', chatBox);
    }
    
    console.log('Screenshot saved to /Users/nick/Development/vana/debug-layout.png');
  });
});