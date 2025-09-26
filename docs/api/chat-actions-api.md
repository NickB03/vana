# Chat Actions API Documentation

## Overview

The Chat Actions API provides endpoints for interactive chat functionality including message regeneration, editing, deletion, and feedback systems. All endpoints support real-time updates via Server-Sent Events (SSE).

## Base URL

```
/api/messages
```

## Authentication

All endpoints require authentication via JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Message Operations

### 1. Message Regeneration

Regenerate an assistant message with new AI-generated content.

#### `POST /api/messages/{message_id}/regenerate`

**Path Parameters:**
- `message_id` (string): ID of the assistant message to regenerate

**Request Body:**
```json
{
  "context": "Additional context for regeneration (optional)",
  "model": "gemini-2.5-pro-latest (optional)",
  "temperature": 0.7
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "msg_12345_session_67890_assistant",
  "session_id": "session_67890",
  "operation": "regenerate",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "data": {
    "task_id": "regen_abc123",
    "original_message_id": "msg_12344_session_67890_user"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid message ID or message is not from assistant
- `404 Not Found`: Message or session not found
- `500 Internal Server Error`: Regeneration failed

**SSE Events Generated:**
- `message_regenerating`: Regeneration started
- `regeneration_progress`: Progress updates (0-100%)
- `message_regenerated`: Regeneration completed
- `regeneration_error`: Error occurred

### 2. Message Editing

Edit the content of an existing message.

#### `PUT /api/messages/{message_id}`

**Path Parameters:**
- `message_id` (string): ID of the message to edit

**Request Body:**
```json
{
  "content": "New message content",
  "trigger_regeneration": true
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "msg_12345_session_67890_user",
  "session_id": "session_67890",
  "operation": "edit",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "data": {
    "original_content": "Original message text",
    "new_content": "New message content",
    "triggered_regeneration": true,
    "regeneration_task_id": "regen_def456"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid content or message ID
- `404 Not Found`: Message or session not found

**SSE Events Generated:**
- `message_edited`: Message content updated
- If `trigger_regeneration` is true and message is from user:
  - `message_regenerating`: Subsequent assistant message regeneration started
  - `regeneration_progress`: Progress updates
  - `message_regenerated`: Regeneration completed

### 3. Message Deletion

Delete a message and all subsequent messages in the conversation.

#### `DELETE /api/messages/{message_id}`

**Path Parameters:**
- `message_id` (string): ID of the message to delete

**Response:**
```json
{
  "success": true,
  "message_id": "msg_12345_session_67890_user",
  "session_id": "session_67890",
  "operation": "delete",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "data": {
    "deleted_count": 3,
    "deleted_message_ids": [
      "msg_12345_session_67890_user",
      "msg_12346_session_67890_assistant",
      "msg_12347_session_67890_user"
    ]
  }
}
```

**Error Responses:**
- `404 Not Found`: Message or session not found

**SSE Events Generated:**
- `message_deleted`: Message(s) deleted from conversation

## Feedback System

### 4. Submit Message Feedback

Provide upvote/downvote feedback for a message.

#### `POST /api/messages/{message_id}/feedback`

**Path Parameters:**
- `message_id` (string): ID of the message to provide feedback for

**Request Body:**
```json
{
  "feedback_type": "upvote",
  "reason": "Helpful and accurate response (optional)",
  "metadata": {
    "source": "chat_interface",
    "rating_scale": "binary"
  }
}
```

**Response:**
```json
{
  "success": true,
  "feedback_id": "fb_abc123",
  "message_id": "msg_12345_session_67890_assistant",
  "session_id": "session_67890",
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid feedback type
- `404 Not Found`: Message or session not found

**SSE Events Generated:**
- `feedback_submitted`: Feedback recorded for message

### 5. Get Message Feedback

Retrieve feedback statistics for a message.

#### `GET /api/messages/{message_id}/feedback`

**Response:**
```json
{
  "message_id": "msg_12345_session_67890_assistant",
  "feedback_summary": {
    "upvotes": 5,
    "downvotes": 1,
    "total": 6
  },
  "recent_feedback": [
    {
      "id": "fb_abc123",
      "feedback_type": "upvote",
      "reason": "Very helpful",
      "created_at": "2025-01-20T09:55:00.000Z"
    }
  ],
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

## History and Tracking

### 6. Get Message Edit History

Retrieve the edit history for a message.

#### `GET /api/messages/{message_id}/history`

**Response:**
```json
{
  "message_id": "msg_12345_session_67890_user",
  "edit_count": 2,
  "history": [
    {
      "id": "hist_def456",
      "original_content": "Original text",
      "edited_content": "First edit",
      "edit_timestamp": "2025-01-20T09:30:00.000Z",
      "user_id": 123
    },
    {
      "id": "hist_ghi789",
      "original_content": "First edit",
      "edited_content": "Final edit",
      "edit_timestamp": "2025-01-20T09:45:00.000Z",
      "user_id": 123
    }
  ],
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

### 7. Get Regeneration Task Status

Check the status of a regeneration task.

#### `GET /api/messages/tasks/{task_id}/status`

**Path Parameters:**
- `task_id` (string): ID of the regeneration task

**Response:**
```json
{
  "task_id": "regen_abc123",
  "status": "in_progress",
  "progress": 65.0,
  "message_id": "msg_12345_session_67890_assistant",
  "session_id": "session_67890",
  "created_at": "2025-01-20T09:55:00.000Z",
  "started_at": "2025-01-20T09:55:05.000Z",
  "completed_at": null,
  "error_message": null,
  "timestamp": "2025-01-20T10:00:00.000Z"
}
```

**Task Status Values:**
- `pending`: Task created but not started
- `in_progress`: Task is currently running
- `completed`: Task finished successfully
- `failed`: Task encountered an error

## Server-Sent Events (SSE)

### Event Types

The chat actions API broadcasts real-time events via SSE. Connect to existing SSE endpoints to receive these events:

#### Message Operation Events

**`message_regenerating`**
```json
{
  "type": "message_regenerating",
  "data": {
    "messageId": "msg_12345_session_67890_assistant",
    "sessionId": "session_67890",
    "taskId": "regen_abc123",
    "originalMessageId": "msg_12344_session_67890_user",
    "userQuery": "What is machine learning?",
    "timestamp": "2025-01-20T10:00:00.000Z"
  }
}
```

**`regeneration_progress`**
```json
{
  "type": "regeneration_progress",
  "data": {
    "messageId": "msg_12345_session_67890_assistant",
    "sessionId": "session_67890",
    "taskId": "regen_abc123",
    "progress": 45.5,
    "message": "Generating response...",
    "partialContent": "Machine learning is...",
    "timestamp": "2025-01-20T10:00:01.000Z"
  }
}
```

**`message_regenerated`**
```json
{
  "type": "message_regenerated",
  "data": {
    "messageId": "msg_12345_session_67890_assistant",
    "sessionId": "session_67890",
    "taskId": "regen_abc123",
    "content": "Complete regenerated message content...",
    "timestamp": "2025-01-20T10:00:10.000Z"
  }
}
```

**`message_edited`**
```json
{
  "type": "message_edited",
  "data": {
    "messageId": "msg_12345_session_67890_user",
    "sessionId": "session_67890",
    "content": "New edited content",
    "previousContent": "Original content",
    "edited": true,
    "timestamp": "2025-01-20T10:00:00.000Z"
  }
}
```

**`message_deleted`**
```json
{
  "type": "message_deleted",
  "data": {
    "messageId": "msg_12345_session_67890_user",
    "sessionId": "session_67890",
    "deletedCount": 2,
    "deletedMessageIds": ["msg_12345_session_67890_user", "msg_12346_session_67890_assistant"],
    "timestamp": "2025-01-20T10:00:00.000Z"
  }
}
```

#### Feedback Events

**`feedback_submitted`**
```json
{
  "type": "feedback_submitted",
  "data": {
    "messageId": "msg_12345_session_67890_assistant",
    "sessionId": "session_67890",
    "feedbackId": "fb_abc123",
    "feedbackType": "upvote",
    "timestamp": "2025-01-20T10:00:00.000Z"
  }
}
```

#### Thought Process Events

For advanced AI interactions, the system can broadcast thought process events:

**`thought_process_start`**
```json
{
  "type": "thought_process_start",
  "data": {
    "messageId": "msg_12345_session_67890_assistant",
    "sessionId": "session_67890",
    "taskId": "regen_abc123",
    "thinkingAbout": "How to explain machine learning concepts clearly",
    "timestamp": "2025-01-20T10:00:00.000Z"
  }
}
```

**`thought_process_step`**
```json
{
  "type": "thought_process_step",
  "data": {
    "messageId": "msg_12345_session_67890_assistant",
    "sessionId": "session_67890",
    "taskId": "regen_abc123",
    "step": "Consider audience level",
    "reasoning": "The user seems to be asking a general question, so I should provide an accessible explanation",
    "timestamp": "2025-01-20T10:00:01.000Z"
  }
}
```

#### Error Events

**`regeneration_error`**
```json
{
  "type": "regeneration_error",
  "data": {
    "messageId": "msg_12345_session_67890_assistant",
    "sessionId": "session_67890",
    "taskId": "regen_abc123",
    "error": "AI model temporarily unavailable",
    "timestamp": "2025-01-20T10:00:05.000Z"
  }
}
```

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "message_id": "msg_12345_session_67890_assistant",
  "session_id": "session_67890",
  "operation": "regenerate",
  "timestamp": "2025-01-20T10:00:00.000Z",
  "error": "Detailed error message",
  "data": null
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Operation conflicts with current state
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error
- `503 Service Unavailable`: AI model or service temporarily unavailable

## Rate Limiting

All endpoints are subject to rate limiting:

- **Standard users**: 60 requests per minute per user
- **Regeneration operations**: 10 requests per minute per user
- **Feedback submissions**: 30 requests per minute per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642678800
```

## Integration Examples

### Frontend Integration

```javascript
// Regenerate a message
async function regenerateMessage(messageId, options = {}) {
  const response = await fetch(`/api/messages/${messageId}/regenerate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      temperature: options.temperature || 0.7,
      context: options.context
    })
  });

  const result = await response.json();

  if (result.success) {
    // Task started, listen for SSE updates
    const taskId = result.data.task_id;
    monitorRegenerationProgress(taskId);
  }

  return result;
}

