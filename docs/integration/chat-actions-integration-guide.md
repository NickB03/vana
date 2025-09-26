# Chat Actions Integration Guide

## Overview

This guide explains how to integrate the new Chat Actions API with the existing Vana backend system.

## Integration Steps

### 1. Update server.py

Add the following imports and include the chat actions router:

```python
# Add to imports section
from app.routes.chat_actions import router as chat_actions_router
from app.integration.chat_actions_integration import setup_chat_actions_integration

# Add after existing router inclusions
app.include_router(chat_actions_router)

# Add to startup event
@app.on_event("startup")
async def startup_event():
    setup_chat_actions_integration()
    # ... other startup code
```

### 2. Database Setup

#### For SQLite (Development)

```python
# Add to your database initialization
import sqlite3
from pathlib import Path

def setup_chat_actions_database():
    db_path = Path("vana_sessions.db")  # Use your existing DB path

    with sqlite3.connect(db_path) as conn:
        # Read and execute the migration SQL
        migration_sql = Path("app/database/migrations/001_chat_actions.sql").read_text()

        # SQLite doesn't support all MySQL features, so use a simplified version
        simplified_migration = """
        CREATE TABLE IF NOT EXISTS message_feedback (
            id TEXT PRIMARY KEY,
            message_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            user_id INTEGER,
            feedback_type TEXT CHECK (feedback_type IN ('upvote', 'downvote')),
            reason TEXT,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            client_ip TEXT,
            user_agent TEXT,
            UNIQUE(user_id, message_id)
        );

        CREATE TABLE IF NOT EXISTS message_edit_history (
            id TEXT PRIMARY KEY,
            message_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            original_content TEXT NOT NULL,
            edited_content TEXT NOT NULL,
            edit_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            user_id INTEGER,
            edit_reason TEXT,
            metadata TEXT
        );

        CREATE TABLE IF NOT EXISTS regeneration_tasks (
            id TEXT PRIMARY KEY,
            message_id TEXT NOT NULL,
            session_id TEXT NOT NULL,
            original_message_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
            progress REAL DEFAULT 0.0,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            context TEXT,
            user_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS chat_action_logs (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            message_id TEXT,
            action_type TEXT NOT NULL,
            user_id INTEGER,
            details TEXT,
            client_ip TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_message_feedback_message_id ON message_feedback(message_id);
        CREATE INDEX IF NOT EXISTS idx_message_feedback_session_id ON message_feedback(session_id);
        CREATE INDEX IF NOT EXISTS idx_regeneration_tasks_session_id ON regeneration_tasks(session_id);
        CREATE INDEX IF NOT EXISTS idx_chat_action_logs_session_id ON chat_action_logs(session_id);
        """

        conn.executescript(simplified_migration)
```

#### For MySQL/PostgreSQL (Production)

```python
# Execute the full migration SQL file
async def run_chat_actions_migration():
    # Use your existing database connection
    migration_sql = Path("app/database/migrations/001_chat_actions.sql").read_text()

    # Execute migration
    # await database.execute(migration_sql)
```

### 3. Update Frontend Integration

Add the chat actions router to your existing SSE endpoint handling:

```python
# In server.py, update the existing SSE endpoint to handle chat action events
@app.get("/api/run_sse/{session_id}")
async def get_research_sse(
    session_id: str,
    current_user: User = current_active_user_dep
) -> StreamingResponse:
    """Enhanced SSE endpoint that handles both research and chat action events."""

    # Your existing SSE implementation, but now it will automatically
    # receive chat action events through the SSE broadcaster

    from app.utils.sse_broadcaster import agent_network_event_stream
    return StreamingResponse(
        agent_network_event_stream(session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

### 4. Research Agents Integration

To integrate with your existing research agents system:

```python
# In app/routes/chat_actions.py, update the _perform_regeneration function

async def _perform_regeneration(
    task_id: str,
    user_query: str,
    regenerate_request: MessageRegenerateRequest
) -> None:
    """Enhanced regeneration using existing research agents."""

    from app.integration.chat_actions_integration import regenerate_message_with_ai
    from app.models.chat_models import RegenerationTask

    task = regeneration_tasks.get(task_id)
    if not task:
        return

    # Use the integration layer to connect with research agents
    await regenerate_message_with_ai(task_id, user_query, regenerate_request, task)
