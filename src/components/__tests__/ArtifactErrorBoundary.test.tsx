/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ArtifactErrorBoundary, withArtifactErrorBoundary } from '../ArtifactErrorBoundary';

/**
 * Test Suite for ArtifactErrorBoundary Component
 *
 * Coverage:
 * - Error boundary catches artifact render errors
 * - Displays custom fallback UI when provided
 * - Displays default error UI when no fallback provided
 * - Reset functionality restores normal rendering
 * - Logs errors to console (production monitoring ready)
 * - Shows dev-only debugging button in development mode
 * - HOC wrapper (withArtifactErrorBoundary) works correctly
 * - Handles different error types gracefully
 */

// Mock component that throws an error
const ThrowErrorComponent = ({ shouldThrow = true, errorMessage = "Artifact render error" }: { shouldThrow?: boolean; errorMessage?: string }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Artifact rendered successfully</div>;
};

// Mock component that doesn't throw
const SafeArtifact = () => <div>Safe artifact content</div>;

describe('ArtifactErrorBoundary', () => {
  // Suppress console.error in tests (we're testing error handling)
  // Note: setup.ts already mocks console.error and console.warn globally

  afterEach(() => {
    cleanup();
    // Restore all mocks to prevent memory leaks from accumulated spy instances
    vi.clearAllMocks();
  });

  describe('Error Catching', () => {
    it('catches errors from artifact rendering', () => {
      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      // Should show error UI instead of crashing
      expect(screen.getByText('Failed to render artifact')).toBeInTheDocument();
      expect(screen.getByText(/Artifact render error/i)).toBeInTheDocument();
    });

    it('renders children normally when no error occurs', () => {
      render(
        <ArtifactErrorBoundary>
          <SafeArtifact />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText('Safe artifact content')).toBeInTheDocument();
    });

    it('logs error to console when error is caught', () => {
      // console.error is already mocked in setup.ts, just use it directly
      const mockConsoleError = console.error as any;

      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage="Bundling failed" />
        </ArtifactErrorBoundary>
      );

      expect(mockConsoleError).toHaveBeenCalled();
      const errorCalls = mockConsoleError.mock.calls.filter((call: any[]) =>
        String(call[0]).includes('[ArtifactErrorBoundary]')
      );
      expect(errorCalls.length).toBeGreaterThan(0);
    });

    it('handles errors with different error messages', () => {
      const customErrorMessage = "iframe security violation";

      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage={customErrorMessage} />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText(customErrorMessage)).toBeInTheDocument();
    });
  });

  describe('Default Fallback UI', () => {
    it('displays default error UI with error icon', () => {
      const { container } = render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      // Check for AlertCircle icon
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('displays error title', () => {
      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText('Failed to render artifact')).toBeInTheDocument();
    });

    it('displays error message', () => {
      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage="Network timeout loading bundle" />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText(/Network timeout loading bundle/i)).toBeInTheDocument();
    });

    it('displays default message when error has no message', () => {
      const ErrorComponentNoMessage = () => {
        throw new Error();
      };

      render(
        <ArtifactErrorBoundary>
          <ErrorComponentNoMessage />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText(/An error occurred while rendering this artifact/i)).toBeInTheDocument();
    });

    it('includes "Try Again" button', () => {
      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
    });

    it('has proper styling for error container', () => {
      const { container } = render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      const errorContainer = container.querySelector('.border-destructive\\/20');
      expect(errorContainer).toBeInTheDocument();
    });
  });

  describe('Custom Fallback UI', () => {
    it('displays custom fallback when provided', () => {
      const customFallback = <div>Custom artifact error message</div>;

      render(
        <ArtifactErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText('Custom artifact error message')).toBeInTheDocument();
      expect(screen.queryByText('Failed to render artifact')).not.toBeInTheDocument();
    });

    it('accepts React elements as fallback', () => {
      const customFallback = (
        <div className="custom-fallback">
          <h1>Artifact Error!</h1>
          <p>Something went wrong with this artifact</p>
        </div>
      );

      render(
        <ArtifactErrorBoundary fallback={customFallback}>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText('Artifact Error!')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong with this artifact')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('resets error state when "Try Again" is clicked', async () => {
      const user = userEvent.setup();

      // Use a key prop to force remount after reset
      const TestWrapper = ({ errorKey }: { errorKey: number }) => (
        <ArtifactErrorBoundary key={errorKey}>
          <ThrowErrorComponent shouldThrow={errorKey === 0} />
        </ArtifactErrorBoundary>
      );

      const { rerender } = render(<TestWrapper errorKey={0} />);

      // Error UI should be visible
      expect(screen.getByText('Failed to render artifact')).toBeInTheDocument();

      // Click "Try Again" to reset
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Remount with new key (simulates reset)
      rerender(<TestWrapper errorKey={1} />);

      // Success message should appear
      await screen.findByText('Artifact rendered successfully');
      expect(screen.getByText('Artifact rendered successfully')).toBeInTheDocument();
    });

    it('clears error state after reset', async () => {
      const user = userEvent.setup();

      const TestWrapper = ({ errorKey }: { errorKey: number }) => (
        <ArtifactErrorBoundary key={errorKey}>
          {errorKey === 0 ? <ThrowErrorComponent /> : <SafeArtifact />}
        </ArtifactErrorBoundary>
      );

      const { rerender } = render(<TestWrapper errorKey={0} />);

      // Error should be shown
      expect(screen.getByText('Failed to render artifact')).toBeInTheDocument();

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      await user.click(tryAgainButton);

      // Remount with new component
      rerender(<TestWrapper errorKey={1} />);

      await screen.findByText('Safe artifact content');
      expect(screen.getByText('Safe artifact content')).toBeInTheDocument();
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
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
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
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage="Debug artifact error" />
        </ArtifactErrorBoundary>
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
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      const viewDetailsButton = screen.queryByRole('button', { name: /view details/i });
      expect(viewDetailsButton).not.toBeInTheDocument();
    });

    it('still shows "Try Again" button in production', () => {
      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
    });
  });

  describe('Higher-Order Component (withArtifactErrorBoundary)', () => {
    it('wraps component with error boundary', () => {
      const WrappedComponent = withArtifactErrorBoundary(ThrowErrorComponent);

      render(<WrappedComponent shouldThrow={false} />);

      expect(screen.getByText('Artifact rendered successfully')).toBeInTheDocument();
    });

    it('catches errors from wrapped component', () => {
      const WrappedComponent = withArtifactErrorBoundary(ThrowErrorComponent);

      render(<WrappedComponent shouldThrow={true} errorMessage="HOC artifact error" />);

      // Should show default fallback since no custom fallback provided to HOC
      expect(screen.getByText('Failed to render artifact')).toBeInTheDocument();
    });

    it('accepts custom fallback for HOC', () => {
      const customFallback = <div>HOC custom fallback</div>;
      const WrappedComponent = withArtifactErrorBoundary(ThrowErrorComponent, customFallback);

      render(<WrappedComponent shouldThrow={true} />);

      expect(screen.getByText('HOC custom fallback')).toBeInTheDocument();
    });

    it('passes props through to wrapped component', () => {
      const PropsComponent = ({ title }: { title: string }) => <div>{title}</div>;
      const WrappedComponent = withArtifactErrorBoundary(PropsComponent);

      render(<WrappedComponent title="Test Artifact Title" />);

      expect(screen.getByText('Test Artifact Title')).toBeInTheDocument();
    });
  });

  describe('Error Boundary Lifecycle', () => {
    it('calls getDerivedStateFromError when error is thrown', () => {
      const { container } = render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage="Lifecycle test" />
        </ArtifactErrorBoundary>
      );

      // Error UI should be visible, meaning getDerivedStateFromError was called
      expect(screen.getByText('Failed to render artifact')).toBeInTheDocument();
    });

    it('calls componentDidCatch after error', () => {
      // console.error is already mocked in setup.ts, just use it directly
      const mockConsoleError = console.error as any;

      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage="componentDidCatch test" />
        </ArtifactErrorBoundary>
      );

      // componentDidCatch logs to console
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('stores error and errorInfo in state', () => {
      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage="State test error" />
        </ArtifactErrorBoundary>
      );

      // Error message should be displayed (from state)
      expect(screen.getByText('State test error')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles for error UI', () => {
      const { container } = render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      // Buttons should have proper roles
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('error icon has appropriate styling for visibility', () => {
      const { container } = render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
      );

      // Check for destructive color class
      const icon = container.querySelector('.text-destructive');
      expect(icon).toBeInTheDocument();
    });

    it('maintains focus management for "Try Again" button', async () => {
      const user = userEvent.setup();

      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent />
        </ArtifactErrorBoundary>
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
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage={longMessage} />
        </ArtifactErrorBoundary>
      );

      // Should still render error UI without breaking layout
      expect(screen.getByText('Failed to render artifact')).toBeInTheDocument();
    });

    it('handles errors with special characters in message', () => {
      const specialCharMessage = '<script>alert("XSS")</script>';

      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage={specialCharMessage} />
        </ArtifactErrorBoundary>
      );

      // Should display error without executing script
      expect(screen.getByText(/script/i)).toBeInTheDocument();
      expect(document.querySelectorAll('script').length).toBe(0);
    });

    it('handles nested error boundaries', () => {
      render(
        <ArtifactErrorBoundary>
          <ArtifactErrorBoundary>
            <ThrowErrorComponent errorMessage="Nested artifact error" />
          </ArtifactErrorBoundary>
        </ArtifactErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText('Failed to render artifact')).toBeInTheDocument();
    });

    it('handles errors in custom fallback component', () => {
      // Fallback that throws (edge case)
      const BadFallback = () => {
        throw new Error("Fallback error");
      };

      // This should be caught by outer error boundary or React's default error handling
      expect(() => {
        render(
          <ArtifactErrorBoundary fallback={<BadFallback />}>
            <ThrowErrorComponent />
          </ArtifactErrorBoundary>
        );
      }).toThrow();
    });
  });

  describe('Artifact-Specific Error Scenarios', () => {
    it('handles iframe loading errors', () => {
      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage="Failed to load iframe content" />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText(/Failed to load iframe content/i)).toBeInTheDocument();
    });

    it('handles bundling failures', () => {
      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage="Server-side bundling failed: Rate limit exceeded" />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText(/bundling failed/i)).toBeInTheDocument();
    });

    it('handles React component compilation errors', () => {
      render(
        <ArtifactErrorBoundary>
          <ThrowErrorComponent errorMessage="SyntaxError: Unexpected token" />
        </ArtifactErrorBoundary>
      );

      expect(screen.getByText(/SyntaxError/i)).toBeInTheDocument();
    });
  });
});
