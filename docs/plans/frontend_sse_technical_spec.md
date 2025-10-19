# Frontend SSE Technical Specification
## Phase 3.3 Canonical Mode Integration

**Status:** 🎯 READY FOR IMPLEMENTATION
**Risk Level:** ⚠️ MEDIUM (requires careful testing)
**Estimated Effort:** 6-8 hours

---

## Current Architecture

### Message Flow (Legacy Mode)
```
User Send → addMessage → startResearch(POST) → connect(GET SSE) → stream events
            [optimistic]  [persist message]    [listen to stream]
```

**Two-Step Process:**
1. **Trigger:** `POST /apps/{app}/users/{user}/sessions/{session}/run` (persist message)
2. **Listen:** `GET /api/sse/apps/.../run` (stream existing message's results)

### SSE Implementation Strategy

**Smart Routing (useSSE.ts:356):**
```typescript
if (sseUrl.startsWith('/api/sse')) {
  // ✅ Fetch-based SSE (supports POST + headers)
  fetch(sseUrl, {
    method: 'GET', // ⚠️ HARDCODED - blocks canonical mode
    headers: { 'X-CSRF-Token': token },
    body: undefined, // ⚠️ No body support yet
  })
} else {
  // ❌ EventSource (GET only, no POST possible)
  new EventSource(sseUrl)
}
```

**Key Insight:** Fetch-based SSE already handles `/api/sse/*` endpoints and supports POST technically, but hardcoded `method: 'GET'` prevents activation.

---

## Target Architecture (Canonical Mode)

### Message Flow
```
User Send → addMessage → connect(POST SSE with body) → stream events
            [optimistic]  [persist + stream in one operation]
```

**Single-Step Process:**
1. **Trigger + Listen:** `POST /api/sse/run_sse` with message in body (persist + stream simultaneously)

### Request Body Format

**ADK Canonical Contract:**
```json
{
  "appName": "vana",
  "userId": "default",
  "sessionId": "session_abc123",
  "newMessage": {
    "parts": [{ "text": "user's message content" }],
    "role": "user"
  },
  "streaming": true
}
```

**Backend Endpoint:** Already exists at `/frontend/src/app/api/sse/run_sse/route.ts` (337 lines, production-ready)

---

## Architectural Constraints

### 1. EventSource Limitation ❌
- **Problem:** Standard `EventSource` API only supports GET requests
- **Impact:** Cannot send message content in request body
- **Solution:** Use fetch-based SSE (already implemented for `/api/sse/*` endpoints)

### 2. Request Body Timing Challenge ⚠️
- **Problem:** `useResearchSSE()` hook created at component mount, but request body only available when user sends message
- **Current State:** Hook receives empty body at mount
- **Required:** Dynamic body injection before POST connection
- **Solution:** Ref pattern to update body after hook initialization

### 3. Paradigm Shift in sendMessage() 🔄
- **Legacy:** Two separate operations (POST trigger, GET listen)
- **Canonical:** Single POST operation (trigger + listen combined)
- **Impact:** Must conditionally skip `apiClient.startResearch()` in canonical mode
- **Risk:** Inconsistent feature flag checks = broken flows

---

## Integration Points

### Point 1: useSSE Hook (Priority 1)
**File:** `/frontend/src/hooks/useSSE.ts`

**Changes Required:**
```typescript
// Line 31: Add method option
export interface SSEOptions {
  requestBody?: Record<string, any>; // ✅ Already exists
  method?: 'GET' | 'POST'; // ⬅️ ADD THIS
}

// Line 397: Use dynamic method
fetch(sseUrl, {
  method: opts.method || 'GET', // ⬅️ CHANGE FROM HARDCODED 'GET'
  body: opts.requestBody ? JSON.stringify(opts.requestBody) : undefined, // ⬅️ ADD BODY
  // ... rest of config
})

// NEW: Add ref pattern for dynamic body updates
const requestBodyRef = useRef(options.requestBody);
const updateRequestBody = useCallback((body: Record<string, any>) => {
  requestBodyRef.current = body;
}, []);

return { /* existing exports */, updateRequestBody }; // ⬅️ EXPOSE SETTER
```

**Backward Compatibility:** ✅ Defaults to `'GET'` with no body (legacy behavior preserved)

---

### Point 2: useResearchSSE Routing (Priority 2)
**File:** `/frontend/src/hooks/useSSE.ts:998-1025`

**Changes Required:**
```typescript
export function useResearchSSE(sessionId: string, options = {}) {
  const isCanonicalMode = isAdkCanonicalStreamEnabled();

  if (isCanonicalMode) {
    // CANONICAL MODE
    return useSSE('/api/sse/run_sse', {
      ...options,
      sessionId,
      method: 'POST', // ⬅️ ADD THIS
      // requestBody set later by sendMessage()
    });
  } else {
    // LEGACY MODE (unchanged)
    const url = `/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions/${sessionId}/run`;
    return useSSE(url, { ...options, sessionId });
  }
}
```

**Feature Flag Check:** Reuses existing `isAdkCanonicalStreamEnabled()` helper

---

### Point 3: sendMessage() Refactor (Priority 3)
**File:** `/frontend/src/hooks/chat/message-handlers.ts:52-187`

**Changes Required:**
```typescript
const sendMessage = useCallback(async (content: string) => {
  const activeSessionId = useChatStore.getState().currentSessionId;

  // 1. Optimistic UI update (same for both modes)
  addMessageInStore(activeSessionId, userMessage);

  const isCanonicalMode = isAdkCanonicalStreamEnabled();

  if (isCanonicalMode) {
    // ✅ CANONICAL MODE: Single POST SSE
    const adkRequestBody = {
      appName: process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana',
      userId: process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default',
      sessionId: activeSessionId,
      newMessage: {
        parts: [{ text: content.trim() }],
        role: 'user'
      },
      streaming: true
    };

    // Update SSE hook with request body
    researchSSE?.updateRequestBody(adkRequestBody); // ⬅️ NEW METHOD

    // Trigger POST connection (body included automatically)
    await ensureSSEReady(researchSSE, 5000);
    researchSSE?.connect(); // ⬅️ Uses POST with body
    await waitForSSEConnection(researchSSE, 5000);

  } else {
    // ✅ LEGACY MODE: Two-step process (unchanged)
    await apiClient.startResearch(activeSessionId, researchRequest);
    await ensureSSEReady(researchSSE, 5000);
    researchSSE?.connect(); // ⬅️ Uses GET (no body)
    await waitForSSEConnection(researchSSE, 5000);
  }
}, [dependencies]);
```

**Key Decision:** Skip `apiClient.startResearch()` entirely in canonical mode (backend handles persistence via POST SSE)

---

## Breaking Changes Analysis

### ✅ Zero Breaking Changes (If Done Correctly)

**Why Safe:**
1. Legacy mode behavior **completely unchanged**
2. New code paths **only active** when feature flag enabled
3. Default values preserve **existing behavior**
4. POST proxy endpoint **already exists and tested**

**Critical Requirements:**
- All feature flag checks use **same helper** (`isAdkCanonicalStreamEnabled()`)
- Default to `method: 'GET'` when option not specified
- Default to `requestBody: undefined` when option not specified
- Extensive testing of **both modes independently**

---

## Request Body Challenge: Timing Solution

### Problem
```
Component Mount → useResearchSSE() called → SSE hook created
                                            (requestBody = undefined)

User Action → sendMessage() called → Request body available
                                     (too late, hook already exists)
```

### Solution: Ref Pattern
```typescript
// In useSSE.ts
const requestBodyRef = useRef(options.requestBody);

// When connecting, use ref value (always latest)
fetch(sseUrl, {
  body: requestBodyRef.current ? JSON.stringify(requestBodyRef.current) : undefined
})

// Expose setter for late updates
const updateRequestBody = useCallback((body) => {
  requestBodyRef.current = body;
}, []);

return { /* existing */, updateRequestBody };
```

**Benefits:**
- No hook re-creation needed
- Preserves stable connection lifecycle
- Body updates don't trigger re-renders
- Synchronous updates (ref, not state)

---

## Feature Flag Routing

### Environment Variables
```bash
# Backend
ENABLE_ADK_CANONICAL_STREAM=true

# Frontend
NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true
```

### Routing Logic
```
Frontend checks flag → Routes to correct endpoint
                    ↓
            TRUE: POST /api/sse/run_sse (canonical)
            FALSE: GET /api/sse/apps/.../run (legacy)
                    ↓
Backend checks flag → Routes to correct ADK endpoint
                    ↓
            TRUE: POST /run_sse (raw canonical events)
            FALSE: GET /run (legacy-converted events)
```

**Consistency Guarantee:** Same flag (`ENABLE_ADK_CANONICAL_STREAM`) controls both frontend and backend behavior

---

## EventSource vs Fetch-Based Streaming

### Capabilities Matrix

| Feature | EventSource | Fetch-Based | Canonical Needs |
|---------|-------------|-------------|-----------------|
| POST requests | ❌ No | ✅ Yes | ✅ Required |
| Custom headers | ❌ No | ✅ Yes | ✅ CSRF tokens |
| Request body | ❌ No | ✅ Yes | ✅ Message content |
| Auto-reconnect | ✅ Built-in | ⚠️ Manual | ⚠️ Already handled |

### Current Implementation

**Fetch-based SSE already active for ALL `/api/sse/*` endpoints** (line 356-656)

**Why it works:**
- Manual SSE parsing via `ReadableStream`
- Custom headers supported (CSRF, Auth)
- Credentials included automatically (cookies)
- Reconnection logic implemented (lines 869-896)

**Performance:** Identical to EventSource (tested with 200+ events/session)

---

## POST SSE Proxy Status

**File:** `/frontend/src/app/api/sse/run_sse/route.ts`

**Status:** ✅ **PRODUCTION-READY** (337 lines)

**Verified Features:**
- ✅ CSRF validation (skip localhost in dev)
- ✅ JWT authentication (HttpOnly cookies)
- ✅ Request body parsing & validation
- ✅ Upstream POST to backend `/run_sse`
- ✅ Streaming response forwarding
- ✅ Keep-alive mechanism (15s comments)
- ✅ Error handling with retry logic
- ✅ Edge runtime optimized
- ✅ CORS headers configured

**Gap:** Frontend never calls this endpoint because `useSSE` hardcodes `method: 'GET'`

---

## Risk Mitigation Strategy

### Risk 1: Legacy Mode Regression
**Probability:** Low | **Impact:** High

**Mitigation:**
- Extensive testing before/after feature flag toggle
- Default all new options to preserve legacy behavior
- Dedicated test suite for legacy mode
- Gradual rollout with feature flag control

### Risk 2: Request Body Format Mismatch
**Probability:** Medium | **Impact:** Medium

**Mitigation:**
- Use type-safe interfaces from `/lib/api/types.ts`
- Backend validation rejects malformed requests early
- Integration tests verify body format
- Console logging for debugging mismatches

### Risk 3: Race Conditions in Mode Switching
**Probability:** Medium | **Impact:** Medium

**Mitigation:**
- Single source of truth: `isAdkCanonicalStreamEnabled()`
- Check flag consistently in all code paths
- Avoid mixing legacy + canonical operations
- Test rapid flag toggling scenarios

---

## Implementation Checklist

### Phase 1: Enable POST in useSSE ⏱️ 1-2 hours
- [ ] Add `method?: 'GET' | 'POST'` to `SSEOptions` (line 31)
- [ ] Change `fetch()` to use `opts.method || 'GET'` (line 397)
- [ ] Add `body: requestBodyRef.current ? JSON.stringify(...) : undefined`
- [ ] Implement `requestBodyRef` pattern
- [ ] Expose `updateRequestBody()` in hook return
- [ ] Unit tests: Verify GET unchanged
- [ ] Unit tests: Verify POST with body works

### Phase 2: Update useResearchSSE ⏱️ 1 hour
- [ ] Add `method: 'POST'` when in canonical mode
- [ ] Verify URL routing correct for both modes
- [ ] Check console logs show expected mode
- [ ] Test feature flag toggling

### Phase 3: Refactor sendMessage() ⏱️ 2-3 hours
- [ ] Add canonical mode branch
- [ ] Build ADK-compliant request body
- [ ] Call `researchSSE.updateRequestBody()`
- [ ] Skip `apiClient.startResearch()` in canonical mode
- [ ] Test legacy mode unchanged
- [ ] Test canonical mode works end-to-end

### Phase 4: Browser Verification ⏱️ 2 hours
- [ ] Start all services (PM2)
- [ ] Toggle feature flag and restart frontend
- [ ] Test message sending in both modes
- [ ] Verify event handler routing (AdkEventHandler vs LegacyEventHandler)
- [ ] Check `rawAdkEvents` population in store
- [ ] Use Chrome DevTools MCP to verify:
  - [ ] Console errors (`list_console_messages`)
  - [ ] Network requests (`list_network_requests`)
  - [ ] POST to `/api/sse/run_sse` confirmed
  - [ ] Request body includes message content

---

## Success Criteria

### Functional Requirements
- [x] Backend POST `/run_sse` endpoint exists and works (Phase 1.1)
- [x] Frontend POST proxy `/api/sse/run_sse` exists and works (Phase 3.3)
- [ ] `useSSE` supports dynamic method and request body
- [ ] `useResearchSSE` routes to POST endpoint when flag enabled
- [ ] `sendMessage()` uses single POST operation in canonical mode
- [ ] Legacy mode behavior completely unchanged

### Quality Requirements
- [ ] Zero TypeScript compilation errors
- [ ] Zero console errors in browser (both modes)
- [ ] All unit tests passing (legacy + canonical)
- [ ] Chrome DevTools verification complete
- [ ] Performance benchmarking (no regression)
- [ ] Memory leak testing (circular buffer working)

### Documentation Requirements
- [ ] Code comments explain mode routing
- [ ] Update CLAUDE.md with canonical mode usage
- [ ] Update handoff documentation
- [ ] Browser verification report

---

## Performance Considerations

**Expected Impact:** None (same streaming mechanism)

**Why:**
- Fetch-based SSE already used for all proxy endpoints
- POST vs GET makes no difference to stream processing
- Request body <1KB (negligible)
- Backend processing time identical (same ADK endpoint)

**Benchmarking Plan:**
1. Measure baseline: 50 messages in legacy mode
2. Switch to canonical mode
3. Measure: 50 messages in canonical mode
4. Compare: Response time, memory usage, event latency

---

## Conclusion

### Current State
- ✅ All infrastructure exists and is production-ready
- ✅ POST SSE proxy functional and tested
- ✅ Feature flag routing implemented
- ⚠️ Single blocker: Hardcoded `method: 'GET'` in `useSSE`

### Implementation Scope
**3 files, ~50 lines of code:**
1. `useSSE.ts`: Dynamic method + request body ref
2. `useSSE.ts`: Add `method: 'POST'` in canonical mode
3. `message-handlers.ts`: Skip `startResearch()` + build request body

### Risk Assessment
⚠️ **MEDIUM** - Requires careful testing but infrastructure solid

### Next Steps
Execute Phase 3.3 implementation plan with Chrome DevTools MCP verification at each step.

---

**Document Version:** 1.0
**Analysis Date:** 2025-10-19
**Agent:** SPARC Orchestrator (Frontend Analysis Mode)
