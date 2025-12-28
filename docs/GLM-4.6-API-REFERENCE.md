# GLM-4.6 API Reference

**Last Updated**: 2025-12-20
**Documentation Source**: Z.ai Official Docs + Implementation from `supabase/functions/_shared/glm-client.ts`
**API Provider**: Z.ai (https://z.ai)
**Canonical Model Name**: `glm-4.6` (via `MODELS.GLM_4_6` from config.ts)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Models](#models)
5. [Chat Completions API](#chat-completions-api)
6. [Tool Calling (Function Calling)](#tool-calling-function-calling)
7. [Thinking Mode (Reasoning)](#thinking-mode-reasoning)
8. [Streaming](#streaming)
9. [Error Codes & Troubleshooting](#error-codes--troubleshooting)
10. [Rate Limits](#rate-limits)
11. [Best Practices](#best-practices)
12. [Cost & Pricing](#cost--pricing)

---

## Quick Start

### Installation

```bash
# Z.ai SDK
pip install zai-sdk

# Or use via HTTP API
curl -X POST https://api.z.ai/api/paas/v4/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "glm-4.6",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Setup API Key

1. Register at [Z.ai Open Platform](https://z.ai)
2. Access billing page and add credits
3. Create API key in API Keys management interface
4. Set environment variable: `GLM_API_KEY=your-key`

---

## Authentication

### Bearer Token Format

All requests require the `Authorization` header:

```http
Authorization: Bearer YOUR_API_KEY
```

### Example Request

```javascript
const response = await fetch('https://api.z.ai/api/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GLM_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'glm-4.6',
    messages: [...]
  })
});
```

---

## API Endpoints

### Base URLs

| Use Case | Endpoint |
|----------|----------|
| General API | `https://api.z.ai/api/paas/v4/` |
| Coding Plan (GLM-4.6) | `https://api.z.ai/api/coding/paas/v4/` |

**Important**: The Coding Plan endpoint is required for GLM-4.6. Regular endpoint may have different rate limits.

### Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/chat/completions` | POST | Main chat completion endpoint |
| `/tokenizer` | POST | Count tokens in text |
| `/search` | POST | Web search integration |
| `/images/generations` | POST | Image generation (CogView-4) |

---

## Models

### Available Language Models

| Model | Description | Context | Use Case |
|-------|-------------|---------|----------|
| `glm-4.6` | Latest flagship model | 128K tokens | Artifact generation, artifact fixing, complex reasoning |
| `glm-4.6v` | Multimodal (vision) | 128K tokens | Image understanding, visual analysis |
| `glm-4.5` | Stable previous version | 128K tokens | General use, may be cheaper |
| `glm-4-32b-0414-128k` | Smaller variant | 128K tokens | Budget-friendly option |

### GLM-4.6 Characteristics

- **Architecture**: Purpose-built for agent-oriented applications
- **Capabilities**: Reasoning, code generation, artifact fixing, tool calling, vision understanding
- **Context Window**: 128K tokens
- **Thinking Mode**: Supported (enabled by default in this codebase)
- **Tool Calling**: Native OpenAI-compatible function calling
- **Streaming**: Full SSE streaming support with reasoning_content

---

## Chat Completions API

### Endpoint

```
POST https://api.z.ai/api/coding/paas/v4/chat/completions
```

### Request Format

```typescript
interface ChatCompletionRequest {
  model: string;                    // "glm-4.6" (required)
  messages: Message[];              // (required)
  temperature?: number;             // 0.0 to 2.0 (default: 1.0)
  max_tokens?: number;             // (default: 4096, max: 8192)
  top_p?: number;                  // 0.0 to 1.0 (default: varies)
  top_k?: number;                  // Integer (default: varies)
  stream?: boolean;                // For SSE streaming (default: false)

  // Thinking mode configuration
  thinking?: {
    type: "enabled" | "disabled";   // (default: "enabled" for GLM-4.6)
  };

  // Function calling
  tools?: Tool[];                   // Tool definitions
  tool_choice?: "auto" | "required" | { type: "function"; function: { name: string } };
}
```

### Message Format

```typescript
interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content?: string;                    // May be null for assistant with tool_calls

  // For assistant messages with function calls
  tool_calls?: ToolCall[];            // (native OpenAI format)

  // For tool result messages
  tool_call_id?: string;              // ID of the tool call being answered
  name?: string;                      // (optional) Tool name
}

interface ToolCall {
  id: string;
  type: "function";                   // REQUIRED - error 1214 without this
  function: {
    name: string;
    arguments: string;                // JSON string
  };
}
```

### Response Format

```typescript
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;

  choices: [{
    index: number;
    message: {
      role: string;
      content: string | null;         // null when using tools

      // Thinking mode response
      reasoning_content?: string;     // The thinking process text

      // Function calling response
      tool_calls?: ToolCall[];        // Array of function calls
    };
    finish_reason: "stop" | "tool_calls" | "length" | null;
  }];

  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### Example: Simple Chat

```javascript
const response = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GLM_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'glm-4.6',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.'
      },
      {
        role: 'user',
        content: 'Explain quantum computing.'
      }
    ],
    temperature: 1.0,
    max_tokens: 2000,
    thinking: { type: 'enabled' }
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);
```

### Key Parameters

#### temperature
- **Range**: 0.0 to 2.0
- **Default**: 1.0 (GLM recommends 1.0 for general evaluations)
- **Effect**: Higher = more random, Lower = more deterministic
- **For Artifacts**: Use 1.0 for balanced creativity

#### max_tokens
- **Default**: 4096
- **Maximum**: 8192 (for GLM-4.6)
- **For Artifacts**: Typical range 2000-8000 depending on complexity

#### top_p (Nucleus Sampling)
- **Range**: 0.0 to 1.0
- **Default**: Model-dependent
- **Effect**: Controls diversity by cumulative probability threshold
- **Note**: Usually only set one of top_p or top_k

#### top_k
- **Type**: Integer
- **Effect**: Keep top K tokens by probability
- **Note**: Usually only set one of top_p or top_k

---

## Tool Calling (Function Calling)

### Overview

GLM-4.6 supports OpenAI-compatible native function calling, enabling the model to decide when and how to call tools.

### Tool Definition Format

```typescript
interface Tool {
  type: "function";
  function: {
    name: string;                     // Max 64 chars, alphanumeric + underscores/hyphens
    description: string;              // Describes when/how to use the tool
    parameters: {
      type: "object";
      properties: {
        [paramName: string]: {
          type: string;               // "string", "number", "boolean", "array", "object"
          description: string;        // Parameter description
          enum?: string[];           // Optional: allowed values
          default?: any;             // Optional: default value
          items?: any;               // For array types
        };
      };
      required: string[];            // Array of required parameter names
    };
  };
}
```

### Example Tool Definition

```javascript
const webSearchTool = {
  type: "function",
  function: {
    name: "browser.search",
    description: "Search the web for current information. Use for: recent news, real-time data (weather, stocks, sports), current prices, latest versions.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optimized search query with year for time-sensitive topics"
        }
      },
      required: ["query"]
    }
  }
};
```

### Request with Tools

```javascript
{
  model: "glm-4.6",
  messages: [
    { role: "user", content: "What's the current weather in SF?" }
  ],
  tools: [webSearchTool],
  tool_choice: "auto"  // "auto" | "required" | { type: "function", function: { name: "..." } }
}
```

### Tool Calling Response (Step 1)

When GLM detects it needs to call a tool:

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": null,
      "tool_calls": [
        {
          "id": "call_abc123",
          "type": "function",
          "function": {
            "name": "browser.search",
            "arguments": "{\"query\":\"SF weather today\"}"
          }
        }
      ]
    },
    "finish_reason": "tool_calls"
  }]
}
```

