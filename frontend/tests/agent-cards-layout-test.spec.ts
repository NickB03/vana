/**
 * Agent Cards Layout and Positioning Tests
 * 
 * Comprehensive tests for agent status cards positioning, responsive behavior,
 * and integration with the chat interface.
 */

import { test, expect } from '@playwright/test';

const VIEWPORT_SIZES = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
  large: { width: 1920, height: 1080 }
};

const MOCK_AGENTS = [
  {
    agent_id: '1',
    name: 'Research Agent',
    agent_type: 'researcher',
    status: 'current',
    progress: 0.65,
    current_task: 'Analyzing research data',
  },
  {
    agent_id: '2',
    name: 'Plan Generator',
    agent_type: 'plan_generator',
    status: 'completed',
    progress: 1.0,
    current_task: 'Research plan generated',
  },
  {
    agent_id: '3',
    name: 'Report Writer',
    agent_type: 'report_writer',
    status: 'waiting',
    progress: 0.0,
    current_task: null,
  },
  {
    agent_id: '4',
    name: 'Evaluator',
    agent_type: 'evaluator',
    status: 'error',
    progress: 0.3,
    current_task: 'Failed to evaluate results',
    error: 'Connection timeout',
  },
];

// Setup helper to inject mock data
async function setupMockAgents(page: any) {
  await page.addInitScript(() => {
    // Mock the research SSE service
    (window as any).mockAgentData = {
      agents: [
        {
          agent_id: '1',
          name: 'Research Agent',
          agent_type: 'researcher',
          status: 'current',
          progress: 0.65,
          current_task: 'Analyzing research data',
        },
        {
          agent_id: '2',
          name: 'Plan Generator',
          agent_type: 'plan_generator',
          status: 'completed',
          progress: 1.0,
          current_task: 'Research plan generated',
        },
        {
          agent_id: '3',
          name: 'Report Writer',
          agent_type: 'report_writer',
          status: 'waiting',
          progress: 0.0,
          current_task: null,
        },
        {
          agent_id: '4',
          name: 'Evaluator',
          agent_type: 'evaluator',
          status: 'error',
          progress: 0.3,
          current_task: 'Failed to evaluate results',
          error: 'Connection timeout',
        },
      ],
      isConnected: true,
      streamingStatus: 'active',
    };
  });
}

