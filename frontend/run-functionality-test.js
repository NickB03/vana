const { chromium } = require('playwright');

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const results = {
    passed: [],
    failed: [],
    total: 0
  };

  console.log('🧪 Running Vana Frontend Functionality Tests\n');
  
  try {
    // Test 1: Homepage loads
    console.log('Testing: Homepage loads...');
    await page.goto('http://localhost:5173');
    const title = await page.title();
    if (title.includes('Vana')) {
      results.passed.push('✅ Homepage loads with correct title');
    } else {
      results.failed.push(`❌ Homepage title incorrect: ${title}`);
    }
    results.total++;

    // Test 2: Main heading visible
    console.log('Testing: Main heading...');
    const heading = await page.locator('h1').first().textContent();
    if (heading && heading.includes('Hello')) {
      results.passed.push('✅ Main heading "Hello" is visible');
    } else {
      results.failed.push(`❌ Main heading not found or incorrect: ${heading}`);
    }
    results.total++;

    // Test 3: Greeting text
    console.log('Testing: Greeting text...');
    const greeting = await page.locator('text=How can I help you today?').isVisible();
    if (greeting) {
      results.passed.push('✅ Greeting text is visible');
    } else {
      results.failed.push('❌ Greeting text not found');
    }
    results.total++;

    // Test 4: Suggestion cards
    console.log('Testing: Suggestion cards...');
    const cards = await page.locator('[data-slot="card"]').count();
    if (cards === 4) {
      results.passed.push(`✅ All ${cards} suggestion cards are present`);
    } else {
      results.failed.push(`❌ Expected 4 suggestion cards, found ${cards}`);
    }
    results.total++;

    // Test 5: Input field
    console.log('Testing: Input field...');
    const input = await page.locator('textarea[placeholder="Enter a prompt here"]');
    const inputVisible = await input.isVisible();
    if (inputVisible) {
      await input.fill('Test message');
      const value = await input.inputValue();
      if (value === 'Test message') {
        results.passed.push('✅ Input field works correctly');
      } else {
        results.failed.push('❌ Input field does not accept text properly');
      }
    } else {
      results.failed.push('❌ Input field not visible');
    }
    results.total++;

    // Test 6: Send button
    console.log('Testing: Send button...');
    const sendButton = await page.locator('button:has(svg.lucide-send)');
    const sendVisible = await sendButton.isVisible();
    const sendEnabled = await sendButton.isEnabled();
    if (sendVisible && sendEnabled) {
      results.passed.push('✅ Send button is visible and enabled');
    } else {
      results.failed.push(`❌ Send button issue - Visible: ${sendVisible}, Enabled: ${sendEnabled}`);
    }
    results.total++;

    // Test 7: Header buttons
    console.log('Testing: Header buttons...');
    const historyBtn = await page.locator('button:has(svg.lucide-history)').isVisible();
    const docsBtn = await page.locator('button:has(svg.lucide-book-open)').isVisible();
    const settingsBtn = await page.locator('button:has(svg.lucide-settings)').isVisible();
    if (historyBtn && docsBtn && settingsBtn) {
      results.passed.push('✅ All header buttons are visible');
    } else {
      results.failed.push(`❌ Header buttons missing - History: ${historyBtn}, Docs: ${docsBtn}, Settings: ${settingsBtn}`);
    }
    results.total++;

    // Test 8: Chat page
    console.log('Testing: Chat page...');
    await page.goto('http://localhost:5173/chat');
    await page.waitForTimeout(2000);
    const chatTitle = await page.title();
    if (chatTitle.includes('Vana')) {
      results.passed.push('✅ Chat page loads successfully');
    } else {
      results.failed.push('❌ Chat page not loading properly');
    }
    results.total++;

    // Test 9: Responsive design
    console.log('Testing: Mobile responsiveness...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:5173');
    const mobileHeading = await page.locator('h1').first().isVisible();
    if (mobileHeading) {
      results.passed.push('✅ Mobile responsive design works');
    } else {
      results.failed.push('❌ Mobile view has issues');
    }
    results.total++;

    // Test 10: Performance
    console.log('Testing: Page load performance...');
    const startTime = Date.now();
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    if (loadTime < 5000) {
      results.passed.push(`✅ Page loads quickly (${loadTime}ms)`);
    } else {
      results.failed.push(`❌ Page load too slow (${loadTime}ms)`);
    }
    results.total++;

    // Test 11: Console errors
    console.log('Testing: Console errors...');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('hydration')) {
        errors.push(msg.text());
      }
    });
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    if (errors.length === 0) {
      results.passed.push('✅ No console errors detected');
    } else {
      results.failed.push(`❌ Console errors found: ${errors.join(', ')}`);
    }
    results.total++;

    // Test 12: Accessibility
    console.log('Testing: Accessibility...');
    const skipLink = await page.locator('text=Skip to main content').count();
    if (skipLink > 0) {
      results.passed.push('✅ Accessibility skip link present');
    } else {
      results.failed.push('❌ Missing accessibility skip link');
    }
    results.total++;

  } catch (error) {
    console.error('Test execution error:', error.message);
    results.failed.push(`❌ Test execution failed: ${error.message}`);
  } finally {
    await browser.close();
  }

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n✅ PASSED TESTS:');
  results.passed.forEach(test => console.log(`  ${test}`));
  
  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(test => console.log(`  ${test}`));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed.length} (${Math.round(results.passed.length/results.total*100)}%)`);
  console.log(`Failed: ${results.failed.length} (${Math.round(results.failed.length/results.total*100)}%)`);
  console.log('='.repeat(60));
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

runTests().catch(console.error);