### Tool Result Message (Step 2)

After executing the tool, inject the result:

```javascript
{
  role: "tool",
  tool_call_id: "call_abc123",      // Must match the tool call id
  content: "San Francisco weather: 72°F, partly cloudy..."
}
```

### Continuation Request (Step 3)

**CRITICAL BUG FIX (2025-12-20)**: When continuing after a tool call, GLM requires the complete message history including the assistant's tool_calls message.

```javascript
{
  model: "glm-4.6",
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "What's the current weather in SF?" },

    // REQUIRED: Assistant's original tool_calls message
    {
      role: "assistant",
      content: null,
      tool_calls: [
        {
          id: "call_abc123",
          type: "function",
          function: {
            name: "browser.search",
            arguments: "{\"query\":\"SF weather today\"}"
          }
        }
      ]
    },

    // Tool result
    {
      role: "tool",
      tool_call_id: "call_abc123",
      content: "San Francisco weather: 72°F, partly cloudy..."
    }
  ],
  tools: [webSearchTool]
  // GLM now responds with final answer
}
```

### tool_choice Options

| Option | Behavior |
|--------|----------|
| `"auto"` | GLM decides whether to call tools (recommended) |
| `"required"` | GLM MUST call a tool (always select from provided tools) |
| `{ type: "function", function: { name: "tool_name" } }` | Force specific tool |

