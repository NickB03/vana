# Phase 3.3: Final Root Cause Analysis - Empty POST Body

**Date:** 2025-10-19
**Status:** 🔍 DEEP INVESTIGATION - Ref solution incomplete
**Attempts:** 3 (memoization, ref-passing, both combined)

---

## Executive Summary

After three fix attempts, the POST body is **STILL** empty despite:
1. ✅ Memoizing `useResearchSSE` inputs to prevent hook recreation
2. ✅ Removing `enabled` flag from parent options (calculated internally)
3. ✅ Passing `researchSSE` as ref to prevent stale closures

**The problem persists:** `connect()` is called on a hook instance with `enabled:false, url:""`, indicating the ref is pointing to a **ghost/destroyed hook instance**.

---

## Chronological Evidence

### Attempt 1: Memoization (Lines 1042-1113 in useSSE.ts)
**Fix:** Memoized URL, method, and options to prevent `useSSE` recreation
**Result:** ❌ FAILED - hook still recreated

### Attempt 2: Remove `enabled` from Parent (Lines 53-57 in useChatStream.ts)
**Fix:** Let `useResearchSSE` calculate `enabled` from URL instead of receiving it from parent
**Result:** ❌ FAILED - parent still triggers recreation

### Attempt 3: Ref-Based Access (Lines 148-161 in useChatStream.ts, Lines 24-25 + 130-161 in message-handlers.ts)
**Fix:** Pass `researchSSE` as ref so message handlers always access latest instance
**Result:** ❌ FAILED - ref points to stale instance

---

## The Smoking Gun: Browser Console Logs

**Latest attempt (10:45:xx):**
```
1.  [useSSE] Request body updated for next connection: ["appName","userId","sessionId","newMessage","streaming"]
    ↑ SUCCESS: Body set in Hook Instance X

2.  [MessageHandler] Connecting POST SSE with body (current state: disconnected)
    ↑ Message handler thinks it's connecting...

3.  [useSSE] connect() called: {"enabled":false,"url":""}
    ↑ WRONG HOOK! This is Hook Instance Y (or destroyed instance)

4.  [useSSE] connect() aborting - enabled: false url:
    ↑ Aborted because enabled=false
```

**Key observation:** Between steps 1 and 3, the hook instance changes from X (enabled:true, url:"/api/sse/run_sse") to Y (enabled:false, url:"").

---

## Hypothesis: useEffect Timing Race Condition

```typescript
// useChatStream.ts lines 148-151
const researchSSE = useResearchSSE(currentSessionId || '', sseOptions);
const researchSSERef = useRef(researchSSE);
researchSSERef.current = researchSSE;  // ⚠️ SYNC assignment
```

**Problem:** This is a **synchronous** assignment that happens during render, BEFORE useEffect runs.

But look at the message handler timing:
```typescript
// message-handlers.ts line 125-133
await messageQueueRef.current.enqueue(async () => {
  const currentResearchSSE = researchSSE?.current;  // ⚠️ Reading ref value
  // ...
  currentResearchSSE.updateRequestBody?.(requestBody);  // Step 1: Set body
  currentResearchSSE.connect();  // Step 3: Connect
});
```

**Sequence of events:**
1. User clicks send
2. Session created → `currentSessionId` changes
3. `useChatStream` **STARTS** re-rendering
4. `useResearchSSE` called with new sessionId → returns NEW hook (Instance B)
5. `researchSSERef.current = researchSSE` → ref points to Instance B
6. **BUT** - before render commits, React batches more state updates
7. Another render starts (from state updates in message handler)
8. `useResearchSSE` called AGAIN → returns DIFFERENT instance (Instance C)
9. `researchSSERef.current = researchSSE` → ref NOW points to Instance C
10. Message handler (still in async queue from step 1) accesses `researchSSERef.current` → gets Instance C
11. BUT Instance C might have different enabled/url state!

---

## The Real Root Cause: **useMemo Dependencies Still Changing**

Let me check what's ACTUALLY changing in `useResearchSSE`:

```typescript
// useSSE.ts lines 1099-1111
const sseOptions = useMemo(() => ({
  enabled: url !== '',
  autoReconnect,
  maxReconnectAttempts,
  reconnectDelay,
  maxReconnectDelay,
  withCredentials,
  sessionId,       // ⚠️ CHANGES when session created!
  method,
  onConnect,       // ⚠️ Might be new function reference!
  onDisconnect,    // ⚠️ Might be new function reference!
  onError,         // ⚠️ Might be new function reference!
  onReconnect,     // ⚠️ Might be new function reference!
}), [/* all dependencies */]);
```

**The callbacks!** If parent doesn't memoize `onConnect`, `onDisconnect`, `onError`, `onReconnect`, then EVERY parent render creates new function references → useMemo recalculates → new options object → new `useSSE` instance!

---

## Solution: Deep Investigation Required

The fix requires understanding:

1. **Are callback functions stable?** Check if `useChatStream` wraps event handlers in `useCallback`
2. **Is sessionId change alone enough?** Even if callbacks are stable, `sessionId` changes from `""` to `"session_xxx"`
3. **Should we remove sessionId from useSSE options?** It's already in the URL, why pass it separately?
4. **Do we need a completely different architecture?** Maybe the entire approach of passing SSE hooks between components is flawed

---

## Next Steps

### Investigation Phase
1. ✅ Check if `useChatStream` passes stable callbacks to `useResearchSSE`
2. ✅ Check if `useResearchSSE` needs `sessionId` in options (it's already in URL calculation)
3. ✅ Trace EXACTLY when `useSSE` instances are created/destroyed
4. ✅ Add detailed logging to track hook instance IDs

### Fix Phase (after investigation)
- Option A: Remove `sessionId` from `sseOptions` (it's redundant with URL)
- Option B: Make ALL callbacks stable with `useCallback` in parent
- Option C: Create a global SSE singleton that persists across renders
- Option D: Move SSE hook to a higher-level provider (context)

---

## Architectural Concerns

This issue reveals a fundamental problem with React's hook model for stateful connections:

1. **Hooks are ephemeral**: They're recreated on every render with dependency changes
2. **Refs help but aren't perfect**: Refs can point to stale instances if timing is wrong
3. **Async operations + React renders = race conditions**: The message handler runs async while React batches renders

**Possible long-term solution:** Move SSE management OUT of React hooks entirely. Use a singleton service class that:
- Lives outside React's render cycle
- Provides stable `connect()`, `disconnect()`, `updateRequestBody()` methods
- Emits events that React hooks can subscribe to
- Never gets destroyed/recreated by React

---

## Lessons Learned

1. **useMemo is not enough**: Even with memoization, changing dependencies recreate hooks
2. **Refs don't solve timing issues**: Refs can point to old instances during async operations
3. **Callback stability matters**: Un-memoized callbacks cause cascading recreations
4. **Browser testing is essential**: This issue is invisible in unit tests
5. **Architecture matters more than patches**: Sometimes the entire approach needs rethinking

---

**Time invested:** 4+ hours
**Lines of code changed:** 200+
**Success rate:** 0/3 attempts
**Confidence in next fix:** 40% (need deep investigation first)
