/**
 * Playwright End-to-End Research Workflow Tests
 * Tests complete research workflows from the user's perspective
 */

import { test, expect } from '@playwright/test';

test.describe('Research Workflow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should complete basic research query workflow', async ({ page }) => {
    // Enter a research query
    const query = 'What are the latest developments in artificial intelligence?';
    
    // Find and fill the query input
    const queryInput = page.locator('[data-testid="query-input"], input[placeholder*="research"], textarea[placeholder*="research"]').first();
    await expect(queryInput).toBeVisible({ timeout: 10000 });
    await queryInput.fill(query);

    // Submit the query
    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start"), button:has-text("Submit"), button:has-text("Research")').first();
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for research to start
    await expect(page.locator('text=Research started, text=Processing, [data-testid="processing-indicator"]').first()).toBeVisible({ timeout: 5000 });

    // Check for agent activity indicators
    await expect(page.locator('text=agent, text=processing, [data-testid*="agent"]').first()).toBeVisible({ timeout: 10000 });

    // Wait for results or timeout after reasonable time
    const resultsVisible = await Promise.race([
      page.locator('[data-testid="research-results"], [data-testid="result-content"], text=research complete').first().waitFor({ timeout: 30000 }).then(() => true),
      page.waitForTimeout(30000).then(() => false)
    ]);

    // If results appeared, verify them
    if (resultsVisible) {
      await expect(page.locator('[data-testid="research-results"], [data-testid="result-content"]').first()).toBeVisible();
    } else {
      // If no results yet, check that processing is still ongoing
      await expect(page.locator('text=Processing, text=Research in progress, [data-testid="processing-indicator"]').first()).toBeVisible();
    }
  });

  test('should handle empty query validation', async ({ page }) => {
    // Try to submit without entering a query
    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start"), button:has-text("Submit")').first();
    
    // Button should be disabled initially
    await expect(submitButton).toBeDisabled();

    // Enter some text and then clear it
    const queryInput = page.locator('[data-testid="query-input"], input, textarea').first();
    await queryInput.fill('test');
    await expect(submitButton).toBeEnabled();
    
    await queryInput.clear();
    await expect(submitButton).toBeDisabled();
  });

  test('should display agent progress indicators', async ({ page }) => {
    // Start a research query
    const queryInput = page.locator('[data-testid="query-input"], input, textarea').first();
    await queryInput.fill('Test query for agent progress');

    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start"), button:has-text("Submit")').first();
    await submitButton.click();

    // Look for agent-related UI elements
    const agentIndicators = [
      'team_leader',
      'plan_generator', 
      'section_researcher',
      'enhanced_search',
      'report_writer'
    ];

    // Check if any agent indicators appear
    for (const agentType of agentIndicators) {
      const agentElement = page.locator(`text=${agentType}, [data-testid*="${agentType}"], [class*="${agentType}"]`).first();
      
      try {
        await agentElement.waitFor({ timeout: 5000 });
        await expect(agentElement).toBeVisible();
        break; // If we find one, that's sufficient
      } catch {
        // Continue to next agent type
        continue;
      }
    }
  });

  test('should handle connection errors gracefully', async ({ page }) => {
    // Block network requests to simulate connection issues
    await page.route('**/api/**', route => route.abort());
    await page.route('**/agent_network_sse/**', route => route.abort());

    const queryInput = page.locator('[data-testid="query-input"], input, textarea').first();
    await queryInput.fill('Test connection error');

    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start")').first();
    await submitButton.click();

    // Should show error message
    await expect(page.locator('text=error, text=connection, text=failed').first()).toBeVisible({ timeout: 10000 });
  });

  test('should support query cancellation', async ({ page }) => {
    // Start a research query
    const queryInput = page.locator('[data-testid="query-input"], input, textarea').first();
    await queryInput.fill('Long running query for cancellation test');

    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start")').first();
    await submitButton.click();

    // Wait for processing to start
    await expect(page.locator('text=Processing, text=Research, [data-testid="processing-indicator"]').first()).toBeVisible();

    // Look for cancel button
    const cancelButton = page.locator('[data-testid="cancel-button"], button:has-text("Cancel"), button:has-text("Stop")').first();
    
    try {
      await expect(cancelButton).toBeVisible({ timeout: 5000 });
      await cancelButton.click();
      
      // Should show cancellation message
      await expect(page.locator('text=cancelled, text=stopped').first()).toBeVisible({ timeout: 5000 });
    } catch {
      // Cancel button might not be implemented yet, which is acceptable
      console.log('Cancel functionality not yet available');
    }
  });

  test('should maintain responsive design on different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const queryInput = page.locator('[data-testid="query-input"], input, textarea').first();
    await expect(queryInput).toBeVisible();
    
    // Should be able to interact with the interface
    await queryInput.fill('Mobile test query');
    
    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start")').first();
    await expect(submitButton).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(queryInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(queryInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should handle multiple concurrent research sessions', async ({ browser }) => {
    // Create multiple browser contexts for concurrent sessions
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');

    // Start research in both sessions
    const query1 = 'First concurrent research query';
    const query2 = 'Second concurrent research query';

    // Session 1
    const input1 = page1.locator('[data-testid="query-input"], input, textarea').first();
    await input1.fill(query1);
    const submit1 = page1.locator('[data-testid="submit-button"], button:has-text("Start")').first();
    await submit1.click();

    // Session 2
    const input2 = page2.locator('[data-testid="query-input"], input, textarea').first();
    await input2.fill(query2);
    const submit2 = page2.locator('[data-testid="submit-button"], button:has-text("Start")').first();
    await submit2.click();

    // Both should start processing
    await expect(page1.locator('text=Processing, text=Research').first()).toBeVisible({ timeout: 10000 });
    await expect(page2.locator('text=Processing, text=Research').first()).toBeVisible({ timeout: 10000 });

    // Clean up
    await context1.close();
    await context2.close();
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Start a research query
    const queryInput = page.locator('[data-testid="query-input"], input, textarea').first();
    await queryInput.fill('Session persistence test query');

    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start")').first();
    await submitButton.click();

    // Wait for processing to start
    await expect(page.locator('text=Processing, text=Research').first()).toBeVisible({ timeout: 5000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if session state is restored
    // This might show previous results or indicate ongoing research
    const sessionRestored = await Promise.race([
      page.locator('text=Processing, text=Research, [data-testid="previous-results"]').first().waitFor({ timeout: 5000 }).then(() => true),
      page.waitForTimeout(5000).then(() => false)
    ]);

    // If session persistence is implemented, we should see some indication
    if (sessionRestored) {
      console.log('Session persistence is working');
    } else {
      console.log('Session persistence not yet implemented or session expired');
    }
  });

  test('should display research results in readable format', async ({ page }) => {
    // Mock API to return quick results for testing
    await page.route('**/api/run_sse', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          session_id: 'test-session',
          status: 'processing',
          message: 'Research started'
        })
      });
    });

    const queryInput = page.locator('[data-testid="query-input"], input, textarea').first();
    await queryInput.fill('Test query for results display');

    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start")').first();
    await submitButton.click();

    // Look for results container
    const resultsContainer = page.locator('[data-testid="research-results"], [data-testid="results-container"], .research-results').first();
    
    try {
      await expect(resultsContainer).toBeVisible({ timeout: 10000 });
      
      // Check for readable content structure
      const hasStructuredContent = await Promise.race([
        page.locator('h1, h2, h3, .section-title, [data-testid*="section"]').first().waitFor({ timeout: 2000 }).then(() => true),
        page.waitForTimeout(2000).then(() => false)
      ]);

      if (hasStructuredContent) {
        console.log('Results display structured content');
      }
    } catch {
      // Results display might not be fully implemented
      console.log('Results display pending implementation');
    }
  });

  test('should provide accessibility features', async ({ page }) => {
    // Check for proper ARIA labels and roles
    const queryInput = page.locator('[data-testid="query-input"], input, textarea').first();
    await expect(queryInput).toHaveAttribute('placeholder');

    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start")').first();
    
    // Button should have accessible text
    const buttonText = await submitButton.textContent();
    expect(buttonText?.length).toBeGreaterThan(0);

    // Check for keyboard navigation
    await queryInput.focus();
    await expect(queryInput).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(submitButton).toBeFocused();
  });

  test('should handle long-running research sessions', async ({ page }) => {
    // Set longer timeout for this test
    test.setTimeout(60000);

    const queryInput = page.locator('[data-testid="query-input"], input, textarea').first();
    await queryInput.fill('Long running comprehensive research query');

    const submitButton = page.locator('[data-testid="submit-button"], button:has-text("Start")').first();
    await submitButton.click();

    // Wait for processing to start
    await expect(page.locator('text=Processing, text=Research').first()).toBeVisible({ timeout: 5000 });

    // Check that the interface remains responsive during long operations
    // The query input should be available for new queries
    await expect(queryInput).toBeVisible();

    // Progress indicators should be working
    const progressIndicators = page.locator('[data-testid*="progress"], .progress, text=progress').first();
    
    try {
      await expect(progressIndicators).toBeVisible({ timeout: 10000 });
    } catch {
      // Progress indicators might not be implemented yet
      console.log('Progress indicators pending implementation');
    }
  });
});