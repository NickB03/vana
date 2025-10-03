'use client'

/**
 * Generic Error Boundary Component
 *
 * Provides comprehensive error handling for React components with
 * user-friendly error messages, error logging, and graceful fallbacks.
 */

import React, { Component, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  showErrorDetails?: boolean
  allowRetry?: boolean
  showHomeButton?: boolean
  componentName?: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    return {
      hasError: true,
      error,
      errorId
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo
    })

    // Log error for monitoring
    this.logError(error, errorInfo)

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private logError(error: Error, errorInfo: React.ErrorInfo) {
    const { componentName } = this.props
    const { errorId } = this.state

    const errorData = {
      errorId,
      component: componentName || 'Unknown',
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      pathname: window.location.pathname
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary: ${componentName || 'Component'} Error`)
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Full Error Data:', errorData)
      console.groupEnd()
    }

    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      try {
        fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorData)
        }).catch(() => {
          // Silently fail if error reporting fails
        })
      } catch {
        // Silently fail if error reporting fails
      }
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private getErrorMessage(error: Error): string {
    // Provide user-friendly error messages
    if (error.name === 'ChunkLoadError') {
      return 'Failed to load application resources. This may be due to a network issue or an outdated cache.'
    }

    if (error.message.includes('Network Error')) {
      return 'Network connection error. Please check your internet connection and try again.'
    }

    if (error.message.includes('TypeError')) {
      return 'A technical error occurred while processing your request.'
    }

    if (error.message.includes('fetch')) {
      return 'Failed to communicate with the server. Please try again.'
    }

    return 'An unexpected error occurred. Our team has been notified.'
  }

  private getErrorSuggestion(error: Error): string {
    if (error.name === 'ChunkLoadError') {
      return 'Try refreshing the page or clearing your browser cache.'
    }

    if (error.message.includes('Network Error')) {
      return 'Check your internet connection and try again.'
    }

    return 'If this problem persists, please contact support.'
  }

  render() {
    const { children, fallback, showErrorDetails = false, allowRetry = true, showHomeButton = false, componentName } = this.props
    const { hasError, error, errorInfo, errorId } = this.state

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      const userMessage = this.getErrorMessage(error)
      const suggestion = this.getErrorSuggestion(error)

      return (
        <div className="p-4 min-h-[200px] flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-lg">Something went wrong</CardTitle>
              <CardDescription>
                {componentName && `Error in ${componentName} component`}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <Alert>
                <Bug className="h-4 w-4" />
                <AlertTitle>Error Details</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="text-sm">{userMessage}</p>
                  <p className="text-xs text-muted-foreground">{suggestion}</p>
                  {errorId && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Error ID: {errorId}
                    </p>
                  )}
                </AlertDescription>
              </Alert>

              {showErrorDetails && process.env.NODE_ENV === 'development' && (
                <Alert variant="destructive">
                  <AlertTitle>Development Details</AlertTitle>
                  <AlertDescription className="mt-2">
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">Technical Details</summary>
                      <div className="mt-2 space-y-2">
                        <p><strong>Error:</strong> {error.name}: {error.message}</p>
                        {error.stack && (
                          <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded">
                            {error.stack}
                          </pre>
                        )}
                        {errorInfo?.componentStack && (
                          <pre className="whitespace-pre-wrap text-xs bg-gray-100 p-2 rounded">
                            {errorInfo.componentStack}
                          </pre>
                        )}
                      </div>
                    </details>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-center">
                {allowRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleRetry}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                  </Button>
                )}

                {showHomeButton && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return <>{children}</>
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

export default ErrorBoundary