# SSE Implementation Guide

## Table of Contents

1. [Backend Implementation](#backend-implementation)
2. [Frontend Implementation](#frontend-implementation)
3. [Common Patterns](#common-patterns)
4. [Best Practices](#best-practices)
5. [Code Examples](#code-examples)
6. [Testing Strategies](#testing-strategies)
7. [Performance Optimization](#performance-optimization)
8. [Common Pitfalls](#common-pitfalls)

## Backend Implementation

### 1. Setting Up the SSE Broadcaster

The SSE broadcaster is a singleton that manages all SSE connections across your application.

#### Basic Configuration

```python
# app/utils/sse_broadcaster.py

from app.utils.sse_broadcaster import (
    EnhancedSSEBroadcaster,
    BroadcasterConfig,
    get_sse_broadcaster
)

# Custom configuration (optional)
custom_config = BroadcasterConfig(
    max_queue_size=2000,              # Increase for high-traffic scenarios
    max_history_per_session=1000,     # More history for complex sessions
    event_ttl=600.0,                  # 10 minutes for longer-lived events
    session_ttl=3600.0,               # 1 hour for active sessions
    cleanup_interval=120.0,           # Cleanup every 2 minutes
    enable_metrics=True,              # Enable performance tracking
    max_subscriber_idle_time=1200.0,  # 20 minutes idle timeout
    memory_warning_threshold_mb=200.0,
    memory_critical_threshold_mb=500.0
)

# Create broadcaster instance (usually done automatically)
broadcaster = EnhancedSSEBroadcaster(custom_config)

# Or use the global singleton
broadcaster = get_sse_broadcaster()
```

### 2. Creating SSE Endpoints

#### Basic SSE Endpoint Pattern

```python
from fastapi import FastAPI, Depends
from fastapi.responses import StreamingResponse
from collections.abc import AsyncGenerator
from app.utils.sse_broadcaster import get_sse_broadcaster, SSEEvent
from app.auth.security import current_active_user_dep
from app.auth.models import User
import asyncio
import json
from datetime import datetime

app = FastAPI()

@app.get("/sse/{session_id}")
async def sse_endpoint(
    session_id: str,
    current_user: User = Depends(current_active_user_dep)
) -> StreamingResponse:
    """Basic SSE endpoint with authentication."""

    async def event_generator() -> AsyncGenerator[str, None]:
        """Generate SSE events for the client."""
        broadcaster = get_sse_broadcaster()

        # Subscribe to session events using context manager
        # This ensures proper cleanup even if connection drops
        async with broadcaster.subscribe(session_id) as queue:
            try:
                # Send initial connection event
                connection_event = SSEEvent(
                    type="connection",
                    data={
                        "status": "connected",
                        "sessionId": session_id,
                        "userId": current_user.id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                yield connection_event.to_sse_format()

                # Stream events from queue
                while True:
                    try:
                        # Wait for event with 30s timeout for keepalive
                        event = await asyncio.wait_for(
                            queue.get(),
                            timeout=30.0
                        )

                        # Handle different event formats
                        if isinstance(event, str):
                            yield event  # Pre-formatted SSE string
                        elif isinstance(event, dict):
                            # Convert dict to SSE format
                            event_obj = SSEEvent(
                                type=event.get("type", "message"),
                                data=event
                            )
                            yield event_obj.to_sse_format()
                        else:
                            # Object with to_sse_format method
                            yield event.to_sse_format()

                    except asyncio.TimeoutError:
                        # Send keepalive to prevent connection timeout
                        keepalive = SSEEvent(
                            type="keepalive",
                            data={"timestamp": datetime.utcnow().isoformat()}
                        )
                        yield keepalive.to_sse_format()

            except asyncio.CancelledError:
                # Client disconnected (expected)
                logger.info(f"SSE connection cancelled for session {session_id}")
                raise

            except Exception as e:
                # Unexpected error
                logger.error(f"SSE stream error: {e}")
                error_event = SSEEvent(
                    type="error",
                    data={
                        "message": "Stream error occurred",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                yield error_event.to_sse_format()
                raise

            finally:
                # Send disconnection event
                disconnect_event = SSEEvent(
                    type="connection",
                    data={
                        "status": "disconnected",
                        "sessionId": session_id,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )
                yield disconnect_event.to_sse_format()

    # Return streaming response with proper headers
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )
```

#### Advanced: ADK-Compliant Endpoint

```python
from google.adk.sessions import SessionStore  # type: ignore

@app.get("/apps/{app_name}/users/{user_id}/sessions/{session_id}/run")
async def adk_chat_stream(
    app_name: str,
    user_id: str,
    session_id: str,
    query: str,
    current_user: User = Depends(current_active_user_dep)
) -> StreamingResponse:
    """ADK-compliant chat endpoint with SSE streaming."""

    async def chat_event_generator() -> AsyncGenerator[str, None]:
        broadcaster = get_sse_broadcaster()

        async with broadcaster.subscribe(session_id) as queue:
            try:
                # Initialize ADK session
                session_store = SessionStore(uri=app.state.session_service_uri)
                session = session_store.get_session(
                    app_name=app_name,
                    user_id=user_id,
                    session_id=session_id
                )

                # Start thinking process
                await broadcaster.broadcast_event(session_id, {
                    "type": "thought_process_start",
                    "data": {
                        "messageId": str(uuid.uuid4()),
                        "sessionId": session_id,
                        "taskId": str(uuid.uuid4()),
                        "thinkingAbout": query
                    }
                })

                # Process query with ADK agent
                # (This would integrate with your ADK agent implementation)
                async for agent_response in process_adk_query(query, session):
                    # Broadcast progress updates
                    await broadcaster.broadcast_event(session_id, {
                        "type": "regeneration_progress",
                        "data": {
                            "messageId": agent_response.message_id,
                            "progress": agent_response.progress,
                            "partialContent": agent_response.partial_text
                        }
                    })

                # Send final response
                await broadcaster.broadcast_event(session_id, {
                    "type": "message_regenerated",
                    "data": {
                        "messageId": agent_response.message_id,
                        "content": agent_response.final_text,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                })

                # Stream all queued events to client
                while True:
                    event = await queue.get(timeout=30.0)
                    yield event if isinstance(event, str) else event.to_sse_format()

            except Exception as e:
                logger.error(f"Chat stream error: {e}")
                error_event = SSEEvent(
                    type="error",
                    data={"message": str(e)}
                )
                yield error_event.to_sse_format()

    return StreamingResponse(
        chat_event_generator(),
        media_type="text/event-stream"
    )
```

### 3. Broadcasting Events

#### Simple Event Broadcasting

```python
from app.utils.sse_broadcaster import get_sse_broadcaster
from datetime import datetime
import uuid

async def send_simple_event(session_id: str, message: str):
    """Send a simple message event to a session."""
    broadcaster = get_sse_broadcaster()

    await broadcaster.broadcast_event(session_id, {
        "type": "message",
        "data": {
            "content": message,
            "timestamp": datetime.utcnow().isoformat()
        }
    })
```

#### Using Event Builders (Recommended)

```python
from app.utils.sse_events import SSEEventBuilder

async def regenerate_message(
    session_id: str,
    message_id: str,
    original_message_id: str,
    user_query: str
):
    """Regenerate a message with progress tracking."""
    broadcaster = get_sse_broadcaster()
    task_id = str(uuid.uuid4())

    # 1. Send start event
    start_event = SSEEventBuilder.message_regeneration_started(
        message_id=message_id,
        session_id=session_id,
        task_id=task_id,
        original_message_id=original_message_id,
        user_query=user_query
    )
    await broadcaster.broadcast_event(session_id, start_event)

    try:
        # 2. Process with progress updates
        async for progress, partial_content in ai_generation_process(user_query):
            progress_event = SSEEventBuilder.regeneration_progress(
                message_id=message_id,
                session_id=session_id,
                task_id=task_id,
                progress=progress,  # 0.0 to 100.0
                message=f"Generating... {progress:.1f}%",
                partial_content=partial_content
            )
            await broadcaster.broadcast_event(session_id, progress_event)

        # 3. Send completion event
        complete_event = SSEEventBuilder.message_regenerated(
            message_id=message_id,
            session_id=session_id,
            task_id=task_id,
            content=final_content
        )
        await broadcaster.broadcast_event(session_id, complete_event)

    except Exception as e:
        # 4. Send error event on failure
        error_event = SSEEventBuilder.regeneration_error(
            message_id=message_id,
            session_id=session_id,
            task_id=task_id,
            error=str(e)
        )
        await broadcaster.broadcast_event(session_id, error_event)
        raise
```

#### Using Helper Trackers

```python
from app.utils.sse_events import ThoughtProcessTracker, ProgressTracker

async def complex_ai_task(session_id: str, query: str):
    """AI task with thought process and progress tracking."""
    broadcaster = get_sse_broadcaster()
    message_id = str(uuid.uuid4())
    task_id = str(uuid.uuid4())

    # Initialize trackers
    thought_tracker = ThoughtProcessTracker(
        message_id=message_id,
        session_id=session_id,
        task_id=task_id,
        broadcaster=broadcaster
    )

    progress_tracker = ProgressTracker(
        message_id=message_id,
        session_id=session_id,
        task_id=task_id,
        broadcaster=broadcaster
    )

    try:
        # Track thinking process
        await thought_tracker.start_thinking(f"Analyzing query: {query}")
        await thought_tracker.add_step(
            step="Query understanding",
            reasoning="Breaking down user intent into subtasks"
        )
        await thought_tracker.add_step(
            step="Knowledge retrieval",
            reasoning="Searching relevant information from knowledge base"
        )

        # Track progress
        await progress_tracker.update_progress(
            progress=25.0,
            message="Retrieving context",
            partial_content="Let me search for that information..."
        )

        # ... AI processing ...

        await progress_tracker.update_progress(
            progress=75.0,
            message="Generating response",
            partial_content="Based on the information, I can tell you that..."
        )

        # Complete
        await thought_tracker.complete_thinking(
            conclusion="Successfully generated comprehensive response"
        )
        await progress_tracker.complete(final_content)

    except Exception as e:
        await progress_tracker.error(str(e))
        raise
```

### 4. Session Management

#### Manual Session Lifecycle

```python
from app.utils.sse_broadcaster import get_sse_broadcaster

async def create_session(session_id: str):
    """Explicitly create a session."""
    broadcaster = get_sse_broadcaster()
    await broadcaster._session_manager.create_session(session_id)

async def clear_session(session_id: str):
    """Clear all data for a session."""
    broadcaster = get_sse_broadcaster()
    await broadcaster.clear_session(session_id)

async def get_session_stats(session_id: str) -> dict:
    """Get stats for a specific session."""
    broadcaster = get_sse_broadcaster()
    all_stats = await broadcaster.get_stats()

    session_stats = all_stats["sessionStats"].get(session_id, {})
    return {
        "sessionId": session_id,
        "subscribers": session_stats.get("subscribers", 0),
        "historySize": session_stats.get("historySize", 0),
        "active": session_id in all_stats["sessionStats"]
    }
```

#### Session History

```python
async def get_recent_events(session_id: str, limit: int = 50):
    """Get recent events for a session."""
    broadcaster = get_sse_broadcaster()
    events = await broadcaster.get_event_history(session_id, limit)

    return [
        {
            "type": event.type,
            "data": event.data,
            "id": event.id,
            "timestamp": event.created_at
        }
        for event in events
    ]
```

## Frontend Implementation

### 1. Basic SSE Hook Usage

```typescript
// app/components/chat/ChatInterface.tsx

import { useSSE } from '@/hooks/useSSE';
import { useState, useEffect } from 'react';

export function ChatInterface({ sessionId }: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  // Connect to SSE stream
  const {
    connectionState,
    lastEvent,
    events,
    error,
    isConnected,
    connect,
    disconnect,
    reconnect
  } = useSSE(`/agent_network_sse/${sessionId}`, {
    enabled: true,
    autoReconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000
  });

  // Process events
  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case 'message_regenerated':
        setMessages(prev => [
          ...prev,
          {
            id: lastEvent.data.messageId,
            content: lastEvent.data.content,
            timestamp: lastEvent.data.timestamp
          }
        ]);
        break;

      case 'message_deleted':
        setMessages(prev =>
          prev.filter(m =>
            !lastEvent.data.deletedMessageIds.includes(m.id)
          )
        );
        break;

      case 'regeneration_progress':
        // Update progress indicator
        setGenerationProgress(lastEvent.data.progress);
        setPartialContent(lastEvent.data.partialContent);
        break;
    }
  }, [lastEvent]);

  return (
    <div className="chat-interface">
      {/* Connection Status */}
      <ConnectionStatus
        state={connectionState}
        error={error}
        onReconnect={reconnect}
      />

      {/* Message List */}
      <MessageList messages={messages} />

      {/* Input Area */}
      <ChatInput
        disabled={!isConnected}
        sessionId={sessionId}
      />
    </div>
  );
}
```

### 2. Advanced SSE Patterns

#### Multiple Event Listeners

```typescript
import { useSSE } from '@/hooks/useSSE';
import { useCallback, useEffect } from 'react';

export function AdvancedChat({ sessionId }: { sessionId: string }) {
  const sse = useSSE(`/agent_network_sse/${sessionId}`);

  // Handler for message events
  const handleMessage = useCallback((event: AgentNetworkEvent) => {
    if (event.type === 'message_regenerated') {
      addMessage(event.data);
    }
  }, []);

  // Handler for status events
  const handleStatus = useCallback((event: AgentNetworkEvent) => {
    if (event.type === 'regeneration_progress') {
      updateProgress(event.data.progress);
    }
  }, []);

  // Handler for thought process
  const handleThinking = useCallback((event: AgentNetworkEvent) => {
    if (event.type === 'thought_process_step') {
      addThinkingStep({
        step: event.data.step,
        reasoning: event.data.reasoning
      });
    }
  }, []);

  // Subscribe to all events
  useEffect(() => {
    const unsubscribes = [
      sse.addEventListener('message_regenerated', handleMessage),
      sse.addEventListener('regeneration_progress', handleStatus),
      sse.addEventListener('thought_process_step', handleThinking)
    ];

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [sse, handleMessage, handleStatus, handleThinking]);

  return <div>...</div>;
}
```

#### Connection Management

```typescript
import { useSSE, SSEConnectionState } from '@/hooks/useSSE';

function ConnectionStatus({ sessionId }: { sessionId: string }) {
  const {
    connectionState,
    error,
    reconnectAttempt,
    connect,
    disconnect,
    reconnect
  } = useSSE(`/agent_network_sse/${sessionId}`);

  const renderConnectionState = () => {
    switch (connectionState) {
      case 'disconnected':
        return (
          <div className="status-disconnected">
            <span>Disconnected</span>
            <button onClick={connect}>Connect</button>
          </div>
        );

      case 'connecting':
        return (
          <div className="status-connecting">
            <Spinner />
            <span>Connecting...</span>
          </div>
        );

      case 'connected':
        return (
          <div className="status-connected">
            <span className="indicator-green">●</span>
            <span>Connected</span>
            <button onClick={disconnect}>Disconnect</button>
          </div>
        );

      case 'reconnecting':
        return (
          <div className="status-reconnecting">
            <Spinner />
            <span>Reconnecting (attempt {reconnectAttempt})...</span>
          </div>
        );

      case 'error':
        return (
          <div className="status-error">
            <span>Error: {error}</span>
            <button onClick={reconnect}>Retry</button>
          </div>
        );
    }
  };

  return (
    <div className="connection-status">
      {renderConnectionState()}
    </div>
  );
}
```

#### Event Filtering and Transformation

```typescript
import { useMemo, useCallback } from 'react';
import { useSSE } from '@/hooks/useSSE';

function useFilteredEvents(
  sessionId: string,
  eventTypes: string[]
) {
  const { events, lastEvent } = useSSE(`/agent_network_sse/${sessionId}`);

  // Filter events by type
  const filteredEvents = useMemo(() => {
    return events.filter(event =>
      eventTypes.includes(event.type)
    );
  }, [events, eventTypes]);

  // Transform events to app-specific format
  const transformedEvents = useMemo(() => {
    return filteredEvents.map(event => ({
      id: event.data.messageId || crypto.randomUUID(),
      type: event.type,
      content: event.data.content || event.data.message || '',
      timestamp: new Date(event.data.timestamp),
      metadata: event.data
    }));
  }, [filteredEvents]);

  return {
    events: transformedEvents,
    lastEvent,
    count: transformedEvents.length
  };
}

// Usage
function MessageFeed({ sessionId }: { sessionId: string }) {
  const { events } = useFilteredEvents(sessionId, [
    'message_regenerated',
    'message_edited',
    'message_deleted'
  ]);

  return (
    <div>
      {events.map(event => (
        <MessageCard key={event.id} message={event} />
      ))}
    </div>
  );
}
```

### 3. Real-Time UI Updates

#### Progress Indicators

```typescript
import { useSSE } from '@/hooks/useSSE';
import { useState, useEffect } from 'react';

function RegenerationProgress({ sessionId, messageId }: Props) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { lastEvent } = useSSE(`/agent_network_sse/${sessionId}`);

  useEffect(() => {
    if (!lastEvent) return;

    // Match events for this specific message
    const eventMessageId = lastEvent.data.messageId;
    if (eventMessageId !== messageId) return;

    switch (lastEvent.type) {
      case 'message_regenerating':
        setIsGenerating(true);
        setProgress(0);
        setStatus('Starting...');
        break;

      case 'regeneration_progress':
        setProgress(lastEvent.data.progress);
        setStatus(lastEvent.data.message);
        break;

      case 'message_regenerated':
        setProgress(100);
        setStatus('Complete');
        setTimeout(() => setIsGenerating(false), 1000);
        break;

      case 'regeneration_error':
        setIsGenerating(false);
        setStatus(`Error: ${lastEvent.data.error}`);
        break;
    }
  }, [lastEvent, messageId]);

  if (!isGenerating) return null;

  return (
    <div className="regeneration-progress">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="progress-status">{status}</span>
    </div>
  );
}
```

#### Thinking Indicator

```typescript
function ThinkingIndicator({ sessionId }: { sessionId: string }) {
  const [thinkingSteps, setThinkingSteps] = useState<ThinkingStep[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const { lastEvent } = useSSE(`/agent_network_sse/${sessionId}`);

  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case 'thought_process_start':
        setIsThinking(true);
        setThinkingSteps([{
          step: 'Starting',
          reasoning: lastEvent.data.thinkingAbout
        }]);
        break;

      case 'thought_process_step':
        setThinkingSteps(prev => [...prev, {
          step: lastEvent.data.step,
          reasoning: lastEvent.data.reasoning
        }]);
        break;

      case 'thought_process_complete':
        setIsThinking(false);
        break;
    }
  }, [lastEvent]);

  if (!isThinking && thinkingSteps.length === 0) return null;

  return (
    <div className="thinking-indicator">
      <div className="thinking-header">
        {isThinking && <Spinner />}
        <span>AI Thought Process</span>
      </div>
      <div className="thinking-steps">
        {thinkingSteps.map((step, idx) => (
          <div key={idx} className="thinking-step">
            <div className="step-title">{step.step}</div>
            <div className="step-reasoning">{step.reasoning}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Common Patterns

### 1. Request-Response Pattern

**Backend**:

```python
@app.post("/api/chat_actions/regenerate")
async def regenerate_message(
    payload: RegeneratePayload,
    current_user: User = Depends(current_active_user_dep)
):
    """Regenerate a message and stream response via SSE."""
    broadcaster = get_sse_broadcaster()
    message_id = str(uuid.uuid4())

    # Start async task for generation
    asyncio.create_task(
        perform_regeneration(
            session_id=payload.session_id,
            message_id=message_id,
            query=payload.query
        )
    )

    # Return immediately with message ID
    return {
        "success": True,
        "messageId": message_id,
        "message": "Regeneration started, listen for SSE events"
    }

async def perform_regeneration(
    session_id: str,
    message_id: str,
    query: str
):
    """Background task for message regeneration."""
    broadcaster = get_sse_broadcaster()

    try:
        # Send progress events
        for progress in range(0, 100, 10):
            await broadcaster.broadcast_event(session_id, {
                "type": "regeneration_progress",
                "data": {
                    "messageId": message_id,
                    "progress": progress
                }
            })
            await asyncio.sleep(0.5)  # Simulate work

        # Send completion
        await broadcaster.broadcast_event(session_id, {
            "type": "message_regenerated",
            "data": {
                "messageId": message_id,
                "content": "Regenerated response"
            }
        })
    except Exception as e:
        await broadcaster.broadcast_event(session_id, {
            "type": "regeneration_error",
            "data": {"messageId": message_id, "error": str(e)}
        })
```

**Frontend**:

```typescript
function RegenerateButton({ sessionId, messageId }: Props) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { lastEvent } = useSSE(`/agent_network_sse/${sessionId}`);

  // Listen for completion
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'message_regenerated' &&
        lastEvent.data.messageId === messageId) {
      setIsRegenerating(false);
      // Update UI with new content
      updateMessage(lastEvent.data.content);
    }
  }, [lastEvent]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);

    const response = await fetch('/api/chat_actions/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        messageId,
        query: originalQuery
      })
    });

    // Response is immediate, actual result comes via SSE
  };

  return (
    <button
      onClick={handleRegenerate}
      disabled={isRegenerating}
    >
      {isRegenerating ? 'Regenerating...' : 'Regenerate'}
    </button>
  );
}
```

### 2. Multi-Session Pattern

```typescript
function MultiSessionDashboard({ sessionIds }: { sessionIds: string[] }) {
  const sessions = sessionIds.map(id => ({
    id,
    sse: useSSE(`/agent_network_sse/${id}`)
  }));

  return (
    <div className="dashboard">
      {sessions.map(({ id, sse }) => (
        <SessionCard
          key={id}
          sessionId={id}
          isConnected={sse.isConnected}
          lastUpdate={sse.lastEvent?.data.timestamp}
          events={sse.events}
        />
      ))}
    </div>
  );
}
```

### 3. Fallback Pattern

```typescript
function RobustSSEConnection({ sessionId }: { sessionId: string }) {
  const {
    isConnected,
    error,
    lastEvent,
    reconnect
  } = useSSE(`/agent_network_sse/${sessionId}`, {
    autoReconnect: true,
    maxReconnectAttempts: 5
  });

  // Fallback to polling if SSE fails
  const [useFallback, setUseFallback] = useState(false);
  const [polledData, setPolledData] = useState(null);

  useEffect(() => {
    if (error && error.includes('EventSource')) {
      console.warn('SSE not supported, falling back to polling');
      setUseFallback(true);
    }
  }, [error]);

  // Polling fallback
  useEffect(() => {
    if (!useFallback) return;

    const interval = setInterval(async () => {
      const response = await fetch(`/api/sessions/${sessionId}/events`);
      const data = await response.json();
      setPolledData(data);
    }, 5000);

    return () => clearInterval(interval);
  }, [useFallback, sessionId]);

  const data = useFallback ? polledData : lastEvent;

  return <div>{/* Render using data */}</div>;
}
```

## Best Practices

### Backend Best Practices

#### 1. Always Use Context Managers

```python
# ✅ Good: Guaranteed cleanup
async with broadcaster.subscribe(session_id) as queue:
    while True:
        event = await queue.get()
        yield event

