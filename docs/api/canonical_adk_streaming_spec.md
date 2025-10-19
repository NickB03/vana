# Canonical ADK Streaming API Specification

**Version:** 1.0
**Date:** 2025-10-19
**Status:** Production Ready (Backend), Implementation Pending (Frontend)
**Feature Flag:** `ENABLE_ADK_CANONICAL_STREAM=true`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Endpoint Specification](#endpoint-specification)
3. [Request Format](#request-format)
4. [Response Behavior](#response-behavior)
5. [Event Format](#event-format)
6. [Error Handling](#error-handling)
7. [Legacy Comparison](#legacy-comparison)
8. [Security Requirements](#security-requirements)
9. [Implementation Notes](#implementation-notes)

---

## Executive Summary

The canonical ADK streaming endpoint (`POST /run_sse`) provides a unified request-response pattern that both initiates agent execution and streams results in a single HTTP connection. This eliminates the legacy two-step pattern (POST to trigger + GET to stream) and delivers raw ADK Event JSON with zero mutation.

**Key Benefits:**
- **Simplified flow:** Single request replaces two-step pattern
- **Zero mutation:** Raw ADK events preserve full context
- **Feature parity:** Full ADK event model support
- **Backward compatible:** Legacy endpoints remain available

---

## Endpoint Specification

### Base Endpoint

```
POST /run_sse
```

**Upstream Target:** `http://127.0.0.1:8080/run_sse` (ADK service)

**Implementation:** Backend proxy with inline async generator
**File:** `app/routes/adk_routes.py:165-269`

### Feature Flag Requirement

```bash
# Backend (.env.local)
ENABLE_ADK_CANONICAL_STREAM=true

# Frontend (.env.local)
NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true
```

**Default:** `false` (safe rollout)
**When Disabled:** Returns `501 Not Implemented`

### HTTP Headers

**Request Headers:**
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
X-CSRF-Token: <csrf_token>
Accept: text/event-stream
```

**Response Headers:**
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

---

## Request Format

### TypeScript Interface

```typescript
interface RunAgentRequest {
  appName: string;          // Application identifier (e.g., "vana")
  userId: string;           // User identifier for session tracking
  sessionId: string;        // Unique session identifier
  newMessage: {             // ADK Content object
    parts: Array<{
      text: string;         // User message content
    }>;
    role: "user";          // Message role (always "user" for input)
  };
  streaming?: boolean;      // Optional: enable streaming (default: false)
  stateDelta?: Record<string, unknown>;  // Optional: state changes
  invocationId?: string;    // Optional: resume long-running functions
}
```

### Python Model

```python
# app/models.py:234-260
class RunAgentRequest(BaseModel):
    """ADK-compliant request model for running an agent with streaming support."""

    model_config = ConfigDict(populate_by_name=True)

    app_name: str = Field(..., alias="appName")
    user_id: str = Field(..., alias="userId")
    session_id: str = Field(..., alias="sessionId")
    new_message: types.Content = Field(..., alias="newMessage")
    streaming: bool = False
    state_delta: Optional[dict[str, Any]] = Field(None, alias="stateDelta")
    invocation_id: Optional[str] = Field(None, alias="invocationId")
```

### Example JSON Request

```json
{
  "appName": "vana",
  "userId": "user_123",
  "sessionId": "sess_abc_456",
  "newMessage": {
    "parts": [
      {
        "text": "Research the latest developments in quantum computing"
      }
    ],
    "role": "user"
  },
  "streaming": true
}
```

### Field Requirements

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `appName` | string | ✅ Yes | Application identifier (e.g., "vana") |
| `userId` | string | ✅ Yes | User identifier for session tracking |
| `sessionId` | string | ✅ Yes | Unique session identifier |
| `newMessage` | object | ✅ Yes | ADK Content object with parts array |
| `newMessage.parts` | array | ✅ Yes | Array of content parts (text, functionCall, etc.) |
| `newMessage.role` | string | ✅ Yes | Message role (always "user" for input) |
| `streaming` | boolean | ❌ No | Enable streaming (default: false) |
| `stateDelta` | object | ❌ No | Optional state changes to apply |
| `invocationId` | string | ❌ No | Optional ID for resuming long-running functions |

---

## Response Behavior

### Critical Architectural Insight

**The canonical endpoint BOTH starts research AND streams results in a single request.**

This is fundamentally different from the legacy pattern:
- **Legacy:** POST to `/apps/.../run` (start) → GET `/apps/.../run` (stream)
- **Canonical:** POST to `/run_sse` (start + stream simultaneously)

### Streaming Pattern

**Implementation:** Inline async generator proxies raw ADK events
**Mutation:** Zero (raw passthrough from ADK service)
**Timeout:** 300 seconds
**Buffering:** Disabled (`X-Accel-Buffering: no`)

**Python Implementation:**
```python
async def stream_adk_events():
    """Stream raw ADK Event JSON from upstream ADK service."""
    timeout_config = httpx.Timeout(300.0, read=None)

    async with httpx.AsyncClient(timeout=timeout_config) as client:
        async with client.stream(
            "POST",
            "http://127.0.0.1:8080/run_sse",
            json=request.model_dump(by_alias=True, exclude_none=True)
        ) as upstream:
            upstream.raise_for_status()

            # CRITICAL: Forward ALL lines including empty ones
            # Empty lines are SSE event delimiters
            async for line in upstream.aiter_lines():
                yield f"{line}\n"
```

### Response Lifecycle

```
1. Client opens POST /run_sse connection
2. Backend forwards to ADK service (port 8080)
3. ADK starts agent execution immediately
4. ADK streams Event JSON as execution progresses
5. Backend proxies events with zero mutation
6. Client receives raw ADK Event JSON
7. Connection closes when:
   - Agent completes execution
   - Timeout (300s) reached
   - Error occurs
   - Client disconnects
```

---

## Event Format

### SSE Wire Format

Server-Sent Events use newline-delimited format:

```
data: {"id":"evt_123","author":"research_agent","invocationId":"inv_456","timestamp":1729350000.123,"content":{"parts":[{"text":"Starting research..."}]}}

data: {"id":"evt_124","author":"research_agent","invocationId":"inv_456","timestamp":1729350001.456,"content":{"parts":[{"functionCall":{"name":"search","args":{"query":"quantum computing"}}}]}}

data: {"id":"evt_125","author":"research_agent","invocationId":"inv_456","timestamp":1729350002.789,"content":{"parts":[{"functionResponse":{"response":{"results":[...]}}}]}}

```

**Format Rules:**
- Each event starts with `data: `
- Event payload is JSON on a single line
- Events separated by blank lines (`\n\n`)
- No mutation of ADK event structure

### ADK Event Structure

**TypeScript Interface:**
```typescript
interface AdkEvent {
  id?: string;                    // Event identifier (optional)
  author: string;                 // Agent or user identifier
  invocationId: string;           // Invocation tracking ID
  timestamp: number;              // Unix timestamp (seconds, fractional)
  content?: {
    parts?: Array<
      | { text: string }                    // Text content from agent
      | { functionCall: object }            // Tool invocation request
      | { functionResponse: object }        // Tool execution result
    >;
  };
  actions?: Record<string, unknown>;  // Agent actions (e.g., transfer_to_agent)
}
```

**Example Event Types:**

**1. Agent Text Output:**
```json
{
  "id": "evt_abc_123",
  "author": "research_agent",
  "invocationId": "inv_xyz_456",
  "timestamp": 1729350000.123,
  "content": {
    "parts": [
      {
        "text": "I will research quantum computing applications for you."
      }
    ]
  }
}
```

**2. Function Call (Tool Invocation):**
```json
{
  "id": "evt_abc_124",
  "author": "research_agent",
  "invocationId": "inv_xyz_456",
  "timestamp": 1729350001.456,
  "content": {
    "parts": [
      {
        "functionCall": {
          "name": "enhanced_search",
          "args": {
            "query": "quantum computing applications 2025",
            "num_results": 10
          }
        }
      }
    ]
  }
}
```

**3. Function Response (Tool Result):**
```json
{
  "id": "evt_abc_125",
  "author": "research_agent",
  "invocationId": "inv_xyz_456",
  "timestamp": 1729350002.789,
  "content": {
    "parts": [
      {
        "functionResponse": {
          "name": "enhanced_search",
          "response": {
            "results": [
              {"title": "...", "url": "...", "snippet": "..."}
            ]
          }
        }
      }
    ]
  }
}
```

**4. Agent Transfer Action:**
```json
{
  "id": "evt_abc_126",
  "author": "coordinator_agent",
  "invocationId": "inv_xyz_456",
  "timestamp": 1729350003.012,
  "actions": {
    "transfer_to_agent": {
      "target": "research_agent",
      "reason": "Specialized research required"
    }
  }
}
```

---

## Error Handling

### Timeout Error (300s)

**HTTP Status:** 200 (stream starts successfully)
**Event Format:**
```json
{
  "error": "Request timeout after 300 seconds",
  "error_code": "TIMEOUT",
  "timestamp": 1729350300.123
}
```

### HTTP Status Errors (4xx, 5xx)

**Event Format:**
```json
{
  "error": "ADK upstream error: 500",
  "status_code": 500,
  "detail": "Internal Server Error",
  "timestamp": 1729350000.456
}
```

### Feature Flag Disabled

**HTTP Status:** `501 Not Implemented`
**Response:**
```json
{
  "detail": "ADK canonical streaming not enabled. Set ENABLE_ADK_CANONICAL_STREAM=true to use this endpoint."
}
```

### General Stream Errors

**Event Format:**
```json
{
  "error": "Stream error description",
  "error_code": "STREAM_ERROR",
  "timestamp": 1729350000.789
}
```

---

## Legacy Comparison

### Legacy Pattern (Current Default)

**Trigger Research:**
```
POST /apps/{app}/users/{user}/sessions/{session}/run
Body: {"query": "research topic"}
Response: {"success": true, "sessionId": "..."}
```

**Stream Results:**
```
GET /apps/{app}/users/{user}/sessions/{session}/run
Response: text/event-stream (custom events)
```

**Custom Event Types:**
- `research_update` - Research progress messages
- `agent_status` - Agent state changes
- `research_complete` - Final report ready

### Canonical Pattern (New)

**Start + Stream:**
```
POST /run_sse
Body: {appName, userId, sessionId, newMessage}
Response: text/event-stream (raw ADK events)
```

**Raw ADK Events:**
- Full `Event` objects from ADK
- Zero mutation or enrichment
- Complete context preservation

### Key Differences Table

| Aspect | Canonical (POST /run_sse) | Legacy (POST + GET) |
|--------|---------------------------|---------------------|
| **Request Pattern** | Single POST starts & streams | POST to start, GET to stream |
| **Connection Model** | One HTTP connection | Two separate connections |
| **Event Format** | Raw ADK Event JSON | Custom derived events |
| **Event Mutation** | Zero (raw passthrough) | Converted and enriched |
| **Feature Flag** | Requires `ENABLE_ADK_CANONICAL_STREAM=true` | Always available |
| **Implementation** | Inline async generator | Background task + broadcaster |
| **Timeout** | 300s on stream | 300s on background task |
| **Content Preservation** | Full ADK event model | Derived summaries only |
| **Backend Complexity** | Simple proxy (50 lines) | Complex orchestration (300+ lines) |

---

## Security Requirements

### Authentication

**Method:** JWT Bearer tokens
**Header:** `Authorization: Bearer <token>`
**Source:** Server-side cookies (frontend SSE proxy)
**Dev Mode:** Set `ALLOW_UNAUTHENTICATED_SSE=true` to bypass

### CSRF Protection

**Method:** Token validation on POST requests
**Header:** `X-CSRF-Token: <token>`
**Validation:** Server-side check in middleware
**Local Dev:** CSRF validation skipped for `localhost`

### Frontend SSE Proxy Pattern

**Problem:** JWT tokens must not be exposed in browser URLs

**Solution:** Server-side Next.js API route extracts tokens from cookies and forwards to backend

**Example:**
```typescript
// Frontend: POST /api/sse/run_sse
// ↓ (server-side proxy)
// Backend: POST /run_sse with Authorization header
```

**Benefits:**
- Tokens never exposed in browser network tab
- Server-side cookie access (HttpOnly, Secure)
- CSRF protection maintained
- Clean separation of concerns

---

## Implementation Notes

### Backend Implementation

**File:** `app/routes/adk_routes.py:165-269`
**Status:** ✅ Production Ready (Phase 1.1 Complete)

**Key Features:**
- Feature flag guard (501 when disabled)
- Inline async generator (no background tasks)
- 300s timeout with no read timeout (allows LLM processing gaps)
- HTTP status propagation on errors
- ADK-compliant error event format
- Raw SSE line forwarding (including empty lines)

### Frontend Implementation

**Status:** ⏳ Pending (Phase 3.3)

**Required Components:**
1. **SSE Proxy:** `frontend/src/app/api/sse/run_sse/route.ts`
   - Accept POST with RunAgentRequest body
   - Extract auth tokens from cookies
   - Forward to backend with Authorization header
   - Stream response back to client

2. **Message Handlers:** Update `frontend/src/hooks/chat/message-handlers.ts`
   - Feature flag conditional: canonical vs legacy
   - Format request body with RunAgentRequest structure
   - Use POST SSE client instead of GET EventSource

3. **POST SSE Client:** Implement in `frontend/src/hooks/useSSE.ts`
   - Use `fetch` + `ReadableStream` (standard EventSource doesn't support POST)
   - Parse SSE stream manually (split by `\n\n`, extract `data:` lines)
   - Route to ADK event handler (Phase 3.2)

### ADK Service Dependency

**Port:** 8080
**Command:** `adk web agents/ --port 8080`
**Required:** Yes (canonical mode fails without ADK service)

**Development Setup:**
```bash
# Terminal 1: Start ADK service
adk web agents/ --port 8080

# Terminal 2: Start backend with canonical flag
export ENABLE_ADK_CANONICAL_STREAM=true
uv run uvicorn app.server:app --reload --port 8000

# Terminal 3: Start frontend with canonical flag
export NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true
npm --prefix frontend run dev
```

### Testing

**Manual Curl Test:**
```bash
curl -N -X POST http://localhost:8000/run_sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "appName": "vana",
    "userId": "test_user",
    "sessionId": "test_session",
    "newMessage": {
      "parts": [{"text": "Research quantum computing"}],
      "role": "user"
    },
    "streaming": true
  }'
```

**Expected Output:**
```
data: {"id":"...","author":"research_agent","content":{"parts":[{"text":"Starting research..."}]},...}

data: {"id":"...","author":"research_agent","content":{"parts":[{"functionCall":...}]},...}

data: {"id":"...","author":"research_agent","content":{"parts":[{"functionResponse":...}]},...}
```

---

## References

**Planning Documents:**
- Master Plan: `docs/plans/multi_agent_adk_alignment_plan.md`
- Phase 1 Summary: `docs/plans/phase_1_completion_summary.md`
- Phase 3.3 Execution: `docs/plans/phase3_3_execution_plan.md`

**Implementation Files:**
- Backend Endpoint: `app/routes/adk_routes.py:165-269`
- Request Model: `app/models.py:234-260`
- Feature Flags: `app/config.py` (backend), `frontend/src/lib/env.ts` (frontend)

**ADK References:**
- Official ADK Source: `docs/adk/refs/official-adk-python/src/google/adk/cli/adk_web_server.py`
- Event Model: `docs/adk/refs/official-adk-python/src/google/adk/events/event.py`
- Frontend Example: `docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/lib/streaming/sse-parser.ts`

---

**Version History:**
- **1.0** (2025-10-19): Initial specification based on Phase 1.1 implementation

**Last Updated:** 2025-10-19
**Author:** Backend Architect (Claude Code)
**Review Status:** Ready for implementation
