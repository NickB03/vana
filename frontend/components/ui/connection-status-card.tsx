/**
 * Connection Status Card Component
 * 
 * Real-time connection health monitoring card for SSE streaming status,
 * network health, and reconnection management in the unified chat interface.
 */

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Zap,
  Clock,
  Signal,
  Router,
  X,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Type Definitions
// ============================================================================

export interface ConnectionHealth {
  status: 'connected' | 'connecting' | 'disconnected' | 'error' | 'reconnecting';
  latency?: number;
  reconnectAttempts?: number;
  maxReconnectAttempts?: number;
  lastConnected?: Date;
  errorMessage?: string;
  circuitBreakerStatus?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  streamingActive?: boolean;
  totalMessages?: number;
  messagesPerMinute?: number;
}

interface ConnectionStatusCardProps {
  connectionHealth: ConnectionHealth;
  onReconnect?: () => void;
  onReset?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  showDetails?: boolean;
  className?: string;
}

// ============================================================================
// Configuration and Styling
// ============================================================================

const getConnectionStatusConfig = (status: ConnectionHealth['status']) => {
  switch (status) {
    case 'connected':
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        badgeColor: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        label: 'Connected',
        description: 'Real-time connection active',
      };
    case 'connecting':
      return {
        icon: Activity,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        label: 'Connecting',
        description: 'Establishing connection...',
        animate: 'animate-pulse',
      };
    case 'reconnecting':
      return {
        icon: RefreshCw,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-200 dark:border-orange-800',
        badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        label: 'Reconnecting',
        description: 'Attempting to reconnect...',
        animate: 'animate-spin',
      };
    case 'error':
      return {
        icon: AlertTriangle,
        color: 'text-red-500',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-200 dark:border-red-800',
        badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        label: 'Error',
        description: 'Connection failed',
      };
    case 'disconnected':
    default:
      return {
        icon: WifiOff,
        color: 'text-gray-500',
        bgColor: 'bg-gray-50 dark:bg-gray-800/20',
        borderColor: 'border-gray-200 dark:border-gray-700',
        badgeColor: 'bg-gray-100 text-gray-600 dark:bg-gray-800/30 dark:text-gray-400',
        label: 'Disconnected',
        description: 'No active connection',
      };
  }
};

const getLatencyColor = (latency?: number) => {
  if (!latency) return 'text-gray-400';
  if (latency < 100) return 'text-green-500';
  if (latency < 500) return 'text-yellow-500';
  return 'text-red-500';
};

const getCircuitBreakerColor = (status?: string) => {
  switch (status) {
    case 'CLOSED': return 'text-green-500';
    case 'HALF_OPEN': return 'text-yellow-500';
    case 'OPEN': return 'text-red-500';
    default: return 'text-gray-400';
  }
};

// ============================================================================
// Main Connection Status Card Component
// ============================================================================

