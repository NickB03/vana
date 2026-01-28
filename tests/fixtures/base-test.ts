/**
 * Base Test Fixture with API Mocking
 *
 * This module extends Playwright's base test to automatically set up
 * API mocks BEFORE any page navigation occurs. This is critical because
 * route handlers must be registered before the request is made.
 *
 * Usage: Import `test` and `expect` from this file instead of '@playwright/test'
 */

import { test as base, expect, Page } from '@playwright/test';
import { setupAPIMocks } from './api-mocks';

/**
 * Extended test fixture type with API mocking
 */
type MockedTestFixtures = {
  /** Page with API mocks pre-configured */
  mockedPage: Page;
};

/**
 * Base test with automatic API mocking
 *
 * The `mockedPage` fixture automatically sets up all API mocks before
 * the page is used, ensuring routes are registered before any navigation.
 */
export const test = base.extend<MockedTestFixtures>({
  mockedPage: async ({ page }, use) => {
    // Set up API mocks BEFORE any navigation
    // This is critical - routes must be registered before page.goto()
    if (process.env.CI) {
      await setupAPIMocks(page, { mockAll: true });
    }

    // Provide the page to the test
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright's `use` is not a React hook
    await use(page);

    // Cleanup: routes are automatically cleared when context closes
  },
});

export { expect };

/**
 * Helper to set up a clean test page with mocks
 * Use this in beforeEach when not using the mockedPage fixture
 */
export async function setupMockedPage(page: Page): Promise<void> {
  console.log('[E2E Setup] setupMockedPage called, CI env:', process.env.CI);
  if (process.env.CI) {
    console.log('[E2E Setup] CI detected, setting up API mocks');
    await setupAPIMocks(page, { mockAll: true });
  } else {
    console.log('[E2E Setup] CI not detected, skipping mocks');
  }
}
