/**
 * Auth Error Boundary Component
 * Handles authentication errors gracefully
 */

'use client';

import { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/ui/icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    this.props.onReset?.();
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }

      const isAuthError = this.state.error?.message?.toLowerCase().includes('auth') ||
                          this.state.error?.message?.toLowerCase().includes('token') ||
                          this.state.error?.message?.toLowerCase().includes('login');

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Icons.alertTriangle className="h-5 w-5 text-destructive" />
                <CardTitle>
                  {isAuthError ? 'Authentication Error' : 'Something went wrong'}
                </CardTitle>
              </div>
              <CardDescription>
                {isAuthError 
                  ? 'There was a problem with authentication'
                  : 'An unexpected error occurred'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <Icons.alertCircle className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription className="mt-2">
                  <code className="text-xs">
                    {this.state.error?.message || 'Unknown error'}
                  </code>
                </AlertDescription>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Stack trace (development only)
                  </summary>
                  <pre className="mt-2 overflow-auto p-2 bg-muted rounded text-[10px]">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button onClick={this.handleReset} variant="default">
                Try Again
              </Button>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
              >
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Auth Error Alert Component
 * For inline error display
 */
interface AuthErrorAlertProps {
  error: string | Error | null;
  onDismiss?: () => void;
  variant?: 'default' | 'destructive';
  className?: string;
}

export function AuthErrorAlert({ 
  error, 
  onDismiss,
  variant = 'destructive',
  className 
}: AuthErrorAlertProps) {
  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : error;

  return (
    <Alert variant={variant} className={className}>
      <Icons.alertCircle className="h-4 w-4" />
      <AlertTitle>Authentication Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{errorMessage}</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="ml-2 h-auto p-1"
            aria-label="Dismiss error"
            title="Dismiss error"
          >
            <Icons.x className="h-3 w-3" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}