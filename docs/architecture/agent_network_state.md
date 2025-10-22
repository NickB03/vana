# Agent Network State Management

## Overview

The agent network state system provides real-time tracking of agent execution, relationships, and performance metrics across your ADK multi-agent system.

## Architecture

### Session-Scoped Design

**Key Principle**: Each session maintains its own isolated network state, ensuring thread safety and preventing cross-session interference.

```
Session A                    Session B
├─ Network State             ├─ Network State
│  ├─ execution_stack        │  ├─ execution_stack
│  ├─ active_agents          │  ├─ active_agents
│  ├─ relationships          │  ├─ relationships
│  └─ agent_metrics          │  └─ agent_metrics
└─ (isolated)                └─ (isolated)
```

### Automatic Management

Network state is **automatically managed** through ADK callbacks:
- ✅ Created on first agent invocation
- ✅ Updated during agent execution
- ✅ Garbage collected when session ends
- ✅ Broadcasted via SSE for real-time UI updates

**You typically don't need to interact with network state directly.**

## Core Functions

### `get_network_state(session)`

Retrieves or creates session-scoped network state.

```python
from app.enhanced_callbacks import get_network_state

# Inside an ADK callback
def custom_callback(callback_context: CallbackContext):
    session = callback_context._invocation_context.session
    network_state = get_network_state(session)

    # Access network state
    print(f"Active agents: {network_state.active_agents}")
    print(f"Execution stack: {network_state.execution_stack}")
```

**When to use:**
- ✅ Custom agent callbacks
- ✅ Advanced agent coordination logic
- ✅ Custom metrics collection

**When NOT to use:**
- ❌ API endpoints (use SSE broadcaster instead)
- ❌ Frontend code (subscribe to SSE events)
- ❌ General debugging (use `/agent_network_sse/{session_id}`)

### `get_current_network_state(session=None)`

Exports network state as a dictionary for inspection.

```python
from app.enhanced_callbacks import get_current_network_state

# With session (recommended)
state_dict = get_current_network_state(session=my_session)

# Without session (deprecated - uses global state)
state_dict = get_current_network_state()  # ⚠️ Warning logged
```

**Returns:**
```python
{
    "agents": {
        "plan_generator": {
            "invocation_count": 5,
            "average_execution_time": 2.3,
            "success_rate": 1.0,
            "tools_used": ["brave_search"],
            "is_active": True
        },
        # ... more agents
    },
    "relationships": [
        {
            "source": "dispatcher",
            "target": "plan_generator",
            "type": "invokes",
            "interaction_count": 5
        },
        # ... more relationships
    ],
    "hierarchy": {
        "dispatcher": ["generalist", "interactive_planner"]
    },
    "execution_stack": ["dispatcher", "plan_generator"],
    "active_agents": ["plan_generator"]
}
```

### `reset_network_state(session=None)`

Resets network state for a session.

```python
from app.enhanced_callbacks import reset_network_state

# Session-scoped reset (recommended)
reset_network_state(session=my_session)

# Global reset (deprecated)
reset_network_state()  # ⚠️ Warning logged
```

**Use Cases:**
- Testing: Reset between test runs
- Development: Clear corrupted state
- Production: **Rarely needed** (state auto-managed)

**Note:** Deleting a session automatically cleans up its network state.

## Real-Time Event Streaming

### SSE Endpoints (Recommended Access Method)

Instead of directly accessing network state, subscribe to SSE events:

```javascript
// Frontend: Subscribe to agent network events
const eventSource = new EventSource(`/api/sse/agent_network_sse/${sessionId}`);

eventSource.addEventListener('agent_start', (event) => {
    const data = JSON.parse(event.data);
    console.log(`Agent started: ${data.agentName}`);
});

eventSource.addEventListener('agent_complete', (event) => {
    const data = JSON.parse(event.data);
    console.log(`Agent completed in ${data.executionTime}s`);
});

eventSource.addEventListener('agent_network_snapshot', (event) => {
    const data = JSON.parse(event.data);
    // Full network state snapshot
    console.log('Network state:', data);
});
```

### Event Types

| Event Type | Description | Frequency |
|------------|-------------|-----------|
| `agent_start` | Agent begins execution | Per agent invocation |
| `agent_complete` | Agent finishes execution | Per agent completion |
| `agent_network_snapshot` | Full network state | Periodic |
| `keepalive` | Connection heartbeat | Every 30s |

## Debugging & Monitoring

### View Network State in Real-Time

