/**
 * Manual Prompt-Kit Integration Test
 * Direct browser automation to test the new ChatPromptInput component
 */

const { chromium } = require('playwright');

async function testPromptKitIntegration() {
  const browser = await chromium.launch({ headless: false, devtools: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    tests: [],
    summary: { passed: 0, failed: 0, total: 0 }
  };

  const addResult = (testName, passed, message) => {
    results.tests.push({ testName, passed, message });
    results.summary.total++;
    if (passed) {
      results.summary.passed++;
      console.log(`✅ ${testName}: ${message}`);
    } else {
      results.summary.failed++;
      console.log(`❌ ${testName}: ${message}`);
    }
  };

  try {
    // Navigate to the chat page (now on port 3001)
    console.log('🚀 Starting Prompt-Kit Integration Test...');
    await page.goto('http://localhost:3001/chat', { waitUntil: 'networkidle', timeout: 30000 });

    // Test 1: Component Rendering
    try {
      await page.waitForSelector('textarea[aria-label="Message input"]', { timeout: 10000 });
      const textarea = await page.locator('textarea[aria-label="Message input"]');
      const sendButton = await page.locator('button[aria-label="Send message"]');
      const attachButton = await page.locator('button[aria-label="Attach file"]');
      
      const textareaVisible = await textarea.isVisible();
      const sendVisible = await sendButton.isVisible();
      const attachVisible = await attachButton.isVisible();
      
      if (textareaVisible && sendVisible && attachVisible) {
        addResult('Component Rendering', true, 'All main components (textarea, send button, attach button) are visible');
      } else {
        addResult('Component Rendering', false, `Missing components: textarea=${textareaVisible}, send=${sendVisible}, attach=${attachVisible}`);
      }
    } catch (error) {
      addResult('Component Rendering', false, `Error: ${error.message}`);
    }

    // Test 2: Text Input Functionality
    try {
      const textarea = page.locator('textarea[aria-label="Message input"]');
      await textarea.fill('Test message for input functionality');
      const value = await textarea.inputValue();
      
      if (value === 'Test message for input functionality') {
        addResult('Text Input', true, 'Text input works correctly');
      } else {
        addResult('Text Input', false, `Input value mismatch. Got: "${value}"`);
      }
    } catch (error) {
      addResult('Text Input', false, `Error: ${error.message}`);
    }

    // Test 3: Auto-resize Functionality
    try {
      const textarea = page.locator('textarea[aria-label="Message input"]');
      const initialHeight = await textarea.evaluate(el => el.clientHeight);
      
      // Add multiline content
      await textarea.fill('Line 1\nLine 2\nLine 3\nLine 4\nThis is a longer line to test auto-resize');
      await page.waitForTimeout(200);
      
      const expandedHeight = await textarea.evaluate(el => el.clientHeight);
      
      if (expandedHeight > initialHeight) {
        addResult('Auto-resize', true, `Height increased from ${initialHeight}px to ${expandedHeight}px`);
      } else {
        addResult('Auto-resize', false, `Height didn't increase: ${initialHeight}px vs ${expandedHeight}px`);
      }
    } catch (error) {
      addResult('Auto-resize', false, `Error: ${error.message}`);
    }

    // Test 4: Send Button State
    try {
      const sendButton = page.locator('button[aria-label="Send message"]');
      
      // Test disabled state with empty input
      await page.locator('textarea[aria-label="Message input"]').fill('');
      const disabledWhenEmpty = await sendButton.isDisabled();
      
      // Test enabled state with text
      await page.locator('textarea[aria-label="Message input"]').fill('Test message');
      const enabledWithText = !await sendButton.isDisabled();
      
      if (disabledWhenEmpty && enabledWithText) {
        addResult('Send Button State', true, 'Send button correctly disabled/enabled based on input');
      } else {
        addResult('Send Button State', false, `Button state incorrect: empty=${disabledWhenEmpty}, withText=${enabledWithText}`);
      }
    } catch (error) {
      addResult('Send Button State', false, `Error: ${error.message}`);
    }

    // Test 5: Enter Key Submit
    try {
      const textarea = page.locator('textarea[aria-label="Message input"]');
      await textarea.fill('Enter key test message');
      
      // Listen for potential API calls or state changes
      let submissionDetected = false;
      
      page.on('request', (request) => {
        if (request.method() === 'POST' && request.url().includes('/api')) {
          submissionDetected = true;
        }
      });
      
      await textarea.press('Enter');
      await page.waitForTimeout(500);
      
      const valueAfterEnter = await textarea.inputValue();
      const inputCleared = valueAfterEnter === '';
      
      if (inputCleared) {
        addResult('Enter Key Submit', true, 'Enter key cleared input (submission triggered)');
      } else {
        addResult('Enter Key Submit', false, `Input not cleared after Enter. Value: "${valueAfterEnter}"`);
      }
    } catch (error) {
      addResult('Enter Key Submit', false, `Error: ${error.message}`);
    }

    // Test 6: Shift+Enter for New Line
    try {
      const textarea = page.locator('textarea[aria-label="Message input"]');
      await textarea.fill('First line');
      await page.keyboard.press('Shift+Enter');
      await page.type('textarea[aria-label="Message input"]', 'Second line');
      
      const value = await textarea.inputValue();
      
      if (value.includes('\n') && value.includes('First line') && value.includes('Second line')) {
        addResult('Shift+Enter New Line', true, 'Shift+Enter correctly adds new line without submitting');
      } else {
        addResult('Shift+Enter New Line', false, `Unexpected value: "${value}"`);
      }
    } catch (error) {
      addResult('Shift+Enter New Line', false, `Error: ${error.message}`);
    }

    // Test 7: Research Mode Indicators
    try {
      const headerElements = await page.locator('text="Prompt-Kit Enhanced"').count();
      const researchElements = await page.locator('text="Research Active"').count();
      const chatInterface = await page.locator('text="Unified Multi-Agent Chat Interface"').count();
      
      if (headerElements > 0 && chatInterface > 0) {
        addResult('Research Mode Indicators', true, `Found header indicators: Prompt-Kit Enhanced=${headerElements > 0}, Chat Interface=${chatInterface > 0}`);
      } else {
        addResult('Research Mode Indicators', false, `Missing indicators: Prompt-Kit=${headerElements}, Interface=${chatInterface}`);
      }
    } catch (error) {
      addResult('Research Mode Indicators', false, `Error: ${error.message}`);
    }

    // Test 8: Mobile Responsiveness
    try {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);
      
      const textarea = page.locator('textarea[aria-label="Message input"]');
      const sendButton = page.locator('button[aria-label="Send message"]');
      
      const textareaVisible = await textarea.isVisible();
      const sendVisible = await sendButton.isVisible();
      
      // Test mobile interaction
      await textarea.fill('Mobile test message');
      await sendButton.click();
      
      const clearedAfterMobileSubmit = await textarea.inputValue() === '';
      
      if (textareaVisible && sendVisible && clearedAfterMobileSubmit) {
        addResult('Mobile Responsiveness', true, 'Components work correctly on mobile viewport');
      } else {
        addResult('Mobile Responsiveness', false, `Mobile issues: visible=${textareaVisible && sendVisible}, submit=${clearedAfterMobileSubmit}`);
      }
      
      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    } catch (error) {
      addResult('Mobile Responsiveness', false, `Error: ${error.message}`);
    }

    // Test 9: Accessibility Features
    try {
      const textarea = page.locator('textarea[aria-label="Message input"]');
      const sendButton = page.locator('button[aria-label="Send message"]');
      
      // Test focus management
      await textarea.focus();
      const textareaFocused = await textarea.evaluate(el => document.activeElement === el);
      
      await page.keyboard.press('Tab');
      const sendButtonFocused = await sendButton.evaluate(el => document.activeElement === el);
      
      // Test ARIA attributes
      const textareaAriaLabel = await textarea.getAttribute('aria-label');
      const sendButtonAriaLabel = await sendButton.getAttribute('aria-label');
      
      if (textareaFocused && sendButtonFocused && textareaAriaLabel && sendButtonAriaLabel) {
        addResult('Accessibility', true, 'Focus management and ARIA labels work correctly');
      } else {
        addResult('Accessibility', false, `A11y issues: focus=${textareaFocused && sendButtonFocused}, labels=${textareaAriaLabel && sendButtonAriaLabel}`);
      }
    } catch (error) {
      addResult('Accessibility', false, `Error: ${error.message}`);
    }

    // Test 10: Error Handling
    try {
      const textarea = page.locator('textarea[aria-label="Message input"]');
      
      // Test special characters
      const specialChars = '!@#$%^&*()_+-=[]{}|;\':",./<>?`~';
      await textarea.fill(specialChars);
      const specialValue = await textarea.inputValue();
      
      // Test very long input
      const longText = 'A'.repeat(1000);
      await textarea.fill(longText);
      const longValue = await textarea.inputValue();
      
      // Test whitespace-only input
      await textarea.fill('   \n\t  ');
      const sendButton = page.locator('button[aria-label="Send message"]');
      const disabledWithWhitespace = await sendButton.isDisabled();
      
      if (specialValue === specialChars && longValue === longText && disabledWithWhitespace) {
        addResult('Error Handling', true, 'Handles special chars, long text, and whitespace correctly');
      } else {
        addResult('Error Handling', false, `Issues with special=${specialValue === specialChars}, long=${longValue === longText}, whitespace=${disabledWithWhitespace}`);
      }
    } catch (error) {
      addResult('Error Handling', false, `Error: ${error.message}`);
    }

    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`📈 Total: ${results.summary.total}`);
    console.log(`🎯 Success Rate: ${Math.round((results.summary.passed / results.summary.total) * 100)}%`);

    return results;

  } catch (error) {
    console.error('❌ Test suite failed:', error);
    addResult('Test Suite', false, `Critical error: ${error.message}`);
  } finally {
    await browser.close();
  }

  return results;
}

// Run the test if called directly
if (require.main === module) {
  testPromptKitIntegration()
    .then((results) => {
      process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testPromptKitIntegration };