```

### 5. Environment Variables

Add these optional environment variables for configuration:

```bash
# Chat Actions Configuration
CHAT_ACTIONS_RATE_LIMIT=60  # Requests per minute
CHAT_REGENERATION_RATE_LIMIT=10  # Regenerations per minute
CHAT_ACTIONS_MAX_CONTENT_LENGTH=10000  # Max characters in message
CHAT_ACTIONS_ENABLE_THOUGHT_PROCESS=true  # Enable AI thought process broadcasting
CHAT_ACTIONS_CLEANUP_INTERVAL=3600  # Cleanup interval in seconds
```

### 6. Message ID Format

The implementation assumes message IDs follow this format:
```
msg_{uuid}_{session_id}_{role}
```

If your message IDs use a different format, update the message ID extraction logic in the route handlers:

```python
# In app/routes/chat_actions.py, update these functions
def extract_session_id_from_message_id(message_id: str) -> str:
    """Extract session ID from message ID based on your format."""
    # Update this logic based on your message ID format
    parts = message_id.split("_")
    if len(parts) >= 3:
        return parts[2]  # Adjust index based on your format
    raise HTTPException(status_code=400, detail="Invalid message ID format")
```

## Testing the Integration

### 1. Basic Functionality Test

```python
# test_chat_actions.py
import pytest
from fastapi.testclient import TestClient
from app.server import app

client = TestClient(app)

def test_message_regeneration():
    # Create a test session and message
    session_data = {
        "query": "Test question",
        "session_id": "test_session_123"
    }

    # Start a research session
    response = client.post("/api/run_sse/test_session_123", json=session_data)
    assert response.status_code == 200

    # Test message regeneration
    regenerate_response = client.post(
        "/api/messages/msg_123_test_session_123_assistant/regenerate",
        json={"temperature": 0.8}
    )

    assert regenerate_response.status_code == 200
    data = regenerate_response.json()
    assert data["success"] is True
    assert "task_id" in data["data"]

def test_message_editing():
    edit_response = client.put(
        "/api/messages/msg_123_test_session_123_user",
        json={
            "content": "Updated message content",
            "trigger_regeneration": True
        }
    )

    assert edit_response.status_code == 200
    data = edit_response.json()
    assert data["success"] is True
    assert data["operation"] == "edit"

def test_feedback_submission():
    feedback_response = client.post(
        "/api/messages/msg_123_test_session_123_assistant/feedback",
        json={
            "feedback_type": "upvote",
            "reason": "Very helpful response"
        }
    )

    assert feedback_response.status_code == 200
    data = feedback_response.json()
    assert data["success"] is True
```

### 2. SSE Integration Test

```javascript
// Frontend test for SSE events
function testChatActionsSSE() {
    const eventSource = new EventSource('/api/run_sse/test_session_123');

    const eventTypes = [
        'message_regenerating',
        'regeneration_progress',
        'message_regenerated',
        'message_edited',
        'message_deleted',
        'feedback_submitted'
    ];

    eventTypes.forEach(eventType => {
        eventSource.addEventListener(eventType, (event) => {
            const data = JSON.parse(event.data);
            console.log(`Received ${eventType}:`, data);

            // Handle event based on type
            handleChatActionEvent(eventType, data);
        });
    });
}

function handleChatActionEvent(eventType, data) {
    switch (eventType) {
        case 'regeneration_progress':
            updateProgressBar(data.messageId, data.progress);
            break;
        case 'message_regenerated':
            updateMessageContent(data.messageId, data.content);
            break;
        case 'message_edited':
            updateMessageContent(data.messageId, data.content);
            markAsEdited(data.messageId);
            break;
        // ... handle other event types
    }
}
```

## Frontend UI Components

### Message Action Buttons

```html
<!-- Add these buttons to your message components -->
<div class="message-actions">
    <!-- For assistant messages -->
    <button onclick="regenerateMessage('{{ message.id }}')">
        🔄 Regenerate
    </button>
    <button onclick="submitFeedback('{{ message.id }}', 'upvote')">
        👍 Upvote
    </button>
    <button onclick="submitFeedback('{{ message.id }}', 'downvote')">
        👎 Downvote
    </button>

    <!-- For user messages -->
    <button onclick="editMessage('{{ message.id }}')">
        ✏️ Edit
    </button>

    <!-- For any message -->
    <button onclick="deleteMessage('{{ message.id }}')">
        🗑️ Delete
    </button>