### Common Errors

#### Error 1214: "Tool type cannot be empty"

**Cause**: Missing `type: "function"` in tool_calls

**Fix**:
```javascript
// Wrong
tool_calls: [
  {
    id: "call_123",
    function: { name: "search", arguments: "{}" }
  }
]

// Correct
tool_calls: [
  {
    id: "call_123",
    type: "function",  // REQUIRED
    function: { name: "search", arguments: "{}" }
  }
]
```

#### Tool Call Not Recognized

**Cause**: Malformed tool definition or parameter mismatch

**Fix**:
- Verify tool name matches exactly (case-sensitive)
- Ensure arguments JSON is valid
- Check all required parameters are provided
- Parameters must be strings for JSON compatibility

---

## Thinking Mode (Reasoning)

### Overview

Thinking mode enables GLM-4.6 to perform deep analysis and multi-step reasoning before responding. The reasoning process is exposed in the response as `reasoning_content`.

### Enabling Thinking Mode

```javascript
{
  model: "glm-4.6",
  messages: [...],
  thinking: {
    type: "enabled"   // or "disabled"
  }
}
```

### Thinking Mode Response

When enabled, the response includes the reasoning process:

```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "The answer is X because...",
      "reasoning_content": "Let me analyze this step by step:\n1. First, I need to understand...\n2. Then I should consider...\n3. Finally, the conclusion is..."
    },
    "finish_reason": "stop"
  }]
}
```

### Status Marker System

> **⚠️ DEPRECATED**: As of December 2025, this codebase uses **ReasoningProvider** (GLM-4.5-Air) for semantic status updates instead of marker parsing. This section documents GLM-4.6's capability for reference only.

During thinking mode, GLM-4.6 *can* emit `[STATUS: action phrase]` markers to indicate progress:

```
[STATUS: analyzing requirements]
[STATUS: designing solution]
[STATUS: writing code]
[STATUS: verifying output]
```

**Note**: Our application uses ReasoningProvider to generate semantic status messages via LLM analysis rather than parsing these markers.

### Configuration in This Codebase

```typescript
// From glm-client.ts
enableThinking = true  // Default: enabled for artifact generation

const response = await callGLM(systemPrompt, userPrompt, {
  enableThinking: true,    // Turns on thinking mode
  stream: true,            // Stream reasoning in real-time
  requestId: '123'
});
```

### When to Use Thinking

**Best for**:
- Complex analysis and multi-step reasoning
- Technical design and architecture
- Academic research and problem-solving
- Code generation and artifact fixing
- Strategic planning

**Avoid for**:
- Simple queries and translations
- Basic classifications
- Time-sensitive responses (adds latency)
- Cost-sensitive applications

