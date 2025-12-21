# Implementing Claude-Style Reasoning UI with GLM 4.6 + Supabase Edge Functions

A comprehensive implementation guide for building the "thinking ticker" pattern with your specific stack: GLM 4.6 API, Supabase Edge Functions, and React/Next.js frontend.

---

## How GLM 4.6 Reasoning Works (Key Differences from Claude)

GLM 4.6 has native reasoning support that's similar to Claude's extended thinking but with different API semantics. Here's what you need to know:

### Enabling Thinking Mode

```json
{
  "model": "glm-4.6",
  "messages": [...],
  "thinking": {
    "type": "enabled"  // or "disabled", default is "enabled"
  },
  "stream": true,
  "max_tokens": 4096,
  "temperature": 1.0
}
```

**Key difference from Claude**: GLM 4.6 enables thinking by default. Claude requires explicit `budget_tokens`.

### Streaming Response Structure

The GLM 4.6 streaming delta contains three distinct fields:

| Field | Purpose | When it appears |
|-------|---------|-----------------|
| `delta.reasoning_content` | Internal reasoning/thinking process | During thinking phase |
| `delta.content` | Final response text | After thinking completes |
| `delta.tool_calls` | Tool invocation data (with `tool_stream=True`) | When tools are called |

This is cleaner than Claude's approach—you don't need to track `content_block_start` events to know the block type. Just check which field is populated.

### Tool Streaming (Unique to GLM 4.6)

GLM 4.6 supports streaming tool calls, which Claude doesn't expose the same way:

```json
{
  "stream": true,
  "tool_stream": true,  // GLM 4.6 specific
  "tools": [...]
}
```

This means you can show "Calling weather API..." in real-time as the model invokes tools.

---

## Backend: Supabase Edge Function Implementation

### Basic Streaming Proxy

Create `supabase/functions/chat-stream/index.ts`:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, enableThinking = true } = await req.json();

    // Call GLM 4.6 API with streaming
    const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('ZAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'glm-4.6',
        messages,
        thinking: { type: enableThinking ? 'enabled' : 'disabled' },
        stream: true,
        max_tokens: 4096,
        temperature: 1.0,
      }),
    });

    // Proxy the stream directly to client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Stream error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

### Enhanced Stream with Status Events

For the "thinking ticker" with custom status messages, transform the stream:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StreamState {
  thinkingStarted: boolean;
  contentStarted: boolean;
  thinkingContent: string;
  startTime: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { messages, enableThinking = true } = await req.json();
  
  const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('ZAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'glm-4.6',
      messages,
      thinking: { type: enableThinking ? 'enabled' : 'disabled' },
      stream: true,
      max_tokens: 4096,
    }),
  });

  const state: StreamState = {
    thinkingStarted: false,
    contentStarted: false,
    thinkingContent: '',
    startTime: Date.now(),
  };

  // Transform the GLM stream into our custom format
  const transformStream = new TransformStream({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk);
      const lines = text.split('\n').filter(line => line.startsWith('data:'));
      
      for (const line of lines) {
        const jsonStr = line.replace('data: ', '').trim();
        if (jsonStr === '[DONE]') {
          // Send final thinking duration
          const duration = Math.floor((Date.now() - state.startTime) / 1000);
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ 
              type: 'thinking_complete', 
              duration,
              thinking: state.thinkingContent 
            })}\n\n`
          ));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          return;
        }

        try {
          const data = JSON.parse(jsonStr);
          const delta = data.choices?.[0]?.delta;
          
          if (delta?.reasoning_content) {
            // Emit thinking content
            if (!state.thinkingStarted) {
              state.thinkingStarted = true;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'thinking_start' })}\n\n`
              ));
            }
            state.thinkingContent += delta.reasoning_content;
            
            // Emit status update (extract key phrases for ticker)
            const status = extractStatus(delta.reasoning_content);
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ 
                type: 'thinking_delta', 
                content: delta.reasoning_content,
                status 
              })}\n\n`
            ));
          }
          
          if (delta?.content) {
            // Emit response content
            if (!state.contentStarted && state.thinkingStarted) {
              state.contentStarted = true;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'thinking_end' })}\n\n`
              ));
            }
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'text_delta', content: delta.content })}\n\n`
            ));
          }
          
        } catch (e) {
          // Skip malformed JSON
        }
      }
    }
  });

  const encoder = new TextEncoder();
  
  return new Response(response.body?.pipeThrough(transformStream), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
});

// Extract meaningful status from reasoning content
function extractStatus(text: string): string | null {
  // Look for key phrases that indicate what Claude is doing
  const patterns = [
    /(?:let me|I'll|I will|going to)\s+([^.!?]+)/i,
    /(?:analyzing|examining|considering|thinking about|looking at)\s+([^.!?]+)/i,
    /(?:first|next|then|now)\s*,?\s*([^.!?]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().slice(0, 60) + (match[1].length > 60 ? '...' : '');
    }
  }
  return null;
}
```

