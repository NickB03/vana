const { chromium } = require('playwright');

/**
 * Debug User Workflow Test
 * 
 * This script helps debug the user workflow by taking screenshots
 * and providing detailed information about what's happening.
 */

async function debugWorkflow() {
  console.log('🔍 Starting Debug User Workflow Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,  // Always show browser for debugging
    slowMo: 1000      // Slow down for better observation
  });
  
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to chat interface
    console.log('1️⃣ Navigating to chat interface...');
    await page.goto('http://localhost:3000/chat');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of initial state
    await page.screenshot({ path: '/Users/nick/Development/vana/debug-initial-state.png', fullPage: true });
    console.log('📸 Screenshot saved: debug-initial-state.png');
    
    // Check what's visible
    const chatInterface = page.locator('[data-testid="chat-interface"]');
    console.log('Chat interface visible:', await chatInterface.isVisible());
    
    // Check for chat input
    const chatInput = page.locator('[data-testid="chat-input"]');
    console.log('Chat input visible:', await chatInput.isVisible());
    console.log('Chat input count:', await chatInput.count());
    
    if (await chatInput.count() === 0) {
      // Try alternative selectors
      const altInput1 = page.locator('textarea');
      const altInput2 = page.locator('[data-slot="textarea"]');
      console.log('Alternative textarea count:', await altInput1.count());
      console.log('Data-slot textarea count:', await altInput2.count());
      
      // List all textareas
      const allTextareas = await page.$$('textarea');
      console.log('All textareas found:', allTextareas.length);
      
      for (let i = 0; i < allTextareas.length; i++) {
        const attrs = await allTextareas[i].evaluate(el => {
          return {
            placeholder: el.placeholder,
            'data-testid': el.getAttribute('data-testid'),
            'data-slot': el.getAttribute('data-slot'),
            'aria-label': el.getAttribute('aria-label'),
            visible: el.offsetParent !== null
          };
        });
        console.log(`Textarea ${i}:`, attrs);
      }
    }
    
    await page.waitForTimeout(2000);
    
    // Step 2: Try to interact with input
    console.log('\n2️⃣ Attempting to interact with chat input...');
    
    const inputElement = await chatInput.first();
    if (await inputElement.isVisible()) {
      console.log('✅ Chat input is visible, attempting to fill...');
      
      // Focus and fill
      await inputElement.focus();
      await inputElement.fill('Debug test message - what are the benefits of renewable energy?');
      console.log('✅ Input filled with test message');
      
      // Take screenshot of filled input
      await page.screenshot({ path: '/Users/nick/Development/vana/debug-input-filled.png', fullPage: true });
      console.log('📸 Screenshot saved: debug-input-filled.png');
      
      // Check if message is in input
      const inputValue = await inputElement.inputValue();
      console.log('Input value:', inputValue);
      
      // Try to submit
      console.log('🚀 Attempting to submit message...');
      await inputElement.press('Enter');
      
      // Wait a moment and check for message
      await page.waitForTimeout(3000);
      
      // Take screenshot after submission
      await page.screenshot({ path: '/Users/nick/Development/vana/debug-after-submit.png', fullPage: true });
      console.log('📸 Screenshot saved: debug-after-submit.png');
      
      // Check for user message
      const userMessages = page.locator('[data-testid="user-message"]');
      const userMessageCount = await userMessages.count();
      console.log('User messages found:', userMessageCount);
      
      if (userMessageCount > 0) {
        const messageText = await userMessages.first().textContent();
        console.log('First user message content:', messageText);
      } else {
        // Check for any messages with different selectors
        const allMessages = page.locator('[data-testid*="message"]');
        const allMessageCount = await allMessages.count();
        console.log('All messages with "message" testid:', allMessageCount);
        
        // Check message container
        const messageContainer = page.locator('[data-testid="chat-messages-prompt-kit"]');
        console.log('Message container visible:', await messageContainer.isVisible());
        
        if (await messageContainer.isVisible()) {
          const containerContent = await messageContainer.textContent();
          console.log('Message container content:', containerContent?.substring(0, 200) + '...');
        }
      }
      
      // Wait a bit more and check for research panel
      console.log('\n3️⃣ Checking for research progress...');
      await page.waitForTimeout(5000);
      
      const researchPanel = page.locator('[data-testid="research-progress-panel"]');
      console.log('Research panel visible:', await researchPanel.isVisible());
      
      // Check for any research-related elements
      const researchElements = await page.$$('[data-testid*="research"], [class*="research"], text("research")');
      console.log('Research-related elements found:', researchElements.length);
      
      // Take final screenshot
      await page.screenshot({ path: '/Users/nick/Development/vana/debug-final-state.png', fullPage: true });
      console.log('📸 Screenshot saved: debug-final-state.png');
      
    } else {
      console.log('❌ Chat input not visible');
    }
    
    // Check console logs for errors
    console.log('\n📋 Browser Console Messages:');
    const logs = await page.evaluate(() => {
      const logs = [];
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      console.log = (...args) => {
        logs.push({ type: 'log', message: args.join(' ') });
        originalLog.apply(console, args);
      };
      
      console.error = (...args) => {
        logs.push({ type: 'error', message: args.join(' ') });
        originalError.apply(console, args);
      };
      
      console.warn = (...args) => {
        logs.push({ type: 'warn', message: args.join(' ') });
        originalWarn.apply(console, args);
      };
      
      return window.debugLogs || [];
    });
    
    if (logs.length > 0) {
      logs.forEach(log => {
        console.log(`[${log.type.toUpperCase()}] ${log.message}`);
      });
    } else {
      console.log('No console messages captured');
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Debug session complete. Check the screenshots for visual analysis.');
    console.log('Browser will remain open for manual inspection. Press Ctrl+C to close.');
    
    await page.waitForTimeout(30000); // Keep open for 30 seconds
    
  } catch (error) {
    console.error('❌ Debug session error:', error);
    await page.screenshot({ path: '/Users/nick/Development/vana/debug-error-state.png', fullPage: true });
    console.log('📸 Error screenshot saved: debug-error-state.png');
  } finally {
    await browser.close();
  }
}

// Run the debug
if (require.main === module) {
  debugWorkflow()
    .then(() => {
      console.log('🎯 Debug session completed!');
    })
    .catch((error) => {
      console.error('💥 Debug session failed:', error);
    });
}

module.exports = { debugWorkflow };