import { Page, expect } from '@playwright/test';
import { UI_SELECTORS, TIMEOUTS } from './test-data';

/**
 * Test Helper Utilities
 *
 * Provides reusable helper functions for E2E tests:
 * - Authentication helpers
 * - Chat interaction helpers
 * - Artifact verification helpers
 * - Wait and retry utilities
 *
 * NOTE: API mocks are set up by the base-test.ts fixture BEFORE navigation.
 * Do not set up mocks inside navigation functions - they must be registered
 * before page.goto() is called.
 */

/**
 * Navigate to the application and wait for it to load
 *
 * IMPORTANT: API mocks must be set up BEFORE calling this function.
 * Use the `mockedPage` fixture from base-test.ts or call setupMockedPage()
 * in your test's beforeEach hook before any navigation.
 *
 * Uses ?skipLanding=true to bypass the landing page animation and
 * ?skipTour=true to prevent the onboarding tour dialog from appearing.
 * This is the most reliable approach for E2E tests as it doesn't depend
 * on scroll-based transitions that can be flaky in headless Chrome.
 */
export async function navigateToApp(page: Page): Promise<void> {
	console.log('[E2E Nav] Starting navigateToApp with skipLanding=true and skipTour=true');

	// Navigate with skipLanding and skipTour params to bypass landing animation and tour dialog
	await page.goto('/?skipLanding=true&skipTour=true', { waitUntil: 'domcontentloaded' });
	console.log('[E2E Nav] Page navigation complete');

	// Wait briefly for React to hydrate
	await page.waitForTimeout(300);

	// Finally, wait for the chat input to be visible as the signal that the app
	// interface is ready for interaction.
	console.log('[E2E Nav] Waiting for chat input to be visible');
	const messageInput = page.locator(UI_SELECTORS.chat.messageInput).first();
	await messageInput.waitFor({ state: 'visible', timeout: TIMEOUTS.streaming });
	console.log('[E2E Nav] Chat input visible, navigation complete');
}

/**
 * Continue as guest (skip authentication)
 */
export async function continueAsGuest(page: Page): Promise<void> {
  await navigateToApp(page);

  // Look for "Continue as Guest" button or similar
  const guestButton = page.locator(UI_SELECTORS.auth.continueAsGuestButton).first();

  if (await guestButton.isVisible({ timeout: TIMEOUTS.short })) {
    await guestButton.click();
    await page.waitForLoadState('networkidle');
  }
}

/**
 * Send a chat message and wait for response
 */
export async function sendChatMessage(
  page: Page,
  message: string,
  waitForResponse: boolean = true
): Promise<void> {
  // Find message input (try multiple selectors)
  const messageInput = page.locator(UI_SELECTORS.chat.messageInput).first();
  await messageInput.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });

  // Type the message
  await messageInput.fill(message);

  // Find and click send button
  const sendButton = page.locator(UI_SELECTORS.chat.sendButton).first();
  await sendButton.click();

  if (waitForResponse) {
    // Wait for the user message to appear in the chat
    await expect(page.locator(`text=${message.substring(0, 50)}`).first()).toBeVisible({
      timeout: TIMEOUTS.medium,
    });

    // Wait for assistant response to start streaming (look for streaming indicator or new message)
    await page.waitForTimeout(2000); // Give streaming a moment to start
  }
}

/**
 * Wait for a streaming response to complete
 *
 * IMPORTANT: This function handles two scenarios:
 * 1. Streaming indicator appears → wait for it to disappear
 * 2. No indicator (fast mock response) → return immediately with brief settle time
 *
 * The previous implementation had a bug where waitFor({ state: 'hidden' })
 * would wait 30s even when no indicator existed, because Playwright waits
 * for the element to exist AND be hidden.
 */
export async function waitForStreamingComplete(page: Page): Promise<void> {
  console.log('[E2E Wait] Starting waitForStreamingComplete');

  // Check if streaming indicator exists at all
  const streamingIndicator = page.locator('text=/thinking|generating|typing/i');

  // Give a brief moment for any indicator to appear
  await page.waitForTimeout(500);

  // Check if indicator is currently visible
  const indicatorCount = await streamingIndicator.count();
  console.log('[E2E Wait] Streaming indicator count:', indicatorCount);

  if (indicatorCount === 0) {
    // No streaming indicator = response already complete (fast mock)
    // Just wait a brief moment for UI to settle
    console.log('[E2E Wait] No indicator found, returning early');
    await page.waitForTimeout(300);
    return;
  }

  // Indicator exists - wait for it to become hidden (streaming to complete)
  console.log('[E2E Wait] Indicator found, waiting for it to hide');
  try {
    await streamingIndicator.waitFor({ state: 'hidden', timeout: TIMEOUTS.streaming });
    console.log('[E2E Wait] Indicator hidden successfully');
  } catch {
    // If timeout, check if there's still an indicator visible
    // This could happen if a new streaming started mid-wait
    console.warn('[E2E Wait] Streaming indicator timeout - checking final state');
  }
}

