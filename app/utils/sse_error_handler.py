"""
SSE Stream Error Handling and Recovery System.

This module provides robust error handling for Server-Sent Events (SSE) streams,
particularly for ADK integration with Gemini API. It addresses the critical problem
of Gemini 503 "model overloaded" errors that occur INSIDE the ADK service and
terminate SSE streams abruptly without proper error events.

Architecture:
    ┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
    │  Frontend   │◄───────►│  StreamWrapper   │◄───────►│  ADK (8080) │
    │  (SSE)      │   SSE   │  + ErrorHandler  │   HTTP  │  ↓ Gemini   │
    └─────────────┘         └──────────────────┘         └─────────────┘
                                  │
                                  ↓
                        Stream State Tracker
                        Error Normalizer
                        Retry Controller
                        Telemetry Logger

Key Features:
- Detects stream termination without completion marker
- Tracks content received during stream
- Normalizes malformed error JSON
- Implements exponential backoff for 503 errors
- Provides telemetry for error patterns
- Sends user-friendly error messages to frontend

Free-tier Constraints:
- Gemini API: 8 RPM / 2 concurrent requests (via rate_limiter)
- Must handle 503 "model overloaded" gracefully
- Distinguish "no response" vs "partial response then failed"
"""

import asyncio
import hashlib
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, AsyncGenerator, Optional

import httpx

from app.utils.rate_limiter import ExponentialBackoff

logger = logging.getLogger(__name__)


# ============================================================================
# STREAM STATE TRACKING
# ============================================================================


class StreamState(str, Enum):
    """SSE stream lifecycle states."""

    INITIALIZING = "initializing"  # Stream starting
    CONNECTED = "connected"  # Connection established
    RECEIVING = "receiving"  # Data flowing
    COMPLETED = "completed"  # Normal completion with done marker
    ERROR = "error"  # Error state
    TERMINATED = "terminated"  # Abnormal termination without completion


@dataclass
class StreamMetrics:
    """Track stream health and content metrics."""

    session_id: str
    start_time: float = field(default_factory=lambda: datetime.now().timestamp())
    state: StreamState = StreamState.INITIALIZING
    content_received: bool = False
    total_events: int = 0
    content_events: int = 0
    error_events: int = 0
    last_event_time: Optional[float] = None
    completion_marker_received: bool = False
    error_details: Optional[dict[str, Any]] = None
    content_hashes: set[str] = field(default_factory=set)

    def record_event(self, event_type: str, has_content: bool = False) -> None:
        """Record an event and update metrics."""
        self.total_events += 1
        self.last_event_time = datetime.now().timestamp()

        if has_content:
            self.content_received = True
            self.content_events += 1
            if self.state == StreamState.CONNECTED:
                self.state = StreamState.RECEIVING

        if event_type == "error":
            self.error_events += 1

    def mark_completed(self) -> None:
        """Mark stream as successfully completed."""
        self.completion_marker_received = True
        self.state = StreamState.COMPLETED

    def mark_error(self, error_details: dict[str, Any]) -> None:
        """Mark stream as errored."""
        self.state = StreamState.ERROR
        self.error_details = error_details

    def mark_terminated(self) -> None:
        """Mark stream as abnormally terminated."""
        if self.state not in [StreamState.COMPLETED, StreamState.ERROR]:
            self.state = StreamState.TERMINATED

    def get_duration(self) -> float:
        """Get stream duration in seconds."""
        if self.last_event_time:
            return self.last_event_time - self.start_time
        return datetime.now().timestamp() - self.start_time

    def to_dict(self) -> dict[str, Any]:
        """Convert metrics to dictionary for logging."""
        return {
            "session_id": self.session_id,
            "state": self.state.value,
            "duration_seconds": round(self.get_duration(), 2),
            "content_received": self.content_received,
            "total_events": self.total_events,
            "content_events": self.content_events,
            "error_events": self.error_events,
            "completion_marker_received": self.completion_marker_received,
            "error_details": self.error_details,
        }


# ============================================================================
# ERROR DETECTION AND NORMALIZATION
# ============================================================================


@dataclass
class StreamError:
    """Normalized stream error."""

    code: int
    message: str
    user_friendly_message: str
    retry_after: Optional[int] = None
    is_transient: bool = False
    original_error: Optional[str] = None
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())

    def to_sse_event(self, invocation_id: Optional[str] = None) -> str:
        """Convert to SSE error event format."""
        error_payload = {
            "error": {
                "code": self.code,
                "message": self.user_friendly_message,
                "user_friendly": True,
                "retry_after": self.retry_after,
                "is_transient": self.is_transient,
            },
            "invocationId": invocation_id,
            "timestamp": self.timestamp,
        }

        if self.original_error and logger.isEnabledFor(logging.DEBUG):
            error_payload["error"]["original"] = self.original_error

        return f"data: {json.dumps(error_payload)}\n\n"


