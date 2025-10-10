# Server-Sent Events (SSE) Implementation Overview

## Executive Summary

Vana implements a production-grade Server-Sent Events (SSE) system for real-time, unidirectional communication from backend to frontend. The architecture is designed with enterprise requirements in mind: memory leak prevention, automatic resource cleanup, session persistence, and horizontal scalability.

### Key Features

- **Memory-Safe Architecture**: Bounded queues, TTL-based expiration, automatic cleanup
- **Real-Time Streaming**: Sub-second latency for agent status updates and chat responses
- **Session Persistence**: Cross-request state management with GCS backup
- **Security-First**: JWT authentication, token protection, audit logging
- **Production-Ready**: Metrics, monitoring, graceful degradation, reconnection logic
- **Horizontal Scalability**: Session-based routing, stateless design

### Use Cases

1. **Chat Interface**: Streaming AI responses with thinking status indicators
2. **Agent Network Monitoring**: Real-time agent status and performance metrics
3. **Message Operations**: Live updates for regeneration, editing, deletion
4. **Thought Process Tracking**: Step-by-step AI reasoning visualization
5. **System Events**: Connection status, errors, session updates

### Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Event Latency | <100ms | From broadcast to client receive |
| Max Concurrent Connections | 10,000+ | Per instance with default config |
| Memory per Session | ~500KB | With default history limits |
| Throughput | 10,000 events/sec | Single instance benchmark |
| Reconnection Time | <2s | Exponential backoff with jitter |
| Event TTL | 5 minutes | Configurable per event type |
| Session TTL | 30 minutes | Auto-cleanup for inactive sessions |

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  useSSE Hook                                        │   │
│  │  - Connection management                            │   │
│  │  - Automatic reconnection                           │   │
│  │  - Event parsing and distribution                   │   │
│  └──────────────────┬──────────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────────┘
                      │
                      │ EventSource / Fetch API
                      │ (text/event-stream)
                      │
