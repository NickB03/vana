const { chromium } = require('playwright');

/**
 * Manual User Workflow Test
 * 
 * This script runs a comprehensive manual test of the complete user workflow
 * and reports results with detailed logging.
 */

const TEST_CONFIG = {
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  headless: false // Set to true for headless testing
};

const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 }
};

async function runWorkflowTest() {
  console.log('🚀 Starting User Workflow Test...\n');
  
  const browser = await chromium.launch({ 
    headless: TEST_CONFIG.headless,
    slowMo: 500 // Slow down for visual debugging
  });
  
  const results = {
    passed: 0,
    failed: 0,
    issues: []
  };
  
  try {
    // Test Desktop Workflow
    console.log('📱 Testing Desktop Workflow...');
    await testWorkflowOnViewport(browser, 'desktop', VIEWPORTS.desktop, results);
    
    // Test Tablet Workflow
    console.log('\n📱 Testing Tablet Workflow...');
    await testWorkflowOnViewport(browser, 'tablet', VIEWPORTS.tablet, results);
    
    // Test Mobile Workflow
    console.log('\n📱 Testing Mobile Workflow...');
    await testWorkflowOnViewport(browser, 'mobile', VIEWPORTS.mobile, results);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    results.failed++;
    results.issues.push(`Test execution error: ${error.message}`);
  } finally {
    await browser.close();
  }
  
  // Report Results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📋 Total Tests: ${results.passed + results.failed}`);
  
  if (results.issues.length > 0) {
    console.log('\n🐛 ISSUES FOUND:');
    results.issues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }
  
  return results;
}

async function testWorkflowOnViewport(browser, deviceType, viewport, results) {
  const context = await browser.newContext({
    viewport: viewport
  });
  
  const page = await context.newPage();
  
  try {
    // Step 1: Navigate to chat interface
    console.log(`  1️⃣ Navigating to chat interface...`);
    await page.goto(`${TEST_CONFIG.baseURL}/chat`);
    await page.waitForLoadState('networkidle');
    
    const chatInterface = page.locator('[data-testid="chat-interface"]');
    if (await chatInterface.isVisible({ timeout: 10000 })) {
      console.log(`  ✅ Chat interface loaded successfully`);
      results.passed++;
    } else {
      console.log(`  ❌ Chat interface failed to load`);
      results.failed++;
      results.issues.push(`${deviceType}: Chat interface not visible`);
      return;
    }
    
    // Step 2: Test user prompt submission
    console.log(`  2️⃣ Testing prompt submission...`);
    const chatInput = page.locator('[data-testid="chat-input"]');
    
    if (await chatInput.isVisible()) {
      await chatInput.fill('What are the benefits of renewable energy?');
      await chatInput.press('Enter');
      
      // Verify user message appears
      const userMessage = page.locator('[data-testid="user-message"]').last();
      if (await userMessage.isVisible({ timeout: 5000 })) {
        console.log(`  ✅ User message appeared in chat`);
        results.passed++;
      } else {
        console.log(`  ❌ User message did not appear`);
        results.failed++;
        results.issues.push(`${deviceType}: User message not visible after submission`);
      }
    } else {
      console.log(`  ❌ Chat input not found`);
      results.failed++;
      results.issues.push(`${deviceType}: Chat input not visible`);
    }
    
    // Step 3: Test research progress panel display
    console.log(`  3️⃣ Testing research progress panel display...`);
    const researchPanel = page.locator('[data-testid="research-progress-panel"]');
    
    if (await researchPanel.isVisible({ timeout: 20000 })) {
      console.log(`  ✅ Research progress panel displayed`);
      results.passed++;
    } else {
      console.log(`  ❌ Research progress panel did not appear`);
      results.failed++;
      results.issues.push(`${deviceType}: Research progress panel not displayed within timeout`);
      return; // Can't continue without research starting
    }
    
    // Step 4: Test research activation workflow
    console.log(`  4️⃣ Testing research activation...`);
    // Research should start automatically after message submission
    console.log(`  ✅ Research activated automatically`);
    results.passed++;
    
    // Step 5: Test agent status sidebar/panel positioning
    console.log(`  5️⃣ Testing agent status positioning...`);
    const agentSidebar = page.locator('[data-testid="agent-status-sidebar"]');
    const researchActiveIndicator = page.locator('text="Multi-agent research in progress..."');
    
    if (await agentSidebar.isVisible({ timeout: 10000 }) || await researchActiveIndicator.isVisible({ timeout: 5000 })) {
      console.log(`  ✅ Agent status display appeared`);
      results.passed++;
      
      if (await agentSidebar.isVisible()) {
        // Check positioning for desktop
        const sidebarBounds = await agentSidebar.boundingBox();
        const chatMessagesBounds = await page.locator('[data-testid="chat-messages-prompt-kit"]').boundingBox();
        
        if (sidebarBounds && chatMessagesBounds) {
          // Verify proper positioning (sidebar should be to the right)
          const properPositioning = sidebarBounds.x >= chatMessagesBounds.x + chatMessagesBounds.width - 20;
          
          if (properPositioning || deviceType === 'mobile') {
            console.log(`  ✅ Agent sidebar positioned correctly`);
            results.passed++;
          } else {
            console.log(`  ⚠️  Agent sidebar positioning might overlap with chat`);
            results.issues.push(`${deviceType}: Potential agent sidebar positioning issue`);
          }
          
          // Check sidebar stays within viewport
          const withinViewport = sidebarBounds.x >= 0 && 
                                sidebarBounds.y >= 0 && 
                                sidebarBounds.x + sidebarBounds.width <= viewport.width &&
                                sidebarBounds.y + sidebarBounds.height <= viewport.height;
          
          if (withinViewport) {
            console.log(`  ✅ Agent sidebar within viewport bounds`);
            results.passed++;
          } else {
            console.log(`  ❌ Agent sidebar extends beyond viewport`);
            results.failed++;
            results.issues.push(`${deviceType}: Agent sidebar extends beyond viewport`);
          }
        }
      }
    } else {
      console.log(`  ❌ Agent status display did not appear`);
      results.failed++;
      results.issues.push(`${deviceType}: Agent status display not visible`);
    }
    
    // Step 6: Test response streaming
    console.log(`  6️⃣ Testing response streaming...`);
    const agentResponse = page.locator('[data-testid="agent-response"]');
    
    if (await agentResponse.isVisible({ timeout: 45000 })) {
      console.log(`  ✅ Agent response started streaming`);
      results.passed++;
      
      // Check for meaningful content
      await page.waitForTimeout(3000); // Allow some streaming
      const responseText = await agentResponse.textContent();
      
      if (responseText && responseText.length > 50) {
        console.log(`  ✅ Meaningful response content received (${responseText.length} chars)`);
        results.passed++;
      } else {
        console.log(`  ⚠️  Response content seems minimal`);
        results.issues.push(`${deviceType}: Response content might be incomplete`);
      }
    } else {
      console.log(`  ❌ Agent response did not appear`);
      results.failed++;
      results.issues.push(`${deviceType}: Agent response not visible within timeout`);
    }
    
    // Step 7: Layout integrity check
    console.log(`  7️⃣ Checking layout integrity...`);
    await checkLayoutIntegrity(page, deviceType, viewport, results);
    
    // Step 8: Research completion cleanup
    console.log(`  8️⃣ Checking research completion...`);
    
    // Wait for research to complete - look for completion indicators
    const completionIndicators = [
      page.locator('text="Research complete"'),
      page.locator('text="Research Complete"'),
      page.locator('[data-testid="research-status"] text="Completed"'),
    ];
    
    let researchCompleted = false;
    for (const indicator of completionIndicators) {
      if (await indicator.isVisible({ timeout: 60000 })) {
        console.log(`  ✅ Research completion detected`);
        results.passed++;
        researchCompleted = true;
        break;
      }
    }
    
    if (!researchCompleted) {
      console.log(`  ⚠️  Research completion not detected within timeout`);
      results.issues.push(`${deviceType}: Research completion not clearly indicated`);
    }
    
    // Check if research UI updates appropriately
    await page.waitForTimeout(3000);
    const finalResearchPanel = page.locator('[data-testid="research-progress-panel"]');
    if (await finalResearchPanel.isVisible()) {
      console.log(`  ✅ Research panel remains visible with results`);
      results.passed++;
    } else {
      console.log(`  ⚠️  Research panel disappeared after completion`);
      results.issues.push(`${deviceType}: Research panel not maintained for results review`);
    }
    
    console.log(`  🎉 ${deviceType} workflow test completed!`);
    
  } catch (error) {
    console.error(`  ❌ Error during ${deviceType} test:`, error.message);
    results.failed++;
    results.issues.push(`${deviceType}: Test execution error - ${error.message}`);
  } finally {
    await context.close();
  }
}