class ErrorDetector:
    """Detect and classify errors from SSE stream events."""

    @staticmethod
    def detect_503_error(error_msg: str) -> bool:
        """Detect 503 'model overloaded' errors."""
        if not isinstance(error_msg, str):
            return False

        error_lower = error_msg.lower()
        return any(
            pattern in error_lower
            for pattern in ["503", "overloaded", "unavailable", "server error"]
        )

    @staticmethod
    def detect_429_error(error_msg: str) -> bool:
        """Detect 429 rate limit errors."""
        if not isinstance(error_msg, str):
            return False

        error_lower = error_msg.lower()
        return any(
            pattern in error_lower
            for pattern in ["429", "rate limit", "too many requests", "quota exceeded"]
        )

    @staticmethod
    def detect_timeout_error(error_msg: str) -> bool:
        """Detect timeout errors."""
        if not isinstance(error_msg, str):
            return False

        error_lower = error_msg.lower()
        return any(pattern in error_lower for pattern in ["timeout", "timed out"])

    @staticmethod
    def normalize_error(error_data: dict[str, Any]) -> Optional[StreamError]:
        """
        Normalize error event data into StreamError.

        Args:
            error_data: Raw error data from SSE event

        Returns:
            StreamError if error detected, None otherwise
        """
        error_msg = error_data.get("error")
        if not error_msg:
            return None

        # Convert to string if needed
        if isinstance(error_msg, dict):
            error_msg = json.dumps(error_msg)
        elif not isinstance(error_msg, str):
            error_msg = str(error_msg)

        # Detect error type and normalize
        if ErrorDetector.detect_503_error(error_msg):
            return StreamError(
                code=503,
                message="Service temporarily unavailable",
                user_friendly_message=(
                    "AI model is temporarily busy. This is a free-tier demo project - "
                    "please wait a moment and try again."
                ),
                retry_after=10,
                is_transient=True,
                original_error=error_msg,
            )

        if ErrorDetector.detect_429_error(error_msg):
            return StreamError(
                code=429,
                message="Rate limit exceeded",
                user_friendly_message=(
                    "Rate limit reached. Please wait a moment before trying again."
                ),
                retry_after=30,
                is_transient=True,
                original_error=error_msg,
            )

        if ErrorDetector.detect_timeout_error(error_msg):
            return StreamError(
                code=504,
                message="Request timeout",
                user_friendly_message=(
                    "Request took too long to complete. Please try again with a simpler query."
                ),
                retry_after=5,
                is_transient=False,
                original_error=error_msg,
            )

        # Generic error
        return StreamError(
            code=500,
            message="Internal server error",
            user_friendly_message=(
                "An error occurred while processing your request. Please try again."
            ),
            retry_after=None,
            is_transient=False,
            original_error=error_msg,
        )


# ============================================================================
# RETRY CONTROLLER
# ============================================================================


@dataclass
class RetryConfig:
    """Configuration for retry behavior."""

    max_retries: int = 2
    base_delay: float = 2.0
    max_delay: float = 30.0
    exponential_base: float = 2.0
    jitter: bool = True
    retry_on_codes: list[int] = field(default_factory=lambda: [503, 429])


class RetryController:
    """Control retry logic for transient errors."""

    def __init__(self, config: Optional[RetryConfig] = None):
        """
        Initialize retry controller.

        Args:
            config: RetryConfig instance (creates default if None)
        """
        self.config = config or RetryConfig()
        self.attempt = 0
        self.backoff = ExponentialBackoff(
            base_delay=self.config.base_delay,
            max_delay=self.config.max_delay,
            exponential_base=self.config.exponential_base,
            jitter=self.config.jitter,
        )

    def should_retry(self, error: StreamError) -> bool:
        """
        Determine if error should trigger retry.

        Args:
            error: StreamError to evaluate

        Returns:
            True if should retry, False otherwise
        """
        if self.attempt >= self.config.max_retries:
            logger.info(
                f"Max retries ({self.config.max_retries}) reached, not retrying"
            )
            return False

        if not error.is_transient:
            logger.info(f"Error {error.code} is not transient, not retrying")
            return False

        if error.code not in self.config.retry_on_codes:
            logger.info(f"Error code {error.code} not in retry list, not retrying")
            return False

        return True

    async def wait_for_retry(self) -> None:
        """Wait before retry with exponential backoff."""
        self.attempt += 1
        await self.backoff.wait()

    def reset(self) -> None:
        """Reset retry state."""
        self.attempt = 0
        self.backoff.reset()


