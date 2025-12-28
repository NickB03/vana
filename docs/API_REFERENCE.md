# API Reference - Vana Edge Functions

**Last Updated**: 2025-12-27
**Base URL**: `https://vznhbocnuykdmjvujaka.supabase.co/functions/v1`

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Chat](#post-chat)
    - [SSE Status Update System](#sse-status-update-system)
  - [Generate Artifact](#post-generate-artifact)
  - [Generate Artifact Fix](#post-generate-artifact-fix)
  - [Generate Image](#post-generate-image)
  - [Generate Title](#post-generate-title)
  - [Summarize Conversation](#post-summarize-conversation)
  - [Admin Analytics](#get-admin-analytics)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)
- [Changelog](#changelog)

---

## Authentication

All API endpoints require authentication via Supabase JWT tokens, except for guest users within rate limits.

### Headers

```http
Authorization: Bearer <SUPABASE_JWT_TOKEN>
Content-Type: application/json
```

### Guest Access

Guest users (no authentication token) can access the API with the following limitations:
- **Rate Limit**: 20 requests per 5-hour window
- **IP-based tracking**: Enforced using client IP address
- **Limited features**: Some endpoints may be restricted

---

## Rate Limiting

### Guest Users
- **Limit**: 20 requests per 5 hours
- **Tracking**: IP-based
- **Reset**: Automatic after 5-hour window
- **Response Header**: `X-RateLimit-Remaining`

### Authenticated Users
- **Limit**: 100 requests per 5 hours
- **Tracking**: User ID-based
- **Reset**: Automatic after 5-hour window

### Rate Limit Response

When rate limit is exceeded:

```json
{
  "error": "Rate limit exceeded",
  "message": "You have reached the maximum number of requests. Please try again later.",
  "details": {
    "limit": 20,
    "windowHours": 5
  }
}
```

**HTTP Status**: `429 Too Many Requests`

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "message": "Detailed error description",
  "details": {
    // Additional context
  }
}
```

### Common HTTP Status Codes

| Status Code | Meaning |
|-------------|---------|
| `200` | Success |
| `400` | Bad Request - Invalid input |
| `401` | Unauthorized - Missing/invalid auth token |
| `403` | Forbidden - Insufficient permissions |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |
| `503` | Service Unavailable - External API issues |

---

## Endpoints

### POST /chat

Stream AI chat responses with support for artifacts, images, and reasoning generation.

#### Request

**Endpoint**: `POST /chat`

**Headers**:
```http
Authorization: Bearer <token> (optional for guests)
Content-Type: application/json
```

**Body**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Create a button component"
    }
  ],
  "sessionId": "uuid-string",
  "isGuest": false,
  "currentArtifact": null,
  "toolChoice": "auto",
  "includeReasoning": true
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | `Array<Message>` | Yes | Array of chat messages |
| `sessionId` | `string` | Yes | Unique session identifier |
| `isGuest` | `boolean` | No | Whether user is a guest (default: `false`) |
| `currentArtifact` | `object \| null` | No | Existing artifact for context |
| `toolChoice` | `"auto" \| "generate_artifact" \| "generate_image"` | No | Force a specific tool call (default: `"auto"`) |
| `includeReasoning` | `boolean` | No | Include Chain of Thought reasoning (default: `true`) |

**Message Schema**:
```typescript
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}
```

#### Response

**Content-Type**: `text/event-stream` (Server-Sent Events)

#### SSE Status Update System

The chat API uses **ReasoningProvider** to generate semantic status updates during AI processing.

**Event Types**:

1. **Reasoning Status Event** (LLM-powered semantic status):
```json
{
  "type": "reasoning_status",
  "status": "Designing component structure...",
  "phase": "planning",
  "metadata": {
    "requestId": "req_123",
    "timestamp": "2025-12-22T10:30:00Z",
    "source": "llm",
    "provider": "z.ai",
    "model": "glm-4.5-air",
    "circuitBreakerOpen": false
  }
}
```
- **Source**: ReasoningProvider with GLM-4.5-Air semantic summarization
- **Frequency**: Periodic updates during reasoning (respects `minUpdateIntervalMs`)
- **Reliability**: Circuit breaker fallback to phase templates on LLM failure
- **Phases**: `analyzing`, `planning`, `implementing`, `refining`, `completing`
- **Metadata Fields**:
  - `requestId`: Unique identifier for request correlation
  - `timestamp`: ISO 8601 timestamp
  - `source`: `llm` (LLM-generated) or `template` (fallback)
  - `provider`: AI provider used (e.g., `z.ai`)
  - `model`: Specific model used for status generation
  - `circuitBreakerOpen`: Circuit breaker state for monitoring

**Status Update Flow**:
```
Chat Request → GLM-4.6 Reasoning Stream
    ↓
ReasoningProvider (GLM-4.5-Air)
    ↓
reasoning_status events → Client UI
```

2. **Reasoning Step Event** (structured thinking steps):
```json
{
  "type": "reasoning_step",
  "step": {
    "phase": "research",
    "title": "Understanding Request",
    "items": ["Identify key requirements", "Review context"]
  },
  "stepIndex": 0
}
```

4. **Tool Call Start Event** (Issue #340 unified tools):
```json
{
  "type": "tool_call_start",
  "toolName": "generate_artifact",
  "arguments": {
    "artifact_type": "react",
    "prompt": "Create a counter component"
  }
}
```

5. **Tool Result Event**:
```json
{
  "type": "tool_result",
  "toolName": "generate_artifact",
  "success": true,
  "latencyMs": 2450
}
```

6. **Artifact Complete Event** (after tool execution):
```json
{
  "type": "artifact_complete",
  "artifact": {
    "type": "react",
    "title": "Counter",
    "content": "export default function Counter() { ... }"
  }
}
```

7. **Image Complete Event**:
```json
{
  "type": "image_complete",
  "imageUrl": "https://...",
  "title": "Generated Image"
}
```

8. **Web Search Event**:
```json
{
  "type": "web_search",
  "data": {
    "query": "React hooks best practices",
    "sources": [
      {
        "title": "React Documentation",
        "url": "https://react.dev/hooks",
        "snippet": "Hooks let you use state and other React features..."
      }
    ]
  }
}
```

9. **Content Delta Event**:
```json
{
  "choices": [
    {
      "delta": {
        "content": "Hello"
      }
    }
  ]
}
```

10. **Done Event**:
```
data: [DONE]
```

**Example Stream Consumption**:
```javascript
// Client-side implementation using fetch + ReadableStream
const response = await fetch('/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(requestData)
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;

    const data = line.slice(6);
    if (data === '[DONE]') {
      console.log('Stream complete');
      break;
    }

    try {
      const event = JSON.parse(data);

      switch (event.type) {
        // Legacy status updates (marker-based)
        case 'status_update':
          console.log('[Legacy Status]:', event.status);
          updateStatusUI(event.status);
          break;

        // Modern status updates (LLM-powered)
        case 'reasoning_status':
          console.log('[Modern Status]:', {
            status: event.status,
            phase: event.phase,
            source: event.metadata.source,
            circuitBreaker: event.metadata.circuitBreakerOpen
          });
          updateStatusUI(event.status, event.phase);
          break;

        case 'reasoning_step':
          displayReasoningStep(event.step, event.stepIndex);
          break;

        case 'tool_call_start':
          console.log(`[Tool] Starting ${event.toolName}...`);
          showToolProgress(event.toolName);
          break;

        case 'tool_result':
          console.log(`[Tool] ${event.toolName} completed in ${event.latencyMs}ms`);
          break;

        case 'artifact_complete':
          displayArtifact(event.artifact);
          break;

        case 'image_complete':
          displayImage(event.imageUrl, event.title);
          break;

        case 'web_search':
          displaySearchResults(event.data.sources);
          break;

        default:
          // Content delta (OpenRouter format)
          if (event.choices?.[0]?.delta?.content) {
            appendToMessage(event.choices[0].delta.content);
          }
      }
    } catch (error) {
      console.error('Failed to parse SSE event:', error);
    }
  }
}
```

**Recommended Approach**: Listen for `reasoning_status` events:
- Rich metadata (phase, provider, timestamps)
- Circuit breaker fallback ensures reliability
- Semantic, context-aware status messages

**Architecture Details**: For implementation details of ReasoningProvider, see:
- **CLAUDE.md** → "Status Update System" section
- **CLAUDE.md** → "ReasoningProvider Implementation Details" section
- **docs/REASONING_UI_ARCHITECTURE.md** → Full architecture documentation
- **supabase/functions/_shared/reasoning-provider.ts** → Provider implementation

#### AI Model

- **Model**: Gemini 2.5 Flash Lite (via OpenRouter)
- **Provider**: OpenRouter
- **Streaming**: Yes
- **Max Tokens**: 8,000

---

### POST /generate-artifact

Generate interactive artifacts (React components, HTML, SVG, etc.) from user prompts.

#### Request

**Endpoint**: `POST /generate-artifact`

**Body**:
```json
{
  "prompt": "Create a Todo list component with add/delete functionality",
  "artifactType": "react",
  "currentArtifact": null
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | Yes | User's artifact generation request |
| `artifactType` | `string` | Yes | Type of artifact (`react`, `html`, `svg`, `code`, `mermaid`, `markdown`) |
| `currentArtifact` | `object \| null` | No | Existing artifact for modification |

#### Response

```json
{
  "artifact": {
    "type": "react",
    "title": "Todo List Component",
    "content": "export default function TodoList() { ... }",
    "language": "javascript"
  },
  "usage": {
    "inputTokens": 120,
    "outputTokens": 580,
    "totalTokens": 700
  }
}
```

**Response Schema**:
```typescript
interface ArtifactResponse {
  artifact: {
    type: string;
    title: string;
    content: string;
    language?: string;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
```

#### AI Model

- **Model**: GLM-4.6 (via Z.ai API)
- **Provider**: Z.ai (zhipu.ai)
- **Streaming**: Yes (with reasoning)
- **Max Tokens**: 8,000
- **Thinking Mode**: Enabled (provides reasoning content)

#### Supported Artifact Types

| Type | Description | Example Use Case |
|------|-------------|------------------|
| `react` | React component | Interactive UI components |
| `html` | Standalone HTML | Landing pages, email templates |
| `svg` | SVG graphics | Icons, illustrations |
| `code` | Code snippets | Functions, utilities |
| `mermaid` | Mermaid diagrams | Flowcharts, architecture diagrams |
| `markdown` | Markdown documents | Documentation, notes |

#### Artifact Validation

Generated artifacts undergo **5-layer validation** with structured error codes:

- **Error Codes**: Validation uses type-safe error codes (e.g., `RESERVED_KEYWORD_EVAL`, `IMPORT_LOCAL_PATH`)
- **Auto-Fix**: Common issues (reserved keywords, TypeScript syntax, imports) are automatically fixed
- **Non-Blocking Errors**: Immutability violations (`IMMUTABILITY_*`) don't prevent rendering
- **Complete Reference**: See [ERROR_CODES.md](ERROR_CODES.md) for all validation error codes

**Validation Response Fields**:
```typescript
{
  validation: {
    valid: boolean;        // Overall validation status
    autoFixed: boolean;    // Whether auto-fixes were applied
    issueCount: number;    // Number of validation issues found
  }
}
```

---

### POST /generate-artifact-fix

Fix errors in generated artifacts automatically.

#### Request

**Endpoint**: `POST /generate-artifact-fix`

**Body**:
```json
{
  "artifact": {
    "type": "react",
    "title": "Button Component",
    "content": "export default function Button() { ... }"
  },
  "errorMessage": "SyntaxError: Unexpected token"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `artifact` | `object` | Yes | The artifact with errors |
| `errorMessage` | `string` | Yes | Error message to fix |

#### Response

```json
{
  "fixedArtifact": {
    "type": "react",
    "title": "Button Component (Fixed)",
    "content": "export default function Button() { ... }",
    "language": "javascript"
  },
  "explanation": "Fixed syntax error by adding missing semicolon and closing brace.",
  "usage": {
    "inputTokens": 200,
    "outputTokens": 180,
    "totalTokens": 380
  }
}
```

#### AI Model

- **Model**: GLM-4.6 (via Z.ai API)
- **Provider**: Z.ai (zhipu.ai)
- **Max Tokens**: 8,000
- **Thinking Mode**: Enabled for deep reasoning during debugging

---

### POST /generate-image

Generate AI images using Google's Gemini Flash Image model.

#### Request

**Endpoint**: `POST /generate-image`

**Body**:
```json
{
  "prompt": "A futuristic cityscape at sunset",
  "aspectRatio": "16:9"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | Yes | Image description (max 2000 characters) |
| `aspectRatio` | `string` | No | Aspect ratio (`1:1`, `16:9`, `9:16`, default: `1:1`) |

#### Response

```json
{
  "imageUrl": "https://vznhbocnuykdmjvujaka.supabase.co/storage/v1/object/public/generated-images/...",
  "prompt": "A futuristic cityscape at sunset",
  "title": "Futuristic cityscape at sunset"
}
```

#### AI Model

- **Model**: Gemini 2.5 Flash Image
- **Provider**: OpenRouter
- **API Key**: Single `OPENROUTER_GEMINI_IMAGE_KEY` (no rotation)
  - Note: All AI operations (chat, artifacts, images) use single OpenRouter keys for simplicity
- **Storage**: Supabase Storage bucket

---

### POST /generate-title

Auto-generate conversational titles from chat history.

#### Request

**Endpoint**: `POST /generate-title`

**Body**:
```json
{
  "firstMessage": "How do I create a React component?"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstMessage` | `string` | Yes | First user message in conversation |

#### Response

```json
{
  "title": "Creating React Components"
}
```

#### AI Model

- **Model**: Gemini 2.5 Flash Lite (via OpenRouter)
- **Provider**: OpenRouter
- **Max Tokens**: 50

---

### POST /summarize-conversation

Summarize long conversations for context management.

#### Request

**Endpoint**: `POST /summarize-conversation`

**Body**:
```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | `Array<Message>` | Yes | Array of messages to summarize (max 100) |

#### Response

```json
{
  "summary": "The conversation focused on building a React component with state management..."
}
```

#### AI Model

- **Model**: Gemini 2.5 Flash Lite (via OpenRouter)
- **Provider**: OpenRouter
- **Max Tokens**: 1,000

---

### GET /admin-analytics

Retrieve usage analytics and metrics (admin-only).

#### Request

**Endpoint**: `GET /admin-analytics`

**Query Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | `string` | No | Start date (ISO format) |
| `endDate` | `string` | No | End date (ISO format) |
| `period` | `string` | No | Time period (`24h`, `7d`, `30d`, default: `24h`) |

#### Response

```json
{
  "totalRequests": 1250,
  "totalCost": 4.57,
  "averageLatency": 1850,
  "errorRate": 0.02,
  "breakdownByFunction": [
    {
      "function": "chat",
      "requests": 850,
      "cost": 2.34,
      "avgLatency": 1650
    }
  ],
  "breakdownByModel": [
    {
      "model": "gemini-2.5-flash-lite",
      "requests": 850,
      "cost": 2.34,
      "tokens": 125000
    }
  ]
}
```

#### Authentication

**Required**: Admin role or specific email address

**Check**: Email-based or role-based authorization

---

## Code Examples

### JavaScript/TypeScript

#### Chat with Streaming

```typescript
async function sendChatMessage(message: string, sessionId: string) {
  const response = await fetch('https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/chat', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: message }
      ],
      sessionId,
      includeReasoning: true
    })
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        console.log('Delta:', data.content);
      }
    }
  }
}
```

#### Generate Artifact

```typescript
async function generateArtifact(prompt: string, type: string) {
  const response = await fetch('https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/generate-artifact', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      artifactType: type
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  return data.artifact;
}
```

#### Generate Image

```typescript
async function generateImage(prompt: string) {
  const response = await fetch('https://vznhbocnuykdmjvujaka.supabase.co/functions/v1/generate-image', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      prompt,
      aspectRatio: '16:9'
    })
  });

  const data = await response.json();
  return data.imageUrl;
}
```

---

## Best Practices

### 1. Error Handling

Always implement proper error handling:

```typescript
try {
  const result = await callAPI();
} catch (error) {
  if (error.status === 429) {
    // Rate limit exceeded
    showRateLimitWarning();
  } else if (error.status === 401) {
    // Unauthorized
    redirectToLogin();
  } else {
    // Other errors
    showErrorMessage(error.message);
  }
}
```

### 2. Rate Limit Management

Check rate limit headers:

```typescript
const response = await fetch(url);
const remaining = response.headers.get('X-RateLimit-Remaining');

