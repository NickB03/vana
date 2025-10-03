'use client'

/**
 * SSE Error Boundary Component
 * 
 * Provides comprehensive error handling for Server-Sent Events connections
 * with automatic reconnection, user-friendly error messages, and graceful degradation.
 */

import React, { Component, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface SSEErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: string | null
  isReconnecting: boolean
  reconnectAttempts: number
  lastErrorTime: Date | null
  userDismissed: boolean
}

interface SSEErrorBoundaryProps {
  children: ReactNode
  onRetry?: () => void
  maxRetries?: number
  retryDelay?: number
  showReconnectProgress?: boolean
  fallback?: ReactNode
}

interface SSEError extends Error {
  code?: string
  reconnectable?: boolean
  sessionId?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

export class SSEErrorBoundary extends Component<SSEErrorBoundaryProps, SSEErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null
  private readonly maxRetries: number
  private readonly retryDelay: number

  constructor(props: SSEErrorBoundaryProps) {
    super(props)
    
    this.maxRetries = props.maxRetries || 5
    this.retryDelay = props.retryDelay || 3000
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReconnecting: false,
      reconnectAttempts: 0,
      lastErrorTime: null,
      userDismissed: false
    }
  }

  static getDerivedStateFromError(error: Error): Partial<SSEErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: new Date()
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo: errorInfo.componentStack || 'No stack trace available'
    })
    
    // Log error for monitoring
    this.logError(error, errorInfo)
    
    // Attempt automatic recovery for SSE errors
    if (this.isSSEError(error) && this.shouldAttemptReconnect()) {
      this.attemptReconnect()
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }

  private isSSEError(error: Error): error is SSEError {
    return error.name === 'SSEError' || 
           error.message.includes('EventSource') ||
           error.message.includes('Server-Sent Event')
  }

  private shouldAttemptReconnect(): boolean {
    const { reconnectAttempts } = this.state
    return reconnectAttempts < this.maxRetries
  }

  private attemptReconnect = () => {
    const { reconnectAttempts } = this.state
    
    if (reconnectAttempts >= this.maxRetries) {
      return
    }

    this.setState({
      isReconnecting: true,
      reconnectAttempts: reconnectAttempts + 1
    })

    // Calculate exponential backoff delay
    const delay = this.retryDelay * Math.pow(2, reconnectAttempts)
    
    this.retryTimeout = setTimeout(() => {
      this.handleRetry()
    }, delay)
  }

  private handleRetry = () => {
    const { onRetry } = this.props
    
    try {
      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isReconnecting: false,
        userDismissed: false
      })
      
      // Call parent retry handler
      if (onRetry) {
        onRetry()
      }
    } catch (error) {
      // If retry fails, update state
      this.setState({
        isReconnecting: false,
        hasError: true,
        error: error as Error
      })
    }
  }

  private handleUserRetry = () => {
    this.setState({
      reconnectAttempts: 0  // Reset attempts for manual retry
    })
    this.handleRetry()
  }

  private handleDismiss = () => {
    this.setState({
      userDismissed: true
    })
  }

  private logError(error: Error, errorInfo?: React.ErrorInfo) {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('SSE Error Boundary caught an error:', errorData)
    }
    
    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (e.g., Sentry)
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

  private getErrorMessage(error: SSEError): string {
    if (error.code === 'CONNECTION_ERROR') {
      return 'Connection to the server was lost. Attempting to reconnect...'
    }
    
    if (error.code === 'AUTH_ERROR') {
      return 'Authentication expired. Please refresh the page to continue.'
    }
    
    if (error.code === 'RATE_LIMIT_ERROR') {
      return 'Too many requests. Please wait a moment before trying again.'
    }
    
    if (error.message.includes('timeout')) {
      return 'Connection timed out. Attempting to reconnect...'
    }
    
    if (error.message.includes('network')) {
      return 'Network error occurred. Please check your connection.'
    }
    
    return 'A connection error occurred. Please try again.'
  }

  private getErrorSeverity(error: SSEError): 'low' | 'medium' | 'high' | 'critical' {
    if (error.severity) {
      return error.severity
    }
    
    if (error.code === 'AUTH_ERROR') {
      return 'high'
    }
    
    if (error.code === 'RATE_LIMIT_ERROR') {
      return 'medium'
    }
    
    if (error.code === 'CONNECTION_ERROR') {
      return 'medium'
    }
    
    return 'low'
  }

  private renderReconnectProgress() {
    const { isReconnecting, reconnectAttempts } = this.state
    
    if (!isReconnecting || !this.props.showReconnectProgress) {
      return null
    }
    
    const progress = Math.min((reconnectAttempts / this.maxRetries) * 100, 100)
    
    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Reconnecting... (Attempt {reconnectAttempts} of {this.maxRetries})
        </div>
        <Progress value={progress} className="w-full" />
      </div>
    )
  }

  private renderErrorAlert() {
    const { error, isReconnecting, reconnectAttempts, userDismissed } = this.state
    
    if (!error || userDismissed) {
      return null
    }
    
    const sseError = error as SSEError
    const severity = this.getErrorSeverity(sseError)
    const message = this.getErrorMessage(sseError)
    const canRetry = reconnectAttempts < this.maxRetries
    const isAuthError = sseError.code === 'AUTH_ERROR'
    
    return (
      <Alert variant={severity === 'critical' ? 'destructive' : 'default'} className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>Connection Error</span>
          <div className="flex items-center gap-2">
            {isReconnecting ? (
              <WifiOff className="h-4 w-4 text-orange-500" />
            ) : (
              <Wifi className="h-4 w-4 text-gray-500" />
            )}
          </div>
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p>{message}</p>
          
          {this.renderReconnectProgress()}
          
          <div className="flex gap-2">
            {canRetry && !isReconnecting && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleUserRetry}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
            )}
            
            {isAuthError && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={this.handleDismiss}
            >
              Dismiss
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  render() {
    const { children, fallback } = this.props
    const { hasError, error } = this.state
    
    if (hasError && error) {
      return (
        <div className="p-4">
          {this.renderErrorAlert()}
          
          {fallback || (
            <div className="text-center text-muted-foreground p-8">
              <WifiOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Real-time updates are temporarily unavailable.</p>
              <p className="text-sm mt-2">Some features may not work correctly.</p>
            </div>
          )}
        </div>
      )
    }
    
    return <>{children}</>
  }
}

export default SSEErrorBoundary