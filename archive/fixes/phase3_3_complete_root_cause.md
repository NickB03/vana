# Phase 3.3: Complete Root Cause Analysis - Empty POST Body

**Date:** 2025-10-19
**Issue:** POST /api/sse/run_sse sends empty body despite `updateRequestBody()` being called
**Status:** ⚠️ PARTIALLY FIXED (Layer 1 done, Layer 2 remains)

---

## Executive Summary

The empty POST body issue is caused by **TWO cascading problems**:

1. ✅ **FIXED**: `useResearchSSE` creates new hook instances on options changes
2. ❌ **NOT FIXED**: `useChatStream` creates new options object on every render, destroying hooks

**Current status:** Fix applied to Layer 1 (useResearchSSE memoization), but Layer 2 (useChatStream options stability) still causes hook destruction between `updateRequestBody()` and `connect()`.

---

## The Two-Layer Problem

###  Layer 1: `useResearchSSE` Creates New Hook Instances

**Before Fix:**
```typescript
// useSSE.ts (OLD - lines 1042-1071)
export function useResearchSSE(sessionId: string, options: Omit<SSEOptions, 'sessionId'> = {}) {
  return useSSE(url, { ...options, sessionId, method });  // ❌ NEW object = NEW hook!
}
```

**Problem:** Spreading `...options` creates a new object reference every time, causing `useSSE` to be destroyed and recreated.

**Fix Applied:** Memoize URL, method, and options object
```typescript
// useSSE.ts (NEW - lines 1042-1113)
export function useResearchSSE(sessionId: string, options: Omit<SSEOptions, 'sessionId'> = {}) {
  // Memoize feature flag
  const isCanonicalMode = useMemo(() => isAdkCanonicalStreamEnabled(), []);

  // Memoize URL/method calculation
  const { url, method } = useMemo(() => {
    // ... calculation logic ...
  }, [sessionId, isCanonicalMode, ADK_APP_NAME, ADK_DEFAULT_USER]);

  // Extract and memoize options
  const sseOptions = useMemo(() => ({
    enabled: url !== '' && (optionsEnabled !== false),
    // ... all other options ...
  }), [url, optionsEnabled, autoReconnect, /* ...all extracted values */]);

  return useSSE(url, sseOptions);  // ✅ Stable inputs = stable hook!
}
```

**Status:** ✅ FIXED

---

### Layer 2: `useChatStream` Changes Options Object (THE REAL KILLER)

**Current Code:**
```typescript
// useChatStream.ts lines 52-74
const sseOptions = useMemo(() => ({
  autoReconnect: true,
  maxReconnectAttempts: 5,
  enabled: Boolean(currentSessionId) && (isDevelopment || Boolean(hasAuthToken)),
}), [currentSessionId, hasAuthToken, isDevelopment]);  // ❌ Changes on session creation!

const researchSSE = useResearchSSE(currentSessionId || '', sseOptions);  // ❌ Hook destroyed!
```

**Problem:** When user sends first message:
1. Session created → `currentSessionId` changes from `null` to `"session_xxx"`
2. `useMemo` creates NEW `sseOptions` object (enabled changed from `false` to `true`)
3. `useResearchSSE` receives new options → even with Layer 1 fix, the callback refs in options cause recalculation
4. Hook gets destroyed and recreated **BETWEEN** `updateRequestBody()` and `connect()`

**Status:** ❌ NOT FIXED

---

## Detailed Execution Flow (With Layer 1 Fix Applied)

### Sequence of Events

