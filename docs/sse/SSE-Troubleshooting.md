# SSE Troubleshooting Guide

## Quick Diagnostics

### Connection Issues

**Problem**: SSE connection fails to establish

**Quick Checks**:
```bash
# 1. Verify backend is running
curl http://localhost:8000/health

# 2. Test SSE endpoint directly
curl -N -H "Accept: text/event-stream" \
  -H "x-auth-token: YOUR_TOKEN" \
  http://localhost:8000/agent_network_sse/test-session

# 3. Check frontend can reach backend
curl http://localhost:3000/api/sse/agent_network_sse/test-session

# 4. Verify CORS configuration
curl -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  http://localhost:8000/agent_network_sse/test-session
```

**Common Causes**:

1. **Missing Authentication**
   ```typescript
   // Check if token exists
   const token = apiClient.getAccessToken();
   console.log('Auth token present:', !!token);
   ```

2. **CORS Blocking**
   ```python
   # Backend: Check allowed origins
   print(f"Allowed origins: {allow_origins}")

   # Should include your frontend URL
   allow_origins = ["http://localhost:3000", ...]
   ```

3. **Port Mismatch**
   ```bash
   # Frontend .env.local must match backend port
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000  # ✅ Correct
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8080  # ❌ Wrong if backend is 8000
   ```

### Events Not Received

**Problem**: Connected but no events arriving

**Debug Steps**:

```typescript
// Frontend: Enable verbose logging
const { lastEvent, events, connectionState } = useSSE(url, {
  onConnect: () => console.log('[SSE] Connected!'),
  onDisconnect: () => console.log('[SSE] Disconnected'),
  onError: (e) => console.error('[SSE] Error:', e)
});

// Log all events
useEffect(() => {
  console.log('[SSE] New event:', lastEvent);
}, [lastEvent]);

// Check connection state
console.log('[SSE] State:', connectionState);
console.log('[SSE] Total events:', events.length);
```

```python
# Backend: Check if events are being broadcasted
import logging
logging.basicConfig(level=logging.DEBUG)

# Add debug logging
logger.debug(f"Broadcasting event to {session_id}: {event}")

# Check subscriber count
stats = await broadcaster.get_stats()
print(f"Session {session_id} has {stats['sessionStats'].get(session_id, {}).get('subscribers', 0)} subscribers")
```

**Common Causes**:

1. **Wrong Session ID**
   ```typescript
   // Ensure consistent session ID
   const sessionId = localStorage.getItem('sessionId') || crypto.randomUUID();
   console.log('Using session ID:', sessionId);
   ```

2. **Event TTL Expired**
   ```python
   # Check event TTL configuration
   config = BroadcasterConfig(event_ttl=300.0)  # 5 minutes

   # Events older than TTL are dropped
   ```

3. **Queue Full**
   ```python
   # Check queue sizes
   stats = await broadcaster.get_stats()
   for session_id, session_stats in stats['sessionStats'].items():
       print(f"{session_id}: {session_stats['historySize']}/{config.max_history_per_session}")
   ```

### Memory Leaks

**Problem**: Backend memory usage grows over time

**Diagnostics**:

```bash
# Monitor memory usage
watch -n 5 'ps aux | grep "uvicorn.*server:app" | grep -v grep'

# Check broadcaster stats
curl http://localhost:8000/sse/stats | jq '.metrics'
```

```python
# Backend: Check for stale sessions
stats = await broadcaster.get_stats()
print(f"Total sessions: {stats['totalSessions']}")
print(f"Total events: {stats['totalEvents']}")
print(f"Memory usage: {stats['memoryUsageMB']:.1f} MB")

# Force cleanup
await broadcaster._perform_cleanup()
```

**Common Causes**:

1. **No Cleanup on Disconnect**
   ```python
   # ❌ Bad: Missing cleanup
   @app.get("/sse/{session_id}")
   async def sse_endpoint(session_id: str):
       queue = await broadcaster.add_subscriber(session_id)
       # Missing: await broadcaster.remove_subscriber(session_id, queue)

   # ✅ Good: Use context manager
   async with broadcaster.subscribe(session_id) as queue:
       while True:
           event = await queue.get()
           yield event
   ```

2. **Long-Running Sessions**
   ```python
   # Reduce session TTL for cleanup
   config = BroadcasterConfig(
       session_ttl=1800.0,  # 30 minutes → 1800 seconds
       cleanup_interval=60.0  # Check every minute
   )
   ```

3. **Too Much History**
   ```python
   # Reduce history limits
   config = BroadcasterConfig(
       max_history_per_session=100,  # Down from 500
       event_ttl=60.0  # 1 minute instead of 5
   )
   ```

### Frontend Performance Issues

**Problem**: UI becomes sluggish with many events

**Diagnostics**:

