/**
 * SSE Server Endpoint
 * Next.js API route for Server-Sent Events
 */

import { NextRequest } from 'next/server';

// SSE headers
const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no', // Disable Nginx buffering
};

export async function GET(request: NextRequest) {
  // Get session ID from headers or query params
  const sessionId = request.headers.get('X-Session-ID') || 
                   request.nextUrl.searchParams.get('session_id');
                   
  if (!sessionId) {
    return new Response('Session ID required', { status: 400 });
  }

  // Get auth token
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') || 
               request.nextUrl.searchParams.get('token');

  // Create a transform stream
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper function to send SSE events
  const sendEvent = async (event: any) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    await writer.write(encoder.encode(data));
  };

  // Helper function to send typed events
  const sendTypedEvent = async (type: string, data: any, id?: string) => {
    let message = '';
    if (id) message += `id: ${id}\n`;
    if (type !== 'message') message += `event: ${type}\n`;
    message += `data: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Start async processing
  (async () => {
    try {
      // Send initial connection event
      await sendTypedEvent('status', {
        code: 200,
        message: 'Connected to SSE stream',
        sessionId,
        timestamp: Date.now()
      });

      // Set up heartbeat
      const heartbeatInterval = setInterval(async () => {
        await sendTypedEvent('heartbeat', {
          timestamp: Date.now(),
          sessionId
        });
      }, 30000);

      // Connect to backend SSE stream if available
      const backendUrl = process.env['BACKEND_URL'] || 'http://localhost:8000';
      const backendSSEUrl = `${backendUrl}/api/v1/sse/stream/${sessionId}`;
      
      try {
        const backendResponse = await fetch(backendSSEUrl, {
          headers: {
            'Accept': 'text/event-stream',
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });

        if (backendResponse.ok && backendResponse.body) {
          const reader = backendResponse.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  await sendEvent(data);
                } catch (e) {
                  // Not JSON, send as-is
                  await writer.write(encoder.encode(line + '\n'));
                }
              } else if (line.startsWith('event: ')) {
                // Forward event type
                await writer.write(encoder.encode(line + '\n'));
              } else if (line === '') {
                // End of event
                await writer.write(encoder.encode('\n'));
              }
            }
          }
        }
      } catch (backendError) {
        console.error('Backend SSE connection failed:', backendError);
        
        // Send error event but keep connection open
        await sendTypedEvent('error', {
          code: 'BACKEND_CONNECTION_FAILED',
          message: 'Failed to connect to backend SSE stream',
          recoverable: true
        });

        // Fallback to mock events for development
        if (process.env.NODE_ENV === 'development') {
          await startMockEventStream(sendTypedEvent, sessionId);
        }
      }

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        writer.close();
      });

    } catch (error) {
      console.error('SSE stream error:', error);
      await sendTypedEvent('error', {
        code: 'STREAM_ERROR',
        message: 'Internal stream error',
        recoverable: false
      });
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: SSE_HEADERS,
  });
}

// Mock event stream for development
async function startMockEventStream(
  sendEvent: (type: string, data: any, id?: string) => Promise<void>,
  sessionId: string
) {
  // Simulate agent updates
  const agents = ['agent-1', 'agent-2', 'agent-3'];
  let messageCount = 0;

  // Send initial agent status
  for (const agentId of agents) {
    await sendEvent('agent-update', {
      agentId,
      status: 'idle',
      message: `Agent ${agentId} initialized`
    });
  }

  // Simulate periodic messages
  const messageInterval = setInterval(async () => {
    messageCount++;
    
    // Send a message
    await sendEvent('message', {
      id: `msg-${messageCount}`,
      content: `Test message ${messageCount}`,
      role: 'assistant',
      sessionId,
      timestamp: Date.now()
    });

    // Update a random agent
    const randomAgent = agents[Math.floor(Math.random() * agents.length)];
    const statuses = ['idle', 'thinking', 'working', 'complete'];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    await sendEvent('agent-update', {
      agentId: randomAgent,
      status: randomStatus,
      message: `Agent ${randomAgent} is ${randomStatus}`,
      progress: Math.random() * 100
    });

    // Send progress update
    if (messageCount % 3 === 0) {
      await sendEvent('progress', {
        taskId: 'task-1',
        current: messageCount,
        total: 20,
        message: `Processing step ${messageCount}`
      });
    }

    // Stop after 20 messages
    if (messageCount >= 20) {
      clearInterval(messageInterval);
      await sendEvent('status', {
        code: 200,
        message: 'Mock stream complete'
      });
    }
  }, 2000);
}