# ❌ Bad: Manual cleanup can be missed
queue = await broadcaster.add_subscriber(session_id)
try:
    while True:
        event = await queue.get()
        yield event
finally:
    await broadcaster.remove_subscriber(session_id, queue)
```

#### 2. Set Appropriate TTLs

```python
# Short-lived events (status updates)
await broadcaster.broadcast_event(session_id, {
    "type": "status_update",
    "data": {...},
    "ttl": 60.0  # 1 minute
})

# Long-lived events (important messages)
await broadcaster.broadcast_event(session_id, {
    "type": "message_regenerated",
    "data": {...},
    "ttl": 3600.0  # 1 hour
})
```

#### 3. Use Event Builders

```python
# ✅ Good: Type-safe, consistent format
event = SSEEventBuilder.message_regenerated(
    message_id=msg_id,
    session_id=session_id,
    task_id=task_id,
    content=content
)

# ❌ Bad: Manual dict construction, error-prone
event = {
    "type": "message_regenerated",
    "data": {
        "messageId": msg_id,
        "sessionId": session_id,
        # Missing taskId!
        "content": content
    }
}
```

#### 4. Handle Errors Gracefully

```python
async def safe_broadcast(session_id: str, event_type: str, data: dict):
    """Broadcast with error handling."""
    broadcaster = get_sse_broadcaster()

    try:
        await broadcaster.broadcast_event(session_id, {
            "type": event_type,
            "data": data
        })
    except Exception as e:
        logger.error(f"Failed to broadcast {event_type}: {e}")
        # Send error event
        await broadcaster.broadcast_event(session_id, {
            "type": "error",
            "data": {
                "message": "Failed to send update",
                "originalEvent": event_type
            }
        })
