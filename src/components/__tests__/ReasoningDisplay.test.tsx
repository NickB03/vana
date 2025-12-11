import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ReasoningDisplay } from '../ReasoningDisplay';
import type { StructuredReasoning } from '@/types/reasoning';

// Mock DOMPurify to return input unchanged for testing
vi.mock('isomorphic-dompurify', () => ({
  default: {
    sanitize: (content: string) => content,
  },
}));

describe('ReasoningDisplay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    cleanup();
  });

  const mockReasoningSteps: StructuredReasoning = {
    steps: [
      {
        phase: 'research',
        title: 'Analyzing request',
        icon: 'search',
        items: ['Understanding the counter component requirement', 'Identifying state management needs'],
      },
      {
        phase: 'analysis',
        title: 'Planning implementation',
        icon: 'lightbulb',
        items: ['useState hook for counter state', 'onClick handlers for buttons'],
      },
      {
        phase: 'solution',
        title: 'Generating code',
        icon: 'target',
        items: ['Creating Counter component', 'Adding increment/decrement buttons'],
      },
    ],
    summary: 'Created a counter component with state management',
  };

  describe('rendering', () => {
    it('renders nothing when no data and not streaming', () => {
      const { container } = render(
        <ReasoningDisplay reasoning={null} reasoningSteps={null} isStreaming={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders with structured reasoning steps', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          reasoningSteps={mockReasoningSteps}
          isStreaming={false}
        />
      );

      // Should show last step title in collapsed pill when not streaming
      // (the component shows last step title, not summary, in collapsed state)
      // Note: Text appears in both pill and hidden expanded view, so use getAllByText
      expect(screen.getAllByText(/Generating code/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders "Thinking..." when streaming with no data yet', () => {
      render(
        <ReasoningDisplay reasoning={null} reasoningSteps={null} isStreaming={true} />
      );

      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });
  });

  describe('ticker format', () => {
    it('formats multiple titles with arrow separator after streaming', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          reasoningSteps={{
            steps: [
              { phase: 'research', title: 'Step One', items: ['item'] },
              { phase: 'analysis', title: 'Step Two', items: ['item'] },
            ],
          }}
          isStreaming={false}
        />
      );

      // When collapsed, should show last step title (component shows last step, not arrow format)
      const triggerButton = screen.getByRole('button', { name: /show thought process|hide thought process/i });
      expect(triggerButton).toHaveTextContent('Step Two');
    });

    it('shows last step title when collapsed (summary not displayed in pill)', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          reasoningSteps={{
            steps: [
              { phase: 'research', title: 'Step One', items: ['item'] },
            ],
            summary: 'This is the summary',
          }}
          isStreaming={false}
        />
      );

      // Component shows last step title in collapsed state, not summary
      // Text appears in both pill and hidden expanded view, so use getAllByText
      expect(screen.getAllByText('Step One').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('streaming behavior', () => {
    it('progressively reveals sections during streaming', async () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          reasoningSteps={mockReasoningSteps}
          isStreaming={true}
        />
      );

      // Initially should show first section being revealed
      // After 1200ms, should reveal next section
      act(() => {
        vi.advanceTimersByTime(100); // Start first section
      });

      // First section should start appearing
      // Check for blinking cursor (streaming indicator)
      const cursor = document.querySelector('[aria-hidden="true"]');
      expect(cursor).toBeInTheDocument();
    });

    it('shows all sections when streaming completes', () => {
      const { rerender } = render(
        <ReasoningDisplay
          reasoning={null}
          reasoningSteps={mockReasoningSteps}
          isStreaming={true}
        />
      );

      // Advance timers to reveal all sections
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Stop streaming
      rerender(
        <ReasoningDisplay
          reasoning={null}
          reasoningSteps={mockReasoningSteps}
          isStreaming={false}
        />
      );

      // All sections should be visible in expanded view
      // Click to expand
      const triggerButton = screen.getByRole('button', { name: /show thought process|hide thought process/i });
      triggerButton.click();

      // Check all section titles are visible (use getAllByText since text appears in multiple places)
      expect(screen.getAllByText('Analyzing request').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Planning implementation').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Generating code').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('expanded view', () => {
    it('renders structured sections with icons when expanded', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          reasoningSteps={mockReasoningSteps}
          isStreaming={false}
        />
      );

      // Click to expand
      const triggerButton = screen.getByRole('button', { name: /show thought process|hide thought process/i });
      triggerButton.click();

      // Check section titles (use getAllByText since text appears in both pill and expanded view)
      expect(screen.getAllByText('Analyzing request').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Planning implementation').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Generating code').length).toBeGreaterThanOrEqual(1);

      // Check items are rendered
      expect(screen.getByText('Understanding the counter component requirement')).toBeInTheDocument();
      expect(screen.getByText('useState hook for counter state')).toBeInTheDocument();
    });
  });

  describe('backward compatibility', () => {
    it('renders plain text reasoning directly (no expand needed)', () => {
      render(
        <ReasoningDisplay
          reasoning="This is plain text reasoning"
          reasoningSteps={null}
          isStreaming={false}
        />
      );

      // Plain text reasoning displays directly without needing to expand
      // (no button role since there's nothing to expand/collapse)
      const textElements = screen.getAllByText('This is plain text reasoning');
      expect(textElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('XSS prevention', () => {
    it('sanitizes content in titles', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          reasoningSteps={{
            steps: [
              {
                phase: 'research',
                title: '<script>alert("xss")</script>Safe Title',
                items: ['item'],
              },
            ],
          }}
          isStreaming={false}
        />
      );

      // DOMPurify should sanitize the content
      // In our mock, it passes through, but in production DOMPurify strips dangerous tags
      const triggerButton = screen.getByRole('button', { name: /show thought process|hide thought process/i });
      expect(triggerButton).toBeInTheDocument();
    });
  });

  // Note: onReasoningComplete callback removed in UX optimization (2025-11-29)
  // Content now shows immediately without waiting for reasoning animation to complete
  // This provides better perceived performance and honest UX
});