### Parsing Status Markers

> **⚠️ DEPRECATED**: The `parseStatusMarker()` function was removed in December 2025. Use **ReasoningProvider** for semantic status updates.

**Historical reference** (removed from codebase):
```typescript
// REMOVED - Use ReasoningProvider instead
// function parseStatusMarker(text: string): string | null {
//   const statusPattern = /\[STATUS:\s*([^\]]+)\]/g;
//   const matches = Array.from(text.matchAll(statusPattern));
//   if (matches.length > 0) {
//     return matches[matches.length - 1][1].trim();
//   }
//   return null;
// }
```

**Current implementation**: See `reasoning-provider.ts` for semantic status generation using GLM-4.5-Air.

---

## Streaming

### Overview

GLM-4.6 supports Server-Sent Events (SSE) streaming for real-time response delivery, including reasoning content and tool calls.

### Enabling Streaming

```javascript
{
  model: "glm-4.6",
  messages: [...],
  stream: true  // Enables SSE streaming
}
```

### Response Format

Responses are newline-delimited JSON (NDJSON) with the `data: ` prefix:

```
data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}
data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}]}
data: {"choices":[{"delta":{"reasoning_content":"Analyzing..."},"finish_reason":null}]}
data: [DONE]
```

### Stream Structure

```typescript
interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;

  choices: [{
    index: number;
    delta: {
      // Text content (arrives second)
      content?: string;

      // Reasoning content (arrives first)
      reasoning_content?: string;

      // Function calls (stream incrementally)
      tool_calls?: [{
        index: number;
        id?: string;           // Present in first chunk
        function?: {
          name?: string;       // Present in first chunk
          arguments?: string;  // Incremental - accumulate these
        };
      }];
    };
    finish_reason?: "stop" | "tool_calls" | "length" | null;
  }];

  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

### Processing Streaming Response

```javascript
const response = await fetch(url, { method: 'POST', body: jsonBody });

if (!response.body) throw new Error("No body");

const reader = response.body.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });

  let newlineIndex;
  while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, newlineIndex).trim();
    buffer = buffer.slice(newlineIndex + 1);

    if (!line || line.startsWith(":")) continue;  // Skip empty/comment lines

    if (line.startsWith("data: ")) {
      const jsonStr = line.slice(6);

      if (jsonStr === "[DONE]") {
        console.log("Stream complete");
        break;
      }

      const chunk = JSON.parse(jsonStr);
      const delta = chunk.choices[0].delta;

      if (delta.reasoning_content) {
        console.log("Reasoning:", delta.reasoning_content);
      }
      if (delta.content) {
        console.log("Content:", delta.content);
      }
      if (delta.tool_calls) {
        console.log("Tool call:", delta.tool_calls);
      }
    }
  }
}
```

### Implementation in This Codebase

See `supabase/functions/_shared/glm-client.ts`:

```typescript
// processGLMStream() handles all the complexity:
// - Buffers incomplete lines
// - Parses SSE format
// - Separates reasoning_content from content
// - Accumulates streaming tool calls
// - Handles timeouts and errors

const result = await processGLMStream(
  response,
  {
    onReasoningChunk: (chunk) => {
      // Process reasoning via ReasoningProvider
      await reasoningProvider.processReasoningChunk(chunk);
    },
    onContentChunk: (chunk) => {
      // Handle artifact content
      sendSSE('content', { chunk });
    },
    onNativeToolCall: (toolCall) => {
      // Handle tool call detection
      executeToolAndContinue(toolCall);
    }
  },
  requestId
);
```

---

## Error Codes & Troubleshooting

### HTTP Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Proceed |
| 400 | Bad Request | Check request format, parameters |
| 401 | Unauthorized | Verify API key |
| 429 | Rate Limited | Retry with exponential backoff |
| 500 | Internal Error | Retry or contact support |
| 503 | Service Unavailable | Retry with backoff |

### Common Errors

#### Error 1214: "Tool type cannot be empty"

```
{
  "error": {
    "code": 1214,
    "message": "Tool type cannot be empty"
  }
}
```

**Cause**: Missing `type: "function"` in tool_calls array

**Solution**:
```typescript
// Add type field to every tool_call
tool_calls: [
  {
    id: "call_123",
    type: "function",  // REQUIRED
    function: { name: "search", arguments: "{}" }
  }
]
```

#### Blank or Truncated Responses

**Cause 1**: Tool calling without assistant message context

**Solution**: Include the assistant's tool_calls message when sending tool results:
```typescript
// Include this message after user message
{
  role: "assistant",
  content: null,
  tool_calls: [...]
}

