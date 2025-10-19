# Phase 3.3 Architectural Solution - ADK-Compliant Streaming

**Created:** 2025-10-19 15:00:00
**SPARC Swarm:** `swarm_1760885712781_jx80040kf`
**Analysis By:** Backend Architect + Frontend Developer
**Status:** ✅ DESIGN COMPLETE - READY FOR IMPLEMENTATION

---

## Executive Summary

After comprehensive analysis by specialized agents, we've identified the **minimal, zero-breaking-change solution** to activate canonical ADK streaming mode. The infrastructure is **98% complete** - only routing logic and request body injection remain.

**Key Insight:** The frontend already has POST-capable SSE streaming via fetch API. We just need to activate it conditionally and inject the request body dynamically.

---

## 🎯 Problem Statement

### Current State (Legacy Mode)
```
User types message
    ↓
sendMessage() calls:
    1. POST /apps/{app}/users/{user}/sessions/{session}/run (persist message)
    2. GET /api/sse/apps/.../run (stream results separately)
    ↓
Backend receives GET → checks if research started → streams legacy events
```

### Target State (Canonical Mode)
```
User types message
    ↓
sendMessage() calls:
    POST /api/sse/run_sse with body: {appName, userId, sessionId, newMessage}
    ↓
Backend receives POST → starts research → streams canonical ADK events
    ↓
Frontend receives raw ADK events → AdkEventHandler → rawAdkEvents populated
```

### The Gap
**Technical Challenge:** SSE connection (via `useResearchSSE`) is created at **component mount time**, but the message content is only available when the user **sends a message**.

**Attempted Solution (Wrong):** Adding `requestBody?: Record<string, any>` to `SSEOptions` at hook creation time doesn't work because body doesn't exist yet.

**Correct Solution:** Use a ref-based pattern to inject request body **after** hook creation but **before** connection.

---

## 🔍 Analysis Findings

### Backend Analysis (by backend-architect agent)

**Endpoint:** `POST /run_sse`
**Implementation:** `app/routes/adk_routes.py:165-269`
**Status:** ✅ Complete (Phase 1.1)

**Request Contract:**
```json
{
  "appName": "vana",
  "userId": "user_123",
  "sessionId": "session_abc",
  "newMessage": {
    "parts": [{"text": "User message here"}],
    "role": "user"
  },
  "streaming": true
}
```

**Response Behavior:**
- Returns `text/event-stream` immediately
- Streams raw ADK Event JSON (zero mutation)
- Timeout: 300s with no read timeout
- Events: `{id, author, invocationId, timestamp, content: {parts}}`

**Key Difference from Legacy:**
- **Legacy:** Two-step (POST to persist → GET to stream)
- **Canonical:** One-step (POST with body → starts research + streams)

### Frontend Analysis (by frontend-developer agent)

**Current Implementation:** `frontend/src/hooks/useSSE.ts`
**Status:** ✅ 98% Complete - just needs routing logic

**Fetch-Based SSE Already Exists:**
- Lines 354-654: Full POST-capable SSE streaming via fetch + ReadableStream
- Handles all `/api/sse/*` routes
- **Current blocker:** Line 397 hardcodes `method: 'GET'`

**POST Proxy Ready:**
- File: `frontend/src/app/api/sse/run_sse/route.ts` (337 lines)
- Security: ✅ CSRF + JWT validated
- Created: Phase 3.3 Task 1 (already complete!)
- **Status:** Exists but never called by frontend

**Architectural Constraint:**
```typescript
// Problem: Hook created before body available
function ChatInterface() {
  const researchSSE = useResearchSSE(sessionId); // Created at mount

  const sendMessage = async (text: string) => {
    // Body only available NOW, but SSE hook already created
    const body = { appName, userId, sessionId, newMessage: {text} };
    // How do we get body to the SSE connection?
  };
}
```

---

## 🏗️ Architectural Solution

### Design Pattern: Deferred Request Body Injection

Instead of passing request body at hook creation, we **defer it** until connection time using a ref pattern.

**Implementation Strategy:**
1. Add `method` and `requestBodyRef` to SSE options
2. Expose `updateRequestBody()` method from hook
3. Call `updateRequestBody()` in `sendMessage()` before connecting
4. Use ref value in fetch() call at connection time

### Phase-by-Phase Changes

#### Change 1: Extend SSEOptions Interface

**File:** `frontend/src/hooks/useSSE.ts`
**Location:** Lines 16-38

