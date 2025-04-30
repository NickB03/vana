# ADK Integration Components

This directory contains the components for integrating VANA with Google's Agent Development Kit (ADK).

## Components

### ADKSessionAdapter

The `ADKSessionAdapter` bridges VANA contexts and ADK sessions:

- Creates and manages sessions in both systems
- Maps between VANA context IDs and ADK session IDs
- Synchronizes messages between contexts and sessions
- Provides fallback mechanisms when ADK is unavailable

### ADKToolAdapter

The `ADKToolAdapter` exposes VANA specialist agents as ADK tools:

- Registers specialist agents as ADK tools
- Registers functions as ADK tools
- Provides a decorator for easy tool registration
- Handles tool execution with proper error handling

### ADKStateManager

The `ADKStateManager` synchronizes state between VANA and ADK:

- Gets and sets state across both systems
- Updates individual state values
- Serializes and deserializes state for persistence
- Ensures consistent state representation

### ADKEventHandler

The `ADKEventHandler` processes ADK events:

- Registers event handlers for various event types
- Triggers events with appropriate data
- Handles session, message, and tool events
- Provides error handling for event processing

## Usage

```python
from vana.context import ConversationContextManager
from vana.adk_integration import (
    ADKSessionAdapter,
    ADKToolAdapter,
    ADKStateManager,
    ADKEventHandler
)

# Create context manager
context_manager = ConversationContextManager()

# Create ADK integration components
session_adapter = ADKSessionAdapter(context_manager)
tool_adapter = ADKToolAdapter()
state_manager = ADKStateManager(session_adapter, context_manager)
event_handler = ADKEventHandler(session_adapter, state_manager, context_manager)

# Create a session
session_info = session_adapter.create_session(
    user_id="user123",
    session_id="session456"
)
context_id = session_info["vana_context_id"]

# Add a message
event_handler.handle_message_received(
    context_id=context_id,
    message="Hello, VANA!"
)

# Register a specialist agent
tool_adapter.register_specialist_as_tool(
    specialist_name="rhea",
    specialist_obj=rhea_agent
)

# Execute a tool
result = tool_adapter.execute_tool(
    tool_name="rhea",
    query="Design an agent architecture"
)

# Add the response
event_handler.handle_message_sent(
    context_id=context_id,
    message=result
)

# Sync state
state_manager.sync_state(context_id)
```

## Error Handling

All components include comprehensive error handling and graceful fallbacks when ADK is not available:

```python
if session_adapter.is_adk_available():
    # Use ADK features
    adk_session = session_adapter.get_adk_session(context_id)
    # ...
else:
    # Use fallback mechanisms
    context = context_manager.get_conversation_context(context_id)
    # ...
```

## Testing

Comprehensive tests are available in the `tests/adk_integration` directory:

- `test_adk_session_adapter.py` - Tests for ADKSessionAdapter
- `test_adk_tool_adapter.py` - Tests for ADKToolAdapter
- `test_adk_state_manager.py` - Tests for ADKStateManager
- `test_adk_event_handler.py` - Tests for ADKEventHandler

## Documentation

For detailed documentation, see:

- [ADK Integration Guide](../../docs/adk-integration-guide.md) - Comprehensive guide to ADK integration
- [Context Management Architecture](../../docs/context-management-architecture.md) - Overview of the context management architecture
