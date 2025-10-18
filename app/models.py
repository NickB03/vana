#!/usr/bin/env python3
"""
Data models and Pydantic schemas for the Vana research agent system.

This module defines the core data structures used throughout the application,
including request/response models, session management, and type definitions.
"""

# Standard library imports
from datetime import datetime
from typing import Any, Optional, Union

from google.genai import types
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ResearchRequest(BaseModel):
    """Request model for research queries."""

    query: str = Field(
        ..., description="The research question or topic", min_length=1, max_length=2000
    )
    session_id: str | None = Field(None, description="Session ID for tracking")
    user_id: str | None = Field(None, description="User ID for attribution")
    preferences: dict[str, Any] | None = Field(
        default_factory=dict, description="User preferences"
    )

    @field_validator("query")
    @classmethod
    def validate_query(cls, v):
        """Validate and clean the research query.

        Ensures the query is not empty or whitespace-only and strips
        leading/trailing whitespace.

        Args:
            v: The query string to validate

        Returns:
            str: The cleaned query string

        Raises:
            ValueError: If the query is empty or contains only whitespace

        Example:
            >>> ResearchRequest.validate_query("  What is AI?  ")
            "What is AI?"
        """
        if not v or not v.strip():
            raise ValueError("Query cannot be empty")
        return v.strip()


class ResearchResponse(BaseModel):
    """Response model for research results."""

    session_id: str = Field(..., description="Session ID")
    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Status message")
    progress: float | None = Field(None, description="Progress percentage (0-100)")
    data: dict[str, Any] | None = Field(None, description="Response data")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Response timestamp"
    )


class SessionInfo(BaseModel):
    """Session information model."""

    session_id: str = Field(..., description="Unique session identifier")
    user_id: str | None = Field(None, description="User identifier")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Session creation time"
    )
    last_active: datetime = Field(
        default_factory=datetime.utcnow, description="Last activity time"
    )
    status: str = Field("active", description="Session status")
    query: str | None = Field(None, description="Current/last query")
    progress: float = Field(0.0, description="Progress percentage")
    results: dict[str, Any] | None = Field(None, description="Session results")


class SessionMessagePayload(BaseModel):
    """Payload for persisting chat messages to the session store.

    Messages can originate from users, assistants, or system components and are
    stored for later retrieval. All fields except ``content`` and
    ``timestamp`` are optional to support partial payloads created by legacy
    clients.
    """

    id: str | None = Field(None, description="Optional message identifier")
    role: str = Field("assistant", description="Role of the message author")
    content: str = Field(..., description="Message body")
    timestamp: datetime = Field(..., description="Message creation time")
    metadata: dict[str, Any] | None = Field(
        None, description="Additional structured metadata for the message"
    )


class ErrorResponse(BaseModel):
    """Error response model."""

    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error message")
    details: dict[str, Any] | None = Field(None, description="Additional error details")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow, description="Error timestamp"
    )


class EnvironmentInfo(BaseModel):
    """Environment information model."""

    current: str = Field(..., description="Current environment")
    source: str = Field(..., description="Environment source")
    migration_complete: bool | None = Field(
        None, description="Migration completion status"
    )
    phase: str | None = Field(None, description="Migration phase")
    conflicts: list[str] | None = Field(None, description="Environment conflicts")


class SystemMetrics(BaseModel):
    """System metrics model for health checks."""

    memory: dict[str, Any] | None = Field(None, description="Memory usage statistics")
    disk: dict[str, Any] | None = Field(None, description="Disk usage statistics")
    cpu_percent: float | None = Field(None, description="CPU usage percentage")
    load_average: tuple[float, float, float] | None = Field(
        None, description="System load average"
    )
    error: str | None = Field(None, description="Error message if metrics unavailable")


class DependencyStatus(BaseModel):
    """Dependency status model."""

    google_api_configured: bool = Field(
        ..., description="Google API configuration status"
    )
    session_storage: bool = Field(..., description="Session storage availability")
    cloud_logging: bool = Field(..., description="Cloud logging status")
    project_id: str = Field(..., description="Project ID")


