/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageErrorBoundary, withMessageErrorBoundary } from '../MessageErrorBoundary';

/**
 * Test Suite for MessageErrorBoundary Component
 *
 * Coverage:
 * - Error boundary catches message parse errors
 * - Displays custom fallback UI when provided
 * - Displays default error UI when no fallback provided
 * - Reset functionality restores normal rendering
 * - Raw content toggle shows/hides message content
 * - Logs errors to console (production monitoring ready)
 * - Shows dev-only debugging button in development mode
 * - HOC wrapper (withMessageErrorBoundary) works correctly
 * - Handles different error types gracefully
 */

// Mock component that throws an error
const ThrowErrorComponent = ({ shouldThrow = true, errorMessage = "Message parse error" }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Message rendered successfully</div>;
};

// Mock component that doesn't throw
const SafeMessage = () => <div>Safe message content</div>;

describe('MessageErrorBoundary', () => {
  // Suppress console.error in tests (we're testing error handling)
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalError;
  });

  describe('Error Catching', () => {
    it('catches errors from message rendering', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      // Should show error UI instead of crashing
      expect(screen.getByText('Message failed to render')).toBeInTheDocument();
      expect(screen.getByText(/Message parse error/i)).toBeInTheDocument();
    });

    it('renders children normally when no error occurs', () => {
      render(
        <MessageErrorBoundary>
          <SafeMessage />
        </MessageErrorBoundary>
      );

      expect(screen.getByText('Safe message content')).toBeInTheDocument();
    });

    it('logs error to console when error is caught', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage="Malformed artifact tag" />
        </MessageErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalled();
      const errorCalls = consoleSpy.mock.calls.filter(call =>
        call[0].includes('[MessageErrorBoundary]')
      );
      expect(errorCalls.length).toBeGreaterThan(0);

      consoleSpy.mockRestore();
    });

    it('handles errors with different error messages', () => {
      const customErrorMessage = "Invalid markdown syntax";

      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage={customErrorMessage} />
        </MessageErrorBoundary>
      );

      expect(screen.getByText(customErrorMessage)).toBeInTheDocument();
    });
  });

  describe('Default Fallback UI', () => {
    it('displays default error UI with error icon', () => {
      const { container } = render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      // Check for AlertCircle icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays error title', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      expect(screen.getByText('Message failed to render')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage="Parsing timeout" />
        </MessageErrorBoundary>
      );

      expect(screen.getByText(/Parsing timeout/i)).toBeInTheDocument();
    });

    it('displays default message when error has no message', () => {
      const ErrorComponentNoMessage = () => {
        throw new Error();
      };

      render(
        <MessageErrorBoundary>
          <ErrorComponentNoMessage />
        </MessageErrorBoundary>
      );

      expect(screen.getByText(/This message could not be displayed/i)).toBeInTheDocument();
    });

    it('includes "Try Again" button', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
    });

    it('has proper styling for error container', () => {
      const { container } = render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const errorContainer = container.querySelector('.border-destructive\\/20');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('Custom Fallback UI', () => {
    it('displays custom fallback when provided', () => {
      const customFallback = <div>Custom message error</div>;

      render(
        <MessageErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      expect(screen.getByText('Custom message error')).toBeInTheDocument();
      expect(screen.queryByText('Message failed to render')).not.toBeInTheDocument();
    });

    it('accepts React elements as fallback', () => {
      const customFallback = (
        <div className="custom-fallback">
          <h1>Message Error!</h1>
          <p>Cannot display this message</p>
        </div>
      );

      render(
        <MessageErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      expect(screen.getByText('Message Error!')).toBeInTheDocument();
      expect(screen.getByText('Cannot display this message')).toBeInTheDocument();
    });
  });

  describe('Raw Content Toggle', () => {
    it('shows "Show Raw Content" button when messageContent is provided', () => {
      render(
        <MessageErrorBoundary messageContent="This is the raw message content">
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const showButton = screen.getByRole('button', { name: /show raw content/i });
      expect(showButton).toBeInTheDocument();
    });

    it('hides "Show Raw Content" button when messageContent is not provided', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const showButton = screen.queryByRole('button', { name: /show raw content/i });
      expect(showButton).not.toBeInTheDocument();
    });

    it('toggles raw content visibility when button is clicked', async () => {
      const user = userEvent.setup();
      const rawContent = "This is the raw message content with <artifact> tags";

      render(
        <MessageErrorBoundary messageContent={rawContent}>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      // Initially hidden
      expect(screen.queryByText(rawContent)).not.toBeInTheDocument();

      // Click to show
      const showButton = screen.getByRole('button', { name: /show raw content/i });
      await user.click(showButton);

      // Now visible
      expect(screen.getByText(rawContent)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hide raw content/i })).toBeInTheDocument();

      // Click to hide
      const hideButton = screen.getByRole('button', { name: /hide raw content/i });
      await user.click(hideButton);

      // Hidden again
      expect(screen.queryByText(rawContent)).not.toBeInTheDocument();
    });

    it('displays raw content in preformatted block', async () => {
      const user = userEvent.setup();
      const rawContent = "Raw message with special\ncharacters and   spaces";

      const { container } = render(
        <MessageErrorBoundary messageContent={rawContent}>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const showButton = screen.getByRole('button', { name: /show raw content/i });
      await user.click(showButton);

      // Check for pre element
      const preElement = container.querySelector('pre');
      expect(preElement).toBeInTheDocument();
      expect(preElement?.textContent).toBe(rawContent);
    });
  });

  describe('Reset Functionality', () => {
    it('resets error state when "Try Again" is clicked', async () => {
      const user = userEvent.setup();

      // Use a key prop to force remount after reset
      const TestWrapper = ({ errorKey }: { errorKey: number }) => (
        <MessageErrorBoundary key={errorKey}>
          <ThrowErrorComponent shouldThrow={errorKey === 0} />
        </MessageErrorBoundary>
      );

      const { rerender } = render(<TestWrapper errorKey={0} />);

      // Error UI should be visible
      expect(screen.getByText('Message failed to render')).toBeInTheDocument();

      // Click "Try Again" to reset
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Remount with new key (simulates reset)
      rerender(<TestWrapper errorKey={1} />);

      // Success message should appear
      await screen.findByText('Message rendered successfully');
      expect(screen.getByText('Message rendered successfully')).toBeInTheDocument();
    });

    it('clears error state and raw content visibility after reset', async () => {
      const user = userEvent.setup();

      const TestWrapper = ({ errorKey }: { errorKey: number }) => (
        <MessageErrorBoundary key={errorKey} messageContent="Raw content">
          {errorKey === 0 ? <ThrowErrorComponent /> : <SafeMessage />}
        </MessageErrorBoundary>
      );

      const { rerender } = render(<TestWrapper errorKey={0} />);

      // Error should be shown
      expect(screen.getByText('Message failed to render')).toBeInTheDocument();

      // Show raw content
      const showButton = screen.getByRole('button', { name: /show raw content/i });
      await user.click(showButton);
      expect(screen.getByText('Raw content')).toBeInTheDocument();

      // Reset
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Remount with new component
      rerender(<TestWrapper errorKey={1} />);

      await screen.findByText('Safe message content');
      expect(screen.getByText('Safe message content')).toBeInTheDocument();
      expect(screen.queryByText('Raw content')).not.toBeInTheDocument();
    });
  });

  describe('Development Mode Features', () => {
    const originalEnv = import.meta.env.DEV;

    beforeEach(() => {
      // Mock development mode
      // @ts-expect-error - import.meta.env is readonly
      (import.meta.env as any).DEV = true;
    });

    afterEach(() => {
      // Restore original environment
      // @ts-expect-error - import.meta.env is readonly
      (import.meta.env as any).DEV = originalEnv;
    });

    it('shows "View Details" button in development mode', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const viewDetailsButton = screen.queryByRole('button', { name: /view details/i });
      expect(viewDetailsButton).toBeInTheDocument();
    });

    it('logs error details when "View Details" is clicked', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const messageContent = "Test message content";

      render(
        <MessageErrorBoundary messageContent={messageContent}>
          <ThrowErrorComponent errorMessage="Debug message error" />
        </MessageErrorBoundary>
      );

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewDetailsButton);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls.some(call =>
        String(call).includes('Error details')
      )).toBe(true);
      expect(consoleSpy.mock.calls.some(call =>
        String(call).includes('Message content')
      )).toBe(true);

      consoleSpy.mockRestore();
    });
  });

  describe('Production Mode Features', () => {
    const originalEnv = import.meta.env.DEV;

    beforeEach(() => {
      // Mock production mode
      // @ts-expect-error - import.meta.env is readonly
      (import.meta.env as any).DEV = false;
    });

    afterEach(() => {
      // Restore original environment
      // @ts-expect-error - import.meta.env is readonly
      (import.meta.env as any).DEV = originalEnv;
    });

    it('hides "View Details" button in production mode', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const viewDetailsButton = screen.queryByRole('button', { name: /view details/i });
      expect(viewDetailsButton).not.toBeInTheDocument();
    });

    it('still shows "Try Again" button in production', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
    });
  });

  describe('Higher-Order Component (withMessageErrorBoundary)', () => {
    it('wraps component with error boundary', () => {
      const WrappedComponent = withMessageErrorBoundary(ThrowErrorComponent);

      render(<WrappedComponent shouldThrow={false} />);

      expect(screen.getByText('Message rendered successfully')).toBeInTheDocument();
    });

    it('catches errors from wrapped component', () => {
      const WrappedComponent = withMessageErrorBoundary(ThrowErrorComponent);

      render(<WrappedComponent shouldThrow={true} errorMessage="HOC message error" />);

      // Should show default fallback since no custom fallback provided to HOC
      expect(screen.getByText('Message failed to render')).toBeInTheDocument();
    });

    it('accepts custom fallback for HOC', () => {
      const customFallback = <div>HOC custom fallback</div>;
      const WrappedComponent = withMessageErrorBoundary(ThrowErrorComponent, customFallback);

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('HOC custom fallback')).toBeInTheDocument();
    });

    it('passes props through to wrapped component', () => {
      const PropsComponent = ({ text }: { text: string }) => <div>{text}</div>;
      const WrappedComponent = withMessageErrorBoundary(PropsComponent);

      render(<WrappedComponent text="Test Message Text" />);

      expect(screen.getByText('Test Message Text')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Lifecycle', () => {
    it('calls getDerivedStateFromError when error is thrown', () => {
      const { container } = render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage="Lifecycle test" />
        </MessageErrorBoundary>
      );

      // Error UI should be visible, meaning getDerivedStateFromError was called
      expect(screen.getByText('Message failed to render')).toBeInTheDocument();
    });

    it('calls componentDidCatch after error', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage="componentDidCatch test" />
        </MessageErrorBoundary>
      );

      // componentDidCatch logs to console
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('stores error and errorInfo in state', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage="State test error" />
        </MessageErrorBoundary>
      );

      // Error message should be displayed (from state)
      expect(screen.getByText('State test error')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles for error UI', () => {
      const { container } = render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      // Buttons should have proper roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('error icon has appropriate styling for visibility', () => {
      const { container } = render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      // Check for destructive color class
      const icon = container.querySelector('.text-destructive');
      expect(icon).toBeInTheDocument();
    });

    it('maintains focus management for "Try Again" button', async () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });

      // Button should be focusable
      tryAgainButton.focus();
      expect(document.activeElement).toBe(tryAgainButton);
    });
  });

  describe('Edge Cases', () => {
    it('handles errors with very long messages', () => {
      const longMessage = "A".repeat(500);

      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage={longMessage} />
        </MessageErrorBoundary>
      );

      // Should still render error UI without breaking layout
      expect(screen.getByText('Message failed to render')).toBeInTheDocument();
    });

    it('handles errors with special characters in message', () => {
      const specialCharMessage = '<script>alert("XSS")</script>';

      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage={specialCharMessage} />
        </MessageErrorBoundary>
      );

      // Should display error without executing script
      expect(screen.getByText(/script/i)).toBeInTheDocument();
      expect(document.querySelectorAll('script').length).toBe(0);
    });

    it('handles nested error boundaries', () => {
      render(
        <MessageErrorBoundary>
          <MessageErrorBoundary>
            <ThrowErrorComponent errorMessage="Nested message error" />
          </MessageErrorBoundary>
        </MessageErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText('Message failed to render')).toBeInTheDocument();
    });

    it('handles very long raw content', async () => {
      const user = userEvent.setup();
      const longContent = "A".repeat(10000);

      const { container } = render(
        <MessageErrorBoundary messageContent={longContent}>
          <ThrowErrorComponent />
        </MessageErrorBoundary>
      );

      const showButton = screen.getByRole('button', { name: /show raw content/i });
      await user.click(showButton);

      // Should display without breaking layout
      const preElement = container.querySelector('pre');
      expect(preElement).toBeInTheDocument();
    });
  });

  describe('Message-Specific Error Scenarios', () => {
    it('handles malformed artifact tags', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage="Malformed artifact tag: missing closing tag" />
        </MessageErrorBoundary>
      );

      expect(screen.getByText(/Malformed artifact tag/i)).toBeInTheDocument();
    });

    it('handles invalid markdown syntax', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage="Invalid markdown: unclosed code block" />
        </MessageErrorBoundary>
      );

      expect(screen.getByText(/Invalid markdown/i)).toBeInTheDocument();
    });

    it('handles missing message data', () => {
      render(
        <MessageErrorBoundary>
          <ThrowErrorComponent errorMessage="Cannot read property 'content' of undefined" />
        </MessageErrorBoundary>
      );

      expect(screen.getByText(/Cannot read property/i)).toBeInTheDocument();
    });
  });
});
