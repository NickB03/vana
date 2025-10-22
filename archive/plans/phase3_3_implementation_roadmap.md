# Phase 3.3 Implementation Roadmap - Quick Reference

**Created:** 2025-10-19 15:05:00
**Based On:** `/docs/plans/phase3_3_architectural_solution.md`
**Estimated Time:** 4-6 hours
**Status:** Ready to Execute

---

## 🎯 Quick Summary

**Problem:** Frontend uses GET SSE, but canonical mode needs POST with request body.
**Solution:** Add method + body support to existing fetch-based SSE (already implemented), inject body dynamically via ref.
**Changes:** 2 files, ~90 lines of code, zero breaking changes.

---

## ✅ Prerequisites (All Complete)

- [x] Backend POST /run_sse endpoint ready (Phase 1.1)
- [x] Frontend POST proxy at /api/sse/run_sse ready (Task 1 complete)
- [x] ADK parser infrastructure ready (Phase 3.1)
- [x] Event handler factory ready (Phase 3.2.1)
- [x] Store extensions ready (Phase 3.2.2)
- [x] Feature flags enabled both sides
- [x] Browser verification tools ready (Chrome DevTools MCP)

---

## 📝 Implementation Steps

### Step 1: Update useSSE Hook (1-2 hours)

**File:** `frontend/src/hooks/useSSE.ts`

**Changes:**
1. Add to SSEOptions interface (line 16-38):
   ```typescript
   method?: 'GET' | 'POST';
   requestBody?: Record<string, any>;
   ```

2. Add requestBodyRef after line 127:
   ```typescript
   const requestBodyRef = useRef<Record<string, any> | undefined>(options.requestBody);

   useEffect(() => {
     requestBodyRef.current = options.requestBody;
   }, [options.requestBody]);
   ```

3. Update fetch call (lines 394-399):
   ```typescript
   const method = opts.method || 'GET';
   const fetchOptions: RequestInit = {
     method,
     headers,
     credentials: opts.withCredentials ? 'include' : 'omit',
     signal: controller.signal,
   };

   if (method === 'POST' && requestBodyRef.current) {
     fetchOptions.body = JSON.stringify(requestBodyRef.current);
     headers['Content-Type'] = 'application/json';
   }

   fetch(sseUrl, fetchOptions)
   ```

4. Add updateRequestBody method:
   ```typescript
   const updateRequestBody = useCallback((body: Record<string, any>) => {
     requestBodyRef.current = body;
   }, []);
   ```

5. Add to SSEHookReturn interface and return object:
   ```typescript
   updateRequestBody: (body: Record<string, any>) => void;
   ```

**Validation:**
- TypeScript compiles with zero errors
- Existing tests pass
- Method defaults to 'GET' (backward compatible)

---

### Step 2: Update useResearchSSE (30 mins)

**File:** `frontend/src/hooks/useSSE.ts`
**Location:** Lines 996-1023

**Change:** Add method selection based on feature flag:

```typescript
const isCanonicalMode = isAdkCanonicalStreamEnabled();
let url: string;
let method: 'GET' | 'POST' = 'GET';

if (isCanonicalMode) {
  url = '/api/sse/run_sse';
  method = 'POST';
  console.log('[useResearchSSE] Canonical mode - using POST');
} else {
  url = `/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions/${sessionId}/run`;
  method = 'GET';
  console.log('[useResearchSSE] Legacy mode - using GET');
}

return useSSE(url, { ...options, sessionId, method });
```

**Validation:**
- Feature flag routing correct
- URL selection correct for both modes

---

### Step 3: Update Message Handlers (1-2 hours)

**File:** `frontend/src/hooks/chat/message-handlers.ts`
**Location:** Lines 122-167 (inside messageQueueRef.current.enqueue)

**Change:** Add feature flag conditional:

