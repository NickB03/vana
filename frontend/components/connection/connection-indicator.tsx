"use client";

import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2,
  Shield,
  Zap
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ConnectionIndicatorProps {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'circuit-open';
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  retryCount?: number;
  maxRetries?: number;
  averageLatency?: number;
  onReconnect?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function ConnectionIndicator({
  isConnected,
  connectionStatus,
  connectionQuality = 'excellent',
  retryCount = 0,
  maxRetries = 10,
  averageLatency = 0,
  onReconnect,
  className = '',
  size = 'md',
  showTooltip = true
}: ConnectionIndicatorProps) {
  
  // Get status configuration
  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: CheckCircle2,
          color: 'text-green-500',
          pulseColor: 'bg-green-400',
          label: 'Connected',
          description: `Quality: ${connectionQuality}${averageLatency ? ` • ${Math.round(averageLatency)}ms` : ''}`,
          showPulse: true
        };
      case 'connecting':
        return {
          icon: RefreshCw,
          color: 'text-blue-500',
          pulseColor: 'bg-blue-400',
          label: 'Connecting',
          description: 'Establishing connection...',
          spinning: true,
          showPulse: true
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          color: 'text-yellow-500',
          pulseColor: 'bg-yellow-400',
          label: 'Reconnecting',
          description: `Attempt ${retryCount}/${maxRetries}`,
          spinning: true,
          showPulse: true
        };
      case 'circuit-open':
        return {
          icon: Shield,
          color: 'text-orange-500',
          pulseColor: 'bg-orange-400',
          label: 'Circuit Breaker',
          description: 'Protection mode active',
          showPulse: false
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-red-500',
          pulseColor: 'bg-red-400',
          label: 'Error',
          description: 'Connection failed',
          showPulse: false
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          pulseColor: 'bg-gray-400',
          label: 'Disconnected',
          description: 'No connection',
          showPulse: false
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  // Size configurations
  const sizeConfig = {
    sm: { icon: 'h-3 w-3', pulse: 'h-2 w-2' },
    md: { icon: 'h-4 w-4', pulse: 'h-3 w-3' },
    lg: { icon: 'h-5 w-5', pulse: 'h-4 w-4' }
  };

  const sizes = sizeConfig[size];

  // Quality-based additional styling
  const getQualityIndicator = () => {
    if (!isConnected) return null;
    
    const qualityColors = {
      excellent: 'border-green-400',
      good: 'border-blue-400',
      fair: 'border-yellow-400',
      poor: 'border-red-400'
    };
    
    return qualityColors[connectionQuality];
  };

  const indicator = (
    <div 
      className={`relative inline-flex items-center justify-center ${className}`}
      onClick={onReconnect && (connectionStatus === 'error' || connectionStatus === 'disconnected') ? onReconnect : undefined}
      role={onReconnect ? 'button' : 'status'}
      tabIndex={onReconnect ? 0 : undefined}
    >
      {/* Pulse animation for active connections */}
      {config.showPulse && (
        <span className="absolute inline-flex h-full w-full">
          <span 
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`}
          />
        </span>
      )}
      
      {/* Main icon */}
      <div 
        className={`relative inline-flex items-center justify-center rounded-full border-2 bg-white ${
          getQualityIndicator() || 'border-gray-200'
        }`}
      >
        <StatusIcon 
          className={`${sizes.icon} ${config.color} ${config.spinning ? 'animate-spin' : ''}`}
        />
      </div>
      
      {/* Connection quality dots */}
      {isConnected && connectionQuality && (
        <div className="absolute -bottom-1 -right-1 flex gap-0.5">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full ${
                i < (['poor', 'fair', 'good', 'excellent'].indexOf(connectionQuality) + 1)
                  ? config.color.replace('text-', 'bg-')
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-medium">{config.label}</div>
            <div className="text-sm text-gray-600">{config.description}</div>
            {onReconnect && (connectionStatus === 'error' || connectionStatus === 'disconnected') && (
              <div className="text-xs text-blue-600">Click to reconnect</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default ConnectionIndicator;