class HealthResponse(BaseModel):
    """Enhanced health check response model."""

    status: str = Field("healthy", description="Health status")
    timestamp: str = Field(..., description="Check timestamp")
    service: str = Field("vana", description="Service name")
    version: str = Field("1.0.0", description="API version")
    environment: EnvironmentInfo | str = Field(
        ..., description="Environment information"
    )
    session_storage_enabled: bool | None = Field(
        None, description="Session storage availability"
    )
    session_storage_uri: str | None = Field(None, description="Session storage URI")
    session_storage_bucket: str | None = Field(
        None, description="Session storage bucket"
    )
    system_metrics: SystemMetrics | None = Field(
        None, description="System performance metrics"
    )
    dependencies: DependencyStatus | None = Field(
        None, description="Dependency status checks"
    )
    response_time_ms: float | None = Field(
        None, description="Health check response time in milliseconds"
    )
    active_chat_tasks: int | None = Field(
        None, description="Number of active chat tasks"
    )
    uptime_check: str | None = Field(None, description="Uptime status check")
    uptime: float | None = Field(None, description="Uptime in seconds")


class AgentStatus(BaseModel):
    """Agent status model."""

    agent_id: str = Field(..., description="Agent identifier")
    name: str = Field(..., description="Agent name")
    status: str = Field(..., description="Agent status")
    task: str | None = Field(None, description="Current task")
    progress: float = Field(0.0, description="Task progress")
    last_update: datetime = Field(
        default_factory=datetime.utcnow, description="Last status update"
    )


class TeamStatus(BaseModel):
    """Multi-agent team status model."""

    session_id: str = Field(..., description="Session identifier")
    team_status: str = Field(..., description="Overall team status")
    agents: list[AgentStatus] = Field(
        default_factory=list, description="Individual agent statuses"
    )
    progress: float = Field(0.0, description="Overall progress")
    current_phase: str | None = Field(None, description="Current research phase")
    estimated_completion: datetime | None = Field(
        None, description="Estimated completion time"
    )


class AuthToken(BaseModel):
    """Authentication token model."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(3600, description="Token expiration in seconds")
    refresh_token: str | None = Field(None, description="Refresh token")


class UserProfile(BaseModel):
    """User profile model."""

    user_id: str = Field(..., description="Unique user identifier")
    username: str = Field(..., description="Username")
    email: str | None = Field(None, description="User email")
    created_at: datetime = Field(
        default_factory=datetime.utcnow, description="Account creation time"
    )
    preferences: dict[str, Any] = Field(
        default_factory=dict, description="User preferences"
    )
    subscription_tier: str = Field("free", description="Subscription tier")


class RunAgentRequest(BaseModel):
    """ADK-compliant request model for running an agent with streaming support.

    This model matches the official ADK RunAgentRequest structure to ensure
    compatibility with ADK's /run_sse endpoint.

    Based on: docs/adk/refs/official-adk-python/src/google/adk/cli/adk_web_server.py

    Attributes:
        app_name: Application identifier (e.g., "vana")
        user_id: User identifier for session tracking
        session_id: Unique session identifier
        new_message: Content object containing user message parts
        streaming: Whether to enable SSE streaming (default: False)
        state_delta: Optional state changes to apply
        invocation_id: Optional ID for resuming long-running functions
    """

    model_config = ConfigDict(populate_by_name=True)

    app_name: str = Field(..., alias="appName")
    user_id: str = Field(..., alias="userId")
    session_id: str = Field(..., alias="sessionId")
    new_message: types.Content = Field(..., alias="newMessage")
    streaming: bool = False
    state_delta: Optional[dict[str, Any]] = Field(None, alias="stateDelta")
    invocation_id: Optional[str] = Field(None, alias="invocationId")


# Type aliases for common data structures
JSONData = dict[str, Any]
QueryData = Union[str, dict[str, Any]]
ResponseData = Union[dict[str, Any], list[Any], str, int, float, bool]
ModelType = str  # Model type alias for AI models
HealthResponseData = dict[str, str | bool | int | float | EnvironmentInfo | None]

# Model constants - Updated to use Gemini 2.5 Flash
CRITIC_MODEL = "gemini-2.5-flash"  # Gemini 2.5 Flash (stable)
WORKER_MODEL = "gemini-2.5-flash"  # Gemini 2.5 Flash (stable)

# Constants
DEFAULT_SESSION_TIMEOUT = 3600  # 1 hour
MAX_QUERY_LENGTH = 2000
MAX_SESSIONS_PER_USER = 10
