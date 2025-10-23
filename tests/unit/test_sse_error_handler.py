"""
Unit tests for SSE error handling system.

Tests comprehensive error handling for ADK SSE streaming including:
- Error detection and normalization
- Retry logic with exponential backoff
- Stream state tracking
- Completion marker injection
- Telemetry collection
"""

import asyncio
import json
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from app.utils.sse_error_handler import (
    ErrorDetector,
    RetryConfig,
    RetryController,
    SSEStreamWrapper,
    StreamError,
    StreamMetrics,
    StreamState,
    StreamTelemetry,
)


# ============================================================================
# ERROR DETECTION TESTS
# ============================================================================


class TestErrorDetector:
    """Test error detection and classification."""

    def test_detect_503_error_with_code(self):
        """Should detect 503 errors from error message."""
        assert ErrorDetector.detect_503_error("503 Service Unavailable")
        assert ErrorDetector.detect_503_error("Error 503: model overloaded")

    def test_detect_503_error_with_keyword(self):
        """Should detect 503 errors from keywords."""
        assert ErrorDetector.detect_503_error("model is overloaded")
        assert ErrorDetector.detect_503_error("Service unavailable")
        assert ErrorDetector.detect_503_error("Server error occurred")

    def test_detect_503_error_case_insensitive(self):
        """Should detect 503 errors case-insensitively."""
        assert ErrorDetector.detect_503_error("MODEL OVERLOADED")
        assert ErrorDetector.detect_503_error("service UNAVAILABLE")

    def test_detect_429_error(self):
        """Should detect 429 rate limit errors."""
        assert ErrorDetector.detect_429_error("429 Too Many Requests")
        assert ErrorDetector.detect_429_error("rate limit exceeded")
        assert ErrorDetector.detect_429_error("quota exceeded")

    def test_detect_timeout_error(self):
        """Should detect timeout errors."""
        assert ErrorDetector.detect_timeout_error("Request timeout")
        assert ErrorDetector.detect_timeout_error("Connection timed out")

    def test_normalize_503_error(self):
        """Should normalize 503 errors to user-friendly format."""
        error_data = {"error": "503 model overloaded"}
        normalized = ErrorDetector.normalize_error(error_data)

        assert normalized is not None
        assert normalized.code == 503
        assert normalized.is_transient is True
        assert normalized.retry_after == 10
        assert "free-tier" in normalized.user_friendly_message.lower()

    def test_normalize_429_error(self):
        """Should normalize 429 errors to user-friendly format."""
        error_data = {"error": "429 Rate limit exceeded"}
        normalized = ErrorDetector.normalize_error(error_data)

        assert normalized is not None
        assert normalized.code == 429
        assert normalized.is_transient is True
        assert normalized.retry_after == 30

    def test_normalize_timeout_error(self):
        """Should normalize timeout errors."""
        error_data = {"error": "Request timeout"}
        normalized = ErrorDetector.normalize_error(error_data)

        assert normalized is not None
        assert normalized.code == 504
        assert normalized.is_transient is False

    def test_normalize_generic_error(self):
        """Should normalize unknown errors to generic format."""
        error_data = {"error": "Something went wrong"}
        normalized = ErrorDetector.normalize_error(error_data)

        assert normalized is not None
        assert normalized.code == 500
        assert normalized.is_transient is False

    def test_normalize_error_with_dict(self):
        """Should handle error as dict."""
        error_data = {"error": {"message": "503 overloaded"}}
        normalized = ErrorDetector.normalize_error(error_data)

        assert normalized is not None
        assert normalized.code == 503

    def test_normalize_error_no_error_field(self):
        """Should return None if no error field."""
        error_data = {"status": "ok"}
        normalized = ErrorDetector.normalize_error(error_data)

        assert normalized is None


# ============================================================================
# STREAM METRICS TESTS
# ============================================================================