// Then send tool result
{
  role: "tool",
  tool_call_id: "call_123",
  content: "..."
}
```

**Cause 2**: max_tokens too low

**Solution**: Increase max_tokens or reduce prompt size:
```javascript
max_tokens: 4000  // Increase from 2000
```

#### Streaming Timeout

**Cause**: Network latency or slow model response

**Solution**: Increase chunk timeout:
```typescript
const result = await processGLMStream(
  response,
  callbacks,
  requestId,
  30000  // 30 second chunk timeout (default: 10000ms)
);
```

#### Content with Wrong Type

**Cause**: Artifact type mismatch or validation failure

**Solution**: Ensure artifact tags match expected type:
```xml
<!-- Correct for React artifacts -->
<artifact type="application/vnd.ant.react" title="Component">
export default function App() { ... }
</artifact>

<!-- Correct for HTML artifacts -->
<artifact type="text/html" title="Page">
<!DOCTYPE html>
...
</artifact>
```

### Retry Strategy

GLM-4.6 uses exponential backoff for transient failures:

```typescript
// From glm-client.ts
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 30000
};

// Automatic retries on:
// - 429 (Rate Limited)
// - 503 (Service Unavailable)
// - Network errors
```

---

## Rate Limits

### Tier-Based Limits

| Tier | Requests/Hour | Notes |
|------|---------------|-------|
| Free | 10 | Very limited |
| Pro | 100+ | Depends on plan |
| Coding Plan | 300+ | Recommended for GLM-4.6 |
| Enterprise | Custom | Contact sales |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1672531200
```

### Handling Rate Limits

When receiving 429:

```javascript
const retryAfter = response.headers.get('Retry-After');  // In seconds
const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;

// Wait then retry
setTimeout(() => retryRequest(), delayMs);
```

### Rate Limit Monitoring

```typescript
// Track usage in database (ai_usage_logs table)
await logGLMUsage({
  requestId: '...',
  functionName: 'generate-artifact',
  provider: 'z-ai',
  model: 'glm-4.6',
  userId: user?.id,
  isGuest: false,
  inputTokens: 1500,
  outputTokens: 3000,
  totalTokens: 4500,
  latencyMs: 2500,
  statusCode: 200,
  estimatedCost: 0.001,
  retryCount: 0
});
```

---

## Best Practices

### 1. Use Correct Endpoint

```typescript
// For GLM-4.6 artifacts - use Coding Plan endpoint
const GLM_BASE_URL = "https://api.z.ai/api/coding/paas/v4";

// For other models - may use general endpoint
const GENERAL_BASE_URL = "https://api.z.ai/api/paas/v4";
```

### 2. Always Use Configuration Constants

```typescript
// Wrong - hardcoded model name
const response = await fetch(url, {
  body: JSON.stringify({ model: "glm-4.6" })
});

// Correct - use MODELS from config
import { MODELS } from './config.ts';
const response = await fetch(url, {
  body: JSON.stringify({ model: MODELS.GLM_4_6.split('/').pop() })
});
```

### 3. Implement Proper Streaming with Callbacks

