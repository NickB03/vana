# Vana API Documentation

## Overview

The Vana API provides endpoints for multi-agent AI research workflows with persistent session management, health monitoring, and real-time streaming capabilities.

## Base URLs

- **Development**: `https://vana-dev-960076421399.us-central1.run.app`
- **Production**: `https://vana-prod-960076421399.us-central1.run.app`
- **Local Development**: `http://localhost:8000`

## Authentication

Currently, the API uses Google Cloud IAM for service-to-service authentication. For client applications, ensure proper CORS configuration.

## Core Endpoints

### Health Check

#### `GET /health`

Provides comprehensive service validation and health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-03T10:30:00.000Z",
  "service": "vana",
  "version": "1.0.0",
  "session_storage_enabled": true
}
```

**Status Codes:**
- `200`: Service is healthy
- `503`: Service is unhealthy

**Use Cases:**
- Load balancer health checks
- Service monitoring
- Connection validation
- Deployment verification

---

### Session Management

#### `POST /api/apps/{app}/users/{user}/sessions`

Creates a new session for a user.

**Parameters:**
- `app` (path): Application identifier (default: "app")
- `user` (path): User identifier

**Request Body:**
```json
{
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "sessionId": "generated-session-id",
  "created": "2025-08-03T10:30:00.000Z",
  "status": "active"
}
```

**Notes:**
- Sessions are now persisted in Google Cloud Storage
- Sessions survive server restarts and deployments
- Automatic cleanup of expired sessions

---

### Agent Execution

#### `POST /api/run_sse`

Executes agent workflow with Server-Sent Events streaming.

**Request Body:**
```json
{
  "appName": "app",
  "userId": "user123",
  "sessionId": "session456",
  "newMessage": {
    "parts": [{"text": "Research the latest AI trends"}],
    "role": "user"
  },
  "streaming": true
}
```

**Response:**
Server-Sent Events stream with the following event types:

**Event: `thinking_step`**
```json
{
  "type": "thinking_step",
  "data": {
    "agent": "section_researcher",
    "action": "Searching for AI trends",
    "status": "active",
    "timestamp": "2025-08-03T10:30:00.000Z"
  }
}
```

**Event: `message_part`**
```json
{
  "type": "message_part",
  "data": {
    "content": "# AI Trends Research Report\n\n",
    "isComplete": false
  }
}
```

**Event: `final_response`**
```json
{
  "type": "final_response",
  "data": {
    "content": "Complete research report...",
    "metadata": {
      "sources": 12,
      "duration": 45.2,
      "agent_activities": [...]
    }
  }
}
```

**Connection Headers:**
```
Accept: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

---

### Feedback Collection

#### `POST /feedback`

Collects user feedback for improving agent responses.

**Request Body:**
```json
{
  "sessionId": "session123",
  "messageId": "msg456",
  "type": "positive",
  "feedback": "Great response!",
  "metadata": {
    "agent": "report_composer",
    "timestamp": "2025-08-03T10:30:00.000Z"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "feedbackId": "feedback789"
}
```

---

### Application Information

#### `GET /api/apps`

Lists available applications and their configurations.

**Response:**
```json
{
  "apps": [
    {
      "name": "app",
      "description": "Vana Multi-Agent Research System",
      "agents": [
        "interactive_planner_agent",
        "section_researcher",
        "report_composer_with_citations"
      ],
      "capabilities": [
        "research_planning",
        "web_search",
        "report_generation",
        "citation_management"
      ]
    }
  ]
}
```

---

## Enhanced Features (v1.0.0)

### Session Persistence

**Storage Backend**: Google Cloud Storage
- **Bucket**: `gs://{project_id}-vana-session-storage`
- **Auto-Creation**: Bucket created automatically during startup
- **Retention**: Configurable session retention policies

**Session Data Structure**:
```json
{
  "sessionId": "session123",
  "userId": "user456",
  "appName": "app",
  "created": "2025-08-03T10:00:00.000Z",
  "lastActivity": "2025-08-03T10:30:00.000Z",
  "messages": [...],
  "state": {...},
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "source": "frontend"
  }
}
```

### Health Monitoring

**Health Check Details**:
- **Service Status**: Overall service health
- **Timestamp**: Current server time
- **Version**: Application version
- **Session Storage**: Availability of persistent storage
- **Dependencies**: Status of external services (future)