```
1. User clicks "Send" button
   ↓
2. Message handler creates new session
   currentSessionId: null → "session_0b9a049c-c720-4854-ad62-658d389c0e45"
   ↓
3. useChatStream re-renders (session changed)
   sseOptions.enabled: false → true (NEW OBJECT REFERENCE)
   ↓
4. useResearchSSE receives NEW sseOptions
   Despite Layer 1 memoization, the parent changed the input
   ↓
5. useSSE hook DESTROYED (old instance with requestBodyRef)
   Hook Instance A garbage collected
   ↓
6. useSSE hook RECREATED (fresh requestBodyRef.current = undefined)
   Hook Instance B created
   ↓
7. Message handler calls updateRequestBody(body)
   Updates requestBodyRef.current in Hook Instance B ✅
   ↓
8. React batches another render (state updates)
   sseOptions object reference changes AGAIN
   ↓
9. useSSE hook DESTROYED AGAIN
   Hook Instance B garbage collected (with the body we just set!)
   ↓
10. useSSE hook RECREATED (fresh requestBodyRef.current = undefined)
    Hook Instance C created
    ↓
11. Message handler calls connect()
    Executes in Hook Instance C with empty requestBodyRef.current ❌
    ↓
12. fetch() called with no body
    POST /api/sse/run_sse with empty payload
    ↓
13. Backend proxy fails: "Unexpected end of JSON input"
```

---

## Evidence from Logs

### Browser Console (10:35:17 attempt):
```
[useSSE] Request body updated for next connection: ["appName","userId","sessionId","newMessage","streaming"]
  ↑ Successfully set in Hook Instance B

[MessageHandler] Connecting POST SSE with body (current state: disconnected)
  ↑ Trying to connect...

[useSSE] connect() called: {"enabled":false,"url":""}
  ↑ WRONG HOOK! This is Instance C (or a destroyed instance)

[useSSE] Method: POST requestBodyRef: false
  ↑ Empty ref - body was lost when hook was destroyed
```

### Frontend Proxy Logs:
```
10:30:27 - Request body parsed: { appName: 'vana', userId: 'default', ... } ✅ (one successful attempt)
10:33:24 - Failed to parse request body: SyntaxError: Unexpected end of JSON input ❌
10:35:17 - Failed to parse request body: SyntaxError: Unexpected end of JSON input ❌
```

**Pattern:** Sporadic success when timing is lucky, frequent failures when hook destroyed mid-sequence.

---

## Complete Fix Required

### Fix Layer 2: Stabilize useChatStream Options

**File:** `/Users/nick/Projects/vana/frontend/src/hooks/useChatStream.ts`

**Option A: Extract enabled flag separately (Recommended)**
```typescript
// Lines 52-74 (REPLACE)
const sseEnabled = Boolean(currentSessionId) && (isDevelopment || Boolean(hasAuthToken));

// Memoize options WITHOUT enabled flag (stable reference)
const sseOptions = useMemo(() => ({
  autoReconnect: true,
  maxReconnectAttempts: 5,
}), []); // ✅ NEVER CHANGES

// Pass enabled separately
const researchSSE = useResearchSSE(currentSessionId || '', {
  ...sseOptions,
  enabled: sseEnabled  // Only this prop changes
});
```

**Option B: Make useResearchSSE handle enabled internally**
```typescript
// Better: Let useResearchSSE calculate enabled based on sessionId
export function useResearchSSE(sessionId: string, options: Omit<SSEOptions, 'sessionId' | 'enabled'> = {}) {
  const { url, method } = useMemo(() => {
    if (!sessionId || sessionId.trim() === '') {
      return { url: '', method: 'GET' as const };
    }
    // ... rest of logic
  }, [sessionId, /* ... */]);

  const sseOptions = useMemo(() => ({
    ...options,
    sessionId,
    method,
    enabled: url !== '',  // ✅ Calculated internally based on URL
  }), [/* stable deps */]);

  return useSSE(url, sseOptions);
}
```

**Option C: Use callback refs for options (Advanced)**
```typescript
// useChatStream.ts
const sseOptionsRef = useRef({
  autoReconnect: true,
  maxReconnectAttempts: 5,
  enabled: false,
});

// Update ref on changes (doesn't cause re-render)
useEffect(() => {
  sseOptionsRef.current.enabled = Boolean(currentSessionId) && (isDevelopment || Boolean(hasAuthToken));
}, [currentSessionId, hasAuthToken, isDevelopment]);

// Pass stable object to hook
const researchSSE = useResearchSSE(currentSessionId || '', sseOptionsRef.current);
```

---

## Recommended Implementation: Option B

This is the cleanest solution because:
1. **Separates concerns**: URL calculation implies enabled state
2. **Reduces parent complexity**: `useChatStream` doesn't manage enabled flag
3. **Prevents hook destruction**: Options object stays stable

**Implementation:**

