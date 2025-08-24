# SSE Client Infrastructure

This document describes the enhanced Server-Sent Events (SSE) client infrastructure implemented for the Vana frontend.

## Overview

The SSE client infrastructure provides a robust, production-ready solution for real-time communication between the Vana frontend and the ADK backend. It includes auto-reconnection, authentication support, heartbeat monitoring, and comprehensive error handling.

## Architecture

### Core Components

1. **`/src/lib/sse/types.ts`** - TypeScript type definitions
2. **`/src/lib/sse/client.ts`** - Enhanced SSE client implementation  
3. **`/src/hooks/useSSE.ts`** - React hooks for SSE integration

## Key Features

### ✅ Connection Management
- Auto-reconnection with exponential backoff (max 3 retries by default)
- Graceful degradation to polling fallback for unsupported browsers
- Connection state tracking and monitoring
- Proper cleanup and memory leak prevention

### ✅ Authentication & Security
- Authentication token support in headers
- Automatic token refresh integration with auth store
- Session ID management with automatic updates
- CSRF protection support

### ✅ Heartbeat & Monitoring
- Configurable heartbeat/keepalive mechanism (30s default interval)
- Network latency tracking
- Connection health monitoring
- Performance metrics collection

### ✅ Type Safety
- Full TypeScript support with strict typing
- Type-safe event handlers for known event types
- Generic event handler support for dynamic events
- Comprehensive error type definitions

### ✅ React Integration
- React hooks for seamless component integration
- Automatic cleanup on component unmount
- State synchronization with Zustand stores
- Multiple specialized hooks for different use cases

## Usage

### Basic Connection

```tsx
import { useSSE } from '@/hooks/useSSE';

function MyComponent() {
  const { isConnected, isConnecting, connectionError } = useSSE({
    autoConnect: true,
    maxRetries: 3,
    heartbeatInterval: 30000,
  });

  return (
    <div>
      Status: {isConnected ? 'Connected' : 'Disconnected'}
      {connectionError && <div>Error: {connectionError}</div>}
    </div>
  );
}
```

### Event Handling

```tsx
import { useSSEEvent, useAgentNetworkEvents } from '@/hooks/useSSE';

function EventListener() {
  // Type-safe event handling
  useSSEEvent('message', (data, event) => {
    console.log('Message received:', data);
  });

  // Specialized hook for agent events
  useAgentNetworkEvents((data, event) => {
    console.log('Agent update:', data);
  });

  return <div>Listening for events...</div>;
}
```

### Advanced Usage

```tsx
import { useSSE } from '@/hooks/useSSE';

function AdvancedComponent() {
  const {
    client,
    connectionState,
    metrics,
    addEventListener,
    updateSession,
    updateAuthToken
  } = useSSE({
    autoConnect: false,
    maxRetries: 5,
    exponentialBackoff: true,
    onConnectionChange: (state) => console.log('Connection changed:', state),
    onError: (error) => console.error('SSE Error:', error),
  });

  // Manual event listeners
  useEffect(() => {
    const unsubscribe = addEventListener('custom-event', (event) => {
      console.log('Custom event:', event.data);
    });
    
    return unsubscribe;
  }, [addEventListener]);

  return (
    <div>
      <p>State: {connectionState.state}</p>
      <p>Type: {connectionState.connectionType}</p>
      <p>Latency: {connectionState.networkLatency}ms</p>
      <p>Messages: {metrics.messagesReceived}</p>
    </div>
  );
}
```

## Event Types

### Built-in Event Types
- `message` - Chat messages and general communications
- `agent-update` / `agent-network-update` - Agent network state changes
- `agent-task` - Agent task status updates  
- `status` - System status updates
- `connection` - Connection state changes
- `error` - Error notifications
- `heartbeat` / `keepalive` - Connection health checks

### Custom Events
The client supports any custom event type through the generic event handler system.

## Configuration

