# 🔍 Deployment Diagnosis Report

**Date**: 2025-10-04
**Issue**: Messages sent from frontend (port 3000) show "Initializing research pipeline..." but never display responses, despite ADK dev UI (port 8080) showing agent activity.

---

## Root Cause: ADK /run_sse Endpoint Timeout

### Evidence

**1. Backend Logs Show Timeout**:
```
INFO: Forwarding request to ADK service for session session_cf15eafb-9a3e-4b66-ac52-e2a39a3a437c
INFO: Starting agent execution for session session_cf15eafb-9a3e-4b66-ac52-e2a39a3a437c
ERROR: Task timeout for session session_b954cebc-b971-43e0-adcb-a7bdd9c1b27e after 300 seconds
```

**2. Frontend SSE Streams Timeout**:
```
SSE proxy stream error: [TypeError: terminated] {
  [cause]: [Error [BodyTimeoutError]: Body Timeout Error]
}
GET /api/sse/api/run_sse/session_... 200 in 300918ms (5 minutes)
```

**3. ADK Is Running But Not Responding**:
- ✅ Port 8080: **Python process running** (PID 6777)
- ✅ Session creation: **Works** (`POST /apps/vana/users/default/sessions/{id}` → 200 OK)
- ❌ Streaming endpoint: **TIMES OUT** (`POST http://127.0.0.1:8080/run_sse` → no response for 5 min)

---

## Architecture Issue

### Current Flow (BROKEN)

```
Frontend (port 3000)
    ↓ POST /api/run_sse/{session}
Backend FastAPI (port 8000)
    ↓ Creates async task
    ↓ POST http://127.0.0.1:8080/run_sse
ADK Server (port 8080)
    ❌ HANGS - Never responds
    ⏰ Times out after 300s
```

### Expected Flow (from CLAUDE.md)

```
Frontend → FastAPI → ADK Agents → SSE Stream Back
```

---

## Problem Analysis

### The Disconnect

**What Works**:
- ADK dev UI on port 8080 shows agents responding
- ADK session creation endpoint works
- Frontend SSE connections established
- Backend validation working

**What Doesn't Work**:
- ADK `/run_sse` endpoint never streams responses
- Async task times out after 5 minutes
- NO agent responses reach frontend
- Frontend stays stuck on "Initializing research pipeline..."

### Code Investigation

**Backend Code** (`app/routes/adk_routes.py:511-545`):
```python
async with client.stream(
    "POST",
    "http://127.0.0.1:8080/run_sse",
    json=adk_request,
    timeout=httpx.Timeout(300.0, read=None)
) as response:
    response.raise_for_status()  # This hangs - never gets response

    async for line in response.aiter_lines():  # Never reached
        # ... process SSE events
```

**Request Format** (line 498-504):
```python
adk_request = {
    "appName": app_name,        # "vana"
    "userId": user_id,          # "default"
    "sessionId": session_id,    # "session_..."
    "newMessage": {"parts": [{"text": research_query}]},
    "streaming": True
}
```

---

## Possible Causes

### 1. ADK Not Configured for Streaming

ADK dev UI might be separate from the programmatic `/run_sse` API. The endpoint might:
- Not be implemented
- Require different authentication
- Expect different request format
- Need ADK server restart

### 2. Wrong Endpoint URL

The code calls `http://127.0.0.1:8080/run_sse` but ADK might expect:
- `/api/run_sse`
- `/apps/{app}/run_sse`
- Different path entirely

### 3. ADK Server Not Initialized Properly

The dev UI works but the programmatic API might need:
- Agent registration
- Configuration file
- Environment variables
- Explicit server start with streaming enabled

### 4. Session/Agent Mismatch

ADK might be:
- Waiting for agent initialization
- Looking for specific agent definitions
- Blocked on missing dependencies
- Waiting for user input in dev UI

---

## Diagnostic Steps

### 1. Check ADK Server Logs

```bash
# Find ADK process
lsof -i :8080  # Shows Python PID 6777

# Check what's running
ps aux | grep 6777

# Look for ADK logs (common locations)
tail -f ~/.adk/logs/*.log
tail -f /tmp/adk*.log
```

### 2. Test ADK /run_sse Directly

```bash
# Test the exact request backend makes
curl -v -X POST http://127.0.0.1:8080/run_sse \
  -H "Content-Type: application/json" \
  -d '{
    "appName": "vana",
    "userId": "default",
    "sessionId": "test_debug_123",
    "newMessage": {"parts": [{"text": "hello"}]},
    "streaming": true
  }'
```

**Expected**: SSE stream with `data: {...}` events
**Actual**: ?

### 3. Check ADK Configuration

```bash
# Find ADK config
find ~ -name "*.adk" -o -name "adk.yaml" -o -name ".adkconfig"

# Check agents directory
ls -la /Users/nick/Projects/vana/agents/

# Verify ADK installation
python -c "import google.adk; print(google.adk.__version__)"
```

### 4. Review ADK Startup Command

The dev UI on port 8080 was started with:
```bash
adk web agents/ --port 8080
```

But this might only start the UI, not the API server. Check if ADK needs:
```bash
# Separate API server?
adk serve agents/ --port 8080

# Or combined?
adk web agents/ --port 8080 --enable-api
```

---

## Recommended Fixes

### Option A: Fix ADK Endpoint (Preferred)

1. **Identify correct ADK endpoint**:
   - Check ADK documentation for streaming API
   - Test different endpoint paths
   - Verify request format matches ADK expectations

