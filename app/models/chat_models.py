#!/usr/bin/env python3
"""
Chat-specific data models and Pydantic schemas for the Vana chat system.

This module defines data structures for chat action buttons, message operations,
and feedback systems that extend the core models.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class MessageRegenerateRequest(BaseModel):
    """Request model for regenerating assistant messages."""

    context: str | None = Field(None, description="Additional context for regeneration")
    model: str | None = Field(None, description="Specific model to use for regeneration")
    temperature: float | None = Field(
        None, description="Temperature setting for regeneration", ge=0.0, le=2.0
    )

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v):
        """Validate temperature is within acceptable range."""
        if v is not None and (v < 0.0 or v > 2.0):
            raise ValueError("Temperature must be between 0.0 and 2.0")
        return v


class MessageEditRequest(BaseModel):
    """Request model for editing message content."""

    content: str = Field(..., description="New message content", min_length=1, max_length=10000)
    trigger_regeneration: bool = Field(
        True, description="Whether to trigger assistant response regeneration after edit"
    )

    @field_validator("content")
    @classmethod
    def validate_content(cls, v):
        """Validate and clean message content."""
        if not v or not v.strip():
            raise ValueError("Content cannot be empty")
        return v.strip()


class MessageFeedbackRequest(BaseModel):
    """Request model for message feedback."""

    feedback_type: Literal["upvote", "downvote"] = Field(..., description="Type of feedback")
    reason: str | None = Field(
        None, description="Optional reason for feedback", max_length=500
    )
    metadata: dict[str, Any] | None = Field(
        None, description="Additional metadata for feedback"
    )


class MessageOperationResponse(BaseModel):
    """Response model for message operations."""

    success: bool = Field(..., description="Whether operation was successful")
    message_id: str = Field(..., description="ID of the affected message")
    session_id: str = Field(..., description="Session ID")
    operation: str = Field(..., description="Type of operation performed")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Operation timestamp")
    data: dict[str, Any] | None = Field(None, description="Additional response data")
    error: str | None = Field(None, description="Error message if operation failed")


class MessageFeedbackResponse(BaseModel):
    """Response model for message feedback operations."""

    success: bool = Field(..., description="Whether feedback was recorded successfully")
    feedback_id: str = Field(..., description="ID of the feedback record")
    message_id: str = Field(..., description="ID of the message that received feedback")
    session_id: str = Field(..., description="Session ID")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Feedback timestamp")


class SSEMessageEvent(BaseModel):
    """Model for SSE events related to message operations."""

    type: Literal[
        "message_regenerating",
        "message_regenerated",
        "message_edited",
        "message_deleted",
        "regeneration_progress",
        "regeneration_error"
    ] = Field(..., description="Event type")
    message_id: str = Field(..., description="ID of the affected message")
    session_id: str = Field(..., description="Session ID")
    data: dict[str, Any] = Field(default_factory=dict, description="Event payload")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Event timestamp")

    def to_sse_format(self) -> str:
        """Convert to SSE format string."""
        import json

        lines = []
        lines.append(f"event: {self.type}")
        lines.append(f"data: {json.dumps({
            'messageId': self.message_id,
            'sessionId': self.session_id,
            'timestamp': self.timestamp.isoformat(),
            **self.data
        })}")
        lines.append("")  # Empty line to end event

        return "\n".join(lines)


class MessageFeedback(BaseModel):
    """Model for stored message feedback."""

    id: str = Field(..., description="Unique feedback ID")
    message_id: str = Field(..., description="ID of the message")
    session_id: str = Field(..., description="Session ID")
    user_id: int | None = Field(None, description="User ID (if authenticated)")
    feedback_type: Literal["upvote", "downvote"] = Field(..., description="Type of feedback")
    reason: str | None = Field(None, description="Optional reason for feedback")
    metadata: dict[str, Any] | None = Field(None, description="Additional metadata")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Creation timestamp")
    client_ip: str | None = Field(None, description="Client IP address")
    user_agent: str | None = Field(None, description="User agent string")


class MessageHistory(BaseModel):
    """Model for message edit history."""

    id: str = Field(..., description="History entry ID")
    message_id: str = Field(..., description="ID of the message")
    original_content: str = Field(..., description="Original message content")
    edited_content: str = Field(..., description="Edited message content")
    edit_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Edit timestamp")
    user_id: int | None = Field(None, description="User who made the edit")


class RegenerationTask(BaseModel):
    """Model for tracking message regeneration tasks."""

    id: str = Field(..., description="Task ID")
    message_id: str = Field(..., description="ID of message being regenerated")
    session_id: str = Field(..., description="Session ID")
    original_message_id: str = Field(..., description="ID of the original user message")
    status: Literal["pending", "in_progress", "completed", "failed"] = Field(
        "pending", description="Task status"
    )
    progress: float = Field(0.0, description="Progress percentage (0-100)")
    error_message: str | None = Field(None, description="Error message if failed")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Task creation time")
    started_at: datetime | None = Field(None, description="Task start time")
    completed_at: datetime | None = Field(None, description="Task completion time")
    context: dict[str, Any] | None = Field(None, description="Additional context for regeneration")


# Type aliases for common data structures
MessageID = str
SessionID = str
FeedbackID = str
TaskID = str