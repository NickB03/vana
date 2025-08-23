# ADK API Reference Guide

## Overview

This document provides a comprehensive reference for the ADK (Agent Development Kit) API endpoints, data structures, and integration patterns used by the frontend.

## Base Configuration

- **Base URL**: `http://localhost:8000` (development)
- **Production URLs**:
  - Development: `https://vana-dev-960076421399.us-central1.run.app`
  - Production: `https://vana-prod-960076421399.us-central1.run.app`

## API Endpoints

### 1. Session Management

#### Create Session
Creates a new user session for agent interactions.

```http
POST /api/apps/{app_name}/users/{user_id}/sessions
```

**Parameters:**
- `app_name`: Application identifier (typically "app")
- `user_id`: User identifier (default: "u_999")

**Request:**
```json
{
  // No body required
}
```

**Response:**
```json
{
  "userId": "u_999",
  "id": "session_12345",
  "appName": "app"
}
```

**Usage Example:**
```typescript
const createSession = async () => {
  const response = await fetch('/api/apps/app/users/u_999/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to create session: ${response.status}`);
  }

  return await response.json();
};
```

### 2. Agent Execution

#### Run Agent with SSE
Executes the agent and returns responses via Server-Sent Events.

```http
POST /api/run_sse
```

**Request Body:**
```json
{
  "appName": "app",
  "userId": "u_999",
  "sessionId": "session_12345",
  "newMessage": {
    "parts": [
      {
        "text": "What are the latest developments in AI?"
      }
    ],
    "role": "user"
  },
  "streaming": false
}
```

**Response:** Server-Sent Events stream

**SSE Event Format:**
```
data: {"content": {"parts": [{"text": "Let me research that..."}]}, "author": "interactive_planner_agent"}

data: {"content": {"parts": [{"functionCall": {"name": "search", "args": {"query": "latest AI developments 2024"}, "id": "call_123"}}]}, "author": "section_researcher"}

data: {"actions": {"stateDelta": {"final_report_with_citations": "# Latest AI Developments\n\n..."}}, "author": "report_composer_with_citations"}
```

### 3. Health Check

#### API Documentation/Health
Used to verify backend availability.

```http
GET /api/docs
```

**Response:** OpenAPI documentation (200 OK indicates healthy)

### 4. Feedback

#### Submit Feedback
Collects user feedback about agent responses.

```http
POST /feedback
```

**Request Body:**
```json
{
  "sessionId": "session_12345",
  "messageId": "msg_123",
  "rating": "positive",
  "comment": "Very helpful response"
}
```

**Response:**
```json
{
  "status": "success"
}
```

## Data Structures

### 1. Message Structure

```typescript
interface Message {
  parts: Array<{
    text: string;
  }>;
  role: "user" | "assistant";
}
```

### 2. SSE Event Structure

```typescript
interface SSEEvent {
  // Content from the agent
  content?: {
    parts: Array<{
      // Text content
      text?: string;

      // Function call
      functionCall?: {
        name: string;
        args: Record<string, any>;
        id: string;
      };

      // Function response
      functionResponse?: {
        name: string;
        response: any;
        id: string;
      };
    }>;
    role?: string;
  };

  // Agent identifier
  author: string;

  // State changes and metadata
  actions?: {
    stateDelta?: {
      research_plan?: string;
      final_report_with_citations?: string;
      url_to_short_id?: Record<string, string>;
      sources?: Array<{
        short_id: string;
        title: string;
        url: string;
        domain: string;
        supported_claims: Array<{
          text: string;
          confidence: number;
        }>;
      }>;
    };
  };

  // Token usage metrics
  usageMetadata?: {
    candidatesTokenCount: number;
    promptTokenCount: number;
    totalTokenCount: number;
  };
}
```

### 3. Agent Names and Roles

```typescript
enum AgentNames {
  // Planning and coordination
  ROOT_AGENT = "root_agent",
  INTERACTIVE_PLANNER = "interactive_planner_agent",
  PLAN_GENERATOR = "plan_generator",

  // Research execution
  SECTION_PLANNER = "section_planner",
  SECTION_RESEARCHER = "section_researcher",
  RESEARCH_EVALUATOR = "research_evaluator",
  ENHANCED_SEARCH_EXECUTOR = "enhanced_search_executor",

  // Report generation
  REPORT_COMPOSER = "report_composer_with_citations",

  // Supporting agents
  ESCALATION_CHECKER = "EscalationChecker",
  RESEARCH_PIPELINE = "research_pipeline",
  ITERATIVE_REFINEMENT = "iterative_refinement_loop"
}
```

## SSE Event Processing

### 1. Event Stream Format

SSE events follow the standard format:
```
event: message
data: <JSON data>

event: message
data: <JSON data>