```typescript
const result = await processGLMStream(
  response,
  {
    onReasoningChunk: async (chunk) => {
      // Process via ReasoningProvider for semantic status
      await reasoningProvider.processReasoningChunk(chunk);
    },
    onContentChunk: async (chunk) => {
      await sendSSEEvent('content', { chunk });
    },
    onNativeToolCall: async (toolCall) => {
      const result = await executeTool(toolCall);
      await sendSSEEvent('tool_result', result);
    },
    onError: async (error) => {
      console.error("Stream error:", error);
    }
  },
  requestId
);
```

### 4. Reconstruct Full Message History for Tool Continuations

```typescript
// After detecting tool call and executing it:
const response = await callGLMWithToolResult(
  systemPrompt,
  userPrompt,
  toolCall,
  toolResultContent,
  callbacks,
  { stream: true, requestId },
  previousAssistantToolCalls  // REQUIRED - from original response
);
```

### 5. Monitor Token Usage

```typescript
const { inputTokens, outputTokens, totalTokens } = extractGLMTokenUsage(responseData);
const cost = calculateGLMCost(inputTokens, outputTokens);

console.log(`Tokens: ${totalTokens}, Cost: $${cost.toFixed(4)}`);
```

### 6. Use Appropriate Temperature

```javascript
// For artifact generation - balance creativity with correctness
temperature: 1.0  // Recommended for code

// For deterministic responses
temperature: 0.5

// For highly creative content
temperature: 1.5
```

### 7. Set Reasonable max_tokens

```javascript
// For artifacts
max_tokens: 4000  // Usually sufficient

// For short responses
max_tokens: 1000

// Maximum allowed
max_tokens: 8192
```

### 8. Enable Thinking for Complex Tasks

```javascript
thinking: { type: "enabled" }   // For code generation, analysis
thinking: { type: "disabled" }  // For simple responses (faster)
```

### 9. Use Tool Choice Appropriately

```javascript
tool_choice: "auto"      // Recommended - GLM decides
tool_choice: "required"  // Force tool use (when needed)
```

### 10. Handle Streaming Timeouts

```typescript
const CHUNK_TIMEOUT_MS = 10000;  // Wait 10s between chunks

// For slow networks or complex reasoning, increase timeout:
await processGLMStream(response, callbacks, requestId, 30000);
```

---

## Cost & Pricing

### Estimated Pricing (Z.ai Coding Plan)

Based on current Z.ai Coding Plan rates:

| Component | Cost | Notes |
|-----------|------|-------|
| Input Tokens | $0.10 per 1M | Estimated (verify with Z.ai) |
| Output Tokens | $0.30 per 1M | Higher cost for generation |
| Thinking Tokens | May have separate rate | Check documentation |

### Cost Calculation

```typescript
function calculateGLMCost(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_M = 0.10;
  const OUTPUT_COST_PER_M = 0.30;

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_M;

  return inputCost + outputCost;
}

// Example: 1500 input + 3000 output tokens
// Cost = (1500/1M * $0.10) + (3000/1M * $0.30) = $0.00015 + $0.0009 = $0.00105
```

### Cost Optimization

1. **Use thinking mode selectively** - Only for complex tasks
2. **Batch requests** - Combine multiple small requests
3. **Cache context** - Reuse system prompts when possible
4. **Monitor usage** - Track in ai_usage_logs table
5. **Set max_tokens appropriately** - Don't request excessive output

---

## TypeScript Interfaces

### Complete Type Definitions

```typescript
// Message types
type Role = "system" | "user" | "assistant" | "tool";

interface GLMMessage {
  role: Role;
  content?: string;
  tool_call_id?: string;
  name?: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;  // JSON string
  };
}

// Request options
interface CallGLMOptions {
  temperature?: number;
  max_tokens?: number;
  requestId?: string;
  userId?: string;
  isGuest?: boolean;
  functionName?: string;
  promptPreview?: string;
  enableThinking?: boolean;
  stream?: boolean;
  tools?: GLMToolDefinition[];
  toolResultContext?: {
    toolCallId: string;
    toolName: string;
    content: string;
  };
  previousAssistantMessage?: {
    content: string | null;
    tool_calls?: ToolCall[];
  };
  timeoutMs?: number;
}

// Tool definition
interface GLMToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      default?: unknown;
    }>;
    required: string[];
  };
}
```

