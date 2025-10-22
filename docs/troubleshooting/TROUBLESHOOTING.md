# Troubleshooting Guide

This document provides solutions to common issues encountered when developing or running the Vana platform.

## Table of Contents

- [Service Startup Issues](#service-startup-issues)
- [Port Conflicts](#port-conflicts)
- [Authentication Issues](#authentication-issues)
- [SSE Streaming Issues](#sse-streaming-issues)
- [Frontend Issues](#frontend-issues)
- [Backend Issues](#backend-issues)
- [ADK Agent Issues](#adk-agent-issues)
- [Database & Storage Issues](#database--storage-issues)
- [Performance Issues](#performance-issues)
- [Common Error Messages](#common-error-messages)

## Service Startup Issues

### Services Won't Start

**Symptom:** `pm2 start ecosystem.config.js` fails or services crash immediately

**Solutions:**

1. **Check environment variables:**
```bash
# Verify .env.local exists and has required variables
cat .env.local | grep -E "GOOGLE_API_KEY|OPENROUTER_API_KEY"

# If missing, add them:
echo "GOOGLE_API_KEY=your_key_here" >> .env.local
echo "OPENROUTER_API_KEY=your_key_here" >> .env.local
```

2. **Check dependencies:**
```bash
# Backend
make install

# Frontend
npm --prefix frontend install
```

3. **Check Python version:**
```bash
python --version  # Should be 3.10+
uv --version      # Should be installed
```

4. **Check Node version:**
```bash
node --version    # Should be 18+
npm --version
```

### PM2 Process Crashes

**Symptom:** Services start but crash after a few seconds

**Solutions:**

1. **Check PM2 logs:**
```bash
pm2 logs

# Or check specific service
pm2 logs backend
pm2 logs adk
pm2 logs frontend
```

2. **Check for port conflicts:**
```bash
lsof -i :8000  # Backend
lsof -i :8080  # ADK
lsof -i :3000  # Frontend

# Kill conflicting processes
kill -9 <PID>
```

3. **Restart with fresh state:**
```bash
pm2 kill
pm2 start ecosystem.config.js
```

## Port Conflicts

### Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::8000`

**Solutions:**

1. **Find and kill process using port:**
```bash
# Find process
lsof -i :8000

# Kill process
kill -9 <PID>

# Or kill all on port (macOS/Linux)
lsof -ti:8000 | xargs kill -9
```

2. **Use PM2 to manage processes:**
```bash
# PM2 automatically handles port cleanup
pm2 kill
pm2 start ecosystem.config.js
```

3. **Change port (if needed):**
```bash
# Backend: Edit .env.local
PORT=8001

# Frontend: Edit package.json or use PORT env var
PORT=3001 npm --prefix frontend run dev

# ADK: Use --port flag
adk web agents/ --port 8081
```

### Multiple Instances Running

**Symptom:** Multiple instances of same service running

**Solutions:**

```bash
# List all PM2 processes
pm2 list

# Delete all instances
pm2 delete all

# Or delete specific service
pm2 delete backend

# Restart cleanly
pm2 start ecosystem.config.js
```

## Authentication Issues

### JWT Token Invalid

**Symptom:** `401 Unauthorized` or `Invalid authentication credentials`

**Solutions:**

1. **Disable auth for development:**
```bash
# Add to .env.local
AUTH_REQUIRE_SSE_AUTH=false
```

2. **Check JWT secret:**
```bash
# Ensure JWT_SECRET_KEY is set
echo "JWT_SECRET_KEY=$(openssl rand -hex 32)" >> .env.local
```

3. **Clear browser cookies:**
```javascript
// In browser console
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
```

4. **Check token expiration:**
```python
# In .env.local, increase token lifetime
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Firebase Auth Not Working

**Symptom:** Firebase authentication fails

**Solutions:**

1. **Check Firebase credentials:**
```bash
# Verify GOOGLE_APPLICATION_CREDENTIALS is set
echo $GOOGLE_APPLICATION_CREDENTIALS

# Or set it
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

2. **Verify Firebase project:**
```bash
# Check GOOGLE_CLOUD_PROJECT matches Firebase project
gcloud config get-value project
```

3. **Test Firebase connection:**
```python
from firebase_admin import auth, credentials
import firebase_admin

cred = credentials.ApplicationDefault()
firebase_admin.initialize_app(cred)

# Should not raise error
```

## SSE Streaming Issues

### SSE Connection Not Established

**Symptom:** Frontend shows "Connecting..." but never connects

**Solutions:**

1. **Check backend is running:**
```bash
curl http://127.0.0.1:8000/health
```

2. **Check SSE endpoint:**
```bash
# Test SSE endpoint directly
curl -N http://127.0.0.1:8000/apps/vana/users/default/sessions/test/run
```

3. **Check browser console:**
```javascript
// Use Chrome DevTools MCP
mcp__chrome-devtools__list_console_messages()

// Look for CORS or network errors
```

4. **Verify CORS settings:**
```python
# In app/server.py, check CORS middleware
allow_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
```

### SSE Connection Drops

**Symptom:** Connection established but drops after a few seconds

**Solutions:**

1. **Check for proxy/nginx buffering:**
```nginx
# If using nginx, add to config
proxy_buffering off;
proxy_cache off;
proxy_set_header Connection '';
proxy_http_version 1.1;
chunked_transfer_encoding off;
```

2. **Increase timeout:**
```python
# In FastAPI SSE endpoint
timeout = httpx.Timeout(300.0, read=None)  # No read timeout
```

3. **Check heartbeat:**
```python
# Ensure heartbeat is sent every 30s
# In SSE broadcaster
await asyncio.wait_for(queue.get(), timeout=30)
```

### No Events Received

**Symptom:** SSE connected but no events arrive

**Solutions:**

1. **Check ADK is running:**
```bash
curl http://127.0.0.1:8080/health
```

2. **Check ADK proxy:**
```python
# Verify FastAPI is proxying to ADK
# In app/routes/adk_routes.py
async with client.stream(
    "POST",
    "http://127.0.0.1:8080/run_sse",  # Correct ADK endpoint
    json=adk_request
) as response:
    # ...
```

3. **Enable ADK canonical stream:**
```bash
# In .env.local
ENABLE_ADK_CANONICAL_STREAM=true

# In frontend .env.local
NEXT_PUBLIC_ENABLE_ADK_CANONICAL_STREAM=true
```

4. **Check event extraction:**
```python
# Ensure extracting from BOTH text AND functionResponse
content_parts = []
for part in parts:
    if text := part.get("text"):
        content_parts.append(text)
    if func_resp := part.get("functionResponse"):
        result = func_resp.get("response", {}).get("result")
        if result:
            content_parts.append(result)
```

## Frontend Issues

### Frontend Tests Pass but Browser Shows Errors

**Symptom:** `npm test` passes but browser console has errors

**Solution:**

**ALWAYS verify in browser using Chrome DevTools MCP:**
```javascript
// 1. Check console errors
mcp__chrome-devtools__list_console_messages()

// 2. Check network requests
mcp__chrome-devtools__list_network_requests({ resourceTypes: ["xhr", "fetch", "eventsource"] })

// 3. Take snapshot
mcp__chrome-devtools__take_snapshot()
```

### UI Not Updating

**Symptom:** UI doesn't reflect state changes

**Solutions:**

1. **Check React DevTools:**
- Install React DevTools extension
- Verify state is actually changing
- Check for unnecessary re-renders

2. **Check Zustand store:**
```typescript
// Add logging to store actions
createSession: async (query: string) => {
  console.log('[Store] Creating session:', query);
  // ...
}
```

3. **Check for stale closures:**
```typescript
// Use useCallback for event handlers
const handleClick = useCallback(() => {
  // Handler code
}, [dependencies]);
```

### Styling Issues

**Symptom:** Components don't look right or theme colors are wrong

**Solutions:**

1. **Check Tailwind CSS is loaded:**
```typescript
// In app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

2. **Verify shadcn/ui components:**
```bash
# Reinstall components if needed
npx shadcn-ui@latest add button
```

3. **Check theme colors:**
```typescript
// Body text should use neutral colors
<p className="text-gray-900 dark:text-gray-100">Text</p>

// NOT theme colors
<p className="text-primary">Text</p>  // ❌ Wrong for body text
```

## Backend Issues

### Import Errors

**Symptom:** `ModuleNotFoundError: No module named 'app'`

**Solutions:**

1. **Check Python path:**
```bash
# Run from project root
cd /Users/nick/Projects/vana
uv run uvicorn app.server:app --reload
```

2. **Reinstall dependencies:**
```bash
make install
```

3. **Check virtual environment:**
```bash
# Ensure using uv's virtual environment
which python
# Should show .venv/bin/python
```

### Database Errors

**Symptom:** `sqlite3.OperationalError: no such table: sessions`

**Solutions:**

1. **Initialize database:**
```python
# In app/server.py, ensure init_auth_db() is called
from app.auth.database import init_auth_db
init_auth_db()
```

2. **Check database path:**
```bash
# Development
ls /tmp/vana_sessions.db

# If missing, it will be created on first run
```

3. **Restore from GCS backup:**
```python
from app.utils.session_backup import restore_session_db_from_gcs

restore_session_db_from_gcs(
    local_db_path="/tmp/vana_sessions.db",
    bucket_name="your-bucket",
    project_id="your-project"
)
```

## ADK Agent Issues

### Agent Not Responding

**Symptom:** Agent execution hangs or times out

**Solutions:**

1. **Test in ADK web UI:**
```bash
adk web agents/ --port 8080
# Open http://localhost:8080
# Test agent directly in UI
```

2. **Check agent definition:**
```python
# In app/agent.py
# Ensure agent has valid model and instructions
agent = LlmAgent(
    name="agent_name",
    model="gemini-2.0-flash",  # Valid model
    instruction="Clear instructions here"
)
```

3. **Check API keys:**
```bash
# Verify GOOGLE_API_KEY is valid
echo $GOOGLE_API_KEY
```

4. **Check rate limits:**
```python
# Gemini has 60 RPM limit
# Check if rate limiter is working
from app.utils.rate_limiter import gemini_rate_limiter
```

### Agent Returns Empty Response

**Symptom:** Agent executes but returns no content

**Solutions:**

1. **Check event extraction:**
```python
# Ensure extracting from functionResponse
# See docs/adk/ADK-Event-Extraction-Guide.md
```

2. **Check agent tools:**
```python
# Verify tools are working
# Test tools individually
```

3. **Enable debug logging:**
```python
import logging
logging.getLogger("google.adk").setLevel(logging.DEBUG)
```

## Database & Storage Issues

### GCS Session Persistence Fails

**Symptom:** Sessions not saved to GCS

**Solutions:**

1. **Check GCP credentials:**
```bash
gcloud auth list
gcloud config get-value project
```

2. **Check bucket exists:**
```bash
gsutil ls gs://your-bucket-name
```

3. **Check permissions:**
```bash
# Service account needs Storage Object Admin role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/storage.objectAdmin"
```

4. **Fallback to local storage:**
```bash
# Sessions will use in-memory storage if GCS unavailable
# Check logs for warnings
```

## Performance Issues

### Slow Response Times

**Symptom:** API responses take too long

**Solutions:**

1. **Check database queries:**
```python
# Add indexes to frequently queried columns
CREATE INDEX idx_user_id ON sessions(user_id);
CREATE INDEX idx_session_id ON messages(session_id);
```

2. **Enable caching:**
```python
# Cache session data in memory
from functools import lru_cache

@lru_cache(maxsize=100)
def get_session(session_id: str):
    # ...
```

3. **Check rate limiting:**
```python
# Ensure not hitting Gemini rate limits
# Check rate limiter logs
```

### High Memory Usage

**Symptom:** Backend using too much memory

**Solutions:**

1. **Check for memory leaks:**
```python
# Use memory profiler
import tracemalloc
tracemalloc.start()
# ... run code ...
snapshot = tracemalloc.take_snapshot()
top_stats = snapshot.statistics('lineno')
```

2. **Limit session cache:**
```python
# Reduce cache size
from collections import deque
event_history = deque(maxlen=100)  # Reduce from 1000
```

3. **Clean up old sessions:**
```python
# Add periodic cleanup job
async def cleanup_old_sessions():
    # Delete sessions older than 30 days
    cutoff = datetime.now() - timedelta(days=30)
    # ...
```

## Common Error Messages

### "EADDRINUSE: address already in use"
**Solution:** Kill process using port (see [Port Conflicts](#port-conflicts))

### "ModuleNotFoundError: No module named 'app'"
**Solution:** Run from project root (see [Import Errors](#import-errors))

### "401 Unauthorized"
**Solution:** Disable auth or check JWT token (see [Authentication Issues](#authentication-issues))

### "SSE connection failed"
**Solution:** Check backend and CORS (see [SSE Streaming Issues](#sse-streaming-issues))

### "Agent execution timeout"
**Solution:** Test agent in ADK UI (see [ADK Agent Issues](#adk-agent-issues))

### "sqlite3.OperationalError: no such table"
**Solution:** Initialize database (see [Database Errors](#database-errors))

---

For architecture details, see `ARCHITECTURE.md`.
For development workflows, see `DEVELOPMENT.md`.

