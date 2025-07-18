# VANA API Reference

## Overview

VANA provides both traditional REST endpoints and Server-Sent Events (SSE) streaming for real-time interaction with the multi-agent system.

## Base URL

```
Development: http://localhost:8081
Production: http://localhost:8080
```

## Authentication

Currently using demo authentication. Replace with proper auth for production.

```json
{
  "email": "demo@vana.ai",
  "password": "vana-demo-2024"
}
```

## Endpoints

### 1. Chat Streaming (SSE)

Real-time streaming endpoint with ThinkingPanel events.

```http
POST /chat
Content-Type: application/json

{
  "message": "What are the security best practices for API design?",
  "session_id": "optional-session-id",
  "stream": true
}
```

**Response**: Server-Sent Events stream

#### Event Types

##### Thinking Event
Shows agent orchestration in real-time:

```javascript
data: {
  "type": "thinking",
  "content": "Analyzing query type and routing to appropriate specialists...",
  "agent": "master_orchestrator",
  "status": "analyzing_request"
}
```

##### Agent Activation Event
Indicates which specialist is handling the request:

```javascript
data: {
  "type": "thinking",
  "content": "Security analysis requested - routing to Security Specialist...",
  "agent": "security_specialist",
  "status": "active"
}
```

##### Content Streaming Event
Actual response content streamed in chunks:

```javascript
data: {
  "type": "content",
  "content": "Based on my security analysis, here are the best practices..."
}
```

##### Completion Event
Indicates stream end:

```javascript
data: {
  "type": "done",
  "status": "complete"
}
```

#### Example Client Implementation

```typescript
const eventSource = new EventSource('/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message: userInput,
    stream: true 
  })
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'thinking':
      // Update ThinkingPanel
      addThinkingStep(data);
      break;
    case 'content':
      // Append to response
      appendContent(data.content);
      break;
    case 'done':
      // Finalize response
      eventSource.close();
      break;
  }
};
```

### 2. Standard Chat (Non-streaming)

Traditional request-response endpoint.

```http
POST /run
Content-Type: application/json

{
  "input": "Analyze the performance of our data pipeline"
}
```

**Response**:
```json
{
  "result": {
    "output": "I'll analyze your data pipeline performance...",
    "id": "response-id-123"
  }
}
```

### 3. Health Check

```http
GET /health
```

**Response**:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2025-01-13T10:00:00Z",
  "services": {
    "orchestrator": "active",
    "specialists": {
      "security": "ready",
      "data_science": "ready",
      "architecture": "ready",
      "devops": "ready",
      "qa": "ready",
      "ui_ux": "ready"
    }
  }
}
```

### 4. OpenAI-Compatible Endpoint

For compatibility with OpenAI clients.

```http
POST /v1/chat/completions
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "Explain microservices architecture"
    }
  ],
  "stream": false
}
```

**Response**:
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "vana-gemini-2.0",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Microservices architecture is..."
    },
    "finish_reason": "stop"
  }]
}
```

## Agent Routing

VANA automatically routes queries to appropriate specialists based on content:

| Keywords | Specialist | Icon |
|----------|------------|------|
| security, vulnerability, threat, auth | Security Specialist | 🔒 |
| data, analyze, statistics, trend | Data Science Specialist | 📊 |
| code, architecture, design, refactor | Architecture Specialist | 🏗️ |
| deploy, ci/cd, infrastructure, docker | DevOps Specialist | ⚙️ |
| test, qa, quality, coverage | QA Specialist | 🧪 |
| ui, ux, interface, component | UI/UX Specialist | 🎨 |

## Response Formatting

All responses are processed through the ResponseFormatter to ensure:
- Clean, unified output
- No internal handoff artifacts
- Professional formatting
- Consistent voice

## Error Handling

### Error Response Format

```json
{
  "error": {
    "message": "Error description",
    "type": "error_type",
    "code": "ERROR_CODE"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Malformed request body |
| `MISSING_API_KEY` | Google API key not configured |
| `SPECIALIST_ERROR` | Specialist agent failed |
| `TIMEOUT` | Request processing timeout |
| `RATE_LIMIT` | Rate limit exceeded |

## Rate Limiting

Default limits (configurable):
- 60 requests per minute per IP
- 1000 requests per hour per session

## WebSocket Support (Future)

Planned WebSocket endpoint for bidirectional communication:

```javascript
ws://localhost:8081/ws

// Message format
{
  "type": "chat",
  "message": "Your query",
  "session_id": "optional"
}
```

## SDK Examples

### Python

```python
import requests
import json

# Streaming request
response = requests.post(
    "http://localhost:8081/chat",
    json={
        "message": "Analyze this code for security issues",
        "stream": True
    },
    stream=True
)

for line in response.iter_lines():
    if line:
        data = json.loads(line.decode('utf-8').replace('data: ', ''))
        print(f"{data['type']}: {data.get('content', '')}")
```

### JavaScript/TypeScript

```typescript
async function streamChat(message: string) {
  const response = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, stream: true })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    // Process SSE events
  }
}
```

## Deployment Considerations

1. **CORS**: Configure allowed origins for frontend
2. **SSL/TLS**: Use HTTPS in production
3. **API Gateway**: Consider rate limiting and authentication
4. **Monitoring**: Track response times and error rates
5. **Caching**: Leverage orchestrator's LRU cache

## Version History

- **v2.0.0**: Added SSE streaming with ThinkingPanel events
- **v1.5.0**: Enhanced orchestrator with specialist routing
- **v1.0.0**: Initial release with basic chat functionality