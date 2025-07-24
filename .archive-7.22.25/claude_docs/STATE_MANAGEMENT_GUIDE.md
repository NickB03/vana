# VANA State Management Guide

## Overview

VANA uses ADK's native session state management system, replacing the previous Redis-based implementation. This provides a simpler, more reliable, and ADK-compliant approach to state management.

## Architecture

### ADK State Manager
- **Location**: `/lib/workflows/adk_state_manager.py`
- **Purpose**: Manages workflow states and application data using ADK session.state
- **Integration**: Works seamlessly with ADK SessionService

### State Prefixes

VANA uses ADK's prefix conventions for different state scopes:

| Prefix | Scope | Persistence | Example |
|--------|-------|-------------|---------|
| (none) | Session-specific | Within session only | `workflow:123:status` |
| `user:` | User-specific | Across user's sessions | `user:theme` |
| `app:` | Application-wide | Global for all users | `app:feature_flags` |
| `temp:` | Temporary | Never persisted | `temp:cache_key` |

## Usage Examples

### Basic Usage

```python
from google.adk.sessions import InMemorySessionService
from lib.workflows.adk_state_manager import ADKStateManager, WorkflowStatus

# Create session
session_service = InMemorySessionService()
session = await session_service.create_session(
    app_name="vana",
    user_id="user123",
    session_id="session456"
)

# Initialize state manager
state_mgr = ADKStateManager(session)

# Workflow state management
state_mgr.set_workflow_status("wf_001", WorkflowStatus.PROCESSING)
state_mgr.update_workflow_context("wf_001", {"progress": 50})

# User preferences (persist across sessions)
state_mgr.set_user_preference("theme", "dark")
state_mgr.set_user_preference("language", "en")

# Application config (global)
state_mgr.set_app_config("api_version", "v2")
state_mgr.set_app_config("feature_flags", {"new_ui": True})

# Temporary data (never persisted)
state_mgr.set_temp_data("processing_batch", "batch_123")
```

### Production Configuration

In production, use VertexAiSessionService for persistent state:

```python
from google.adk.sessions import VertexAiSessionService
import os

# Production session service
session_service = VertexAiSessionService(
    project_id=os.getenv("GOOGLE_CLOUD_PROJECT"),
    location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
)

# State automatically persisted to Vertex AI
session = await session_service.create_session(
    app_name="vana",
    user_id="prod_user",
    session_id="prod_session"
)

state_mgr = ADKStateManager(session)
# All state changes are automatically persisted
```

## Development vs Production

### Development (InMemorySessionService)
- State exists only in memory
- Lost on application restart
- Good for testing and development
- No cross-session persistence

### Production (VertexAiSessionService)
- State persisted to Vertex AI
- Survives application restarts
- `user:` prefix shared across user's sessions
- `app:` prefix shared globally
- `temp:` prefix never persisted
- Automatic persistence on Runner's append_event()

## Migration from Redis

The Redis-based state management has been completely removed. Key changes:

1. **No Redis dependency**: No need for Redis server or configuration
2. **Simpler API**: Direct state access through session.state
3. **ADK Integration**: Automatic persistence with ADK runners
4. **Better reliability**: No network calls for state access

## Testing

State management has been thoroughly tested:

- ✅ Unit tests for all state operations
- ✅ Integration tests with session services
- ✅ Local deployment without Redis
- ✅ Cloud Run deployment verified
- ✅ Zero Redis errors in production logs

## Future Enhancements (Phase 3)

### Long-term Memory with Vertex AI RAG

VANA has existing RAG infrastructure ready for Phase 3:
- **RAG Corpus**: `projects/analystai-454200/locations/us-central1/ragCorpora/2305843009213693952`
- **Vector Store**: RagManaged with text-embedding-005
- **Integration**: Will use ADK's VertexAiRagMemoryService

### Planned Features
- Semantic search across conversation history
- Knowledge persistence beyond sessions
- Context retrieval for better agent responses
- Integration with existing GCS buckets for document storage

## Best Practices

1. **Use appropriate prefixes**: Choose the right prefix for your use case
2. **Clean temp data**: Call `clear_temp_data()` when appropriate
3. **Minimize state size**: Session state is not meant for large data
4. **Use structured data**: Store dictionaries for complex state
5. **Handle missing state**: Always provide defaults when reading state

## Troubleshooting

### State not persisting?
- Check you're using the right prefix
- Verify session service configuration
- Ensure Runner is calling append_event()

### State too large?
- Consider using artifacts for large data
- Use external storage with state references
- Implement pagination for lists

### Need complex queries?
- Wait for Phase 3 RAG integration
- Use structured state keys for organization
- Implement your own indexing if needed