**Monitoring Integration**:
- Cloud Run health checks
- Load balancer health probes
- Monitoring system integration
- Alerting on health failures

### Error Handling

**Enhanced Error Responses**:
```json
{
  "error": {
    "code": "INVALID_SESSION",
    "message": "Session not found or expired",
    "details": {
      "sessionId": "invalid-session",
      "suggestion": "Create a new session"
    },
    "timestamp": "2025-08-03T10:30:00.000Z",
    "requestId": "req-123"
  }
}
```

**Common Error Codes**:
- `INVALID_SESSION`: Session not found or expired
- `RATE_LIMITED`: Too many requests
- `SERVICE_UNAVAILABLE`: Backend service issue
- `VALIDATION_ERROR`: Invalid request data
- `TIMEOUT`: Request timeout exceeded

### Performance Optimizations

**Memory Management**:
- WeakMap-based service factory
- Automatic resource cleanup
- Connection pooling

**Connection Handling**:
- Configurable timeouts
- Retry logic with exponential backoff
- Graceful degradation

## Client Integration

### Frontend Environment Variables

```bash
# API Configuration
VITE_API_URL=https://your-api-url
VITE_APP_NAME=app

# Performance Tuning
VITE_MAX_RETRIES=5
VITE_RETRY_DELAY=1000
VITE_TIMEOUT=30000
VITE_ENABLE_LOGGING=false  # Disable in production
```

### JavaScript Client Example

```javascript
class VanaClient {
  constructor(apiUrl, appName, options = {}) {
    this.apiUrl = apiUrl;
    this.appName = appName;
    this.maxRetries = options.maxRetries || 5;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 30000;
  }

  async checkHealth() {
    const response = await fetch(`${this.apiUrl}/health`);
    return response.json();
  }

  async createSession(userId) {
    const response = await fetch(
      `${this.apiUrl}/api/apps/${this.appName}/users/${userId}/sessions`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return response.json();
  }

  async runAgent(userId, sessionId, message) {
    const eventSource = new EventSource(`${this.apiUrl}/api/run_sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName: this.appName,
        userId,
        sessionId,
        newMessage: message,
        streaming: true
      })
    });

    return new Promise((resolve, reject) => {
      const events = [];
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        events.push(data);
        
        if (data.type === 'final_response') {
          eventSource.close();
          resolve(events);
        }
      };
      
      eventSource.onerror = (error) => {
        eventSource.close();
        reject(error);
      };
    });
  }

  async submitFeedback(sessionId, messageId, type, feedback) {
    const response = await fetch(`${this.apiUrl}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messageId,
        type,
        feedback,
        metadata: {
          timestamp: new Date().toISOString()
        }
      })
    });
    return response.json();
  }
}

// Usage
const client = new VanaClient('http://localhost:8000', 'app');

// Check service health
const health = await client.checkHealth();
console.log('Service status:', health.status);

// Create session and run agent
const session = await client.createSession('user123');
const events = await client.runAgent('user123', session.sessionId, {
  parts: [{ text: 'Research AI trends' }],
  role: 'user'
});
```

## Rate Limiting and Quotas

**Current Limits** (subject to change):
- **Requests per minute**: 100 per user
- **Concurrent sessions**: 10 per user
- **Message length**: 10,000 characters
- **Session duration**: 24 hours

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## WebSocket Support (Future)

While currently using Server-Sent Events, future versions may include WebSocket support for bidirectional communication:

```javascript
// Future WebSocket implementation
const ws = new WebSocket('wss://api-url/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'agent_request',
    data: { message: 'Research AI trends' }
  }));
};
```

## Troubleshooting

### Common Issues

**Session Not Found**:
- Verify session was created successfully
- Check session hasn't expired
- Ensure session storage is available

**Connection Timeout**:
- Check network connectivity
- Verify API URL is correct
- Consider increasing timeout values

**Health Check Failures**:
- Check service status page
- Verify backend services are running
- Contact support if issues persist

### Debug Mode

Enable debug logging in development:
```bash
VITE_ENABLE_LOGGING=true
```

This provides detailed logs of:
- API requests and responses
- SSE connection events
- Error details and stack traces
- Performance metrics

---

*For additional API information or support, please refer to the main documentation or contact the development team.*