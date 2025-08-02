# ADK Service Layer

A comprehensive service layer for integrating React frontend with Google's Agent Development Kit (ADK) backend using Server-Sent Events (SSE).

## Architecture Overview

The service layer follows a simplified architecture based on the design review feedback:

```
ADKClient (Unified Service)
├── SessionService (Session Management)
├── SSEManager (Connection Management)  
├── MessageTransformer (Format Conversion)
└── EventStore (Event Storage & Debugging)
```

## Quick Start

### Basic Usage

```typescript
import { setupADK } from './services';

// Initialize ADK services
const { client, services } = await setupADK('user_123');

// Send a message
await client.sendMessage('Research quantum computing applications');

// Listen for events
client.on('thinking_update', (data) => {
  console.log('Agent activity:', data.agent, data.action);
});

client.on('message_update', (data) => {
  console.log('Response chunk:', data.content);
});
```

### Advanced Usage

```typescript
import { createADKServices, getDefaultADKConfig } from './services';

// Create services with custom configuration
const config = {
  ...getDefaultADKConfig(),
  apiUrl: 'https://your-adk-backend.com',
  maxRetries: 3,
  enableLogging: true
};

const services = createADKServices(config);
await services.client.initialize('user_123');

// Send message with metadata
await services.client.sendMessage('Research topic', {
  messageId: 'custom_id',
  attachments: [/* file attachments */]
});

// Subscribe to specific events
const unsubscribe = services.client.subscribeToEvents(
  ['thinking_update', 'message_update'],
  (event) => console.log('Event:', event)
);

// Cleanup
unsubscribe();
services.client.disconnect();
```

## Service Components

### ADKClient (Main Interface)

The unified client that orchestrates all service components.

**Key Methods:**
- `initialize(userId)` - Initialize for a user
- `sendMessage(content, metadata?)` - Send message to ADK
- `disconnect()` - Clean shutdown
- `getConnectionInfo()` - Connection status
- `isConnected()` - Connection state check

**Events:**
- `thinking_update` - Agent activity updates
- `message_update` - Streaming response chunks
- `workflow_update` - Research workflow state changes
- `connection_change` - Connection state changes
- `error` - Error events

### SessionService

Manages ADK sessions with persistence and caching.

**Features:**
- Automatic session creation/restoration
- Local storage persistence
- Session validation and refresh
- Fallback to local sessions when backend unavailable

### SSEManager

Handles SSE connections with ADK's per-message pattern.

**Key Features:**
- Per-message SSE connections (not persistent EventSource)
- Automatic retry with exponential backoff
- Connection state management
- Performance metrics tracking
- Request abortion and cleanup

### MessageTransformer

Transforms messages between ADK and UI formats.

**Transformations:**
- User input → ADK request format
- ADK SSE events → UI events
- Agent activity → thinking updates
- Content streams → message updates
- Workflow states → progress updates

### EventStore

Centralized event storage with debugging capabilities.

**Features:**
- Event batching and processing
- Session-based event history
- Debug mode with browser console integration
- Event filtering and querying
- Performance metrics
- CSV/JSON export for analysis

## Integration Patterns

### React Context Integration

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import { setupADK, type IADKClient } from '../services';

const ADKContext = createContext<IADKClient | null>(null);

export const ADKProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<IADKClient | null>(null);

  useEffect(() => {
    setupADK('current_user').then(({ client }) => {
      setClient(client);
    });
  }, []);

  return (
    <ADKContext.Provider value={client}>
      {children}
    </ADKContext.Provider>
  );
};

export const useADK = () => {
  const client = useContext(ADKContext);
  if (!client) throw new Error('useADK must be used within ADKProvider');
  return client;
};
```

### Custom Hooks

```typescript
import { useEffect, useState } from 'react';
import { useADK } from './ADKProvider';

export const useADKConnection = () => {
  const client = useADK();
  const [connectionInfo, setConnectionInfo] = useState(client.getConnectionInfo());

  useEffect(() => {
    const handleConnectionChange = () => {
      setConnectionInfo(client.getConnectionInfo());
    };

    client.on('connection_change', handleConnectionChange);
    return () => client.off('connection_change', handleConnectionChange);
  }, [client]);

  return connectionInfo;
};

