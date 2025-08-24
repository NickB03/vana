/**
 * SSE Connection Indicator Component
 * Visual indicator for SSE connection status
 */

'use client';

import { useSSEConnection } from '@/hooks/useSSE';
import { SSEConnectionState } from '@/lib/sse/types';
import { cn } from '@/lib/utils';

export function SSEConnectionIndicator() {
  const { state, isConnected, isHealthy, retryCount } = useSSEConnection();

  const getStatusColor = () => {
    switch (state) {
      case SSEConnectionState.CONNECTED:
        return 'bg-green-500';
      case SSEConnectionState.CONNECTING:
      case SSEConnectionState.RECONNECTING:
        return 'bg-yellow-500';
      case SSEConnectionState.ERROR:
      case SSEConnectionState.DISCONNECTED:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (state) {
      case SSEConnectionState.CONNECTED:
        return 'Connected';
      case SSEConnectionState.CONNECTING:
        return 'Connecting...';
      case SSEConnectionState.RECONNECTING:
        return `Reconnecting (${retryCount})...`;
      case SSEConnectionState.ERROR:
        return 'Connection Error';
      case SSEConnectionState.DISCONNECTED:
        return 'Disconnected';
      case SSEConnectionState.CLOSED:
        return 'Connection Closed';
      default:
        return 'Idle';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <div
          className={cn(
            'h-3 w-3 rounded-full',
            getStatusColor(),
            isConnected && 'animate-pulse'
          )}
        />
        {state === SSEConnectionState.RECONNECTING && (
          <div className="absolute inset-0 h-3 w-3 rounded-full bg-yellow-500 animate-ping" />
        )}
      </div>
      <span className="text-sm text-muted-foreground">
        {getStatusText()}
      </span>
    </div>
  );
}