# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Type definitions and data models for Vana application.

This module provides Pydantic data models and type definitions used throughout
the Vana application for request/response handling, data validation, and
API documentation. All models include proper validation, serialization
support, and comprehensive field documentation.

Key Models:
    - Request: Chat request data with optional configuration
    - Feedback: User feedback collection with structured logging

Features:
    - Automatic UUID generation for user and session IDs
    - Optional Google ADK and GenAI dependency handling
    - JSON serialization support with arbitrary types
    - Comprehensive field validation and documentation
    - Integration with FastAPI automatic API documentation

Dependencies:
    The module gracefully handles optional Google ADK and GenAI dependencies
    using fallback type imports when packages are not available.
"""

import uuid
from typing import (
    Literal,
)

# Optional Google GenAI and ADK dependencies are imported lazily so that this
# module can be used in environments where those packages aren't installed.
try:  # pragma: no cover
    from google.adk.events.event import Event  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    from typing import Any as Event  # type: ignore

try:  # pragma: no cover
    from google.genai.types import Content  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    from typing import Any as Content  # type: ignore
from pydantic import (
    BaseModel,
    Field,
)


class Request(BaseModel):
    """Pydantic model for chat request data with optional configuration.

    Represents a complete chat request including the message content, event history,
    and session tracking information. Automatically generates UUIDs for user and
    session identification when not provided.

    Attributes:
        message: The chat message content (Google GenAI Content type)
        events: List of previous events in the conversation history
        user_id: Unique identifier for the user (auto-generated UUID if not provided)
        session_id: Unique identifier for the chat session (auto-generated UUID if not provided)

    Configuration:
        - Allows extra fields for future extensibility
        - Supports arbitrary types for Google ADK integration
        - Automatic JSON serialization for API responses

    Example:
        >>> # Basic request with auto-generated IDs
        >>> request = Request(
        ...     message=content_object,
        ...     events=[]
        ... )
        >>> print(request.user_id)  # Auto-generated UUID
        >>>
        >>> # Request with specific IDs
        >>> request = Request(
        ...     message=content_object,
        ...     events=event_list,
        ...     user_id="user_123",
        ...     session_id="session_abc"
        ... )
    """

    message: Content
    events: list[Event]
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))

    model_config = {"extra": "allow", "arbitrary_types_allowed": True}


class Feedback(BaseModel):
    """Pydantic model for structured user feedback collection.

    Represents user feedback on conversation quality with structured logging
    support for analytics and improvement tracking. Includes scoring,
    optional text feedback, and metadata for proper categorization.

    Attributes:
        score: Numerical feedback score (integer or float)
        text: Optional text feedback from user (empty string if not provided)
        invocation_id: Unique identifier for the conversation being rated
        log_type: Fixed value \"feedback\" for log categorization
        service_name: Fixed value \"vana\" for service identification
        user_id: Identifier for the user providing feedback (empty string if not provided)

    Logging Integration:
        This model is designed for structured logging systems that categorize
        feedback data for analytics, quality monitoring, and improvement tracking.

    Example:
        >>> # Basic feedback with score only
        >>> feedback = Feedback(
        ...     score=5,
        ...     invocation_id="conv_123"
        ... )
        >>>
        >>> # Detailed feedback with text
        >>> feedback = Feedback(
        ...     score=4.5,
        ...     text="Great response, very helpful!",
        ...     invocation_id="conv_456",
        ...     user_id="user_789"
        ... )
        >>>
        >>> # Feedback data ready for logging
        >>> log_data = feedback.model_dump()
        >>> print(log_data[\"log_type\"])  # \"feedback\"
        >>> print(log_data[\"service_name\"])  # \"vana\"
    """

    score: int | float
    text: str | None = ""
    invocation_id: str
    log_type: Literal["feedback"] = "feedback"
    service_name: Literal["vana"] = "vana"
    user_id: str = ""
