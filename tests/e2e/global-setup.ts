/**
 * Playwright Global Setup
 *
 * This file runs before all E2E tests and sets up the test environment.
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('[E2E Setup] Starting global setup...');

  // Set environment variables for the test run
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mock-project.supabase.co';
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock';

  console.log('[E2E Setup] Environment configured');
  console.log('[E2E Setup] Global setup complete');
}

export default globalSetup;
