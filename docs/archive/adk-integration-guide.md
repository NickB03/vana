# VANA ADK Integration Guide

This guide provides comprehensive documentation for integrating VANA with Google's Agent Development Kit (ADK).

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Core Components](#core-components)
4. [Session Management](#session-management)
5. [Tool Integration](#tool-integration)
6. [State Management](#state-management)
7. [Event Handling](#event-handling)
8. [Implementation Examples](#implementation-examples)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

## Overview

The VANA ADK Integration provides a bridge between VANA's native components and Google's Agent Development Kit (ADK). This integration enables:

- Seamless session management across both systems
- Exposing VANA specialist agents as ADK tools
- Synchronizing state between VANA contexts and ADK sessions
- Processing ADK events within the VANA ecosystem

The integration is designed to be robust, with graceful fallbacks when ADK is not available, ensuring that VANA can operate in various environments.

## Prerequisites

Before using the VANA ADK Integration, ensure you have:

1. **Google ADK**: Install the Google Agent Development Kit:
   ```bash
   pip install google-adk
   ```

2. **VANA Core**: Ensure VANA core components are installed:
   ```bash
   pip install -e .
   ```

3. **Environment Configuration**: Set up the required environment variables:
   ```
   APP_NAME=vana
   ADK_API_KEY=your_adk_api_key
   ```

## Core Components

The VANA ADK Integration consists of four main components:

### 1. ADKSessionAdapter

The `ADKSessionAdapter` bridges VANA contexts and ADK sessions:

- Creates and manages sessions in both systems
- Maps between VANA context IDs and ADK session IDs
- Synchronizes messages between contexts and sessions
- Provides fallback mechanisms when ADK is unavailable

### 2. ADKToolAdapter

The `ADKToolAdapter` exposes VANA specialist agents as ADK tools:

- Registers specialist agents as ADK tools
- Registers functions as ADK tools
- Provides a decorator for easy tool registration
- Handles tool execution with proper error handling

### 3. ADKStateManager

The `ADKStateManager` synchronizes state between VANA and ADK:

- Gets and sets state across both systems
- Updates individual state values
- Serializes and deserializes state for persistence
- Ensures consistent state representation

### 4. ADKEventHandler

The `ADKEventHandler` processes ADK events:

- Registers event handlers for various event types
- Triggers events with appropriate data
- Handles session, message, and tool events
- Provides error handling for event processing

## Session Management

### Creating Sessions

To create a session in both VANA and ADK:

```python
from vana.adk_integration import ADKSessionAdapter
from vana.context import ConversationContextManager

# Create managers
context_manager = ConversationContextManager()
session_adapter = ADKSessionAdapter(context_manager)

# Create a session
session_info = session_adapter.create_session(
    user_id="user123",
    session_id="session456"  # Optional, will be generated if not provided
)

# Get context ID for future reference
context_id = session_info["vana_context_id"]
```

### Retrieving Sessions

To retrieve an existing session:

```python
# Get session information
session_info = session_adapter.get_session(context_id)

# Get ADK session object
adk_session = session_adapter.get_adk_session(context_id)

# Get VANA context from ADK session
context = session_adapter.get_vana_context(
    adk_session_id="session456",
    user_id="user123"
)
```

### Adding Messages

To add messages to a session:

```python
# Add user message
session_adapter.add_message_to_session(
    context_id=context_id,
    role="user",
    content="Hello, VANA!"
)

# Add assistant message
session_adapter.add_message_to_session(
    context_id=context_id,
    role="assistant",
    content="Hello! How can I help you today?"
)
```

### Synchronizing Sessions

To synchronize state between VANA and ADK:

```python
# Sync session state
session_adapter.sync_session_state(context_id)
```

## Tool Integration

### Registering Specialist Agents

To register a VANA specialist agent as an ADK tool:

```python
from vana.adk_integration import ADKToolAdapter

# Create tool adapter
tool_adapter = ADKToolAdapter()

# Register specialist agent
tool_adapter.register_specialist_as_tool(
    specialist_name="rhea",
    specialist_obj=rhea_agent,
    tool_name="design_architecture",  # Optional, defaults to specialist_name
    description="Design agent architecture based on requirements"  # Optional
)
```

### Registering Functions

To register a function as an ADK tool:

```python
# Register function directly
def search_knowledge(query: str) -> str:
    """Search the knowledge base for information."""
    # Implementation...
    return results

tool_adapter.register_function_as_tool(
    func=search_knowledge,
    tool_name="search",  # Optional, defaults to function name
    description="Search the knowledge base"  # Optional, defaults to docstring
)

# Or use the decorator
@tool_adapter.tool_decorator(name="vector_search", description="Search using vectors")
def vector_search(query: str, top_k: int = 5) -> str:
    """Search using vector embeddings."""
    # Implementation...
    return results
```

### Executing Tools

To execute a registered tool:

```python
# Execute tool by name
result = tool_adapter.execute_tool(
    tool_name="search",
    query="How does VANA work?",
    top_k=5
)
```

### Getting Tools

To get registered tools:

```python
# Get a specific tool
tool = tool_adapter.get_tool("search")

# Get all tools
all_tools = tool_adapter.get_all_tools()
```

## State Management

### Getting and Setting State

To get and set state across both systems:

```python
from vana.adk_integration import ADKStateManager

# Create state manager
state_manager = ADKStateManager(session_adapter, context_manager)

# Get full state
state = state_manager.get_state(context_id)

# Set full state
state_manager.set_state(context_id, state)

# Update a specific value
state_manager.update_state(context_id, "user_preference", "dark_mode")

# Get a specific value
preference = state_manager.get_state_value(
    context_id=context_id,
    key="user_preference",
    default="light_mode"  # Optional default value
)
```

### Serializing State

To serialize and deserialize state:

```python
# Serialize state to JSON
state_json = state_manager.serialize_state(context_id)

# Deserialize state from JSON
state_manager.deserialize_state(context_id, state_json)
```

### Synchronizing State

To synchronize state between VANA and ADK:

```python
# Sync state
state_manager.sync_state(context_id)
```

## Event Handling

### Registering Event Handlers

To register handlers for ADK events:

```python
from vana.adk_integration import ADKEventHandler

# Create event handler
event_handler = ADKEventHandler(session_adapter, state_manager, context_manager)

# Define handler function
def handle_message_received(event_data):
    print(f"Message received: {event_data['message']}")

# Register handler
event_handler.register_event_handler(
    event_type=ADKEventHandler.EVENT_MESSAGE_RECEIVED,
    handler=handle_message_received
)
```

### Triggering Events

To trigger events:

```python
# Trigger message received event
event_handler.handle_message_received(
    context_id=context_id,
    message="Hello, VANA!"
)

# Trigger message sent event
event_handler.handle_message_sent(
    context_id=context_id,
    message="Hello! How can I help you today?"
)

# Trigger tool called event
event_handler.handle_tool_called(
    context_id=context_id,
    tool_name="search",
    tool_args={"query": "How does VANA work?"}
)

# Trigger tool response event
event_handler.handle_tool_response(
    context_id=context_id,
    tool_name="search",
    tool_args={"query": "How does VANA work?"},
    response="VANA is a multi-agent system..."
)

# Trigger error event
event_handler.handle_error(
    context_id=context_id,
    error_message="Failed to execute tool",
    error_type="tool_execution_error"
)
```

## Implementation Examples

### Basic Integration

Here's a complete example of integrating VANA with ADK:

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

# Register a specialist agent
tool_adapter.register_specialist_as_tool(
    specialist_name="rhea",
    specialist_obj=rhea_agent,
    tool_name="design_architecture"
)

# Register a function
@tool_adapter.tool_decorator(name="search")
def search_knowledge(query: str) -> str:
    """Search the knowledge base."""
    return f"Results for: {query}"

# Create a session
session_info = session_adapter.create_session(
    user_id="user123"
)
context_id = session_info["vana_context_id"]

# Add a message
session_adapter.add_message_to_session(
    context_id=context_id,
    role="user",
    content="I need help designing an agent architecture."
)

# Execute a tool
result = tool_adapter.execute_tool(
    tool_name="design_architecture",
    query="I need a multi-agent system with memory."
)

# Add the response
session_adapter.add_message_to_session(
    context_id=context_id,
    role="assistant",
    content=result
)

# Sync state
state_manager.sync_state(context_id)
```

### Integration with VANA Agent

Here's how to integrate ADK with the VANA agent:

```python
from vana.agents.vana import VanaAgent
from vana.adk_integration import (
    ADKSessionAdapter,
    ADKToolAdapter,
    ADKStateManager,
    ADKEventHandler
)

class EnhancedVanaAgent(VanaAgent):
    """Enhanced VANA agent with ADK integration."""
    
    def __init__(self):
        """Initialize the enhanced VANA agent."""
        super().__init__()
        
        # Create ADK integration components
        self.session_adapter = ADKSessionAdapter(self.context_manager)
        self.tool_adapter = ADKToolAdapter()
        self.state_manager = ADKStateManager(self.session_adapter, self.context_manager)
        self.event_handler = ADKEventHandler(
            self.session_adapter,
            self.state_manager,
            self.context_manager
        )
        
        # Register specialist agents as tools
        for name, agent in self.specialists.items():
            self.tool_adapter.register_specialist_as_tool(
                specialist_name=name,
                specialist_obj=agent
            )
            
    def process_message(self, user_id, session_id, message):
        """Process a user message."""
        # Get or create context
        if not hasattr(self, 'current_context_id') or not self.current_context_id:
            session_info = self.session_adapter.create_session(
                user_id=user_id,
                session_id=session_id
            )
            self.current_context_id = session_info["vana_context_id"]
        
        # Add message to context
        self.event_handler.handle_message_received(
            context_id=self.current_context_id,
            message=message
        )
        
        # Process message with existing logic
        response = super().process_message(user_id, session_id, message)
        
        # Add response to context
        self.event_handler.handle_message_sent(
            context_id=self.current_context_id,
            message=response
        )
        
        # Sync state
        self.state_manager.sync_state(self.current_context_id)
        
        return response
```

## Troubleshooting

### ADK Not Available

If ADK is not available, the integration components will fall back to local-only operation:

- `ADKSessionAdapter` will create and manage VANA contexts only
- `ADKToolAdapter` will log warnings when attempting to register tools
- `ADKStateManager` will operate on VANA contexts only
- `ADKEventHandler` will process events locally only

To check if ADK is available:

```python
if session_adapter.is_adk_available():
    print("ADK is available")
else:
    print("ADK is not available, using fallback mechanisms")
```

### Session Synchronization Issues

If you encounter issues with session synchronization:

1. Check that the context ID is valid
2. Ensure the session exists in both systems
3. Try manually syncing the session state:
   ```python
   session_adapter.sync_session_state(context_id)
   ```

### Tool Execution Errors

If tools fail to execute:

1. Check that the tool is registered correctly
2. Verify that the tool arguments are correct
3. Try executing the tool directly:
   ```python
   result = tool_adapter.execute_tool(tool_name, *args, **kwargs)
   ```

## Best Practices

### Error Handling

Always include proper error handling when working with ADK integration:

```python
try:
    result = tool_adapter.execute_tool(tool_name, *args, **kwargs)
except Exception as e:
    logger.error(f"Error executing tool {tool_name}: {e}")
    result = f"Error: {str(e)}"
```

### Graceful Degradation

Design your code to gracefully degrade when ADK is not available:

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

### State Synchronization

Regularly synchronize state to ensure consistency:

```python
# After significant state changes
state_manager.sync_state(context_id)

# Before retrieving state
state = state_manager.get_state(context_id)
```

### Tool Registration

Register tools early in the application lifecycle:

```python
def initialize_tools():
    """Initialize all tools at application startup."""
    # Register specialist agents
    for name, agent in specialists.items():
        tool_adapter.register_specialist_as_tool(name, agent)
    
    # Register functions
    for func in tool_functions:
        tool_adapter.register_function_as_tool(func)
```

### Event Handling

Use event handlers to maintain a consistent application state:

```python
# Register handlers for critical events
event_handler.register_event_handler(
    ADKEventHandler.EVENT_SESSION_CREATED,
    handle_session_created
)
event_handler.register_event_handler(
    ADKEventHandler.EVENT_MESSAGE_RECEIVED,
    handle_message_received
)
event_handler.register_event_handler(
    ADKEventHandler.EVENT_ERROR,
    handle_error
)
```

## Conclusion

The VANA ADK Integration provides a robust bridge between VANA's native components and Google's Agent Development Kit. By following this guide, you can leverage the strengths of both systems to create powerful, flexible agent applications.

For more information, refer to the [VANA Context Management Architecture](architecture/adk-integration.md) and the [Google ADK Documentation](https://google.github.io/adk-docs/).