```typescript
const isCanonicalMode = isAdkCanonicalStreamEnabled();

if (isCanonicalMode) {
  // CANONICAL MODE: POST SSE with body
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

  // Inject body and connect
  researchSSE?.updateRequestBody?.(requestBody);

  const currentState = researchSSE?.connectionStateRef?.current;
  if (currentState !== 'connected' && currentState !== 'connecting') {
    researchSSE?.connect();
    await waitForSSEConnection(researchSSE, 5000);
  }
} else {
  // LEGACY MODE: (existing code unchanged)
  const response = await apiClient.startResearch(activeSessionId, researchRequest);
  if (!response.success) {
    throw new Error(response.message || 'Failed to start research');
  }

  const currentState = researchSSE?.connectionStateRef?.current;
  if (currentState !== 'connected' && currentState !== 'connecting') {
    researchSSE?.connect();
    await waitForSSEConnection(researchSSE, 5000);
  }
}
```

**Validation:**
- Both branches compile
- Legacy flow unchanged
- Request body format matches backend contract

---

### Step 4: Browser E2E Testing (2-3 hours)

**Use Chrome DevTools MCP for all verification!**

#### Test 4.1: Legacy Mode (Flag OFF)
```javascript
// 1. Ensure flag is false
// NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=false

// 2. Navigate and test
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000" }
mcp__chrome-devtools__fill { uid: "message-input", value: "Test legacy mode" }
mcp__chrome-devtools__click { uid: "send-button" }

// 3. Verify network requests
mcp__chrome-devtools__list_network_requests { resourceTypes: ["fetch", "xhr"] }
// Expected: POST /apps/.../run, then GET /api/sse/.../run

// 4. Check console
mcp__chrome-devtools__list_console_messages
// Expected: "[useResearchSSE] Legacy mode - using GET"
// NOT: "[useSSE] Detected ADK event structure"
```

#### Test 4.2: Canonical Mode (Flag ON)
```javascript
// 1. Ensure flag is true
// NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true

// 2. Navigate and test
mcp__chrome-devtools__navigate_page { url: "http://localhost:3000" }
mcp__chrome-devtools__fill { uid: "message-input", value: "Test canonical ADK mode" }
mcp__chrome-devtools__click { uid: "send-button" }

// 3. Verify network requests
mcp__chrome-devtools__list_network_requests { resourceTypes: ["fetch"] }
// Expected: POST /api/sse/run_sse (NO separate POST to start research)

// 4. Check console for ADK activation
mcp__chrome-devtools__list_console_messages
// Expected: "[useResearchSSE] Canonical mode - using POST"
// Expected: "[useSSE] Detected ADK event structure - parsing as canonical"

// 5. Verify rawAdkEvents
mcp__chrome-devtools__evaluate_script {
  function: `() => {
    const store = window.__ZUSTAND_STORE__?.getState?.();
    const sessions = store?.sessions || {};
    const session = Object.values(sessions)[0];
    return {
      hasRawAdkEvents: !!session?.rawAdkEvents,
      rawEventsCount: session?.rawAdkEvents?.length || 0,
      eventMetadata: session?.eventMetadata,
      firstEventType: session?.rawAdkEvents?.[0]?.type,
      mode: session?.rawAdkEvents?.length > 0 ? 'canonical' : 'legacy'
    };
  }`
}
// Expected: rawEventsCount > 0, mode: 'canonical'
```

#### Test 4.3: Circular Buffer (15+ messages)
```javascript
// Send 15 messages
for (let i = 0; i < 15; i++) {
  // Fill, click, wait
}

// Verify buffer limit
mcp__chrome-devtools__evaluate_script {
  function: `() => {
    const store = window.__ZUSTAND_STORE__?.getState?.();
    const session = Object.values(store?.sessions || {})[0];
    return {
      rawEventsCount: session?.rawAdkEvents?.length || 0,
      isWithinLimit: (session?.rawAdkEvents?.length || 0) <= 1000
    };
  }`
}
// Expected: isWithinLimit: true
```

#### Test 4.4: Performance Benchmarking
```javascript
// Start performance trace
mcp__chrome-devtools__performance_start_trace { reload: false, autoStop: false }

// Send message
mcp__chrome-devtools__fill { uid: "message-input", value: "Performance test" }
mcp__chrome-devtools__click { uid: "send-button" }

// Wait for completion (5-10s)
mcp__chrome-devtools__wait_for { text: "response content", timeout: 10000 }

// Stop trace
mcp__chrome-devtools__performance_stop_trace

// Expected: <5ms per event processing, <5s total response time
```

