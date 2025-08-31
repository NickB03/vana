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

  // Create readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // Helper function to send SSE message
      const sendSSE = (data: any, event?: string) => {
        const message = `${event ? `event: ${event}\n` : ''}data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Connect to Vana backend SSE stream
        const vanaStreamUrl = `${vanaBaseUrl}/chat/${chatId}/stream?task_id=${taskId}`;
        const response = await fetch(vanaStreamUrl, {
          headers: {
            'Accept': 'text/event-stream',
            'X-User-ID': session.user.id,
            'X-Session-ID': chatId,
          },
        });

        if (!response.ok) {
          sendSSE({ type: 'error', data: { message: 'Failed to connect to Vana backend' } });
          controller.close();
          return;
        }

        if (!response.body) {
          sendSSE({ type: 'error', data: { message: 'No response body from Vana backend' } });
          controller.close();
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantMessages: ChatMessage[] = [];

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Save any pending messages to database
              if (assistantMessages.length > 0) {
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
                    // Forward to client
                    sendSSE(transformedEvent);
                    
                    // Collect messages for database save
                    if (transformedEvent.type === 'message_complete') {
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
                } catch (error) {
                  console.error('Error parsing Vana SSE event:', error);
                  sendSSE({ 
                    type: 'error', 
                    data: { message: `Parse error: ${error.message}` } 
                  });
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

      } catch (error) {
        console.error('Vana stream error:', error);
        sendSSE({ 
          type: 'error', 
          data: { message: `Stream error: ${error.message}` } 
        });
      } finally {
        // Send completion event
        sendSSE({ type: 'task_complete', data: { task_id: taskId } });
        controller.close();
      }
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

/**
 * Transform Vana backend events to AI SDK compatible format
 */
function transformVanaEvent(vanaEvent: any) {
  switch (vanaEvent.type) {
    case 'message_delta':
      return {
        type: 'data-textDelta',
        data: vanaEvent.content || vanaEvent.delta || '',
      };
    
    case 'message_complete':
      return {
        type: 'data-appendMessage',
        data: JSON.stringify({
          id: vanaEvent.message_id || Date.now().toString(),
          role: 'assistant',
          content: vanaEvent.content || '',
          createdAt: new Date().toISOString(),
        }),
      };
    
    case 'agent_progress':
      return {
        type: 'data-textDelta',
        data: `\n\n**Agent Progress:** ${vanaEvent.agent_id} - ${vanaEvent.message} (${Math.round(vanaEvent.progress * 100)}%)\n\n`,
      };
    
    case 'tool_call':
      return {
        type: 'data-textDelta',
        data: `\n\n**Using Tool:** ${vanaEvent.tool_name}\n`,
      };
    
    case 'artifact_create':
      // Convert to existing artifact system format
      return {
        type: 'data-kind',
        data: vanaEvent.artifact_type || 'text',
      };
    
    case 'error':
      return {
        type: 'data-textDelta',
        data: `\n\n**Error:** ${vanaEvent.message}\n\n`,
      };
    
    case 'task_complete':
      return {
        type: 'data-finish',
        data: null,
      };
    
    default:
      console.warn('Unknown Vana event type:', vanaEvent.type);
      return null;
  }
}