---

## Integration Examples

### Example 1: Simple Chat

```typescript
import { callGLM, extractTextFromGLM } from './glm-client.ts';

const response = await callGLM(
  'You are a helpful assistant.',
  'What is 2+2?',
  { temperature: 0.5, max_tokens: 100 }
);

const data = await response.json();
const answer = extractTextFromGLM(data);
console.log(answer);  // "2+2 equals 4"
```

### Example 2: Artifact Generation with Thinking

```typescript
import {
  callGLM,
  extractTextAndReasoningFromGLM,
  processGLMStream
} from './glm-client.ts';

const systemPrompt = `You are an expert React developer.
Generate React components using shadcn/ui and Tailwind CSS.`;

const userPrompt = 'Create a todo list component';

const response = await callGLM(
  systemPrompt,
  userPrompt,
  {
    enableThinking: true,
    stream: true,
    max_tokens: 4000,
    requestId: crypto.randomUUID()
  }
);

const result = await processGLMStream(response, {
  onReasoningChunk: (chunk) => {
    console.log('Thinking:', chunk);
  },
  onContentChunk: (chunk) => {
    console.log('Code:', chunk);
  }
});

console.log('Final artifact:', result.content);
```

### Example 3: Web Search with Tool Calling

```typescript
import { callGLM, processGLMStream, GLM_SEARCH_TOOL } from './glm-client.ts';

const response = await callGLM(
  'You are a helpful search assistant.',
  'What are the latest developments in AI?',
  {
    stream: true,
    tools: [GLM_SEARCH_TOOL],
    enableThinking: true,
    requestId: 'req_123'
  }
);

const result = await processGLMStream(response, {
  onNativeToolCall: async (toolCall) => {
    // Tool was detected - execute search
    const searchResults = await performSearch(toolCall.function.arguments);

    // Continue with results
    const finalResponse = await callGLMWithToolResult(
      systemPrompt,
      userPrompt,
      { id: toolCall.id, name: toolCall.function.name, arguments: {} },
      formatSearchResults(searchResults),
      { /* callbacks */ },
      { stream: true, requestId: 'req_123' },
      [toolCall]  // previousAssistantToolCalls
    );
  }
});
```

---

## Useful Links

- **Z.ai Official Docs**: https://docs.z.ai
- **Z.ai Platform**: https://z.ai
- **API Dashboard**: https://z.ai/api/dashboard
- **OpenAI API Spec** (compatible format): https://platform.openai.com/docs/api-reference/chat

---

## Version History

| Date | Changes |
|------|---------|
| 2025-12-20 | Initial comprehensive reference. Added tool calling bug fix (1214, message history reconstruction), streaming implementation, thinking mode details. |

---

## Notes for Development Team

### Current Implementation Status

- **Tool Calling**: Fully implemented with native OpenAI format
- **Streaming**: Complete SSE implementation with reasoning + content + tool_calls
- **Thinking Mode**: Enabled by default, status markers parsed for UI feedback
- **Error Handling**: Retry logic with exponential backoff
- **Cost Tracking**: Full logging to ai_usage_logs table

### Known Issues & Fixes

1. **Error 1214** - Fixed by ensuring `type: "function"` in tool_calls
2. **Blank responses after tool execution** - Fixed by reconstructing full message history including assistant's tool_calls message
3. **Tool calls not detected** - Ensure tool name matches exactly and arguments are valid JSON

### Recent Changes (RFC-001)

Tool result format changed from XML to OpenAI-compatible structured format:

```typescript
// Old (XML) - NO LONGER USED
`<tool_result><content>${result}</content></tool_result>`

// New (OpenAI-compatible) - CURRENT
{
  role: "tool",
  tool_call_id: "call_123",
  content: result  // Plain text
}
```

All code in the codebase uses the new format. Do not revert to XML format.
