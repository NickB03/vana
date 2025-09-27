const { chromium } = require('playwright');

async function testServerAccess() {
  console.log('🔍 Starting Playwright server accessibility test...\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test backend endpoints directly
  const endpoints = [
    { url: 'http://localhost:8000/health', expected: 200, name: 'Health Check' },
    { url: 'http://localhost:8000/list-apps', expected: 200, name: 'List Apps (ADK)' },
    { url: 'http://localhost:8000/api/chat', expected: 200, name: 'Chat API' },
    { url: 'http://localhost:8000/docs', expected: 200, name: 'API Documentation' },
  ];

  console.log('Testing Backend Endpoints:');
  console.log('=' .repeat(50));

  for (const endpoint of endpoints) {
    try {
      const response = await page.goto(endpoint.url, {
        timeout: 5000,
        waitUntil: 'domcontentloaded'
      });

      const status = response ? response.status() : 'NO RESPONSE';
      const success = status === endpoint.expected;
      const icon = success ? '✅' : '❌';

      console.log(`${icon} ${endpoint.name.padEnd(20)} - ${endpoint.url}`);
      console.log(`   Status: ${status} (Expected: ${endpoint.expected})`);

      if (!success && response) {
        const bodyText = await page.textContent('body').catch(() => 'Could not read body');
        console.log(`   Response: ${bodyText?.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name.padEnd(20)} - ${endpoint.url}`);
      console.log(`   Error: ${error.message}`);
    }
  }

  // Test frontend
  console.log('\n\nTesting Frontend:');
  console.log('=' .repeat(50));

  try {
    const response = await page.goto('http://localhost:3000', {
      timeout: 10000,
      waitUntil: 'networkidle'
    });

    if (response && response.ok()) {
      console.log('✅ Frontend is accessible at http://localhost:3000');

      // Check for console errors
      const consoleMessages = [];
      page.on('console', msg => consoleMessages.push(msg));

      // Wait a bit to collect any console messages
      await page.waitForTimeout(2000);

      const errors = consoleMessages.filter(msg => msg.type() === 'error');
      if (errors.length > 0) {
        console.log('\n⚠️  Console errors detected:');
        errors.forEach(err => console.log(`   - ${err.text()}`));
      }

      // Check if frontend can reach backend
      console.log('\n🔗 Testing Frontend-Backend Connection:');
      const apiCallResult = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:8000/health');
          return {
            ok: response.ok,
            status: response.status,
            body: await response.text()
          };
        } catch (error) {
          return { error: error.message };
        }
      });

      if (apiCallResult.error) {
        console.log(`❌ Frontend cannot reach backend: ${apiCallResult.error}`);
        console.log('   This might be a CORS issue or the backend is not running');
      } else {
        console.log(`✅ Frontend can reach backend - Status: ${apiCallResult.status}`);
      }

    } else {
      console.log('❌ Frontend is NOT accessible');
    }
  } catch (error) {
    console.log(`❌ Frontend error: ${error.message}`);
  }

  await browser.close();

  console.log('\n' + '=' .repeat(50));
  console.log('Test complete. Check results above for issues.');
}

testServerAccess().catch(console.error);