```

### Frontend Best Practices

#### 1. Use useCallback for Handlers

```typescript
// ✅ Good: Stable reference
const handleMessage = useCallback((event: AgentNetworkEvent) => {
  setMessages(prev => [...prev, event.data]);
}, []);

// ❌ Bad: New function every render
const handleMessage = (event: AgentNetworkEvent) => {
  setMessages(prev => [...prev, event.data]);
};
```

#### 2. Clean Up Subscriptions

```typescript
// ✅ Good: Returns cleanup function
useEffect(() => {
  const unsubscribe = sse.addEventListener('message', handler);
  return unsubscribe;
}, [sse, handler]);

// ❌ Bad: No cleanup
useEffect(() => {
  sse.addEventListener('message', handler);
}, [sse, handler]);
```

#### 3. Handle Connection States

```typescript
// ✅ Good: Handles all states
if (!isConnected) {
  return <DisconnectedView onReconnect={reconnect} />;
}

// ❌ Bad: Assumes always connected
return <ChatInterface messages={messages} />;
```

#### 4. Validate Event Data

```typescript
// ✅ Good: Validates before using
const handleEvent = useCallback((event: AgentNetworkEvent) => {
  if (!event.data || typeof event.data !== 'object') {
    console.warn('Invalid event data:', event);
    return;
  }

  if (!event.data.messageId) {
    console.warn('Missing messageId in event:', event);
    return;
  }

  // Safe to use now
  addMessage(event.data);
}, []);

