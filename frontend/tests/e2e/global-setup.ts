import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E Test Global Setup...');
  
  // Wait for servers to be ready
  console.log('⏳ Waiting for servers to be ready...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Check backend health
    console.log('🔍 Checking backend health...');
    const response = await fetch('http://localhost:8000/health');
    if (response.ok) {
      console.log('✅ Backend server is healthy');
    } else {
      throw new Error('Backend server health check failed');
    }
    
    // Check frontend
    console.log('🔍 Checking frontend...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    console.log('✅ Frontend server is accessible');
    
  } catch (error) {
    console.error('❌ Server setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎯 Global setup complete!');
}

export default globalSetup;