```typescript
export interface SSEOptions {
  sessionId?: string;
  autoReconnect?: boolean;
  enabled?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  withCredentials?: boolean;

  // PHASE 3.3: Canonical mode support
  method?: 'GET' | 'POST';  // NEW: Allow POST for canonical mode
  requestBody?: Record<string, any>;  // NEW: Request body for POST

  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onReconnect?: (attempt: number) => void;
}
```

#### Change 2: Add Request Body Ref to useSSE Hook

**File:** `frontend/src/hooks/useSSE.ts`
**Location:** After line 127

```typescript
export function useSSE(url: string, options: SSEOptions = {}): SSEHookReturn {
  // ... existing refs ...

  // PHASE 3.3: Ref for dynamic request body injection
  const requestBodyRef = useRef<Record<string, any> | undefined>(options.requestBody);

  // Update ref when options change
  useEffect(() => {
    requestBodyRef.current = options.requestBody;
  }, [options.requestBody]);

  // ... rest of hook ...
}
```

#### Change 3: Update Fetch Call to Use Dynamic Method + Body

**File:** `frontend/src/hooks/useSSE.ts`
**Location:** Lines 394-399

**BEFORE:**
```typescript
fetch(sseUrl, {
  method: 'GET',  // ❌ HARDCODED
  headers,
  credentials: opts.withCredentials ? 'include' : 'omit',
  signal: controller.signal,
})
```

**AFTER:**
```typescript
// PHASE 3.3: Dynamic method and body support
const method = opts.method || 'GET';
const fetchOptions: RequestInit = {
  method,
  headers,
  credentials: opts.withCredentials ? 'include' : 'omit',
  signal: controller.signal,
};

// Add body for POST requests
if (method === 'POST' && requestBodyRef.current) {
  fetchOptions.body = JSON.stringify(requestBodyRef.current);
  headers['Content-Type'] = 'application/json';
}

fetch(sseUrl, fetchOptions)
```

#### Change 4: Expose Update Method from Hook

**File:** `frontend/src/hooks/useSSE.ts`
**Location:** Lines 939-963 (return statement)

```typescript
// Add to SSEHookReturn interface (line 38-63)
export interface SSEHookReturn {
  // ... existing fields ...

  /** Update request body for POST SSE (Phase 3.3) */
  updateRequestBody: (body: Record<string, any>) => void;
}

// Add to useSSE return (line 939-963)
const updateRequestBody = useCallback((body: Record<string, any>) => {
  requestBodyRef.current = body;
}, []);

return useMemo(() => ({
  connectionState,
  connectionStateRef,
  lastEvent,
  events,
  error,
  isConnected: connectionState === 'connected',
  connect,
  disconnect,
  reconnect,
  clearEvents,
  reconnectAttempt,
  lastAdkEvent,
  updateRequestBody,  // NEW
}), [
  connectionState,
  lastEvent,
  events,
  error,
  connect,
  disconnect,
  reconnect,
  clearEvents,
  reconnectAttempt,
  lastAdkEvent,
  updateRequestBody,  // NEW
]);
```

#### Change 5: Update useResearchSSE for Canonical Mode

**File:** `frontend/src/hooks/useSSE.ts`
**Location:** Lines 996-1023

**CURRENT:**
```typescript
export function useResearchSSE(sessionId: string, options: Omit<SSEOptions, 'sessionId'> = {}) {
  if (!sessionId || sessionId.trim() === '') {
    return useSSE('', { ...options, enabled: false, sessionId: '' });
  }

  // PHASE 3.3: Feature flag routing
  const isCanonicalMode = isAdkCanonicalStreamEnabled();
  const ADK_APP_NAME = process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana';
  const ADK_DEFAULT_USER = process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default';

  let url: string;

  if (isCanonicalMode) {
    url = '/api/sse/run_sse';
    console.log('[useResearchSSE] Canonical mode enabled - using POST /api/sse/run_sse');
  } else {
    url = `/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions/${sessionId}/run`;
    console.log('[useResearchSSE] Legacy mode - using GET', url);
  }

  return useSSE(url, { ...options, sessionId });
}
```

