"use client";

import React from 'react';
import { AlertTriangle, Wifi, WifiOff, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '../lib/utils';

// ===== LOADING STATES =====

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ 
  message = "Loading...", 
  className 
}: LoadingStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
      <p className="text-gray-600">{message}</p>
    </div>
  );
}

// ===== EMPTY STATES =====

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ 
  title = "No Data", 
  message = "There's nothing to show here yet.", 
  action, 
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <div className="w-6 h-6 bg-gray-300 rounded"></div>
      </div>
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

// ===== CONNECTION STATES =====

interface ConnectionFallbackProps {
  status: 'connecting' | 'disconnected' | 'error';
  onRetry?: () => void;
  className?: string;
}

export function ConnectionFallback({ 
  status, 
  onRetry, 
  className 
}: ConnectionFallbackProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connecting':
        return {
          icon: <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />,
          title: 'Connecting...',
          message: 'Establishing connection to the server.',
          showRetry: false,
        };
      case 'error':
        return {
          icon: <WifiOff className="w-8 h-8 text-red-500" />,
          title: 'Connection Error',
          message: 'Unable to connect to the server. Please check your internet connection.',
          showRetry: true,
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="w-8 h-8 text-gray-500" />,
          title: 'Disconnected',
          message: 'You are currently disconnected from the server.',
          showRetry: true,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      {config.icon}
      <h3 className="text-lg font-medium text-gray-900 mb-2 mt-4">
        {config.title}
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm">
        {config.message}
      </p>
      {config.showRetry && onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

// ===== MAINTENANCE STATE =====

export function MaintenanceState({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <AlertTriangle className="w-12 h-12 text-orange-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Under Maintenance
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm">
        We're currently performing maintenance. Please check back in a few minutes.
      </p>
    </div>
  );
}

// ===== OFFLINE STATE =====

interface OfflineStateProps {
  onRetry?: () => void;
  className?: string;
}

export function OfflineState({ onRetry, className }: OfflineStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <WifiOff className="w-12 h-12 text-gray-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        You're Offline
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm">
        Please check your internet connection and try again.
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

// ===== TIMEOUT STATE =====

interface TimeoutStateProps {
  onRetry?: () => void;
  className?: string;
}

export function TimeoutState({ onRetry, className }: TimeoutStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-8 text-center",
      className
    )}>
      <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Request Timeout
      </h3>
      <p className="text-gray-600 mb-4 max-w-sm">
        The request took too long to complete. Please try again.
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

// ===== FALLBACK CARD WRAPPER =====

interface FallbackCardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function FallbackCard({ children, title, className }: FallbackCardProps) {
  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      {title && (
        <CardHeader>
          <CardTitle className="text-center">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

export default {
  LoadingState,
  EmptyState,
  ConnectionFallback,
  MaintenanceState,
  OfflineState,
  TimeoutState,
  FallbackCard,
};