// Listen for SSE events
function setupSSEListener(sessionId) {
  const eventSource = new EventSource(`/api/run_sse/${sessionId}`);

  eventSource.addEventListener('regeneration_progress', (event) => {
    const data = JSON.parse(event.data);
    updateProgressBar(data.messageId, data.progress);

    if (data.partialContent) {
      updateMessageContent(data.messageId, data.partialContent, true);
    }
  });

  eventSource.addEventListener('message_regenerated', (event) => {
    const data = JSON.parse(event.data);
    updateMessageContent(data.messageId, data.content, false);
    hideProgressBar(data.messageId);
  });

  eventSource.addEventListener('message_edited', (event) => {
    const data = JSON.parse(event.data);
    updateMessageContent(data.messageId, data.content, false);
    markMessageAsEdited(data.messageId);
  });

  eventSource.addEventListener('message_deleted', (event) => {
    const data = JSON.parse(event.data);
    data.deletedMessageIds.forEach(messageId => {
      removeMessageFromUI(messageId);
    });
  });
}

// Submit feedback
async function submitFeedback(messageId, feedbackType, reason = null) {
  const response = await fetch(`/api/messages/${messageId}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      feedback_type: feedbackType,
      reason: reason
    })
  });

  return response.json();
}
```

### Python Client Example

```python
import requests
import asyncio
import aiohttp
from typing import Dict, Any, AsyncGenerator

class ChatActionsClient:
    def __init__(self, base_url: str, access_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

    async def regenerate_message(
        self,
        message_id: str,
        context: str = None,
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """Regenerate an assistant message."""
        url = f"{self.base_url}/api/messages/{message_id}/regenerate"
        payload = {'temperature': temperature}
        if context:
            payload['context'] = context

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=self.headers, json=payload) as response:
                return await response.json()

    async def edit_message(
        self,
        message_id: str,
        content: str,
        trigger_regeneration: bool = True
    ) -> Dict[str, Any]:
        """Edit a message's content."""
        url = f"{self.base_url}/api/messages/{message_id}"
        payload = {
            'content': content,
            'trigger_regeneration': trigger_regeneration
        }

        async with aiohttp.ClientSession() as session:
            async with session.put(url, headers=self.headers, json=payload) as response:
                return await response.json()

    async def delete_message(self, message_id: str) -> Dict[str, Any]:
        """Delete a message."""
        url = f"{self.base_url}/api/messages/{message_id}"

        async with aiohttp.ClientSession() as session:
            async with session.delete(url, headers=self.headers) as response:
                return await response.json()

    async def submit_feedback(
        self,
        message_id: str,
        feedback_type: str,
        reason: str = None
    ) -> Dict[str, Any]:
        """Submit feedback for a message."""
        url = f"{self.base_url}/api/messages/{message_id}/feedback"
        payload = {'feedback_type': feedback_type}
        if reason:
            payload['reason'] = reason

        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=self.headers, json=payload) as response:
                return await response.json()

    async def listen_to_events(self, session_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """Listen to SSE events for a session."""
        url = f"{self.base_url}/api/run_sse/{session_id}"

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=self.headers) as response:
                async for line in response.content:
                    line = line.decode('utf-8').strip()
                    if line.startswith('data: '):
                        try:
                            import json
                            event_data = json.loads(line[6:])  # Remove 'data: ' prefix
                            yield event_data
                        except json.JSONDecodeError:
                            continue

# Usage example
async def main():
    client = ChatActionsClient("http://localhost:8000", "your_access_token")

    # Regenerate a message
    result = await client.regenerate_message("msg_12345_session_67890_assistant")
    print(f"Regeneration started: {result}")

    # Listen for events
    async for event in client.listen_to_events("session_67890"):
        if event.get('type') == 'message_regenerated':
            print(f"Message regenerated: {event['data']['content']}")
            break

if __name__ == "__main__":
    asyncio.run(main())
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Rate Limiting**: Prevents abuse of resource-intensive operations
3. **Input Validation**: All inputs are validated and sanitized
4. **Session Binding**: Users can only access their own sessions and messages
5. **Audit Logging**: All operations are logged for security monitoring
6. **Content Filtering**: Generated content is filtered for inappropriate material

## Performance Considerations

1. **Regeneration**: Can take 5-30 seconds depending on complexity
2. **Concurrent Operations**: Limited to prevent resource exhaustion
3. **SSE Connections**: Automatically cleaned up after inactivity
4. **Database Indexing**: Optimized queries for message operations
5. **Caching**: Frequently accessed data is cached for performance