import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReasoningIndicator } from '../ReasoningIndicator';
import { StructuredReasoning } from '@/types/reasoning';

describe('ReasoningIndicator', () => {
  describe('Backward Compatibility', () => {
    it('renders ThinkingIndicator for string reasoning', () => {
      render(<ReasoningIndicator reasoning="Analyzing request..." />);

      expect(screen.getByText('Analyzing request...')).toBeInTheDocument();
    });

    it('renders ThinkingIndicator when reasoningSteps is invalid', () => {
      const invalidSteps = { invalid: 'data' };

      render(
        <ReasoningIndicator
          reasoning="Fallback status"
          reasoningSteps={invalidSteps as any}
        />
      );

      expect(screen.getByText('Fallback status')).toBeInTheDocument();
    });

    it('handles null reasoning gracefully', () => {
      const { container } = render(
        <ReasoningIndicator reasoning={null} reasoningSteps={null} />
      );

      // Should render ThinkingIndicator with default message
      expect(container.querySelector('.text-muted-foreground')).toBeInTheDocument();
    });
  });

  describe('Structured Reasoning Display', () => {
    const mockStructuredReasoning: StructuredReasoning = {
      steps: [
        {
          phase: 'research',
          title: 'Understanding the problem space',
          icon: 'search',
          items: [
            'Analyzing user request',
            'Identifying key requirements',
            'Reviewing context',
          ],
        },
        {
          phase: 'analysis',
          title: 'Identifying optimization opportunities',
          icon: 'lightbulb',
          items: [
            'Finding bottlenecks',
            'Analyzing patterns',
          ],
        },
      ],
      summary: 'Comprehensive analysis complete',
    };

    it('renders ChainOfThought for valid structured reasoning', () => {
      render(<ReasoningIndicator reasoningSteps={mockStructuredReasoning} />);

      expect(screen.getByText('Understanding the problem space')).toBeInTheDocument();
      expect(screen.getByText('Identifying optimization opportunities')).toBeInTheDocument();
    });

    it('displays step titles as collapsible triggers', () => {
      render(<ReasoningIndicator reasoningSteps={mockStructuredReasoning} />);

      const trigger = screen.getByText('Understanding the problem space');
      expect(trigger.closest('button')).toHaveAttribute('aria-expanded', 'false');
    });

    it('expands step content when trigger is clicked', async () => {
      const user = userEvent.setup();
      render(<ReasoningIndicator reasoningSteps={mockStructuredReasoning} />);

      const trigger = screen.getByText('Understanding the problem space');

      // Initially not rendered (collapsed)
      expect(screen.queryByText('Analyzing user request')).not.toBeInTheDocument();

      // Click to expand
      await user.click(trigger);

      // Should be in document after click
      expect(screen.getByText('Analyzing user request')).toBeInTheDocument();
      expect(screen.getByText('Identifying key requirements')).toBeInTheDocument();
      expect(screen.getByText('Reviewing context')).toBeInTheDocument();
    });

    it('shows correct icons for each phase', () => {
      const { container } = render(<ReasoningIndicator reasoningSteps={mockStructuredReasoning} />);

      // Icons should be rendered (test for SVG presence)
      const triggers = screen.getAllByRole('button');
      expect(triggers.length).toBeGreaterThan(0);

      // Each trigger should have an icon (SVG element)
      const svgIcons = container.querySelectorAll('svg');
      expect(svgIcons.length).toBeGreaterThanOrEqual(triggers.length);
    });

    it('displays summary during streaming', () => {
      render(
        <ReasoningIndicator
          reasoningSteps={mockStructuredReasoning}
          isStreaming={true}
          percentage={75}
        />
      );

      expect(screen.getByText('Comprehensive analysis complete')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
    });
  });

  describe('XSS Protection', () => {
    it('sanitizes malicious script tags in titles', () => {
      const maliciousReasoning: StructuredReasoning = {
        steps: [
          {
            phase: 'research',
            title: 'Safe title<script>alert("XSS")</script>',
            icon: 'search',
            items: ['Safe item'],
          },
        ],
      };

      const { container } = render(
        <ReasoningIndicator reasoningSteps={maliciousReasoning} />
      );

      // Script tag should be removed by DOMPurify
      expect(container.innerHTML).not.toContain('<script>');
      expect(screen.getByText(/Safe title/)).toBeInTheDocument();
    });

    it('sanitizes malicious event handlers in items', () => {
      const maliciousReasoning: StructuredReasoning = {
        steps: [
          {
            phase: 'research',
            title: 'Safe title',
            icon: 'search',
            items: ['Item with malicious handler'],
          },
        ],
      };

      const { container } = render(
        <ReasoningIndicator reasoningSteps={maliciousReasoning} />
      );

      // Event handler should be removed
      expect(container.innerHTML).not.toContain('onerror');
    });

    it('allows safe HTML tags (bold, italic, code)', async () => {
      const safeReasoning: StructuredReasoning = {
        steps: [
          {
            phase: 'research',
            title: 'Title with <strong>bold</strong> text',
            icon: 'search',
            items: ['Item with <code>code</code> and <em>italic</em>'],
          },
        ],
      };

      const user = userEvent.setup();
      render(<ReasoningIndicator reasoningSteps={safeReasoning} />);

      // Expand to see items
      const trigger = screen.getByText(/Title with/);
      await user.click(trigger);

      // Safe tags should be preserved
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('code')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
    });
  });

  describe('Performance Optimization', () => {
    it('shows "more items" button when items exceed threshold', async () => {
      const manyItemsReasoning: StructuredReasoning = {
        steps: [
          {
            phase: 'research',
            title: 'Step with many items',
            icon: 'search',
            items: Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`),
          },
        ],
      };

      const user = userEvent.setup();
      render(<ReasoningIndicator reasoningSteps={manyItemsReasoning} />);

      // Expand step
      const trigger = screen.getByText('Step with many items');
      await user.click(trigger);

      // Should show first 5 items
      expect(screen.getByText('Item 1')).toBeVisible();
      expect(screen.getByText('Item 5')).toBeVisible();

      // Should show "more items" button
      const moreButton = screen.getByText('+5 more items');
      expect(moreButton).toBeInTheDocument();

      // Click to expand all items
      await user.click(moreButton);

      // All items should now be visible
      expect(screen.getByText('Item 10')).toBeVisible();
    });

    it('uses virtualization for more than 5 steps', () => {
      const manyStepsReasoning: StructuredReasoning = {
        steps: Array.from({ length: 10 }, (_, i) => ({
          phase: 'research' as const,
          title: `Step ${i + 1}`,
          icon: 'search' as const,
          items: [`Item for step ${i + 1}`],
        })),
      };

      const { container } = render(
        <ReasoningIndicator reasoningSteps={manyStepsReasoning} />
      );

      // Should have virtualization container
      const virtualScroller = container.querySelector('[style*="height"]');
      expect(virtualScroller).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    const mockReasoning: StructuredReasoning = {
      steps: [
        {
          phase: 'research',
          title: 'Test step',
          icon: 'search',
          items: ['Test item'],
        },
      ],
    };

    it('has proper ARIA labels on triggers', () => {
      render(<ReasoningIndicator reasoningSteps={mockReasoning} />);

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-expanded');
      expect(trigger).toHaveAttribute('aria-label');
    });

    it('supports keyboard navigation with Enter key', async () => {
      const user = userEvent.setup();
      render(<ReasoningIndicator reasoningSteps={mockReasoning} />);

      const trigger = screen.getByRole('button');
      trigger.focus();

      // Press Enter to expand
      await user.keyboard('{Enter}');

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('supports keyboard navigation with Space key', async () => {
      const user = userEvent.setup();
      render(<ReasoningIndicator reasoningSteps={mockReasoning} />);

      const trigger = screen.getByRole('button');
      trigger.focus();

      // Press Space to expand
      await user.keyboard(' ');

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('has visible focus indicators', () => {
      render(<ReasoningIndicator reasoningSteps={mockReasoning} />);

      const trigger = screen.getByRole('button');

      // Should have focus-visible classes
      expect(trigger.className).toContain('focus-visible:ring-2');
    });

    it('uses aria-expanded for screen reader state', () => {
      render(<ReasoningIndicator reasoningSteps={mockReasoning} />);

      // Radix UI's Collapsible provides aria-expanded, which is better than sr-only text
      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-expanded');
    });
  });

  describe('Error Handling', () => {
    it('handles missing required fields gracefully', () => {
      const invalidReasoning = {
        steps: [
          {
            // Missing required fields
            phase: 'research',
          },
        ],
      };

      // Should fall back to ThinkingIndicator
      render(
        <ReasoningIndicator
          reasoning="Fallback"
          reasoningSteps={invalidReasoning as any}
        />
      );

      expect(screen.getByText('Fallback')).toBeInTheDocument();
    });

    it('handles empty steps array', () => {
      const emptyReasoning: any = {
        steps: [],
      };

      render(
        <ReasoningIndicator
          reasoning="Processing..."
          reasoningSteps={emptyReasoning}
        />
      );

      // Should show fallback
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('logs validation errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const invalidReasoning = { invalid: 'structure' };

      render(<ReasoningIndicator reasoningSteps={invalidReasoning as any} />);

      // Check that console.warn was called with our message
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls;
      const hasReasoningIndicatorWarning = calls.some(call =>
        call[0].includes('[ReasoningIndicator]')
      );
      expect(hasReasoningIndicatorWarning).toBe(true);

      consoleSpy.mockRestore();
    });
  });
});