// ❌ Bad: No validation
const handleEvent = useCallback((event: AgentNetworkEvent) => {
  addMessage(event.data);  // Might crash if data is invalid
}, []);
```

## Testing Strategies

### Backend Testing

```python
import pytest
from app.utils.sse_broadcaster import EnhancedSSEBroadcaster, BroadcasterConfig

@pytest.fixture
async def broadcaster():
    """Create broadcaster for testing."""
    config = BroadcasterConfig(
        event_ttl=1.0,  # Short TTL for faster tests
        cleanup_interval=0.5
    )
    bc = EnhancedSSEBroadcaster(config)
    yield bc
    await bc.shutdown()

@pytest.mark.asyncio
async def test_broadcast_and_receive(broadcaster):
    """Test basic broadcast functionality."""
    session_id = "test_session"

    # Subscribe
    queue = await broadcaster.add_subscriber(session_id)

    # Broadcast event
    await broadcaster.broadcast_event(session_id, {
        "type": "test_event",
        "data": {"message": "Hello"}
    })

    # Receive event
    event = await asyncio.wait_for(queue.get(), timeout=1.0)
    assert "test_event" in event
    assert "Hello" in event

    # Cleanup
    await broadcaster.remove_subscriber(session_id, queue)

@pytest.mark.asyncio
async def test_multiple_subscribers(broadcaster):
    """Test broadcasting to multiple subscribers."""
    session_id = "test_session"

    # Create multiple subscribers
    queue1 = await broadcaster.add_subscriber(session_id)
    queue2 = await broadcaster.add_subscriber(session_id)

    # Broadcast event
    await broadcaster.broadcast_event(session_id, {
        "type": "test",
        "data": {"count": 1}
    })

    # Both should receive
    event1 = await queue1.get(timeout=1.0)
    event2 = await queue2.get(timeout=1.0)

    assert event1 == event2
    assert "test" in event1