### SSE Client Config
```typescript
interface SSEClientConfig {
  baseUrl?: string;                 // Default: 'http://localhost:8000'
  sessionId?: string;              // Required for connection
  enablePollingFallback?: boolean; // Default: true
  maxRetries?: number;             // Default: 3
  pollingInterval?: number;        // Default: 5000ms
  heartbeatInterval?: number;      // Default: 30000ms
  heartbeatTimeout?: number;       // Default: 10000ms
  reconnectDelay?: number;         // Default: 1000ms
  maxReconnectDelay?: number;      // Default: 30000ms
  exponentialBackoff?: boolean;    // Default: true
  headers?: Record<string, string>;
  withCredentials?: boolean;       // Default: false
  authToken?: string;              // Auto-managed from auth store
}
```

## Error Handling

### Error Types
- `connection` - Connection establishment failures
- `authentication` - Auth token or session issues
- `network` - Network-related errors
- `timeout` - Request/heartbeat timeouts
- `parse` - Message parsing failures
- `server` - Server-side errors

### Error Recovery
- Automatic retry with exponential backoff
- Fallback to polling for connection errors
- Token refresh integration for auth errors
- Graceful degradation for unsupported browsers

## Browser Compatibility

### Full Support
- Modern browsers with EventSource support
- Automatic feature detection

### Fallback Support  
- Polling-based fallback for older browsers
- Configurable polling intervals
- Same API surface for consistency

## Performance Features

### Memory Management
- Automatic cleanup on component unmount
- Event listener cleanup on unsubscribe
- Resource disposal on client destruction

### Network Optimization
- Configurable heartbeat intervals
- Connection state caching
- Efficient event dispatching
- Network latency tracking

### Metrics Collection
- Connection attempt tracking
- Success/failure rates
- Message processing statistics
- Performance timing data

## Testing

The implementation includes comprehensive unit tests covering:
- Client initialization and configuration
- Event handling and cleanup
- Connection management
- Error scenarios
- Memory leak prevention

Run tests with:
```bash
npm test sse-client.test.ts
```

## Integration with Stores

### Auth Store Integration
- Automatic token injection into headers
- Token refresh handling
- Auth state synchronization

### Session Store Integration  
- Session ID management
- Automatic session updates
- Cross-session persistence

## Examples

See `/src/examples/sse-usage-examples.tsx` for comprehensive usage examples including:
- Basic connection setup
- Event handling patterns
- Health monitoring
- Advanced configuration
- Multi-event management

## Migration from Previous Implementation

The new infrastructure is designed to be backward-compatible with existing usage patterns while providing enhanced features and better type safety.

### Key Changes
1. **Enhanced Types** - More comprehensive TypeScript definitions
2. **Better Error Handling** - Structured error types and recovery
3. **Performance Monitoring** - Built-in metrics and health tracking
4. **Memory Safety** - Improved cleanup and leak prevention
5. **Authentication** - Better auth token integration

### Upgrade Path
1. Update imports to use new hooks from `@/hooks/useSSE`
2. Replace direct client usage with appropriate hooks
3. Update event handlers to use type-safe versions where possible
4. Add error handling for better user experience

## Best Practices

### Connection Management
- Use `autoConnect: true` for components that need immediate connection
- Implement proper error boundaries for connection failures
- Monitor connection health in production applications

### Event Handling
- Use type-safe event handlers for known event types
- Implement proper cleanup in useEffect hooks
- Avoid memory leaks by unsubscribing from events

### Performance
- Use appropriate heartbeat intervals (30s recommended)
- Monitor metrics in development for optimization
- Implement retry limits to prevent infinite connection attempts

### Security
- Always use authentication tokens for protected endpoints
- Validate event data before processing
- Implement proper CSRF protection

## Troubleshooting

### Common Issues

1. **Connection Fails Immediately**
   - Check session ID is provided
   - Verify backend endpoint is accessible
   - Check authentication token validity

2. **Events Not Received**
   - Verify event listener registration
   - Check event type spelling
   - Monitor network tab for SSE connection

3. **High Memory Usage**
   - Ensure proper cleanup on unmount
   - Check for event listener leaks
   - Monitor client destruction

4. **Connection Keeps Dropping**
   - Check network stability
   - Verify heartbeat configuration
   - Monitor backend logs for issues

### Debugging
- Enable browser dev tools Network tab
- Check console for SSE client logs
- Use connection state monitoring
- Review metrics for performance issues

## Future Enhancements

Potential areas for future improvement:
- WebSocket fallback option
- Binary message support
- Message queuing for offline scenarios
- Advanced retry strategies
- Connection pooling for multiple sessions