# ============================================================================
# TELEMETRY AND LOGGING
# ============================================================================


class StreamTelemetry:
    """Centralized telemetry for stream error patterns."""

    def __init__(self):
        """Initialize telemetry tracker."""
        self.error_counts: dict[int, int] = {}
        self.retry_counts: dict[str, int] = {}
        self.stream_durations: list[float] = []
        self.content_success_rate: list[bool] = []

    def record_error(self, error_code: int) -> None:
        """Record error occurrence."""
        self.error_counts[error_code] = self.error_counts.get(error_code, 0) + 1

    def record_retry(self, session_id: str) -> None:
        """Record retry attempt."""
        self.retry_counts[session_id] = self.retry_counts.get(session_id, 0) + 1

    def record_stream(self, metrics: StreamMetrics) -> None:
        """Record stream completion metrics."""
        self.stream_durations.append(metrics.get_duration())
        self.content_success_rate.append(metrics.content_received)

    def get_stats(self) -> dict[str, Any]:
        """Get telemetry statistics."""
        total_streams = len(self.content_success_rate)
        successful_streams = sum(self.content_success_rate)

        return {
            "total_streams": total_streams,
            "successful_streams": successful_streams,
            "success_rate": (
                (successful_streams / total_streams * 100) if total_streams > 0 else 0
            ),
            "error_counts": dict(self.error_counts),
            "total_retries": sum(self.retry_counts.values()),
            "avg_stream_duration": (
                sum(self.stream_durations) / len(self.stream_durations)
                if self.stream_durations
                else 0
            ),
        }

    def log_summary(self) -> None:
        """Log telemetry summary."""
        stats = self.get_stats()
        logger.info(f"Stream telemetry summary: {json.dumps(stats, indent=2)}")


# Global telemetry instance
stream_telemetry = StreamTelemetry()


# ============================================================================
# MAIN STREAM WRAPPER
# ============================================================================


