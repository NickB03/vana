import { test, expect } from '@playwright/test';

test('Debug chat layout issue', async ({ page }) => {
  // Navigate to the chat page
  await page.goto('http://localhost:3000/chat');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot to see the current state
  await page.screenshot({ 
    path: '/Users/nick/Development/vana/frontend/debug-layout.png', 
    fullPage: true 
  });
  
  // Get the sidebar dimensions
  const sidebar = page.locator('[data-sidebar="sidebar"]');
  const sidebarBox = await sidebar.boundingBox();
  console.log('Sidebar box:', sidebarBox);
  
  // Get the main content area (SidebarInset)
  const mainContent = page.locator('main');
  const mainBox = await mainContent.boundingBox();
  console.log('Main content box:', mainBox);
  
  // Get the chat interface container
  const chatInterface = page.locator('[data-testid="chat-interface"]');
  const chatBox = await chatInterface.boundingBox();
  console.log('Chat interface box:', chatBox);
  
  // Get the chat messages container
  const chatMessages = page.locator('.stickToBottom');
  if (await chatMessages.count() > 0) {
    const messagesBox = await chatMessages.first().boundingBox();
    console.log('Chat messages box:', messagesBox);
  }
  
  // Check if content is overlapping with sidebar
  if (sidebarBox && mainBox) {
    const isOverlapping = mainBox.x < (sidebarBox.x + sidebarBox.width);
    console.log('Is content overlapping with sidebar?', isOverlapping);
    console.log('Sidebar right edge:', sidebarBox.x + sidebarBox.width);
    console.log('Main content left edge:', mainBox.x);
  }
  
  // Get computed styles for debugging
  const rootStyles = await page.evaluate(() => {
    const root = document.querySelector('[class*="sidebar-wrapper"]');
    if (root) {
      const styles = window.getComputedStyle(root);
      return {
        display: styles.display,
        width: styles.width,
        height: styles.height,
        '--sidebar-width': styles.getPropertyValue('--sidebar-width')
      };
    }
    return null;
  });
  console.log('Root wrapper styles:', rootStyles);
  
  const mainStyles = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) {
      const styles = window.getComputedStyle(main);
      return {
        display: styles.display,
        width: styles.width,
        height: styles.height,
        marginLeft: styles.marginLeft,
        paddingLeft: styles.paddingLeft,
        position: styles.position,
        left: styles.left
      };
    }
    return null;
  });
  console.log('Main element styles:', mainStyles);
  
  const chatStyles = await page.evaluate(() => {
    const chat = document.querySelector('[data-testid="chat-interface"]');
    if (chat) {
      const styles = window.getComputedStyle(chat);
      return {
        display: styles.display,
        width: styles.width,
        height: styles.height,
        position: styles.position
      };
    }
    return null;
  });
  console.log('Chat interface styles:', chatStyles);
});