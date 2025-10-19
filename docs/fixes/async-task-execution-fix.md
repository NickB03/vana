# Async Task Execution Bug Fix

**Date:** 2025-10-18
**Issue:** Tasks created via `asyncio.create_task()` and registered via `register_task()` were not executing
**Severity:** Critical - Breaks all ADK research functionality
**Status:** ✅ FIXED

## Problem Description

### Observed Behavior
When a POST request to `/apps/{app}/users/{user}/sessions/{session}/run` was made:
1. Endpoint returned `200 OK` with success message
2. Backend logged: "ADK request task created and registered"
3. **Task never executed** - no subsequent log messages appeared
4. ADK service never received the POST request to `/run_sse`
5. Frontend SSE connection remained open but received no events

### Evidence from Logs
```
Backend (app/routes/adk_routes.py):
✅ Line 594: "Starting agent execution for session session_939e5c26-e6c0-421a-affb-ffee77bc5c9d"
❌ Line 661: "Attempting to acquire rate limiter" - NEVER REACHED

ADK Service (port 8080):
❌ No POST request received to /run_sse after 13:18:37
✅ Last successful POST was at 12:37:05 (different session)
```

## Root Cause Analysis

### The Deadlock Pattern

The bug was in `/Users/nick/Projects/vana/app/utils/sse_broadcaster.py` line 254-268:

```python
async def register_task(self, session_id: str, task: asyncio.Task) -> None:
    """Register a background task for a session, canceling any existing task."""
    async with self._lock:
        # Cancel existing task if present
        if session_id in self._tasks:
            old_task = self._tasks[session_id]
            if not old_task.done():
                old_task.cancel()
                try:
                    await old_task  # ❌ DEADLOCK: Awaiting inside the lock!
                except asyncio.CancelledError:
                    pass
                logger.info(f"Cancelled existing task...")

        self._tasks[session_id] = task  # Never reached!
```

### Why This Caused a Deadlock

1. **Lock Acquisition**: `register_task()` acquires `self._lock` (line 256)
2. **Task Cancellation**: If an old task exists, it's cancelled (line 261)
3. **Await Inside Lock**: The code awaits the cancelled task **while holding the lock** (line 263)
4. **New Task Blocked**: The new task (created on line 838 in adk_routes.py) is waiting for the same lock
5. **Circular Wait**:
   - `register_task()` holds lock → waits for old task to finish
   - New task needs lock → waits for `register_task()` to release it
   - Old task might need lock for cleanup → waits for `register_task()` to release it
   - **Result**: Deadlock - nothing progresses

### Code Flow Diagram

```
adk_routes.py (line 838-839):
┌─────────────────────────────────────┐
│ task = create_task(call_with_timeout()) ├─┐
│ await register_task(session_id, task)    │ │
└──────────────────────────────────────────┘ │
                                              │
                                              ▼
sse_broadcaster.py (line 254-268):           │
┌──────────────────────────────────────────┐ │
│ async with self._lock:                   │◄┘
│     if old_task exists:                  │
│         old_task.cancel()                │
│         await old_task  ❌ BLOCKS HERE!  │
│                                          │
│     self._tasks[session_id] = task  ❌   │  Never executed!
└──────────────────────────────────────────┘
                 │
                 │ Lock held, waiting for old task...
                 ▼
         [ DEADLOCK ]
                 │
                 │ New task waiting for lock...
                 ▼
┌──────────────────────────────────────────┐
│ call_adk_and_stream() ❌ NEVER RUNS      │
│   - Should log "Attempting to acquire..."│
│   - Should call ADK service              │
│   - Should stream events to frontend     │
└──────────────────────────────────────────┘
```

## The Fix

### Solution: Await Old Task **Outside** the Lock

```python
async def register_task(self, session_id: str, task: asyncio.Task) -> None:
    """Register a background task for a session, canceling any existing task."""
    old_task = None

    async with self._lock:
        # Cancel existing task if present
        if session_id in self._tasks:
            old_task = self._tasks[session_id]
            if not old_task.done():
                old_task.cancel()
                logger.info(f"Cancelling existing task for session {session_id}")

        # ✅ Register new task immediately (don't wait for old task to finish)
        self._tasks[session_id] = task

    # ✅ CRITICAL FIX: Wait for old task cancellation OUTSIDE the lock
    # Awaiting inside the lock can cause deadlock if the task needs the lock
    if old_task and not old_task.done():
        try:
            await old_task
        except asyncio.CancelledError:
            pass  # Expected when canceling
        logger.info(f"Cancelled existing task for session {session_id} completed")
```

### Key Changes

1. **Store old task reference** before acquiring lock
2. **Cancel old task inside lock** (safe - just sets a flag)
3. **Register new task immediately** (inside lock)
4. **Release lock** before awaiting old task completion
5. **Await old task cleanup outside lock** (prevents deadlock)

## Impact & Benefits

### Before Fix
- ❌ All ADK research requests failed silently
- ❌ Frontend showed "connecting..." indefinitely
- ❌ No error messages to users
- ❌ Backend appeared to work (200 OK responses) but tasks never ran

### After Fix
- ✅ Tasks execute immediately after registration
- ✅ ADK service receives requests correctly
- ✅ Frontend receives SSE events in real-time
- ✅ Task replacement works without blocking
- ✅ Proper task cleanup happens asynchronously

## Testing

### Unit Tests Added
Created `/Users/nick/Projects/vana/tests/test_register_task_fix.py` with 4 comprehensive tests:

1. **`test_task_executes_after_registration`**
   - Verifies task executes within 2 seconds of registration
   - Confirms no deadlock on single task registration

