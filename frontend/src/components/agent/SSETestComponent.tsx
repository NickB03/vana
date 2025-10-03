/**
 * SSE Test Component - Verification component for secure SSE proxy implementation
 * Use this component to test the JWT token security fix
 */

'use client';

import React, { useState, useMemo } from 'react';
import { useSSE } from '../../hooks/useSSE';
import { apiClient } from '../../lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { memoWithTracking, useStableCallback } from '../../lib/react-performance';

// Memoized component for displaying SSE events to prevent re-render loops
interface SSEEvent {
  type: string;
  data: {
    timestamp?: string;
    [key: string]: unknown;
  };
}

interface EventDisplayProps {
  events: SSEEvent[];
  maxEvents?: number;
  className?: string;
}

const EventDisplay = memoWithTracking(({ events, maxEvents = 5, className }: EventDisplayProps) => {
  // Stabilize the events array slice to prevent unnecessary re-renders
  const recentEvents = useMemo(() => 
    events.slice(-maxEvents), 
    [events.length, maxEvents, events[events.length - 1]]
  );

  return (
    <div className={className}>
      {recentEvents.map((event, index) => (
        <div key={`${event.type}-${event.data.timestamp || index}`} className="mb-1">
          <strong>{event.type}:</strong> {JSON.stringify(event.data).substring(0, 100)}...
        </div>
      ))}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if events array length changes or maxEvents changes
  return prevProps.events.length === nextProps.events.length && 
         prevProps.maxEvents === nextProps.maxEvents &&
         prevProps.className === nextProps.className;
}, 'EventDisplay');

function SSETestComponent() {
  const [sessionId, setSessionId] = useState('test-session-123');
  const [isConnected, setIsConnected] = useState(false);

  // Memoize SSE options to prevent re-creation on every render
  const agentNetworkOptions = useMemo(() => ({
    autoReconnect: true,
    onConnect: () => {}, // Debug logging removed
    onDisconnect: () => {}, // Debug logging removed
    onError: (error: Event) => console.error('Agent Network SSE error:', error),
  }), []);

  const researchOptions = useMemo(() => ({
    autoReconnect: true,
    onConnect: () => {}, // Debug logging removed
    onDisconnect: () => {}, // Debug logging removed
    onError: (error: Event) => console.error('Research SSE error:', error),
  }), []);

  // Test different SSE endpoints
  const agentNetworkSSE = useSSE(
    isConnected ? `/agent_network_sse/${sessionId}` : '',
    agentNetworkOptions
  );

  const researchSSE = useSSE(
    isConnected ? `/api/run_sse/${sessionId}` : '',
    researchOptions
  );

  const toggleConnection = useStableCallback(() => {
    if (isConnected) {
      agentNetworkSSE.disconnect();
      researchSSE.disconnect();
    }
    setIsConnected(!isConnected);
  }, [isConnected, agentNetworkSSE.disconnect, researchSSE.disconnect]);

  const clearEvents = useStableCallback(() => {
    agentNetworkSSE.clearEvents();
    researchSSE.clearEvents();
  }, [agentNetworkSSE.clearEvents, researchSSE.clearEvents]);

  // Memoize authentication status to prevent unnecessary re-renders
  const authStatus = useMemo(() => ({
    isAuthenticated: apiClient.isAuthenticated(),
    token: apiClient.getAccessToken()?.substring(0, 20) + '...' || null
  }), []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold">SSE Security Test Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Connection Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Session ID:</label>
              <input
                type="text"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={isConnected}
              />
            </div>

            <div className="space-y-2">
              <Button
                onClick={toggleConnection}
                className={`w-full ${
                  isConnected
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isConnected ? 'Disconnect SSE' : 'Connect SSE'}
              </Button>
              
              <Button
                onClick={clearEvents}
                variant="outline"
                className="w-full"
              >
                Clear Events
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Authentication Status:</h4>
              <Badge variant={authStatus.isAuthenticated ? "default" : "destructive"}>
                {authStatus.isAuthenticated ? '✓ Authenticated' : '✗ Not Authenticated'}
              </Badge>
              {authStatus.isAuthenticated && authStatus.token && (
                <p className="text-xs text-gray-600">
                  Token: {authStatus.token}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Information */}
        <Card>
          <CardHeader>
            <CardTitle>Security Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                <h4 className="font-medium text-green-800 mb-2">✓ Security Features Active:</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• JWT tokens not exposed in URLs</li>
                  <li>• Server-side proxy authentication</li>
                  <li>• HTTP-only cookie fallback</li>
                  <li>• Secure header-based token transfer</li>
                </ul>
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertDescription>
                <h4 className="font-medium text-blue-800 mb-2">Proxy Endpoints:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <code>/api/sse/agent_network_sse/{sessionId}</code></li>
                  <li>• <code>/api/sse/api/run_sse/{sessionId}</code></li>
                  <li>• <code>/api/sse?path=encoded_url</code></li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent Network SSE */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Network SSE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={
                agentNetworkSSE.connectionState === 'connected' ? 'default' :
                agentNetworkSSE.connectionState === 'connecting' ? 'secondary' :
                agentNetworkSSE.connectionState === 'error' ? 'destructive' :
                'outline'
              }>
                {agentNetworkSSE.connectionState}
              </Badge>
            </div>

            {agentNetworkSSE.error && (
              <div className="text-sm text-red-600">
                Error: {agentNetworkSSE.error}
              </div>
            )}

            <div className="text-sm">
              <span className="font-medium">Events:</span> {agentNetworkSSE.events.length}
            </div>

            {agentNetworkSSE.reconnectAttempt > 0 && (
              <div className="text-sm text-yellow-600">
                Reconnect attempt: {agentNetworkSSE.reconnectAttempt}
              </div>
            )}

            <EventDisplay 
              events={agentNetworkSSE.events} 
              maxEvents={5}
              className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs"
            />
          </CardContent>
        </Card>

        {/* Research SSE */}
        <Card>
          <CardHeader>
            <CardTitle>Research SSE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant={
                researchSSE.connectionState === 'connected' ? 'default' :
                researchSSE.connectionState === 'connecting' ? 'secondary' :
                researchSSE.connectionState === 'error' ? 'destructive' :
                'outline'
              }>
                {researchSSE.connectionState}
              </Badge>
            </div>

            {researchSSE.error && (
              <div className="text-sm text-red-600">
                Error: {researchSSE.error}
              </div>
            )}

            <div className="text-sm">
              <span className="font-medium">Events:</span> {researchSSE.events.length}
            </div>

            {researchSSE.reconnectAttempt > 0 && (
              <div className="text-sm text-yellow-600">
                Reconnect attempt: {researchSSE.reconnectAttempt}
              </div>
            )}

            <EventDisplay 
              events={researchSSE.events} 
              maxEvents={5}
              className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Memoize the main component to prevent unnecessary re-renders
const MemoizedSSETestComponent = memoWithTracking(
  SSETestComponent,
  () => true, // No props, so never re-render unless forced
  'SSETestComponent'
);

export { MemoizedSSETestComponent as SSETestComponent };
export default MemoizedSSETestComponent;