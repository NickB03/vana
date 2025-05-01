# VANA Context Management Architecture

This document provides a comprehensive overview of the context management architecture in the VANA system.

## Table of Contents

1. [Overview](#overview)
2. [Core Components](#core-components)
3. [Context Scoping](#context-scoping)
4. [Memory Integration](#memory-integration)
5. [Context Summarization](#context-summarization)
6. [ADK Integration](#adk-integration)
7. [Implementation Details](#implementation-details)
8. [Usage Examples](#usage-examples)

## Overview

The VANA Context Management system provides a robust framework for managing conversation contexts across sessions, users, and applications. It enables:

- Persistent storage of conversation history
- Context-aware responses based on conversation history
- Integration with memory systems for long-term knowledge
- Seamless integration with Google's Agent Development Kit (ADK)
- Context summarization for specialist agents

The architecture follows a layered approach, with core context management at the base and enhanced conversation context management building on top of it.

## Core Components

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

## Context Scoping

The VANA context management system supports three levels of context scoping:

1. **Session Scope**: Context is limited to the current session. This is the default scope and is used for most conversations.

2. **User Scope**: Context is shared across all sessions for a specific user. This allows for personalization and user-specific knowledge.

3. **Global Scope**: Context is shared across all users and sessions. This is used for global knowledge and system-wide settings.

Context scoping allows for flexible information sharing while maintaining appropriate boundaries for privacy and relevance.

## Memory Integration

The context management system integrates with the VANA memory system to provide long-term knowledge persistence:

1. **Memory Fetching**: The `fetch_relevant_memory` method retrieves relevant information from the memory system based on the current conversation context.

2. **Context Relevance**: The `calculate_context_relevance` method determines how relevant a context is to a specific query, enabling prioritization of contexts.

3. **Relevant Contexts**: The `get_relevant_contexts` method retrieves contexts that are most relevant to a query, allowing for context-aware responses.

This integration ensures that conversations have access to both short-term context (recent messages) and long-term knowledge (from the memory system).

## Context Summarization

To facilitate efficient communication between agents, the context management system includes context summarization capabilities:

1. **Automatic Summarization**: The `summarize_context` method generates concise summaries of conversation contexts.

2. **Specialist Context**: Summaries can be tailored for specialist agents, focusing on relevant information for their specific domain.

3. **Progressive Summarization**: As conversations grow, summaries are updated to maintain a concise overview while preserving key information.

Context summarization enables efficient multi-agent collaboration by reducing the amount of information that needs to be transferred between agents.

## ADK Integration

The VANA context management system integrates seamlessly with Google's Agent Development Kit (ADK) through several adapter components:

1. **ADKSessionAdapter**: Bridges VANA contexts and ADK sessions, enabling synchronization between the two systems.

2. **ADKStateManager**: Manages state synchronization between VANA contexts and ADK sessions.

3. **ADKToolAdapter**: Exposes VANA specialist agents as ADK tools, enabling tool-based agent composition.

4. **ADKEventHandler**: Processes ADK events and triggers appropriate actions in the VANA system.

This integration allows VANA to leverage ADK's capabilities while maintaining its own robust context management system.

## Implementation Details

### Persistence Layer

Contexts are persisted using SQLite, providing a lightweight yet robust storage solution:

- Each context is stored as a row in the `contexts` table
- Context data is serialized to JSON for storage
- Caching is used to minimize database access

### Serialization

Contexts can be serialized to and deserialized from JSON, enabling:

- Storage in databases
- Transmission between components
- Integration with external systems

### Error Handling

The context management system includes comprehensive error handling:

- Graceful degradation when components are unavailable
- Detailed logging for troubleshooting
- Fallback mechanisms for critical operations

### Performance Considerations

Several optimizations ensure high performance:

- In-memory caching of frequently accessed contexts
- Efficient database queries with appropriate indexing
- Lazy loading of context data

## Usage Examples

### Basic Context Management

```python
from vana.context import ConversationContextManager

# Create context manager
context_manager = ConversationContextManager()

# Create a new context
context = context_manager.create_conversation_context(
    user_id="user123",
    session_id="session456"
)

# Add messages
context.add_message("user", "Hello, I need help with VANA.")
context.add_message("assistant", "I'd be happy to help! What do you need to know?")

# Save context
context_manager.save_conversation_context(context)

# Retrieve context later
retrieved_context = context_manager.get_conversation_context(context.id)
```

### Context Scoping

```python
from vana.context import ConversationContextManager, ConversationContext

# Create context manager
context_manager = ConversationContextManager()

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

### Memory Integration

```python
from vana.context import ConversationContextManager
from vana.memory import MemoryManager

# Create managers
context_manager = ConversationContextManager()
memory_manager = MemoryManager()

# Set memory manager
context_manager.memory_manager = memory_manager

# Fetch relevant memory
memory_items = context_manager.fetch_relevant_memory(
    query="How does VANA's context management work?",
    user_id="user123",
    top_k=5
)

# Get relevant contexts
relevant_contexts = context_manager.get_relevant_contexts(
    query="How does VANA's context management work?",
    user_id="user123",
    top_k=3
)
```

### ADK Integration

```python
from vana.context import ConversationContextManager
from vana.adk_integration import ADKSessionAdapter, ADKStateManager

# Create managers
context_manager = ConversationContextManager()
session_adapter = ADKSessionAdapter(context_manager)
state_manager = ADKStateManager(session_adapter, context_manager)

# Create a session
session_info = session_adapter.create_session(
    user_id="user123",
    session_id="session456"
)

# Get context ID
context_id = session_info["vana_context_id"]

# Add a message
session_adapter.add_message_to_session(
    context_id=context_id,
    role="user",
    content="Hello, VANA!"
)

# Sync state
state_manager.sync_state(context_id)

# Get ADK session
adk_session = session_adapter.get_adk_session(context_id)
```

## Conclusion

The VANA Context Management Architecture provides a robust foundation for managing conversation contexts across the system. By integrating with memory systems and ADK, it enables sophisticated context-aware interactions while maintaining flexibility and performance.

The layered design allows for easy extension and customization, while the comprehensive feature set meets the needs of complex agent interactions. This architecture is a key component of VANA's ability to maintain coherent, context-aware conversations across sessions and users.