class TestStreamMetrics:
    """Test stream state tracking and metrics."""

    def test_initial_state(self):
        """Should initialize with correct defaults."""
        metrics = StreamMetrics(session_id="test_session")

        assert metrics.session_id == "test_session"
        assert metrics.state == StreamState.INITIALIZING
        assert metrics.content_received is False
        assert metrics.total_events == 0
        assert metrics.completion_marker_received is False

    def test_record_event_updates_metrics(self):
        """Should update metrics when recording events."""
        metrics = StreamMetrics(session_id="test")
        metrics.state = StreamState.CONNECTED

        metrics.record_event("data", has_content=True)

        assert metrics.total_events == 1
        assert metrics.content_events == 1
        assert metrics.content_received is True
        assert metrics.state == StreamState.RECEIVING

    def test_record_error_event(self):
        """Should track error events."""
        metrics = StreamMetrics(session_id="test")

        metrics.record_event("error", has_content=False)

        assert metrics.error_events == 1
        assert metrics.content_received is False

    def test_mark_completed(self):
        """Should mark stream as completed."""
        metrics = StreamMetrics(session_id="test")

        metrics.mark_completed()

        assert metrics.completion_marker_received is True
        assert metrics.state == StreamState.COMPLETED

    def test_mark_error(self):
        """Should mark stream as errored."""
        metrics = StreamMetrics(session_id="test")
        error_details = {"code": 503, "message": "overloaded"}

        metrics.mark_error(error_details)

        assert metrics.state == StreamState.ERROR
        assert metrics.error_details == error_details

    def test_mark_terminated(self):
        """Should mark stream as terminated if not already completed/errored."""
        metrics = StreamMetrics(session_id="test")

        metrics.mark_terminated()

        assert metrics.state == StreamState.TERMINATED

    def test_mark_terminated_after_completed(self):
        """Should not change state if already completed."""
        metrics = StreamMetrics(session_id="test")
        metrics.mark_completed()

        metrics.mark_terminated()

        assert metrics.state == StreamState.COMPLETED

    def test_get_duration(self):
        """Should calculate stream duration."""
        metrics = StreamMetrics(session_id="test")
        metrics.record_event("data")

        duration = metrics.get_duration()

        assert duration >= 0

    def test_to_dict(self):
        """Should serialize metrics to dict."""
        metrics = StreamMetrics(session_id="test")
        metrics.record_event("data", has_content=True)

        result = metrics.to_dict()

        assert result["session_id"] == "test"
        assert result["content_received"] is True
        assert result["total_events"] == 1
        assert "duration_seconds" in result


# ============================================================================
# RETRY CONTROLLER TESTS
# ============================================================================


class TestRetryController:
    """Test retry logic and exponential backoff."""

    def test_should_retry_transient_error(self):
        """Should retry transient 503 errors."""
        controller = RetryController()
        error = StreamError(
            code=503,
            message="overloaded",
            user_friendly_message="try again",
            is_transient=True,
        )

        assert controller.should_retry(error) is True

    def test_should_not_retry_non_transient_error(self):
        """Should not retry non-transient errors."""
        controller = RetryController()
        error = StreamError(
            code=500,
            message="internal error",
            user_friendly_message="error",
            is_transient=False,
        )

        assert controller.should_retry(error) is False

    def test_should_not_retry_after_max_attempts(self):
        """Should not retry after max attempts reached."""
        config = RetryConfig(max_retries=2)
        controller = RetryController(config=config)
        error = StreamError(
            code=503, message="test", user_friendly_message="test", is_transient=True
        )

        # First two attempts should allow retry
        controller.attempt = 0
        assert controller.should_retry(error) is True
        controller.attempt = 1
        assert controller.should_retry(error) is True

        # Third attempt should not retry
        controller.attempt = 2
        assert controller.should_retry(error) is False

    def test_should_not_retry_non_retryable_code(self):
        """Should not retry errors not in retry_on_codes list."""
        config = RetryConfig(retry_on_codes=[503])
        controller = RetryController(config=config)
        error = StreamError(
            code=429, message="test", user_friendly_message="test", is_transient=True
        )

        assert controller.should_retry(error) is False

    @pytest.mark.asyncio
    async def test_wait_for_retry_increments_attempt(self):
        """Should increment attempt counter when waiting."""
        controller = RetryController()

        assert controller.attempt == 0

        await controller.wait_for_retry()

        assert controller.attempt == 1

    def test_reset(self):
        """Should reset retry state."""
        controller = RetryController()
        controller.attempt = 3

        controller.reset()

        assert controller.attempt == 0


# ============================================================================
# STREAM ERROR TESTS
# ============================================================================


class TestStreamError:
    """Test StreamError serialization."""

    def test_to_sse_event(self):
        """Should convert to SSE event format."""
        error = StreamError(
            code=503,
            message="Service unavailable",
            user_friendly_message="Please try again",
            retry_after=10,
            is_transient=True,
        )

        sse_event = error.to_sse_event(invocation_id="inv_123")

        assert sse_event.startswith("data: ")
        assert "503" in sse_event
        assert "Please try again" in sse_event
        assert "inv_123" in sse_event

    def test_to_sse_event_includes_retry_after(self):
        """Should include retry_after in event."""
        error = StreamError(
            code=503,
            message="test",
            user_friendly_message="test",
            retry_after=30,
            is_transient=True,
        )

        sse_event = error.to_sse_event()
        data = json.loads(sse_event[6:])  # Remove "data: " prefix

        assert data["error"]["retry_after"] == 30


