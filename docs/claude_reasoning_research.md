# Implementing Claude-style Reasoning UI for LLM Chat Applications

Claude's distinctive "thinking" interface has become a benchmark for AI transparency, showing users the model's reasoning process before delivering a response. This guide provides a complete implementation blueprint for React/Next.js frontends with FastAPI backends, covering the streaming architecture, API integration, and UI component patterns you'll need.

## How Anthropic's extended thinking API actually works

Anthropic's Extended Thinking feature enables Claude to show its step-by-step reasoning through a dedicated API parameter. Available in **Claude 3.7 Sonnet, Claude 4, and Claude 4.5 models**, it returns a separate "thinking" content block alongside the final response.

To enable thinking, add a `thinking` object to your API request:

```json
{
  "model": "claude-sonnet-4-5-20250929",
  "max_tokens": 16000,
  "thinking": {
    "type": "enabled",
    "budget_tokens": 10000
  },
  "messages": [{"role": "user", "content": "Your prompt"}]
}
```

The **budget_tokens** parameter (minimum 1,024) sets the maximum tokens Claude can use for internal reasoning. The API response contains multiple content blocks with distinct types:

| Block Type | Purpose |
|------------|---------|
| `thinking` | Claude's reasoning process with signature for verification |
| `text` | The final response content |
| `redacted_thinking` | Safety-flagged thinking (Claude 3.7 only) |

Critical constraints to know: extended thinking is **incompatible with temperature and top_k settings**, requires `top_p` between 0.95-1.0 only, and streaming becomes mandatory when `max_tokens` exceeds 21,333.

## Streaming architecture separates thinking from response

The streaming format uses Server-Sent Events with typed delta events that let you distinguish thinking content from the final response in real-time. The event flow follows this sequence:

1. `message_start` → Contains Message object with empty content
2. `content_block_start` → Marks start of thinking block (type: "thinking")
3. Multiple `content_block_delta` events with `thinking_delta` type
4. `signature_delta` → Verification signature before block ends
5. `content_block_stop` → End of thinking block
6. `content_block_start` → New text block begins (type: "text")
7. `content_block_delta` events with `text_delta` type
8. `message_stop` → Stream complete

Each delta event includes a `type` field—`thinking_delta` or `text_delta`—enabling your frontend to route content to the appropriate UI component. Note that thinking content may arrive in "chunky" patterns with possible delays between events, while text often streams more smoothly.

## FastAPI backend with SSE streaming

The recommended approach uses `sse-starlette`'s EventSourceResponse for cleaner connection handling than native StreamingResponse. Here's a production-ready implementation:

```python
from fastapi import FastAPI, Request
from sse_starlette.sse import EventSourceResponse
from anthropic import AsyncAnthropic
import json

app = FastAPI()
client = AsyncAnthropic()

@app.post("/api/stream-chat")
async def stream_chat(request: Request):
    body = await request.json()
    
    async def event_generator():
        stream = await client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=16000,
            stream=True,
            thinking={"type": "enabled", "budget_tokens": 10000},
            messages=body["messages"]
        )
        
        current_block_type = None
        
        async for event in stream:
            if await request.is_disconnected():
                return
            
            match event.type:
                case "content_block_start":
                    current_block_type = event.content_block.type
                    yield {
                        "event": f"{current_block_type}_start",
                        "data": json.dumps({"index": event.index})
                    }
                
                case "content_block_delta":
                    if hasattr(event.delta, "thinking"):
                        yield {
                            "event": "thinking_delta",
                            "data": json.dumps({"content": event.delta.thinking})
                        }
                    elif hasattr(event.delta, "text"):
                        yield {
                            "event": "text_delta",
                            "data": json.dumps({"content": event.delta.text})
                        }
                
                case "content_block_stop":
                    yield {
                        "event": f"{current_block_type}_end",
                        "data": json.dumps({"index": event.index})
                    }
                
                case "message_stop":
                    yield {"event": "done", "data": "[DONE]"}
    
    return EventSourceResponse(event_generator(), ping=30)
```

The `ping=30` parameter sends heartbeat pings every 30 seconds to keep connections alive through proxies. Always check `request.is_disconnected()` throughout the stream to cleanly handle client disconnections.

**SSE vs WebSocket:** For LLM chat applications, SSE is the better choice. Token streaming is inherently one-directional (server→client), SSE works through standard HTTP infrastructure, and browsers provide automatic reconnection via EventSource. Use WebSocket only when you need bidirectional features like typing indicators.

## React frontend with Vercel AI SDK

The Vercel AI SDK (v4.2+) provides native support for Claude's reasoning streams with the `@ai-sdk/anthropic` provider. The key is enabling `sendReasoning: true` on the backend response:

```typescript
// app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    messages: convertToModelMessages(messages),
    providerOptions: {
      anthropic: {
        thinking: { type: 'enabled', budgetTokens: 12000 },
      },
    },
  });

  return result.toUIMessageStreamResponse({ sendReasoning: true });
}
```

On the client, the `useChat` hook exposes messages with a `parts` array that separates reasoning from text content:

```typescript
'use client';
import { useChat } from '@ai-sdk/react';

export default function Chat() {
  const { messages, sendMessage, status } = useChat();

  return (
    <div>
      {messages.map(message => (
        <div key={message.id}>
          {message.parts.map((part, i) => {
            if (part.type === 'reasoning') {
              return <ThinkingPanel key={i} content={part.text} isStreaming={status === 'streaming'} />;
            }
            if (part.type === 'text') {
              return <div key={i}>{part.text}</div>;
            }
          })}
        </div>
      ))}
    </div>
  );
}
```