┌────────────────────┼─────────────────────────────────────────┐
│                    ▼                                          │
│               API Gateway / Proxy                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  /api/sse/* → Next.js API Routes                    │   │
│  │  - JWT token extraction from cookies                │   │
│  │  - Authorization header injection                   │   │
│  │  - Upstream forwarding                              │   │
│  └──────────────────┬──────────────────────────────────┘   │
└────────────────────┼─────────────────────────────────────────┘
                      │
                      │ HTTP with Authorization header
                      │
┌────────────────────┼─────────────────────────────────────────┐
│                    ▼          FastAPI Backend                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  SSE Endpoints                                      │   │
│  │  - /agent_network_sse/{session_id}                  │   │
│  │  - /apps/{app}/users/{user}/sessions/{id}/run      │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │  EnhancedSSEBroadcaster (Singleton)                 │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │  SessionManager                            │    │   │
│  │  │  - Active session tracking                 │    │   │
│  │  │  - Subscriber counting                     │    │   │
│  │  │  - TTL-based expiration                    │    │   │
│  │  └────────────────────────────────────────────┘    │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │  Memory-Optimized Queues                   │    │   │
│  │  │  - Per-session subscriber queues           │    │   │
│  │  │  - Bounded size (1000 events default)      │    │   │
│  │  │  - Async event delivery                    │    │   │
│  │  └────────────────────────────────────────────┘    │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │  Event History (Bounded Deques)            │    │   │
│  │  │  - 500 events per session (default)        │    │   │
│  │  │  - TTL-based expiration                    │    │   │
│  │  │  - Automatic cleanup                       │    │   │
│  │  └────────────────────────────────────────────┘    │   │
│  │  ┌────────────────────────────────────────────┐    │   │
│  │  │  Background Cleanup Task                   │    │   │
│  │  │  - Runs every 60 seconds                   │    │   │
│  │  │  - Removes expired events                  │    │   │
│  │  │  - Closes stale queues                     │    │   │
│  │  │  - Updates metrics                         │    │   │
│  │  └────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
│                     │                                        │
│  ┌──────────────────▼──────────────────────────────────┐   │
│  │  Session Store (GCS-backed SQLite)                  │   │
│  │  - Persistent session data                          │   │
│  │  - Event snapshots for recovery                     │   │
│  │  - Periodic GCS backups                             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. Frontend SSE Client (`useSSE` Hook)

**Location**: `frontend/src/hooks/useSSE.ts`

**Responsibilities**:
- Establish and maintain SSE connections
- Parse incoming event streams
- Handle reconnection with exponential backoff
- Manage connection state
- Route events to application components

**Key Features**:
- Fetch-based streaming (not native EventSource) for custom header support
- Automatic token injection via proxy
- Connection state management (disconnected, connecting, connected, error, reconnecting)
- Configurable retry logic with backoff
- Event buffering and parsing
- Memory leak prevention via cleanup handlers

#### 2. API Gateway / Proxy Layer

**Location**: `frontend/src/app/api/sse/`

**Responsibilities**:
- Extract JWT tokens from HTTP-only cookies
- Inject Authorization headers for upstream requests
- Forward SSE streams without buffering
- Handle authentication errors gracefully

**Security Benefits**:
- No JWT tokens in browser-visible URLs
- Protection against XSS token harvesting
- Defense against MITM URL-based token sniffing
- Secure cookie-based authentication

#### 3. Backend SSE Endpoints

**Location**: `app/server.py`, `app/routes/adk_routes.py`

**Endpoints**:
- `GET /agent_network_sse/{session_id}` - Agent network events
- `GET /apps/{app}/users/{user}/sessions/{session_id}/run` - ADK-compliant chat stream

**Features**:
- JWT authentication (configurable via `REQUIRE_SSE_AUTH`)
- Audit logging for compliance
- Connection/disconnection events
- Heartbeat/keepalive messages (30s interval)
- Error handling with graceful degradation

#### 4. EnhancedSSEBroadcaster

**Location**: `app/utils/sse_broadcaster.py`

**Core Innovation**: Memory-leak-free event broadcasting with automatic resource management

**Architecture**:

```python
EnhancedSSEBroadcaster
├── SessionManager
│   ├── Active sessions dict (session_id → last_activity)
│   ├── Subscriber counts (session_id → count)
│   └── Background tasks (session_id → asyncio.Task)
├── Subscriber Queues (per session)
│   ├── MemoryOptimizedQueue instances
│   ├── Bounded size (1000 events default)
│   └── TTL-based staleness detection
├── Event History (per session)
│   ├── Bounded deque (500 events default)
│   ├── TTL-based expiration
│   └── New subscriber replay (last 10 events)
├── Background Cleanup Task
│   ├── Periodic execution (60s interval)
│   ├── Expired event removal
│   ├── Stale queue cleanup
│   └── Session expiration
└── Memory Metrics
    ├── Process memory tracking (psutil)
    ├── Event count monitoring
    ├── Subscriber count tracking
    └── Warning thresholds
```

**Memory Safety Features**:

1. **Bounded Queues**: Hard limits on queue size prevent unbounded growth
2. **Event TTL**: Time-based expiration removes stale events automatically
3. **Session TTL**: Inactive sessions cleaned up after 30 minutes
4. **Deque-based History**: Fixed-size circular buffers for event history
5. **Automatic Cleanup**: Background task removes expired resources
6. **Subscriber Tracking**: Proper increment/decrement prevents leaks
7. **Context Managers**: Ensures cleanup even on exceptions
8. **Weakref Usage**: Allows garbage collection of dead objects

#### 5. Event Types and Payloads

**Location**: `app/utils/sse_events.py`

**Standardized Event Types**:

| Event Type | Use Case | Data Structure |
|------------|----------|----------------|
| `message_regenerating` | Start of message regeneration | `{messageId, sessionId, taskId, originalMessageId, userQuery}` |
| `regeneration_progress` | Regeneration progress updates | `{messageId, progress: 0-100, message, partialContent}` |
| `message_regenerated` | Regeneration complete | `{messageId, content, timestamp}` |
| `regeneration_error` | Regeneration failure | `{messageId, error, timestamp}` |
| `message_edited` | Message content edited | `{messageId, content, previousContent, edited: true}` |
| `message_deleted` | Message(s) deleted | `{messageId, deletedCount, deletedMessageIds[]}` |
| `feedback_submitted` | User feedback recorded | `{messageId, feedbackId, feedbackType}` |
| `thought_process_start` | AI thinking begins | `{messageId, taskId, thinkingAbout}` |
| `thought_process_step` | AI reasoning step | `{messageId, step, reasoning}` |
| `thought_process_complete` | Thinking complete | `{messageId, conclusion, totalSteps, steps[]}` |
| `session_updated` | Session state change | `{sessionId, status}` |
| `connection_status` | Connection event | `{sessionId, status: 'connected'|'disconnected'}` |
| `error` | Error notification | `{sessionId, error, errorCode?}` |
| `keepalive` | Connection maintenance | `{timestamp}` |

**Event Builders**:
- `SSEEventBuilder` - Static methods for creating standardized events
- `ThoughtProcessTracker` - Helper for tracking multi-step AI reasoning
- `ProgressTracker` - Helper for tracking long-running operations

## Data Flow

### 1. Chat Message Flow (User → AI Response)

```
User Input (Frontend)
    ↓
POST /apps/{app}/users/{user}/sessions/{session}/run
    ↓
FastAPI route handler
    ↓
ADK Agent processing
    ↓
Multiple SSE events broadcasted:
    1. thought_process_start
    2. thought_process_step (multiple)
    3. regeneration_progress (multiple)
    4. message_regenerated
    ↓
EnhancedSSEBroadcaster.broadcast_event()
    ↓
MemoryOptimizedQueue.put() → All subscribers
    ↓
SSE endpoint generator yields events
    ↓
Frontend EventSource receives events
    ↓
useSSE hook parses and distributes
    ↓
React components update UI
```

### 2. Agent Network Updates

```
ADK Agent state change
    ↓
broadcast_agent_network_update()
    ↓
EnhancedSSEBroadcaster.broadcast_agent_network_event()
    ↓
Event added to session history
    ↓
Event queued for all session subscribers
    ↓
Frontend receives via /agent_network_sse/{session_id}
    ↓
UI updates agent status display
```

### 3. Message Action (Edit/Delete/Regenerate)

```
User action (e.g., regenerate button)
    ↓
POST /api/chat_actions/regenerate
    ↓
ProgressTracker created
    ↓
SSEEventBuilder.message_regeneration_started()
    ↓
Broadcast event to session
    ↓
AI processing with progress updates
    ↓
SSEEventBuilder.regeneration_progress() (multiple)
    ↓
On completion:
SSEEventBuilder.message_regenerated()
    ↓
Frontend updates message in chat history
```

## Session Lifecycle

### Session Creation

1. Frontend generates unique session ID (UUID)
2. First SSE connection triggers session creation in SessionManager
3. Empty event history deque allocated
4. Subscriber count initialized to 0
5. Session timestamp recorded

### Active Session

1. Multiple SSE connections can share same session
2. Each connection increments subscriber count
3. Events broadcasted to all session subscribers
4. Session timestamp updated on activity
5. Event history maintained for late joiners

### Session Cleanup

**Triggered by**:
- No subscribers AND session TTL exceeded (30min default)
- Manual session reset
- Application shutdown

**Cleanup Steps**:
1. Close all subscriber queues
2. Clear event history
3. Remove from SessionManager
4. Update metrics
5. Log session end

## Security Model

### Authentication Flow

```
Client Request
    ↓
JWT in HTTP-only cookie OR x-auth-token header
    ↓
Next.js API Route (/api/sse/*)
    ↓
Extract token from cookies (primary)
    ↓
OR use x-auth-token header (fallback)
    ↓
Inject Authorization: Bearer {token}
    ↓
Forward to FastAPI backend
    ↓
JWT validation (app/auth/security.py)
    ↓
current_active_user_dep → User object
    ↓
SSE endpoint authorized
```

### Security Features

1. **No Tokens in URLs**: Prevents browser history/log leakage
2. **HTTP-Only Cookies**: XSS-resistant token storage
3. **Secure Headers**: HTTPS enforcement in production
4. **CORS Validation**: Origin checking for cross-site protection
5. **Audit Logging**: Structured logs for compliance
6. **Rate Limiting**: Prevents abuse (100 req/min default)
7. **Session Isolation**: Users can only access their sessions
8. **Token Rotation**: Short-lived JWT with refresh tokens

### Authentication Modes

**Production** (`REQUIRE_SSE_AUTH=true`):
- JWT required for all SSE connections
- 401 Unauthorized if missing/invalid token
- Audit logging enabled
- Rate limiting enforced

**Development** (`REQUIRE_SSE_AUTH=false`):
- Optional authentication
- Allows anonymous connections for testing
- Still logs access for debugging
- Warning logged if used in production

## Deployment Considerations

### Cloud Run Deployment

**Challenges**:
- Ephemeral instances (can restart anytime)
- No persistent local storage
- Horizontal scaling (multiple instances)

**Solutions**:
1. **Session Persistence**: GCS-backed SQLite with periodic backups
2. **Stateless Design**: Session ID in URL for routing
3. **Health Checks**: `/health` endpoint with session count
4. **Graceful Shutdown**: Cleanup background tasks on SIGTERM
5. **Instance Affinity**: Session-based routing where possible

### Horizontal Scaling

**Strategy**: Session-based routing with shared persistence

```
Load Balancer (Session ID hash routing)
    ↓
┌──────────┬──────────┬──────────┐
│Instance 1│Instance 2│Instance 3│
└────┬─────┴────┬─────┴────┬─────┘
     │          │          │
     └──────────┼──────────┘
                │
         GCS Session Store
       (Shared persistence)
```

**Consistency**:
- Each session routes to same instance (sticky sessions)
- Session state persisted to GCS for recovery
- Event history replicated on instance migration
- Background cleanup coordinated via GCS locks

## Monitoring and Metrics

### Key Metrics

**Broadcaster Stats** (Available via `get_stats()`):

```python
{
  "totalSessions": 42,           # Active sessions
  "totalSubscribers": 89,        # Active SSE connections
  "totalEvents": 15234,          # Events in history
  "memoryUsageMB": 125.4,        # Process memory
  "sessionStats": {              # Per-session details
    "session-123": {
      "subscribers": 2,
      "historySize": 347
    }
  },
  "config": {                    # Current configuration
    "maxQueueSize": 1000,
    "maxHistoryPerSession": 500,
    "eventTTL": 300.0,
    "sessionTTL": 1800.0
  },
  "metrics": {                   # Operational metrics
    "process_memory_mb": 125.4,
    "broadcaster_memory_estimate_mb": 12.3,
    "expired_events_cleaned": 342,
    "dead_queues_cleaned": 5,
    "sessions_expired": 3,
    "cleanup_count": 120
  }
}
```

### Health Check

**Endpoint**: `GET /health`

**Returns**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-09T12:00:00Z",
  "service": "vana",
  "version": "1.0.0",
  "system_metrics": {
    "memory": {
      "total": 8589934592,
      "available": 4294967296,
      "percent": 50.0
    },
    "cpu_percent": 15.2
  },
  "dependencies": {
    "google_api_configured": true,
    "session_storage": true,
    "cloud_logging": true
  }
}
```

### Logging

**Structured Logging** (Google Cloud Logging):

```python
logger.log_struct({
  "message": "SSE connection established",
  "user_id": "user_123",
  "session_id": "session_456",
  "authenticated": true,
  "timestamp": "2025-10-09T12:00:00Z",
  "access_type": "sse_connection"
}, severity="INFO")
```

**Log Levels**:
- **INFO**: Connection events, session lifecycle
- **WARNING**: High memory usage, slow cleanup, authentication failures
- **ERROR**: Stream errors, broadcast failures, critical issues

## Performance Optimization

### Frontend Optimizations

1. **Event Batching**: Group rapid updates (e.g., progress bars)
2. **React.memo**: Prevent unnecessary re-renders
3. **useCallback**: Stable event handler references
4. **Debouncing**: Rate-limit UI updates for rapid events
5. **Virtual Scrolling**: For long message histories
6. **Lazy Loading**: Load SSE components on demand

### Backend Optimizations

1. **Bounded Queues**: Prevent memory exhaustion
2. **Event TTL**: Automatic cleanup of stale data
3. **Background Cleanup**: Periodic resource reclamation
4. **Asyncio**: Non-blocking event distribution
5. **Weak References**: Allow garbage collection
6. **Batch Broadcasting**: Single event → multiple subscribers efficiently

### Network Optimizations

1. **Compression**: Gzip for large event payloads
2. **Keepalive**: 30s heartbeat to maintain connections
3. **Event ID**: Client-side deduplication
4. **Retry Header**: Server-suggested reconnection delay
5. **Edge Caching**: CDN for static assets, not SSE streams

## Quick Start

### Frontend Usage

```typescript
import { useSSE } from '@/hooks/useSSE';

function ChatComponent({ sessionId }: { sessionId: string }) {
  const {
    connectionState,
    lastEvent,
    events,
    isConnected
  } = useSSE(`/agent_network_sse/${sessionId}`, {
    autoReconnect: true,
    maxReconnectAttempts: 5
  });

  return (
    <div>
      <ConnectionStatus connected={isConnected} />
      <MessageList events={events.filter(e => e.type === 'message_regenerated')} />
    </div>
  );
}
```

### Backend Broadcasting

```python
from app.utils.sse_broadcaster import get_sse_broadcaster

async def send_chat_response(session_id: str, message: str):
    broadcaster = get_sse_broadcaster()

    await broadcaster.broadcast_event(session_id, {
        'type': 'message_regenerated',
        'data': {
            'messageId': str(uuid.uuid4()),
            'content': message,
            'timestamp': datetime.utcnow().isoformat()
        }
    })
```

## Next Steps

For detailed implementation guidance, see:

- [SSE Implementation Guide](./SSE-Implementation-Guide.md) - Code examples and patterns
- [SSE API Reference](./SSE-API-Reference.md) - Complete endpoint documentation
- [SSE Troubleshooting Guide](./SSE-Troubleshooting.md) - Common issues and solutions
- [SSE Configuration Guide](./SSE-Configuration.md) - Deployment and tuning

---

**Document Version**: 1.0
**Last Updated**: 2025-10-09
**Maintainer**: Vana Engineering Team