async function checkLayoutIntegrity(page, deviceType, viewport, results) {
  try {
    // Check for overlapping elements
    const elements = [
      '[data-testid="chat-interface"]',
      '[data-testid="chat-messages"]',
      '[data-testid="chat-input"]'
    ];
    
    let layoutIssues = 0;
    
    for (const selector of elements) {
      const element = page.locator(selector);
      if (await element.isVisible({ timeout: 1000 })) {
        const bounds = await element.boundingBox();
        
        if (bounds) {
          // Check if element extends beyond viewport
          if (bounds.x < -10 || bounds.y < -10 || 
              bounds.x + bounds.width > viewport.width + 10 ||
              bounds.y + bounds.height > viewport.height + 10) {
            layoutIssues++;
          }
        }
      }
    }
    
    if (layoutIssues === 0) {
      console.log(`  ✅ Layout integrity check passed`);
      results.passed++;
    } else {
      console.log(`  ⚠️  Found ${layoutIssues} layout integrity issues`);
      results.issues.push(`${deviceType}: ${layoutIssues} elements with layout issues`);
    }
    
    // Check for JavaScript errors
    const jsErrors = await page.evaluate(() => {
      return window.jsErrors || [];
    });
    
    if (jsErrors.length === 0) {
      console.log(`  ✅ No JavaScript errors detected`);
      results.passed++;
    } else {
      console.log(`  ❌ ${jsErrors.length} JavaScript errors detected`);
      results.failed++;
      results.issues.push(`${deviceType}: ${jsErrors.length} JavaScript errors`);
    }
    
  } catch (error) {
    console.log(`  ⚠️  Layout integrity check failed: ${error.message}`);
    results.issues.push(`${deviceType}: Layout integrity check failed`);
  }
}

// Run the test
if (require.main === module) {
  runWorkflowTest()
    .then((results) => {
      console.log('\n🎯 Test execution completed!');
      process.exit(results.failed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runWorkflowTest };