/**
 * Check if an artifact is visible on the page
 *
 * NOTE: Artifacts appear as cards in the chat with an "Open" button.
 * The main artifact canvas (data-testid="artifact-container") only renders
 * after the user clicks "Open". This helper checks for EITHER:
 * 1. Artifact cards (ArtifactCard components with "Open" button), OR
 * 2. The artifact canvas container (for already-opened artifacts)
 */
export async function isArtifactVisible(page: Page): Promise<boolean> {
  // Check for artifact cards first (primary indicator)
  const artifactCard = page.locator(UI_SELECTORS.artifact.openButton).first();
  const hasCard = await artifactCard.isVisible({ timeout: TIMEOUTS.short }).catch(() => false);

  if (hasCard) {
    return true;
  }

  // Fallback: check for already-opened artifact canvas
  const artifactContainer = page.locator(UI_SELECTORS.artifact.container).first();
  return artifactContainer.isVisible({ timeout: TIMEOUTS.short }).catch(() => false);
}

/**
 * Wait for artifact to be generated and rendered
 *
 * NOTE: Artifacts appear as cards in the chat first. This function:
 * 1. Waits for the artifact card (with "Open" button) to appear
 * 2. Clicks "Open" to show the artifact canvas
 * 3. Waits for the canvas container to be visible
 * 4. Optionally waits for iframe content to load
 */
export async function waitForArtifact(page: Page): Promise<void> {
  // First, wait for artifact card to appear (primary indicator)
  const openButton = page.locator(UI_SELECTORS.artifact.openButton).first();
  await openButton.waitFor({ state: 'visible', timeout: TIMEOUTS.streaming });

  // Click "Open" to show the artifact canvas
  await openButton.click();
  await page.waitForTimeout(500); // Wait for panel animation

  // Now wait for artifact container to appear
  const artifactContainer = page.locator(UI_SELECTORS.artifact.container).first();
  await artifactContainer.waitFor({ state: 'visible', timeout: TIMEOUTS.medium });

  // Wait for iframe to load (if it's a rendered artifact)
  const iframe = page.locator(UI_SELECTORS.artifact.iframe).first();
  if (await iframe.isVisible({ timeout: TIMEOUTS.short })) {
    await iframe.waitFor({ state: 'attached', timeout: TIMEOUTS.medium });
  }
}

/**
 * Open artifact in canvas/panel view
 */
export async function openArtifact(page: Page): Promise<void> {
  const openButton = page.locator(UI_SELECTORS.artifact.openButton).first();
  if (await openButton.isVisible({ timeout: TIMEOUTS.short })) {
    await openButton.click();
    await page.waitForTimeout(1000); // Wait for panel animation
  }
}

/**
 * Click the "New Chat" button
 */
export async function startNewChat(page: Page): Promise<void> {
  const newChatButton = page.locator(UI_SELECTORS.chat.newChatButton).first();
  await newChatButton.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Check if rate limit message is displayed
 */
export async function isRateLimited(page: Page): Promise<boolean> {
  const rateLimitMessage = page.locator(UI_SELECTORS.rateLimit.message);
  return rateLimitMessage.isVisible({ timeout: TIMEOUTS.short });
}

/**
 * Get the count of messages in the chat
 */
export async function getMessageCount(page: Page): Promise<number> {
  // Count message elements (adjust selector based on actual implementation)
  const messages = page.locator('[data-testid="chat-message"], .message, [role="article"]');
  return messages.count();
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  fullPage: boolean = false
): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage,
  });
}

/**
 * Wait for navigation to complete
 */
export async function waitForNavigation(page: Page, timeout: number = TIMEOUTS.medium): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Retry an action with exponential backoff
 */
export async function retryWithBackoff<T>(
  action: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry failed');
}

/**
 * Clear local storage and cookies
 *
 * IMPORTANT: This function avoids unnecessary navigation when possible.
 * Navigation to '/' is only done if storage isn't accessible from the current page.
 * This prevents double navigation when used with continueAsGuest() or navigateToApp().
 */
export async function clearBrowserData(page: Page): Promise<void> {
  await page.context().clearCookies();

  // Try to clear storage without navigation first
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    // Storage cleared successfully, no navigation needed
    return;
  } catch {
    // Storage not accessible - need to navigate to a valid context first
  }

  // Only navigate if storage wasn't accessible (about:blank or restricted context)
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  } catch (error) {
    // Navigation might fail, but we'll try to clear storage anyway
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Navigation to '/' failed during clearBrowserData. Storage clearing may be incomplete. Error: ${errorMessage}`);
  }

  // Try clearing storage again after navigation
  try {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  } catch (error) {
    // Storage still not accessible - this is expected for about:blank pages
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Info: Could not clear browser storage. Error: ${errorMessage}`);
  }
}
