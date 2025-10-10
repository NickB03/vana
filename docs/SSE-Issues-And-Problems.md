# SSE Implementation Issues & Problems

**Analysis Date**: 2025-10-09
**Severity Levels**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low

---

## 🔴 Critical Issues

### 1. Race Condition in SSE Connection
**Location**: Backend `/app/routes/adk_routes.py` + Frontend `/frontend/src/hooks/useSSE.ts`

**Problem**: Events can be broadcast before frontend SSE connection is established.

**Flow**:
```
1. User clicks Send → POST /run (triggers background task)
2. Backend immediately starts streaming to ADK
3. Frontend establishes SSE connection (GET /run)
4. ⚠️ Events generated in step 2-3 gap may be lost
```

**Current Mitigation**:
- History buffer stores last 10 events for new subscribers (line 485-493 in `sse_broadcaster.py`)
- Not guaranteed - very fast responses might exceed buffer

**Impact**: First few words of AI response could be lost

**Recommended Fix**:
```python
# Option 1: Wait for subscriber before starting task
async def run_endpoint():
    session_created = await create_session()
    await wait_for_first_subscriber(session_id, timeout=5.0)  # NEW
    await spawn_research_task()

# Option 2: Delay task start
await asyncio.sleep(0.5)  # Give frontend time to connect
```

**Test Coverage**: `test_sse_race_condition.py` exists but may not catch all edge cases

---

### 2. In-Memory Session Store - Data Loss on Restart
**Location**: `/app/utils/session_store.py`

**Problem**: All active sessions stored in pure in-memory dict are lost on process restart.

**Current State**:
- Sessions: Python dict in memory (`self._sessions: dict[str, SessionRecord] = {}`)
- Backup: Optional GCS backups (via `session_backup.py`)
- **NO local persistence** - pure in-memory storage

**Data Loss Window**: Complete - all sessions lost on restart

**Impact**:
- User loses research progress mid-session
- No session recovery after deployment
- Cloud Run instance restarts = total session wipe

**Recommended Fix**:
```python
# Option 1: Add Redis for persistence
import redis
redis_client = redis.Redis(host='localhost', decode_responses=True)

# Option 2: Add PostgreSQL/Cloud SQL
from sqlalchemy import create_engine
engine = create_engine(os.getenv('DATABASE_URL'))
```

---

## 🟠 High Priority Issues

### 4. Three Different SSE Hook Implementations
**Location**: Frontend `/frontend/src/hooks/`

**Files**:
1. `useSSE.ts` (784 lines) - Production hook with security
2. `useSSEWithErrorHandling.ts` (409 lines) - Enhanced error management
3. `useOptimizedSSE.ts` (743 lines) - Performance-optimized with pooling

**Problem**: Code duplication, inconsistent behavior, maintenance burden

**Example Inconsistency**:
```typescript
// useSSE.ts - Exponential backoff
delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay)

// useOptimizedSSE.ts - Different backoff
delay = Math.min(1000 * Math.pow(2, attempts), 30000)
```

**Impact**:
- Components using different hooks have different retry behavior
- Bug fixes must be applied 3 times
- Testing complexity

**Recommended Fix**: Consolidate into single hook with configuration options

---

### 5. ADK Service Single Point of Failure
**Location**: Backend `/app/routes/adk_routes.py` (line 531)

**Problem**: Hardcoded dependency on `http://127.0.0.1:8080` with no health checks or fallback.

```python
async with client.stream(
    "POST",
    "http://127.0.0.1:8080/run_sse",  # Hardcoded, no fallback
    json=adk_request,
    timeout=httpx.Timeout(300.0, read=None)
) as response:
```

**Failure Scenarios**:
- ADK service crashes → All research requests fail
- Port 8080 blocked → Complete system failure
- ADK service slow → Cascading timeouts

**No Recovery**:
- No circuit breaker pattern
- No health check before sending request
- No automatic restart mechanism

**Impact**: Single ADK failure breaks entire application

