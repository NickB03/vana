import { auth } from '@/app/(auth)/auth';
import { getChatById, saveMessages } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';

export const maxDuration = 60;

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

  if (!chatId || !taskId) {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();
  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // Verify chat access
  const chat = await getChatById({ id: chatId });
  if (!chat || chat.userId !== session.user.id) {
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const vanaBaseUrl = process.env.VANA_BASE_URL || 'http://localhost:8000';

  // Create abort controller for connection cleanup
  const abortController = new AbortController();
  
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
        const vanaStreamUrl = `${vanaBaseUrl}/chat/${chatId}/stream?task_id=${taskId}`;
        const response = await fetch(vanaStreamUrl, {
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'X-User-ID': session.user.id,
            'X-Session-ID': chatId,
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorMessage = `Failed to connect to Vana backend: ${response.status} ${response.statusText}`;
          sendSSE({ type: 'error', data: { message: errorMessage } }, 'error');
          controller.close();
          return;
        }

        if (!response.body) {
          sendSSE({ type: 'error', data: { message: 'No response body from Vana backend' } }, 'error');
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

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.trim() === '') continue;
              
              // Parse SSE line
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6));
                  
                  // Transform Vana events to AI SDK format
                  const transformedEvent = transformVanaEvent(eventData);
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
                  console.error('Error parsing Vana SSE event:', parseError);
                  const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parse error';
                  sendSSE({ 
                    type: 'error', 
                    data: { message: `Parse error: ${errorMessage}` } 
                  }, 'error');
                }
              }
            }
          }
        } catch (readerError) {
          console.error('Reader error:', readerError);
          if (readerError instanceof Error && readerError.name !== 'AbortError') {
            const errorMessage = readerError.message || 'Reader error occurred';
            sendSSE({ 
              type: 'error', 
              data: { message: `Reader error: ${errorMessage}` } 
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
        console.error('Vana stream error:', streamError);
        
        // Handle specific error types
        if (streamError instanceof Error) {
          if (streamError.name === 'AbortError') {
            console.log('Stream aborted by client');
            return; // Don't send error for client-initiated abort
          }
          
          if (streamError.name === 'TypeError' && streamError.message.includes('fetch')) {
            sendSSE({ 
              type: 'error', 
              data: { message: 'Network error: Unable to connect to Vana backend' } 
            }, 'error');
          } else {
            const errorMessage = streamError.message || 'Unknown stream error';
            sendSSE({ 
              type: 'error', 
              data: { message: `Stream error: ${errorMessage}` } 
            }, 'error');
          }
        } else {
          sendSSE({ 
            type: 'error', 
            data: { message: 'Unknown error occurred during streaming' } 
          }, 'error');
        }
      } finally {
        // Send completion event only if not aborted
        if (!abortController.signal.aborted) {
          sendSSE({ type: 'task_complete', data: { task_id: taskId } }, 'complete');
        }
        
        try {
          controller.close();
        } catch (closeError) {
          console.warn('Failed to close controller:', closeError);
        }
      }
    },
    
    cancel() {
      // Handle client disconnect
      console.log('SSE stream cancelled by client');
      abortController.abort();
    }
  });

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
      'Access-Control-Allow-Headers': 'Cache-Control, X-Requested-With',
      'Access-Control-Expose-Headers': 'X-Accel-Buffering, Transfer-Encoding',
    },
  });
}

/**
 * Transform Vana backend events to AI SDK compatible format
 */
function transformVanaEvent(vanaEvent: any): { type: string; data: any } | null {
  // Validate input
  if (!vanaEvent || typeof vanaEvent !== 'object') {
    console.warn('Invalid Vana event data:', vanaEvent);
    return null;
  }

  const eventType = vanaEvent.type;
  if (typeof eventType !== 'string') {
    console.warn('Vana event missing type field:', vanaEvent);
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
      console.warn('Unknown Vana event type:', eventType);
      return {
        type: 'data-textDelta',
        data: `\n\n**Unknown Event:** ${eventType}\n\n`,
      };
  }
}