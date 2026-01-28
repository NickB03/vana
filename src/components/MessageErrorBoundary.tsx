import React, { Component, ErrorInfo, ReactNode } from "react";
import * as Sentry from "@sentry/react";
import { AlertCircle, Eye } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  messageContent?: string; // Raw message content for debugging
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  showRawContent: boolean;
}

/**
 * Error Boundary for individual message rendering
 * Prevents single message parse errors from crashing entire chat
 *
 * Common failure scenarios:
 * - Malformed artifact tags
 * - Invalid markdown syntax
 * - Missing or corrupted message data
 * - Artifact parsing failures
 */
export class MessageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, showRawContent: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      showRawContent: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console for debugging
    console.error(
      "[MessageErrorBoundary] Message render error:",
      error,
      errorInfo
    );

    // Report to Sentry with context
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        component: 'MessageErrorBoundary',
        severity: 'low',
        errorType: 'message_render_failure',
      },
      level: 'warning',
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      showRawContent: false,
    });
  };

  toggleRawContent = () => {
    this.setState((prev) => ({ showRawContent: !prev.showRawContent }));
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="my-2 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Message failed to render
              </p>
              <p className="text-xs text-muted-foreground">
                {this.state.error?.message ||
                  "This message could not be displayed due to a parsing error. The raw content is available below."}
              </p>

              {/* Show raw content toggle if available */}
              {this.props.messageContent && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={this.toggleRawContent}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    {this.state.showRawContent
                      ? "Hide Raw Content"
                      : "Show Raw Content"}
                  </Button>

                  {this.state.showRawContent && (
                    <div className="mt-2 p-3 bg-muted/50 rounded border border-border">
                      <pre className="text-xs whitespace-pre-wrap break-words font-mono text-foreground/80">
                        {this.props.messageContent}
                      </pre>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={this.handleReset}
                >
                  Try Again
                </Button>
                {import.meta.env.DEV && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      console.log("Error details:", this.state.error);
                      console.log("Error info:", this.state.errorInfo);
                      console.log("Message content:", this.props.messageContent);
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
 * HOC to wrap components with message error boundary
 * Usage: const SafeMessage = withMessageErrorBoundary(MessageWithArtifacts);
 */
export function withMessageErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <MessageErrorBoundary fallback={fallback}>
        <Component {...props} />
      </MessageErrorBoundary>
    );
  };
}