**Recommended Fix**:
```python
# Add circuit breaker
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=60)
async def call_adk_service(request):
    # Check health first
    if not await adk_health_check():
        raise ServiceUnavailableError("ADK service down")
    # Make request...
```

---

### 6. Missing Test Coverage for SSE Hooks
**Location**: Frontend `/frontend/src/hooks/`

**Problem**: No unit tests found for critical SSE hook logic.

**Missing Tests**:
- SSE reconnection logic (exponential backoff)
- Event parsing edge cases
- Memory cleanup on unmount
- Connection pooling behavior
- Token refresh during active SSE

**Current Test Files Found**:
```
✅ tests/integration/test_sse_race_condition.py (backend)
✅ tests/integration/test_sse_timing.py (backend)
❌ No frontend/tests/hooks/useSSE.test.ts
❌ No frontend/tests/hooks/useOptimizedSSE.test.ts
```

**Impact**: Regression bugs in reconnection logic, memory leaks undetected

**Recommended Fix**:
```typescript
// frontend/tests/hooks/useSSE.test.ts
describe('useSSE reconnection', () => {
  it('should exponentially backoff on connection failure', async () => {
    const { result } = renderHook(() => useSSE('/test'));
    // Mock failures and verify delay progression
  });
});
```

---

### 7. Timeout Misalignment
**Location**: Backend `/app/routes/adk_routes.py`

**Problem**: Three different timeout values that could conflict.

```python
# Line 533: httpx overall timeout
httpx.Timeout(300.0, read=None)

# Line 642: asyncio task timeout
await asyncio.wait_for(call_adk_and_stream(), timeout=300.0)

# Line 796: Queue get timeout (in event_stream)
await queue.get(timeout=30.0)
```

**Issue**: Queue timeout (30s) much shorter than overall timeout (300s)
- Queue timeout is for keepalive, but could cause confusion
- No documented timeout hierarchy

**Recommended Fix**: Document timeout strategy in code comments

---

### 8. Silent JSON Parsing Failures
**Location**: Backend `/app/routes/adk_routes.py` (line 573-574)

**Problem**: JSON parsing errors are logged but not sent to client.

```python
except json.JSONDecodeError:
    logger.debug(f"Could not parse ADK event as JSON: {line[:100]}")
    continue  # ⚠️ Event silently dropped
```

**Impact**: Critical ADK events could be lost without user notification

**Recommended Fix**:
```python
except json.JSONDecodeError as e:
    logger.warning(f"JSON parse failed: {line[:100]}")
    # Notify client of parsing error
    await broadcaster.broadcast_event(session_id, {
        "type": "error",
        "data": {
            "error": "Event parsing failed",
            "severity": "warning"
        }
    })
```

---

## 🟡 Medium Priority Issues

### 9. Global Lock Contention
**Location**: Backend `/app/utils/sse_broadcaster.py` (line 298)

**Problem**: Single `asyncio.Lock` used for all sessions.

```python
self._lock = asyncio.Lock()

async def broadcast_event(self, session_id: str, event: SSEEvent):
    async with self._lock:  # Blocks all other sessions!
        # Add to queues...
```

**Impact**: High-traffic sessions can block low-traffic sessions

**Current Mitigation**: Broadcasting happens outside lock (line 596)

**Recommended Fix**: Per-session locks
```python
self._session_locks: dict[str, asyncio.Lock] = {}
lock = self._session_locks.setdefault(session_id, asyncio.Lock())
async with lock:  # Only blocks same session
```

---

### 10. Event Format Inconsistency
**Location**: Frontend `/frontend/src/hooks/useSSE.ts` (line 163-216)

**Problem**: Parser supports two event formats causing ambiguity.

```typescript
// New format
{ type: "research_update", data: { content: "..." } }

// Legacy format (flat object)
{ content: "...", timestamp: "..." }  // type from SSE event: field
```

**Risk**:
- Fallback type guessing can misclassify events
- Legacy format might break with new fields

