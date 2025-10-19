# ADK Session Lifecycle Architecture - Comprehensive Analysis & Recommendations

**Date:** 2025-10-19
**Author:** Backend Architect (Claude Code)
**Status:** 🔵 ARCHITECTURAL ANALYSIS COMPLETE
**Review Status:** ⏳ Pending Approval

---

## Executive Summary

After comprehensive analysis of:
1. Current Vana backend implementation (`/app/routes/adk_routes.py`)
2. Official ADK web server reference (`adk_web_server.py`)
3. Frontend Next.js fullstack reference (`frontend-nextjs-fullstack`)
4. Phase 3.3 orchestrator findings (`phase3_3_orchestrator_findings.md`)

**Verdict:** The current backend architecture is **CORRECT** for canonical ADK streaming. The timing issue identified in Phase 3.3 is a **frontend React hook problem**, not a backend session lifecycle issue.

**Recommendation:** Implement **Option A (Frontend Session Pre-Creation)** to match the official ADK pattern and fix the React hook timing issue.

---

## Table of Contents

1. [Current Implementation Analysis](#current-implementation-analysis)
2. [The Real Problem: Frontend Timing](#the-real-problem-frontend-timing)
3. [Architectural Recommendations](#architectural-recommendations)
4. [Sequence Diagrams](#sequence-diagrams)
5. [Migration Path](#migration-path)
6. [Backend API Contract](#backend-api-contract)
7. [Questions & Answers](#questions--answers)
8. [Cross-Reference: ADK Samples](#cross-reference-adk-reference-samples)

---

## Current Implementation Analysis

### Backend: ✅ CORRECT Architecture

The Vana backend follows the **canonical ADK pattern** correctly:

```python
# /app/routes/adk_routes.py lines 162-268
@adk_router.post("/run_sse")
async def run_sse_canonical(
    request: RunAgentRequest,  # ← Contains appName, userId, sessionId, newMessage
    current_user: User | None = Depends(get_current_active_user_optional())
) -> StreamingResponse:
    """
    ADK canonical SSE streaming endpoint.
    Proxies directly to ADK service on port 8080.
    """
    # Proxy to upstream ADK
    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            "http://127.0.0.1:8080/run_sse",
            json=request.model_dump(by_alias=True, exclude_none=True)
        ) as upstream:
            # Stream raw SSE lines from ADK (no mutation)
            async for line in upstream.aiter_lines():
                yield f"{line}\n"
```

**This matches the official ADK pattern exactly** (see `adk_web_server.py` lines 1368-1412).

### How Session Creation Works

#### Official ADK Pattern (from `adk_web_server.py`)

```python
# Lines 1368-1375
@app.post("/run_sse")
async def run_agent_sse(req: RunAgentRequest) -> StreamingResponse:
    # 1. Get existing session (MUST exist)
    session = await self.session_service.get_session(
        app_name=req.app_name, user_id=req.user_id, session_id=req.session_id
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")  # ← Explicit check!

    # 2. Then stream events
    async def event_generator():
        runner = await self.get_runner_async(req.app_name)
        async with runner.run_async(...) as agen:
            async for event in agen:
                yield f"data: {event.model_dump_json()}\n\n"
```

**Key Insight:** ADK expects sessions to **exist before** `/run_sse` is called!

#### Vana Backend Patterns

**Canonical Endpoint (POST /run_sse):**
```python
# Lines 162-268 - CORRECT but doesn't create sessions
@adk_router.post("/run_sse")
async def run_sse_canonical(...):
    # Only proxies to ADK - expects session to exist
    # No session creation logic
```

**Legacy Endpoint (POST /apps/.../sessions/{session_id}/run):**
```python
# Lines 501-887 - Creates sessions mid-flow
@adk_router.post("/apps/{app_name}/users/{user_id}/sessions/{session_id}/run")
async def run_session_sse(...):
    # 1. Ensure session exists (create if needed)
    session_store.ensure_session(
        session_id,
        user_id=current_user.id if current_user else user_id,
        title=research_query[:60],
        status="starting"
    )

    # 2. Create background task to call ADK
    async def call_adk_and_stream():
        # Create session in ADK first
        async with httpx.AsyncClient() as client:
            session_resp = await client.post(
                f"http://127.0.0.1:8080/apps/{app_name}/users/{user_id}/sessions/{session_id}",
                json={},
                timeout=10.0
            )
```

**Problem:** The canonical `/run_sse` endpoint **does NOT create sessions**. It only proxies to ADK, which expects sessions to exist.

---

## The Real Problem: Frontend Timing

From `phase3_3_orchestrator_findings.md`:

### Root Cause: Stale Hook Reference

```typescript
// Current broken flow:
T0: Component mounts with sessionId=""
    → useResearchSSE creates Hook A: {url: "", enabled: false, method: "GET"}
    → researchSSE ref = Hook A

T1: User clicks send → sendMessage() executes
    → Creates sessionId="session_xxx"
    → React re-renders

T2: Re-render creates Hook B: {url: "/api/sse/run_sse", enabled: true, method: "POST"}
    → But researchSSE ref still points to Hook A!

T3: sendMessage() (still in async queue) executes:
    → researchSSE.updateRequestBody() → Updates Hook A (wrong hook!)
    → researchSSE.connect() → Calls Hook A
    → Hook A has: enabled=false, url="", method="GET"
    → connect() aborts: "enabled: false hasPostBody: false"
```

### Browser Evidence

Console logs from Chrome DevTools MCP testing:

```
✓ [useSSE] Request body updated for next connection: ["appName"...]  (Hook A updated)
✓ [MessageHandler] Connecting POST SSE with body (current state: disconnected)
❌ [useSSE] connect() called: {"enabled":false,"url":"","method":"GET","hasPostBody":false}
❌ [useSSE] connect() aborting - enabled: false hasPostBody: false
```

The handler updates Hook A's body, then calls Hook A's connect(), but Hook A has `url: ""` and `enabled: false`, so it aborts.

Meanwhile, Hook B exists with the correct configuration but is never called.

---

## Architectural Recommendations

### Option A: Frontend Session Pre-Creation ⭐ **RECOMMENDED**

**Change the frontend flow to create sessions BEFORE the hook is initialized.**

#### Current Frontend Flow (Broken)
```typescript
// frontend/src/lib/message-handlers.ts (conceptual)
async function sendMessage(content: string) {
  // 1. Generate session ID mid-flow
  const sessionId = generateSessionId();

  // 2. Create request body
  const requestBody = {
    appName: "vana",
    userId: currentUserId,
    sessionId,  // ← New session!
    newMessage: { parts: [{ text: content }], role: "user" }
  };

  // 3. Update hook (but ref is stale)
  researchSSE?.updateRequestBody?.(requestBody);

  // 4. Connect (uses OLD hook instance)
  researchSSE?.connect();  // ← FAILS: Hook has empty URL
}
```

#### Fixed Frontend Flow (Proposed)
```typescript
// frontend/src/lib/message-handlers.ts
async function sendMessage(content: string) {
  // 1. Ensure session exists FIRST (before hook needs it)
  const sessionId = await ensureSessionExists();

  // 2. Hook now has correct sessionId from the start
  // No need to update request body - hook was created with correct params

  // 3. Create request body
  const requestBody = {
    appName: "vana",
    userId: currentUserId,
    sessionId,  // ← Existing session!
    newMessage: { parts: [{ text: content }], role: "user" }
  };

  // 4. Connect (hook has correct URL)
  await connectSSE(requestBody);  // ← WORKS: Hook has correct params
}

async function ensureSessionExists(): Promise<string> {
  // Check if current session exists
  if (currentSessionId) {
    return currentSessionId;
  }

  // Create new session via backend
  const response = await fetch(`/api/sessions`, {
    method: 'POST',
    body: JSON.stringify({
      appName: 'vana',
      userId: currentUserId
    })
  });

  const session = await response.json();
  setCurrentSessionId(session.sessionId);
  return session.sessionId;
}
```

#### Backend Changes Required

**Add session creation endpoint:**

```python
# /app/routes/adk_routes.py
@adk_router.post("/apps/{app_name}/users/{user_id}/sessions")
async def create_session_for_streaming(
    app_name: str,
    user_id: str,
    current_user: User | None = Depends(get_current_active_user_optional())
) -> dict[str, Any]:
    """
    Create a new session for streaming (no messages yet).

    This allows frontend to pre-create sessions before SSE connection.
    Follows ADK pattern: sessions exist before /run_sse is called.
    """
    # Generate session ID
    session_id = f"session_{uuid.uuid4().hex[:16]}"

    # Create empty session in Vana store
    session_store.ensure_session(
        session_id,
        user_id=current_user.id if current_user else user_id,
        title="New Chat",
        status="pending"
    )

    # Create session in ADK (port 8080)
    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                f"http://127.0.0.1:8080/apps/{app_name}/users/{user_id}/sessions/{session_id}",
                json={},
                timeout=10.0
            )
        except httpx.HTTPStatusError as e:
            if "already exists" not in e.response.text:
                raise

    return {
        "sessionId": session_id,
        "appName": app_name,
        "userId": user_id,
        "status": "ready",
        "timestamp": datetime.now().isoformat()
    }
```

#### Implementation Steps

1. **Backend (20 min)**
   - Add `POST /apps/{app}/users/{user}/sessions` endpoint
   - Creates empty session in both Vana store and ADK
   - Returns `sessionId` for frontend to use

2. **Frontend (40 min)**
   - Refactor `useChatStore` to create session on mount or before first message
   - Pass existing `sessionId` to `useResearchSSE` hook
   - Remove mid-flow session creation from message handlers
   - Update hook to NOT recreate when sessionId changes (use memoization)

3. **Testing (30 min)**
   - Verify session pre-creation works
   - Test SSE connection with existing session
   - Verify no stale hook references
   - Browser verification with Chrome DevTools MCP

**Total Effort:** ~1.5 hours

#### Pros
- ✅ Clean architecture - matches ADK pattern
- ✅ No React hook timing issues
- ✅ Simple to implement
- ✅ Matches official ADK web server behavior
- ✅ Matches frontend-nextjs-fullstack reference pattern

#### Cons
- ⚠️ Requires refactoring message handler flow
- ⚠️ Changes when sessions are created (now on mount, not on send)
- ⚠️ Empty sessions may accumulate (need cleanup logic)

---

### Option B: Backend Auto-Create Session in /run_sse

**Modify backend to auto-create sessions if they don't exist.**

#### Backend Changes

```python
# /app/routes/adk_routes.py
@adk_router.post("/run_sse")
async def run_sse_canonical(
    request: RunAgentRequest,
    current_user: User | None = Depends(get_current_active_user_optional())
) -> StreamingResponse:
    """
    ADK canonical SSE streaming endpoint with auto-session-creation.
    """
    # NEW: Ensure session exists before proxying
    session_store.ensure_session(
        request.session_id,
        user_id=current_user.id if current_user else request.user_id,
        title="New Chat",
        status="starting"
    )

    # NEW: Create session in ADK if it doesn't exist
    async with httpx.AsyncClient() as client:
        try:
            await client.post(
                f"http://127.0.0.1:8080/apps/{request.app_name}/users/{request.user_id}/sessions/{request.session_id}",
                json={},
                timeout=10.0
            )
        except httpx.HTTPStatusError as e:
            if "already exists" not in e.response.text:
                raise

    # Proxy to ADK /run_sse
    async def stream_adk_events():
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                "http://127.0.0.1:8080/run_sse",
                json=request.model_dump(by_alias=True, exclude_none=True)
            ) as upstream:
                async for line in upstream.aiter_lines():
                    yield f"{line}\n"

    return StreamingResponse(
        stream_adk_events(),
        media_type="text/event-stream"
    )
```

#### Pros
- ✅ No frontend changes needed
- ✅ Backward compatible with legacy endpoints
- ✅ Frontend can send sessionId in POST body
- ✅ Still fixes React hook timing issue (frontend sends complete body)

#### Cons
- ⚠️ Diverges from official ADK pattern (ADK expects sessions to exist)
- ⚠️ Adds latency to first message (session creation + streaming)
- ⚠️ Mixes concerns (streaming endpoint also handles session management)
- ⚠️ Doesn't fix the real frontend issue (stale ref problem persists)

---

### Option C: Imperative SSE API (Alternative)

**Replace hook-based SSE with imperative API.**

#### Implementation

**New SSEManager class:**

```typescript
// frontend/src/lib/sse-manager.ts
export class SSEManager {
  private static connections = new Map<string, EventSource>();

  static async connect(config: SSEConfig): Promise<void> {
    const { url, body, onMessage, onError } = config;

    // Use fetch with SSE streaming (not EventSource)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`SSE connection failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    // Read SSE stream
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const events = chunk.split('\n\n');

      for (const event of events) {
        if (event.startsWith('data: ')) {
          const data = event.slice(6);
          if (data === '[DONE]') break;
          onMessage?.(JSON.parse(data));
        }
      }
    }
  }

  static disconnect(sessionId: string): void {
    // Abort ongoing fetch request
    // Implementation depends on AbortController usage
  }
}
```

**Usage in message handlers:**

```typescript
// frontend/src/lib/message-handlers.ts
async function sendMessage(content: string) {
  const sessionId = currentSessionId || generateSessionId();

  const requestBody = {
    appName: 'vana',
    userId: currentUserId,
    sessionId,
    newMessage: { parts: [{ text: content }], role: 'user' }
  };

  // Direct API call - no React hooks involved
  await SSEManager.connect({
    url: '/api/sse/run_sse',
    body: requestBody,
    onMessage: (event) => {
      // Handle streaming events
      store.addEvent(event);
    },
    onError: (error) => {
      console.error('SSE error:', error);
    }
  });
}
```

#### Pros
- ✅ No React hook lifecycle issues
- ✅ Direct control over connections
- ✅ No ref timing problems
- ✅ Works with POST body (uses fetch, not EventSource)

#### Cons
- ⚠️ Major refactor (~6-8 hours)
- ⚠️ Loses React integration benefits
- ⚠️ More complex state management
- ⚠️ Requires manual cleanup logic

---

## Sequence Diagrams

### Current Flow (Broken)
```
User → Frontend: Click send
Frontend → Frontend: Generate sessionId
Frontend → Hook: updateRequestBody(body)
Note: Update Hook A (stale ref)
Frontend → Hook: connect()
Note: Call Hook A (wrong hook!)
Hook → Frontend: Abort (enabled: false)
Note: ERROR: No SSE connection
```

### Proposed Flow (Option A - Fixed)
```
User → Frontend: Mount component
Frontend → Backend: POST /apps/vana/users/user1/sessions
Backend → ADK: POST /apps/vana/users/user1/sessions/{sessionId}
ADK → Backend: 201 Created
Backend → Frontend: {sessionId: "session_abc123"}
Note: Store sessionId

User → Frontend: Click send
Frontend → Frontend: Use existing sessionId
Frontend → Backend: POST /run_sse {sessionId: "session_abc123", ...}
Backend → ADK: POST /run_sse {sessionId: "session_abc123", ...}
ADK → Backend: SSE stream
Backend → Frontend: SSE stream
Note: ✅ Messages streaming!
```

---

## Migration Path

### Phase 1: Backend Session Creation Endpoint (Day 1)

1. Add `POST /apps/{app}/users/{user}/sessions` endpoint
2. Test session creation via Postman/curl
3. Verify sessions exist in both Vana store and ADK

**Acceptance Criteria:**
- Can create empty session via API
- Session shows up in `GET /apps/{app}/users/{user}/sessions`
- Session exists in ADK (verify via `adk web` UI)

### Phase 2: Frontend Session Pre-Creation (Day 2)

1. Refactor `useChatStore` to create session on mount
2. Update `useResearchSSE` to accept existing sessionId
3. Remove mid-flow session creation from message handlers
4. Add session cleanup logic (delete empty sessions after timeout)

**Acceptance Criteria:**
- Session created when chat page loads
- `useResearchSSE` receives sessionId from store
- No hook recreation when sessionId changes
- Browser verification: SSE connects successfully

### Phase 3: Browser E2E Testing (Day 3)

1. Use Chrome DevTools MCP to verify flow
2. Test multiple messages in same session
3. Test session switching
4. Test error cases (no session, network failure)

**Acceptance Criteria:**
- All console logs show correct flow
- No "enabled: false" errors
- Network tab shows POST to `/run_sse` with body
- SSE events stream correctly

### Phase 4: Cleanup & Documentation (Day 4)

1. Remove legacy endpoint `/apps/{app}/users/{user}/sessions/{session_id}/run` (if no longer needed)
2. Update API documentation
3. Add integration tests
4. Update CLAUDE.md with new session lifecycle

---

## Backend API Contract

### Session Creation (New)
```http
POST /apps/{app_name}/users/{user_id}/sessions
Content-Type: application/json

{}

Response 201:
{
  "sessionId": "session_abc123",
  "appName": "vana",
  "userId": "user1",
  "status": "ready",
  "timestamp": "2025-10-19T10:00:00Z"
}
```

### Canonical SSE Streaming (Existing)
```http
POST /run_sse
Content-Type: application/json

{
  "appName": "vana",
  "userId": "user1",
  "sessionId": "session_abc123",
  "newMessage": {
    "parts": [{"text": "Hello"}],
    "role": "user"
  },
  "streaming": true
}

Response 200:
Content-Type: text/event-stream

data: {"id": "evt_001", "content": {"parts": [{"text": "Hi there!"}]}}

data: {"id": "evt_002", "content": {"parts": [{"text": " How can I help?"}]}}

data: [DONE]
```

---

## Questions & Answers

### Q1: Should sessions be created before the frontend sends a message?

**A:** ✅ **YES.** The official ADK pattern expects sessions to exist before `/run_sse` is called. This is confirmed by:
- `adk_web_server.py` line 1374: `if not session: raise HTTPException(404, "Session not found")`
- `frontend-nextjs-fullstack` reference: Sessions created separately from streaming
- ADK architecture: Session management is separate from agent execution

### Q2: Can we pre-create sessions on mount (empty session, no messages)?

**A:** ✅ **YES.** This is the recommended pattern:
- Empty sessions are valid (no messages yet)
- Matches official ADK behavior
- Allows frontend to have stable sessionId before hook creation
- Requires cleanup logic to delete abandoned sessions

### Q3: Is there a backend pattern to handle "session-less" initial connections?

**A:** ⚠️ **NOT RECOMMENDED.** While technically possible (Option B), it diverges from ADK's design:
- ADK expects sessions to exist before `/run_sse`
- Mixing session creation with streaming adds complexity
- Doesn't fix the real frontend timing issue
- Not how official ADK implementations work

### Q4: Should we use a different endpoint structure?

**A:** ❌ **NO.** Current endpoint structure is correct:
- `POST /run_sse` matches official ADK
- `POST /apps/{app}/users/{user}/sessions` matches ADK session creation pattern
- Frontend proxy structure is correct (JWT security)
- No changes needed to endpoint structure

### Q5: What's the canonical ADK pattern for session lifecycle?

**A:** The canonical ADK session lifecycle is:

```
1. Create Session (separate API call)
   POST /apps/{app}/users/{user}/sessions
   → Returns sessionId

2. Run Agent (SSE streaming)
   POST /run_sse {sessionId, newMessage}
   → Streams events
   → Can be called multiple times with same sessionId

3. Get Session History
   GET /apps/{app}/users/{user}/sessions/{sessionId}
   → Returns session with all events

4. Delete Session (cleanup)
   DELETE /apps/{app}/users/{user}/sessions/{sessionId}
```

**Key Principle:** Session management is separate from agent execution.

---

## Cross-Reference: ADK Reference Samples

### Official ADK Web Server Pattern
- **File:** `/docs/adk/refs/official-adk-python/src/google/adk/cli/adk_web_server.py`
- **Line 1368-1412:** `POST /run_sse` expects existing session
- **Line 752-777:** `POST /apps/{app}/users/{user}/sessions` creates new session
- **Pattern:** Session creation is separate from streaming

### Frontend Next.js Fullstack Pattern
- **File:** `/docs/adk/refs/frontend-nextjs-fullstack/nextjs/src/components/chat/ChatProvider.tsx`
- **Line 310-352:** `handleSubmit` requires existing sessionId
- **Line 328-332:** Throws error if no session exists
- **Pattern:** Sessions created before message submission

---

## Conclusion

The current **backend implementation is correct** for canonical ADK streaming. The issue is a **frontend React hook timing problem** caused by:
1. Generating sessionId mid-flow
2. Hook recreation after sessionId changes
3. Stale ref pointing to old hook instance
4. Async message handler calling wrong hook

**The solution is Option A (Frontend Session Pre-Creation):**
- Backend adds session creation endpoint
- Frontend creates session on mount or before first message
- Hook receives stable sessionId from the start
- No ref timing issues

This matches the **official ADK pattern** and the **frontend-nextjs-fullstack reference implementation**.

---

## Next Steps

1. ✅ Review this architectural analysis
2. ⏭️ Decision: Approve Option A, B, or C
3. ⏭️ Implement chosen option
4. ⏭️ Test with Chrome DevTools MCP
5. ⏭️ Enable canonical mode in production

---

**Document Status:** ✅ COMPLETE - Ready for Review
**Estimated Effort:** 1.5-2 hours (Option A)
**Blocking Issues:** None (architecture is clear)
**Approval Required:** Yes (architectural decision)
**Recommended Option:** ⭐ **Option A (Frontend Session Pre-Creation)**

---

**Generated by Backend Architect**
**Cross-Referenced with Official ADK Samples**
**Browser Verified via Chrome DevTools MCP**
