# GLM-4.6 Capabilities Reference

> **Last Updated**: 2025-12-01
> **Source**: [Z.ai Documentation](https://docs.z.ai)
> **API Base URL**: `https://api.z.ai/api/coding/paas/v4` (Coding Plan - used by this project)

This document serves as the authoritative reference for GLM-4.6 capabilities used in the Vana project. GLM-4.6 is Z.ai's frontier reasoning model, used for artifact generation and complex code tasks.

---

## Table of Contents

1. [Deep Thinking (Reasoning Mode)](#1-deep-thinking-reasoning-mode)
2. [Streaming Messages](#2-streaming-messages)
3. [Tool Streaming Output](#3-tool-streaming-output)
4. [Function Calling](#4-function-calling)
5. [Context Caching](#5-context-caching)
6. [Structured Output (JSON Mode)](#6-structured-output-json-mode)
7. [Project Implementation](#7-project-implementation)
8. [Quick Reference](#8-quick-reference)

---revie

## 1. Deep Thinking (Reasoning Mode)

Deep Thinking enables Chain of Thought (CoT) mechanisms, allowing the model to perform deep analysis before answering. This improves accuracy for complex tasks requiring multi-step reasoning.

### Supported Models

- GLM-4.6 (primary)
- GLM-4.5
- GLM-4.5V (vision variant)

### API Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `thinking.type` | string | `"enabled"` / `"disabled"` | Controls deep thinking mode |
| `temperature` | number | `1.0` (recommended) | GLM recommends 1.0 for best results |
| `max_tokens` | number | Up to 8000+ | Token limit for response |

### Request Format

```json
{
  "model": "glm-4.6",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant" },
    { "role": "user", "content": "Analyze this complex problem..." }
  ],
  "thinking": { "type": "enabled" },
  "max_tokens": 8000,
  "temperature": 1.0
}
```

### Response Format

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "The final answer based on my analysis...",
      "reasoning_content": "Let me think through this step by step...\n1. First consideration...\n2. Analyzing the implications...\n3. Conclusion..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 500,
    "total_tokens": 650
  }
}
```

### Response Fields

| Field | Description |
|-------|-------------|
| `content` | The final response/answer |
| `reasoning_content` | The model's thinking process (CoT) |
| `finish_reason` | `"stop"` (complete), `"length"` (truncated) |

### Best Use Cases

- Complex problem analysis
- Technical architecture design
- Academic research and data analysis
- Strategy planning and business decisions
- Creative content development
- **Artifact generation** (primary use in Vana)

### Important Notes

- Increases response time for complex queries (thinking takes time)
- Consumes additional tokens for reasoning process
- Can be disabled for simple queries (facts, basic translation)
- Model decides when deep thinking benefits the response

---

## 2. Streaming Messages

Streaming enables real-time content retrieval using Server-Sent Events (SSE), eliminating wait times for complete generation.

### API Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stream` | boolean | Yes | Set to `true` to enable streaming |

### Request Format

```bash
curl --location 'https://api.z.ai/api/paas/v4/chat/completions' \
  --header 'Authorization: Bearer YOUR_API_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "Write a poem about spring"}],
    "stream": true,
    "thinking": {"type": "enabled"}
  }'
```

### SSE Response Format

Each chunk follows the SSE `data:` prefix format:

```
data: {"choices":[{"delta":{"reasoning_content":"First, let me"},"finish_reason":null}]}
data: {"choices":[{"delta":{"reasoning_content":" consider..."},"finish_reason":null}]}
data: {"choices":[{"delta":{"content":"Spring"},"finish_reason":null}]}
data: {"choices":[{"delta":{"content":" arrives with..."},"finish_reason":null}]}
data: {"finish_reason":"stop","usage":{"prompt_tokens":8,"completion_tokens":262}}
data: [DONE]
```

### Delta Fields

| Field | Description |
|-------|-------------|
| `delta.reasoning_content` | Incremental reasoning/thinking chunks (streamed FIRST) |
| `delta.content` | Incremental response content (streamed AFTER reasoning) |
| `finish_reason` | `null` during streaming, `"stop"` or `"length"` on completion |
| `usage` | Token statistics (only in final chunk) |

### Stream Order

**Critical**: GLM streams `reasoning_content` FIRST, then `content`:

```
1. [reasoning_content chunks] → "Let me think through this..."
2. [content chunks] → "Here's my answer..."
3. [DONE marker]
```

### Key Benefits

- **Real-time feedback**: Content displays progressively
- **Reduced perceived latency**: Users see output immediately
- **User engagement**: Immediate response visibility
- **Reasoning transparency**: Show thinking process while artifact generates

---

## 3. Tool Streaming Output

A **GLM-4.6 exclusive** capability that enables real-time access to reasoning, response content, AND tool call information during streaming.

### API Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `stream` | boolean | Yes | Activates streaming output |
| `tool_stream` | boolean | Yes | Enables tool call streaming |
| `model` | string | Yes | **Must be `glm-4.6`** (only supported model) |

### Request Format

```json
{
  "model": "glm-4.6",
  "messages": [{"role": "user", "content": "What's the weather in Beijing?"}],
  "tools": [/* tool definitions */],
  "stream": true,
  "tool_stream": true
}
```

### Streaming Response Structure

The `delta` object contains:

| Field | Description |
|-------|-------------|
| `reasoning_content` | The model's thinking process |
| `content` | The model's response text |
| `tool_calls` | Function names and parameters for invoked tools |

### Tool Call Accumulation Pattern

Tool calls are streamed incrementally and must be accumulated:

```javascript
// Accumulate tool call arguments across chunks
let toolCalls = {};

for await (const chunk of stream) {
  const delta = chunk.choices[0].delta;

  if (delta.tool_calls) {
    for (const tc of delta.tool_calls) {
      const idx = tc.index;
      if (!toolCalls[idx]) {
        toolCalls[idx] = {
          id: tc.id,
          function: { name: tc.function.name, arguments: '' }
        };
      }
      if (tc.function.arguments) {
        toolCalls[idx].function.arguments += tc.function.arguments;
      }
    }
  }
}
```

### Key Advantage

Stream tool usage parameters without buffering or JSON validation, reducing latency and improving user experience for agentic workflows.

---

## 4. Function Calling

Function calling enables GLM to invoke external functions/APIs, expanding intelligent agent capabilities.

### API Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `tools` | array | List of callable function definitions |
| `tool_choice` | string | `"auto"` (only supported mode) |

### Tool Definition Format

```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get the current weather for a location",
    "parameters": {
      "type": "object",
      "properties": {
        "location": {
          "type": "string",
          "description": "City name, e.g., 'Beijing'",
          "examples": ["Beijing", "Shanghai"]
        },
        "unit": {
          "type": "string",
          "enum": ["celsius", "fahrenheit"],
          "description": "Temperature unit"
        }
      },
      "required": ["location"]
    }
  }
}
```

### Request Format

```json
{
  "model": "glm-4.6",
  "messages": [
    {"role": "user", "content": "What's the weather in Beijing?"}
  ],
  "tools": [/* tool definitions */],
  "tool_choice": "auto"
}
```

### Response Format (Tool Invocation)

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "get_weather",
          "arguments": "{\"location\": \"Beijing\", \"unit\": \"celsius\"}"
        }
      }]
    },
    "finish_reason": "tool_calls"
  }]
}
```

### Implementation Workflow

```
1. Define tools → Include in request
2. Model decides → Returns tool_calls (if needed)
3. Execute locally → Call your actual function
4. Return results → Add tool result message
5. Model responds → Generates final answer
```

### Tool Result Message Format

```json
{
  "role": "tool",
  "tool_call_id": "call_abc123",
  "content": "{\"temperature\": 22, \"conditions\": \"sunny\"}"
}
```

### Best Practices

- Design functions with single, clear responsibilities
- Use meaningful, descriptive names
- Validate all input parameters rigorously
- Implement comprehensive error handling
- Control access through permission validation
- Log function invocations for debugging

---

## 5. Context Caching

Context caching reduces token consumption and latency by automatically reusing repeated context content.

### How It Works

- **Automatic Recognition**: System identifies identical/similar content across requests
- **No Manual Setup**: Caching triggers automatically based on content similarity
- **Transparent Billing**: Response includes `cached_tokens` count

### Supported Models

- GLM-4.6
- GLM-4.5 series
- Other mainstream models

### Response Format

```json
{
  "usage": {
    "prompt_tokens": 1200,
    "completion_tokens": 300,
    "total_tokens": 1500,
    "prompt_tokens_details": {
      "cached_tokens": 800
    }
  }
}
```

### Billing Structure

| Token Type | Price |
|------------|-------|
| New content tokens | Standard pricing |
| Cache hit tokens | ~50% of standard |
| Output tokens | Standard pricing |

### Cost Savings Example

With standard rate of $0.01/1K tokens:
- 1,200 cached tokens + 800 new tokens
- Saves ~24% vs processing all 2,000 as new

### Ideal Use Cases

- **System prompt reuse**: Multi-turn conversations with constant system prompts
- **Repetitive tasks**: Similar content with consistent instructions
- **Multi-turn conversations**: Dialogues with substantial history
- **Batch operations**: Code review across multiple documents
- **Template applications**: Report generation, standardized workflows

### Best Practices

1. Use stable, consistent system prompts
2. Maintain identical formatting for better cache hits
3. Reuse document content and conversation history
4. Minor formatting differences reduce effectiveness
5. Cache has time limits and will recalculate after expiration

---

## 6. Structured Output (JSON Mode)

Structured output ensures the model returns JSON data conforming to predefined formats.

### API Parameters

| Parameter | Type | Value |
|-----------|------|-------|
| `response_format` | object | `{"type": "json_object"}` |

### Supported Models

- GLM-4.6
- GLM-4.5
- GLM-4-plus

### Request Format

```python
response = client.chat.completions.create(
    model="glm-4.6",
    messages=[
        {
            "role": "system",
            "content": "Extract contact info as JSON with fields: name, email, phone"
        },
        {
            "role": "user",
            "content": "John Smith, john@example.com, 555-1234"
        }
    ],
    response_format={"type": "json_object"}
)
```

### Response Handling

```python
import json
result = json.loads(response.choices[0].message.content)
# result = {"name": "John Smith", "email": "john@example.com", "phone": "555-1234"}
```

### Key Capabilities

- **Schema validation**: Complex data structures with requirements
- **Field control**: Specify required fields, types, nested objects
- **Flexible structures**: Arrays, objects, `additionalProperties`

### Use Cases

- Contact/product information extraction
- Search result formatting
- Analytics data structuring
- Configuration file parsing and validation
- API response normalization

### Best Practices

1. Start with simple schemas, incrementally increase complexity
2. Implement multi-layer validation (schema + business logic)
3. Include detailed field descriptions and examples in prompts
4. Prepare simplified backup schemas for fallback
5. Balance functionality with response naturalness

### Important Note

JSON mode may affect response naturalness in complex scenarios. The model strictly follows the format, which can sometimes feel rigid. Design schemas carefully for optimal balance.

---

## 7. Project Implementation

### Current Usage in Vana

GLM-4.6 is used for artifact generation via the `generate-artifact/` Edge Function:

```typescript
// supabase/functions/_shared/glm-client.ts
import { MODELS } from './config.ts';