2. **Update backend proxy** (`app/routes/adk_routes.py:513`):
   ```python
   # Try different endpoint
   "POST",
   "http://127.0.0.1:8080/api/v1/run_sse",  # Or correct path
   ```

3. **Add ADK authentication if needed**:
   ```python
   headers = {
       "Authorization": f"Bearer {adk_api_key}",  # If required
       "X-ADK-Version": "1.0"  # If required
   }
   ```

### Option B: Use ADK SDK Directly

Instead of HTTP proxy, use ADK SDK:
```python
from google.adk import Agent, Session

async def call_adk_and_stream():
    agent = Agent.from_config("agents/")
    session = Session(session_id=session_id)

    async for event in agent.run_stream(
        session=session,
        message=research_query
    ):
        await broadcaster.broadcast_event(session_id, event)
```

### Option C: Bypass ADK Temporarily

For immediate testing, implement a simple response:
```python
# In app/routes/adk_routes.py, replace ADK call with:
await broadcaster.broadcast_event(session_id, {
    "type": "research_update",
    "data": {
        "content": f"Received your message: {research_query}",
        "timestamp": datetime.now().isoformat()
    }
})
```

This confirms the SSE plumbing works and isolates the ADK issue.

---

## Immediate Action Items

### 1. Check ADK Process Details

```bash
# What command is actually running ADK?
ps aux | grep 6777 | grep -v grep

# Check ADK process environment
lsof -p 6777 | grep cwd  # Working directory
```

### 2. Test ADK API Availability

```bash
# List ADK endpoints
curl http://127.0.0.1:8080/  # Check for API docs
curl http://127.0.0.1:8080/api  # Try /api prefix
curl http://127.0.0.1:8080/docs  # Swagger/OpenAPI?
```

### 3. Enable Debug Logging

**Backend** (`app/routes/adk_routes.py`):
```python
# Add before line 513
logger.info(f"Calling ADK at http://127.0.0.1:8080/run_sse with request: {adk_request}")

# Add inside stream loop at line 519
logger.info(f"Received SSE line: {line[:200]}")
```

**Restart backend**:
```bash
kill $(lsof -t -i:8000)
ENVIRONMENT=development AUTH_REQUIRE_SSE_AUTH=false uv run --env-file .env.local uvicorn app.server:app --reload --port 8000
```

### 4. Monitor Both Servers

```bash
# Terminal 1: Backend logs
tail -f /tmp/backend.log

# Terminal 2: ADK logs (find where they are)
# Check: ~/.adk/logs/, /tmp/adk*, or ADK stdout

# Terminal 3: Network traffic
sudo tcpdump -i lo0 -A 'port 8080'  # macOS
```

---

## Expected Behavior After Fix

### 1. Backend Logs Should Show:

```
INFO: Forwarding request to ADK service for session session_...
INFO: Starting agent execution for session session_...
INFO: Calling ADK at http://127.0.0.1:8080/run_sse with request: {...}
INFO: Received SSE line: data: {"content":{"parts":[{"text":"Hello..."}]}}
INFO: Broadcasting research_update for session session_..., content length: 5
INFO: Broadcasting research_update for session session_..., content length: 42
INFO: Agent execution completed for session session_...
```

### 2. Frontend Should Show:

- Message appears in chat immediately
- "Initializing research pipeline..." replaced by actual agent response
- Responses stream in real-time as agents work
- Final message displayed when complete

### 3. Console Logs Should Show:

```
[MessageHandler] Research API response: {"success":true,...}
[MessageHandler] SSE connection status: {"research":true,"agent":true}
```

---

## Architecture Notes from CLAUDE.md

**The Critical Issue** (lines 13-30):

> **INCORRECT IMPLEMENTATION (Current Problem)**:
> - `/app/research_agents.py` contains `MultiAgentResearchOrchestrator` that incorrectly simulates agents
> - This orchestrator tries to use its own LLM calls (OpenRouter/Gemini) instead of ADK
> - **This is WRONG and causes the "no response" issue**
>
> **CORRECT IMPLEMENTATION**:
> - The 8 research agents (Team Leader, Plan Generator, Section Planner, etc.) are **ADK agents on port 8080**
> - FastAPI backend (port 8000) should **proxy requests to ADK**, not run its own orchestrator
> - Flow: Frontend → FastAPI → ADK Agents (port 8080) → Response via SSE

**Current Status**:
- ✅ Backend proxies to ADK (lines 511-545 in adk_routes.py)
- ❌ ADK /run_sse endpoint not responding
- ❌ Need to fix ADK configuration or endpoint

---

## Next Steps

1. **Investigate ADK server**: Check what process 6777 is actually running
2. **Test endpoints**: Try different ADK API paths
3. **Review ADK docs**: Find correct streaming API format
4. **Check agent config**: Verify `agents/` directory has proper ADK agent definitions
5. **Enable debug logs**: Add logging to see exactly where it hangs

---

## Questions to Answer

1. How was ADK started? (`adk web` or `adk serve` or other command?)
2. Does `agents/` directory contain proper ADK agent YAML files?
3. What's in the ADK dev UI at http://localhost:8080 that shows working agents?
4. Is there an ADK API documentation endpoint at port 8080?
5. Are there any ADK error logs showing why /run_sse doesn't respond?

---

**Status**: ⚠️ **ADK /run_sse endpoint not functioning - frontend cannot receive agent responses**

**Impact**: Critical - users cannot get research results despite agents working in dev UI

**Verified By**: Claude Code (Chrome DevTools MCP + Backend Log Analysis)
**Diagnosis Date**: 2025-10-04