```typescript
// Monitor render performance
import { createRenderCounter } from '@/lib/react-performance';

function ChatComponent() {
  const renderCounter = createRenderCounter('ChatComponent');
  renderCounter();  // Logs render count

  // ... rest of component
}

// Check event buffer size
const { events } = useSSE(url);
console.log('Event buffer size:', events.length);

// Monitor memory
setInterval(() => {
  if (performance.memory) {
    console.log('JS Heap:', (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1), 'MB');
  }
}, 5000);
```

**Solutions**:

1. **Limit Event Buffer**
   ```typescript
   // Keep only recent events
   const MAX_EVENTS = 100;
   const [events, setEvents] = useState<Event[]>([]);

   useEffect(() => {
     if (lastEvent) {
       setEvents(prev => [...prev.slice(-MAX_EVENTS + 1), lastEvent]);
     }
   }, [lastEvent]);
   ```

2. **Use React.memo**
   ```typescript
   const MessageCard = React.memo(({ message }: Props) => {
     return <div>{message.content}</div>;
   }, (prev, next) => {
     // Only re-render if message content changed
     return prev.message.id === next.message.id &&
            prev.message.content === next.message.content;
   });
   ```

3. **Debounce UI Updates**
   ```typescript
   import { debounce } from 'lodash';

   const updateUI = useMemo(
     () => debounce((event: Event) => {
       setDisplayedEvent(event);
     }, 100),
     []
   );

   useEffect(() => {
     if (lastEvent) updateUI(lastEvent);
   }, [lastEvent]);
   ```

## Browser-Specific Issues

### Chrome/Edge

**Issue**: EventSource connection drops after 5 minutes

**Cause**: Aggressive connection management

**Solution**:
```typescript
// Increase keepalive frequency
const { isConnected } = useSSE(url, {
  // Backend sends keepalive every 30s
  // This is sufficient for Chrome
});
```

**Backend**:
```python
# Ensure keepalive sent frequently enough
async def event_generator():
    while True:
        try:
            event = await asyncio.wait_for(queue.get(), timeout=20.0)  # 20s < 30s keepalive
            yield event
        except asyncio.TimeoutError:
            yield keepalive_event()  # Prevent timeout
```

### Firefox

**Issue**: Console floods with "connection closed" warnings

**Cause**: Firefox logs all EventSource disconnections

**Solution**:
```typescript
// Suppress warnings by handling disconnections gracefully
const { connectionState } = useSSE(url, {
  onDisconnect: () => {
    // Handle silently instead of logging error
    if (connectionState !== 'reconnecting') {
      console.log('SSE disconnected (expected)');
    }
  }
});
```

### Safari

**Issue**: SSE doesn't work with HTTP-only cookies

**Cause**: Safari blocks third-party cookies by default

**Solution**:
```typescript
// Use x-auth-token header fallback
const { isConnected } = useSSE(url, {
  // Frontend automatically uses x-auth-token if cookies blocked
});

// Or configure SameSite properly
// Backend: Set-Cookie header
Set-Cookie: vana_access_token=TOKEN; SameSite=Lax; Secure; HttpOnly
```

## Network Issues

### Proxy/Load Balancer Buffering

**Problem**: Events delayed by seconds to minutes

**Cause**: Nginx/Apache buffering SSE streams

**Solution**:

**Nginx**:
```nginx
location /agent_network_sse/ {
    proxy_pass http://backend;
    proxy_buffering off;              # Disable buffering
    proxy_cache off;                  # Disable caching
    proxy_set_header Connection '';   # Keep-alive
    proxy_http_version 1.1;           # HTTP/1.1 required for SSE
    proxy_read_timeout 3600s;         # 1 hour timeout
}
```

**Backend Header**:
```python
headers = {
    "X-Accel-Buffering": "no",  # Tell nginx to not buffer
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
}
```

### Firewall/Corporate Proxy

**Problem**: SSE connections blocked entirely

**Cause**: Corporate firewalls block persistent connections

**Solution**:

1. **Use HTTPS** (many firewalls only block HTTP SSE)
   ```typescript
   const url = 'https://api.vana.com/sse/session';  // Not http://
   ```

2. **Fallback to Polling**
   ```typescript
   const [usePolling, setUsePolling] = useState(false);

   // Detect SSE failure
   const { error } = useSSE(url, {
     onError: (e) => {
       if (e.message.includes('blocked') || e.message.includes('firewall')) {
         setUsePolling(true);
       }
     }
   });

   // Polling fallback
   useEffect(() => {
     if (!usePolling) return;

     const interval = setInterval(async () => {
       const res = await fetch(`/api/sessions/${sessionId}/events`);
       const data = await res.json();
       processEvents(data.events);
     }, 5000);

     return () => clearInterval(interval);
   }, [usePolling]);
   ```

## Authentication Issues

### Token Expiration

**Problem**: Connection drops after token expires

**Solution**:

```typescript
import { apiClient } from '@/lib/api/client';

const { isConnected, error, reconnect } = useSSE(url);

useEffect(() => {
  if (error?.includes('401') || error?.includes('Unauthorized')) {
    // Token expired, refresh it
    apiClient.refreshToken().then(() => {
      reconnect();  // Reconnect with new token
    });
  }
}, [error, reconnect]);
```