### With Tool Streaming Support

```typescript
// Add to your API call
body: JSON.stringify({
  model: 'glm-4.6',
  messages,
  thinking: { type: 'enabled' },
  stream: true,
  tool_stream: true,  // Enable tool streaming
  tools: [
    {
      type: 'function',
      function: {
        name: 'search_web',
        description: 'Search the web for current information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        }
      }
    }
  ],
}),

// In transform, handle tool_calls:
if (delta?.tool_calls) {
  for (const toolCall of delta.tool_calls) {
    controller.enqueue(encoder.encode(
      `data: ${JSON.stringify({ 
        type: 'tool_call', 
        index: toolCall.index,
        name: toolCall.function?.name,
        arguments: toolCall.function?.arguments 
      })}\n\n`
    ));
  }
}
```

---

## Frontend: React/Next.js Implementation

### Custom Hook for GLM Streaming

```typescript
// hooks/useGLMChat.ts
import { useState, useCallback, useRef } from 'react';

interface ThinkingState {
  isThinking: boolean;
  content: string;
  status: string | null;
  duration: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  thinking?: {
    content: string;
    duration: number;
  };
}

export function useGLMChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [thinking, setThinking] = useState<ThinkingState>({
    isThinking: false,
    content: '',
    status: null,
    duration: 0,
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const abortController = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);

  const sendMessage = useCallback(async (content: string) => {
    // Add user message
    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    
    // Reset state
    setIsStreaming(true);
    setCurrentResponse('');
    setThinking({ isThinking: true, content: '', status: 'Thinking...', duration: 0 });
    startTimeRef.current = Date.now();
    
    // Start duration timer
    const durationInterval = setInterval(() => {
      setThinking(prev => ({
        ...prev,
        duration: Math.floor((Date.now() - startTimeRef.current) / 1000)
      }));
    }, 1000);

    abortController.current = new AbortController();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            enableThinking: true,
          }),
          signal: abortController.current.signal,
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let thinkingContent = '';
      let responseContent = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data:'));

        for (const line of lines) {
          const jsonStr = line.replace('data: ', '').trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const event = JSON.parse(jsonStr);

            switch (event.type) {
              case 'thinking_start':
                setThinking(prev => ({ ...prev, isThinking: true }));
                break;

              case 'thinking_delta':
                thinkingContent += event.content;
                setThinking(prev => ({
                  ...prev,
                  content: thinkingContent,
                  status: event.status || prev.status,
                }));
                break;

              case 'thinking_end':
              case 'thinking_complete':
                setThinking(prev => ({
                  ...prev,
                  isThinking: false,
                  content: event.thinking || thinkingContent,
                  duration: event.duration || prev.duration,
                }));
                break;

              case 'text_delta':
                responseContent += event.content;
                setCurrentResponse(responseContent);
                break;
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }

      // Finalize assistant message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: responseContent,
          thinking: thinkingContent ? {
            content: thinkingContent,
            duration: Math.floor((Date.now() - startTimeRef.current) / 1000),
          } : undefined,
        },
      ]);

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Stream error:', error);
      }
    } finally {
      clearInterval(durationInterval);
      setIsStreaming(false);
      setCurrentResponse('');
    }
  }, [messages]);

  const stopGeneration = useCallback(() => {
    abortController.current?.abort();
  }, []);

  return {
    messages,
    thinking,
    isStreaming,
    currentResponse,
    sendMessage,
    stopGeneration,
  };
}
```

