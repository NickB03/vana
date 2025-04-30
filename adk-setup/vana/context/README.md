# Context Management Components

This directory contains the components for managing conversation contexts in the VANA system.

## Components

### Context

The `Context` class represents the basic unit of context in the VANA system. It contains:

- User ID
- Session ID
- Context ID (unique identifier)
- Creation and update timestamps
- Key-value data store

### ContextManager

The `ContextManager` class provides basic context management functionality:

- Creating contexts
- Retrieving contexts by ID
- Saving contexts to persistent storage
- Listing contexts with filtering options
- Caching for performance optimization

### ConversationContext

The `ConversationContext` class extends the basic `Context` with conversation-specific features:

- Message history (user and assistant messages)
- Entity tracking (extracted entities from conversations)
- Context scoping (session, user, global)
- Relevance scoring
- Context summarization

### ConversationContextManager

The `ConversationContextManager` class extends the basic `ContextManager` with conversation-specific management features:

- Creating conversation contexts with scope
- Saving and loading conversation contexts
- Listing conversation contexts with filtering
- Fetching relevant memory based on context
- Calculating context relevance to queries
- Summarizing contexts for specialist agents

## Usage

```python
from vana.context import ConversationContextManager, ConversationContext

# Create context manager
context_manager = ConversationContextManager()

# Create a new context
context = context_manager.create_conversation_context(
    user_id="user123",
    session_id="session456",
    scope=ConversationContext.SCOPE_SESSION
)

# Add messages
context.add_message("user", "Hello, I need help with VANA.")
context.add_message("assistant", "I'd be happy to help! What do you need to know?")

# Add entities
context.add_entity("topic", "VANA", {"type": "agent_system"})

# Set summary
context.set_summary("User asking for help with VANA")

# Save context
context_manager.save_conversation_context(context)

# Retrieve context later
retrieved_context = context_manager.get_conversation_context(context.id)

# Get relevant contexts
relevant_contexts = context_manager.get_relevant_contexts(
    query="How does VANA's context management work?",
    user_id="user123",
    top_k=3
)

# Fetch relevant memory
memory_items = context_manager.fetch_relevant_memory(
    query="How does VANA's context management work?",
    user_id="user123",
    top_k=5
)
```

## Context Scoping

The VANA context management system supports three levels of context scoping:

1. **Session Scope**: Context is limited to the current session. This is the default scope and is used for most conversations.

2. **User Scope**: Context is shared across all sessions for a specific user. This allows for personalization and user-specific knowledge.

3. **Global Scope**: Context is shared across all users and sessions. This is used for global knowledge and system-wide settings.

```python
# Create session-scoped context (default)
session_context = context_manager.create_conversation_context(
    user_id="user123",
    session_id="session456"
)

# Create user-scoped context
user_context = context_manager.create_conversation_context(
    user_id="user123",
    session_id="session456",
    scope=ConversationContext.SCOPE_USER
)

# Create global-scoped context
global_context = context_manager.create_conversation_context(
    user_id="user123",
    session_id="session456",
    scope=ConversationContext.SCOPE_GLOBAL
)
```

## Testing

Comprehensive tests are available in the `tests/context` directory:

- `test_conversation_context_manager.py` - Tests for ConversationContextManager

## Documentation

For detailed documentation, see:

- [Context Management Architecture](../../docs/context-management-architecture.md) - Comprehensive overview of the context management architecture