@pytest.mark.asyncio
async def test_event_history(broadcaster):
    """Test event history for late joiners."""
    session_id = "test_session"

    # Broadcast events before subscribing
    for i in range(5):
        await broadcaster.broadcast_event(session_id, {
            "type": "test",
            "data": {"count": i}
        })

    # Subscribe (should get recent history)
    queue = await broadcaster.add_subscriber(session_id)

    # Receive history events
    events = []
    while queue.qsize() > 0:
        event = await queue.get()
        events.append(event)

    assert len(events) > 0  # Should have received some history
```

### Frontend Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useSSE } from '@/hooks/useSSE';

// Mock EventSource
const mockEventSource = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  readyState: 1
};

global.EventSource = jest.fn(() => mockEventSource) as any;

describe('useSSE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('connects to SSE stream', () => {
    const { result } = renderHook(() =>
      useSSE('/test/session')
    );

    expect(global.EventSource).toHaveBeenCalledWith(
      expect.stringContaining('/test/session'),
      expect.any(Object)
    );
  });

  it('handles events', async () => {
    const { result } = renderHook(() =>
      useSSE('/test/session')
    );

    // Simulate event
    const messageHandler = mockEventSource.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1];

    messageHandler?.({
      data: JSON.stringify({
        type: 'test',
        content: 'Hello'
      })
    });

    await waitFor(() => {
      expect(result.current.lastEvent).toBeTruthy();
      expect(result.current.lastEvent?.type).toBe('test');
    });
  });

  it('reconnects on error', async () => {
    const { result } = renderHook(() =>
      useSSE('/test/session', {
        autoReconnect: true,
        reconnectDelay: 100
      })
    );

    // Simulate error
    const errorHandler = mockEventSource.addEventListener.mock.calls
      .find(call => call[0] === 'error')?.[1];

    errorHandler?.({ type: 'error' });

    await waitFor(() => {
      expect(result.current.connectionState).toBe('reconnecting');
    });
  });
});
```