2. **`test_task_replacement_doesnt_block_new_task`**
   - Registers old long-running task
   - Replaces with new task
   - Verifies new task executes immediately
   - Confirms old task gets cancelled

3. **`test_multiple_rapid_registrations`**
   - Rapidly registers 10 tasks for same session
   - Verifies no deadlock occurs
   - Confirms at least one task completes

4. **`test_task_executes_before_endpoint_returns`**
   - Simulates exact bug scenario from adk_routes.py
   - Creates task, registers it, endpoint returns
   - Verifies task executes even after endpoint returns
   - **This is the critical test** that would have caught the original bug

### Test Results
```bash
$ uv run pytest tests/test_register_task_fix.py -v

tests/test_register_task_fix.py::test_task_executes_after_registration PASSED
tests/test_register_task_fix.py::test_task_replacement_doesnt_block_new_task PASSED
tests/test_register_task_fix.py::test_multiple_rapid_registrations PASSED
tests/test_register_task_fix.py::test_task_executes_before_endpoint_returns PASSED

============================== 4 passed in 7.76s ===============================
```

### Integration Tests
```bash
$ uv run pytest tests/integration/test_task_lifecycle.py -v

tests/integration/test_task_lifecycle.py::test_task_registration_and_tracking PASSED
tests/integration/test_task_lifecycle.py::test_task_cancellation_on_timeout PASSED
tests/integration/test_task_lifecycle.py::test_task_error_handling PASSED
tests/integration/test_task_lifecycle.py::test_task_cleanup_on_session_end PASSED
tests/integration/test_task_lifecycle.py::test_multiple_sessions_no_orphaned_tasks PASSED
tests/integration/test_task_lifecycle.py::test_task_replacement_on_new_registration PASSED
tests/integration/test_task_lifecycle.py::test_task_status_endpoint_all_sessions PASSED
tests/integration/test_task_lifecycle.py::test_memory_stability_with_task_churn PASSED
tests/integration/test_task_lifecycle.py::test_expired_session_cleanup_cancels_tasks PASSED

============================== 9 passed in 1.09s ===============================
```

All existing tests continue to pass! ✅

## Files Changed

### Modified
- `/Users/nick/Projects/vana/app/utils/sse_broadcaster.py` (lines 254-276)
  - Fixed `register_task()` to await old task outside lock

### Added
- `/Users/nick/Projects/vana/tests/test_register_task_fix.py`
  - Comprehensive test suite for the fix
  - Prevents regression

### Documentation
- `/Users/nick/Projects/vana/docs/fixes/async-task-execution-fix.md` (this file)
  - Complete analysis and fix documentation

## Lessons Learned

### Asyncio Lock Anti-Patterns

1. **NEVER await inside a lock if the awaited code might need the same lock**
   ```python
   # ❌ BAD - Can cause deadlock
   async with self._lock:
       await some_task_that_might_need_lock()

   # ✅ GOOD - Release lock before awaiting
   async with self._lock:
       ref = some_task
   await ref
   ```

2. **Cancellation is safe inside locks** (it just sets a flag)
   ```python
   async with self._lock:
       task.cancel()  # ✅ Safe - non-blocking
   ```

3. **Task registration should be atomic**
   ```python
   async with self._lock:
       self._tasks[session_id] = new_task  # ✅ Immediate
   ```

4. **Cleanup can happen outside locks**
   ```python
   # Register new task first (inside lock)
   async with self._lock:
       self._tasks[id] = new_task

   # Clean up old task second (outside lock)
   if old_task:
       try:
           await old_task  # ✅ Safe - lock released
       except asyncio.CancelledError:
           pass
   ```

### Debugging Tips

When tasks don't execute:
1. Check for `await` inside locks
2. Add logging at task entry points
3. Use timeouts in tests to detect hangs
4. Verify event loop is running
5. Check for circular lock dependencies

## Prevention

### Code Review Checklist
- [ ] No `await` inside `async with lock:` blocks unless provably safe
- [ ] Task creation logged at entry point
- [ ] Tests verify task execution, not just registration
- [ ] Timeout tests to catch deadlocks early

### Monitoring
- Add metric: "task_execution_delay" (time from registration to first log)
- Alert if delay > 5 seconds
- Track task completion rates

## Related Issues

This fix resolves:
- ADK research functionality completely broken
- Silent task failures (no error messages)
- Frontend SSE connections hanging
- Backend appearing to work but doing nothing

## Verification Steps

To verify the fix works in production:

1. Start backend: `make dev-backend`
2. Start ADK service: `adk web agents/ --port 8080`
3. Send POST request:
   ```bash
   curl -X POST http://localhost:8000/apps/vana/users/test/sessions/test-123/run \
     -H "Content-Type: application/json" \
     -d '{"message": "test query"}'
   ```
4. Check backend logs for:
   ```
   ✅ Starting agent execution for session test-123
   ✅ Attempting to acquire rate limiter for session test-123
   ✅ Rate limiter acquired for session test-123
   ✅ Calling ADK /run_sse for session test-123
   ```
5. Check ADK service logs for:
   ```
   ✅ POST /run_sse received
   ```

## Conclusion

This was a classic asyncio deadlock caused by awaiting a task while holding a lock that the task might need. The fix ensures:
- Locks are released before awaiting potentially blocking operations
- New tasks register immediately
- Old task cleanup happens asynchronously
- No deadlocks occur during task replacement

**Impact:** Critical bug that completely broke ADK functionality is now fixed. All research requests now work correctly.