```typescript
// useSSE.ts - Update useResearchSSE
export function useResearchSSE(
  sessionId: string,
  options: Omit<SSEOptions, 'sessionId' | 'enabled'> = {}
) {
  const isCanonicalMode = useMemo(() => isAdkCanonicalStreamEnabled(), []);
  const ADK_APP_NAME = process.env.NEXT_PUBLIC_ADK_APP_NAME || 'vana';
  const ADK_DEFAULT_USER = process.env.NEXT_PUBLIC_ADK_DEFAULT_USER || 'default';

  const { url, method } = useMemo(() => {
    if (!sessionId || sessionId.trim() === '') {
      return { url: '', method: 'GET' as const };
    }

    if (isCanonicalMode) {
      return { url: '/api/sse/run_sse', method: 'POST' as const };
    } else {
      const legacyUrl = `/apps/${ADK_APP_NAME}/users/${ADK_DEFAULT_USER}/sessions/${sessionId}/run`;
      return { url: legacyUrl, method: 'GET' as const };
    }
  }, [sessionId, isCanonicalMode, ADK_APP_NAME, ADK_DEFAULT_USER]);

  // Extract option values
  const {
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    maxReconnectDelay,
    withCredentials,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  } = options;

  const sseOptions = useMemo(() => ({
    enabled: url !== '',  // ✅ Calculate enabled from URL
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    maxReconnectDelay,
    withCredentials,
    sessionId,
    method,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  }), [
    url,  // ✅ enabled depends on url
    autoReconnect,
    maxReconnectAttempts,
    reconnectDelay,
    maxReconnectDelay,
    withCredentials,
    sessionId,
    method,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  ]);

  return useSSE(url, sseOptions);
}
```

```typescript
// useChatStream.ts - Simplify options
const sseOptions = useMemo(() => ({
  autoReconnect: true,
  maxReconnectAttempts: 5,
  // ✅ NO enabled flag - let useResearchSSE calculate it
}), []); // ✅ NEVER CHANGES

const researchSSE = useResearchSSE(currentSessionId || '', sseOptions);
```

---

## Testing Checklist

- [ ] Fix Layer 2 (update useChatStream.ts)
- [ ] Restart frontend: `pm2 restart vana-frontend`
- [ ] Browser test: Send 5 rapid messages
- [ ] Verify: All POST requests have body in network tab
- [ ] Verify: No "requestBodyRef: false" warnings in console
- [ ] Verify: SSE streams connect successfully
- [ ] Integration test: Session switching mid-stream
- [ ] Performance test: No memory leaks from hook churn

---

## Why This Fix Works

**Before (broken):**
```
User sends message
  → Session created (currentSessionId changes)
    → sseOptions object changes (enabled: false → true)
      → useResearchSSE receives new options
        → Hook destroyed and recreated
          → requestBodyRef.current lost
            → connect() finds empty ref
              → Empty POST body ❌
```

**After (fixed):**
```
User sends message
  → Session created (currentSessionId changes)
    → sseOptions stays same (enabled removed)
      → useResearchSSE receives stable options
        → Hook persists (sessionId change handled internally)
          → requestBodyRef.current retained
            → connect() finds populated ref
              → POST body sent successfully ✅
```

---

## Architectural Takeaways

1. **Hook Stability is Critical**: Refs rely on hook instances persisting across renders
2. **Options Objects Kill Stability**: Every new object reference = hook recreation
3. **Memoization Alone Isn't Enough**: If parent changes inputs, child hooks still recreate
4. **Calculate Don't Pass**: Let hooks calculate derived state (like `enabled`) internally
5. **Test Timing Issues**: Unit tests can't catch render-timing race conditions

---

## Next Steps

1. **Apply Layer 2 fix** (update useChatStream.ts per Option B)
2. **Browser verification** using Chrome DevTools MCP
3. **Document in Phase 3.3 completion**
4. **Add regression test** for rapid message sending
5. **Update CLAUDE.md** with lessons learned

---

**Confidence Level:** 98% (root cause identified with evidence, fix is architectural)
**Risk Level:** Low (fix simplifies code, removes problematic enabled flag management)
**Blocker Status:** Blocking canonical streaming rollout