## Performance Optimization

### Backend Optimizations

```python
# 1. Batch Events
async def batch_broadcast(session_id: str, events: list[dict]):
    """Broadcast multiple events efficiently."""
    broadcaster = get_sse_broadcaster()

    # Send all events in quick succession
    for event in events:
        await broadcaster.broadcast_event(session_id, event)

# 2. Use Appropriate Queue Sizes
config = BroadcasterConfig(
    max_queue_size=500,  # Lower for memory-constrained environments
    max_history_per_session=100  # Reduce for high-volume scenarios
)

# 3. Aggressive Cleanup for High-Traffic
config = BroadcasterConfig(
    cleanup_interval=30.0,  # More frequent cleanup
    event_ttl=60.0,  # Shorter TTL
    session_ttl=600.0  # 10 minutes instead of 30
)
```

### Frontend Optimizations

```typescript
// 1. Debounce Rapid Events
const debouncedHandler = useMemo(
  () => debounce((event) => {
    updateUI(event);
  }, 100),
  []
);

// 2. Virtual Scrolling for Large Lists
import { FixedSizeList } from 'react-window';

function MessageList({ messages }: { messages: Message[] }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={messages.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <MessageCard message={messages[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}

// 3. Memoize Components
const MessageCard = React.memo(({ message }: { message: Message }) => {
  return <div>{message.content}</div>;
});
```