</div>

<!-- Progress indicator for regeneration -->
<div id="progress-{{ message.id }}" class="regeneration-progress" style="display: none;">
    <div class="progress-bar">
        <div class="progress-fill" style="width: 0%"></div>
    </div>
    <div class="progress-text">Regenerating...</div>
</div>
```

### JavaScript Functions

```javascript
async function regenerateMessage(messageId) {
    try {
        showProgress(messageId);

        const response = await fetch(`/api/messages/${messageId}/regenerate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();

        if (result.success) {
            // Progress will be updated via SSE
            console.log('Regeneration started:', result.data.task_id);
        } else {
            hideProgress(messageId);
            showError('Regeneration failed: ' + result.error);
        }
    } catch (error) {
        hideProgress(messageId);
        showError('Network error: ' + error.message);
    }
}

async function editMessage(messageId) {
    const currentContent = getMessageContent(messageId);
    const newContent = prompt('Edit message:', currentContent);

    if (newContent && newContent !== currentContent) {
        try {
            const response = await fetch(`/api/messages/${messageId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${getAccessToken()}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: newContent,
                    trigger_regeneration: confirm('Regenerate assistant response after edit?')
                })
            });

            const result = await response.json();

            if (result.success) {
                // Message update will be handled via SSE
                console.log('Message edited successfully');
            } else {
                showError('Edit failed: ' + result.error);
            }
        } catch (error) {
            showError('Network error: ' + error.message);
        }
    }
}

async function submitFeedback(messageId, feedbackType) {
    try {
        const response = await fetch(`/api/messages/${messageId}/feedback`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAccessToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                feedback_type: feedbackType
            })
        });

        const result = await response.json();

        if (result.success) {
            updateFeedbackUI(messageId, feedbackType);
            showSuccess(`${feedbackType} submitted!`);
        } else {
            showError('Feedback submission failed: ' + result.error);
        }
    } catch (error) {
        showError('Network error: ' + error.message);
    }
}

// Utility functions
function showProgress(messageId) {
    document.getElementById(`progress-${messageId}`).style.display = 'block';
}

function hideProgress(messageId) {
    document.getElementById(`progress-${messageId}`).style.display = 'none';
}

function updateProgressBar(messageId, progress) {
    const progressBar = document.querySelector(`#progress-${messageId} .progress-fill`);
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
}

function updateMessageContent(messageId, content) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"] .message-content`);
    if (messageElement) {
        messageElement.innerHTML = markdownToHtml(content);
    }
}
```

## Security Considerations

1. **Rate Limiting**: The system includes built-in rate limiting to prevent abuse
2. **Session Validation**: All operations validate user access to sessions
3. **Input Sanitization**: All user inputs are validated and sanitized
4. **Audit Logging**: All chat actions are logged for security monitoring

## Performance Optimization

1. **Async Operations**: All API endpoints are fully async
2. **Database Indexing**: Proper indexes are created for common queries
3. **Connection Pooling**: Use database connection pooling in production
4. **Caching**: Consider caching frequently accessed data

## Monitoring and Analytics

The system provides built-in analytics for:
- Message regeneration success rates
- User feedback patterns
- Edit frequency
- Response times

Access analytics via:
```python
from app.integration.chat_actions_integration import chat_actions_integrator

analytics = await chat_actions_integrator.get_session_analytics("session_id")
```

## Troubleshooting

### Common Issues

1. **Message ID Format Errors**: Ensure message IDs follow the expected format
2. **SSE Connection Issues**: Check that the SSE endpoint is properly configured
3. **Database Migration Errors**: Ensure database permissions are correct
4. **Rate Limit Exceeded**: Users hitting rate limits too frequently

### Debug Mode

Enable debug logging:
```python
import logging
logging.getLogger('app.routes.chat_actions').setLevel(logging.DEBUG)
logging.getLogger('app.integration.chat_actions_integration').setLevel(logging.DEBUG)
```

This will provide detailed logs for debugging chat actions functionality.