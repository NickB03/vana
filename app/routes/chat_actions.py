#!/usr/bin/env python3
"""
Chat action API routes for message operations.

This module provides API endpoints for chat action buttons including:
- Message regeneration
- Message editing
- Message deletion
- Feedback system
- Real-time updates via SSE
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse

from app.models.chat_models import (
    MessageEditRequest,
    MessageFeedbackRequest,
    MessageFeedbackResponse,
    MessageOperationResponse,
    MessageRegenerateRequest,
    RegenerationTask,
    SSEMessageEvent,
)
from app.utils.session_store import session_store
from app.utils.sse_broadcaster import get_sse_broadcaster

# Import auth dependencies - fallback if not available
try:
    from app.auth.security import current_active_user_dep
    from app.auth.models import User
except ImportError:
    # Fallback for environments without auth
    def current_active_user_dep() -> None:
        return None

    class User:
        def __init__(self):
            self.id = None
            self.email = None

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/messages", tags=["chat-actions"])

# In-memory storage for feedback and regeneration tasks
# In production, these would be replaced with proper database tables
feedback_store: dict[str, dict[str, Any]] = {}
regeneration_tasks: dict[str, RegenerationTask] = {}
message_history: dict[str, list[dict[str, Any]]] = {}


async def get_client_info(request: Request) -> tuple[str | None, str | None]:
    """Extract client IP and User-Agent from request."""
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    return client_ip, user_agent


async def validate_message_access(
    session_id: str,
    message_id: str,
    user: User | None = None,
    client_ip: str | None = None,
    user_agent: str | None = None
) -> dict[str, Any]:
    """Validate user has access to the message and return session data."""
    # Get session with security validation
    session_data = session_store.get_session(
        session_id,
        client_ip=client_ip,
        user_agent=user_agent,
        user_id=user.id if user else None
    )

    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found or access denied")

    # Find the message in the session
    message = next(
        (msg for msg in session_data.get("messages", []) if msg["id"] == message_id),
        None
    )

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    return {"session": session_data, "message": message}


@router.post("/{message_id}/regenerate")
async def regenerate_message(
    message_id: str,
    request: Request,
    regenerate_request: MessageRegenerateRequest = MessageRegenerateRequest(),
    current_user: User = Depends(current_active_user_dep)
) -> MessageOperationResponse:
    """
    Regenerate an assistant message.

    This endpoint:
    1. Finds the original user message that prompted the assistant response
    2. Clears the current assistant response
    3. Triggers regeneration with the AI model
    4. Streams the new response via SSE

    Args:
        message_id: ID of the assistant message to regenerate
        regenerate_request: Optional parameters for regeneration
        current_user: Current authenticated user

    Returns:
        Operation response with task ID for tracking progress
    """
    client_ip, user_agent = await get_client_info(request)

    # Extract session_id from message_id pattern (assuming format like "msg_<uuid>_<session_id>_<role>")
    # In practice, you might store this mapping differently
    try:
        # This is a simplified extraction - adjust based on your message ID format
        session_id = message_id.split("_")[2] if "_" in message_id else None
        if not session_id:
            raise HTTPException(status_code=400, detail="Invalid message ID format")
    except (IndexError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid message ID format")

    # Validate access to the message
    validation_result = await validate_message_access(
        session_id, message_id, current_user, client_ip, user_agent
    )
    session_data = validation_result["session"]
    message = validation_result["message"]

    # Ensure this is an assistant message
    if message.get("role") != "assistant":
        raise HTTPException(
            status_code=400,
            detail="Only assistant messages can be regenerated"
        )

    # Find the user message that prompted this response
    messages = session_data.get("messages", [])
    message_index = next(
        (i for i, msg in enumerate(messages) if msg["id"] == message_id), -1
    )

    if message_index <= 0:
        raise HTTPException(
            status_code=400,
            detail="Cannot find original user message for regeneration"
        )

    # Find the preceding user message
    user_message = None
    for i in range(message_index - 1, -1, -1):
        if messages[i].get("role") == "user":
            user_message = messages[i]
            break

    if not user_message:
        raise HTTPException(
            status_code=400,
            detail="Cannot find original user message for regeneration"
        )

    # Create regeneration task
    task_id = f"regen_{uuid.uuid4()}"
    task = RegenerationTask(
        id=task_id,
        message_id=message_id,
        session_id=session_id,
        original_message_id=user_message["id"],
        context=regenerate_request.model_dump() if regenerate_request else None,
        status="pending"
    )
    regeneration_tasks[task_id] = task

    # Clear existing assistant message content
    message["content"] = ""
    message["metadata"] = message.get("metadata", {})
    message["metadata"]["regenerating"] = True
    message["metadata"]["regeneration_task_id"] = task_id

    # Update session store
    session_store.update_session(session_id, status="regenerating")

    # Broadcast regeneration start event
    broadcaster = get_sse_broadcaster()
    start_event = SSEMessageEvent(
        type="message_regenerating",
        message_id=message_id,
        session_id=session_id,
        data={
            "taskId": task_id,
            "originalMessageId": user_message["id"],
            "userQuery": user_message.get("content", "")
        }
    )

    await broadcaster.broadcast_event(session_id, {
        "type": "message_regenerating",
        "data": start_event.model_dump()
    })

    # Start regeneration process asynchronously
    asyncio.create_task(_perform_regeneration(task_id, user_message["content"], regenerate_request))

    # Log the operation
    logger.info(f"Message regeneration started: {message_id} by user {current_user.id if current_user else 'anonymous'}")

    return MessageOperationResponse(
        success=True,
        message_id=message_id,
        session_id=session_id,
        operation="regenerate",
        data={
            "task_id": task_id,
            "original_message_id": user_message["id"]
        }
    )


async def _perform_regeneration(
    task_id: str,
    user_query: str,
    regenerate_request: MessageRegenerateRequest
) -> None:
    """Perform the actual message regeneration."""
    task = regeneration_tasks.get(task_id)
    if not task:
        return

    broadcaster = get_sse_broadcaster()

    try:
        # Update task status
        task.status = "in_progress"
        task.started_at = datetime.utcnow()

        # Broadcast progress
        progress_event = SSEMessageEvent(
            type="regeneration_progress",
            message_id=task.message_id,
            session_id=task.session_id,
            data={
                "taskId": task_id,
                "progress": 10,
                "message": "Initializing regeneration..."
            }
        )

        await broadcaster.broadcast_event(task.session_id, {
            "type": "regeneration_progress",
            "data": progress_event.model_dump()
        })

        # Simulate AI processing (replace with actual AI integration)
        # In production, this would integrate with your research agents or AI models
        await _simulate_ai_generation(task, user_query, regenerate_request)

    except Exception as e:
        logger.error(f"Regeneration failed for task {task_id}: {str(e)}")

        # Update task with error
        task.status = "failed"
        task.error_message = str(e)
        task.completed_at = datetime.utcnow()

        # Broadcast error event
        error_event = SSEMessageEvent(
            type="regeneration_error",
            message_id=task.message_id,
            session_id=task.session_id,
            data={
                "taskId": task_id,
                "error": str(e)
            }
        )

        await broadcaster.broadcast_event(task.session_id, {
            "type": "regeneration_error",
            "data": error_event.model_dump()
        })


async def _simulate_ai_generation(
    task: RegenerationTask,
    user_query: str,
    regenerate_request: MessageRegenerateRequest
) -> None:
    """Simulate AI generation process with progress updates."""
    broadcaster = get_sse_broadcaster()

    # Simulate processing steps
    steps = [
        (20, "Processing user query..."),
        (40, "Generating response..."),
        (60, "Refining content..."),
        (80, "Finalizing response..."),
        (100, "Complete!")
    ]

    generated_content = f"Regenerated response for: {user_query}\n\nThis is a simulated regeneration. In production, this would be replaced with actual AI model inference."

    for progress, message in steps:
        task.progress = progress

        # Broadcast progress
        progress_event = SSEMessageEvent(
            type="regeneration_progress",
            message_id=task.message_id,
            session_id=task.session_id,
            data={
                "taskId": task.id,
                "progress": progress,
                "message": message,
                "partialContent": generated_content if progress == 100 else ""
            }
        )

        await broadcaster.broadcast_event(task.session_id, {
            "type": "regeneration_progress",
            "data": progress_event.model_dump()
        })

        # Simulate processing time
        await asyncio.sleep(1)

    # Update the actual message in session store
    session_data = session_store.get_session(task.session_id)
    if session_data:
        messages = session_data.get("messages", [])
        message = next(
            (msg for msg in messages if msg["id"] == task.message_id),
            None
        )

        if message:
            message["content"] = generated_content
            message["metadata"] = message.get("metadata", {})
            message["metadata"]["regenerating"] = False
            message["metadata"]["regenerated"] = True
            message["metadata"]["regeneration_task_id"] = task.id
            message["timestamp"] = datetime.utcnow().isoformat()

    # Mark task as completed
    task.status = "completed"
    task.completed_at = datetime.utcnow()

    # Broadcast completion
    complete_event = SSEMessageEvent(
        type="message_regenerated",
        message_id=task.message_id,
        session_id=task.session_id,
        data={
            "taskId": task.id,
            "content": generated_content,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

    await broadcaster.broadcast_event(task.session_id, {
        "type": "message_regenerated",
        "data": complete_event.model_dump()
    })


@router.put("/{message_id}")
async def edit_message(
    message_id: str,
    edit_request: MessageEditRequest,
    request: Request,
    current_user: User = Depends(current_active_user_dep)
) -> MessageOperationResponse:
    """
    Edit a message's content.

    If editing a user message and trigger_regeneration is True,
    this will also trigger regeneration of subsequent assistant responses.

    Args:
        message_id: ID of the message to edit
        edit_request: Edit request with new content
        current_user: Current authenticated user

    Returns:
        Operation response confirming the edit
    """
    client_ip, user_agent = await get_client_info(request)

    # Extract session_id from message_id
    try:
        session_id = message_id.split("_")[2] if "_" in message_id else None
        if not session_id:
            raise HTTPException(status_code=400, detail="Invalid message ID format")
    except (IndexError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid message ID format")

    # Validate access
    validation_result = await validate_message_access(
        session_id, message_id, current_user, client_ip, user_agent
    )
    session_data = validation_result["session"]
    message = validation_result["message"]

    # Store original content for history
    original_content = message.get("content", "")
    history_id = f"hist_{uuid.uuid4()}"

    if message_id not in message_history:
        message_history[message_id] = []

    message_history[message_id].append({
        "id": history_id,
        "original_content": original_content,
        "edited_content": edit_request.content,
        "edit_timestamp": datetime.utcnow().isoformat(),
        "user_id": current_user.id if current_user else None
    })

    # Update message content
    message["content"] = edit_request.content
    message["metadata"] = message.get("metadata", {})
    message["metadata"]["edited"] = True
    message["metadata"]["edit_history"] = [h["id"] for h in message_history[message_id]]
    message["timestamp"] = datetime.utcnow().isoformat()

    # Update session
    session_store.update_session(session_id, status="edited")

    # Broadcast edit event
    broadcaster = get_sse_broadcaster()
    edit_event = SSEMessageEvent(
        type="message_edited",
        message_id=message_id,
        session_id=session_id,
        data={
            "content": edit_request.content,
            "previousContent": original_content,
            "edited": True
        }
    )

    await broadcaster.broadcast_event(session_id, {
        "type": "message_edited",
        "data": edit_event.model_dump()
    })

    # If this is a user message and regeneration is requested, trigger it
    should_regenerate = (
        message.get("role") == "user" and
        edit_request.trigger_regeneration
    )

    regeneration_task_id = None
    if should_regenerate:
        # Find the next assistant message to regenerate
        messages = session_data.get("messages", [])
        message_index = next(
            (i for i, msg in enumerate(messages) if msg["id"] == message_id), -1
        )

        if message_index >= 0 and message_index < len(messages) - 1:
            # Look for next assistant message
            for i in range(message_index + 1, len(messages)):
                if messages[i].get("role") == "assistant":
                    assistant_message = messages[i]

                    # Trigger regeneration
                    regen_request = MessageRegenerateRequest()
                    regeneration_task_id = f"regen_{uuid.uuid4()}"
                    task = RegenerationTask(
                        id=regeneration_task_id,
                        message_id=assistant_message["id"],
                        session_id=session_id,
                        original_message_id=message_id,
                        context={"triggered_by_edit": True},
                        status="pending"
                    )
                    regeneration_tasks[regeneration_task_id] = task

                    # Start regeneration
                    asyncio.create_task(
                        _perform_regeneration(regeneration_task_id, edit_request.content, regen_request)
                    )
                    break

    logger.info(f"Message edited: {message_id} by user {current_user.id if current_user else 'anonymous'}")

    return MessageOperationResponse(
        success=True,
        message_id=message_id,
        session_id=session_id,
        operation="edit",
        data={
            "original_content": original_content,
            "new_content": edit_request.content,
            "triggered_regeneration": should_regenerate,
            "regeneration_task_id": regeneration_task_id
        }
    )


@router.delete("/{message_id}")
async def delete_message(
    message_id: str,
    request: Request,
    current_user: User = Depends(current_active_user_dep)
) -> MessageOperationResponse:
    """
    Delete a message and all subsequent messages in the conversation.

    This ensures conversation consistency by removing any responses
    that were based on the deleted message.

    Args:
        message_id: ID of the message to delete
        current_user: Current authenticated user

    Returns:
        Operation response confirming the deletion
    """
    client_ip, user_agent = await get_client_info(request)

    # Extract session_id from message_id
    try:
        session_id = message_id.split("_")[2] if "_" in message_id else None
        if not session_id:
            raise HTTPException(status_code=400, detail="Invalid message ID format")
    except (IndexError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid message ID format")

    # Validate access
    validation_result = await validate_message_access(
        session_id, message_id, current_user, client_ip, user_agent
    )
    session_data = validation_result["session"]
    message = validation_result["message"]

    # Find message index
    messages = session_data.get("messages", [])
    message_index = next(
        (i for i, msg in enumerate(messages) if msg["id"] == message_id), -1
    )

    if message_index == -1:
        raise HTTPException(status_code=404, detail="Message not found")

    # Store deleted messages for potential recovery
    deleted_messages = messages[message_index:]
    deleted_count = len(deleted_messages)

    # Remove message and all subsequent messages
    messages = messages[:message_index]

    # Update session data
    session_data["messages"] = messages
    session_store.update_session(session_id, status="message_deleted")

    # Broadcast deletion event
    broadcaster = get_sse_broadcaster()
    delete_event = SSEMessageEvent(
        type="message_deleted",
        message_id=message_id,
        session_id=session_id,
        data={
            "deletedCount": deleted_count,
            "deletedMessageIds": [msg["id"] for msg in deleted_messages]
        }
    )

    await broadcaster.broadcast_event(session_id, {
        "type": "message_deleted",
        "data": delete_event.model_dump()
    })

    logger.info(
        f"Message deleted: {message_id} (and {deleted_count-1} subsequent messages) "
        f"by user {current_user.id if current_user else 'anonymous'}"
    )

    return MessageOperationResponse(
        success=True,
        message_id=message_id,
        session_id=session_id,
        operation="delete",
        data={
            "deleted_count": deleted_count,
            "deleted_message_ids": [msg["id"] for msg in deleted_messages]
        }
    )


@router.post("/{message_id}/feedback")
async def submit_message_feedback(
    message_id: str,
    feedback_request: MessageFeedbackRequest,
    request: Request,
    current_user: User = Depends(current_active_user_dep)
) -> MessageFeedbackResponse:
    """
    Submit feedback (upvote/downvote) for a message.

    Args:
        message_id: ID of the message to provide feedback for
        feedback_request: Feedback data
        current_user: Current authenticated user

    Returns:
        Feedback response confirming the submission
    """
    client_ip, user_agent = await get_client_info(request)

    # Extract session_id from message_id
    try:
        session_id = message_id.split("_")[2] if "_" in message_id else None
        if not session_id:
            raise HTTPException(status_code=400, detail="Invalid message ID format")
    except (IndexError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid message ID format")

    # Validate access (light validation for feedback)
    session_data = session_store.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")

    # Find the message
    message = next(
        (msg for msg in session_data.get("messages", []) if msg["id"] == message_id),
        None
    )

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Create feedback record
    feedback_id = f"fb_{uuid.uuid4()}"
    feedback_record = {
        "id": feedback_id,
        "message_id": message_id,
        "session_id": session_id,
        "user_id": current_user.id if current_user else None,
        "feedback_type": feedback_request.feedback_type,
        "reason": feedback_request.reason,
        "metadata": feedback_request.metadata,
        "created_at": datetime.utcnow().isoformat(),
        "client_ip": client_ip,
        "user_agent": user_agent
    }

    # Store feedback
    if message_id not in feedback_store:
        feedback_store[message_id] = {}

    feedback_store[message_id][feedback_id] = feedback_record

    # Update message metadata to include feedback count
    message_feedback = feedback_store.get(message_id, {})
    upvotes = sum(1 for fb in message_feedback.values() if fb["feedback_type"] == "upvote")
    downvotes = sum(1 for fb in message_feedback.values() if fb["feedback_type"] == "downvote")

    message["metadata"] = message.get("metadata", {})
    message["metadata"]["feedback"] = {
        "upvotes": upvotes,
        "downvotes": downvotes,
        "total": upvotes + downvotes
    }

    logger.info(
        f"Feedback submitted: {feedback_request.feedback_type} for message {message_id} "
        f"by user {current_user.id if current_user else 'anonymous'}"
    )

    return MessageFeedbackResponse(
        success=True,
        feedback_id=feedback_id,
        message_id=message_id,
        session_id=session_id
    )


@router.get("/{message_id}/feedback")
async def get_message_feedback(
    message_id: str,
    current_user: User = Depends(current_active_user_dep)
) -> dict[str, Any]:
    """
    Get feedback statistics for a message.

    Args:
        message_id: ID of the message
        current_user: Current authenticated user

    Returns:
        Feedback statistics and recent feedback entries
    """
    feedback_data = feedback_store.get(message_id, {})

    upvotes = sum(1 for fb in feedback_data.values() if fb["feedback_type"] == "upvote")
    downvotes = sum(1 for fb in feedback_data.values() if fb["feedback_type"] == "downvote")

    return {
        "message_id": message_id,
        "feedback_summary": {
            "upvotes": upvotes,
            "downvotes": downvotes,
            "total": upvotes + downvotes
        },
        "recent_feedback": list(feedback_data.values())[-10:],  # Last 10 feedback entries
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/{message_id}/history")
async def get_message_history(
    message_id: str,
    current_user: User = Depends(current_active_user_dep)
) -> dict[str, Any]:
    """
    Get edit history for a message.

    Args:
        message_id: ID of the message
        current_user: Current authenticated user

    Returns:
        Edit history for the message
    """
    history = message_history.get(message_id, [])

    return {
        "message_id": message_id,
        "edit_count": len(history),
        "history": history,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/tasks/{task_id}/status")
async def get_regeneration_task_status(
    task_id: str,
    current_user: User = Depends(current_active_user_dep)
) -> dict[str, Any]:
    """
    Get status of a regeneration task.

    Args:
        task_id: ID of the regeneration task
        current_user: Current authenticated user

    Returns:
        Task status and progress information
    """
    task = regeneration_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "task_id": task_id,
        "status": task.status,
        "progress": task.progress,
        "message_id": task.message_id,
        "session_id": task.session_id,
        "created_at": task.created_at.isoformat(),
        "started_at": task.started_at.isoformat() if task.started_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "error_message": task.error_message,
        "timestamp": datetime.utcnow().isoformat()
    }