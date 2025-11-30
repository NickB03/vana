import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { ThinkingIndicator } from "./ThinkingIndicator";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary for ReasoningDisplay component
 * Prevents entire chat interface from crashing if reasoning display fails
 */
export class ReasoningErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error(
      "[ReasoningErrorBoundary] Component error:",
      error,
      errorInfo
    );

    // TODO: Log to monitoring service (Sentry, DataDog, etc.)
    // logToSentry({
    //   error,
    //   errorInfo,
    //   context: 'ReasoningDisplay rendering',
    //   tags: {
    //     component: 'ReasoningDisplay',
    //     severity: 'error',
    //   },
    // });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="my-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Failed to load reasoning steps
              </p>
              <p className="text-xs text-muted-foreground">
                {this.state.error?.message ||
                  "An error occurred while displaying the reasoning process."}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                {import.meta.env.DEV && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      console.log("Error details:", this.state.error);
                      console.log("Error info:", this.state.errorInfo);
                    }}
                  >
                    View Details (Dev)
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with error boundary
 * Usage: const SafeComponent = withReasoningErrorBoundary(MyComponent);
 */
export function withReasoningErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ReasoningErrorBoundary
        fallback={fallback || <ThinkingIndicator status="Error loading reasoning" />}
      >
        <Component {...props} />
      </ReasoningErrorBoundary>
    );
  };
}
