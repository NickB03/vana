/**
 * SparkleErrorBoundary Component
 *
 * Error boundary specifically for catching SparkleBackground rendering failures.
 * Provides graceful degradation by rendering null when particle engine fails.
 *
 * Usage:
 * <SparkleErrorBoundary resetKey={someKey}>
 *   <SparkleBackground {...props} />
 * </SparkleErrorBoundary>
 *
 * Features:
 * - Automatic reset when resetKey prop changes
 * - Public resetErrorBoundary method for manual reset via ref
 * - Graceful degradation (renders null on error)
 */

import { Component, ReactNode } from 'react';

interface SparkleErrorBoundaryProps {
  children: ReactNode;
  resetKey?: string | number; // When changed, resets error state
}

interface SparkleErrorBoundaryState {
  hasError: boolean;
}

/**
 * Error boundary that catches SparkleBackground failures and provides graceful degradation
 *
 * When error occurs:
 * 1. Logs error to console for debugging
 * 2. Renders null (graceful degradation - app continues without sparkles)
 * 3. Prevents entire app from crashing due to tsparticles issues
 */
export class SparkleErrorBoundary extends Component<
  SparkleErrorBoundaryProps,
  SparkleErrorBoundaryState
> {
  constructor(props: SparkleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): SparkleErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('[SparkleErrorBoundary] Sparkle background error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      location: 'SparkleErrorBoundary'
    });

    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  componentDidUpdate(prevProps: SparkleErrorBoundaryProps) {
    // Reset error state when resetKey changes
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  /**
   * Public method to manually reset the error boundary
   * Can be called via ref: errorBoundaryRef.current?.resetErrorBoundary()
   */
  public resetErrorBoundary = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      // Graceful degradation - render nothing when sparkles fail
      return null;
    }

    return this.props.children;
  }
}
