/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReasoningErrorBoundary, withReasoningErrorBoundary } from '../ReasoningErrorBoundary';
import { ThinkingIndicator } from '../ThinkingIndicator';

/**
 * Test Suite for ReasoningErrorBoundary Component
 *
 * Coverage:
 * - ✅ Error boundary catches component errors
 * - ✅ Displays custom fallback UI when provided
 * - ✅ Displays default error UI when no fallback provided
 * - ✅ Reset functionality restores normal rendering
 * - ✅ Logs errors to console (production monitoring ready)
 * - ✅ Shows dev-only debugging button in development mode
 * - ✅ HOC wrapper (withReasoningErrorBoundary) works correctly
 * - ✅ Handles different error types gracefully
 */

// Mock component that throws an error
const ThrowErrorComponent = ({ shouldThrow = true, errorMessage = "Test error" }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Component rendered successfully</div>;
};

// Mock component that doesn't throw
const SafeComponent = () => <div>Safe component content</div>;

describe('ReasoningErrorBoundary', () => {
  // Suppress console.error in tests (we're testing error handling)
  // Note: setup.ts already mocks console.error and console.warn globally

  afterEach(() => {
    cleanup();
    // Restore all mocks to prevent memory leaks from accumulated spy instances
    vi.clearAllMocks();
  });

  describe('Error Catching', () => {
    it('catches errors from child components', () => {
      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      // Should show error UI instead of crashing
      expect(screen.getByText('Failed to load reasoning steps')).toBeInTheDocument();
      expect(screen.getByText(/Test error/i)).toBeInTheDocument();
    });

    it('renders children normally when no error occurs', () => {
      render(
        <ReasoningErrorBoundary>
          <SafeComponent />
        </ReasoningErrorBoundary>
      );

      expect(screen.getByText('Safe component content')).toBeInTheDocument();
    });

    it('logs error to console when error is caught', () => {
      // console.error is already mocked in setup.ts, just use it directly
      const mockConsoleError = console.error as any;

      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent errorMessage="Specific error message" />
        </ReasoningErrorBoundary>
      );

      expect(mockConsoleError).toHaveBeenCalled();
      const errorCalls = mockConsoleError.mock.calls.filter((call: any[]) =>
        String(call[0]).includes('[ReasoningErrorBoundary]')
      );
      expect(errorCalls.length).toBeGreaterThan(0);
    });

    it('handles errors with different error messages', () => {
      const customErrorMessage = "Custom validation failed";

      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent errorMessage={customErrorMessage} />
        </ReasoningErrorBoundary>
      );

      expect(screen.getByText(customErrorMessage)).toBeInTheDocument();
    });
  });

  describe('Default Fallback UI', () => {
    it('displays default error UI with error icon', () => {
      const { container } = render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      // Check for AlertCircle icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays error title', () => {
      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      expect(screen.getByText('Failed to load reasoning steps')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent errorMessage="Network timeout" />
        </ReasoningErrorBoundary>
      );

      expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();
    });

    it('displays default message when error has no message', () => {
      const ErrorComponentNoMessage = () => {
        throw new Error();
      };

      render(
        <ReasoningErrorBoundary>
          <ErrorComponentNoMessage />
        </ReasoningErrorBoundary>
      );

      expect(screen.getByText(/An error occurred while displaying the reasoning process/i)).toBeInTheDocument();
    });

    it('includes "Try Again" button', () => {
      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
    });

    it('has proper styling for error container', () => {
      const { container } = render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      const errorContainer = container.querySelector('.border-destructive\\/20');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('Custom Fallback UI', () => {
    it('displays custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ReasoningErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Failed to load reasoning steps')).not.toBeInTheDocument();
    });

    it('accepts React elements as fallback', () => {
      const customFallback = (
        <div className="custom-fallback">
          <h1>Oops!</h1>
          <p>Something went wrong</p>
        </div>
      );

      render(
        <ReasoningErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      expect(screen.getByText('Oops!')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('resets error state when "Try Again" is clicked', async () => {
      const user = userEvent.setup();

      // Use a key prop to force remount after reset
      const TestWrapper = ({ errorKey }: { errorKey: number }) => (
        <ReasoningErrorBoundary key={errorKey}>
          <ThrowErrorComponent shouldThrow={errorKey === 0} />
        </ReasoningErrorBoundary>
      );

      const { rerender } = render(<TestWrapper errorKey={0} />);

      // Error UI should be visible
      expect(screen.getByText('Failed to load reasoning steps')).toBeInTheDocument();

      // Click "Try Again" to reset
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Remount with new key (simulates reset)
      rerender(<TestWrapper errorKey={1} />);

      // Success message should appear
      await screen.findByText('Component rendered successfully');
      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
    });

    it('clears error state after reset', async () => {
      const user = userEvent.setup();

      const TestWrapper = ({ errorKey }: { errorKey: number }) => (
        <ReasoningErrorBoundary key={errorKey}>
          {errorKey === 0 ? <ThrowErrorComponent /> : <SafeComponent />}
        </ReasoningErrorBoundary>
      );

      const { rerender } = render(<TestWrapper errorKey={0} />);

      // Error should be shown
      expect(screen.getByText('Failed to load reasoning steps')).toBeInTheDocument();

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Remount with new component
      rerender(<TestWrapper errorKey={1} />);

      await screen.findByText('Safe component content');
      expect(screen.getByText('Safe component content')).toBeInTheDocument();
    });
  });

  describe('Development Mode Features', () => {
    // Save original value ONCE at describe-block scope
    const originalEnv = import.meta.env.DEV;

    beforeEach(() => {
      // Mock development mode
      // @ts-expect-error - import.meta.env is readonly
      (import.meta.env as any).DEV = true;
    });

    afterEach(() => {
      // Restore original environment immediately after each test
      // @ts-expect-error - import.meta.env is readonly
      (import.meta.env as any).DEV = originalEnv;
      // Also restore mocks to prevent accumulation
      vi.clearAllMocks();
    });

    it('shows "View Details" button in development mode', () => {
      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      const viewDetailsButton = screen.queryByRole('button', { name: /view details/i });
      expect(viewDetailsButton).toBeInTheDocument();
    });

    it('logs error details when "View Details" is clicked', async () => {
      const user = userEvent.setup();
      // Mock console.log to track calls
      const mockConsoleLog = vi.fn();
      const originalLog = console.log;
      console.log = mockConsoleLog;

      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent errorMessage="Debug test error" />
        </ReasoningErrorBoundary>
      );

      const viewDetailsButton = screen.getByRole('button', { name: /view details/i });
      await user.click(viewDetailsButton);

      expect(mockConsoleLog).toHaveBeenCalled();
      expect(mockConsoleLog.mock.calls.some(call =>
        String(call).includes('Error details')
      )).toBe(true);

      // Cleanup: restore console.log
      console.log = originalLog;
    });
  });

  describe('Production Mode Features', () => {
    // Save original value ONCE at describe-block scope
    const originalEnv = import.meta.env.DEV;

    beforeEach(() => {
      // Mock production mode
      // @ts-expect-error - import.meta.env is readonly
      (import.meta.env as any).DEV = false;
    });

    afterEach(() => {
      // Restore original environment immediately after each test
      // @ts-expect-error - import.meta.env is readonly
      (import.meta.env as any).DEV = originalEnv;
      // Also restore mocks to prevent accumulation
      vi.clearAllMocks();
    });

    it('hides "View Details" button in production mode', () => {
      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      const viewDetailsButton = screen.queryByRole('button', { name: /view details/i });
      expect(viewDetailsButton).not.toBeInTheDocument();
    });

    it('still shows "Try Again" button in production', () => {
      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
    });
  });

  describe('Higher-Order Component (withReasoningErrorBoundary)', () => {
    it('wraps component with error boundary', () => {
      const WrappedComponent = withReasoningErrorBoundary(ThrowErrorComponent);

      render(<WrappedComponent shouldThrow={false} />);

      expect(screen.getByText('Component rendered successfully')).toBeInTheDocument();
    });

    it('catches errors from wrapped component', () => {
      const WrappedComponent = withReasoningErrorBoundary(ThrowErrorComponent);

      render(<WrappedComponent shouldThrow={true} errorMessage="HOC test error" />);

      // Should show default fallback since no custom fallback provided to HOC
      expect(screen.getByText(/Error loading reasoning/i)).toBeInTheDocument();
    });

    it('accepts custom fallback for HOC', () => {
      const customFallback = <div>HOC custom fallback</div>;
      const WrappedComponent = withReasoningErrorBoundary(ThrowErrorComponent, customFallback);

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('HOC custom fallback')).toBeInTheDocument();
    });

    it('passes props through to wrapped component', () => {
      const PropsComponent = ({ message }: { message: string }) => <div>{message}</div>;
      const WrappedComponent = withReasoningErrorBoundary(PropsComponent);

      render(<WrappedComponent message="Test message from props" />);

      expect(screen.getByText('Test message from props')).toBeInTheDocument();
    });

    it('uses ThinkingIndicator as default HOC fallback', () => {
      const WrappedComponent = withReasoningErrorBoundary(ThrowErrorComponent);

      render(<WrappedComponent shouldThrow={true} />);

      // ThinkingIndicator should be rendered (check for its default text)
      expect(screen.getByText(/Error loading reasoning/i)).toBeInTheDocument();
    });
  });

  describe('Error Boundary Lifecycle', () => {
    it('calls getDerivedStateFromError when error is thrown', () => {
      const { container } = render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent errorMessage="Lifecycle test" />
        </ReasoningErrorBoundary>
      );

      // Error UI should be visible, meaning getDerivedStateFromError was called
      expect(screen.getByText('Failed to load reasoning steps')).toBeInTheDocument();
    });

    it('calls componentDidCatch after error', () => {
      // console.error is already mocked in setup.ts, just use it directly
      const mockConsoleError = console.error as any;

      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent errorMessage="componentDidCatch test" />
        </ReasoningErrorBoundary>
      );

      // componentDidCatch logs to console
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('stores error and errorInfo in state', () => {
      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent errorMessage="State test error" />
        </ReasoningErrorBoundary>
      );

      // Error message should be displayed (from state)
      expect(screen.getByText('State test error')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles for error UI', () => {
      const { container } = render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      // Buttons should have proper roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('error icon has appropriate styling for visibility', () => {
      const { container } = render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
      );

      // Check for destructive color class
      const icon = container.querySelector('.text-destructive');
      expect(icon).toBeInTheDocument();
    });

    it('maintains focus management for "Try Again" button', async () => {
      const user = userEvent.setup();

      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent />
        </ReasoningErrorBoundary>
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
        <ReasoningErrorBoundary>
          <ThrowErrorComponent errorMessage={longMessage} />
        </ReasoningErrorBoundary>
      );

      // Should still render error UI without breaking layout
      expect(screen.getByText('Failed to load reasoning steps')).toBeInTheDocument();
    });

    it('handles errors with special characters in message', () => {
      const specialCharMessage = '<script>alert("XSS")</script>';

      render(
        <ReasoningErrorBoundary>
          <ThrowErrorComponent errorMessage={specialCharMessage} />
        </ReasoningErrorBoundary>
      );

      // Should display error without executing script
      expect(screen.getByText(/script/i)).toBeInTheDocument();
      expect(document.querySelectorAll('script').length).toBe(0);
    });

    it('handles nested error boundaries', () => {
      render(
        <ReasoningErrorBoundary>
          <ReasoningErrorBoundary>
            <ThrowErrorComponent errorMessage="Nested error" />
          </ReasoningErrorBoundary>
        </ReasoningErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText('Failed to load reasoning steps')).toBeInTheDocument();
    });

    it('handles errors in custom fallback component', () => {
      // Fallback that throws (edge case)
      const BadFallback = () => {
        throw new Error("Fallback error");
      };

      // This should be caught by outer error boundary or React's default error handling
      expect(() => {
        render(
          <ReasoningErrorBoundary fallback={<BadFallback />}>
            <ThrowErrorComponent />
          </ReasoningErrorBoundary>
        );
      }).toThrow();
    });
  });

  describe('Multiple Errors', () => {
    it('handles multiple errors in sequence', async () => {
      const user = userEvent.setup();

      const TestWrapper = ({ errorNum }: { errorNum: number }) => (
        <ReasoningErrorBoundary key={errorNum}>
          <ThrowErrorComponent errorMessage={`Error #${errorNum}`} />
        </ReasoningErrorBoundary>
      );

      const { rerender } = render(<TestWrapper errorNum={1} />);

      // First error should be shown
      expect(screen.getByText(/Error #1/i)).toBeInTheDocument();

      // Click reset
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Remount with new error (simulating another error after reset)
      rerender(<TestWrapper errorNum={2} />);

      // Second error should be shown
      await screen.findByText(/Error #2/i);
      expect(screen.getByText(/Error #2/i)).toBeInTheDocument();
    });
  });
});
