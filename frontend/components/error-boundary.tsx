'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { SSEConnectionError, VanaBackendError, StreamParsingError, isRetryableError } from '@/lib/errors';
import { toast } from './toast';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  showConnectionStatus?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      connectionStatus: 'connected',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      connectionStatus: error instanceof SSEConnectionError ? 'disconnected' : 'connected',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Show toast notification for specific error types
    this.handleErrorNotification(error);

    // Auto-retry for retryable errors
    if (this.props.enableRetry && isRetryableError(error) && this.state.retryCount < (this.props.maxRetries || 3)) {
      this.scheduleRetry(error);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private handleErrorNotification = (error: Error) => {
    if (error instanceof SSEConnectionError) {
      toast({
        type: 'warning',
        description: 'Connection lost. Attempting to reconnect...',
      });
    } else if (error instanceof VanaBackendError) {
      toast({
        type: 'error',
        description: error.retryable 
          ? 'VANA service error. Retrying...' 
          : 'VANA service unavailable. Using fallback provider.',
      });
    } else if (error instanceof StreamParsingError) {
      toast({
        type: 'warning',
        description: 'Data parsing error. Please refresh to continue.',
      });
    }
  };

  private scheduleRetry = (error: Error) => {
    this.setState({ isRetrying: true, connectionStatus: 'reconnecting' });

    const baseDelay = 1000;
    const delay = Math.min(baseDelay * Math.pow(2, this.state.retryCount), 30000);
    
    this.retryTimeoutId = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  private handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      isRetrying: false,
      retryCount: prevState.retryCount + 1,
      connectionStatus: 'connected',
    }));

    toast({
      type: 'success',
      description: 'Connection restored.',
    });
  };

  private handleManualRetry = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
    this.handleRetry();
  };

  private handleReset = () => {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      connectionStatus: 'connected',
    });
  };

  private renderConnectionStatus = () => {
    if (!this.props.showConnectionStatus) return null;

    const { connectionStatus } = this.state;
    
    return (
      <div className="flex items-center gap-2 text-sm mb-4">
        {connectionStatus === 'connected' && (
          <>
            <Wifi className="w-4 h-4 text-green-600" />
            <span className="text-green-600">Connected</span>
          </>
        )}
        {connectionStatus === 'disconnected' && (
          <>
            <WifiOff className="w-4 h-4 text-red-600" />
            <span className="text-red-600">Disconnected</span>
          </>
        )}
        {connectionStatus === 'reconnecting' && (
          <>
            <RefreshCw className="w-4 h-4 text-yellow-600 animate-spin" />
            <span className="text-yellow-600">Reconnecting...</span>
          </>
        )}
      </div>
    );
  };

  private renderErrorDetails = (error: Error) => {
    if (error instanceof SSEConnectionError) {
      return (
        <div className="space-y-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Server connection lost. This is usually temporary and will be restored automatically.
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Retry attempt: {error.reconnectAttempt}</div>
            {error.retryAfter && <div>Retry in: {error.retryAfter}ms</div>}
          </div>
        </div>
      );
    }

    if (error instanceof VanaBackendError) {
      return (
        <div className="space-y-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              VANA backend service is experiencing issues. 
              {error.retryable ? ' The system will retry automatically.' : ' Please try again later.'}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Error code: {error.code}</div>
            <div>Status: {error.statusCode}</div>
            {error.details && <div>Details: {JSON.stringify(error.details, null, 2)}</div>}
          </div>
        </div>
      );
    }

    if (error instanceof StreamParsingError) {
      return (
        <div className="space-y-3">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to parse streaming data. This may be due to a temporary network issue.
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <div>Parse stage: {error.parseStage}</div>
            <div>Raw data length: {error.rawData.length} characters</div>
          </div>
        </div>
      );
    }

    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          An unexpected error occurred: {error.message}
        </AlertDescription>
      </Alert>
    );
  };

  render() {
    const { children, fallback } = this.props;
    const { hasError, error, isRetrying, retryCount } = this.state;

    if (hasError && error) {
      if (fallback) {
        return fallback;
      }

      const canRetry = this.props.enableRetry && isRetryableError(error) && retryCount < (this.props.maxRetries || 3);

      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Connection Error
              </CardTitle>
              <CardDescription>
                There was a problem with the connection to the service.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {this.renderConnectionStatus()}
              {this.renderErrorDetails(error)}
              
              <div className="flex gap-2">
                {canRetry && (
                  <Button
                    onClick={this.handleManualRetry}
                    disabled={isRetrying}
                    variant="outline"
                    size="sm"
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry Now
                      </>
                    )}
                  </Button>
                )}
                
                <Button onClick={this.handleReset} size="sm">
                  Reset Connection
                </Button>
              </div>
              
              {retryCount > 0 && (
                <div className="text-xs text-muted-foreground">
                  Retry attempts: {retryCount} / {this.props.maxRetries || 3}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-based error boundary for functional components
 */
export function useErrorHandler() {
  return {
    handleError: (error: Error, context?: string) => {
      console.error(`Error in ${context || 'component'}:`, error);
      
      if (error instanceof SSEConnectionError) {
        toast({
          type: 'warning',
          description: 'Connection interrupted. Attempting to reconnect...',
        });
      } else if (error instanceof VanaBackendError) {
        toast({
          type: 'error',
          description: error.retryable 
            ? 'Service temporarily unavailable. Retrying...'
            : error.message,
        });
      } else if (error instanceof StreamParsingError) {
        toast({
          type: 'warning',
          description: 'Data parsing error. Please refresh if issues persist.',
        });
      } else {
        toast({
          type: 'error',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    },
    
    createSSEError: (message: string, options?: Partial<SSEConnectionError>) => 
      new SSEConnectionError(message, options ? {
        ...options,
        cause: options.cause instanceof Error ? options.cause : undefined
      } : undefined),
      
    createVanaError: (message: string, code: string, statusCode?: number, options?: any) => 
      new VanaBackendError(message, code, statusCode, options),
      
    createParsingError: (message: string, rawData: string, parseStage: 'json' | 'event' | 'message', cause?: Error) =>
      new StreamParsingError(message, rawData, parseStage, cause),
  };
}