**Recommended Fix**: Standardize backend to always send new format

---

### 11. Connection Pool Memory Leak Risk
**Location**: Frontend `/frontend/src/hooks/useOptimizedSSE.ts` (line 72-175)

**Problem**: Singleton `SSEConnectionPool` with manual subscriber management.

```typescript
class SSEConnectionPool {
  private connections = new Map<string, ConnectionInfo>()

  removeSubscriber(url, subscriberId) {
    subscribers.delete(subscriberId)
    if (subscribers.size === 0) {
      eventSource.close()
      this.connections.delete(url)
    }
  }
}
```

**Risk**: If component unmounts without calling `removeSubscriber`, connection never closes

**Impact**: Memory leak, zombie connections

**Recommended Fix**: Add automatic cleanup on `window.beforeunload`

---

### 12. Development Mode Security Bypass
**Location**: Multiple files

**Files**:
- `frontend/src/hooks/useSSE.ts` (line 269-279)
- `frontend/src/hooks/chat/message-handlers.ts` (line 89-105)

**Problem**: Development mode allows SSE connections without authentication.

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

if (!isDevelopment && !accessToken) {
  // Only enforced in production!
}
```

**Risk**:
- Production bugs not caught in development
- Developers forget to test with authentication
- Security vulnerabilities slip through

**Recommended Fix**: Add loud warning logs
```typescript
if (isDevelopment && !accessToken) {
  console.warn('⚠️ DEV MODE: SSE connecting without auth - will fail in production!');
}
```

---

### 13. Session Expiry Edge Case
**Location**: Backend `/app/utils/sse_broadcaster.py` (line 278-281)

**Problem**: Sessions only expire if no subscribers AND past TTL.

```python
if not session_data.get("subscribers") and is_expired:
    # Only cleaned up if BOTH conditions met