**UPDATED:**
```typescript
export function useResearchSSE(sessionId: string, options: Omit<SSEOptions, 'sessionId'> = {}) {
  if (!sessionId || sessionId.trim() === '') {
    return useSSE('', { ...options, enabled: false, sessionId: '' });
  }

  // PHASE 3.3: Feature flag routing
  const isCanonicalMode = isAdkCanonicalStreamEnabled();
  const ADK_APP_NAME = process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana';
  const ADK_DEFAULT_USER = process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default';

  let url: string;
  let method: 'GET' | 'POST' = 'GET';  // NEW

  if (isCanonicalMode) {
    // CANONICAL MODE: POST /api/sse/run_sse
    url = '/api/sse/run_sse';
    method = 'POST';  // NEW
    console.log('[useResearchSSE] Canonical mode enabled - using POST /api/sse/run_sse');
  } else {
    // LEGACY MODE: GET /apps/.../run
    url = `/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions/${sessionId}/run`;
    method = 'GET';  // NEW (explicit)
    console.log('[useResearchSSE] Legacy mode - using GET', url);
  }

  return useSSE(url, { ...options, sessionId, method });  // Pass method
}
```

#### Change 6: Update Message Handlers for Canonical Flow

**File:** `frontend/src/hooks/chat/message-handlers.ts`
**Location:** Lines 122-167

**BEFORE (Legacy Flow):**
```typescript
await messageQueueRef.current.enqueue(async () => {
  try {
    // Step 1: Ensure clean disconnection
    await ensureSSEReady(researchSSE, 5000);

    // Step 2: Start research via API
    const response = await apiClient.startResearch(activeSessionId, researchRequest);

    if (!response.success) {
      throw new Error(response.message || 'Failed to start research');
    }

    // Step 3: Connect SSE
    const currentState = researchSSE?.connectionStateRef?.current;
    if (currentState !== 'connected' && currentState !== 'connecting') {
      researchSSE?.connect();
      await waitForSSEConnection(researchSSE, 5000);
    }
  } catch (error) {
    console.error('[MessageHandler] SSE connection sequence failed:', error);
    throw error;
  }
});
```

**AFTER (Feature Flag Routing):**
```typescript
await messageQueueRef.current.enqueue(async () => {
  console.log('[MessageHandler] Starting SSE connection sequence');

  try {
    // Step 1: Ensure clean disconnection
    await ensureSSEReady(researchSSE, 5000);

    // PHASE 3.3: Feature flag routing
    const isCanonicalMode = isAdkCanonicalStreamEnabled();

    if (isCanonicalMode) {
      // CANONICAL MODE: POST SSE with request body
      console.log('[MessageHandler] Canonical mode - using POST SSE with body');

      // Build ADK-compliant request body
      const ADK_APP_NAME = process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana';
      const ADK_DEFAULT_USER = process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default';

      const requestBody = {
        appName: ADK_APP_NAME,
        userId: ADK_DEFAULT_USER,
        sessionId: activeSessionId,
        newMessage: {
          parts: [{ text: content.trim() }],
          role: 'user'
        },
        streaming: true
      };

      // Inject request body into SSE hook
      researchSSE?.updateRequestBody?.(requestBody);

      // Connect SSE (will use POST with body)
      const currentState = researchSSE?.connectionStateRef?.current;
      if (currentState !== 'connected' && currentState !== 'connecting') {
        console.log('[MessageHandler] Connecting POST SSE with body');
        researchSSE?.connect();
        await waitForSSEConnection(researchSSE, 5000);
      }

    } else {
      // LEGACY MODE: POST to start research, then GET to stream
      console.log('[MessageHandler] Legacy mode - POST to start, then GET to stream');

      // Step 2: Start research via API
      const response = await apiClient.startResearch(activeSessionId, researchRequest);

      if (!response.success) {
        throw new Error(response.message || 'Failed to start research');
      }

      // Step 3: Connect SSE
      const currentState = researchSSE?.connectionStateRef?.current;
      if (currentState !== 'connected' && currentState !== 'connecting') {
        researchSSE?.connect();
        await waitForSSEConnection(researchSSE, 5000);
      }
    }

    console.log('[MessageHandler] SSE connection sequence completed successfully');

  } catch (error) {
    console.error('[MessageHandler] SSE connection sequence failed:', error);
    throw error;
  }
});
```

---

## 📊 Implementation Summary

### Files Modified: 2
1. `frontend/src/hooks/useSSE.ts` (~50 lines changed)
2. `frontend/src/hooks/chat/message-handlers.ts` (~40 lines changed)

### Lines of Code: ~90 total

