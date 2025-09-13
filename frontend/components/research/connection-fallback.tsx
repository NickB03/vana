"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Clock, 
  CheckCircle,
  XCircle,
  Signal,
  Router
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface ConnectionState {
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'reconnecting';
  error?: string;
  lastConnected?: Date;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
}

export interface ConnectionFallbackProps {
  connectionState: ConnectionState;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showDetails?: boolean;
}

// ============================================================================
// Network Status Hook
// ============================================================================

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const updateNetworkStatus = () => {
      setIsOnline(navigator.onLine);
      
      // Check connection type if available
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection?.effectiveType || 'unknown');
      }
    };

    updateNetworkStatus();

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  return { isOnline, connectionType };
}

// ============================================================================
// Connection Status Indicator
// ============================================================================

interface ConnectionStatusIndicatorProps {
  status: ConnectionState['status'];
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  className?: string;
}

function ConnectionStatusIndicator({ 
  status, 
  reconnectAttempts = 0, 
  maxReconnectAttempts = 5,
  className 
}: ConnectionStatusIndicatorProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
      case 'reconnecting':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`;
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Failed';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-green-500';
      case 'connecting':
      case 'reconnecting':
        return 'bg-blue-500';
      case 'disconnected':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {getStatusIcon()}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{getStatusText()}</span>
        <div className={cn('w-2 h-2 rounded-full', getStatusColor())} />
      </div>
    </div>
  );
}

// ============================================================================
// Network Diagnostics Component
// ============================================================================

interface NetworkDiagnosticsProps {
  connectionState: ConnectionState;
  className?: string;
}

function NetworkDiagnostics({ connectionState, className }: NetworkDiagnosticsProps) {
  const { isOnline, connectionType } = useNetworkStatus();
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const measureLatency = async () => {
      try {
        const start = Date.now();
        await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        const end = Date.now();
        setLatency(end - start);
      } catch {
        setLatency(null);
      }
    };

    // Measure latency periodically when connection issues occur
    if (connectionState.status === 'error' || connectionState.status === 'disconnected') {
      measureLatency();
      const interval = setInterval(measureLatency, 5000);
      return () => clearInterval(interval);
    }
  }, [connectionState.status]);

  return (
    <Card className={cn('border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Router className="h-4 w-4" />
          Network Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Signal className="h-3 w-3 text-green-500" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-500" />
            )}
            <span>Network: {isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <div>
            <span>Type: {connectionType}</span>
          </div>
          <div>
            <span>Latency: {latency ? `${latency}ms` : 'Unknown'}</span>
          </div>
          <div>
            <span>Server: {connectionState.status === 'connected' ? 'Reachable' : 'Unreachable'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Connection Fallback Component
// ============================================================================

export function ConnectionFallback({ 
  connectionState, 
  onRetry, 
  onDismiss, 
  className,
  showDetails = false 
}: ConnectionFallbackProps) {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry && !isRetrying) {
      setIsRetrying(true);
      try {
        await onRetry();
      } finally {
        // Add a small delay to show the loading state
        setTimeout(() => setIsRetrying(false), 1000);
      }
    }
  };

  const getConnectionAdvice = () => {
    switch (connectionState.status) {
      case 'disconnected':
        return 'Your connection to the server has been lost. This might be temporary.';
      case 'error':
        return connectionState.error || 'Failed to establish connection to the research service.';
      case 'reconnecting':
        return 'Attempting to reconnect automatically. Please wait...';
      default:
        return 'Connection status unknown.';
    }
  };

  const getSeverityClass = () => {
    switch (connectionState.status) {
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20';
      case 'disconnected':
        return 'border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20';
      case 'reconnecting':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-800';
    }
  };

  // Don't show anything if connected
  if (connectionState.status === 'connected' || connectionState.status === 'connecting') {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Main Status Card */}
      <Card className={getSeverityClass()}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ConnectionStatusIndicator 
                    status={connectionState.status}
                    reconnectAttempts={connectionState.reconnectAttempts}
                    maxReconnectAttempts={connectionState.maxReconnectAttempts}
                  />
                </div>
                <p className="text-sm">
                  {getConnectionAdvice()}
                </p>
                
                {connectionState.lastConnected && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last connected: {connectionState.lastConnected.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
            
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-6 w-6 p-0 -mt-1"
              >
                ×
              </Button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mt-3">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying || connectionState.status === 'reconnecting'}
                className="gap-1"
              >
                <RefreshCw className={cn('h-3 w-3', (isRetrying || connectionState.status === 'reconnecting') && 'animate-spin')} />
                {isRetrying ? 'Retrying...' : 'Retry Connection'}
              </Button>
            )}
            
            {showDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="gap-1"
              >
                <Router className="h-3 w-3" />
                {showDiagnostics ? 'Hide' : 'Show'} Details
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Network Diagnostics */}
      {showDetails && showDiagnostics && (
        <NetworkDiagnostics 
          connectionState={connectionState}
          className="animate-in slide-in-from-top-2 duration-300"
        />
      )}

      {/* Reconnection Progress */}
      {connectionState.status === 'reconnecting' && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Reconnecting...
                </p>
                {connectionState.reconnectAttempts !== undefined && connectionState.maxReconnectAttempts && (
                  <div className="mt-1">
                    <div className="flex justify-between text-xs text-blue-600 dark:text-blue-300 mb-1">
                      <span>Attempt {connectionState.reconnectAttempts} of {connectionState.maxReconnectAttempts}</span>
                    </div>
                    <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(connectionState.reconnectAttempts / connectionState.maxReconnectAttempts) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Connection Health Monitor Hook
// ============================================================================

export function useConnectionHealth() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'connected'
  });

  const updateConnectionState = (newState: Partial<ConnectionState>) => {
    setConnectionState(prev => {
      // Prevent unnecessary updates if state hasn't meaningfully changed
      const hasStatusChanged = newState.status && newState.status !== prev.status;
      const hasErrorChanged = newState.error !== prev.error;
      const hasReconnectChanged = newState.reconnectAttempts !== prev.reconnectAttempts;
      
      // Only update if something meaningful has changed
      if (!hasStatusChanged && !hasErrorChanged && !hasReconnectChanged) {
        return prev; // Return previous state to prevent re-render
      }
      
      return {
        ...prev,
        ...newState,
        lastConnected: newState.status === 'connected' ? new Date() : prev.lastConnected
      };
    });
  };

  return {
    connectionState,
    updateConnectionState
  };
}

export default ConnectionFallback;