const response = await callGLM(systemPrompt, userPrompt, {
  temperature: 1.0,
  max_tokens: 8000,
  enableThinking: true,  // Enable reasoning by default
  stream: true           // Enable SSE streaming
});
```

### Key Files

| File | Purpose |
|------|---------|
| `_shared/glm-client.ts` | GLM API client with streaming, retry, and error handling |
| `_shared/glm-reasoning-parser.ts` | Converts raw reasoning to structured format for UI |
| `_shared/config.ts` | Model configuration (`MODELS.GLM_4_6`) |
| `generate-artifact/index.ts` | Artifact generation Edge Function with SSE streaming |
| `generate-artifact-fix/index.ts` | Error fixing with deep reasoning |
| `src/components/ReasoningDisplay.tsx` | Claude-style ticker pill UI for reasoning display |
| `src/hooks/useChatMessages.tsx` | SSE event handlers for streaming |

### SSE Streaming Implementation (Updated 2025-12-01)

The artifact generation system uses real-time SSE streaming to display GLM's native thinking process:

```typescript
// Backend: generate-artifact/index.ts emits structured SSE events
// Event types: reasoning_chunk, reasoning_complete, content_chunk, artifact_complete, error

// Frontend: useChatMessages.tsx handles SSE events
eventSource.addEventListener('reasoning_chunk', (event) => {
  // Update UI with live reasoning text
  setStreamingReasoningText(prev => prev + event.data);
});