# ============================================================================
# STREAM TELEMETRY TESTS
# ============================================================================


class TestStreamTelemetry:
    """Test telemetry collection."""

    def test_record_error(self):
        """Should record error occurrences."""
        telemetry = StreamTelemetry()

        telemetry.record_error(503)
        telemetry.record_error(503)
        telemetry.record_error(429)

        assert telemetry.error_counts[503] == 2
        assert telemetry.error_counts[429] == 1

    def test_record_retry(self):
        """Should record retry attempts."""
        telemetry = StreamTelemetry()

        telemetry.record_retry("session_1")
        telemetry.record_retry("session_1")
        telemetry.record_retry("session_2")

        assert telemetry.retry_counts["session_1"] == 2
        assert telemetry.retry_counts["session_2"] == 1

    def test_record_stream(self):
        """Should record stream completion."""
        telemetry = StreamTelemetry()
        metrics = StreamMetrics(session_id="test")
        metrics.record_event("data", has_content=True)

        telemetry.record_stream(metrics)

        assert len(telemetry.stream_durations) == 1
        assert len(telemetry.content_success_rate) == 1
        assert telemetry.content_success_rate[0] is True

    def test_get_stats(self):
        """Should calculate statistics."""
        telemetry = StreamTelemetry()

        # Record some data
        telemetry.record_error(503)
        telemetry.record_retry("session_1")

        metrics1 = StreamMetrics(session_id="s1")
        metrics1.record_event("data", has_content=True)
        telemetry.record_stream(metrics1)

        metrics2 = StreamMetrics(session_id="s2")
        telemetry.record_stream(metrics2)

        stats = telemetry.get_stats()

        assert stats["total_streams"] == 2
        assert stats["successful_streams"] == 1
        assert stats["success_rate"] == 50.0
        assert stats["error_counts"][503] == 1
        assert stats["total_retries"] == 1


# ============================================================================
# SSE STREAM WRAPPER TESTS
# ============================================================================


