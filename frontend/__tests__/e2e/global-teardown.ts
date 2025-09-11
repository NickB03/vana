/**
 * Playwright Global Teardown
 * 
 * Cleans up after E2E tests complete
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('E2E test environment cleanup completed.');
}

export default globalTeardown;