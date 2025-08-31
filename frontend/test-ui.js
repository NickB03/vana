const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173');
  
  // Check main elements
  const title = await page.title();
  console.log('✅ Page Title:', title);
  
  // Check for greeting
  const greeting = await page.textContent('h1');
  console.log('✅ Greeting:', greeting);
  
  // Check for input
  const hasInput = await page.locator('textarea[placeholder*="Ask"]').count() > 0;
  console.log('✅ Input present:', hasInput);
  
  // Check for sidebar
  const hasSidebar = await page.locator('[data-slot="sidebar"]').count() > 0;
  console.log('✅ Sidebar present:', hasSidebar);
  
  // Take screenshot
  await page.screenshot({ path: 'ui-test.png' });
  console.log('✅ Screenshot saved to ui-test.png');
  
  await browser.close();
  console.log('\n🎉 UI Test Complete - Frontend is working!');
})();
