# Vana API Integration Guide

## Overview

This guide provides comprehensive documentation for integrating with the Vana backend API, including authentication, real-time streaming, and agent coordination.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [API Client Usage](#api-client-usage)
4. [Real-time Streaming (SSE)](#real-time-streaming-sse)
5. [Chat Integration](#chat-integration)
6. [Agent Coordination](#agent-coordination)
7. [Error Handling](#error-handling)
8. [Environment Configuration](#environment-configuration)
9. [Testing](#testing)
10. [Best Practices](#best-practices)

## Getting Started

### Installation

The integration components are included in the Vana frontend codebase:

```typescript
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import { useSSE } from '@/hooks/useSSE';
import { useChatStream } from '@/hooks/useChatStream';
```

### Quick Start

```typescript
import { useAuth, useChatStream } from '@/hooks';

function MyComponent() {
  const { login, user, isAuthenticated } = useAuth();
  const { sendMessage, messages, isStreaming } = useChatStream();

  const handleLogin = async () => {
    await login({
      email: 'user@example.com',
      password: 'password123'
    });
  };

  const handleSendMessage = async () => {
    await sendMessage('What is artificial intelligence?');
  };

  return (
    <div>
      {!isAuthenticated ? (
        <button onClick={handleLogin}>Login</button>
      ) : (
        <div>
          <p>Welcome {user?.email}</p>
          <button onClick={handleSendMessage} disabled={isStreaming}>
            Send Message
          </button>
          {messages.map(msg => (
            <div key={msg.id}>{msg.content}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Authentication

### Login Methods

#### Email/Password Login

```typescript
import { useAuth } from '@/hooks/useAuth';

const { login } = useAuth();

// JSON format
await login({
  email: 'user@example.com',
  password: 'password123'
});

// OAuth2 form format
await loginOAuth2('user@example.com', 'password123');
```

#### Google OAuth

```typescript
const { loginGoogle, handleGoogleCallback } = useAuth();

// Direct Google login
await loginGoogle({
  id_token: 'google_id_token',
  access_token: 'google_access_token'
});

// Handle OAuth callback
await handleGoogleCallback({
  code: 'oauth_code',
  state: 'oauth_state'
});
```

### User Registration

```typescript
const { register } = useAuth();

await register({
  email: 'newuser@example.com',
  username: 'newuser',
  password: 'SecurePassword123!',
  first_name: 'John',
  last_name: 'Doe'
});
```

### Protected Routes

```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';

function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>Admin content</div>
    </ProtectedRoute>
  );
}

// With permissions
function UsersPage() {
  return (
    <ProtectedRoute requiredPermission="users:read">
      <div>Users content</div>
    </ProtectedRoute>
  );
}

// Superuser only
function SystemPage() {
  return (
    <ProtectedRoute requireSuperuser>
      <div>System settings</div>
    </ProtectedRoute>
  );
}
```

### Role-Based Access Control

```typescript
const { hasRole, hasPermission, isSuperuser } = useAuth();

// Check roles
if (hasRole('admin')) {
  // Show admin features
}

// Check permissions
if (hasPermission('users:write')) {
  // Show user edit options
}

// Check superuser
if (isSuperuser()) {
  // Show system controls
}
```

## API Client Usage

### Direct API Calls

```typescript
import { apiClient } from '@/lib/api/client';

// Health check
const health = await apiClient.healthCheck();

// Get current user
const user = await apiClient.getCurrentUser();

// Submit feedback
await apiClient.submitFeedback({
  type: 'suggestion',
  message: 'Great app!',
  rating: 5
});
```

### Custom Configuration

```typescript
import { VanaAPIClient } from '@/lib/api/client';

const customClient = new VanaAPIClient({
  baseURL: 'https://api.vana.com',
  timeout: 60000,
  retryAttempts: 5,
  retryDelay: 2000
});
```

### Error Handling

```typescript
import { APIError } from '@/lib/api/types';

try {
  await apiClient.getCurrentUser();
} catch (error) {
  if (error instanceof APIError) {
    console.log('Status:', error.status_code);
    console.log('Message:', error.message);
    console.log('Headers:', error.headers);
  }
}
```

## Real-time Streaming (SSE)

### Basic SSE Connection

```typescript
import { useSSE } from '@/hooks/useSSE';

function SSEComponent() {
  const {
    connectionState,
    isConnected,
    events,
    lastEvent,
    error,
    connect,
    disconnect
  } = useSSE('/agent_network_sse/session123');

  return (
    <div>
      <p>Status: {connectionState}</p>
      {error && <p>Error: {error}</p>}
      <button onClick={connect} disabled={isConnected}>
        Connect
      </button>
      <button onClick={disconnect} disabled={!isConnected}>
        Disconnect
      </button>
      
      <div>
        <h3>Events:</h3>
        {events.map((event, index) => (
          <div key={index}>
            {event.type}: {JSON.stringify(event.data)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Agent Network SSE

```typescript
import { useAgentNetworkSSE } from '@/hooks/useSSE';

function AgentMonitor({ sessionId }: { sessionId: string }) {
  const { events, lastEvent, connectionState } = useAgentNetworkSSE(sessionId, {
    autoReconnect: true,
    maxReconnectAttempts: 10,
    onConnect: () => console.log('Agent network connected'),
    onDisconnect: () => console.log('Agent network disconnected'),
  });

  return (
    <div>
      <h3>Agent Network Status: {connectionState}</h3>
      {lastEvent?.type === 'agent_network_update' && (
        <div>
          <h4>Active Agents:</h4>
          {lastEvent.data.agents?.map(agent => (
            <div key={agent.agent_id}>
              {agent.name}: {agent.status} ({Math.round(agent.progress * 100)}%)
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Research SSE

```typescript
import { useResearchSSE } from '@/hooks/useSSE';

function ResearchMonitor({ sessionId }: { sessionId: string }) {
  const { events, lastEvent } = useResearchSSE(sessionId);

  useEffect(() => {
    if (lastEvent?.type === 'message_chunk') {
      // Handle streaming message chunk
      console.log('New chunk:', lastEvent.data.chunk);
    } else if (lastEvent?.type === 'message_complete') {
      // Handle message completion
      console.log('Message complete');
    }
  }, [lastEvent]);

  return (
    <div>
      <h3>Research Progress</h3>
      {/* Display research events */}
    </div>
  );
}
```

## Chat Integration

### Basic Chat Implementation

```typescript
import { useChatStream } from '@/hooks/useChatStream';

function ChatInterface() {
  const {
    messages,
    sendMessage,
    isStreaming,
    agents,
    progress,
    error,
    connectionState
  } = useChatStream();

  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (input.trim()) {
      await sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chat-interface">
      {/* Connection Status */}
      <div>Status: {connectionState}</div>
      
      {/* Messages */}
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.role}`}>
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
      </div>

      {/* Agent Status */}
      {agents.length > 0 && (
        <div className="agents">
          <h4>Active Agents:</h4>
          {agents.map(agent => (
            <div key={agent.agent_id}>
              {agent.name}: {agent.status}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isStreaming}
          placeholder="Type your message..."
        />
        <button onClick={handleSend} disabled={isStreaming || !input.trim()}>
          {isStreaming ? 'Sending...' : 'Send'}
        </button>
      </div>

      {/* Errors */}
      {error && <div className="error">Error: {error}</div>}
    </div>
  );
}
```

### Session Management

```typescript
function ChatWithSessions() {
  const {
    currentSession,
    getAllSessions,
    createNewSession,
    switchSession,
    clearCurrentSession
  } = useChatStream();

  const sessions = getAllSessions();

  return (
    <div>
      {/* Session List */}
      <div className="sessions">
        <button onClick={createNewSession}>New Session</button>
        {sessions.map(session => (
          <button
            key={session.id}
            onClick={() => switchSession(session.id)}
            className={currentSession?.id === session.id ? 'active' : ''}
          >
            Session {session.id.slice(-8)}
          </button>
        ))}
      </div>

      {/* Current Session */}
      {currentSession && (
        <div>
          <h3>Session: {currentSession.id}</h3>
          <button onClick={clearCurrentSession}>Clear Session</button>
          {/* Chat interface */}
        </div>
      )}
    </div>
  );
}
```

## Agent Coordination

### Agent Status Display

```typescript
import { VanaAgentStatus } from '@/components/VanaAgentStatus';

function ResearchDashboard() {
  const { agents, progress } = useChatStream();

  return (
    <div>
      <VanaAgentStatus 
        agents={agents}
        progress={progress}
        className="w-full"
      />
    </div>
  );
}
```

### Custom Agent Monitoring

```typescript
function CustomAgentMonitor() {
  const { agents } = useChatStream();

  const activeAgents = agents.filter(a => a.status === 'current');
  const completedAgents = agents.filter(a => a.status === 'completed');

  return (
    <div>
      <h3>Agent Status</h3>
      
      <div>
        <h4>Active ({activeAgents.length})</h4>
        {activeAgents.map(agent => (
          <div key={agent.agent_id} className="agent-card">
            <h5>{agent.name}</h5>
            <p>Type: {agent.agent_type}</p>
            <p>Progress: {Math.round(agent.progress * 100)}%</p>
            {agent.current_task && <p>Task: {agent.current_task}</p>}
            {agent.error && <p className="error">Error: {agent.error}</p>}
          </div>
        ))}
      </div>

      <div>
        <h4>Completed ({completedAgents.length})</h4>
        {completedAgents.map(agent => (
          <div key={agent.agent_id} className="agent-card completed">
            <h5>{agent.name}</h5>
            <p>Duration: {agent.started_at && agent.completed_at ? 
              new Date(agent.completed_at).getTime() - new Date(agent.started_at).getTime() 
              : 'Unknown'} ms</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Error Handling

### Global Error Handling

```typescript
import { logger } from '@/lib/logger';

// API errors are automatically logged
try {
  await apiClient.startResearch(sessionId, { query: 'test' });
} catch (error) {
  // Error is logged automatically
  // Handle user-facing error
  setUserError('Failed to start research. Please try again.');
}
```

### SSE Error Recovery

```typescript
function RobustSSEComponent() {
  const {
    connectionState,
    error,
    reconnectAttempt,
    connect,
    disconnect
  } = useSSE('/endpoint', {
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    onError: (error) => {
      logger.sseError('Connection failed', '/endpoint');
    },
    onReconnect: (attempt) => {
      logger.info(`Reconnection attempt ${attempt}`);
    }
  });

  if (connectionState === 'error' && reconnectAttempt >= 10) {
    return (
      <div className="error-state">
        <p>Connection failed after multiple attempts</p>
        <button onClick={connect}>Retry Connection</button>
      </div>
    );
  }

  return (
    <div>
      {/* Normal component content */}
    </div>
  );
}
```

## Environment Configuration

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_API_TIMEOUT=30000
NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_ENABLE_SSE_AUTO_RECONNECT=true
NEXT_PUBLIC_SSE_MAX_RECONNECT_ATTEMPTS=5
NEXT_PUBLIC_CHAT_MAX_MESSAGES=100
NEXT_PUBLIC_ENABLE_DEBUG_MODE=true
```

### Configuration Usage

```typescript
import { config, isDebugMode } from '@/lib/env';

// Access configuration
console.log('API URL:', config.api.baseURL);
console.log('Timeout:', config.api.timeout);

// Feature flags
if (config.auth.enableGoogleAuth) {
  // Show Google login button
}

// Debug mode
if (isDebugMode()) {
  console.log('Debug mode enabled');
}
```

## Testing

### Unit Tests

```typescript
// __tests__/api.test.ts
import { VanaAPIClient } from '@/lib/api/client';

describe('API Client', () => {
  it('should authenticate successfully', async () => {
    const client = new VanaAPIClient({ baseURL: 'http://localhost:8000' });
    
    const response = await client.login({
      email: 'test@example.com',
      password: 'password123'
    });
    
    expect(response.user.email).toBe('test@example.com');
    expect(response.tokens.access_token).toBeDefined();
  });
});
```

### Integration Tests

```bash
# Run integration tests
npm test -- --testPathPattern=integration

# Run specific test file
npm test -- api.test.ts
```

### SSE Testing

```typescript
// Mock EventSource for testing
import { renderHook } from '@testing-library/react';
import { useSSE } from '@/hooks/useSSE';

// Mock is provided in test setup
const { result } = renderHook(() => useSSE('/test-endpoint'));
```

## Best Practices

### 1. Error Handling

- Always wrap API calls in try-catch blocks
- Use the built-in retry mechanisms
- Provide user-friendly error messages
- Log errors for debugging

### 2. Authentication

- Check authentication state before making requests
- Handle token expiration gracefully
- Use protected routes for sensitive content
- Implement proper logout flows

### 3. SSE Connections

- Use auto-reconnection for reliability
- Implement exponential backoff
- Handle connection state in UI
- Clean up connections on unmount

### 4. Performance

- Use connection pooling for API requests
- Implement request deduplication
- Cache responses when appropriate
- Monitor memory usage with long-running SSE connections

### 5. Security

- Validate all user inputs
- Sanitize sensitive data in logs
- Use HTTPS in production
- Implement proper CORS settings

### 6. Development

- Use debug mode for development
- Monitor API logs for issues
- Test with different network conditions
- Use TypeScript for type safety

## API Endpoints Reference

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Token refresh
- `POST /auth/logout` - Session logout
- `GET /auth/me` - Current user info
- `POST /auth/google` - Google OAuth login

### Research
- `POST /api/run_sse/{session_id}` - Start research
- `GET /api/run_sse/{session_id}` - Research SSE stream
- `GET /agent_network_sse/{session_id}` - Agent network SSE

### System
- `GET /health` - Health check
- `POST /feedback` - Submit feedback
- `GET /agent_network_history` - Agent event history

## Support

For additional help:

1. Check the [API documentation](./api-docs.md)
2. Review the [troubleshooting guide](./troubleshooting.md)
3. Examine the test files for usage examples
4. Check the browser console for debug logs (when debug mode is enabled)

## Contributing

When adding new API integrations:

1. Update TypeScript types in `src/lib/api/types.ts`
2. Add methods to `VanaAPIClient` class
3. Create corresponding hooks if needed
4. Add comprehensive tests
5. Update this documentation