class TestSSEStreamWrapper:
    """Test SSE stream wrapping with error handling."""

    @pytest.mark.asyncio
    async def test_wrap_stream_success(self):
        """Should wrap successful stream."""
        wrapper = SSEStreamWrapper(session_id="test")

        # Mock response with proper async generator
        async def mock_aiter_lines():
            yield 'data: {"content": {"parts": [{"text": "Hello"}]}}'
            yield ""
            yield "event: done"
            yield 'data: {"status": "completed"}'

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.aiter_lines = mock_aiter_lines

        mock_client = MagicMock()
        mock_client.stream = MagicMock()
        mock_client.stream.return_value.__aenter__ = AsyncMock(
            return_value=mock_response
        )
        mock_client.stream.return_value.__aexit__ = AsyncMock()

        # Collect events
        events = []
        async for line in wrapper.wrap_stream(
            upstream_url="http://test", request_payload={}, client=mock_client
        ):
            events.append(line)

        # Should receive all events plus completion marker
        assert len(events) > 0
        assert any("done" in event for event in events)
        assert wrapper.metrics.content_received is True

    @pytest.mark.asyncio
    async def test_wrap_stream_with_503_error(self):
        """Should detect and normalize 503 errors."""
        config = RetryConfig(max_retries=0)  # Disable retries for test
        wrapper = SSEStreamWrapper(session_id="test", retry_config=config)

        # Mock response with 503 error using proper async generator
        async def mock_aiter_lines():
            yield 'data: {"error": "503 model overloaded"}'

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.aiter_lines = mock_aiter_lines

        mock_client = MagicMock()
        mock_client.stream = MagicMock()
        mock_client.stream.return_value.__aenter__ = AsyncMock(
            return_value=mock_response
        )
        mock_client.stream.return_value.__aexit__ = AsyncMock()

        # Collect events
        events = []
        async for line in wrapper.wrap_stream(
            upstream_url="http://test", request_payload={}, client=mock_client
        ):
            events.append(line)

        # Should normalize error
        error_event = next((e for e in events if "503" in e), None)
        assert error_event is not None
        assert "free-tier" in error_event.lower()

    @pytest.mark.asyncio
    async def test_wrap_stream_http_error(self):
        """Should handle HTTP status errors."""
        config = RetryConfig(max_retries=0)  # Disable retries for test
        wrapper = SSEStreamWrapper(session_id="test", retry_config=config)

        # Mock 503 HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 503
        mock_response.raise_for_status = MagicMock(
            side_effect=httpx.HTTPStatusError(
                "503 error", request=MagicMock(), response=mock_response
            )
        )

        mock_client = MagicMock()
        mock_client.stream = MagicMock()
        mock_client.stream.return_value.__aenter__ = AsyncMock(
            return_value=mock_response
        )
        mock_client.stream.return_value.__aexit__ = AsyncMock()

        # Collect events
        events = []
        async for line in wrapper.wrap_stream(
            upstream_url="http://test", request_payload={}, client=mock_client
        ):
            events.append(line)

        # Should emit error event
        assert any("503" in event for event in events)

    @pytest.mark.asyncio
    async def test_wrap_stream_retry_on_503(self):
        """Should retry on transient 503 errors."""
        config = RetryConfig(max_retries=1, base_delay=0.1)  # Fast retry for test
        wrapper = SSEStreamWrapper(session_id="test", retry_config=config)

        call_count = 0

        async def mock_aiter_lines():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First attempt: error
                yield 'data: {"error": "503 overloaded"}'
            else:
                # Second attempt: success
                yield 'data: {"content": {"parts": [{"text": "Success"}]}}'
                yield "event: done"
                yield 'data: {"status": "completed"}'

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.aiter_lines = mock_aiter_lines

        mock_client = MagicMock()
        mock_client.stream = MagicMock()
        mock_client.stream.return_value.__aenter__ = AsyncMock(
            return_value=mock_response
        )
        mock_client.stream.return_value.__aexit__ = AsyncMock()

        # Collect events
        events = []
        async for line in wrapper.wrap_stream(
            upstream_url="http://test", request_payload={}, client=mock_client
        ):
            events.append(line)

        # Should have retried (call_count = 2)
        assert call_count == 2
        # Should eventually succeed
        assert any("Success" in event for event in events)

    @pytest.mark.asyncio
    async def test_wrap_stream_detects_termination(self):
        """Should detect stream termination without completion marker."""
        config = RetryConfig(max_retries=0)  # No retry for test
        wrapper = SSEStreamWrapper(session_id="test", retry_config=config)

        # Mock response that ends without completion
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()
        mock_response.aiter_lines = AsyncMock(
            return_value=iter(['data: {"content": {"parts": [{"text": "Partial"}]}}'])
        )

        mock_client = MagicMock()
        mock_client.stream = MagicMock()
        mock_client.stream.return_value.__aenter__ = AsyncMock(
            return_value=mock_response
        )
        mock_client.stream.return_value.__aexit__ = AsyncMock()

        # Collect events
        events = []
        async for line in wrapper.wrap_stream(
            upstream_url="http://test", request_payload={}, client=mock_client
        ):
            events.append(line)

        # Should detect termination
        assert wrapper.metrics.state == StreamState.TERMINATED
        # Should inject completion marker
        assert any("done" in event for event in events)


# ============================================================================
# INTEGRATION TEST
# ============================================================================


@pytest.mark.asyncio
async def test_end_to_end_error_handling():
    """Integration test: full error handling flow."""
    config = RetryConfig(max_retries=1, base_delay=0.1)
    wrapper = SSEStreamWrapper(session_id="integration_test", retry_config=config)

    # Simulate realistic scenario:
    # 1. First attempt gets 503 error
    # 2. Retry succeeds with content
    attempt = 0

    async def mock_aiter_lines():
        nonlocal attempt
        attempt += 1

        if attempt == 1:
            # First attempt: 503 error mid-stream
            yield 'data: {"content": {"parts": [{"text": "Starting..."}]}}'
            yield 'data: {"error": "503 model overloaded"}'
        else:
            # Retry: complete success
            yield 'data: {"content": {"parts": [{"text": "Complete response"}]}}'
            yield "event: done"
            yield 'data: {"status": "completed"}'

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.aiter_lines = mock_aiter_lines

    mock_client = MagicMock()
    mock_client.stream = MagicMock()
    mock_client.stream.return_value.__aenter__ = AsyncMock(return_value=mock_response)
    mock_client.stream.return_value.__aexit__ = AsyncMock()

    # Execute
    events = []
    async for line in wrapper.wrap_stream(
        upstream_url="http://test", request_payload={}, client=mock_client
    ):
        events.append(line)

    # Verify:
    # 1. Retry occurred
    assert attempt == 2

    # 2. Final state is completed
    assert wrapper.metrics.state == StreamState.COMPLETED

    # 3. Content was received
    assert wrapper.metrics.content_received is True

    # 4. Error was normalized
    assert any("free-tier" in event.lower() for event in events)

    # 5. Success message present
    assert any("Complete response" in event for event in events)