```

### 2. Event Types by Agent

#### Interactive Planner Agent
Handles user interaction and plan generation.
```json
{
  "content": {
    "parts": [{"text": "I'll help you research..."}]
  },
  "author": "interactive_planner_agent"
}
```

#### Section Researcher
Performs web searches and gathers information.
```json
{
  "content": {
    "parts": [{
      "functionCall": {
        "name": "google_search",
        "args": {"query": "latest AI news"},
        "id": "call_123"
      }
    }]
  },
  "author": "section_researcher",
  "actions": {
    "stateDelta": {
      "url_to_short_id": {
        "https://example.com": "src-1"
      }
    }
  }
}
```

#### Report Composer
Generates the final report with citations.
```json
{
  "actions": {
    "stateDelta": {
      "final_report_with_citations": "# Research Report\n\n## Summary\n..."
    }
  },
  "author": "report_composer_with_citations"
}
```

## Frontend Integration Patterns

### 1. SSE Event Handler

```typescript
const handleSSEEvents = (url: string, onEvent: (event: SSEEvent) => void) => {
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch (error) {
      console.error('Failed to parse SSE event:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    eventSource.close();
  };

  return eventSource;
};
```

### 2. Retry Logic

```typescript
const retryWithBackoff = async (
  fn: () => Promise<any>,
  maxRetries: number = 10,
  maxDuration: number = 120000
): Promise<any> => {
  const startTime = Date.now();
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (Date.now() - startTime > maxDuration) {
      throw new Error(`Retry timeout after ${maxDuration}ms`);
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};
```

### 3. Session State Management

```typescript
class ADKSessionManager {
  private sessionId?: string;
  private userId?: string;
  private appName?: string;

  async ensureSession(): Promise<void> {
    if (!this.sessionId) {
      const session = await createSession();
      this.sessionId = session.id;
      this.userId = session.userId;
      this.appName = session.appName;
    }
  }

  getSessionData() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      appName: this.appName
    };
  }
}
```

## Error Handling

### 1. Common Error Scenarios

```typescript
enum ADKErrorTypes {
  SESSION_CREATION_FAILED = "SESSION_CREATION_FAILED",
  BACKEND_UNAVAILABLE = "BACKEND_UNAVAILABLE",
  SSE_PARSE_ERROR = "SSE_PARSE_ERROR",
  API_REQUEST_FAILED = "API_REQUEST_FAILED"
}

class ADKError extends Error {
  constructor(
    public type: ADKErrorTypes,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ADKError';
  }
}
```

### 2. Error Recovery Strategies

```typescript
const handleADKError = async (error: ADKError) => {
  switch (error.type) {
    case ADKErrorTypes.SESSION_CREATION_FAILED:
      // Retry session creation
      await retryWithBackoff(createSession);
      break;

    case ADKErrorTypes.BACKEND_UNAVAILABLE:
      // Show backend unavailable UI
      showBackendUnavailable();
      break;

    case ADKErrorTypes.SSE_PARSE_ERROR:
      // Log and continue processing
      console.error('SSE parse error:', error.details);
      break;

    case ADKErrorTypes.API_REQUEST_FAILED:
      // Show error message to user
      showErrorMessage(error.message);
      break;
  }
};
```

## Best Practices

### 1. API Client Implementation

```typescript
class ADKApiClient {
  private baseUrl: string;
  private sessionManager: ADKSessionManager;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
    this.sessionManager = new ADKSessionManager();
  }

  async sendMessage(message: string): Promise<EventSource> {
    await this.sessionManager.ensureSession();
    const { sessionId, userId, appName } = this.sessionManager.getSessionData();

    const response = await fetch(`${this.baseUrl}/run_sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName,
        userId,
        sessionId,
        newMessage: {
          parts: [{ text: message }],
          role: 'user'
        },
        streaming: false
      })
    });

    if (!response.ok) {
      throw new ADKError(
        ADKErrorTypes.API_REQUEST_FAILED,
        `API request failed: ${response.status}`,
        { status: response.status, statusText: response.statusText }
      );
    }

    return new EventSource(response.url);
  }
}
```

### 2. State Management

```typescript
interface ADKState {
  session: {
    id?: string;
    userId?: string;
    appName?: string;
  };
  messages: Array<{
    id: string;
    type: 'human' | 'ai';
    content: string;
    agent?: string;
    timestamp: number;
  }>;
  events: Map<string, ProcessedEvent[]>;
  isLoading: boolean;
  error?: ADKError;
}
```

### 3. Performance Considerations

1. **SSE Connection Management**
   - Close connections when component unmounts
   - Implement reconnection logic for dropped connections
   - Handle browser connection limits (6 per domain)

2. **Memory Management**
   - Clear old messages/events periodically
   - Limit stored message history
   - Use pagination for long conversations

3. **Error Boundaries**
   - Implement React error boundaries
   - Graceful degradation for failed components
   - User-friendly error messages

## Testing

### 1. Mock SSE Events

```typescript
const mockSSEEvent = (data: any): MessageEvent => {
  return new MessageEvent('message', {
    data: JSON.stringify(data)
  });
};

const testSSEHandler = () => {
  const handler = jest.fn();
  const event = mockSSEEvent({
    content: { parts: [{ text: 'Test message' }] },
    author: 'test_agent'
  });

  handleSSEEvents('test-url', handler);
  // Trigger event
  expect(handler).toHaveBeenCalledWith(expect.objectContaining({
    author: 'test_agent'
  }));
};
```

### 2. API Integration Tests

```typescript
describe('ADK API Integration', () => {
  it('should create session successfully', async () => {
    const session = await createSession();
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('userId');
    expect(session).toHaveProperty('appName');
  });

  it('should handle SSE events', async () => {
    const client = new ADKApiClient();
    const eventSource = await client.sendMessage('Test query');

    const events: SSEEvent[] = [];
    eventSource.onmessage = (e) => {
      events.push(JSON.parse(e.data));
    };

    // Wait for events
    await new Promise(resolve => setTimeout(resolve, 5000));

    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.author === 'interactive_planner_agent')).toBe(true);
  });
});
```

## Conclusion

The ADK API provides a well-structured interface for agent interactions through standard HTTP endpoints and SSE for real-time streaming. Key considerations for integration:

1. Proper session management is crucial
2. SSE event parsing must handle various agent response formats
3. Implement robust error handling and retry logic
4. Agent names are critical for UI state management
5. Follow the established message format for compatibility

This reference guide should serve as the foundation for any custom frontend implementation or integration with the ADK backend.