export const useADKMessages = () => {
  const client = useADK();
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const handleMessage = (data: any) => {
      setMessages(prev => [...prev, data.content]);
    };

    client.on('message_update', handleMessage);
    return () => client.off('message_update', handleMessage);
  }, [client]);

  return { messages, sendMessage: client.sendMessage.bind(client) };
};
```

## Error Handling

The service layer provides comprehensive error handling:

```typescript
import { ADKError, SessionError, ConnectionError, MessageError } from './services';

try {
  await client.sendMessage('Research topic');
} catch (error) {
  if (error instanceof SessionError) {
    // Handle session-related errors
    console.error('Session error:', error.message);
  } else if (error instanceof ConnectionError) {
    // Handle connection errors
    console.error('Connection error:', error.message);
  } else if (error instanceof MessageError) {
    // Handle message errors
    console.error('Message error:', error.message);
  }
}

// Global error handling
client.on('error', (error) => {
  console.error('ADK Error:', error);
  // Show user-friendly error message
});
```

## Performance Considerations

### Event Batching

Events are automatically batched for smooth UI updates:

```typescript
// Events are batched every 16ms (~60fps) by default
// High-priority events (errors, connection changes) are processed immediately
```

### Memory Management

- Events are limited to 10,000 items by default  
- Session history is maintained per session
- Services can be cached and reused
- Automatic cleanup prevents memory leaks

### Connection Optimization

- Connections are per-message (ADK pattern)
- Automatic retry with exponential backoff
- Request abortion for cancelled operations
- Performance metrics tracking

## Testing

### Unit Testing

```typescript
import { createADKServicesForTest } from './services';

// Create services with mocks for testing
const services = createADKServicesForTest(
  { apiUrl: 'http://localhost:8000' },
  { 
    // Mock individual services as needed
    session: mockSessionService,
    sse: mockSSEService
  }
);
```

### Integration Testing

```typescript
// Test with real ADK backend
const services = createADKServices({
  apiUrl: 'http://localhost:8000',
  maxRetries: 1,
  retryDelay: 100
});

await services.client.initialize('test_user');
await services.client.sendMessage('test message');
```

## Debug Mode

Enable debug mode for development:

```typescript
const services = createADKServices({
  ...config,
  enableLogging: true
});

// Debug interface available at window.adkEventStore
console.log(window.adkEventStore.getDebugInfo());
```

## Migration from Legacy Services

The new service layer is backwards compatible:

```typescript
// Legacy imports still work (deprecated)
import { sseClient, sessionManager } from './services';

// New recommended imports
import { setupADK, ADKClient } from './services';
```

## Configuration

### Default Configuration

```typescript
{
  apiUrl: process.env.VITE_API_URL || 'http://localhost:8000',
  maxRetries: 5,
  retryDelay: 1000,
  timeout: 30000,
  enableLogging: process.env.NODE_ENV === 'development'
}
```

### Environment Variables

- `VITE_API_URL` - ADK backend URL
- `NODE_ENV` - Controls debug logging

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check `VITE_API_URL` configuration
   - Verify ADK backend is running
   - Check browser network tab for errors

2. **Session Issues**
   - Clear localStorage: `localStorage.clear()`
   - Check ADK session endpoint availability

3. **Message Not Sending**
   - Ensure client is initialized: `client.isConnected()`
   - Check for authentication issues
   - Verify message content is valid

4. **Memory Leaks**
   - Always call `disconnect()` when unmounting
   - Use returned cleanup functions from event subscriptions
   - Monitor event store size in debug mode

### Debug Commands

```typescript
// Available in browser console when debug mode is enabled
window.adkEventStore.getDebugInfo()    // Get debug information
window.adkEventStore.exportEvents()    // Export events as JSON
window.adkEventStore.clearEvents()     // Clear event history
```

## Contributing

When adding new features:

1. Update the appropriate service interface
2. Add comprehensive TypeScript types
3. Include error handling
4. Add unit tests
5. Update this documentation
6. Consider performance implications

## License

This service layer is part of the Vana project and follows the same license.