/**
 * MSW Browser Setup for E2E Tests
 *
 * This module sets up MSW in the browser context for Playwright E2E tests.
 * It intercepts network requests and returns mock responses.
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Create the service worker instance
export const worker = setupWorker(...handlers);

// Start function with error handling
export async function startMSW() {
  try {
    await worker.start({
      onUnhandledRequest: 'bypass', // Allow unhandled requests to pass through
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    });
    console.log('[MSW] Mock Service Worker started');
    return true;
  } catch (error) {
    console.error('[MSW] Failed to start:', error);
    return false;
  }
}

// Stop function for cleanup
export function stopMSW() {
  worker.stop();
  console.log('[MSW] Mock Service Worker stopped');
}
