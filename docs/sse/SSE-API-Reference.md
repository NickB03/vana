# SSE API Reference

## Table of Contents

1. [Endpoints](#endpoints)
2. [Event Types](#event-types)
3. [Data Structures](#data-structures)
4. [Authentication](#authentication)
5. [Error Codes](#error-codes)
6. [Rate Limiting](#rate-limiting)

## Endpoints

### Agent Network SSE Stream

**Endpoint**: `GET /agent_network_sse/{session_id}`

**Description**: Real-time event stream for agent network updates, including agent status changes, network topology, and performance metrics.

**Authentication**: Required (JWT via cookie or x-auth-token header)

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `session_id` | string | Unique session identifier (UUID format) |

**Headers**:
```http
GET /agent_network_sse/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: api.vana.com
Accept: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
x-auth-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response**:
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no

event: connection
data: {"type":"connection","status":"connected","sessionId":"550e8400-e29b-41d4-a716-446655440000","timestamp":"2025-10-09T12:00:00Z","authenticated":true,"userId":"user_123"}

event: agent_network_update
data: {"agentId":"agent_1","status":"active","metadata":{"cpuUsage":15.2}}

event: keepalive
data: {"timestamp":"2025-10-09T12:00:30Z"}
```

**Event Types Emitted**:
- `connection` - Connection status (connected/disconnected)
- `agent_network_update` - Agent status changes
- `agent_network_snapshot` - Full network state
- `agent_start` - Agent started
- `agent_complete` - Agent completed task
- `keepalive` - Heartbeat (every 30s)
- `error` - Error notifications

**Configuration**:
- **Keepalive Interval**: 30 seconds
- **Max Connection Duration**: Unlimited (managed by client)
- **Backpressure**: Events dropped if client can't keep up
- **History**: Last 10 events sent to new subscribers

### ADK Chat Stream

**Endpoint**: `GET /apps/{app_name}/users/{user_id}/sessions/{session_id}/run`

**Description**: ADK-compliant chat endpoint with streaming responses from AI agents.

**Authentication**: Required

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `app_name` | string | Application name (default: "vana") |
| `user_id` | string | User identifier (default: "default") |
| `session_id` | string | Session UUID |

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | No | User query (for GET requests) |

**POST Request Body**:
```json
{
  "query": "What is the weather today?",
  "context": {
    "location": "San Francisco"
  }
}
```

**Response Stream**:
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream

event: thought_process_start
data: {"messageId":"msg_123","sessionId":"session_456","taskId":"task_789","thinkingAbout":"weather query"}

event: regeneration_progress
data: {"messageId":"msg_123","progress":25.0,"message":"Retrieving weather data","partialContent":"Let me check..."}

event: regeneration_progress
data: {"messageId":"msg_123","progress":75.0,"message":"Generating response","partialContent":"The weather in San Francisco..."}

event: message_regenerated
data: {"messageId":"msg_123","content":"The weather in San Francisco is sunny with a high of 72°F.","timestamp":"2025-10-09T12:01:00Z"}
```

### Agent Network History

**Endpoint**: `GET /agent_network_history`

**Description**: Retrieve recent agent network events (non-streaming).

**Authentication**: Required

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Maximum events to return (1-1000) |

**Request**:
```http
GET /agent_network_history?limit=100 HTTP/1.1
Host: api.vana.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response**:
```json
{
  "events": [
    {
      "type": "agent_start",
      "data": {
        "agentId": "agent_1",
        "taskId": "task_123",
        "timestamp": "2025-10-09T11:55:00Z"
      },
      "id": "agent_start_1696857300.123",
      "sessionId": "session_456",
      "timestamp": "2025-10-09T11:55:00Z"
    }
  ],
  "authenticated": true,
  "user_id": "user_123",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

### Broadcaster Stats (Debug)

**Endpoint**: `GET /sse/stats` (Internal - not in production API)

**Description**: Get broadcaster performance metrics and statistics.

**Authentication**: Admin only

**Response**:
```json
{
  "totalSessions": 42,
  "totalSubscribers": 89,
  "totalEvents": 15234,
  "memoryUsageMB": 125.4,
  "sessionStats": {
    "session_456": {
      "subscribers": 2,
      "historySize": 347
    }
  },
  "config": {
    "maxQueueSize": 1000,
    "maxHistoryPerSession": 500,
    "eventTTL": 300.0,
    "sessionTTL": 1800.0,
    "cleanupInterval": 60.0
  },
  "metrics": {
    "process_memory_mb": 125.4,
    "broadcaster_memory_estimate_mb": 12.3,
    "expired_events_cleaned": 342,
    "dead_queues_cleaned": 5,
    "sessions_expired": 3,
    "cleanup_count": 120,
    "last_cleanup_time": 1696857180.5
  }
}
```

## Event Types

### Chat & Message Events

#### `message_regenerating`
**Description**: Indicates regeneration of a message has started.

**Data Structure**:
```json
{
  "messageId": "msg_550e8400",
  "sessionId": "session_e29b41d4",
  "taskId": "task_a716446",
  "originalMessageId": "msg_previous",
  "userQuery": "Can you explain that better?",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

#### `regeneration_progress`
**Description**: Progress update during message regeneration.

**Data Structure**:
```json
{
  "messageId": "msg_550e8400",
  "sessionId": "session_e29b41d4",
  "taskId": "task_a716446",
  "progress": 45.5,
  "message": "Analyzing context",
  "partialContent": "Based on your question, I can explain...",
  "timestamp": "2025-10-09T12:00:15Z"
}
```

**Progress Field**: 0.0 to 100.0 (percentage)

#### `message_regenerated`
**Description**: Message regeneration completed successfully.

**Data Structure**:
```json
{
  "messageId": "msg_550e8400",
  "sessionId": "session_e29b41d4",
  "taskId": "task_a716446",
  "content": "Here's a better explanation: ...",
  "timestamp": "2025-10-09T12:00:45Z"
}
```

#### `regeneration_error`
**Description**: Message regeneration failed.

**Data Structure**:
```json
{
  "messageId": "msg_550e8400",
  "sessionId": "session_e29b41d4",
  "taskId": "task_a716446",
  "error": "AI model timeout after 30s",
  "timestamp": "2025-10-09T12:00:45Z"
}
```

#### `message_edited`
**Description**: Message content was edited by user.

**Data Structure**:
```json
{
  "messageId": "msg_550e8400",
  "sessionId": "session_e29b41d4",
  "content": "Updated message content",
  "previousContent": "Original message content",
  "edited": true,
  "timestamp": "2025-10-09T12:05:00Z"
}
```

#### `message_deleted`
**Description**: One or more messages were deleted.

**Data Structure**:
```json
{
  "messageId": "msg_550e8400",
  "sessionId": "session_e29b41d4",
  "deletedCount": 3,
  "deletedMessageIds": ["msg_1", "msg_2", "msg_3"],
  "timestamp": "2025-10-09T12:10:00Z"
}
```

### Thought Process Events

#### `thought_process_start`
**Description**: AI begins thinking about the request.

**Data Structure**:
```json
{
  "messageId": "msg_550e8400",
  "sessionId": "session_e29b41d4",
  "taskId": "task_a716446",
  "thinkingAbout": "User's complex query about quantum mechanics",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

#### `thought_process_step`
**Description**: AI reasoning step during processing.

**Data Structure**:
```json
{
  "messageId": "msg_550e8400",
  "sessionId": "session_e29b41d4",
  "taskId": "task_a716446",
  "step": "Knowledge retrieval",
  "reasoning": "Searching for relevant quantum physics concepts in knowledge base",
  "timestamp": "2025-10-09T12:00:05Z"
}
```

#### `thought_process_complete`
**Description**: AI thinking process finished.

**Data Structure**:
```json
{
  "messageId": "msg_550e8400",
  "sessionId": "session_e29b41d4",
  "taskId": "task_a716446",
  "conclusion": "Generated comprehensive response based on physics knowledge",
  "totalSteps": 5,
  "steps": ["Query understanding", "Knowledge retrieval", "Context synthesis", "Response generation", "Verification"],
  "timestamp": "2025-10-09T12:00:45Z"
}
```

### System Events

#### `connection_status`
**Description**: Connection state change.

**Data Structure**:
```json
{
  "sessionId": "session_e29b41d4",
  "status": "connected",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

**Status Values**: `"connected"`, `"disconnected"`, `"reconnecting"`

#### `session_updated`
**Description**: Session state has changed.

**Data Structure**:
```json
{
  "sessionId": "session_e29b41d4",
  "status": "active",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

#### `keepalive`
**Description**: Heartbeat to maintain connection.

**Data Structure**:
```json
{
  "timestamp": "2025-10-09T12:00:30Z",
  "type": "keepalive"
}
```

**Frequency**: Every 30 seconds of inactivity

#### `error`
**Description**: Error notification.

**Data Structure**:
```json
{
  "sessionId": "session_e29b41d4",
  "error": "Failed to process request",
  "errorCode": "AI_TIMEOUT",
  "timestamp": "2025-10-09T12:05:00Z"
}
```

### Agent Network Events

#### `agent_network_update`
**Description**: Agent status or property changed.

**Data Structure**:
```json
{
  "agentId": "agent_researcher",
  "status": "processing",
  "metadata": {
    "cpuUsage": 45.2,
    "memoryUsage": 128.5,
    "taskCount": 3
  },
  "timestamp": "2025-10-09T12:00:00Z"
}
```

#### `agent_start`
**Description**: Agent began executing a task.

**Data Structure**:
```json
{
  "agentId": "agent_coder",
  "taskId": "task_123",
  "taskDescription": "Generate Python code for data analysis",
  "timestamp": "2025-10-09T12:00:00Z"
}
```

#### `agent_complete`
**Description**: Agent completed a task.

**Data Structure**:
```json
{
  "agentId": "agent_coder",
  "taskId": "task_123",
  "result": "success",
  "duration": 15.3,
  "timestamp": "2025-10-09T12:00:15Z"
}
```

## Data Structures

### SSEEvent Object

```typescript
interface SSEEvent {
  type: string;              // Event type identifier
  data: Record<string, any>; // Event payload
  id?: string;               // Optional event ID for client-side tracking
  retry?: number;            // Optional reconnection delay hint (ms)
  ttl?: number;              // Optional time-to-live (seconds)
  created_at: number;        // Unix timestamp
}
```

### AgentNetworkEvent (Frontend)

```typescript
interface AgentNetworkEvent {
  type: 'connection' | 'message_regenerated' | 'agent_network_update' | ...; // Event type
  data: {
    timestamp: string;       // ISO 8601 timestamp
    [key: string]: any;      // Event-specific data
  };
}
```

### Session Object

```python
class Session:
    id: str                  # Session UUID
    user_id: str            # User identifier
    app_name: str           # Application name
    created_at: datetime    # Creation timestamp
    last_activity: datetime # Last activity timestamp
    metadata: dict          # Custom session data
```

## Authentication

### JWT Token Authentication

**Header Format**:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImV4cCI6MTY5Njg2MDAwMH0.signature
```

**Cookie Format** (Preferred):
```http
Cookie: vana_access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Claims**:
```json
{
  "sub": "user_123",           // Subject (user ID)
  "exp": 1696860000,           // Expiration timestamp
  "iat": 1696856400,           // Issued at timestamp
  "email": "user@example.com", // User email
  "roles": ["user"],           // User roles
  "session_id": "session_456"  // Optional session ID
}
```

### Authentication Flow

1. **Client** sends request with JWT in cookie or header
2. **Proxy** (Next.js) extracts token from cookie
3. **Proxy** adds `Authorization: Bearer {token}` header
4. **Backend** validates JWT signature and expiration
5. **Backend** extracts user from token claims
6. **Backend** authorizes access to session
7. **Backend** sends SSE stream

### Development Mode

**Environment**: `REQUIRE_SSE_AUTH=false`

**Behavior**:
- Authentication optional
- Allows anonymous connections
- Access logged but not blocked
- **WARNING**: Never use in production

## Error Codes

### HTTP Errors

| Code | Name | Description | Resolution |
|------|------|-------------|------------|
| 401 | Unauthorized | Missing or invalid JWT token | Provide valid authentication |
| 403 | Forbidden | User not authorized for session | Check session ownership |
| 404 | Not Found | Session does not exist | Create session first |
| 429 | Too Many Requests | Rate limit exceeded | Wait and retry with backoff |
| 500 | Internal Server Error | Broadcaster or backend error | Check logs, retry |
| 503 | Service Unavailable | System overloaded | Retry with exponential backoff |

### SSE Error Events

| Error Code | Description | Resolution |
|------------|-------------|------------|
| `AI_TIMEOUT` | AI model timed out | Retry with simpler query |
| `AI_OVERLOADED` | AI service at capacity | Retry after delay |
| `RATE_LIMITED` | Too many requests | Reduce request rate |
| `SESSION_EXPIRED` | Session TTL exceeded | Create new session |
| `INVALID_SESSION` | Session ID malformed | Check session ID format |
| `BROADCAST_FAILED` | Failed to send event | Check broadcaster health |
| `QUEUE_FULL` | Subscriber queue full | Client consuming events too slowly |

### Example Error Handling

```typescript
const { error, lastEvent } = useSSE(`/agent_network_sse/${sessionId}`);

useEffect(() => {
  if (error) {
    if (error.includes('401')) {
      // Re-authenticate
      redirectToLogin();
    } else if (error.includes('429')) {
      // Rate limited - back off
      setTimeout(() => reconnect(), 60000);
    } else {
      // Other errors - retry
      reconnect();
    }
  }

  if (lastEvent?.type === 'error') {
    const errorCode = lastEvent.data.errorCode;

    switch (errorCode) {
      case 'AI_TIMEOUT':
        showNotification('Request timed out. Please try again.');
        break;
      case 'QUEUE_FULL':
        showNotification('Events coming too fast. Please slow down.');
        break;
    }
  }
}, [error, lastEvent]);
```

## Rate Limiting

### Default Limits

| Resource | Limit | Window | Scope |
|----------|-------|--------|-------|
| SSE Connections | 10 | Per user | Concurrent |
| API Endpoints | 100 | 60 seconds | Per user |
| Events Broadcast | 1,000 | 60 seconds | Per session |
| Session Creation | 20 | 60 seconds | Per user |

### Rate Limit Headers

**Response Headers**:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1696857240
Retry-After: 45
```

### Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "error": "Rate limit exceeded",
  "limit": 100,
  "window": "60s",
  "retryAfter": 60,
  "timestamp": "2025-10-09T12:00:00Z"
}
```

### Best Practices

1. **Exponential Backoff**: Double delay on each retry
2. **Respect Retry-After**: Wait specified seconds before retrying
3. **Connection Pooling**: Reuse SSE connections
4. **Batch Requests**: Combine multiple operations
5. **Cache Results**: Avoid redundant requests

---

**Next Steps**: See [SSE-Troubleshooting.md](./SSE-Troubleshooting.md) for debugging guidance.