The `status` property cycles through `'submitted'` → `'streaming'` → `'ready'`, letting you show "Thinking..." indicators during the initial phase before reasoning content starts arriving.

## Building the expandable reasoning panel

The collapsible thinking panel is the signature UX element. Key behaviors include auto-expanding during streaming, displaying duration ("Thought for 8s"), and collapsing gracefully when complete:

```typescript
import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ThinkingPanelProps {
  content: string;
  isStreaming: boolean;
}

export function ThinkingPanel({ content, isStreaming }: ThinkingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
      const interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isStreaming, startTime]);

  if (!content) return null;

  return (
    <div className="border rounded-lg mb-4 bg-gray-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-3 w-full"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="font-medium text-gray-700">
          {isStreaming ? 'Thinking...' : `Thought for ${duration}s`}
        </span>
        {isStreaming && <span className="animate-pulse ml-2">●</span>}
      </button>
      
      {isOpen && (
        <div className="p-3 pt-0 border-t text-sm text-gray-600 whitespace-pre-wrap">
          {content}
        </div>
      )}
    </div>
  );
}
```

For smoother streaming updates, the AI SDK supports throttling via `experimental_throttle: 50` in useChat options, which batches rapid updates into 50ms intervals.

## Implementing the thinking ticker with status updates

The "thinking ticker" shows brief contextual status updates ("Analyzing the problem...", "Considering alternatives...") rather than streaming the full reasoning text. This requires either parsing the thinking content for key phrases or using a separate status emission system.

**Backend status emission pattern:**

```python
async def emit_status(event_emitter, message: str, done: bool):
    yield {
        "event": "status",
        "data": json.dumps({"description": message, "done": done})
    }
```

**Frontend status display:**

```typescript
const statusMessages = [
  'Analyzing the question...',
  'Considering multiple approaches...',
  'Formulating response...'
];

function ThinkingTicker({ currentPhase }: { currentPhase: number }) {
  return (
    <div className="flex items-center gap-2 text-gray-500">
      <div className="animate-pulse">●</div>
      <span className="text-sm italic">{statusMessages[currentPhase]}</span>
    </div>
  );
}
```

The Stream Chat SDK provides an `AIStateIndicator` component with built-in shimmering animations that supports states like `AI_STATE_THINKING` and `AI_STATE_GENERATING`.

## Open-source implementations worth studying

Several production-quality implementations demonstrate these patterns:

- **Vercel AI Elements** (`npx ai-elements add reasoning`) – Official React components with Radix UI-based collapsibles, auto-open/close behavior, and duration tracking
- **assistant-ui** (7.6k GitHub stars) – YC-backed composable primitives for AI chat, supports reasoning blocks with shadcn/ui styling
- **Thinking-Claude** (16.6k stars) – Chrome extension making Claude's thinking readable with collapsible sections and copy buttons
- **lobe-chat** – Full AI workspace with Chain of Thought visualization that breaks reasoning into logical steps

For simpler needs, the native HTML `<details>/<summary>` pattern works without JavaScript:

```html
<details>
  <summary>💭 Thought for 8 seconds</summary>
  <pre>Let me analyze this step by step...</pre>
</details>
```

## Data format design for your protocol

Structure your SSE events with explicit type discrimination to cleanly separate thinking, response, and status updates:

```typescript
type StreamEvent = 
  | { event: 'thinking_start'; data: { index: number } }
  | { event: 'thinking_delta'; data: { content: string } }
  | { event: 'thinking_end'; data: { index: number } }
  | { event: 'text_start'; data: { index: number } }
  | { event: 'text_delta'; data: { content: string } }
  | { event: 'text_end'; data: { index: number } }
  | { event: 'status'; data: { description: string; done: boolean } }
  | { event: 'done'; data: '[DONE]' };
```

This mirrors Anthropic's streaming format while adding flexibility for custom status messages. On the frontend, maintain separate state accumulators for thinking content and response text, updating each based on the event type.

## UX best practices that build user trust

**Progressive disclosure** reduces cognitive load while maintaining transparency—collapse reasoning by default but let users expand it. The **duration display** ("Thought for 12 seconds") signals deliberate consideration and builds confidence that complex questions receive proportional attention.

**Animation guidelines:** Use CSS transform-based animations (opacity, transform) for smoothness. A subtle pulse during streaming that stops when complete works better than aggressive spinners. Add a 1-second delay before auto-collapsing to avoid jarring transitions. Throttle rapid text updates for smoother rendering.

**Accessibility requirements:** Ensure keyboard navigation support for the collapsible panels, screen reader compatibility via proper ARIA attributes, respect for `prefers-reduced-motion`, and clear focus states on interactive elements.

For mobile, test collapsible panels at actual device sizes—the reasoning content needs adequate padding and readable font sizes even when fully expanded.

## Conclusion

Building Claude-style reasoning UI requires coordinating three layers: Anthropic's extended thinking API with its typed content blocks, an SSE streaming backend that preserves type information, and React components that intelligently render thinking content in expandable panels. The Vercel AI SDK handles much of this complexity through its `sendReasoning` option and `parts` array structure, while FastAPI's EventSourceResponse provides the cleanest SSE implementation for Python backends. Focus your custom work on the thinking panel UX—the auto-expand behavior, duration tracking, and smooth collapse transitions that make Claude's interface distinctive.