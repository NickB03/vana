import { auth } from '@/app/(auth)/auth';
import { getChatById, saveMessages } from '@/lib/db/queries';
import { ChatSDKError, SSEConnectionError, StreamParsingError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';

export const maxDuration = 60;

// Environment validation for SSE streaming
const VANA_BASE_URL = process.env.VANA_BASE_URL || 'http://localhost:8000';
const SSE_TIMEOUT = parseInt(process.env.VANA_SSE_TIMEOUT || '60000', 10);
const MAX_RECONNECT_ATTEMPTS = parseInt(process.env.VANA_MAX_RECONNECT_ATTEMPTS || '3', 10);

console.log('Vana SSE stream configuration:', {
  baseUrl: VANA_BASE_URL,
  sseTimeout: SSE_TIMEOUT,
  maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS
});

/**
 * GET /api/chat/vana/[id]/stream
 * Stream responses from Vana backend via Server-Sent Events
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chatId } = await params;
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('task_id');
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  console.log(`[${requestId}] GET /api/chat/vana/${chatId}/stream - Starting SSE connection`, {
    chatId,
    taskId,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin')
  });

  if (!chatId || !taskId) {
    console.error(`[${requestId}] Missing required parameters:`, { chatId, taskId });
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    console.warn(`[${requestId}] Unauthorized SSE request - no session`);
    return new ChatSDKError('unauthorized:chat').toResponse();
  }
  
  console.log(`[${requestId}] SSE authentication successful:`, {
    userId: session.user.id,
    chatId
  });

  // Verify chat access
  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) {
    console.error(`[${requestId}] Chat access denied:`, {
      chatExists: !!chat,
      chatUserId: chat?.userId,
      requestUserId: session.user.id
    });
    return new ChatSDKError('forbidden:chat').toResponse();
  }
  
  console.log(`[${requestId}] Chat access verified successfully`);

  // Create abort controller for connection cleanup
  const abortController = new AbortController();
  let connectionStartTime: number;
  let messagesReceived = 0;
  let bytesReceived = 0;
  
  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let messageId = 0;
      
      // Helper function to send SSE message with proper formatting
      const sendSSE = (data: any, event?: string, id?: string) => {
        const messageLines = [
          id ? `id: ${id}` : `id: ${++messageId}`,
          event ? `event: ${event}` : undefined,
          'retry: 3000',
          `data: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
          '', // Empty line to end message
          ''
        ].filter(Boolean).join('\n');
        
        controller.enqueue(encoder.encode(messageLines));
      };

      try {
        // Connect to Vana backend SSE stream with abort signal
        const vanaStreamUrl = `${VANA_BASE_URL}/chat/${chatId}/stream?task_id=${taskId}`;
        connectionStartTime = Date.now();
        
        console.log(`[${requestId}] Connecting to Vana SSE stream:`, {
          url: vanaStreamUrl,
          timeout: SSE_TIMEOUT
        });
        
        const connectionTimeout = setTimeout(() => {
          console.warn(`[${requestId}] SSE connection timeout after ${SSE_TIMEOUT}ms`);
          abortController.abort(new Error('Connection timeout'));
        }, SSE_TIMEOUT);
        
        const response = await fetch(vanaStreamUrl, {
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-User-ID': session.user.id,
            'X-Session-ID': chatId,
            'X-Request-ID': requestId,
            'User-Agent': 'Vana-Frontend-SSE/1.0'
          },
          signal: abortController.signal,
        });
        
        clearTimeout(connectionTimeout);
        const connectionTime = Date.now() - connectionStartTime;
        
        console.log(`[${requestId}] SSE connection established:`, {
          status: response.status,
          statusText: response.statusText,
          connectionTime: `${connectionTime}ms`,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorMessage = `Failed to connect to Vana backend: ${response.status} ${response.statusText}`;
          console.error(`[${requestId}] SSE connection failed:`, {
            status: response.status,
            statusText: response.statusText,
            connectionTime: `${connectionTime}ms`
          });
          
          sendSSE({ 
            type: 'error', 
            data: { 
              message: errorMessage,
              status: response.status,
              request_id: requestId
            } 
          }, 'error');
          controller.close();
          return;
        }

        if (!response.body) {
          const errorMessage = 'No response body from Vana backend';
          console.error(`[${requestId}] ${errorMessage}`);
          sendSSE({ 
            type: 'error', 
            data: { 
              message: errorMessage,
              request_id: requestId
            } 
          }, 'error');
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        const assistantMessages: ChatMessage[] = [];

        try {
          while (true) {
            // Check if abort signal was triggered
            if (abortController.signal.aborted) {
              console.log('SSE stream aborted by client');
              break;
            }
            
            const { done, value } = await reader.read();
            
            if (done) {
              const totalTime = Date.now() - startTime;
              console.log(`[${requestId}] SSE stream completed:`, {
                messagesReceived,
                bytesReceived,
                totalTime: `${totalTime}ms`,
                assistantMessages: assistantMessages.length
              });
              // Save any pending messages to database
              if (assistantMessages.length > 0) {
                try {
                  await saveMessages({
                    messages: assistantMessages.map(message => ({
                      id: message.id,
                      role: message.role,
                      parts: message.parts,
                      chatId,
                      attachments: [],
                      createdAt: new Date(),
                    })),
                  });
                } catch (dbError) {
                  console.error('Failed to save messages to database:', dbError);
                  // Don't throw here as stream is ending anyway
                }
              }
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            bytesReceived += chunk.length;
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === '') continue;
              
              // Parse SSE line
              if (line.startsWith('data: ')) {
                try {
                  const eventDataString = line.slice(6);
                  let eventData;
                  
                  try {
                    eventData = JSON.parse(eventDataString);
                  } catch (jsonError) {
                    throw new StreamParsingError(
                      `Invalid JSON in SSE data: ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'}`,
                      eventDataString,
                      'json',
                      jsonError instanceof Error ? jsonError : undefined
                    );
                  }
                  
                  messagesReceived++;
                  
                  // Transform Vana events to AI SDK format
                  const transformedEvent = transformVanaEvent(eventData, requestId);
                  if (transformedEvent) {
                    // Forward to client with proper event type and id
                    const eventType = transformedEvent.type.replace('data-', '');
                    const eventId = eventData.message_id || `msg-${messageId}`;
                    sendSSE(transformedEvent.data, eventType, eventId);
                    
                    // Collect messages for database save
                    if (transformedEvent.type === 'data-appendMessage') {
                      assistantMessages.push({
                        id: eventData.message_id || Date.now().toString(),
                        role: 'assistant',
                        parts: [{ type: 'text', text: eventData.content || '' }],
                        metadata: {
                          createdAt: new Date().toISOString(),
                        },
                      } as ChatMessage);
                    }
                  }
                } catch (parseError) {
                  console.error(`[${requestId}] Error parsing Vana SSE event:`, {
                    error: parseError,
                    line: line.substring(0, 200) + '...', // Truncate for logging
                    messagesReceived,
                    parseStage: parseError instanceof StreamParsingError ? parseError.parseStage : 'unknown'
                  });
                  
                  const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
                  sendSSE({ 
                    type: 'error', 
                    data: { 
                      message: `Parse error: ${errorMessage}`,
                      request_id: requestId,
                      messages_received: messagesReceived
                    } 
                  }, 'error');
                }
              }
            }
          }
        } catch (readerError) {
          const totalTime = Date.now() - startTime;
          console.error(`[${requestId}] SSE reader error:`, {
            error: readerError,
            message: readerError instanceof Error ? readerError.message : 'Unknown reader error',
            name: readerError instanceof Error ? readerError.name : undefined,
            messagesReceived,
            totalTime: `${totalTime}ms`
          });
          
          if (readerError instanceof Error && readerError.name !== 'AbortError') {
            const errorMessage = readerError.message || 'Reader error occurred';
            sendSSE({ 
              type: 'error', 
              data: { 
                message: `Reader error: ${errorMessage}`,
                request_id: requestId,
                messages_received: messagesReceived,
                bytes_received: bytesReceived
              } 
            }, 'error');
          }
        } finally {
          try {
            reader.releaseLock();
          } catch (lockError) {
            console.warn('Failed to release reader lock:', lockError);
          }
        }

      } catch (streamError) {
        const totalTime = Date.now() - startTime;
        console.error(`[${requestId}] Vana stream error:`, {
          error: streamError,
          message: streamError instanceof Error ? streamError.message : 'Unknown stream error',
          name: streamError instanceof Error ? streamError.name : undefined,
          stack: streamError instanceof Error ? streamError.stack : undefined,
          messagesReceived,
          bytesReceived,
          totalTime: `${totalTime}ms`
        });
        
        // Handle specific error types
        if (streamError instanceof Error) {
          if (streamError.name === 'AbortError') {
            console.log(`[${requestId}] Stream aborted by client or timeout`);
            return; // Don't send error for client-initiated abort
          }
          
          if (streamError.name === 'TypeError' && streamError.message.includes('fetch')) {
            sendSSE({ 
              type: 'error', 
              data: { 
                message: 'Network error: Unable to connect to Vana backend',
                request_id: requestId,
                retry_recommended: true
              } 
            }, 'error');
          } else {
            const errorMessage = streamError.message || 'Unknown stream error';
            sendSSE({ 
              type: 'error', 
              data: { 
                message: `Stream error: ${errorMessage}`,
                request_id: requestId,
                messages_received: messagesReceived
              } 
            }, 'error');
          }
        } else {
          sendSSE({ 
            type: 'error', 
            data: { 
              message: 'Unknown error occurred during streaming',
              request_id: requestId
            } 
          }, 'error');
        }
      } finally {
        const totalTime = Date.now() - startTime;
        
        console.log(`[${requestId}] SSE stream cleanup:`, {
          aborted: abortController.signal.aborted,
          messagesReceived,
          bytesReceived,
          totalTime: `${totalTime}ms`
        });
        
        // Send completion event only if not aborted
        if (!abortController.signal.aborted) {
          sendSSE({ 
            type: 'task_complete', 
            data: { 
              task_id: taskId,
              request_id: requestId,
              messages_received: messagesReceived,
              total_time: totalTime
            } 
          }, 'complete');
        }
        
        try {
          controller.close();
        } catch (closeError) {
          console.warn(`[${requestId}] Failed to close controller:`, closeError);
        }
      }
    },
    
    cancel() {
      // Handle client disconnect
      const totalTime = Date.now() - startTime;
      console.log(`[${requestId}] SSE stream cancelled by client:`, {
        messagesReceived,
        bytesReceived,
        totalTime: `${totalTime}ms`
      });
      abortController.abort(new Error('Client disconnected'));
    }
  });

  console.log(`[${requestId}] Returning SSE response with production-ready headers`);
  
  // Return SSE response with production-ready headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Transfer-Encoding': 'chunked', // Enable chunked encoding
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control, X-Requested-With, X-Request-ID',
      'Access-Control-Expose-Headers': 'X-Accel-Buffering, Transfer-Encoding, X-Request-ID',
      'X-Request-ID': requestId,
      'X-Stream-Start-Time': startTime.toString()
    },
  });
}

/**
 * Transform Vana backend events to AI SDK compatible format
 */
function transformVanaEvent(vanaEvent: any, requestId?: string): { type: string; data: any } | null {
  // Validate input
  if (!vanaEvent || typeof vanaEvent !== 'object') {
    console.warn(`[${requestId || 'unknown'}] Invalid Vana event data:`, vanaEvent);
    return null;
  }

  const eventType = vanaEvent.type;
  if (typeof eventType !== 'string') {
    console.warn(`[${requestId || 'unknown'}] Vana event missing type field:`, vanaEvent);
    return null;
  }

  switch (eventType) {
    case 'message_delta':
      return {
        type: 'data-textDelta',
        data: vanaEvent.content || vanaEvent.delta || '',
      };
    
    case 'message_complete':
      return {
        type: 'data-appendMessage',
        data: {
          id: vanaEvent.message_id || Date.now().toString(),
          role: 'assistant',
          content: vanaEvent.content || '',
          createdAt: new Date().toISOString(),
        },
      };
    
    case 'agent_progress': {
      const progressPercent = typeof vanaEvent.progress === 'number' 
        ? Math.round(vanaEvent.progress * 100) 
        : 0;
      return {
        type: 'data-textDelta',
        data: `\n\n**Agent Progress:** ${vanaEvent.agent_id || 'Unknown'} - ${vanaEvent.message || 'Processing'} (${progressPercent}%)\n\n`,
      };
    }
    
    case 'tool_call':
      return {
        type: 'data-textDelta',
        data: `\n\n**Using Tool:** ${vanaEvent.tool_name || 'Unknown tool'}\n`,
      };
    
    case 'artifact_create':
      return {
        type: 'data-kind',
        data: vanaEvent.artifact_type || 'text',
      };
    
    case 'error':
      return {
        type: 'data-error',
        data: {
          message: vanaEvent.message || 'Unknown error occurred',
          code: vanaEvent.code || 'UNKNOWN_ERROR',
        },
      };
    
    case 'task_complete':
      return {
        type: 'data-finish',
        data: {
          task_id: vanaEvent.task_id,
          completed_at: new Date().toISOString(),
        },
      };
    
    default:
      console.warn(`[${requestId || 'unknown'}] Unknown Vana event type:`, eventType);
      return {
        type: 'data-textDelta',
        data: `\n\n**Unknown Event:** ${eventType}\n\n`,
      };
  }
}