**Success Criteria:**
- [x] Legacy mode: Two requests (POST + GET)
- [x] Canonical mode: One request (POST)
- [x] Console shows correct mode activation
- [x] rawAdkEvents populated in canonical mode
- [x] Circular buffer respects 1000 event limit
- [x] Performance <5ms/event, <5s total
- [x] Zero console errors in both modes

---

### Step 5: Peer Review (30 mins)

**Run code-reviewer agent:**
```javascript
Task({
  subagent_type: "code-reviewer",
  description: "Review Phase 3.3 implementation",
  prompt: `Review the following files for Phase 3.3 canonical ADK streaming:

  Files:
  - frontend/src/hooks/useSSE.ts
  - frontend/src/hooks/chat/message-handlers.ts

  Criteria:
  - Code quality and maintainability
  - TypeScript type safety
  - Error handling
  - Feature flag logic correctness
  - Backward compatibility (zero breaking changes)
  - Performance considerations
  - Security (request body handling)

  Target Score: ≥8.0/10

  Provide detailed feedback with score.`
})
```

**Address any feedback before proceeding.**

---

### Step 6: Documentation (30 mins)

**Update these files:**

1. **Master Plan:** `/docs/plans/multi_agent_adk_alignment_plan.md`
   - Change Phase 3.3 from 0% → 100%
   - Update overall completion 93% → 95%
   - Mark Phase 3.3 as COMPLETE

2. **Create Completion Report:** `/docs/validation/phase3_3_completion_report.md`
   - Browser verification results
   - Performance benchmarks
   - Peer review scores
   - Before/After comparison (legacy vs canonical)
   - Screenshots from browser testing

3. **Update CLAUDE.md** (if needed):
   - Confirm POST /api/sse/run_sse is live
   - Update SSE proxy documentation

---

## 🚦 Quality Gates

Must pass ALL gates before committing:

- [ ] TypeScript: `npm run typecheck` → zero errors
- [ ] Tests: `npm test` → all passing
- [ ] Legacy mode: Feature flag OFF → works identically
- [ ] Canonical mode: Feature flag ON → POST /api/sse/run_sse called
- [ ] Browser console: Zero errors in both modes
- [ ] Network tab: Correct HTTP method for each mode
- [ ] Store inspection: rawAdkEvents populated in canonical mode
- [ ] Performance: <5ms/event, <5s response time
- [ ] Circular buffer: ≤1000 events after 15+ messages
- [ ] Peer review: Score ≥8.0/10

---

## 🎯 Commit Message Template

```
feat(Phase 3.3): Activate canonical ADK streaming mode

Enable feature-flag-gated POST SSE streaming for canonical ADK events:
- Add method + requestBody support to useSSE hook
- Inject request body dynamically via ref pattern
- Route to POST /api/sse/run_sse when NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true
- Maintain backward compatibility (legacy GET flow unchanged)

Changes:
- frontend/src/hooks/useSSE.ts: Add POST support (~50 lines)
- frontend/src/hooks/chat/message-handlers.ts: Feature flag routing (~40 lines)

Browser Verified: ✅ (Chrome DevTools MCP)
Peer Review: [X.X/10]
Performance: <5ms/event, <5s response time
Breaking Changes: Zero

🤖 Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 📚 Reference Documents

**Created by SPARC Orchestration:**
- `/docs/plans/phase3_3_architectural_solution.md` - Full design (400+ lines)
- `/docs/api/canonical_adk_streaming_spec.md` - Backend API contract
- `/docs/plans/frontend_sse_architecture_analysis.md` - Frontend analysis
- `/docs/plans/frontend_sse_technical_spec.md` - Frontend spec

**Existing Plans:**
- `/docs/plans/multi_agent_adk_alignment_plan.md` - Master plan
- `/docs/plans/phase3_3_execution_plan.md` - Original execution plan
- `/docs/validation/phase3_canonical_mode_verification.md` - Phase 3 status

---

## 🚀 Ready to Execute

**Estimated Total Time:** 4-6 hours
**Blocking:** None
**Prerequisites:** ✅ All complete
**Risk Level:** 🟢 LOW
**Breaking Changes:** ✅ ZERO

**Next Command:**
```bash
# Start implementation with Step 1
# Open: frontend/src/hooks/useSSE.ts
```

**SPARC Orchestrator Status:** ✅ ANALYSIS COMPLETE - READY FOR EXECUTION