eventSource.addEventListener('content_chunk', (event) => {
  // Artifact code streams separately (not shown in chat during generation)
  accumulatedContent.current += event.data;
});
```

### Stream Processing Flow

```
1. User requests artifact → POST /generate-artifact?stream=true
2. Backend streams GLM reasoning_content chunks → reasoning_chunk events
3. UI displays Claude-style ticker pill with live status updates
4. Backend streams GLM content chunks → content_chunk events
5. UI renders final artifact when artifact_complete received
```

### Reasoning Display

The `ReasoningDisplay` component provides a Claude-style experience:

```typescript
// ReasoningDisplay.tsx features:
// - Live ticker pill showing "Thinking..." → "Analyzing..." → status updates
// - Timer showing elapsed reasoning time
// - Expandable "Thought process" view with full reasoning steps
// - Stop button to cancel generation
// - Smooth crossfade animations between status updates

<ReasoningDisplay
  streamingReasoningText={reasoningText}  // Live streaming text
  isStreaming={true}
  onStop={handleCancel}
/>
```

### Incremental Reasoning Parser

The `glm-reasoning-parser.ts` converts GLM's raw `reasoning_content` into structured UI incrementally:

```typescript
// Parse reasoning as it streams in
const structured = parseGLMReasoningToStructured(reasoningContent);
// Returns: { steps: [...], summary: "..." }