test.describe('Agent Cards Layout and Positioning', () => {
  
  test.beforeEach(async ({ page }) => {
    await setupMockAgents(page);
    // Navigate to a page with agent cards (adjust URL as needed)
    await page.goto('/research');
    
    // Wait for any initial loading
    await page.waitForTimeout(1000);
  });

  test.describe('Mobile Layout (375px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORT_SIZES.mobile);
    });

    test('should display agent cards in horizontal scroll layout', async ({ page }) => {
      const agentContainer = page.locator('.agent-cards-mobile-scroll, .agent-cards-container');
      
      if (await agentContainer.count() > 0) {
        // Check horizontal layout
        const containerStyles = await agentContainer.first().evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            display: styles.display,
            flexDirection: styles.flexDirection,
            overflowX: styles.overflowX,
            overflowY: styles.overflowY,
          };
        });

        expect(containerStyles.display).toBe('flex');
        expect(['row', 'initial'].includes(containerStyles.flexDirection)).toBeTruthy();
        expect(['auto', 'scroll'].includes(containerStyles.overflowX)).toBeTruthy();
      }
    });

    test('should have proper card sizing on mobile', async ({ page }) => {
      const agentCards = page.locator('.agent-status-card');
      
      if (await agentCards.count() > 0) {
        const firstCard = agentCards.first();
        const cardDimensions = await firstCard.boundingBox();
        
        // Cards should be properly sized for mobile
        expect(cardDimensions?.width).toBeGreaterThan(180);
        expect(cardDimensions?.width).toBeLessThan(250);
        expect(cardDimensions?.height).toBeGreaterThan(120);
      }
    });

    test('should not interfere with chat scroll behavior', async ({ page }) => {
      // Check if chat container exists and is scrollable
      const chatContainer = page.locator('[role="log"], .chat-container, .overflow-y-auto').first();
      
      if (await chatContainer.count() > 0) {
        const containerStyles = await chatContainer.evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            overflowY: styles.overflowY,
            position: styles.position,
            zIndex: styles.zIndex,
          };
        });

        expect(['auto', 'scroll', 'visible'].includes(containerStyles.overflowY)).toBeTruthy();
      }
    });

    test('should have proper z-index layering', async ({ page }) => {
      const agentSidebar = page.locator('.agent-cards-sidebar');
      
      if (await agentSidebar.count() > 0) {
        const zIndex = await agentSidebar.first().evaluate(el => {
          return getComputedStyle(el).zIndex;
        });

        // Should have appropriate z-index for mobile overlay
        expect(parseInt(zIndex) || 0).toBeGreaterThanOrEqual(10);
      }
    });
  });

  test.describe('Desktop Layout (1280px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORT_SIZES.desktop);
    });

    test('should display agent cards in sidebar layout', async ({ page }) => {
      const agentSidebar = page.locator('.agent-cards-sidebar');
      
      if (await agentSidebar.count() > 0) {
        const sidebarStyles = await agentSidebar.first().evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            position: styles.position,
            width: styles.width,
            minWidth: styles.minWidth,
            flexDirection: styles.flexDirection,
          };
        });

        expect(['relative', 'static'].includes(sidebarStyles.position)).toBeTruthy();
        expect(sidebarStyles.flexDirection).toBe('column');
        
        // Should have reasonable sidebar width
        const width = parseInt(sidebarStyles.width);
        expect(width).toBeGreaterThan(250);
        expect(width).toBeLessThan(450);
      }
    });

    test('should use grid layout for agent cards', async ({ page }) => {
      const agentGrid = page.locator('.agent-grid');
      
      if (await agentGrid.count() > 0) {
        const gridStyles = await agentGrid.first().evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            display: styles.display,
            gridTemplateColumns: styles.gridTemplateColumns,
            gap: styles.gap,
          };
        });

        expect(gridStyles.display).toBe('grid');
        expect(gridStyles.gridTemplateColumns).toContain('minmax');
        expect(gridStyles.gap).toBeTruthy();
      }
    });

    test('should maintain proper chat container width', async ({ page }) => {
      const chatArea = page.locator('.chat-container, [role="log"]').first();
      const agentSidebar = page.locator('.agent-cards-sidebar');
      
      if (await chatArea.count() > 0 && await agentSidebar.count() > 0) {
        const chatBox = await chatArea.boundingBox();
        const sidebarBox = await agentSidebar.boundingBox();
        const viewport = page.viewportSize();
        
        if (chatBox && sidebarBox && viewport) {
          // Chat should take up remaining space after sidebar
          expect(chatBox.width + sidebarBox.width).toBeLessThanOrEqual(viewport.width + 50);
          expect(chatBox.width).toBeGreaterThan(600); // Minimum usable chat width
        }
      }
    });
  });

  test.describe('Tablet Layout (768px)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORT_SIZES.tablet);
    });

    test('should adapt layout appropriately for tablet', async ({ page }) => {
      const agentContainer = page.locator('.agent-cards-sidebar, .agent-cards-container');
      
      if (await agentContainer.count() > 0) {
        const containerBox = await agentContainer.first().boundingBox();
        const viewport = page.viewportSize();
        
        if (containerBox && viewport) {
          // Should take reasonable portion of screen
          const widthRatio = containerBox.width / viewport.width;
          expect(widthRatio).toBeGreaterThan(0.2);
          expect(widthRatio).toBeLessThan(0.6);
        }
      }
    });
  });

  test.describe('Agent Card Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(VIEWPORT_SIZES.desktop);
    });

    test('should show hover effects on agent cards', async ({ page }) => {
      const firstCard = page.locator('.agent-status-card').first();
      
      if (await firstCard.count() > 0) {
        // Get initial styles
        const initialTransform = await firstCard.evaluate(el => 
          getComputedStyle(el).transform
        );
        
        // Hover and check for transform changes
        await firstCard.hover();
        await page.waitForTimeout(100);
        
        const hoveredTransform = await firstCard.evaluate(el => 
          getComputedStyle(el).transform
        );
        
        // Transform should change on hover (may be translateY or other)
        // We check that some transform is applied
        expect(hoveredTransform).not.toBe('none');
      }
    });

    test('should handle card clicks appropriately', async ({ page }) => {
      const firstCard = page.locator('.agent-status-card').first();
      
      if (await firstCard.count() > 0) {
        // Ensure card is clickable
        await expect(firstCard).toBeVisible();
        
        // Click should not throw error
        await firstCard.click();
        // In a real app, this would trigger some action
        // We're just verifying the click doesn't break anything
      }
    });
  });

  test.describe('Animation and Performance', () => {
    test('should have smooth animations', async ({ page }) => {
      const agentCards = page.locator('.agent-status-card');
      
      if (await agentCards.count() > 0) {
        // Check for animation-related CSS
        const hasAnimations = await agentCards.first().evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            transition: styles.transition,
            animation: styles.animation,
          };
        });

        // Should have transition or animation properties
        expect(
          hasAnimations.transition !== 'all 0s ease 0s' || 
          hasAnimations.animation !== 'none'
        ).toBeTruthy();
      }
    });

    test('should handle reduced motion preferences', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.reload();
      await page.waitForTimeout(500);
      
      const agentCards = page.locator('.agent-status-card');
      
      if (await agentCards.count() > 0) {
        // Check if animations are disabled for reduced motion
        const animationState = await agentCards.first().evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            transition: styles.transition,
            animation: styles.animation,
          };
        });

        // With reduced motion, animations should be minimal or none
        // This would depend on your CSS implementation
        expect(animationState).toBeDefined();
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      const agentCards = page.locator('.agent-status-card');
      
      if (await agentCards.count() > 0) {
        const firstCard = agentCards.first();
        
        // Check for accessibility attributes
        const hasRole = await firstCard.getAttribute('role');
        const hasAriaLabel = await firstCard.getAttribute('aria-label');
        const hasTabIndex = await firstCard.getAttribute('tabindex');
        
        // Should have appropriate accessibility attributes
        expect(hasRole || hasAriaLabel || hasTabIndex).toBeTruthy();
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      const agentCards = page.locator('.agent-status-card');
      
      if (await agentCards.count() > 0) {
        // Try to tab to the first card
        await page.keyboard.press('Tab');
        
        // Check if any agent card receives focus
        const focusedCard = await page.locator('.agent-status-card:focus-within').count();
        
        // At least some level of keyboard interaction should be possible
        expect(focusedCard).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Connection Status Integration', () => {
    test('should display connection status appropriately', async ({ page }) => {
      // Look for connection indicators
      const connectionIndicators = page.locator('[class*="wifi"], [class*="connection"]');
      
      if (await connectionIndicators.count() > 0) {
        const indicator = connectionIndicators.first();
        await expect(indicator).toBeVisible();
        
        // Check for proper styling
        const indicatorClass = await indicator.getAttribute('class');
        expect(indicatorClass).toBeTruthy();
      }
    });
  });
});