## Common Pitfalls

### ❌ Pitfall 1: Forgetting Cleanup

```python
# Bad
async def sse_endpoint():
    queue = await broadcaster.add_subscriber(session_id)
    while True:
        event = await queue.get()
        yield event
    # Queue never removed!

# Good
async def sse_endpoint():
    async with broadcaster.subscribe(session_id) as queue:
        while True:
            event = await queue.get()
            yield event
```

### ❌ Pitfall 2: Blocking Event Handlers

```typescript
// Bad: Blocking operation in handler
const handler = useCallback((event) => {
  const result = heavyComputation(event.data);  // Blocks rendering
  setData(result);
}, []);

// Good: Async handling
const handler = useCallback((event) => {
  setTimeout(() => {
    const result = heavyComputation(event.data);
    setData(result);
  }, 0);
}, []);
```

### ❌ Pitfall 3: Not Handling Disconnections

```typescript
// Bad: Assumes always connected
function ChatInput({ sessionId }: Props) {
  return <input onSubmit={sendMessage} />;
}

// Good: Handles connection state
function ChatInput({ sessionId }: Props) {
  const { isConnected } = useSSE(`/sse/${sessionId}`);

  return (
    <input
      disabled={!isConnected}
      placeholder={isConnected ? "Type..." : "Reconnecting..."}
      onSubmit={sendMessage}
    />
  );
}
```

### ❌ Pitfall 4: Memory Leaks in React

```typescript
// Bad: No cleanup
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 1000);
  // Missing cleanup!
}, []);

// Good: Cleanup on unmount
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

---

**Next Steps**: See [SSE-API-Reference.md](./SSE-API-Reference.md) for complete endpoint documentation.
