"use client";

import React, { useState, useCallback } from 'react';
import { useEnhancedSSEClient } from '../hooks/useEnhancedSSEClient';
import ConnectionStatus from '../components/connection/connection-status';
import ConnectionIndicator from '../components/connection/connection-indicator';
import ConnectionDiagnostics from '../components/connection/connection-diagnostics';
import ConnectionErrorHandler from '../utils/connection-error-handler';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Download, 
  RefreshCw,
  Settings,
  Zap
} from 'lucide-react';

/**
 * Demo component showcasing enterprise-grade SSE connection resilience
 * This example demonstrates all the enhanced connection features:
 * - Automatic reconnection with exponential backoff
 * - Circuit breaker pattern for fault tolerance
 * - Real-time performance monitoring
 * - Connection quality indicators
 * - Comprehensive diagnostics
 * - Error classification and handling
 */
export function ConnectionResilienceDemo() {
  const [sessionId] = useState(() => `demo-session-${Date.now()}`);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [errorHandler] = useState(() => new ConnectionErrorHandler());
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  // Enhanced SSE client with all resilience features enabled
  const sseClient = useEnhancedSSEClient({
    sessionId,
    autoReconnect: true,
    maxRetries: 10,
    initialRetryDelay: 1000,
    maxRetryDelay: 30000,
    heartbeatTimeout: 35000,
    connectionTimeout: 10000,
    eventQueueSize: 50,
    enableCircuitBreaker: true,
    enableMetrics: true,
    enableDiagnostics: true,
    jitterFactor: 0.1
  });

  // Log connection events
  const addToLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  }, []);

  // Set up event handlers
  React.useEffect(() => {
    sseClient.on('onConnection', (event: any) => {
      addToLog(`Connection ${event.status}: ${event.sessionId}`);
    });

    sseClient.on('onHeartbeat', (event: any) => {
      addToLog(`Heartbeat received: ${event.timestamp}`);
    });

    sseClient.on('onAgent', (event: any) => {
      addToLog(`Agent ${event.type}: ${event.agentId} (${event.agentType})`);
    });

    sseClient.on('onResult', (event: any) => {
      addToLog(`Result ${event.type}: ${event.resultId || 'N/A'}`);
    });

    sseClient.on('onError', (event: any) => {
      addToLog(`Error: ${event.message} (${event.errorCode || 'N/A'})`);
      
      // Use error handler for classification and recovery suggestions
      const errorAnalysis = errorHandler.analyzeError(event);
      addToLog(`Error Analysis: ${errorAnalysis.type} - ${errorAnalysis.suggestedAction}`);
    });

    sseClient.on('onConnectionQualityChange', (quality: string) => {
      addToLog(`Connection quality changed: ${quality}`);
    });

    sseClient.on('onCircuitBreakerStateChange', (state: string) => {
      addToLog(`Circuit breaker: ${state}`);
    });

    return () => {
      sseClient.off('onConnection');
      sseClient.off('onHeartbeat');
      sseClient.off('onAgent');
      sseClient.off('onResult');
      sseClient.off('onError');
      sseClient.off('onConnectionQualityChange');
      sseClient.off('onCircuitBreakerStateChange');
    };
  }, [sseClient, addToLog, errorHandler]);

  // Export diagnostics data
  const handleExportDiagnostics = useCallback(() => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      sessionId,
      connectionState: {
        isConnected: sseClient.isConnected,
        status: sseClient.connectionStatus,
        quality: sseClient.connectionQuality,
        uptime: sseClient.metrics.uptime,
        retryCount: sseClient.retryCount
      },
      metrics: sseClient.metrics,
      circuitBreaker: sseClient.circuitBreaker,
      diagnostics: sseClient.getDiagnostics(),
      errorStatistics: errorHandler.getErrorStatistics(),
      recentEvents: sseClient.events.slice(-10),
      connectionLog: connectionLog.slice(0, 20)
    };

    const blob = new Blob([JSON.stringify(diagnostics, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `connection-diagnostics-${sessionId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sessionId, sseClient, errorHandler, connectionLog]);

  // Simulate network issues for testing
  const simulateNetworkIssue = useCallback((issueType: 'timeout' | 'error' | 'offline') => {
    addToLog(`Simulating ${issueType} issue`);
    
    switch (issueType) {
      case 'offline':
        // Temporarily set navigator offline
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        window.dispatchEvent(new Event('offline'));
        setTimeout(() => {
          Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
          window.dispatchEvent(new Event('online'));
          addToLog('Network restored');
        }, 5000);
        break;
      case 'timeout':
        // This would typically be handled by the SSE client internally
        addToLog('Connection timeout simulated');
        break;
      case 'error':
        // This would typically be handled by the SSE client internally
        addToLog('Connection error simulated');
        break;
    }
  }, [addToLog]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connection Resilience Demo</h1>
          <p className="text-gray-600 mt-1">
            Enterprise-grade SSE connection management with fault tolerance
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <ConnectionIndicator
            isConnected={sseClient.isConnected}
            connectionStatus={sseClient.connectionStatus}
            connectionQuality={sseClient.connectionQuality}
            retryCount={sseClient.retryCount}
            maxRetries={10}
            averageLatency={sseClient.metrics.averageLatency}
            onReconnect={sseClient.reconnect}
            size="lg"
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDiagnostics(!showDiagnostics)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showDiagnostics ? 'Hide' : 'Show'} Diagnostics
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Status Overview */}
        <div className="lg:col-span-1">
          <ConnectionStatus
            isConnected={sseClient.isConnected}
            connectionStatus={sseClient.connectionStatus}
            connectionQuality={sseClient.connectionQuality}
            lastHeartbeat={sseClient.lastHeartbeat}
            timeSinceLastHeartbeat={sseClient.timeSinceLastHeartbeat}
            retryCount={sseClient.retryCount}
            maxRetries={10}
            metrics={sseClient.metrics}
            circuitBreaker={sseClient.circuitBreaker}
            diagnostics={sseClient.diagnostics}
            canReconnect={sseClient.canReconnect}
            onReconnect={sseClient.reconnect}
            onForceReconnect={sseClient.forceReconnect}
            showDiagnostics={true}
          />
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Uptime</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(sseClient.metrics.uptime / 1000)}s
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge 
                      variant={sseClient.connectionQuality === 'excellent' ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {sseClient.connectionQuality}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Latency</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Math.round(sseClient.metrics.averageLatency)}ms
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {sseClient.events.length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Circuit Breaker Status */}
              {sseClient.circuitBreaker.state !== 'closed' && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Circuit Breaker Active</AlertTitle>
                  <AlertDescription>
                    Connection protection is active due to repeated failures. 
                    State: <strong>{sseClient.circuitBreaker.state}</strong>
                    {sseClient.circuitBreaker.failureCount > 0 && (
                      <span> • Failures: {sseClient.circuitBreaker.failureCount}</span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Event Queue Status */}
              {sseClient.eventQueueOverflow && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Event Queue Overflow</AlertTitle>
                  <AlertDescription>
                    Event queue has reached capacity. Older events are being discarded.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              {/* Recent Events */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Events
                  </CardTitle>
                  <CardDescription>
                    Last {sseClient.events.length} SSE events received
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {sseClient.events.slice().reverse().map((event, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                        <Badge variant="outline" className="text-xs">
                          {event.type}
                        </Badge>
                        <span className="flex-1 font-mono text-xs">
                          {JSON.stringify(event).slice(0, 100)}...
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                    {sseClient.events.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No events received yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Connection Log */}
              <Card>
                <CardHeader>
                  <CardTitle>Connection Log</CardTitle>
                  <CardDescription>
                    Real-time connection activity and events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-60 overflow-y-auto font-mono text-xs">
                    {connectionLog.map((entry, index) => (
                      <div key={index} className="p-1 hover:bg-gray-50 rounded">
                        {entry}
                      </div>
                    ))}
                    {connectionLog.length === 0 && (
                      <p className="text-gray-500 text-center py-4">No connection events yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              {/* Connection Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Connection Testing</CardTitle>
                  <CardDescription>
                    Test connection resilience and recovery mechanisms
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sseClient.reconnect}
                      disabled={!sseClient.canReconnect}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconnect
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sseClient.forceReconnect}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Force Reconnect
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sseClient.disconnect}
                    >
                      Disconnect
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sseClient.clearEvents}
                    >
                      Clear Events
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Simulate Network Issues:</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => simulateNetworkIssue('offline')}
                      >
                        Network Offline
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => simulateNetworkIssue('timeout')}
                      >
                        Connection Timeout
                      </Button>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => simulateNetworkIssue('error')}
                      >
                        Connection Error
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Error Handler Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Error Analysis</CardTitle>
                  <CardDescription>
                    Connection error patterns and recovery statistics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(errorHandler.getErrorStatistics().errorsByType).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                        <span className="font-mono">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Full Diagnostics Panel */}
      {showDiagnostics && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Comprehensive Diagnostics</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDiagnostics}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Diagnostics
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ConnectionDiagnostics
              metrics={sseClient.metrics}
              circuitBreaker={sseClient.circuitBreaker}
              diagnostics={sseClient.diagnostics}
              connectionStatus={sseClient.connectionStatus}
              sessionId={sessionId}
              retryCount={sseClient.retryCount}
              eventCount={sseClient.events.length}
              eventQueueOverflow={sseClient.eventQueueOverflow}
              onExportDiagnostics={handleExportDiagnostics}
              onResetMetrics={() => {
                addToLog('Metrics reset requested');
                // Reset would be implemented in the SSE client
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ConnectionResilienceDemo;