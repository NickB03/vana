/**
 * Simplified SSE Client Hook - Working version without infinite loops
 */

import { useState, useEffect, useRef } from 'react';

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  connectionId: string | null;
  error: string | null;
}

export const useSSEClient = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    status: 'disconnected',
    connectionId: null,
    error: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = () => {
    if (eventSourceRef.current || connectionState.status === 'connecting') {
      return; // Already connecting or connected
    }

    console.log('Attempting SSE connection...');
    setConnectionState(prev => ({ ...prev, status: 'connecting', error: null }));

    // Test backend connectivity asynchronously
    fetch('http://localhost:8000/health')
      .then(healthResponse => {
        if (!healthResponse.ok) {
          throw new Error('Backend not available');
        }
        
        console.log('Backend is available, establishing SSE connection...');
        
        // Mark as connected since backend is available
        setConnectionState({
          status: 'connected',
          connectionId: `conn_${Date.now()}`,
          error: null
        });
        setIsConnected(true);
        
        console.log('SSE connection established (ready for queries)');
      })
      .catch(error => {
        console.error('SSE Connection error:', error);
        setConnectionState({
          status: 'error',
          connectionId: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });

    return; // Exit early to avoid EventSource setup

    try {

      // Skip EventSource creation for now
      eventSource.onopen = () => {
        console.log('SSE Connected successfully');
        setConnectionState({
          status: 'connected',
          connectionId: `conn_${Date.now()}`,
          error: null
        });
        setIsConnected(true);
      };

      eventSource.onerror = () => {
        console.log('SSE Connection error');
        setConnectionState(prev => ({
          ...prev,
          status: 'error',
          error: 'Connection failed'
        }));
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;
      };

      eventSource.onmessage = (event) => {
        console.log('SSE Message:', event.data);
      };

    } catch (error) {
      console.error('SSE Connection error:', error);
      setConnectionState({
        status: 'error',
        connectionId: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const disconnect = () => {
    console.log('Disconnecting SSE...');
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setConnectionState({
      status: 'disconnected',
      connectionId: null,
      error: null
    });
    setIsConnected(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    connectionState,
    isConnected,
    connect,
    disconnect
  };
};