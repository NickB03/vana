# SSE Memory Leak Fix and Architecture Improvements

## Overview

This document describes the comprehensive memory leak fixes and architectural improvements implemented for the Server-Sent Events (SSE) system in the Vana application. These improvements address critical production memory leaks, implement proper resource management, and enhance the overall SSE architecture for better performance and reliability.

## Table of Contents

1. [Problem Analysis](#problem-analysis)
2. [Technical Solution](#technical-solution)
3. [Architecture Changes](#architecture-changes)
4. [Performance Impact](#performance-impact)
5. [Code Examples](#code-examples)
6. [Developer Guidelines](#developer-guidelines)
7. [Testing Strategy](#testing-strategy)

## Problem Analysis

### 1. SSE Event Handler Memory Leak Issue

#### Root Cause
The original SSE implementation suffered from several critical memory leaks:

- **removeEventListener not unsubscribing from SSE client**: Event handlers registered with the SSE client were not properly unsubscribed when React components unmounted
- **Registry structure inefficiency**: The event handler registry used `Map<string, Set<handler>>` which couldn't track unsubscribe functions per handler
- **Missing cleanup in client reconnections**: When SSE clients reconnected, old handlers weren't properly cleaned up
- **Unbounded event history**: No limits on stored event history causing unlimited memory growth
- **Stale queue accumulation**: Dead/inactive queues weren't automatically cleaned up

#### Impact in Production
- **Memory leaks**: Continuous memory growth over time
- **Duplicate event deliveries**: Old handlers remained active after reconnections
- **Performance degradation**: Increased garbage collection pressure
- **Resource exhaustion**: Potential server crashes under sustained load

### 2. Event Handler Lifecycle Issues

```typescript
// BEFORE: Problematic pattern
const eventHandlersRef = useRef<Map<string, Set<(event: SSEEvent) => void>>>(new Map());

const addEventListener = useCallback((eventType: string, handler: Function) => {
  // Register with local map
  eventHandlersRef.current.get(eventType)!.add(handler);
  
  // Register with client - but unsubscribe function was lost
  clientRef.current?.on(eventType, handler);
  
  // Return cleanup that only cleaned local map, not client
  return () => {
    eventHandlersRef.current.get(eventType)?.delete(handler);
  };
}, []);
```

## Technical Solution

### 1. Registry Restructure

The event handler registry was restructured from `Map<string, Set<handler>>` to `Map<string, Map<handler, unsubscribe>>`:

```typescript
// NEW: Improved registry structure
const eventHandlersRef = useRef<Map<string, Map<Function, Function>>>(new Map());

const addEventListener = useCallback((
  eventType: string, 
  handler: (event: SSEEvent) => void
): (() => void) => {
  // Register in local map with unsubscribe tracking
  if (!eventHandlersRef.current.has(eventType)) {
    eventHandlersRef.current.set(eventType, new Map());
  }
  
  // Register with client and store unsubscribe function
  const unsubscribe = clientRef.current?.on(eventType, handler);
  eventHandlersRef.current.get(eventType)!.set(handler, unsubscribe);

  // Return comprehensive cleanup function
  return () => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      const unsubscribeFunc = handlers.get(handler);
      unsubscribeFunc?.(); // Clean up client subscription
      handlers.delete(handler); // Clean up local registry
      
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventType);
      }
    }
  };
}, []);
```

### 2. Enhanced SSE Client Architecture

#### Memory-Optimized Queue Implementation

```typescript
class MemoryOptimizedQueue {
  private maxsize: number;
  private _queue: deque;
  private _condition: asyncio.Condition;
  private _closed = false;
  private _last_activity = time.time();

  async put(item: Any, timeout?: number): Promise<boolean> {
    if (this._closed || (this.maxsize > 0 && len(this._queue) >= this.maxsize)) {
      return false; // Prevent unbounded growth
    }
    // ... implementation
  }

  is_stale(max_age: number): boolean {
    return (time.time() - this._last_activity) > max_age;
  }
}
```

#### Bounded Event History with TTL

```python
@dataclass
class SSEEvent:
    type: str
    data: dict[str, Any]
    ttl: float | None = None  # Time to live in seconds
    created_at: float = field(default_factory=time.time)

    def is_expired(self) -> bool:
        if self.ttl is None:
            return False
        return (time.time() - self.created_at) > self.ttl
```

#### Session Management with Automatic Cleanup

```python
class SessionManager:
    def cleanup_expired_sessions(self) -> set[str]:
        """Remove expired sessions with no subscribers."""
        current_time = time.time()
        expired_sessions = set()

        with self._lock:
            for session_id, last_activity in list(self._sessions.items()):
                if (
                    self._subscriber_counts[session_id] == 0
                    and (current_time - last_activity) > self.config.session_ttl
                ):
                    expired_sessions.add(session_id)
                    del self._sessions[session_id]
                    if session_id in self._subscriber_counts:
                        del self._subscriber_counts[session_id]

        return expired_sessions
```

### 3. Client Initialization Improvements

The `initializeClient` function was enhanced to properly refresh stored unsubscribe references:

```typescript
const initializeClient = useCallback(() => {
  if (clientRef.current) {
    clientRef.current.destroy();
  }

  clientRef.current = new SSEClient(config);

  // Set up connection state handler
  clientRef.current.onConnectionChange((state) => {
    setConnectionState(state);
  });

  // Re-register existing event handlers with fresh unsubscribe functions
  eventHandlersRef.current.forEach((handlers, eventType) => {
    const newHandlers = new Map();
    handlers.forEach((oldUnsubscribe, handler) => {
      const newUnsubscribe = clientRef.current?.on(eventType, handler);
      newHandlers.set(handler, newUnsubscribe);
    });
    eventHandlersRef.current.set(eventType, newHandlers);
  });
}, [baseUrl, sessionId, enablePollingFallback, maxRetries, pollingInterval]);
```

### 4. useSSEEvent Dependency Optimization

The `useSSEEvent` hook was optimized to prevent effect thrashing:

```typescript
export function useSSEEvent<T = unknown>(
  eventType: string,
  handler: (data: T, event: SSEEvent) => void,
  options: UseSSEOptions = {}
): UseSSEReturn {
  const sse = useSSE(options);

  useEffect(() => {
    const unsubscribe = sse.addEventListener(eventType, (event) => {
      handler(event.data as T, event);
    });

    return unsubscribe;
  }, [eventType, handler, sse.addEventListener]); // Optimized dependencies

  return sse;
}
```

## Architecture Changes

### 1. Enhanced SSE Broadcaster Configuration

```python
@dataclass
class BroadcasterConfig:
    max_queue_size: int = 1000
    max_history_per_session: int = 500
    event_ttl: float | None = 300.0  # 5 minutes default TTL
    session_ttl: float = 1800.0  # 30 minutes default session TTL
    cleanup_interval: float = 60.0  # 1 minute cleanup interval
    enable_metrics: bool = True
    max_subscriber_idle_time: float = 600.0  # 10 minutes
    memory_warning_threshold_mb: float = 500.0
    memory_critical_threshold_mb: float = 1000.0
```

### 2. Background Cleanup System

```python
class EnhancedSSEBroadcaster:
    async def _background_cleanup(self):
        """Background task for periodic cleanup."""
        while self._running:
            try:
                await asyncio.sleep(self.config.cleanup_interval)
                await self._perform_cleanup()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in background cleanup: {e}")

    async def _perform_cleanup(self):
        """Perform comprehensive cleanup of expired resources."""
        # Clean up expired events
        # Clean up dead queues  
        # Clean up expired sessions
        # Update memory metrics
```

### 3. Context Manager for Safe Resource Management

```python
@asynccontextmanager
async def subscribe(self, session_id: str) -> AsyncContextManager[MemoryOptimizedQueue]:
    """Context manager for safe subscription management."""
    queue = await self.add_subscriber(session_id)
    try:
        yield queue
    finally:
        await self.remove_subscriber(session_id, queue)
```

## Performance Impact

### Before vs After Comparison

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Memory Growth | Unbounded | Bounded by config | 🟢 Fixed |
| Event Handler Cleanup | Partial | Complete | 🟢 Fixed |
| Queue Management | Manual | Automatic | 🟢 Improved |
| Session Lifecycle | Manual | Automatic | 🟢 Improved |
| Memory Monitoring | None | Comprehensive | 🟢 Added |

### Memory Usage Improvements

- **Bounded Event History**: Limited to 500 events per session (configurable)
- **TTL-based Expiration**: Events expire after 5 minutes (configurable)
- **Queue Size Limits**: Maximum 1000 items per queue (configurable)
- **Session Timeout**: Sessions expire after 30 minutes of inactivity
- **Background Cleanup**: Automatic cleanup every 60 seconds

### Production Benefits

- **Memory Leak Prevention**: No more unbounded memory growth
- **Improved Performance**: Reduced garbage collection pressure
- **Better Reliability**: Automatic recovery from resource exhaustion
- **Enhanced Monitoring**: Real-time memory usage tracking

## Code Examples

### 1. Proper SSE Hook Usage

```typescript
// ✅ CORRECT: Using useSSEEvent with proper cleanup
function AgentNetworkComponent() {
  const [networkData, setNetworkData] = useState(null);
  
  // This hook automatically manages subscriptions and cleanup
  const sse = useSSEEvent(
    'agent_network_update',
    useCallback((data) => {
      setNetworkData(data);
    }, []),
    { sessionId: 'my-session' }
  );
  
  return (
    <div>
      <div>Connection: {sse.isConnected ? 'Connected' : 'Disconnected'}</div>
      <div>Data: {JSON.stringify(networkData)}</div>
    </div>
  );
}
```

### 2. Manual Event Subscription (Advanced)

```typescript
// ✅ CORRECT: Manual subscription with proper cleanup
function AdvancedSSEComponent() {
  const sse = useSSE({ sessionId: 'my-session' });
  
  useEffect(() => {
    // Each addEventListener returns an unsubscribe function
    const unsubscribe1 = sse.addEventListener('event1', (event) => {
      console.log('Event 1:', event);
    });
    
    const unsubscribe2 = sse.addEventListener('event2', (event) => {
      console.log('Event 2:', event);
    });
    
    // Return cleanup function that calls all unsubscribe functions
    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [sse.addEventListener]);
  
  return <div>Advanced SSE Component</div>;
}
```

### 3. Backend SSE Stream Implementation

```python
# ✅ CORRECT: Using context manager for proper resource cleanup
async def agent_network_sse_endpoint(session_id: str):
    """SSE endpoint with automatic resource cleanup."""
    broadcaster = get_sse_broadcaster()
    
    async def event_generator():
        async with broadcaster.subscribe(session_id) as queue:
            try:
                while True:
                    event = await queue.get(timeout=30.0)
                    yield event
            except asyncio.CancelledError:
                logger.info(f"SSE stream cancelled for session {session_id}")
                break
            finally:
                # Cleanup is automatic via context manager
                pass
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
```

## Developer Guidelines

### 1. SSE Event Handler Best Practices

#### ✅ DO:
- Always use the provided hooks (`useSSE`, `useSSEEvent`)
- Return unsubscribe functions from `addEventListener`
- Use `useCallback` for event handlers to prevent unnecessary re-renders
- Handle connection state changes appropriately
- Implement proper error boundaries for SSE components

#### ❌ DON'T:
- Manually manage EventSource instances
- Forget to clean up event listeners
- Create event handlers in render functions without `useCallback`
- Ignore connection state in UI components
- Add event listeners without removing them

### 2. Memory Management Guidelines

#### Backend Configuration
```python
# Configure memory limits based on your needs
config = BroadcasterConfig(
    max_queue_size=500,           # Adjust based on expected concurrent users
    max_history_per_session=100,  # Adjust based on UI requirements
    event_ttl=300.0,             # 5 minutes - adjust based on data freshness needs
    session_ttl=1800.0,          # 30 minutes - adjust based on user session length
    cleanup_interval=60.0,       # 1 minute - more frequent for high-load systems
)
```

#### Monitoring Memory Usage
```python
# Get comprehensive memory statistics
stats = broadcaster.get_stats()
print(f"Memory usage: {stats['memoryUsageMB']:.1f} MB")
print(f"Total sessions: {stats['totalSessions']}")
print(f"Total events: {stats['totalEvents']}")
```

### 3. Error Handling Patterns

```typescript
// Implement proper error boundaries
function SSEErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const handleError = (error) => {
      console.error('SSE Error:', error);
      setHasError(true);
    };
    
    window.addEventListener('unhandledrejection', handleError);
    return () => window.removeEventListener('unhandledrejection', handleError);
  }, []);
  
  if (hasError) {
    return <div>Error: SSE connection failed. Please refresh the page.</div>;
  }
  
  return children;
}
```

### 4. Testing SSE Components

```typescript
// Mock SSE for testing
const mockSSE = {
  isConnected: true,
  addEventListener: jest.fn((type, handler) => {
    // Return mock unsubscribe function
    return jest.fn();
  }),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('@/hooks/use-sse', () => ({
  useSSE: () => mockSSE,
  useSSEEvent: (eventType, handler) => mockSSE,
}));
```

## Testing Strategy

### 1. Memory Leak Prevention Tests

The comprehensive test suite includes specific tests for memory leak prevention:

```python
@pytest.mark.asyncio
async def test_memory_leak_under_load():
    """Test that system doesn't leak memory under sustained load."""
    # Generate sustained load with many sessions and events
    # Verify memory usage remains bounded
    # Check that cleanup works properly
```

### 2. Resource Cleanup Tests

```python
@pytest.mark.asyncio
async def test_context_manager_cleanup():
    """Test context manager ensures proper cleanup."""
    async with broadcaster.subscribe(session_id) as queue:
        # Use queue
        pass
    # Verify queue is properly cleaned up
    assert queue._closed
```

### 3. Performance Regression Tests

```python
def test_stats_performance_under_load():
    """Test that stats collection doesn't impact performance."""
    # Measure stats collection time
    # Ensure it stays under acceptable thresholds
```

### 4. Frontend Integration Tests

```typescript
describe('SSE Memory Management', () => {
  it('should clean up event listeners on unmount', () => {
    const { unmount } = render(<SSEComponent />);
    
    // Verify event listeners are registered
    expect(mockAddEventListener).toHaveBeenCalled();
    
    unmount();
    
    // Verify cleanup functions were called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
```

## Monitoring and Debugging

### 1. Memory Usage Monitoring

```typescript
// Frontend monitoring
const sse = useSSE({ sessionId });

useEffect(() => {
  if (sse.connectionError) {
    console.error('SSE Connection Error:', sse.connectionError);
    // Report to monitoring service
  }
}, [sse.connectionError]);
```

### 2. Backend Memory Metrics

```python
# Monitor broadcaster memory usage
stats = broadcaster.get_stats()
metrics = {
    'memory_mb': stats['memoryUsageMB'],
    'total_sessions': stats['totalSessions'],
    'total_events': stats['totalEvents'],
    'cleanup_count': stats['metrics']['cleanupCount'],
}

# Send to monitoring service
logger.info(f"SSE Memory Metrics: {metrics}")
```

### 3. Performance Debugging

```python
# Enable detailed logging for debugging
logging.getLogger('app.utils.sse_broadcaster').setLevel(logging.DEBUG)

# Monitor cleanup performance
if cleanup_time > 1.0:
    logger.warning(
        f"Cleanup took {cleanup_time:.2f}s, "
        f"cleaned {expired_events} events, {dead_queues} queues"
    )
```

## Conclusion

The SSE memory leak fixes and architectural improvements provide a robust, production-ready SSE system with:

- **Complete memory leak prevention** through proper resource management
- **Bounded resource usage** with configurable limits
- **Automatic cleanup** of stale resources
- **Comprehensive monitoring** for production debugging
- **Developer-friendly APIs** with proper TypeScript types
- **Thorough testing** to prevent regressions

These improvements ensure the Vana application can handle sustained SSE loads in production without memory-related issues, while providing a better developer experience and more reliable real-time features.