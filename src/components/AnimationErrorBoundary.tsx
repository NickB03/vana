/**
 * AnimationErrorBoundary Component
 *
 * Error boundary specifically for catching animation-related failures.
 * Provides graceful fallback to non-animated content when motion/react
 * encounters errors (browser compatibility, memory issues, etc.)
 *
 * Usage:
 * <AnimationErrorBoundary fallback={<SimpleRoutes />}>
 *   <AnimatedRoutes />
 * </AnimationErrorBoundary>
 */

import { Component, ReactNode } from 'react';

interface AnimationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface AnimationErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary that catches animation failures and provides fallback rendering
 *
 * When animation error occurs:
 * 1. Logs error to console for debugging
 * 2. Renders fallback content (if provided) or original children without animations
 * 3. Prevents entire app from crashing due to animation issues
 */
export class AnimationErrorBoundary extends Component<
  AnimationErrorBoundaryProps,
  AnimationErrorBoundaryState
> {
  constructor(props: AnimationErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): AnimationErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('Animation error caught by boundary:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      location: 'AnimationErrorBoundary'
    });

    // In production, you might want to send this to an error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  render() {
    if (this.state.hasError) {
      // If fallback provided, render it; otherwise render children without animations
      // This ensures content is still accessible even if animations fail
      return this.props.fallback || this.props.children;
    }

    return this.props.children;
  }
}
