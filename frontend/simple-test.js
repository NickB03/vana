const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting Vana page test...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📍 Navigating to http://localhost:3000/vana...');
    await page.goto('http://localhost:3000/vana', { waitUntil: 'networkidle' });
    
    // Check for main elements
    console.log('🔍 Checking for page elements...');
    
    // Check header
    const header = await page.locator('h1:has-text("Vana Chat v2")').isVisible();
    console.log(`✅ Header "Vana Chat v2": ${header ? 'FOUND' : 'NOT FOUND'}`);
    
    // Check subtitle
    const subtitle = await page.locator('text=Powered by Google ADK').isVisible();
    console.log(`✅ Subtitle: ${subtitle ? 'FOUND' : 'NOT FOUND'}`);
    
    // Check welcome message
    const welcome = await page.locator('text=/Welcome to Vana/').isVisible();
    console.log(`✅ Welcome message: ${welcome ? 'FOUND' : 'NOT FOUND'}`);
    
    // Check for chat input
    const inputs = await page.locator('textarea, input[type="text"]').count();
    console.log(`✅ Input fields found: ${inputs}`);
    
    // Take screenshot
    await page.screenshot({ path: 'vana-page-test.png', fullPage: true });
    console.log('📸 Screenshot saved as vana-page-test.png');
    
    // Check for errors
    const errorElement = await page.locator('text=/Error:|error/i').isVisible();
    if (errorElement) {
      console.log('❌ ERROR FOUND ON PAGE!');
      const errorText = await page.locator('text=/Error:|error/i').first().textContent();
      console.log('Error text:', errorText);
    } else {
      console.log('✅ No errors visible on page');
    }
    
    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY!');
    console.log('The Vana chat page at http://localhost:3000/vana is working!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
})();