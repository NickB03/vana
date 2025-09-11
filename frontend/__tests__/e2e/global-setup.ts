/**
 * Playwright Global Setup
 * 
 * Configures the testing environment before running E2E tests
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting E2E test environment setup...');

  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for frontend to be ready
    console.log('Waiting for frontend to be ready...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for backend to be ready
    console.log('Waiting for backend to be ready...');
    const backendHealthy = await page.evaluate(async () => {
      try {
        const response = await fetch('http://localhost:8000/health');
        return response.ok;
      } catch {
        return false;
      }
    });

    if (!backendHealthy) {
      throw new Error('Backend is not healthy');
    }

    console.log('E2E test environment is ready!');
  } catch (error) {
    console.error('Failed to setup E2E test environment:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;