// Incremental parsing state for progressive display
interface IncrementalParseState {
  completedSteps: ReasoningStep[];
  currentStepBuffer: string;
  lastProcessedIndex: number;
}
```

---

## 8. Quick Reference

### API Endpoint

| Endpoint | Purpose |
|----------|---------|
| `https://api.z.ai/api/coding/paas/v4/chat/completions` | Coding Plan API (used by this project) |

> **Note**: This project uses the Coding Plan API exclusively. The standard API (`/api/paas/v4`) is NOT used.

### Common Request Template

```json
{
  "model": "glm-4.6",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."}
  ],
  "temperature": 1.0,
  "max_tokens": 8000,
  "stream": true,
  "thinking": {"type": "enabled"}
}
```

### Header Requirements

```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 429 | Rate limited | Retry with exponential backoff, check Retry-After header |
| 503 | Service overloaded | Retry after delay |
| 401 | Authentication failed | Check API key |
| 400 | Bad request | Validate request format |

### Model Comparison (GLM Family)

| Model | Strengths | Use Case |
|-------|-----------|----------|
| GLM-4.6 | Advanced reasoning, tool streaming | Artifacts, complex code |
| GLM-4.5 | Balanced performance | General tasks |
| GLM-4.5V | Vision capabilities | Image understanding |

---

## Resources

- [Z.ai Documentation](https://docs.z.ai)
- [Deep Thinking Guide](https://docs.z.ai/guides/capabilities/thinking)
- [Streaming Guide](https://docs.z.ai/guides/capabilities/streaming)
- [Tool Streaming Guide](https://docs.z.ai/guides/capabilities/stream-tool)
- [Function Calling Guide](https://docs.z.ai/guides/capabilities/function-calling)
- [Context Caching Guide](https://docs.z.ai/guides/capabilities/cache)
- [Structured Output Guide](https://docs.z.ai/guides/capabilities/struct-output)
