import { test } from '@playwright/test';

test('Debug height layout issues', async ({ page }) => {
  await page.goto('http://localhost:3000/chat');
  await page.waitForTimeout(2000);
  
  // Get viewport dimensions
  const viewportSize = page.viewportSize();
  console.log('Viewport size:', viewportSize);
  
  // Take a full page screenshot to see the current layout
  await page.screenshot({ 
    path: '/Users/nick/Development/vana/debug-height-full.png', 
    fullPage: true 
  });
  
  // Take a viewport-only screenshot
  await page.screenshot({ 
    path: '/Users/nick/Development/vana/debug-height-viewport.png', 
    fullPage: false 
  });
  
  // Get dimensions of key elements
  const chatInterface = await page.$('[data-testid="chat-interface"]');
  if (chatInterface) {
    const chatBox = await chatInterface.boundingBox();
    console.log('Chat interface dimensions:', chatBox);
  }
  
  // Check if input is visible in viewport
  const inputField = await page.$('textarea, input[type="text"]');
  if (inputField) {
    const inputBox = await inputField.boundingBox();
    const isInputVisible = inputBox && inputBox.y < (viewportSize?.height || 900);
    console.log('Input field dimensions:', inputBox);
    console.log('Is input visible in viewport?', isInputVisible);
  }
  
  // Get page scroll height vs viewport height
  const scrollInfo = await page.evaluate(() => {
    return {
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
      scrollTop: document.documentElement.scrollTop,
      bodyHeight: document.body.offsetHeight
    };
  });
  console.log('Scroll info:', scrollInfo);
  
  // Check main container height
  const mainElement = await page.$('main');
  if (mainElement) {
    const mainBox = await mainElement.boundingBox();
    console.log('Main container dimensions:', mainBox);
  }
  
  console.log('Screenshots saved');
});