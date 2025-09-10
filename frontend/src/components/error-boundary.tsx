"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorHandler, ErrorLogger, AppError } from '../lib/error-handler';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'section';
  name?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  appError: AppError | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      appError: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error and generate recovery actions
    const result = ErrorHandler.handle(error, {
      action: 'component_render',
      resource: this.props.name || 'unknown_component',
      url: window.location.href,
    });

    // Update state with processed error information
    this.setState({
      errorInfo,
      appError: result.error,
      errorId: result.error.id,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        appError: null,
        errorId: null,
      });
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportError = () => {
    if (this.state.appError) {
      // Create error report
      const report = {
        errorId: this.state.errorId,
        message: this.state.error?.message,
        stack: this.state.error?.stack,
        componentStack: this.state.errorInfo?.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        props: this.props.name ? { componentName: this.props.name } : undefined,
      };

      // Copy to clipboard
      navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      
      // Show feedback
      alert('Error report copied to clipboard. Please share this with support.');
    }
  };

  renderErrorUI() {
    const { level = 'component', name, showDetails = false } = this.props;
    const { error, appError, errorId } = this.state;

    // Determine error display level
    const isPageLevel = level === 'page';
    const isComponentLevel = level === 'component';
    
    // Get severity styling
    const severityColors = {
      low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      medium: 'bg-orange-50 border-orange-200 text-orange-800',
      high: 'bg-red-50 border-red-200 text-red-800',
      critical: 'bg-red-100 border-red-300 text-red-900',
    };

    const severityColor = appError ? severityColors[appError.severity] : severityColors.medium;

    if (isPageLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${severityColor}`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-center">
                {appError?.userMessage || "We're having trouble loading this page. Please try again."}
              </p>
              
              {errorId && (
                <div className="flex items-center justify-center">
                  <Badge variant="outline" className="text-xs">
                    Error ID: {errorId.slice(-8)}
                  </Badge>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {this.retryCount < this.maxRetries && (
                  <Button onClick={this.handleRetry} variant="default" className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again ({this.maxRetries - this.retryCount} remaining)
                  </Button>
                )}
                
                <Button onClick={this.handleRefresh} variant="outline" className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
                
                <Button onClick={this.handleGoHome} variant="ghost" className="w-full">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </div>

              {showDetails && error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                    Technical Details
                  </summary>
                  <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-auto max-h-32">
                    {error.message}
                  </div>
                </details>
              )}

              <Button 
                onClick={this.handleReportError} 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs"
              >
                <Bug className="w-3 h-3 mr-1" />
                Report Error
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (isComponentLevel) {
      return (
        <div className={`border rounded-lg p-4 ${severityColor}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm">
                {name ? `Error in ${name}` : 'Component Error'}
              </h3>
              <p className="text-sm mt-1">
                {appError?.userMessage || 'This component failed to load properly.'}
              </p>
              
              <div className="flex gap-2 mt-3">
                {this.retryCount < this.maxRetries && (
                  <Button onClick={this.handleRetry} size="sm" variant="outline">
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
                
                {showDetails && (
                  <Button 
                    onClick={this.handleReportError} 
                    size="sm" 
                    variant="ghost"
                  >
                    <Bug className="w-3 h-3 mr-1" />
                    Report
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Section level - minimal inline error
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-2 rounded text-sm ${severityColor}`}>
        <AlertTriangle className="w-4 h-4" />
        <span>Error loading content</span>
        {this.retryCount < this.maxRetries && (
          <Button onClick={this.handleRetry} size="sm" variant="ghost" className="h-6 px-2">
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Otherwise use built-in error UI
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

// Convenience wrapper components
export function PageErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <ErrorBoundary level="page" {...props}>
      {children}
    </ErrorBoundary>
  );
}

export function ComponentErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <ErrorBoundary level="component" {...props}>
      {children}
    </ErrorBoundary>
  );
}

export function SectionErrorBoundary({ children, ...props }: Omit<ErrorBoundaryProps, 'level'>) {
  return (
    <ErrorBoundary level="section" {...props}>
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;