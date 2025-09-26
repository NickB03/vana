#!/usr/bin/env python3
"""
SSE Event specifications and utilities for chat action buttons.

This module defines standardized SSE event types and utilities for
real-time communication with the frontend during chat operations.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict

from app.models.chat_models import SSEMessageEvent


class ChatEventType(str, Enum):
    """Standardized SSE event types for chat operations."""

    # Message regeneration events
    MESSAGE_REGENERATING = "message_regenerating"
    REGENERATION_PROGRESS = "regeneration_progress"
    MESSAGE_REGENERATED = "message_regenerated"
    REGENERATION_ERROR = "regeneration_error"

    # Message editing events
    MESSAGE_EDITED = "message_edited"
    MESSAGE_EDIT_ERROR = "message_edit_error"

    # Message deletion events
    MESSAGE_DELETED = "message_deleted"
    MESSAGE_DELETE_ERROR = "message_delete_error"

    # Feedback events
    FEEDBACK_SUBMITTED = "feedback_submitted"
    FEEDBACK_ERROR = "feedback_error"

    # Thought process events (for advanced AI interactions)
    THOUGHT_PROCESS_START = "thought_process_start"
    THOUGHT_PROCESS_STEP = "thought_process_step"
    THOUGHT_PROCESS_COMPLETE = "thought_process_complete"

    # System events
    SESSION_UPDATED = "session_updated"
    CONNECTION_STATUS = "connection_status"
    ERROR = "error"


class SSEEventBuilder:
    """Builder class for creating standardized SSE events."""

    @staticmethod
    def message_regeneration_started(
        message_id: str,
        session_id: str,
        task_id: str,
        original_message_id: str,
        user_query: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a message regeneration started event."""
        return {
            "type": ChatEventType.MESSAGE_REGENERATING,
            "data": {
                "messageId": message_id,
                "sessionId": session_id,
                "taskId": task_id,
                "originalMessageId": original_message_id,
                "userQuery": user_query,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def regeneration_progress(
        message_id: str,
        session_id: str,
        task_id: str,
        progress: float,
        message: str,
        partial_content: str = "",
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a regeneration progress event."""
        return {
            "type": ChatEventType.REGENERATION_PROGRESS,
            "data": {
                "messageId": message_id,
                "sessionId": session_id,
                "taskId": task_id,
                "progress": progress,
                "message": message,
                "partialContent": partial_content,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def message_regenerated(
        message_id: str,
        session_id: str,
        task_id: str,
        content: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a message regenerated event."""
        return {
            "type": ChatEventType.MESSAGE_REGENERATED,
            "data": {
                "messageId": message_id,
                "sessionId": session_id,
                "taskId": task_id,
                "content": content,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def regeneration_error(
        message_id: str,
        session_id: str,
        task_id: str,
        error: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a regeneration error event."""
        return {
            "type": ChatEventType.REGENERATION_ERROR,
            "data": {
                "messageId": message_id,
                "sessionId": session_id,
                "taskId": task_id,
                "error": error,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def message_edited(
        message_id: str,
        session_id: str,
        content: str,
        previous_content: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a message edited event."""
        return {
            "type": ChatEventType.MESSAGE_EDITED,
            "data": {
                "messageId": message_id,
                "sessionId": session_id,
                "content": content,
                "previousContent": previous_content,
                "edited": True,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def message_deleted(
        message_id: str,
        session_id: str,
        deleted_count: int,
        deleted_message_ids: list[str],
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a message deleted event."""
        return {
            "type": ChatEventType.MESSAGE_DELETED,
            "data": {
                "messageId": message_id,
                "sessionId": session_id,
                "deletedCount": deleted_count,
                "deletedMessageIds": deleted_message_ids,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def feedback_submitted(
        message_id: str,
        session_id: str,
        feedback_id: str,
        feedback_type: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a feedback submitted event."""
        return {
            "type": ChatEventType.FEEDBACK_SUBMITTED,
            "data": {
                "messageId": message_id,
                "sessionId": session_id,
                "feedbackId": feedback_id,
                "feedbackType": feedback_type,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def thought_process_start(
        message_id: str,
        session_id: str,
        task_id: str,
        thinking_about: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a thought process start event."""
        return {
            "type": ChatEventType.THOUGHT_PROCESS_START,
            "data": {
                "messageId": message_id,
                "sessionId": session_id,
                "taskId": task_id,
                "thinkingAbout": thinking_about,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def thought_process_step(
        message_id: str,
        session_id: str,
        task_id: str,
        step: str,
        reasoning: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a thought process step event."""
        return {
            "type": ChatEventType.THOUGHT_PROCESS_STEP,
            "data": {
                "messageId": message_id,
                "sessionId": session_id,
                "taskId": task_id,
                "step": step,
                "reasoning": reasoning,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def session_updated(
        session_id: str,
        status: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a session updated event."""
        return {
            "type": ChatEventType.SESSION_UPDATED,
            "data": {
                "sessionId": session_id,
                "status": status,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def connection_status(
        session_id: str,
        status: str,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create a connection status event."""
        return {
            "type": ChatEventType.CONNECTION_STATUS,
            "data": {
                "sessionId": session_id,
                "status": status,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }

    @staticmethod
    def error(
        session_id: str,
        error_message: str,
        error_code: str | None = None,
        **kwargs: Any
    ) -> Dict[str, Any]:
        """Create an error event."""
        return {
            "type": ChatEventType.ERROR,
            "data": {
                "sessionId": session_id,
                "error": error_message,
                "errorCode": error_code,
                "timestamp": datetime.utcnow().isoformat(),
                **kwargs
            }
        }


class ThoughtProcessTracker:
    """Helper class for tracking and broadcasting AI thought processes."""

    def __init__(self, message_id: str, session_id: str, task_id: str, broadcaster):
        self.message_id = message_id
        self.session_id = session_id
        self.task_id = task_id
        self.broadcaster = broadcaster
        self.steps: list[str] = []

    async def start_thinking(self, thinking_about: str) -> None:
        """Start a thought process."""
        event = SSEEventBuilder.thought_process_start(
            self.message_id,
            self.session_id,
            self.task_id,
            thinking_about
        )

        await self.broadcaster.broadcast_event(self.session_id, event)

    async def add_step(self, step: str, reasoning: str) -> None:
        """Add a thought process step."""
        self.steps.append(step)

        event = SSEEventBuilder.thought_process_step(
            self.message_id,
            self.session_id,
            self.task_id,
            step,
            reasoning
        )

        await self.broadcaster.broadcast_event(self.session_id, event)

    async def complete_thinking(self, conclusion: str) -> None:
        """Complete the thought process."""
        event = {
            "type": ChatEventType.THOUGHT_PROCESS_COMPLETE,
            "data": {
                "messageId": self.message_id,
                "sessionId": self.session_id,
                "taskId": self.task_id,
                "conclusion": conclusion,
                "totalSteps": len(self.steps),
                "steps": self.steps,
                "timestamp": datetime.utcnow().isoformat()
            }
        }

        await self.broadcaster.broadcast_event(self.session_id, event)


class ProgressTracker:
    """Helper class for tracking and broadcasting operation progress."""

    def __init__(self, message_id: str, session_id: str, task_id: str, broadcaster):
        self.message_id = message_id
        self.session_id = session_id
        self.task_id = task_id
        self.broadcaster = broadcaster
        self.current_progress = 0.0

    async def update_progress(
        self,
        progress: float,
        message: str,
        partial_content: str = ""
    ) -> None:
        """Update progress and broadcast event."""
        self.current_progress = progress

        event = SSEEventBuilder.regeneration_progress(
            self.message_id,
            self.session_id,
            self.task_id,
            progress,
            message,
            partial_content
        )

        await self.broadcaster.broadcast_event(self.session_id, event)

    async def complete(self, final_content: str) -> None:
        """Mark progress as complete."""
        event = SSEEventBuilder.message_regenerated(
            self.message_id,
            self.session_id,
            self.task_id,
            final_content
        )

        await self.broadcaster.broadcast_event(self.session_id, event)

    async def error(self, error_message: str) -> None:
        """Report an error in progress."""
        event = SSEEventBuilder.regeneration_error(
            self.message_id,
            self.session_id,
            self.task_id,
            error_message
        )

        await self.broadcaster.broadcast_event(self.session_id, event)


def format_sse_event(event_type: str, data: Dict[str, Any]) -> str:
    """Format a dictionary as an SSE event string."""
    import json

    lines = []
    lines.append(f"event: {event_type}")
    lines.append(f"data: {json.dumps(data)}")
    lines.append("")  # Empty line to end event

    return "\n".join(lines)


def create_keepalive_event() -> str:
    """Create a keepalive SSE event."""
    return format_sse_event("keepalive", {
        "timestamp": datetime.utcnow().isoformat(),
        "type": "keepalive"
    })


# Event type mappings for frontend consumption
EVENT_TYPE_DESCRIPTIONS = {
    ChatEventType.MESSAGE_REGENERATING: "Assistant is regenerating this message",
    ChatEventType.REGENERATION_PROGRESS: "Regeneration progress update",
    ChatEventType.MESSAGE_REGENERATED: "Message has been regenerated",
    ChatEventType.REGENERATION_ERROR: "Error occurred during regeneration",
    ChatEventType.MESSAGE_EDITED: "Message content has been edited",
    ChatEventType.MESSAGE_DELETED: "Message has been deleted",
    ChatEventType.FEEDBACK_SUBMITTED: "Feedback has been submitted for this message",
    ChatEventType.THOUGHT_PROCESS_START: "AI is beginning to think about the request",
    ChatEventType.THOUGHT_PROCESS_STEP: "AI thought process step",
    ChatEventType.THOUGHT_PROCESS_COMPLETE: "AI has completed thinking",
    ChatEventType.SESSION_UPDATED: "Session status has been updated",
    ChatEventType.CONNECTION_STATUS: "Connection status changed",
    ChatEventType.ERROR: "An error occurred"
}