/**
 * SSE Test Component - Verification component for secure SSE proxy implementation
 * Use this component to test the JWT token security fix
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useSSE } from '../../hooks/useSSE';
import { apiClient } from '../../lib/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';

export function SSETestComponent() {
  const [sessionId, setSessionId] = useState('test-session-123');
  const [isConnected, setIsConnected] = useState(false);

  // Test different SSE endpoints
  const agentNetworkSSE = useSSE(
    isConnected ? `/agent_network_sse/${sessionId}` : '',
    {
      autoReconnect: true,
      onConnect: () => console.log('Agent Network SSE connected'),
      onDisconnect: () => console.log('Agent Network SSE disconnected'),
      onError: (error) => console.error('Agent Network SSE error:', error),
    }
  );

  const researchSSE = useSSE(
    isConnected ? `/api/run_sse/${sessionId}` : '',
    {
      autoReconnect: true,
      onConnect: () => console.log('Research SSE connected'),
      onDisconnect: () => console.log('Research SSE disconnected'),
      onError: (error) => console.error('Research SSE error:', error),
    }
  );

  const toggleConnection = useCallback(() => {
    if (isConnected) {
      agentNetworkSSE.disconnect();
      researchSSE.disconnect();
    }
    setIsConnected(!isConnected);
  }, [isConnected, agentNetworkSSE, researchSSE]);

  const clearEvents = useCallback(() => {
    agentNetworkSSE.clearEvents();
    researchSSE.clearEvents();
  }, [agentNetworkSSE, researchSSE]);

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
              <Badge variant={apiClient.isAuthenticated() ? "default" : "destructive"}>
                {apiClient.isAuthenticated() ? '✓ Authenticated' : '✗ Not Authenticated'}
              </Badge>
              {apiClient.isAuthenticated() && (
                <p className="text-xs text-gray-600">
                  Token: {apiClient.getAccessToken()?.substring(0, 20)}...
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

            <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
              {agentNetworkSSE.events.slice(-5).map((event, index) => (
                <div key={index} className="mb-1">
                  <strong>{event.type}:</strong> {JSON.stringify(event.data).substring(0, 100)}...
                </div>
              ))}
            </div>
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

            <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs">
              {researchSSE.events.slice(-5).map((event, index) => (
                <div key={index} className="mb-1">
                  <strong>{event.type}:</strong> {JSON.stringify(event.data).substring(0, 100)}...
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}