### Missing CSRF Token

**Problem**: POST requests to SSE endpoints fail with 403

**Solution**:

```typescript
// Ensure CSRF token in headers
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

fetch('/api/sse/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken || '',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

## Debugging Tools

### Backend Logging

```python
import logging

# Enable debug logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# In broadcaster
logger.debug(f"[SSE] Session {session_id} subscribers: {len(self._subscribers.get(session_id, []))}")
logger.debug(f"[SSE] Broadcasting {event_type} to {session_id}")
logger.debug(f"[SSE] Queue size for {session_id}: {queue.qsize()}")
```

### Frontend Logging

```typescript
// Enable SSE logging in development
if (process.env.NODE_ENV === 'development') {
  window.addEventListener('beforeunload', () => {
    const sseConnections = performance.getEntriesByType('resource')
      .filter(r => r.name.includes('sse') || r.name.includes('event-stream'));

    console.log('[SSE] Active connections:', sseConnections.length);
    console.log('[SSE] Connection details:', sseConnections);
  });
}

// Log all SSE events
const { lastEvent } = useSSE(url, {
  // ... options
});

useEffect(() => {
  if (lastEvent) {
    console.log('[SSE Event]', {
      type: lastEvent.type,
      timestamp: lastEvent.data.timestamp,
      data: lastEvent.data
    });
  }
}, [lastEvent]);
```

### Chrome DevTools

**Network Tab**:
1. Filter by "EventStream" or "text/event-stream"
2. Click SSE connection to see raw event stream
3. Check "Timing" tab for connection delays
4. Look for 101 Switching Protocols response

**Console**:
```javascript
// Monitor SSE in console
const eventSource = document.querySelector('eventsource');
eventSource.addEventListener('message', (e) => {
  console.log('SSE:', e.data);
});
```

### Testing SSE Endpoint

```bash
# Test with curl
curl -N \
  -H "Accept: text/event-stream" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/agent_network_sse/test-session

# With custom headers
curl -N \
  -H "Accept: text/event-stream" \
  -H "x-auth-token: YOUR_TOKEN" \
  -H "x-session-id: test-session" \
  http://localhost:8000/agent_network_sse/test-session

# Verbose output
curl -v -N \
  -H "Accept: text/event-stream" \
  http://localhost:8000/agent_network_sse/test-session
```

## Common Error Messages

### `Failed to construct 'EventSource': The URL's scheme must be 'http' or 'https'`

**Cause**: Invalid URL passed to EventSource

**Fix**:
```typescript
// ❌ Bad
const url = 'sse/session';  // Missing protocol

// ✅ Good
const url = '/api/sse/session';  // Relative URL
const url = 'http://localhost:8000/sse/session';  // Absolute URL
```

### `EventSource cannot be opened. Server sent status 401`

**Cause**: Missing or invalid authentication token

**Fix**:
```typescript
// Check token availability
const token = apiClient.getAccessToken();
if (!token && process.env.NODE_ENV === 'production') {
  console.error('No auth token available');
  redirectToLogin();
}
```

### `The request's credentials mode prohibits modifying cookies and other authentication data`

**Cause**: CORS misconfiguration

**Fix**:
```python
# Backend: Ensure CORS allows credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,  # Must be True for cookies
    allow_methods=["*"],
    allow_headers=["*"]
)
```

### `Queue is full`

**Cause**: Client not consuming events fast enough

**Fix**:
```python
# Backend: Increase queue size
config = BroadcasterConfig(max_queue_size=2000)  # Up from 1000

# Or reduce event frequency
async def broadcast_with_throttle(session_id: str, event: dict):
    # Only send if queue has space
    stats = await broadcaster.get_stats()
    queue_size = stats['sessionStats'].get(session_id, {}).get('historySize', 0)

    if queue_size < broadcaster.config.max_queue_size * 0.9:  # 90% threshold
        await broadcaster.broadcast_event(session_id, event)
```

## Production Debugging

### Cloud Run / Kubernetes

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision" --limit 50

# Filter SSE logs
gcloud logging read "resource.type=cloud_run_revision AND textPayload:SSE" --limit 50

# Monitor memory
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/container/memory/utilizations"'
```

### Monitoring Dashboard

```python
# Expose metrics endpoint
from prometheus_client import Counter, Gauge, generate_latest

sse_connections = Gauge('sse_connections_total', 'Active SSE connections')
sse_events = Counter('sse_events_total', 'Total events broadcast', ['event_type'])

@app.get("/metrics")
def metrics():
    # Update metrics
    stats = get_sse_broadcaster().get_stats()
    sse_connections.set(stats['totalSubscribers'])

    return Response(generate_latest(), media_type='text/plain')
```

---

**Related Documentation**:
- [SSE Configuration Guide](./SSE-Configuration.md) - Deployment and tuning
- [SSE Implementation Guide](./SSE-Implementation-Guide.md) - Code examples
