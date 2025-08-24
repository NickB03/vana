/**
 * SSE Usage Examples
 * 
 * Examples demonstrating how to use the enhanced SSE client infrastructure
 * in React components.
 */

'use client';

import React from 'react';
import {
  useSSE,
  useSSEEvent,
  useAgentNetworkEvents,
  useSSEConnectionEvents,
  useSSEHealth
} from '@/hooks/useSSE';
import { AgentNetworkUpdate, ConnectionEvent, MessageEvent } from '@/lib/sse/types';

// ============================================================================
// Example 1: Basic SSE Connection
// ============================================================================

export function BasicSSEExample() {
  const {
    isConnected,
    isConnecting,
    connectionError,
    connect,
    disconnect
  } = useSSE({
    autoConnect: true,
    maxRetries: 3,
    heartbeatInterval: 30000,
  });

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Basic SSE Connection</h3>
      <div className="space-y-2">
        <p>Status: {isConnected ? '🟢 Connected' : isConnecting ? '🟡 Connecting...' : '🔴 Disconnected'}</p>
        {connectionError && (
          <p className="text-red-500">Error: {connectionError}</p>
        )}
        <div className="space-x-2">
          <button 
            onClick={connect}
            disabled={isConnected || isConnecting}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Connect
          </button>
          <button 
            onClick={disconnect}
            disabled={!isConnected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 2: Specific Event Handling
// ============================================================================

export function EventHandlingExample() {
  const [messages, setMessages] = React.useState<MessageEvent[]>([]);
  const [agentUpdates, setAgentUpdates] = React.useState<AgentNetworkUpdate[]>([]);

  // Listen for message events
  useSSEEvent('message', (data, event) => {
    console.log('Received message:', data);
    setMessages(prev => [...prev, data].slice(-10)); // Keep last 10 messages
  });

  // Listen for agent network updates
  useAgentNetworkEvents((data, event) => {
    console.log('Agent network update:', data);
    setAgentUpdates(prev => [...prev, data].slice(-5)); // Keep last 5 updates
  });

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Event Handling Example</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Recent Messages ({messages.length})</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {messages.map((msg, index) => (
              <div key={index} className="text-sm bg-gray-100 p-2 rounded">
                <span className="font-medium">{msg.role}:</span> {msg.content}
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Agent Updates ({agentUpdates.length})</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {agentUpdates.map((update, index) => (
              <div key={index} className="text-sm bg-blue-100 p-2 rounded">
                <div>Active Agents: {update.active_count}</div>
                <div>State: {update.network_state}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 3: Connection Health Monitoring
// ============================================================================

export function ConnectionHealthExample() {
  const { health, metrics, isConnected } = useSSEHealth({
    autoConnect: true,
    heartbeatInterval: 5000,
  });

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Connection Health Monitor</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">Health Status</h4>
          <div className="space-y-1">
            <p>Healthy: {health.isHealthy ? '✅' : '❌'}</p>
            <p>Connected: {isConnected ? '✅' : '❌'}</p>
            <p>Average Latency: {Math.round(health.averageLatency)}ms</p>
            <p>Uptime: {Math.round(health.connectionUptime / 1000)}s</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium mb-2">Connection Metrics</h4>
          <div className="space-y-1 text-sm">
            <p>Attempts: {metrics.connectionsAttempted}</p>
            <p>Successful: {metrics.connectionsSuccessful}</p>
            <p>Failed: {metrics.connectionsFailed}</p>
            <p>Messages: {metrics.messagesReceived}</p>
            <p>Parse Errors: {metrics.messagesParseErrors}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 4: Advanced Usage with Manual Event Handling
// ============================================================================

export function AdvancedSSEExample() {
  const [connectionHistory, setConnectionHistory] = React.useState<string[]>([]);
  
  const {
    client,
    isConnected,
    connectionState,
    addEventListener,
    updateSession,
    updateAuthToken
  } = useSSE({
    autoConnect: false,
    maxRetries: 5,
    exponentialBackoff: true,
    heartbeatInterval: 10000,
    onConnectionChange: (state) => {
      const timestamp = new Date().toLocaleTimeString();
      setConnectionHistory(prev => [
        ...prev,
        `${timestamp}: ${state.state} (type: ${state.connectionType})`
      ].slice(-10));
    },
    onError: (error) => {
      console.error('SSE Error:', error);
    },
    onHeartbeat: (latency) => {
      console.log('Heartbeat latency:', latency + 'ms');
    },
  });

  // Manual event listener with cleanup
  React.useEffect(() => {
    if (!client) return;

    const unsubscribeStatus = addEventListener('status', (event) => {
      console.log('Status update:', event.data);
    });

    const unsubscribeConnection = addEventListener('connection', (event) => {
      const data = event.data as ConnectionEvent;
      console.log('Connection event:', data.status);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeConnection();
    };
  }, [client, addEventListener]);

  const handleSessionChange = () => {
    const newSessionId = prompt('Enter new session ID:');
    if (newSessionId) {
      updateSession(newSessionId);
    }
  };

  const handleTokenUpdate = () => {
    const newToken = prompt('Enter new auth token:');
    if (newToken) {
      updateAuthToken(newToken);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Advanced SSE Usage</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium mb-2">Connection State</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p>Connected: {connectionState.connected ? '✅' : '❌'}</p>
            <p>State: {connectionState.state}</p>
            <p>Type: {connectionState.connectionType}</p>
            <p>Retries: {connectionState.retryCount}</p>
            <p>Last Event ID: {connectionState.lastEventId || 'N/A'}</p>
            <p>Latency: {connectionState.networkLatency ? Math.round(connectionState.networkLatency) + 'ms' : 'N/A'}</p>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Actions</h4>
          <div className="space-x-2">
            <button 
              onClick={handleSessionChange}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm"
            >
              Update Session
            </button>
            <button 
              onClick={handleTokenUpdate}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
            >
              Update Token
            </button>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">Connection History</h4>
          <div className="max-h-32 overflow-y-auto">
            {connectionHistory.map((entry, index) => (
              <div key={index} className="text-xs text-gray-600">
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Example 5: Component with Multiple Event Types
// ============================================================================

export function MultiEventExample() {
  const [eventLog, setEventLog] = React.useState<Array<{
    type: string;
    data: any;
    timestamp: string;
  }>>([]);

  const sse = useSSE({ autoConnect: true });

  // Register multiple event listeners
  React.useEffect(() => {
    const eventTypes = ['message', 'agent-update', 'status', 'heartbeat', 'error'];
    
    const unsubscribers = eventTypes.map(eventType => 
      sse.addEventListenerGeneric(eventType, (event) => {
        setEventLog(prev => [{
          type: event.type,
          data: event.data,
          timestamp: new Date().toLocaleTimeString()
        }, ...prev].slice(0, 50)); // Keep last 50 events
      })
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [sse]);

  const clearLog = () => setEventLog([]);

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-semibold mb-2">Multi-Event Monitor</h3>
      
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-600">
          Events: {eventLog.length} | Connected: {sse.isConnected ? '✅' : '❌'}
        </span>
        <button 
          onClick={clearLog}
          className="px-3 py-1 bg-gray-500 text-white rounded text-sm"
        >
          Clear Log
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto border rounded p-2 bg-gray-50">
        {eventLog.length === 0 ? (
          <p className="text-gray-500 text-sm">No events yet...</p>
        ) : (
          eventLog.map((entry, index) => (
            <div key={index} className="text-xs border-b border-gray-200 py-1">
              <span className="font-mono text-gray-500">{entry.timestamp}</span>{' '}
              <span className="font-medium text-blue-600">{entry.type}</span>
              <div className="ml-4 text-gray-700 truncate">
                {JSON.stringify(entry.data).slice(0, 100)}...
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Complete Example Page Component
// ============================================================================

export function SSEExamplesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">SSE Client Examples</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BasicSSEExample />
        <ConnectionHealthExample />
      </div>
      
      <EventHandlingExample />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdvancedSSEExample />
        <MultiEventExample />
      </div>
      
      <div className="text-sm text-gray-600 mt-8">
        <h3 className="font-medium mb-2">Key Features Demonstrated:</h3>
        <ul className="list-disc list-inside space-y-1">
          <li>Auto-reconnection with exponential backoff</li>
          <li>Authentication token support</li>
          <li>Heartbeat/keepalive mechanism</li>
          <li>Type-safe event handling</li>
          <li>Connection state monitoring</li>
          <li>Performance metrics tracking</li>
          <li>Memory leak prevention</li>
          <li>Multiple event type handling</li>
        </ul>
      </div>
    </div>
  );
}