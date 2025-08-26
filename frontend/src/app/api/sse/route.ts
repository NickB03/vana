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

  // Get auth token from cookies or Authorization header (NOT from URL)
  // Priority: httpOnly cookie > Authorization header
  const authCookie = request.cookies.get('auth-token');
  const authHeader = request.headers.get('Authorization');
  const token = authCookie?.value || authHeader?.replace('Bearer ', '');

  // Create a transform stream
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper function to send SSE events
  const sendEvent = async (event: Record<string, unknown>) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    await writer.write(encoder.encode(data));
  };

  // Helper function to send typed events
  const sendTypedEvent = async (type: string, data: Record<string, unknown>, id?: string) => {
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
      const backendSSEUrl = `${backendUrl}/agent_network_sse/${sessionId}`;
      const abortController = new AbortController();
      
      try {
        const backendResponse = await fetch(backendSSEUrl, {
          headers: {
            'Accept': 'text/event-stream',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          signal: abortController.signal
        });

        if (!backendResponse.ok) {
          // Handle non-OK backend responses
          await sendTypedEvent('error', {
            code: 'BACKEND_BAD_STATUS',
            message: `Backend SSE responded with ${backendResponse.status}`,
            status: backendResponse.status,
            recoverable: backendResponse.status >= 500
          });
        } else if (backendResponse.body) {
          const reader = backendResponse.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              buffer += chunk;
              const lines = buffer.split('\n');
              
              // Keep the incomplete line in the buffer
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    await sendEvent(data);
                  } catch {
                    // Not JSON, send as-is
                    await writer.write(encoder.encode(line + '\n'));
                  }
                } else if (line.startsWith('event: ')) {
                  // Forward event type
                  await writer.write(encoder.encode(line + '\n'));
                } else if (line.startsWith('id: ')) {
                  // Forward event ID for reconnection support
                  await writer.write(encoder.encode(line + '\n'));
                } else if (line.startsWith('retry: ')) {
                  // Forward retry directive
                  await writer.write(encoder.encode(line + '\n'));
                } else if (line.startsWith(':')) {
                  // Forward SSE comments
                  await writer.write(encoder.encode(line + '\n'));
                } else if (line === '') {
                  // End of event
                  await writer.write(encoder.encode('\n'));
                }
              }
            }
          } finally {
            reader.releaseLock();
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
        try {
          abortController.abort();
        } catch {
          // Ignore abort errors
        }
        try {
          writer.close();
        } catch {
          // Ignore close errors
        }
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
  sendEvent: (type: string, data: Record<string, unknown>, id?: string) => Promise<void>,
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