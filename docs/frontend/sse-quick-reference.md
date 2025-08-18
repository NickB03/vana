# SSE Quick Reference Guide

## Quick Start

### 1. Basic SSE Connection

```typescript
import { useSSEEvent } from '@/hooks/use-sse';

function MyComponent() {
  const [data, setData] = useState(null);
  
  const sse = useSSEEvent(
    'agent_network_update',
    useCallback((eventData) => {
      setData(eventData);
    }, []),
    { sessionId: 'my-session' }
  );
  
  return (
    <div>
      <div>Status: {sse.isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Data: {JSON.stringify(data)}</div>
    </div>
  );
}
```

### 2. Multiple Event Types

```typescript
function AdvancedComponent() {
  const sse = useSSE({ sessionId: 'my-session' });
  
  useEffect(() => {
    const cleanup1 = sse.addEventListener('event1', handleEvent1);
    const cleanup2 = sse.addEventListener('event2', handleEvent2);
    
    return () => {
      cleanup1();
      cleanup2();
    };
  }, [sse.addEventListener]);
  
  return <div>Multi-event component</div>;
}
```

### 3. Backend Event Broadcasting

```python
from app.utils.sse_broadcaster import get_sse_broadcaster

# Send event to specific session
async def send_update(session_id: str, data: dict):
    broadcaster = get_sse_broadcaster()
    await broadcaster.broadcast_event(session_id, {
        'type': 'agent_network_update',
        'data': data
    })

# SSE endpoint
@app.get("/sse/{session_id}")
async def sse_endpoint(session_id: str):
    async def event_generator():
        async with get_sse_broadcaster().subscribe(session_id) as queue:
            while True:
                event = await queue.get(timeout=30.0)
                yield event
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

## Common Patterns

### ✅ Correct Usage

```typescript
// Use useCallback for event handlers
const handler = useCallback((data) => {
  setData(data);
}, []);

// Proper cleanup with useEffect
useEffect(() => {
  const unsubscribe = sse.addEventListener('event', handler);
  return unsubscribe; // Always return cleanup function
}, [sse.addEventListener, handler]);

// Handle connection states
if (sse.isConnecting) return <div>Connecting...</div>;
if (sse.connectionError) return <div>Error: {sse.connectionError}</div>;
if (!sse.isConnected) return <div>Disconnected</div>;
```

### ❌ Common Mistakes

```typescript
// DON'T: Missing useCallback
const handler = (data) => setData(data); // Will cause re-renders

// DON'T: Not returning cleanup function
useEffect(() => {
  sse.addEventListener('event', handler);
  // Missing return cleanup
}, []);

// DON'T: Manual EventSource management
const eventSource = new EventSource('/sse/session'); // Use hooks instead
```

## Configuration

### Frontend SSE Client

```typescript
const sse = useSSE({
  sessionId: 'session-123',
  baseUrl: 'http://localhost:8000',
  autoConnect: true,
  enablePollingFallback: true,
  maxRetries: 10,
  pollingInterval: 5000
});
```

### Backend Broadcaster

```python
from app.utils.sse_broadcaster import BroadcasterConfig, EnhancedSSEBroadcaster

config = BroadcasterConfig(
    max_queue_size=1000,
    max_history_per_session=500,
    event_ttl=300.0,  # 5 minutes
    session_ttl=1800.0,  # 30 minutes
    cleanup_interval=60.0  # 1 minute
)

broadcaster = EnhancedSSEBroadcaster(config)
```

## Troubleshooting

### Connection Issues

```typescript
// Check connection state
const { connectionState, connectionError } = useSSE();

console.log('Connection State:', {
  connected: connectionState.connected,
  connecting: connectionState.connecting,
  error: connectionState.error,
  retryCount: connectionState.retryCount,
  connectionType: connectionState.connectionType
});

// Manual reconnection
const handleReconnect = () => {
  sse.reconnect();
};
```

### Memory Issues

```python
# Check broadcaster stats
stats = get_sse_broadcaster().get_stats()
print(f"Memory usage: {stats['memoryUsageMB']:.1f} MB")
print(f"Active sessions: {stats['totalSessions']}")
print(f"Total events: {stats['totalEvents']}")

# Force cleanup
await broadcaster._perform_cleanup()
```

### Event Handler Issues

```typescript
// Debug event handlers
const debugHandler = useCallback((event) => {
  console.log('Received event:', {
    type: event.type,
    data: event.data,
    timestamp: event.timestamp,
    id: event.id
  });
}, []);

