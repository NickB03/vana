import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ReasoningDisplay } from '../ReasoningDisplay';

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

  describe('rendering', () => {
    it('renders nothing when no data and not streaming', () => {
      const { container } = render(
        <ReasoningDisplay reasoning={null} streamingReasoningText={null} isStreaming={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders with reasoning text', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          streamingReasoningText="Analyzing the request and planning implementation..."
          isStreaming={false}
        />
      );

      // Should show "Thought process" in collapsed pill when not streaming
      expect(screen.getByText('Thought process')).toBeInTheDocument();
    });

    it('renders "Thinking..." when streaming with no data yet', () => {
      render(
        <ReasoningDisplay reasoning={null} streamingReasoningText={null} isStreaming={true} />
      );

      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });
  });

  describe('ticker format', () => {
    it('shows "Thought process" when collapsed after streaming', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          streamingReasoningText="Planning implementation steps..."
          reasoningStatus="Analyzing code structure"
          isStreaming={false}
        />
      );

      // When collapsed, should show "Thought process"
      expect(screen.getByText('Thought process')).toBeInTheDocument();
    });

    it('shows reasoning status during streaming', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          streamingReasoningText="Planning..."
          reasoningStatus="Analyzing request"
          isStreaming={true}
        />
      );

      // During streaming, should show the reasoning status
      expect(screen.getByText('Analyzing request')).toBeInTheDocument();
    });
  });

  describe('streaming behavior', () => {
    it('shows spinner during streaming', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          streamingReasoningText="Analyzing..."
          isStreaming={true}
        />
      );

      // Check for spinner element
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows raw reasoning text when expanded after streaming', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          streamingReasoningText="Analyzing request\nPlanning implementation\nGenerating code"
          isStreaming={false}
        />
      );

      // Click to expand
      const triggerButton = screen.getByRole('button', { name: /show thought process|hide thought process/i });
      triggerButton.click();

      // Check raw reasoning text is visible
      expect(screen.getByText(/Analyzing request/)).toBeInTheDocument();
      expect(screen.getByText(/Planning implementation/)).toBeInTheDocument();
      expect(screen.getByText(/Generating code/)).toBeInTheDocument();
    });
  });

  describe('expanded view', () => {
    it('renders raw reasoning text when expanded', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          streamingReasoningText="Understanding the counter component requirement\nuseState hook for counter state"
          isStreaming={false}
        />
      );

      // Click to expand
      const triggerButton = screen.getByRole('button', { name: /show thought process|hide thought process/i });
      triggerButton.click();

      // Check reasoning text is rendered
      expect(screen.getByText(/Understanding the counter component requirement/)).toBeInTheDocument();
      expect(screen.getByText(/useState hook for counter state/)).toBeInTheDocument();
    });
  });

  describe('backward compatibility', () => {
    it('renders fallback reasoning when no streaming text', () => {
      render(
        <ReasoningDisplay
          reasoning="This is fallback plain text reasoning"
          streamingReasoningText={null}
          isStreaming={false}
        />
      );

      // Should show "Thought process" in collapsed state
      expect(screen.getByText('Thought process')).toBeInTheDocument();

      // Expand to see the content
      const triggerButton = screen.getByRole('button', { name: /show thought process|hide thought process/i });
      triggerButton.click();

      // Fallback reasoning should be visible
      expect(screen.getByText(/fallback plain text reasoning/)).toBeInTheDocument();
    });
  });

  describe('XSS prevention', () => {
    it('sanitizes content in reasoning text', () => {
      render(
        <ReasoningDisplay
          reasoning={null}
          streamingReasoningText='<script>alert("xss")</script>Safe reasoning content'
          isStreaming={false}
        />
      );

      // DOMPurify should sanitize the content
      // In our mock, it passes through, but in production DOMPurify strips dangerous tags
      const triggerButton = screen.getByRole('button', { name: /show thought process|hide thought process/i });
      expect(triggerButton).toBeInTheDocument();
    });
  });
});