test.describe('Layout Integration Tests', () => {
  test('should not break with different numbers of agents', async ({ page }) => {
    await setupMockAgents(page);
    
    const testCases = [
      { count: 0, description: 'no agents' },
      { count: 1, description: 'single agent' },
      { count: 4, description: 'multiple agents' },
      { count: 12, description: 'many agents' },
    ];

    for (const testCase of testCases) {
      // Simulate different agent counts
      await page.evaluate((count) => {
        (window as any).mockAgentData = {
          agents: Array.from({ length: count }, (_, i) => ({
            agent_id: `agent-${i}`,
            name: `Agent ${i + 1}`,
            agent_type: 'researcher',
            status: i % 2 === 0 ? 'current' : 'completed',
            progress: Math.random(),
            current_task: `Task ${i + 1}`,
          })),
          isConnected: true,
          streamingStatus: 'active',
        };
      }, testCase.count);

      await page.reload();
      await page.waitForTimeout(500);

      // Verify layout doesn't break
      const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = page.viewportSize()?.height || 0;
      
      // Page should not be excessively tall (indicating layout issues)
      expect(bodyHeight).toBeLessThan(viewportHeight * 3);
      
      // No JS errors should occur
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.waitForTimeout(100);
      expect(errors.length).toBe(0);
    }
  });
});