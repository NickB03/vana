/**
 * Phase 1 E2E Tests - Content Creation & Research Specialists
 * 
 * Tests the functionality of Phase 1 specialists through the VANA UI
 * using Playwright for automated browser testing.
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds for complex operations
const BASE_URL = process.env.VANA_TEST_URL || 'http://localhost:5173';

// Helper functions
async function submitPrompt(page: Page, prompt: string) {
  const chatInput = page.locator('[data-testid="chat-input"], textarea, input[type="text"]').first();
  await chatInput.fill(prompt);
  
  // Find and click submit button
  const submitButton = page.locator('[data-testid="submit-button"], button[type="submit"], button:has-text("Send")').first();
  await submitButton.click();
  
  // Wait for response to start
  await page.waitForSelector('[data-testid="message"], .message, .response', { 
    state: 'visible',
    timeout: 5000 
  });
}

async function waitForResponse(page: Page, timeout = 20000) {
  // Wait for loading indicator to disappear
  const loadingIndicator = page.locator('[data-testid="loading"], .loading, .typing-indicator').first();
  try {
    await loadingIndicator.waitFor({ state: 'hidden', timeout: timeout });
  } catch {
    // Loading indicator might not be present
  }
  
  // Wait a bit more to ensure response is complete
  await page.waitForTimeout(1000);
}

async function getLastResponse(page: Page): Promise<string> {
  const messages = await page.locator('[data-testid="message"], .message, .response').all();
  const lastMessage = messages[messages.length - 1];
  return await lastMessage.textContent() || '';
}

// Test suites
test.describe('Phase 1: Content Creation Specialist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should create a technical report', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = 'Write a technical report about cloud security best practices. Include an executive summary and at least 3 main sections.';
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    
    // Verify response contains expected elements
    expect(response.toLowerCase()).toContain('executive summary');
    expect(response.toLowerCase()).toContain('cloud security');
    expect(response).toMatch(/#{1,3}\s+/); // Contains markdown headers
    expect(response.length).toBeGreaterThan(500); // Substantial content
    
    // Check for structured sections
    const sections = response.match(/#{2,3}\s+[^\n]+/g) || [];
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });

  test('should edit content for clarity', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = `Edit this paragraph for clarity: "The implementation of the system's architecture, which was designed to handle multiple concurrent requests, has been shown to demonstrate significant improvements in terms of the overall performance metrics that we measure."`;
    
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    
    // Verify editing was performed
    expect(response.length).toBeGreaterThan(10);
    expect(response).not.toContain('which was designed');
    expect(response.toLowerCase()).toContain('performance');
    
    // Should be more concise
    expect(response.length).toBeLessThan(150);
  });

  test('should generate a detailed outline', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = 'Generate a detailed outline for a white paper on AI ethics in healthcare';
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    
    // Check for outline structure
    expect(response).toMatch(/^[\s\S]*I\.|1\.|A\./m); // Outline numbering
    expect(response.toLowerCase()).toContain('ethics');
    expect(response.toLowerCase()).toContain('healthcare');
    
    // Verify depth (indentation or nested numbering)
    const hasIndentation = response.includes('    ') || response.includes('\t');
    const hasNestedNumbering = response.match(/1\.1|A\.1|i\.|a\./);
    expect(hasIndentation || hasNestedNumbering).toBeTruthy();
  });

  test('should format content as markdown', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = `Format this as markdown with a table of contents:
    
    Introduction to Testing
    This is the introduction paragraph.
    
    Test Types
    Unit tests verify individual components.
    Integration tests check component interactions.
    
    Best Practices
    Write tests first.
    Keep tests simple.`;
    
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    
    // Verify markdown formatting
    expect(response).toContain('# '); // Headers
    expect(response).toContain('## '); // Subheaders
    expect(response).toMatch(/\[.*\]\(#.*\)/); // TOC links
    expect(response.toLowerCase()).toContain('table of contents');
  });

  test('should check grammar and suggest improvements', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = 'Check the grammar in this text: "The team have been working hard on the project, but there progress has been slow do to technical challenges."';
    
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    
    // Verify grammar checking
    expect(response.toLowerCase()).toMatch(/grammar|correction|error/);
    expect(response).toMatch(/have been|has been/); // Subject-verb agreement
    expect(response).toMatch(/there|their/); // Common error
    expect(response).toMatch(/do to|due to/); // Common error
  });
});

test.describe('Phase 1: Research Specialist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should conduct comprehensive research', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = 'Research the latest developments in quantum computing error correction methods from the last 2 years';
    await submitPrompt(page, prompt);
    await waitForResponse(page, 25000); // Longer timeout for research
    
    const response = await getLastResponse(page);
    
    // Verify research elements
    expect(response.toLowerCase()).toContain('quantum');
    expect(response.toLowerCase()).toContain('error correction');
    expect(response).toMatch(/202[34]/); // Recent years
    expect(response.length).toBeGreaterThan(300); // Substantial research
    
    // Check for research indicators
    const hasFindings = response.toLowerCase().includes('findings') || 
                       response.toLowerCase().includes('research') ||
                       response.toLowerCase().includes('studies');
    expect(hasFindings).toBeTruthy();
  });

  test('should fact-check claims', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = 'Fact check: "The global electric vehicle market grew by 50% in 2023"';
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    
    // Verify fact-checking elements
    expect(response.toLowerCase()).toMatch(/verif|confirm|accurate|true|false|partial/);
    expect(response.toLowerCase()).toContain('electric vehicle');
    expect(response).toContain('2023');
    
    // Should include validation result
    const hasVerdict = response.toLowerCase().includes('verified') ||
                      response.toLowerCase().includes('unverified') ||
                      response.toLowerCase().includes('partially') ||
                      response.toLowerCase().includes('accurate');
    expect(hasVerdict).toBeTruthy();
  });

  test('should analyze source credibility', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = 'Analyze the credibility of these sources: nature.com, wikipedia.org, and personal-blog.com';
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    
    // Verify credibility analysis
    expect(response.toLowerCase()).toContain('credibility');
    expect(response.toLowerCase()).toContain('nature.com');
    expect(response.toLowerCase()).toContain('wikipedia');
    
    // Should differentiate between sources
    const hasScores = response.match(/\d{1,3}%/) || response.match(/\d{1,3}\/100/);
    const hasRatings = response.toLowerCase().includes('high') || 
                      response.toLowerCase().includes('medium') ||
                      response.toLowerCase().includes('low');
    expect(hasScores || hasRatings).toBeTruthy();
  });

  test('should synthesize research findings', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = 'Research and synthesize information about the environmental impact of data centers';
    await submitPrompt(page, prompt);
    await waitForResponse(page, 25000);
    
    const response = await getLastResponse(page);
    
    // Verify synthesis
    expect(response.toLowerCase()).toContain('data center');
    expect(response.toLowerCase()).toContain('environmental');
    
    // Check for synthesis indicators
    const hasSynthesis = response.toLowerCase().includes('summary') ||
                        response.toLowerCase().includes('conclusion') ||
                        response.toLowerCase().includes('overall') ||
                        response.toLowerCase().includes('key findings');
    expect(hasSynthesis).toBeTruthy();
    
    // Should have multiple points
    const bulletPoints = response.match(/[•\-\*]\s+/g) || [];
    const numberedPoints = response.match(/\d+\.\s+/g) || [];
    expect(bulletPoints.length + numberedPoints.length).toBeGreaterThan(2);
  });

  test('should generate proper citations', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    const prompt = 'Generate APA style citations for a research paper about climate change with at least 3 sources';
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    
    // Verify citation format
    expect(response).toMatch(/\(\d{4}\)/); // Year in parentheses
    expect(response).toContain('Retrieved from'); // APA style
    expect(response.toLowerCase()).toContain('reference');
    
    // Count citations (look for year patterns)
    const citations = response.match(/\(\d{4}\)/g) || [];
    expect(citations.length).toBeGreaterThanOrEqual(3);
  });
});

test.describe('Phase 1: Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should handle research-to-document workflow', async ({ page }) => {
    test.setTimeout(40000); // Extended timeout for complex workflow
    
    const prompt = 'Research the benefits of renewable energy and then write a short report about it with proper citations';
    await submitPrompt(page, prompt);
    await waitForResponse(page, 30000);
    
    const response = await getLastResponse(page);
    
    // Verify both research and document creation
    expect(response.toLowerCase()).toContain('renewable energy');
    expect(response.toLowerCase()).toContain('benefits');
    
    // Check for document structure
    expect(response).toMatch(/#{1,3}\s+/); // Headers
    expect(response.length).toBeGreaterThan(400); // Substantial content
    
    // Check for citations or sources
    const hasCitations = response.includes('Source') ||
                        response.includes('Reference') ||
                        response.includes('According to') ||
                        response.match(/\[\d+\]/) ||
                        response.match(/\(\d{4}\)/);
    expect(hasCitations).toBeTruthy();
  });

  test('should handle errors gracefully', async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT);
    
    // Test with extremely vague prompt
    const prompt = 'Do the thing with the stuff';
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    
    // Should still provide some response
    expect(response.length).toBeGreaterThan(20);
    
    // Should ask for clarification or provide general help
    const asksClarification = response.toLowerCase().includes('clarify') ||
                             response.toLowerCase().includes('specific') ||
                             response.toLowerCase().includes('help you with') ||
                             response.toLowerCase().includes('more details');
    expect(asksClarification).toBeTruthy();
  });
});

test.describe('Phase 1: Performance Tests', () => {
  test('should respond within acceptable time limits', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const startTime = Date.now();
    const prompt = 'Write a short paragraph about AI';
    
    await submitPrompt(page, prompt);
    await waitForResponse(page);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Should respond within 10 seconds for simple requests
    expect(responseTime).toBeLessThan(10000);
  });

  test('should handle multiple sequential requests', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    const prompts = [
      'What is machine learning?',
      'List 3 benefits of cloud computing',
      'Define artificial intelligence'
    ];
    
    for (const prompt of prompts) {
      await submitPrompt(page, prompt);
      await waitForResponse(page);
      
      const response = await getLastResponse(page);
      expect(response.length).toBeGreaterThan(20);
      
      // Small delay between requests
      await page.waitForTimeout(500);
    }
  });
});

// Accessibility tests
test.describe('Phase 1: Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Tab to input field
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Type using keyboard
    await page.keyboard.type('Test prompt');
    
    // Submit with Enter
    await page.keyboard.press('Enter');
    
    // Wait for response
    await waitForResponse(page);
    
    const response = await getLastResponse(page);
    expect(response.length).toBeGreaterThan(0);
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check for basic ARIA attributes
    const chatInput = page.locator('textarea, input[type="text"]').first();
    const ariaLabel = await chatInput.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});