### Breaking Changes: ✅ ZERO
- All changes behind feature flag
- Legacy mode completely untouched
- Default behavior: GET (existing)

### Risk Level: 🟢 LOW
- No new infrastructure needed
- Activating existing fetch-based SSE
- Feature flag controls all routing
- Extensive testing before toggle

---

## ✅ Quality Gates

### Must Pass Before Merge:
1. **TypeScript Compilation:** Zero errors
2. **Unit Tests:** All existing tests pass
3. **Feature Flag Off:** Legacy mode works identically
4. **Feature Flag On:** POST /api/sse/run_sse called
5. **Browser Verification:** Chrome DevTools MCP confirms:
   - POST request sent
   - Request body correct
   - ADK events received
   - rawAdkEvents populated
   - Zero console errors
6. **Performance:** <5ms event processing maintained
7. **Peer Review:** ≥8.0/10 score

---

## 🚀 Implementation Roadmap

### Task 1: Update useSSE Hook (1-2 hours)
- Add `method` and `requestBody` to SSEOptions
- Add `requestBodyRef` and update effect
- Modify fetch call to use dynamic method + body
- Add `updateRequestBody()` method
- Update return interface

### Task 2: Update useResearchSSE (30 mins)
- Add method selection based on feature flag
- Pass method to useSSE

### Task 3: Update Message Handlers (1-2 hours)
- Add feature flag conditional
- Build ADK request body for canonical mode
- Call `updateRequestBody()` before connect
- Skip `apiClient.startResearch()` in canonical mode
- Maintain legacy flow unchanged

### Task 4: Browser E2E Testing (2-3 hours)
- Test legacy mode (flag off)
- Test canonical mode (flag on)
- Verify POST requests in Network tab
- Check console for ADK parser activation
- Inspect rawAdkEvents in store
- Test circular buffer behavior
- Performance benchmarking

### Task 5: Peer Review (30 mins)
- Code review by code-reviewer agent
- Target: ≥8.0/10 score
- Address feedback if needed

### Task 6: Documentation (30 mins)
- Update master plan Phase 3.3 status
- Create completion report
- Update CLAUDE.md if needed

---

## 🎯 Success Criteria

| Metric | Target | Verification Method |
|--------|--------|---------------------|
| POST endpoint called | ✅ Yes | Network tab shows POST /api/sse/run_sse |
| Request body format | ✅ Correct | Body matches backend contract |
| ADK parser activated | ✅ Yes | Console: "[useSSE] Detected ADK event structure" |
| rawAdkEvents populated | >0 events | Store inspection via browser console |
| Circular buffer working | ≤1000 events | After 15+ messages |
| Event processing speed | <5ms/event | Performance tab |
| Console errors | 0 | Console messages list |
| Legacy mode untouched | ✅ Working | Feature flag off test |
| TypeScript errors | 0 | `npm run typecheck` |
| Peer review score | ≥8.0/10 | Code reviewer agent |

---

## 📚 References

**Backend Specification:**
- `/docs/api/canonical_adk_streaming_spec.md` - Complete API contract
- `app/routes/adk_routes.py:165-269` - POST /run_sse implementation

**Frontend Analysis:**
- `/docs/plans/frontend_sse_architecture_analysis.md` - Full architecture review
- `/docs/plans/frontend_sse_technical_spec.md` - Implementation spec

**Phase Documents:**
- `/docs/plans/multi_agent_adk_alignment_plan.md` - Master plan
- `/docs/plans/phase3_3_execution_plan.md` - Execution plan
- `/docs/validation/phase3_canonical_mode_verification.md` - Phase 3 status

**Memory Storage:**
- `sparc/backend/analysis` - Backend findings
- `sparc/frontend/analysis` - Frontend findings

---

## 🔗 Agent Coordination

**Created By:** SPARC Orchestrator
**Swarm:** `swarm_1760885712781_jx80040kf`
**Topology:** Hierarchical (Queen + 2 specialists)
**Analysis Agents:**
- Backend Architect: API contract analysis
- Frontend Developer: SSE architecture analysis

**Implementation Agents Needed:**
- Frontend Developer: Execute code changes
- Test Automator: Browser E2E verification
- Code Reviewer: Peer review

---

**Status:** ✅ DESIGN COMPLETE
**Next Step:** Execute implementation (Tasks 1-6)
**Estimated Time:** 4-6 hours total
**Blocking:** None
**Ready:** ✅ YES
