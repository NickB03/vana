"use client";

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2,
  Activity,
  Clock,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { ConnectionMetrics, CircuitBreakerState, ConnectionDiagnostics } from '@/hooks/useEnhancedSSEClient';

export interface ConnectionStatusProps {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'circuit-open';
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  lastHeartbeat: Date | null;
  timeSinceLastHeartbeat: number | null;
  retryCount: number;
  maxRetries: number;
  metrics: ConnectionMetrics;
  circuitBreaker: CircuitBreakerState;
  diagnostics: ConnectionDiagnostics;
  canReconnect: boolean;
  onReconnect?: () => void;
  onForceReconnect?: () => void;
  compact?: boolean;
  showDiagnostics?: boolean;
}

export function ConnectionStatus({
  isConnected,
  connectionStatus,
  connectionQuality,
  lastHeartbeat,
  timeSinceLastHeartbeat,
  retryCount,
  maxRetries,
  metrics,
  circuitBreaker,
  diagnostics,
  canReconnect,
  onReconnect,
  onForceReconnect,
  compact = false,
  showDiagnostics = false
}: ConnectionStatusProps) {
  
  // Get status icon and color
  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: CheckCircle2,
          color: 'text-green-500',
          bgColor: 'bg-green-50 border-green-200',
          label: 'Connected',
          variant: 'default' as const
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          bgColor: 'bg-blue-50 border-blue-200',
          label: 'Connecting...',
          variant: 'secondary' as const,
          spinning: true
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-50 border-yellow-200',
          label: `Reconnecting (${retryCount}/${maxRetries})`,
          variant: 'outline' as const,
          spinning: true
        };
      case 'circuit-open':
        return {
          icon: Shield,
          color: 'text-orange-500',
          bgColor: 'bg-orange-50 border-orange-200',
          label: 'Circuit Breaker Open',
          variant: 'destructive' as const
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-red-500',
          bgColor: 'bg-red-50 border-red-200',
          label: 'Connection Error',
          variant: 'destructive' as const
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-500',
          bgColor: 'bg-gray-50 border-gray-200',
          label: 'Disconnected',
          variant: 'outline' as const
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  // Get quality indicator
  const getQualityColor = () => {
    switch (connectionQuality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  // Format uptime
  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Format latency
  const formatLatency = (latency: number) => {
    if (latency < 100) return `${Math.round(latency)}ms`;
    if (latency < 1000) return `${Math.round(latency)}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <StatusIcon 
          className={`h-4 w-4 ${statusDisplay.color} ${statusDisplay.spinning ? 'animate-spin' : ''}`}
        />
        <Badge variant={statusDisplay.variant} className="text-xs">
          {statusDisplay.label}
        </Badge>
        {connectionQuality && isConnected && (
          <div className={`text-xs ${getQualityColor()}`}>
            {connectionQuality}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${statusDisplay.bgColor} space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon 
            className={`h-5 w-5 ${statusDisplay.color} ${statusDisplay.spinning ? 'animate-spin' : ''}`}
          />
          <span className="font-medium text-sm">{statusDisplay.label}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {connectionQuality && (
            <Badge variant="outline" className={`text-xs ${getQualityColor()}`}>
              <Activity className="h-3 w-3 mr-1" />
              {connectionQuality}
            </Badge>
          )}
          
          {(!canReconnect || connectionStatus === 'error') && onReconnect && (
            <button
              onClick={canReconnect ? onReconnect : onForceReconnect}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              disabled={connectionStatus === 'connecting' || connectionStatus === 'reconnecting'}
            >
              {canReconnect ? 'Reconnect' : 'Force Reconnect'}
            </button>
          )}
        </div>
      </div>

      {/* Connection Metrics */}
      {isConnected && (
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600">
              <Clock className="h-3 w-3" />
              <span>Uptime</span>
            </div>
            <div className="font-mono">{formatUptime(metrics.uptime)}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600">
              <Zap className="h-3 w-3" />
              <span>Latency</span>
            </div>
            <div className="font-mono">{formatLatency(metrics.averageLatency)}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600">
              <TrendingUp className="h-3 w-3" />
              <span>Reconnects</span>
            </div>
            <div className="font-mono">{metrics.reconnectionCount}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600">
              <TrendingDown className="h-3 w-3" />
              <span>Error Rate</span>
            </div>
            <div className="font-mono">{(metrics.errorRate * 100).toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Heartbeat Status */}
      {lastHeartbeat && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Last Heartbeat</span>
            <span className="font-mono">
              {timeSinceLastHeartbeat && timeSinceLastHeartbeat < 60000
                ? `${Math.round(timeSinceLastHeartbeat / 1000)}s ago`
                : lastHeartbeat.toLocaleTimeString()
              }
            </span>
          </div>
          {timeSinceLastHeartbeat && (
            <Progress 
              value={Math.max(0, 100 - (timeSinceLastHeartbeat / 35000) * 100)} 
              className="h-1"
            />
          )}
        </div>
      )}

      {/* Circuit Breaker Status */}
      {circuitBreaker.state !== 'closed' && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Shield className="h-3 w-3 text-orange-500" />
              <span className="font-medium">Circuit Breaker: {circuitBreaker.state}</span>
            </div>
            <div className="text-xs text-gray-600">
              Failures: {circuitBreaker.failureCount}
              {circuitBreaker.nextAttemptTime > Date.now() && (
                <span className="ml-2">
                  Next attempt: {Math.round((circuitBreaker.nextAttemptTime - Date.now()) / 1000)}s
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Diagnostics */}
      {showDiagnostics && diagnostics && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Diagnostics</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600">Network:</span>
                <span className="ml-1 font-mono">{diagnostics.networkType}</span>
              </div>
              <div>
                <span className="text-gray-600">Bandwidth:</span>
                <span className="ml-1 font-mono">{diagnostics.effectiveBandwidth.toFixed(1)} Mbps</span>
              </div>
              {diagnostics.latency.length > 0 && (
                <>
                  <div>
                    <span className="text-gray-600">Min Latency:</span>
                    <span className="ml-1 font-mono">{formatLatency(Math.min(...diagnostics.latency))}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Latency:</span>
                    <span className="ml-1 font-mono">{formatLatency(Math.max(...diagnostics.latency))}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ConnectionStatus;