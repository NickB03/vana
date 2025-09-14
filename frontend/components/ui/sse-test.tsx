"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

interface SSEEvent {
  type: string;
  [key: string]: any;
}

export function SSETest() {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [query, setQuery] = useState('Test research query about artificial intelligence');
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const startTest = async () => {
    const newSessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newSessionId);
    setEvents([]);

    try {
      // Step 1: POST to start research
      console.log('Starting research with POST...');
      const response = await fetch(`http://localhost:8000/api/run_sse/${newSessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`POST failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('POST result:', result);
      
      setEvents(prev => [...prev, { type: 'post_response', data: result }]);

      // Step 2: Wait then connect to SSE
      setTimeout(() => {
        console.log('Connecting to SSE...');
        const eventSource = new EventSource(`http://localhost:8000/api/run_sse/${newSessionId}`, {
          withCredentials: true
        });

        eventSource.onopen = (event) => {
          console.log('SSE connection opened', event);
          setIsConnected(true);
          setEvents(prev => [...prev, { type: 'connection', status: 'opened' }]);
        };

        eventSource.onmessage = (event) => {
          console.log('SSE message:', event);
          try {
            const data = JSON.parse(event.data);
            setEvents(prev => [...prev, { type: 'message', ...data }]);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
            setEvents(prev => [...prev, { type: 'parse_error', raw: event.data }]);
          }
        };

        eventSource.onerror = (event) => {
          console.error('SSE error:', event);
          setEvents(prev => [...prev, { type: 'error', event: event.toString() }]);
          setIsConnected(false);
        };

        // Cleanup on unmount
        return () => {
          eventSource.close();
          setIsConnected(false);
        };
      }, 500);

    } catch (error) {
      console.error('Test failed:', error);
      setEvents(prev => [...prev, { type: 'test_error', error: error.message }]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            SSE Streaming Test
            <Badge variant={isConnected ? "success" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Test Query:</label>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter research query..."
              className="mt-1"
            />
          </div>
          
          <Button onClick={startTest} disabled={isConnected}>
            Start SSE Test
          </Button>
          
          {sessionId && (
            <p className="text-sm text-gray-600">Session ID: {sessionId}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((event, index) => (
              <div
                key={index}
                className="p-2 border rounded text-xs font-mono bg-gray-50"
              >
                <div className="font-semibold text-blue-600 mb-1">
                  [{new Date().toLocaleTimeString()}] {event.type}
                </div>
                <pre className="whitespace-pre-wrap text-gray-700">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SSETest;