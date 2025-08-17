'use client';

/**
 * SSE Debug Component for Testing Integration
 * 
 * This component provides debugging and testing capabilities for the SSE integration.
 * It can be used to validate the connection, monitor events, and test functionality.
 */

import React, { useState } from 'react';
import { useSSEContext, useSSEEventListener, useSSEStatus } from './sse-provider';
import { SSEEvent } from '@/lib/sse-client';
import { AgentNetworkUpdate, ConnectionEvent } from '@/types/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function SSEDebugPanel(): JSX.Element {
  const {
    connectionState,
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect,
    reconnect,
    recentEvents,
    clearRecentEvents,
    agentNetworkState,
    lastAgentUpdate,
    eventCount,
    connectionUptime,
  } = useSSEContext();

  const { status, message, canRetry } = useSSEStatus();
  // TODO: Re-enable when sse-debug functionality is implemented
  // const recentNetworkEvents = useRecentSSEEvents('agent_network_update', 5);
  // const recentConnectionEvents = useRecentSSEEvents('agent_network_connection', 3);
  
  const [eventLog, setEventLog] = useState<string[]>([]);

  // Listen for various event types and log them
  useSSEEventListener('agent_network_update', (data: AgentNetworkUpdate, _event: SSEEvent) => {
    const logEntry = `[${new Date().toLocaleTimeString()}] Agent Network Update: ${data.active_count} agents active`;
    setEventLog(prev => [logEntry, ...prev.slice(0, 19)]); // Keep last 20 entries
  });

  useSSEEventListener('agent_network_connection', (data: ConnectionEvent, _event: SSEEvent) => {
    const logEntry = `[${new Date().toLocaleTimeString()}] Connection: ${data.status}`;
    setEventLog(prev => [logEntry, ...prev.slice(0, 19)]);
  });

  useSSEEventListener('error', (data: unknown, _event: SSEEvent) => {
    const errorData = data as { message?: string };
    const logEntry = `[${new Date().toLocaleTimeString()}] Error: ${errorData.message || 'Unknown error'}`;
    setEventLog(prev => [logEntry, ...prev.slice(0, 19)]);
  });

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">SSE Debug Panel</h2>
      
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
            Connection Status
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-medium">Type</div>
              <Badge variant="outline">{connectionState.connectionType}</Badge>
            </div>
            <div>
              <div className="font-medium">Retry Count</div>
              <div>{connectionState.retryCount}</div>
            </div>
            <div>
              <div className="font-medium">Events</div>
              <div>{eventCount}</div>
            </div>
            <div>
              <div className="font-medium">Uptime</div>
              <div>{formatUptime(connectionUptime)}</div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={connect} 
              disabled={isConnected || isConnecting}
              variant="default"
              size="sm"
            >
              Connect
            </Button>
            <Button 
              onClick={disconnect} 
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              Disconnect
            </Button>
            <Button 
              onClick={reconnect} 
              disabled={!canRetry}
              variant="secondary"
              size="sm"
            >
              Reconnect
            </Button>
            <Button 
              onClick={clearRecentEvents}
              variant="ghost"
              size="sm"
            >
              Clear Events
            </Button>
          </div>

          {connectionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              <strong>Error:</strong> {connectionError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent Network State */}
      {agentNetworkState && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Network State</CardTitle>
            <CardDescription>
              Last updated: {lastAgentUpdate?.timestamp ? new Date(lastAgentUpdate.timestamp).toLocaleString() : 'Never'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="font-medium">Network State</div>
                <Badge variant={agentNetworkState.network_state === 'active' ? 'default' : 'secondary'}>
                  {agentNetworkState.network_state}
                </Badge>
              </div>
              <div>
                <div className="font-medium">Active Agents</div>
                <div>{agentNetworkState.active_count || 0}</div>
              </div>
              <div>
                <div className="font-medium">Total Messages</div>
                <div>{agentNetworkState.total_messages || 0}</div>
              </div>
              <div>
                <div className="font-medium">Session ID</div>
                <div className="truncate">{agentNetworkState.session_id}</div>
              </div>
            </div>

            {(agentNetworkState as { agents?: unknown[] }).agents && (agentNetworkState as { agents: unknown[] }).agents.length > 0 && (
              <div className="mt-4">
                <div className="font-medium mb-2">Agents:</div>
                <div className="space-y-2">
                  {(agentNetworkState as { agents?: Array<{ id?: string; name?: string; role?: string; status?: string }> }).agents?.map((agent, index: number) => (
                    <div key={agent.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{agent.name || agent.id}</span>
                        <span className="ml-2 text-sm text-gray-600">({agent.role})</span>
                      </div>
                      <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
                        {agent.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>{recentEvents.length} events received</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {eventLog.length > 0 ? (
              eventLog.map((entry, index) => (
                <div key={index} className="text-sm font-mono text-gray-600 border-b border-gray-100 pb-1">
                  {entry}
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 italic">No events logged yet</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Raw Event Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Event Data</CardTitle>
          <CardDescription>Last {Math.min(recentEvents.length, 5)} events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentEvents.slice(0, 5).map((event, index) => (
              <div key={event.id || index} className="p-2 bg-gray-50 rounded text-sm">
                <div className="flex justify-between items-center mb-1">
                  <Badge variant="outline">{event.type}</Badge>
                  <span className="text-gray-500 text-xs">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-xs overflow-x-auto text-gray-600">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))}
          </div>
          
          {recentEvents.length === 0 && (
            <div className="text-sm text-gray-500 italic">No events received yet</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Simple SSE Status Indicator Component
 */
export function SSEStatusIndicator(): JSX.Element {
  const { status, message } = useSSEStatus();
  const { eventCount } = useSSEContext();

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${
        status === 'connected' ? 'bg-green-500' : 
        status === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
        status === 'error' ? 'bg-red-500' : 
        'bg-gray-400'
      }`} />
      <span className="text-gray-600">{message}</span>
      {eventCount > 0 && (
        <Badge variant="secondary" className="text-xs">
          {eventCount} events
        </Badge>
      )}
    </div>
  );
}