class SSEStreamWrapper:
    """
    Wraps ADK SSE streaming with robust error handling.

    This wrapper provides:
    - Stream state tracking
    - Error detection and normalization
    - Automatic retry for transient errors
    - Completion marker injection
    - Telemetry collection
    """

    def __init__(
        self,
        session_id: str,
        retry_config: Optional[RetryConfig] = None,
    ):
        """
        Initialize stream wrapper.

        Args:
            session_id: Session identifier for tracking
            retry_config: RetryConfig instance (uses defaults if None)
        """
        self.session_id = session_id
        self.metrics = StreamMetrics(session_id=session_id)
        self.retry_controller = RetryController(config=retry_config)

    async def wrap_stream(
        self, upstream_url: str, request_payload: dict[str, Any], client: httpx.AsyncClient
    ) -> AsyncGenerator[str, None]:
        """
        Wrap ADK stream with error handling.

        Args:
            upstream_url: ADK service URL
            request_payload: Request payload for ADK
            client: HTTP client for streaming

        Yields:
            SSE event lines
        """
        while True:
            try:
                # Reset metrics for new attempt
                self.metrics = StreamMetrics(session_id=self.session_id)
                self.metrics.state = StreamState.CONNECTED

                logger.info(
                    f"Starting stream for session {self.session_id} "
                    f"(attempt {self.retry_controller.attempt + 1})"
                )

                async with client.stream(
                    "POST", upstream_url, json=request_payload
                ) as response:
                    try:
                        response.raise_for_status()
                    except httpx.HTTPStatusError as e:
                        # HTTP-level error from ADK
                        error = StreamError(
                            code=e.response.status_code,
                            message=f"ADK upstream error: {e.response.status_code}",
                            user_friendly_message=(
                                f"Service error ({e.response.status_code}). "
                                "Please try again in a moment."
                            ),
                            is_transient=(500 <= e.response.status_code < 600),
                            original_error=str(e),
                        )
                        self.metrics.mark_error(error.to_dict())
                        stream_telemetry.record_error(error.code)

                        yield error.to_sse_event()

                        # Retry if transient
                        if self.retry_controller.should_retry(error):
                            stream_telemetry.record_retry(self.session_id)
                            await self.retry_controller.wait_for_retry()
                            continue
                        else:
                            break

                    # Stream SSE lines with error detection
                    async for line in response.aiter_lines():
                        # Check for data events
                        if line.startswith("data:"):
                            try:
                                json_str = line[5:].strip()
                                if json_str and json_str != "[DONE]":
                                    data = json.loads(json_str)

                                    # Check for error in event
                                    if "error" in data:
                                        normalized_error = ErrorDetector.normalize_error(
                                            data
                                        )
                                        if normalized_error:
                                            self.metrics.mark_error(
                                                normalized_error.__dict__
                                            )
                                            stream_telemetry.record_error(
                                                normalized_error.code
                                            )

                                            # Yield normalized error
                                            yield normalized_error.to_sse_event(
                                                data.get("invocationId")
                                            )

                                            # Retry if appropriate
                                            if self.retry_controller.should_retry(
                                                normalized_error
                                            ):
                                                stream_telemetry.record_retry(
                                                    self.session_id
                                                )
                                                logger.info(
                                                    f"Retrying stream for session {self.session_id} "
                                                    f"due to {normalized_error.code} error"
                                                )
                                                await self.retry_controller.wait_for_retry()
                                                # Break inner loop to retry outer loop
                                                break
                                            else:
                                                # Non-retryable error - terminate
                                                self.metrics.mark_terminated()
                                                stream_telemetry.record_stream(
                                                    self.metrics
                                                )
                                                return

                                    # Track content
                                    has_content = bool(data.get("content"))
                                    self.metrics.record_event("data", has_content)

                            except json.JSONDecodeError:
                                # Malformed JSON - log but continue
                                logger.warning(
                                    f"Malformed JSON in SSE data: {json_str[:100]}"
                                )

                        # Check for completion marker
                        if line.startswith("event: done"):
                            self.metrics.mark_completed()
                            logger.info(
                                f"Stream completed successfully for session {self.session_id}"
                            )

                        # Forward line as-is
                        yield f"{line}\n"

                    # Stream ended - check if completed properly
                    if not self.metrics.completion_marker_received:
                        # Stream terminated without completion marker
                        self.metrics.mark_terminated()
                        logger.warning(
                            f"Stream terminated without completion marker "
                            f"for session {self.session_id}. "
                            f"Metrics: {json.dumps(self.metrics.to_dict())}"
                        )

                        # Create termination error
                        termination_error = StreamError(
                            code=500,
                            message="Stream terminated unexpectedly",
                            user_friendly_message=(
                                "Connection was interrupted. "
                                + (
                                    "Partial response received."
                                    if self.metrics.content_received
                                    else "No response received before interruption."
                                )
                                + " Please try again."
                            ),
                            is_transient=True,
                            original_error="Stream ended without completion marker",
                        )

                        # Retry if appropriate
                        if self.retry_controller.should_retry(termination_error):
                            stream_telemetry.record_retry(self.session_id)
                            logger.info(
                                f"Retrying stream for session {self.session_id} "
                                "due to unexpected termination"
                            )
                            await self.retry_controller.wait_for_retry()
                            continue
                        else:
                            # Send error event to client
                            yield termination_error.to_sse_event()

                    # Success - record metrics and exit
                    stream_telemetry.record_stream(self.metrics)
                    self.retry_controller.reset()
                    break

            except httpx.TimeoutException:
                timeout_error = StreamError(
                    code=504,
                    message="Request timeout",
                    user_friendly_message=(
                        "Request took too long to complete. Please try again."
                    ),
                    is_transient=False,
                    original_error="HTTP timeout",
                )
                self.metrics.mark_error(timeout_error.__dict__)
                stream_telemetry.record_error(timeout_error.code)
                yield timeout_error.to_sse_event()
                break

            except Exception as e:
                generic_error = StreamError(
                    code=500,
                    message="Stream error",
                    user_friendly_message="An unexpected error occurred. Please try again.",
                    is_transient=False,
                    original_error=str(e),
                )
                self.metrics.mark_error(generic_error.__dict__)
                stream_telemetry.record_error(generic_error.code)
                logger.exception(
                    f"Unexpected error in stream for session {self.session_id}: {e}"
                )
                yield generic_error.to_sse_event()
                break

        # Send final completion marker if not already sent
        if not self.metrics.completion_marker_received:
            completion_event = {
                "status": "completed",
                "timestamp": datetime.now().isoformat(),
            }
            yield "event: done\n"
            yield f"data: {json.dumps(completion_event)}\n\n"

        # Log final metrics
        logger.info(
            f"Stream ended for session {self.session_id}. "
            f"Final metrics: {json.dumps(self.metrics.to_dict())}"
        )


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================


def get_stream_telemetry_stats() -> dict[str, Any]:
    """
    Get global stream telemetry statistics.

    Returns:
        Dictionary with telemetry stats
    """
    return stream_telemetry.get_stats()


def log_stream_telemetry_summary() -> None:
    """Log summary of stream telemetry."""
    stream_telemetry.log_summary()
