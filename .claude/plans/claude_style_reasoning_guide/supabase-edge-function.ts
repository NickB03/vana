// supabase/functions/chat-stream/index.ts
// Complete GLM 4.6 streaming implementation with thinking/reasoning support

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface StreamState {
  thinkingStarted: boolean;
  contentStarted: boolean;
  thinkingContent: string;
  responseContent: string;
  startTime: number;
  toolCalls: Map<number, { name: string; arguments: string }>;
}

// Extract meaningful status phrases from reasoning content
function extractStatus(text: string): string | null {
  const patterns = [
    /(?:let me|I'll|I will|I'm going to|going to)\s+([^.!?\n]{10,60})/i,
    /(?:analyzing|examining|considering|thinking about|looking at|reviewing|checking)\s+([^.!?\n]{5,50})/i,
    /(?:first|next|then|now|finally)\s*,?\s*([^.!?\n]{10,50})/i,
    /(?:the\s+)?(?:key|main|important|critical)\s+(?:point|thing|aspect|issue)\s+(?:is|here)\s+([^.!?\n]{10,50})/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const status = match[1].trim();
      // Capitalize first letter and clean up
      return status.charAt(0).toUpperCase() + status.slice(1).replace(/\s+/g, ' ');
    }
  }
  return null;
}

// Create custom SSE event
function createEvent(type: string, data: Record<string, unknown>): string {
  return `data: ${JSON.stringify({ type, ...data })}\n\n`;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      messages, 
      enableThinking = true,
      enableToolStream = false,
      tools = [],
      temperature = 1.0,
      maxTokens = 4096,
    } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('ZAI_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ZAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build GLM 4.6 request
    const glmRequest: Record<string, unknown> = {
      model: 'glm-4.6',
      messages,
      thinking: { type: enableThinking ? 'enabled' : 'disabled' },
      stream: true,
      max_tokens: maxTokens,
      temperature,
    };

    // Add tool streaming if tools are provided
    if (tools.length > 0) {
      glmRequest.tools = tools;
      glmRequest.tool_stream = enableToolStream;
    }

    // Call GLM 4.6 API
    const glmResponse = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(glmRequest),
    });

    if (!glmResponse.ok) {
      const errorText = await glmResponse.text();
      console.error('GLM API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'GLM API request failed', details: errorText }),
        { status: glmResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const state: StreamState = {
      thinkingStarted: false,
      contentStarted: false,
      thinkingContent: '',
      responseContent: '',
      startTime: Date.now(),
      toolCalls: new Map(),
    };

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastStatusEmitted = '';

    // Transform stream to our custom format
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          
          const jsonStr = line.slice(5).trim();
          
          if (jsonStr === '[DONE]') {
            // Send final summary
            const duration = Math.floor((Date.now() - state.startTime) / 1000);
            controller.enqueue(encoder.encode(createEvent('thinking_complete', {
              duration,
              thinking: state.thinkingContent,
            })));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            continue;
          }

          try {
            const data = JSON.parse(jsonStr);
            const choice = data.choices?.[0];
            if (!choice) continue;
            
            const delta = choice.delta;
            const finishReason = choice.finish_reason;

            // Handle reasoning content
            if (delta?.reasoning_content) {
              if (!state.thinkingStarted) {
                state.thinkingStarted = true;
                controller.enqueue(encoder.encode(createEvent('thinking_start', {})));
              }
              
              state.thinkingContent += delta.reasoning_content;
              
              // Extract and emit status updates (throttled)
              const status = extractStatus(delta.reasoning_content);
              if (status && status !== lastStatusEmitted && status.length > 15) {
                lastStatusEmitted = status;
                controller.enqueue(encoder.encode(createEvent('status', { 
                  description: status 
                })));
              }
              
              // Always emit thinking delta
              controller.enqueue(encoder.encode(createEvent('thinking_delta', {
                content: delta.reasoning_content,
              })));
            }

            // Handle response content
            if (delta?.content) {
              if (!state.contentStarted) {
                state.contentStarted = true;
                if (state.thinkingStarted) {
                  const duration = Math.floor((Date.now() - state.startTime) / 1000);
                  controller.enqueue(encoder.encode(createEvent('thinking_end', { duration })));
                }
                controller.enqueue(encoder.encode(createEvent('text_start', {})));
              }
              
              state.responseContent += delta.content;
              controller.enqueue(encoder.encode(createEvent('text_delta', {
                content: delta.content,
              })));
            }

            // Handle tool calls (GLM 4.6 specific feature)
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                const index = toolCall.index;
                
                if (!state.toolCalls.has(index)) {
                  // New tool call
                  state.toolCalls.set(index, {
                    name: toolCall.function?.name || '',
                    arguments: toolCall.function?.arguments || '',
                  });
                  
                  if (toolCall.function?.name) {
                    controller.enqueue(encoder.encode(createEvent('tool_call_start', {
                      index,
                      name: toolCall.function.name,
                    })));
                  }
                } else {
                  // Append to existing tool call
                  const existing = state.toolCalls.get(index)!;
                  if (toolCall.function?.arguments) {
                    existing.arguments += toolCall.function.arguments;
                    controller.enqueue(encoder.encode(createEvent('tool_call_delta', {
                      index,
                      arguments: toolCall.function.arguments,
                    })));
                  }
                }
              }
            }

            // Handle finish
            if (finishReason) {
              // Emit any pending tool calls as complete
              for (const [index, tool] of state.toolCalls) {
                controller.enqueue(encoder.encode(createEvent('tool_call_end', {
                  index,
                  name: tool.name,
                  arguments: tool.arguments,
                })));
              }
              
              if (state.contentStarted) {
                controller.enqueue(encoder.encode(createEvent('text_end', {
                  finish_reason: finishReason,
                })));
              }
            }

          } catch (e) {
            // Skip malformed JSON lines
            console.warn('Failed to parse SSE line:', jsonStr);
          }
        }
      },
      
      flush(controller) {
        // Process any remaining buffer
        if (buffer.trim()) {
          console.warn('Unprocessed buffer content:', buffer);
        }
      },
    });

    // Pipe GLM response through our transform
    const responseStream = glmResponse.body?.pipeThrough(transformStream);

    return new Response(responseStream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