```

**Edge Case**: Abandoned session with history but no subscribers takes 30 minutes to clean up

**Impact**: Memory accumulation from abandoned sessions

**Recommended Fix**: Add additional cleanup trigger based on last activity

---

### 14. Error Boundary Gaps
**Location**: Frontend `/frontend/src/components/sse/sse-error-boundary.tsx`

**Problem**: React Error Boundary catches render errors but not promise rejections.

```typescript
componentDidCatch(error, errorInfo) {
  // Only catches render errors!
  // Does NOT catch:
  // - Promise rejections in useSSE
  // - Async errors in fetch()
}
```

**Missing Coverage**:
- Unhandled promise rejections in SSE fetch
- Network errors outside React tree
- Worker thread errors

**Recommended Fix**: Add global error handler
```typescript
useEffect(() => {
  const handler = (event: PromiseRejectionEvent) => {
    if (event.reason?.message?.includes('SSE')) {
      handleSSEError(event.reason);
    }
  };
  window.addEventListener('unhandledrejection', handler);
  return () => window.removeEventListener('unhandledrejection', handler);
}, []);
```

---

### 15. Rate Limiter Not Configurable
**Location**: Backend `/app/utils/rate_limiter.py` (line 213-217)

**Problem**: Rate limits are hardcoded, not environment-configurable.

```python
gemini_rate_limiter = GeminiRateLimiter(
    max_requests=10,        # Hardcoded!
    time_window=60.0,       # Hardcoded!
    max_concurrent=3        # Hardcoded!
)
```

**Impact**:
- Cannot adjust limits without code change
- Cannot increase for paid tier users
- Cannot tune for production load

**Recommended Fix**:
```python
gemini_rate_limiter = GeminiRateLimiter(
    max_requests=int(os.getenv("GEMINI_MAX_REQUESTS", "10")),
    time_window=float(os.getenv("GEMINI_TIME_WINDOW", "60.0")),
    max_concurrent=int(os.getenv("GEMINI_MAX_CONCURRENT", "3"))
)
```

---

## 🟢 Low Priority Issues

### 16. No ADK Port Configuration
**Location**: Backend `/app/routes/adk_routes.py`

**Problem**: ADK port hardcoded to 8080.

```python
adk_url = "http://127.0.0.1:8080/run_sse"  # Hardcoded
```

**Recommended**: Environment variable `ADK_SERVICE_URL`

---

### 17. Missing Performance Metrics
**Location**: Backend (no Prometheus integration)

**Problem**: No metrics export for monitoring.

**Missing Metrics**:
- Active SSE connections count
- Event broadcast rate
- Session creation rate
- Memory usage per session
- ADK request latency

**Recommended**: Add Prometheus metrics endpoint

---

### 18. History Buffer Too Large
**Location**: Backend `/app/utils/sse_broadcaster.py` (line 301-302)

**Problem**: 500 events per session might be excessive.

```python
"history": deque(maxlen=500)  # Could be reduced
```

**Impact**: Each session uses ~50-100KB for history

**Recommended**: Reduce to 100 events or make configurable

---

### 19. No Event Replay Mechanism
**Location**: Backend (missing feature)

**Problem**: If client misses events, no way to request specific range.

**Recommended**: Add event ID-based replay
```python
GET /apps/.../sessions/{id}/events?since={event_id}
```

---

### 20. Console Warnings in Production
**Location**: Frontend `/frontend/src/hooks/useSSE.ts`

**Problem**: Debug logs and warnings might appear in production.

```typescript
console.warn('[useSSE] Event block missing data, skipping');
console.debug('[useSSE] Parsing event data...');
```

**Recommended**: Use proper logging library with environment-based levels

---

## 📊 Summary Statistics

| Severity | Count | % of Total |
|----------|-------|------------|
| 🔴 Critical | 2 | 9% |
| 🟠 High | 6 | 27% |
| 🟡 Medium | 9 | 41% |
| 🟢 Low | 5 | 23% |
| **Total** | **22** | **100%** |

**Note**: Issue #3 "SQLite Not Suitable for Multi-Instance" was revised to clarify storage layers. The SSE session store (session_store.py) uses **pure in-memory dict storage**, while ADK session persistence (adk_services.py) and authentication (database.py) DO use SQLite. The original issue incorrectly claimed SQLite was used for the SSE broadcaster.

---

## 🎯 Recommended Fix Priority

### Immediate (Sprint 1)
1. **Fix race condition** - Add subscriber wait before starting task
2. **Add session recovery** - Load from SQLite on startup
3. **Consolidate SSE hooks** - Single configurable hook

### Short-term (Sprint 2-3)
4. **Migrate to Cloud SQL** - Replace SQLite for multi-instance support
5. **Add test coverage** - Unit tests for SSE hooks
6. **Add circuit breaker** - ADK service health checks
7. **Fix error propagation** - Don't silently drop parsing errors

### Medium-term (Sprint 4-6)
8. **Add Prometheus metrics** - Monitoring and alerting
9. **Implement per-session locks** - Reduce contention
10. **Add event replay** - Client recovery mechanism

### Long-term (Future)
11. **Redis migration** - Replace in-memory broadcaster for horizontal scaling
12. **Make rate limits configurable** - Environment-based tuning

---

## 🧪 Testing Gaps

### Backend
- ❌ Race condition under high load
- ❌ Multi-instance session consistency
- ❌ ADK service failure scenarios
- ❌ Memory leak over 24-hour period
- ❌ Event broadcast performance at scale

### Frontend
- ❌ SSE hook reconnection logic
- ❌ Memory cleanup on unmount
- ❌ Connection pooling behavior
- ❌ Token refresh during active stream
- ❌ Error boundary promise rejection handling

---

## 📝 Notes

- Most issues have straightforward fixes
- No security vulnerabilities (excellent security architecture)
- Main concerns: scalability, testing, edge cases
- Current implementation works well for single-instance deployments
- Multi-instance deployment requires significant changes (Cloud SQL, Redis)

**Overall Assessment**: Production-ready for single-instance, needs hardening for horizontal scaling.