### Thinking Panel Component

```tsx
// components/ThinkingPanel.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';

interface ThinkingPanelProps {
  content: string;
  status: string | null;
  duration: number;
  isThinking: boolean;
  isExpanded?: boolean;
}

export function ThinkingPanel({ 
  content, 
  status, 
  duration, 
  isThinking,
  isExpanded: initialExpanded = false 
}: ThinkingPanelProps) {
  const [isOpen, setIsOpen] = useState(initialExpanded);
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-expand when thinking starts, auto-collapse after a delay when done
  useEffect(() => {
    if (isThinking) {
      setIsOpen(true);
    } else if (!isThinking && isOpen) {
      // Keep open for 1 second after thinking completes
      const timeout = setTimeout(() => {
        // Don't auto-collapse if user might be reading
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isThinking]);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (isThinking && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, isThinking]);

  if (!content && !isThinking) return null;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 overflow-hidden">
      {/* Header / Ticker */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 w-full p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        {/* Expand/Collapse Icon */}
        <div className="text-gray-500">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isThinking ? (
            <>
              <div className="relative flex items-center justify-center w-5 h-5">
                <Brain size={14} className="text-orange-500" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                {status || 'Thinking...'}
              </span>
            </>
          ) : (
            <>
              <Brain size={14} className="text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Thought for {duration}s
              </span>
            </>
          )}
        </div>

        {/* Duration Badge */}
        {!isThinking && (
          <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
            {duration}s
          </span>
        )}
      </button>

      {/* Expandable Content */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96' : 'max-h-0'
        }`}
      >
        <div 
          ref={contentRef}
          className="p-4 pt-0 max-h-80 overflow-y-auto border-t border-gray-200 dark:border-gray-700"
        >
          <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
            {content}
            {isThinking && (
              <span className="inline-block w-2 h-4 bg-orange-500 animate-pulse ml-0.5" />
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

### Message Component with Thinking

```tsx
// components/ChatMessage.tsx
import { ThinkingPanel } from './ThinkingPanel';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  thinking?: {
    content: string;
    duration: number;
  };
  isStreaming?: boolean;
  thinkingState?: {
    isThinking: boolean;
    content: string;
    status: string | null;
    duration: number;
  };
}

export function ChatMessage({ 
  role, 
  content, 
  thinking, 
  isStreaming,
  thinkingState 
}: ChatMessageProps) {
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex gap-4 ${isAssistant ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isAssistant ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
      }`}>
        {isAssistant ? 'AI' : 'U'}
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-3xl ${isAssistant ? '' : 'text-right'}`}>
        {/* Show thinking panel for assistant messages */}
        {isAssistant && (thinkingState || thinking) && (
          <ThinkingPanel
            content={thinkingState?.content || thinking?.content || ''}
            status={thinkingState?.status || null}
            duration={thinkingState?.duration || thinking?.duration || 0}
            isThinking={thinkingState?.isThinking || false}
          />
        )}

        {/* Message content */}
        <div className={`rounded-2xl px-4 py-3 ${
          isAssistant 
            ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700' 
            : 'bg-blue-500 text-white'
        }`}>
          {isAssistant ? (
            <ReactMarkdown className="prose dark:prose-invert prose-sm max-w-none">
              {content}
            </ReactMarkdown>
          ) : (
            <p>{content}</p>
          )}
          
          {/* Streaming cursor */}
          {isStreaming && (
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
          )}
        </div>
      </div>
    </div>
  );
}
```

### Complete Chat Interface

```tsx
// components/Chat.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useGLMChat } from '@/hooks/useGLMChat';
import { ChatMessage } from './ChatMessage';
import { Send, Square } from 'lucide-react';

export function Chat() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    messages, 
    thinking, 
    isStreaming, 
    currentResponse, 
    sendMessage, 
    stopGeneration 
  } = useGLMChat();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentResponse, thinking.content]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            role={msg.role}
            content={msg.content}
            thinking={msg.thinking}
          />
        ))}

        {/* Streaming message */}
        {isStreaming && (
          <ChatMessage
            role="assistant"
            content={currentResponse}
            isStreaming={true}
            thinkingState={thinking}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message GLM-4.6..."
            disabled={isStreaming}
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          
          {isStreaming ? (
            <button
              type="button"
              onClick={stopGeneration}
              className="px-4 py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              <Square size={20} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={20} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
```

---

## Data Protocol Reference

### SSE Event Types

Your frontend should handle these event types:

```typescript
type StreamEvent =
  | { type: 'thinking_start' }
  | { type: 'thinking_delta'; content: string; status?: string }
  | { type: 'thinking_end' }
  | { type: 'thinking_complete'; duration: number; thinking: string }
  | { type: 'text_delta'; content: string }
  | { type: 'tool_call'; index: number; name?: string; arguments?: string }
  | { type: 'error'; message: string };
```

### Raw GLM 4.6 Stream Format

If you're parsing the raw GLM stream without transformation:

```
data: {"id":"...","choices":[{"index":0,"delta":{"reasoning_content":"Let me think..."}}]}

data: {"id":"...","choices":[{"index":0,"delta":{"content":"Here's my response"}}]}

data: [DONE]
```

---

## Deployment

### Deploy Edge Function

```bash
# Set your API key
supabase secrets set ZAI_API_KEY=your_key_here

# Deploy the function
supabase functions deploy chat-stream
```

### Environment Variables

Add to your Next.js `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## UX Best Practices

1. **Progressive disclosure**: Keep thinking panel collapsed by default after completion, let users expand if curious

2. **Status ticker**: Extract meaningful phrases from reasoning content to show "Analyzing your code...", "Considering edge cases...", etc.

3. **Duration display**: Show elapsed time during thinking, final duration after completion

4. **Smooth animations**: Use CSS transitions for expand/collapse, avoid jarring state changes

5. **Auto-scroll**: Keep the latest content visible during streaming

6. **Abort capability**: Always provide a way to stop generation mid-stream

7. **Error handling**: Show graceful errors if the stream fails, with retry options

---

## Open Source References

- **LobeChat** (github.com/lobehub/lobe-chat) - Full AI workspace with thinking visualization
- **Thinking-Claude** (browser extension) - Chrome extension for readable thinking displays
- **Vercel AI SDK** - Can be adapted for GLM 4.6 with custom provider

---

## Key Differences: GLM 4.6 vs Claude Extended Thinking

| Feature | GLM 4.6 | Claude |
|---------|---------|--------|
| Enable thinking | `thinking: { type: "enabled" }` | `thinking: { type: "enabled", budget_tokens: N }` |
| Thinking field | `delta.reasoning_content` | Separate `thinking` content block |
| Tool streaming | Native `tool_stream=True` | Not directly exposed |
| Default state | Thinking ON by default | Must explicitly enable |
| Context window | 200K tokens | Model-dependent |
| Max output | 128K tokens | Model-dependent |

This architecture gives you a production-ready reasoning UI that matches Claude.ai's UX while working with GLM 4.6's native capabilities.
