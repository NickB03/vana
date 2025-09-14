/**
 * Enhanced React Hook for Real-time Research SSE with Connection Health
 * 
 * Extends the base useResearchSSE hook with connection health monitoring,
 * streaming status tracking, and enhanced metrics for the card interface.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  useResearchSSE, 
  UseResearchSSEResult, 
  UseResearchSSEOptions,
  useAgentStatusTracker 
} from '@/hooks/use-research-sse';
import { researchSSEService } from '@/lib/research-sse-service';
import { ConnectionHealth } from '@/components/ui/connection-status-card';

export interface UseEnhancedResearchSSEResult extends UseResearchSSEResult {
  // Enhanced connection tracking
  connectionHealth: ConnectionHealth;
  streamingStatus: 'idle' | 'active' | 'error' | 'disconnected';
  
  // Agent tracking utilities
  agentTracker: ReturnType<typeof useAgentStatusTracker>;
  
  // Streaming metrics
  messageCount: number;
  messagesPerMinute: number;
  averageLatency: number;
  
  // Enhanced actions
  reconnect: () => void;
  resetCircuitBreaker: () => void;
  
  // Connection quality metrics
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  isHealthy: boolean;
}

export interface UseEnhancedResearchSSEOptions extends UseResearchSSEOptions {
  enableConnectionMonitoring?: boolean;
  enableMetricsTracking?: boolean;
  latencyThreshold?: number;
  healthCheckInterval?: number;
  onConnectionChange?: (health: ConnectionHealth) => void;
}

export function useEnhancedResearchSSE(
  options: UseEnhancedResearchSSEOptions = {}
): UseEnhancedResearchSSEResult {
  const {
    enableConnectionMonitoring = true,
    enableMetricsTracking = true,
    latencyThreshold = 500,
    healthCheckInterval = 5000,
    onConnectionChange,
    ...baseOptions
  } = options;

  // Base hook functionality
  const baseResult = useResearchSSE(baseOptions);
  const agentTracker = useAgentStatusTracker(baseResult.sessionState);

  // Enhanced state
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    status: 'disconnected',
    latency: undefined,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    lastConnected: undefined,
    errorMessage: undefined,
    circuitBreakerStatus: 'CLOSED',
    streamingActive: false,
    totalMessages: 0,
    messagesPerMinute: 0,
  });

  const [messageCount, setMessageCount] = useState(0);
  const [messagesPerMinute, setMessagesPerMinute] = useState(0);
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);

  // Refs for tracking
  const messageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const latencyStartTimeRef = useRef<Date | null>(null);
  const messageCounterRef = useRef(0);

  // Calculate streaming status
  const streamingStatus = useMemo((): 'idle' | 'active' | 'error' | 'disconnected' => {
    if (!baseResult.isConnected) return 'disconnected';
    if (baseResult.hasError) return 'error';
    if (baseResult.isResearchActive && lastMessageTime) {
      const timeSinceLastMessage = Date.now() - lastMessageTime.getTime();
      return timeSinceLastMessage < 30000 ? 'active' : 'idle'; // 30 seconds timeout
    }
    return 'idle';
  }, [baseResult.isConnected, baseResult.hasError, baseResult.isResearchActive, lastMessageTime]);

  // Calculate average latency
  const averageLatency = useMemo(() => {
    if (latencyHistory.length === 0) return 0;
    return Math.round(latencyHistory.reduce((sum, lat) => sum + lat, 0) / latencyHistory.length);
  }, [latencyHistory]);

  // Calculate connection quality
  const connectionQuality = useMemo((): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (!baseResult.isConnected) return 'poor';
    if (baseResult.hasError) return 'poor';
    if (averageLatency < 100) return 'excellent';
    if (averageLatency < 300) return 'good';
    if (averageLatency < latencyThreshold) return 'fair';
    return 'poor';
  }, [baseResult.isConnected, baseResult.hasError, averageLatency, latencyThreshold]);

  // Calculate if connection is healthy
  const isHealthy = useMemo(() => {
    return baseResult.isConnected && 
           !baseResult.hasError && 
           connectionHealth.circuitBreakerStatus !== 'OPEN' &&
           averageLatency < latencyThreshold;
  }, [baseResult.isConnected, baseResult.hasError, connectionHealth.circuitBreakerStatus, averageLatency, latencyThreshold]);

  // Update connection health when base state changes
  useEffect(() => {
    if (!enableConnectionMonitoring) return;

    const newHealth: ConnectionHealth = {
      ...connectionHealth,
      status: baseResult.isConnected 
        ? (baseResult.isResearchActive ? 'connecting' : 'connected')
        : (baseResult.hasError ? 'error' : 'disconnected'),
      streamingActive: streamingStatus === 'active',
      totalMessages: messageCount,
      messagesPerMinute,
      latency: averageLatency || undefined,
      errorMessage: baseResult.error || undefined,
    };

    // Only update if meaningful changes occurred
    const hasChanged = JSON.stringify(newHealth) !== JSON.stringify(connectionHealth);
    if (hasChanged) {
      setConnectionHealth(newHealth);
      if (onConnectionChange) {
        onConnectionChange(newHealth);
      }
    }
  }, [
    baseResult.isConnected, 
    baseResult.isResearchActive, 
    baseResult.hasError, 
    baseResult.error,
    streamingStatus, 
    messageCount, 
    messagesPerMinute, 
    averageLatency,
    enableConnectionMonitoring,
    onConnectionChange
  ]);

  // Track messages and calculate metrics
  useEffect(() => {
    if (!enableMetricsTracking || !baseResult.sessionState) return;

    // Increment message count when session state updates
    const currentTime = new Date();
    setMessageCount(prev => prev + 1);
    setLastMessageTime(currentTime);
    messageCounterRef.current += 1;

    // Calculate latency if we have a start time
    if (latencyStartTimeRef.current) {
      const latency = currentTime.getTime() - latencyStartTimeRef.current.getTime();
      setLatencyHistory(prev => [...prev.slice(-19), latency]); // Keep last 20 measurements
    }
    latencyStartTimeRef.current = currentTime;

  }, [baseResult.sessionState, enableMetricsTracking]);

  // Calculate messages per minute
  useEffect(() => {
    if (!enableMetricsTracking) return;

    messageIntervalRef.current = setInterval(() => {
      const messagesInLastMinute = messageCounterRef.current;
      setMessagesPerMinute(messagesInLastMinute);
      messageCounterRef.current = 0; // Reset counter
    }, 60000); // Every minute

    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, [enableMetricsTracking]);

  // Periodic health checks
  useEffect(() => {
    if (!enableConnectionMonitoring || healthCheckInterval <= 0) return;

    healthCheckIntervalRef.current = setInterval(() => {
      // Update connection health metrics
      const connectionState = researchSSEService.getConnectionState();
      const reconnectAttempts = researchSSEService.getReconnectAttempts();
      const circuitBreakerState = researchSSEService.getCircuitBreakerState() as ConnectionHealth['circuitBreakerStatus'];

      setConnectionHealth(prev => ({
        ...prev,
        reconnectAttempts,
        circuitBreakerStatus: circuitBreakerState,
        lastConnected: baseResult.isConnected ? new Date() : prev.lastConnected,
      }));
    }, healthCheckInterval);

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [enableConnectionMonitoring, healthCheckInterval, baseResult.isConnected]);

  // Enhanced actions
  const reconnect = useCallback(() => {
    // Reset metrics
    setMessageCount(0);
    setMessagesPerMinute(0);
    setLatencyHistory([]);
    setLastMessageTime(null);
    messageCounterRef.current = 0;

    // Update connection health
    setConnectionHealth(prev => ({
      ...prev,
      status: 'connecting',
      errorMessage: undefined,
    }));

    // Trigger reconnection through service
    if (baseResult.sessionState?.sessionId) {
      baseResult.stopResearch();
      // Note: In real implementation, you'd want to restart research with the same query
    }
  }, [baseResult]);

  const resetCircuitBreaker = useCallback(() => {
    researchSSEService.resetCircuitBreaker();
    setConnectionHealth(prev => ({
      ...prev,
      circuitBreakerStatus: 'CLOSED',
      reconnectAttempts: 0,
      errorMessage: undefined,
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, []);

  return {
    ...baseResult,
    
    // Enhanced connection tracking
    connectionHealth,
    streamingStatus,
    
    // Agent tracking utilities
    agentTracker,
    
    // Streaming metrics
    messageCount,
    messagesPerMinute,
    averageLatency,
    
    // Enhanced actions
    reconnect,
    resetCircuitBreaker,
    
    // Connection quality metrics
    connectionQuality,
    isHealthy,
  };
}

// ============================================================================
// Hook for Connection Health Only (Lightweight)
// ============================================================================

export function useConnectionHealth(): {
  connectionHealth: ConnectionHealth;
  reconnect: () => void;
  resetCircuitBreaker: () => void;
} {
  const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth>({
    status: 'disconnected',
    circuitBreakerStatus: 'CLOSED',
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    streamingActive: false,
    totalMessages: 0,
    messagesPerMinute: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const connectionState = researchSSEService.getConnectionState();
      const reconnectAttempts = researchSSEService.getReconnectAttempts();
      const circuitBreakerState = researchSSEService.getCircuitBreakerState() as ConnectionHealth['circuitBreakerStatus'];

      setConnectionHealth(prev => ({
        ...prev,
        status: connectionState === 'OPEN' ? 'connected' : 
                connectionState === 'CONNECTING' ? 'connecting' : 
                connectionState === 'CLOSED' ? 'disconnected' : 'error',
        reconnectAttempts,
        circuitBreakerStatus: circuitBreakerState,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const reconnect = useCallback(() => {
    // Implementation would depend on the service
    console.log('Manual reconnect requested');
  }, []);

  const resetCircuitBreaker = useCallback(() => {
    researchSSEService.resetCircuitBreaker();
    setConnectionHealth(prev => ({
      ...prev,
      circuitBreakerStatus: 'CLOSED',
      reconnectAttempts: 0,
    }));
  }, []);

  return {
    connectionHealth,
    reconnect,
    resetCircuitBreaker,
  };
}

export default useEnhancedResearchSSE;