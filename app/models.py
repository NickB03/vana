#!/usr/bin/env python3
"""
Data models and Pydantic schemas for the Vana research agent system.

This module defines the core data structures used throughout the application,
including request/response models, session management, and type definitions.
"""

# Load environment variables FIRST before any other imports
import os

from dotenv import load_dotenv

# Get the project root directory and load .env.local
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(project_root, ".env.local")

# Try to load .env.local first, fall back to .env if not found
if os.path.exists(env_path):
    load_dotenv(env_path)
    print(f"✅ Loaded environment from {env_path}")
else:
    # Try standard .env as fallback
    fallback_env = os.path.join(project_root, ".env")
    if os.path.exists(fallback_env):
        load_dotenv(fallback_env)
        print(f"✅ Loaded environment from {fallback_env}")
    else:
        print("⚠️ No .env.local or .env file found, using environment variables only")

# Now import everything else
from datetime import datetime
from typing import Any, Union

from pydantic import BaseModel, Field, field_validator


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


class HealthResponse(BaseModel):
    """Health check response model."""

    status: str = Field("healthy", description="Health status")
    timestamp: str = Field(..., description="Check timestamp")
    service: str = Field("vana", description="Service name")
    version: str = Field("1.0.0", description="API version")
    environment: EnvironmentInfo = Field(..., description="Environment information")
    session_storage_enabled: bool | None = Field(
        None, description="Session storage availability"
    )
    session_storage_uri: str | None = Field(None, description="Session storage URI")
    session_storage_bucket: str | None = Field(
        None, description="Session storage bucket"
    )
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


# Type aliases for common data structures
JSONData = dict[str, Any]
QueryData = Union[str, dict[str, Any]]
ResponseData = Union[dict[str, Any], list[Any], str, int, float, bool]
ModelType = str  # Model type alias for AI models
HealthResponseData = dict[str, Union[str, bool, int, float, EnvironmentInfo, None]]

# Model constants
CRITIC_MODEL = "gemini-2.5-pro-latest"
WORKER_MODEL = "gemini-2.5-flash-latest"

# Constants
DEFAULT_SESSION_TIMEOUT = 3600  # 1 hour
MAX_QUERY_LENGTH = 2000
MAX_SESSIONS_PER_USER = 10