// Test specific event
const testUnsubscribe = sse.addEventListener('test_event', debugHandler);
// Later: testUnsubscribe();
```

## Testing

### Mock SSE for Tests

```typescript
const mockSSE = {
  isConnected: true,
  isConnecting: false,
  connectionError: null,
  connectionState: { connected: true, connecting: false, error: null },
  addEventListener: jest.fn(() => jest.fn()), // Returns mock cleanup
  removeEventListener: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  reconnect: jest.fn(),
  updateSession: jest.fn()
};

jest.mock('@/hooks/use-sse', () => ({
  useSSE: () => mockSSE,
  useSSEEvent: () => mockSSE
}));
```

### Backend Testing

```python
import pytest
from app.utils.sse_broadcaster import EnhancedSSEBroadcaster, BroadcasterConfig

@pytest.mark.asyncio
async def test_sse_broadcasting():
    config = BroadcasterConfig(event_ttl=1.0)  # Short TTL for testing
    broadcaster = EnhancedSSEBroadcaster(config)
    
    try:
        # Test broadcasting
        session_id = "test_session"
        queue = await broadcaster.add_subscriber(session_id)
        
        await broadcaster.broadcast_event(session_id, {
            'type': 'test_event',
            'data': {'test': 'data'}
        })
        
        event = await queue.get(timeout=1.0)
        assert 'test_event' in event
        
    finally:
        await broadcaster.shutdown()
```

## Performance Tips

### Frontend Optimization

```typescript
// Debounce rapid events
const debouncedHandler = useCallback(
  debounce((data) => {
    setData(data);
  }, 100),
  []
);

// Use React.memo for event-driven components
const EventComponent = React.memo(({ data }) => {
  return <div>{JSON.stringify(data)}</div>;
});

// Lazy loading for SSE components
const SSEComponent = lazy(() => import('./SSEComponent'));
```

### Backend Optimization

```python
# Batch events when possible
events = [
    {'type': 'update1', 'data': data1},
    {'type': 'update2', 'data': data2}
]

for event in events:
    await broadcaster.broadcast_event(session_id, event)

# Use appropriate TTL for different event types
await broadcaster.broadcast_event(session_id, {
    'type': 'critical_update',
    'data': data,
    'ttl': 60.0  # Expire quickly for time-sensitive data
})
```

## Monitoring Commands

### Check SSE Health

```bash
# Backend health check
curl http://localhost:8000/health

# SSE stats endpoint
curl http://localhost:8000/sse/stats

# Memory usage
ps aux | grep python | grep vana
```

### Frontend Debugging

```javascript
// In browser console
window.addEventListener('beforeunload', () => {
  console.log('SSE connections:', performance.getEntriesByType('resource')
    .filter(r => r.name.includes('sse')));
});

// Check for memory leaks
setInterval(() => {
  console.log('JS Heap:', performance.memory?.usedJSHeapSize / 1024 / 1024, 'MB');
}, 5000);
```

## Environment Variables

```bash
# Frontend (.env.local)
NEXT_PUBLIC_SSE_URL=http://localhost:8000

# Backend (.env.local)
SSE_MAX_QUEUE_SIZE=1000
SSE_MAX_HISTORY_PER_SESSION=500
SSE_EVENT_TTL=300
SSE_SESSION_TTL=1800
SSE_CLEANUP_INTERVAL=60
```

## Security Considerations

### Frontend

```typescript
// Validate event data
const safeHandler = useCallback((data) => {
  if (typeof data !== 'object' || !data) return;
  
  // Sanitize and validate data before using
  const sanitizedData = DOMPurify.sanitize(JSON.stringify(data));
  setData(JSON.parse(sanitizedData));
}, []);
```

### Backend

```python
# Validate session access
@auth_required
async def sse_endpoint(session_id: str, user: User = Depends(get_current_user)):
    if not user.can_access_session(session_id):
        raise HTTPException(403, "Access denied")
    
    # Proceed with SSE connection
```

## Common Event Types

| Event Type | Purpose | Data Structure |
|------------|---------|----------------|
| `agent_network_update` | Agent status changes | `{ agentId, status, metadata }` |
| `agent_network_connection` | Connection events | `{ status, sessionId, timestamp }` |
| `keepalive` | Connection maintenance | `{ timestamp }` |
| `error` | Error notifications | `{ message, timestamp, code? }` |

This quick reference provides the essential patterns and commands needed for effective SSE development with the memory-leak-free architecture.