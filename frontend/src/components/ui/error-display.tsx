"use client";

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  X, 
  Info, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Bug,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/src/lib/utils';
import { AppError, ErrorRecoveryAction } from '../../lib/error-handler';

// ===== ERROR DISPLAY COMPONENTS =====

interface ErrorDisplayProps {
  error: AppError;
  actions?: ErrorRecoveryAction[];
  onAction?: (action: ErrorRecoveryAction) => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'inline' | 'card' | 'banner' | 'toast';
  showDetails?: boolean;
}

export function ErrorDisplay({ 
  error, 
  actions = [], 
  onAction, 
  onDismiss,
  className,
  variant = 'card',
  showDetails = false 
}: ErrorDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get icon and colors based on error severity
  const getErrorIcon = () => {
    switch (error.severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getErrorVariant = (): "default" | "destructive" => {
    switch (error.severity) {
      case 'critical':
      case 'high':
        return 'destructive';
      case 'medium':
      case 'low':
      default:
        return 'default';
    }
  };

  const handleAction = (action: ErrorRecoveryAction) => {
    try {
      action.action();
      onAction?.(action);
    } catch (actionError) {
      console.error('Failed to execute recovery action:', actionError);
    }
  };

  // Render different variants
  switch (variant) {
    case 'inline':
      return (
        <Alert variant={getErrorVariant()} className={cn("mb-4", className)}>
          <div className="flex items-start gap-2">
            {getErrorIcon()}
            <div className="flex-1">
              <AlertDescription className="text-sm">
                {error.userMessage}
              </AlertDescription>
              {actions.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {actions.map((action, index) => (
                    <Button
                      key={index}
                      onClick={() => handleAction(action)}
                      size="sm"
                      variant={action.primary ? "default" : "outline"}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {onDismiss && (
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Alert>
      );

    case 'banner':
      return (
        <div className={cn(
          "border-l-4 p-4 mb-4",
          error.severity === 'critical' ? "border-red-500 bg-red-50" :
          error.severity === 'high' ? "border-red-400 bg-red-50" :
          error.severity === 'medium' ? "border-orange-400 bg-orange-50" :
          "border-blue-400 bg-blue-50",
          className
        )}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {getErrorIcon()}
              <div>
                <h3 className="font-medium text-sm">
                  {error.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h3>
                <p className="text-sm mt-1 text-gray-600">
                  {error.userMessage}
                </p>
                {actions.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        onClick={() => handleAction(action)}
                        size="sm"
                        variant={action.primary ? "default" : "outline"}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {onDismiss && (
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      );

    case 'toast':
      return (
        <div className={cn(
          "fixed bottom-4 right-4 max-w-sm bg-white border rounded-lg shadow-lg p-4 z-50",
          className
        )}>
          <div className="flex items-start gap-3">
            {getErrorIcon()}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {error.userMessage}
              </p>
              {actions.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {actions.slice(0, 2).map((action, index) => (
                    <Button
                      key={index}
                      onClick={() => handleAction(action)}
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            {onDismiss && (
              <Button
                onClick={onDismiss}
                size="sm"
                variant="ghost"
                className="p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      );

    case 'card':
    default:
      return (
        <Card className={cn("mb-4", className)}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getErrorIcon()}
                <CardTitle className="text-base">
                  {error.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {error.severity}
                </Badge>
              </div>
              {onDismiss && (
                <Button
                  onClick={onDismiss}
                  size="sm"
                  variant="ghost"
                  className="p-1 h-auto"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-gray-600 mb-4">
              {error.userMessage}
            </p>
            
            {actions.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2 mb-4">
                  {actions.map((action, index) => (
                    <Button
                      key={index}
                      onClick={() => handleAction(action)}
                      size="sm"
                      variant={action.primary ? "default" : "outline"}
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
                <Separator className="mb-4" />
              </>
            )}

            {showDetails && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 mb-2">
                  Technical Details
                </summary>
                <div className="bg-gray-50 p-3 rounded border space-y-2">
                  <div>
                    <strong>Error ID:</strong> {error.id}
                  </div>
                  <div>
                    <strong>Type:</strong> {error.type}
                  </div>
                  <div>
                    <strong>Timestamp:</strong> {error.timestamp.toLocaleString()}
                  </div>
                  {error.context?.url && (
                    <div>
                      <strong>URL:</strong> {error.context.url}
                    </div>
                  )}
                  {error.details && (
                    <div>
                      <strong>Details:</strong>
                      <pre className="mt-1 text-xs bg-white p-2 rounded border overflow-auto">
                        {JSON.stringify(error.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      );
  }
}

// ===== CONNECTION STATUS INDICATOR =====

interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
  onReconnect?: () => void;
  className?: string;
}

export function ConnectionStatus({ status, onReconnect, className }: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-4 h-4 text-green-600" />,
          text: 'Connected',
          color: 'text-green-600',
          bg: 'bg-green-50 border-green-200'
        };
      case 'connecting':
        return {
          icon: <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />,
          text: 'Connecting...',
          color: 'text-blue-600',
          bg: 'bg-blue-50 border-blue-200'
        };
      case 'reconnecting':
        return {
          icon: <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />,
          text: 'Reconnecting...',
          color: 'text-orange-600',
          bg: 'bg-orange-50 border-orange-200'
        };
      case 'error':
        return {
          icon: <WifiOff className="w-4 h-4 text-red-600" />,
          text: 'Connection Error',
          color: 'text-red-600',
          bg: 'bg-red-50 border-red-200'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="w-4 h-4 text-gray-600" />,
          text: 'Disconnected',
          color: 'text-gray-600',
          bg: 'bg-gray-50 border-gray-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm",
      config.bg,
      config.color,
      className
    )}>
      {config.icon}
      <span>{config.text}</span>
      {(status === 'error' || status === 'disconnected') && onReconnect && (
        <Button
          onClick={onReconnect}
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0 ml-1"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

// ===== LOADING ERROR STATE =====

interface LoadingErrorProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function LoadingError({ 
  message = "Failed to load content", 
  onRetry, 
  className 
}: LoadingErrorProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <AlertTriangle className="w-12 h-12 text-orange-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Loading Error
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

// ===== NETWORK ERROR STATE =====

interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export function NetworkError({ onRetry, className }: NetworkErrorProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <WifiOff className="w-12 h-12 text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Connection Problem
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm">
        Unable to connect to the server. Please check your internet connection and try again.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

// ===== SUCCESS STATE =====

interface SuccessStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function SuccessState({ 
  title = "Success", 
  message = "Operation completed successfully", 
  action, 
  className 
}: SuccessStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm">
        {message}
      </p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default ErrorDisplay;