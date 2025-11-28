# API Reference - Vana Edge Functions

**Last Updated**: 2025-11-28
**Base URL**: `https://vznhbocnuykdmjvujaka.supabase.co/functions/v1`

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Chat](#post-chat)
  - [Generate Artifact](#post-generate-artifact)
  - [Generate Reasoning](#post-generate-reasoning)
  - [Generate Artifact Fix](#post-generate-artifact-fix)
  - [Generate Image](#post-generate-image)
  - [Generate Title](#post-generate-title)
  - [Summarize Conversation](#post-summarize-conversation)
  - [Admin Analytics](#get-admin-analytics)

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
  "forceImageMode": false,
  "forceArtifactMode": false,
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
| `forceImageMode` | `boolean` | No | Force image generation mode |
| `forceArtifactMode` | `boolean` | No | Force artifact generation mode |
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

**Event Types**:

1. **Reasoning Event** (if `includeReasoning: true`):
```
event: reasoning
data: {"steps":[{"phase":"research","title":"Understanding Request","content":"..."}]}
```

2. **Content Delta Event**:
```
event: delta
data: {"content":"Hello"}
```

3. **Done Event**:
```
event: done
data: {"content":"Complete message","usage":{"tokens":150}}
```

**Example Stream**:
```javascript
// Client-side implementation
const eventSource = new EventSource('/chat', {
  method: 'POST',
  body: JSON.stringify(requestData)
});

eventSource.addEventListener('reasoning', (event) => {
  const reasoning = JSON.parse(event.data);
  // Display reasoning steps
});

eventSource.addEventListener('delta', (event) => {
  const delta = JSON.parse(event.data);
  // Append to message
});

eventSource.addEventListener('done', (event) => {
  const final = JSON.parse(event.data);
  // Complete message
  eventSource.close();
});
```

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

---

### POST /generate-reasoning

Generate fast reasoning content in parallel with artifact generation. This endpoint provides quick reasoning (2-4s) while the main artifact is being generated (30-60s).

#### Request

**Endpoint**: `POST /generate-reasoning`

**Body**:
```json
{
  "prompt": "Create a Todo list component with add/delete functionality",
  "context": "User wants an interactive React component"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | Yes | User's request for reasoning |
| `context` | `string` | No | Additional context for better reasoning |

#### Response

```json
{
  "reasoning": {
    "steps": [
      {
        "phase": "research",
        "title": "Analyzing the user's request",
        "icon": "search",
        "items": [
          "User wants a Todo list component",
          "Requirements: add and delete functionality"
        ]
      },
      {
        "phase": "analysis",
        "title": "Planning the implementation",
        "icon": "lightbulb",
        "items": [
          "Using React useState for state management",
          "Creating reusable component structure"
        ]
      }
    ],
    "summary": "Building a Todo list with React hooks"
  }
}
```

#### AI Model

- **Model**: Gemini 2.5 Flash Lite (via OpenRouter)
- **Provider**: OpenRouter
- **Latency**: 2-4 seconds (runs in parallel with artifact generation)
- **Purpose**: Provides immediate reasoning feedback while GLM-4.6 generates the artifact

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

### 4. Security

- Never expose API keys in client-side code
- Always use HTTPS for API requests
- Validate and sanitize all user input before sending to API

---

## Changelog

### 2025-11-28
- Migrated artifact generation from Kimi K2 to GLM-4.6 (Z.ai API)
- Added `/generate-reasoning` endpoint for fast parallel reasoning
- GLM reasoning parser for structured reasoning output
- Fixed CORS issues in generate-reasoning preflight handler

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