export function ConnectionStatusCard({
  connectionHealth,
  onReconnect,
  onReset,
  onDismiss,
  compact = false,
  showDetails = true,
  className,
}: ConnectionStatusCardProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const config = getConnectionStatusConfig(connectionHealth.status);
  const StatusIcon = config.icon;

  // Update timestamp when health changes
  useEffect(() => {
    setLastUpdate(new Date());
  }, [connectionHealth]);

  const reconnectProgress = connectionHealth.reconnectAttempts && connectionHealth.maxReconnectAttempts
    ? (connectionHealth.reconnectAttempts / connectionHealth.maxReconnectAttempts) * 100
    : 0;

  const isHealthy = connectionHealth.status === 'connected' && 
                   !connectionHealth.errorMessage &&
                   connectionHealth.circuitBreakerStatus !== 'OPEN';

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
          config.bgColor,
          config.borderColor,
          className
        )}
        role="status"
        aria-label={`Connection status: ${config.label}`}
      >
        <StatusIcon
          className={cn(
            'h-5 w-5 flex-shrink-0',
            config.color,
            config.animate && config.animate
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{config.label}</span>
            {connectionHealth.latency && (
              <Badge variant="outline" className="text-xs">
                {connectionHealth.latency}ms
              </Badge>
            )}
          </div>
          {connectionHealth.streamingActive && (
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Streaming active • {connectionHealth.messagesPerMinute || 0}/min
            </div>
          )}
        </div>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        'transition-all duration-300',
        config.bgColor,
        config.borderColor,
        !isHealthy && 'ring-1 ring-orange-500/30',
        className
      )}
      role="status"
      aria-label={`Connection health: ${config.label}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              config.bgColor.replace('bg-', 'bg-').replace('/20', '/40')
            )}>
              <StatusIcon
                className={cn(
                  'h-5 w-5',
                  config.color,
                  config.animate && config.animate
                )}
              />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Connection Health
                {connectionHealth.streamingActive && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-normal text-green-600">Streaming</span>
                  </div>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {config.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge
              className={cn('text-xs font-medium', config.badgeColor)}
            >
              {config.label}
            </Badge>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-8 w-8 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Latency */}
          <div className="text-center p-2 bg-white dark:bg-gray-800/50 rounded border">
            <div className={cn(
              'text-lg font-bold',
              getLatencyColor(connectionHealth.latency)
            )}>
              {connectionHealth.latency ? `${connectionHealth.latency}ms` : '--'}
            </div>
            <div className="text-xs text-gray-500">Latency</div>
          </div>
          
          {/* Circuit Breaker */}
          <div className="text-center p-2 bg-white dark:bg-gray-800/50 rounded border">
            <div className={cn(
              'text-lg font-bold',
              getCircuitBreakerColor(connectionHealth.circuitBreakerStatus)
            )}>
              {connectionHealth.circuitBreakerStatus || 'N/A'}
            </div>
            <div className="text-xs text-gray-500">Circuit</div>
          </div>
          
          {/* Messages */}
          <div className="text-center p-2 bg-white dark:bg-gray-800/50 rounded border">
            <div className="text-lg font-bold text-blue-600">
              {connectionHealth.totalMessages || 0}
            </div>
            <div className="text-xs text-gray-500">Messages</div>
          </div>
          
          {/* Rate */}
          <div className="text-center p-2 bg-white dark:bg-gray-800/50 rounded border">
            <div className="text-lg font-bold text-purple-600">
              {connectionHealth.messagesPerMinute || 0}
            </div>
            <div className="text-xs text-gray-500">Per Min</div>
          </div>
        </div>

        {/* Reconnection Progress */}
        {connectionHealth.status === 'reconnecting' && connectionHealth.reconnectAttempts && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Reconnection Progress</span>
              <span>
                {connectionHealth.reconnectAttempts}/{connectionHealth.maxReconnectAttempts}
              </span>
            </div>
            <Progress value={reconnectProgress} className="h-2" />
          </div>
        )}

        {/* Error Message */}
        {connectionHealth.errorMessage && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800 dark:text-red-200">
                <p className="font-medium mb-1">Connection Error</p>
                <p className="text-xs">{connectionHealth.errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Timeline */}
        {showDetails && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Connection Timeline</h4>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              {connectionHealth.lastConnected && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>Last connected: {connectionHealth.lastConnected.toLocaleTimeString()}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {onReconnect && connectionHealth.status !== 'connected' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReconnect}
              disabled={connectionHealth.status === 'connecting'}
              className="gap-1"
            >
              <RefreshCw className={cn(
                'h-3 w-3',
                connectionHealth.status === 'connecting' && 'animate-spin'
              )} />
              Reconnect
            </Button>
          )}
          
          {onReset && connectionHealth.circuitBreakerStatus === 'OPEN' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-1"
            >
              <Zap className="h-3 w-3" />
              Reset Circuit
            </Button>
          )}

          {/* Connection Quality Indicator */}
          <div className="flex items-center gap-1 ml-auto text-xs text-gray-500">
            <Signal 
              className={cn(
                'h-3 w-3',
                isHealthy ? 'text-green-500' : 'text-yellow-500'
              )} 
            />
            <span>{isHealthy ? 'Excellent' : 'Fair'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Mini Connection Status Indicator
// ============================================================================

interface ConnectionStatusIndicatorProps {
  connectionHealth: ConnectionHealth;
  onClick?: () => void;
  className?: string;
}

export function ConnectionStatusIndicator({
  connectionHealth,
  onClick,
  className,
}: ConnectionStatusIndicatorProps) {
  const config = getConnectionStatusConfig(connectionHealth.status);
  const StatusIcon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-full border cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
        config.borderColor,
        onClick && 'hover:shadow-sm',
        className
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Connection: ${config.label}`}
    >
      <StatusIcon
        className={cn(
          'h-3 w-3',
          config.color,
          config.animate && config.animate
        )}
      />
      <span className="text-xs font-medium">{config.label}</span>
      {connectionHealth.latency && (
        <Badge variant="outline" className="text-xs py-0 px-1 h-4">
          {connectionHealth.latency}ms
        </Badge>
      )}
    </div>
  );
}

export default ConnectionStatusCard;