if (remaining && parseInt(remaining) < 5) {
  showLowRateLimitWarning();
}
```

### 3. Streaming Best Practices

- Always close the EventSource connection when done
- Implement timeout handling for long-running requests
- Handle connection errors gracefully
- Listen for both `status_update` and `reasoning_status` events for maximum reliability
- Monitor `circuitBreakerOpen` flag in `reasoning_status` metadata to detect system degradation
- Gracefully fall back to simple status display if LLM status generation fails

### 4. Security

- Never expose API keys in client-side code
- Always use HTTPS for API requests
- Validate and sanitize all user input before sending to API

---

## Changelog

### 2025-12-22
- **Dual SSE Event System Documentation**
  - Comprehensive documentation of parallel status update mechanisms
  - `status_update` events (legacy marker-based parsing)
  - `reasoning_status` events (modern LLM-powered semantic summaries)
  - Detailed comparison table and usage recommendations
  - Updated example code showing both event types

### 2025-12-19
- **Issue #340**: Unified tool-calling architecture
  - Added `tool_call_start`, `tool_result` SSE events
  - New `artifact_complete`, `image_complete`, `web_search` events
  - Tool security infrastructure (rate limiting, validation, prompt injection defense)
  - Per-tool rate limits via `user_tool_rate_limits` table

### 2025-12-15
- **Issue #339**: Hybrid ReasoningProvider with LLM+fallback
  - Added `reasoning_status` SSE events with phase detection
  - Circuit breaker pattern for resilient operation
  - GLM-4.5-Air model for semantic status summarization

### 2025-12-14
- **Issue #335**: Inline citation badges for web search results
  - Added source attribution in `web_search` events

### 2025-11-28
- Migrated artifact generation from Kimi K2 to GLM-4.6 (Z.ai API)
- GLM reasoning parser for structured reasoning output

### 2025-11-27
- Added smart context management with token-aware windowing
- Fixed guest artifact bundling issues
- React instance unification via import map shims

### 2025-11-17
- Migrated artifact generation to Kimi K2-Thinking (now deprecated)
- Added `includeReasoning` parameter to chat endpoint
- Updated rate limits: 20 requests/5h for guests

### 2025-11-14
- Added Chain of Thought reasoning support
- Enhanced error responses with more context

### 2025-11-13
- Migrated to OpenRouter for chat
- Added CORS security improvements
- Implemented XSS sanitization

---

## Support

For issues or questions:
- **GitHub Issues**: [https://github.com/NickB03/llm-chat-site/issues](https://github.com/NickB03/llm-chat-site/issues)
- **Documentation**: See README.md and other docs in `/docs`

---

**Note**: This API is for the Vana AI Development Assistant project. All endpoints are subject to change as the project evolves.