**Option 1: SSE Stream (Browser)**
```bash
curl -N -H "Accept: text/event-stream" \
  http://localhost:8000/agent_network_sse/{session_id}
```

**Option 2: Event History**
```bash
curl http://localhost:8000/agent_network_history?limit=10
```

**Option 3: Broadcaster Stats**
```python
from app.utils.sse_broadcaster import get_sse_broadcaster

broadcaster = get_sse_broadcaster()
stats = await broadcaster.get_stats()

print(f"Active sessions: {stats['totalSessions']}")
print(f"Event subscribers: {stats['totalSubscribers']}")
print(f"Events buffered: {stats['totalEvents']}")
```

### Common Patterns

#### Pattern 1: Track Custom Metrics

```python
def custom_metric_callback(callback_context: CallbackContext):
    session = callback_context._invocation_context.session
    network_state = get_network_state(session)
    agent_name = callback_context._invocation_context.agent.name

    # Record custom metric
    metrics = network_state.get_or_create_agent_metrics(agent_name)
    metrics.add_tool_usage("custom_tool")
```

#### Pattern 2: Conditional Agent Routing

```python
def smart_routing_callback(callback_context: CallbackContext):
    session = callback_context._invocation_context.session
    network_state = get_network_state(session)

    # Check if certain agents have already executed
    if "plan_generator" in network_state.active_agents:
        # Skip duplicate planning
        return
```

#### Pattern 3: Performance Monitoring

```python
def performance_monitor_callback(callback_context: CallbackContext):
    session = callback_context._invocation_context.session
    network_state = get_network_state(session)

    # Check execution stack depth (detect infinite loops)
    if len(network_state.execution_stack) > 10:
        logger.error("Excessive recursion detected!")
        raise Exception("Agent recursion limit exceeded")
```

## Migration Guide

### Before (Global State - ❌ Deprecated)

```python
# DON'T DO THIS
from app.enhanced_callbacks import _network_state

def old_callback():
    _network_state.push_agent("my_agent")  # ❌ Not thread-safe!
```

### After (Session-Scoped - ✅ Recommended)

```python
# DO THIS
from app.enhanced_callbacks import get_network_state

def new_callback(callback_context: CallbackContext):
    session = callback_context._invocation_context.session
    network_state = get_network_state(session)  # ✅ Thread-safe!
    network_state.push_agent("my_agent")
```

## Best Practices

### ✅ DO:
- Use SSE events for frontend consumption
- Access via `get_network_state(session)` in callbacks
- Let automatic management handle lifecycle
- Monitor via `/agent_network_sse/{session_id}`

### ❌ DON'T:
- Access `_network_state` global directly
- Call functions without session parameter
- Manually manage network state lifecycle
- Use for high-frequency polling (use SSE)

## Troubleshooting

### Warning: "Using global network state (not thread-safe)"

**Cause:** Function called without session parameter

**Fix:**
```python
# Before
state = get_current_network_state()  # ⚠️ Warning

# After
state = get_current_network_state(session=my_session)  # ✅ No warning
```

### Network State Appears Empty

**Possible Causes:**
1. Session hasn't invoked any agents yet
2. Using wrong session object
3. Network state was reset

**Debug:**
```python
network_state = get_network_state(session)
print(f"Agents tracked: {len(network_state.agents)}")
print(f"Execution stack: {network_state.execution_stack}")
```

### Events Not Appearing in SSE Stream

**Checklist:**
1. ✅ Session ID correct?
2. ✅ Callbacks registered on agents?
3. ✅ Broadcaster running?
4. ✅ Client subscribed to correct endpoint?

**Test:**
```bash
# Verify broadcaster is working
curl http://localhost:8000/agent_network_history?limit=5
```

## Performance Considerations

### Memory Usage

Network state memory footprint per session:
- **Baseline**: ~10KB (empty state)
- **Per agent**: ~500 bytes (metrics)
- **Per relationship**: ~200 bytes
- **Execution stack**: ~50 bytes/agent

**Typical session**: 5 agents × 500 bytes = ~12.5KB total

### Automatic Cleanup

Network state is automatically garbage collected when:
1. Session is deleted
2. Session expires (30 min TTL)
3. Python's GC collects unreferenced session objects

**No manual cleanup required!**

## See Also

- [SSE Broadcaster Architecture](./sse_broadcaster.md)
- [ADK Agent Callbacks](../adk/callbacks.md)
- [Session Management](./session_management.md)
