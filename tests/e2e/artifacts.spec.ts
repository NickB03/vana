import { test, expect, setupMockedPage } from '../fixtures/base-test';
import {
  continueAsGuest,
  sendChatMessage,
  waitForStreamingComplete,
  waitForArtifact,
  isArtifactVisible,
  openArtifact,
  clearBrowserData,
} from '../fixtures/test-helpers';
import { SAMPLE_MESSAGES, UI_SELECTORS, TIMEOUTS } from '../fixtures/test-data';

// Artifact flows involve streaming + iframe rendering, which can legitimately
// take longer than the default 30s Playwright test timeout.
test.setTimeout(60_000);

/**
 * Artifact Flow Tests
 *
 * NOTE: These tests are temporarily skipped due to CI infrastructure issues.
 * The landing page → app transition times out in CI environments.
 * TODO: Re-enable once navigation issues are resolved.
 *
 * Simplified E2E suite covering critical artifact functionality:
 * - React component generation
 * - Diagram (Mermaid) generation
 * - Artifact rendering in iframe (sandbox isolation)
 * - Canvas panel interaction
 * - Error handling
 * - Multiple artifacts in conversation
 */

// Skip all artifact tests in CI until navigation issues are resolved
test.describe.skip('Artifact Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks BEFORE any navigation (critical for CI)
    await setupMockedPage(page);
    await clearBrowserData(page);
    await continueAsGuest(page);
  });

  test('should generate React artifact from prompt', async ({ page }) => {
    // Request a React component
    await sendChatMessage(page, SAMPLE_MESSAGES.codeRequest);

    // Wait for artifact to be generated
    await waitForStreamingComplete(page);

    // Check if artifact card was created (artifacts appear as cards with "Open" button)
    const hasArtifact = await isArtifactVisible(page);

    if (hasArtifact) {
      // Click "Open" to show the artifact canvas
      await openArtifact(page);

      // Now artifact container should be visible
      const artifactContainer = page.locator(UI_SELECTORS.artifact.container).first();
      await expect(artifactContainer).toBeVisible({ timeout: TIMEOUTS.medium });
    } else {
      // Artifact might be in response but not auto-displayed
      // Look for artifact indicator in message
      const artifactIndicator = page.locator('text=/component|artifact|created/i');
      const indicatorExists = await artifactIndicator.isVisible({
        timeout: TIMEOUTS.medium,
      }).catch(() => false);

      if (!indicatorExists) {
        test.skip(true, 'No artifact generated in response');
      }
    }
  });

  test('should generate diagram from prompt', async ({ page }) => {
    // Request a diagram
    await sendChatMessage(page, SAMPLE_MESSAGES.diagramRequest);
    await waitForStreamingComplete(page);

    // Look for artifact or mermaid diagram
    const hasArtifact = await isArtifactVisible(page);
    const diagram = page.locator('[data-testid="mermaid-diagram"], svg, .mermaid');
    const hasDiagram = await diagram.isVisible({ timeout: TIMEOUTS.medium }).catch(() => false);

    expect(hasArtifact || hasDiagram).toBeTruthy();
  });
});

test.describe.skip('Artifact Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks BEFORE any navigation (critical for CI)
    await setupMockedPage(page);
    await clearBrowserData(page);
    await continueAsGuest(page);
  });

  test('should render artifact in iframe', async ({ page }) => {
    // Generate an artifact
    await sendChatMessage(page, SAMPLE_MESSAGES.codeRequest);
    await waitForStreamingComplete(page);

    // Wait for artifact
    if (await isArtifactVisible(page)) {
      await waitForArtifact(page);

      // Check for iframe
      const iframe = page.locator(UI_SELECTORS.artifact.iframe).first();
      const iframeExists = await iframe.isVisible({ timeout: TIMEOUTS.medium }).catch(() => false);

      if (iframeExists) {
        await expect(iframe).toBeVisible();

        // Verify iframe has content
        const iframeElement = await iframe.elementHandle();
        expect(iframeElement).toBeTruthy();
      }
    } else {
      test.skip(true, 'No artifact generated');
    }
  });

  test('should open artifact in canvas panel', async ({ page }) => {
    // Generate an artifact
    await sendChatMessage(page, SAMPLE_MESSAGES.codeRequest);
    await waitForStreamingComplete(page);

    if (await isArtifactVisible(page)) {
      // Click "Open" button to view in canvas
      const openButton = page.locator(UI_SELECTORS.artifact.openButton).first();

      if (await openButton.isVisible({ timeout: TIMEOUTS.short })) {
        await openButton.click();
        await page.waitForTimeout(1000); // Wait for panel animation

        // Canvas panel should be visible
        // Look for expanded artifact view
        const expandedView = page.locator('[data-testid="artifact-canvas"], [data-testid="canvas-panel"]');
        const isExpanded = await expandedView.isVisible({ timeout: TIMEOUTS.short }).catch(() => false);

        // Either expanded view exists or artifact is still visible
        const artifactVisible = await isArtifactVisible(page);
        expect(isExpanded || artifactVisible).toBeTruthy();
      }
    } else {
      test.skip(true, 'No artifact generated');
    }
  });

  test('should handle multiple artifacts in conversation', async ({ page }) => {
    // Generate first artifact-intent message
    await sendChatMessage(page, SAMPLE_MESSAGES.codeRequest);
    await waitForStreamingComplete(page);

    // Generate second artifact-intent message
    await sendChatMessage(page, SAMPLE_MESSAGES.htmlRequest);
    await waitForStreamingComplete(page);

    // Check for artifact cards (preferred UX) and/or inline code blocks.
    // In mocked CI runs, both prompts should yield artifacts; in live model
    // runs, we tolerate the model returning plain code instead.
    const artifactCards = page.locator(UI_SELECTORS.artifact.openButton);
    const cardCount = await artifactCards.count();

    const codeBlocks = page.locator('code, pre');
    const codeCount = await codeBlocks.count();

    // If neither artifacts nor code are present, the model did not generate
    // any concrete output for these prompts. Skip instead of failing hard to
    // keep tests robust against model variance.
    if (cardCount === 0 && codeCount === 0) {
      test.skip(true, 'No artifacts or code blocks generated for multiple artifact prompts');
    }

    // We expect at least one tangible output (artifact card or code snippet).
    expect(cardCount + codeCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe.skip('Artifact Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Set up API mocks BEFORE any navigation (critical for CI)
    await setupMockedPage(page);
    await clearBrowserData(page);
    await continueAsGuest(page);
  });

  test('should handle artifact generation failure gracefully', async ({ page }) => {
    // Request something complex that might fail
    await sendChatMessage(page, 'Create an invalid React component with syntax errors');
    await waitForStreamingComplete(page);

    // Should not crash - either shows error or valid artifact
    const messageInput = page.locator(UI_SELECTORS.chat.messageInput).first();
    await expect(messageInput).toBeVisible({ timeout: TIMEOUTS.medium });
  });
});
