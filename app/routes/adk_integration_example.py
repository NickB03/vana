"""
Example: Integrating SSE Error Handler with ADK Routes.

This file demonstrates how to integrate the SSE error handling system
into the existing ADK routes (adk_routes.py). This is a reference implementation
showing the minimal changes needed to wrap ADK streaming with robust error handling.

INTEGRATION STEPS:
1. Replace direct httpx.AsyncClient.stream() calls with SSEStreamWrapper
2. Remove manual error normalization logic (now handled by wrapper)
3. Configure retry behavior via RetryConfig
4. Add telemetry endpoint for monitoring

DO NOT commit this file - it's a reference example only.
Copy relevant patterns into app/routes/adk_routes.py.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.models import RunAgentRequest
from app.utils.rate_limiter import daily_quota, gemini_rate_limiter
from app.utils.session_store import session_store
from app.utils.sse_error_handler import (
    RetryConfig,
    SSEStreamWrapper,
    get_stream_telemetry_stats,
)

logger = logging.getLogger(__name__)

# Example router (replace with existing adk_router)
example_router = APIRouter(tags=["adk-canonical-with-error-handling"])


# ============================================================================
# INTEGRATION EXAMPLE: Enhanced /run_sse Endpoint
# ============================================================================


@example_router.post("/run_sse_enhanced")
async def run_sse_canonical_enhanced(
    request: RunAgentRequest,
    current_user=None,  # Add proper authentication dependency
) -> StreamingResponse:
    """
    Enhanced ADK canonical SSE streaming endpoint with robust error handling.

    This is an EXAMPLE showing how to integrate SSEStreamWrapper into the
    existing /run_sse endpoint. Key changes from original:

    1. Uses SSEStreamWrapper instead of direct httpx streaming
    2. Removes manual error normalization (now in wrapper)
    3. Adds retry configuration
    4. Simplified stream handling

    Args:
        request: RunAgentRequest with appName, userId, sessionId, newMessage
        current_user: Optional authenticated user

    Returns:
        StreamingResponse with error-wrapped ADK Event JSON
    """
    logger.info(
        f"Enhanced ADK streaming requested: app={request.app_name}, "
        f"user={request.user_id}, session={request.session_id}"
    )

    # Mark session as used (prevents cleanup)
    try:
        session_data = session_store.get_session(request.session_id)
        if session_data:
            metadata = session_data.get("metadata", {})
            if not metadata.get("has_messages"):
                session_store.update_session_metadata(
                    request.session_id,
                    {
                        "has_messages": True,
                        "first_message_at": datetime.now().isoformat(),
                    },
                    user_id=session_data.get("user_id"),
                )
    except Exception as e:
        logger.warning(f"Failed to mark session as used: {e}")

    # Check daily quota
    if not daily_quota.check_quota():
        raise HTTPException(
            status_code=429,
            detail=(
                f"Daily API quota exceeded ({daily_quota.request_count}/"
                f"{daily_quota.max_requests} requests used). "
                "This is a free-tier portfolio demo. Please try again tomorrow."
            ),
        )

    # Configure retry behavior
    retry_config = RetryConfig(
        max_retries=2,  # Retry up to 2 times for 503 errors
        base_delay=2.0,  # Start with 2 second delay
        max_delay=30.0,  # Cap at 30 seconds
        exponential_base=2.0,  # Double delay each retry
        jitter=True,  # Add randomness to prevent thundering herd
        retry_on_codes=[503, 429],  # Only retry transient errors
    )

    # Create stream wrapper
    stream_wrapper = SSEStreamWrapper(
        session_id=request.session_id, retry_config=retry_config
    )

    # Main streaming generator
    async def stream_with_error_handling():
        """Stream ADK events with comprehensive error handling."""
        try:
            # Increment daily quota
            daily_quota.increment()
            logger.info(
                f"Daily quota: {daily_quota.request_count}/{daily_quota.max_requests}"
            )

            # Rate limiting (Gemini free tier: 8 RPM / 2 concurrent)
            async with gemini_rate_limiter:
                logger.info(f"Rate limiter acquired for session {request.session_id}")

                # Configure timeout: 300s total, no read timeout (allow LLM processing)
                timeout_config = httpx.Timeout(300.0, read=None)

                async with httpx.AsyncClient(timeout=timeout_config) as client:
                    # Use SSEStreamWrapper - it handles:
                    # - Error detection and normalization
                    # - Retry logic for 503/429 errors
                    # - Stream state tracking
                    # - Completion marker injection
                    # - Telemetry collection
                    async for line in stream_wrapper.wrap_stream(
                        upstream_url="http://127.0.0.1:8080/run_sse",
                        request_payload=request.model_dump(
                            by_alias=True, exclude_none=True
                        ),
                        client=client,
                    ):
                        yield line

        except Exception as e:
            # Unexpected error outside wrapper
            error_event = {
                "error": f"Stream wrapper error: {str(e)}",
                "error_code": "WRAPPER_ERROR",
                "timestamp": datetime.now().timestamp(),
            }
            yield f"data: {json.dumps(error_event)}\n\n"
            logger.exception(
                f"Unexpected error outside wrapper for session {request.session_id}: {e}"
            )

    return StreamingResponse(
        stream_with_error_handling(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ============================================================================
# TELEMETRY ENDPOINTS
# ============================================================================


@example_router.get("/debug/sse-telemetry")
async def get_sse_telemetry() -> dict[str, Any]:
    """
    Get SSE stream telemetry statistics.

    Returns comprehensive metrics about stream error patterns:
    - Total streams attempted
    - Success rate
    - Error counts by code (503, 429, etc.)
    - Retry statistics
    - Average stream duration

    Use this endpoint to:
    - Monitor stream health
    - Identify error patterns
    - Tune retry configuration
    - Debug production issues

    Example response:
    {
        "total_streams": 150,
        "successful_streams": 142,
        "success_rate": 94.67,
        "error_counts": {
            "503": 5,
            "429": 2,
            "500": 1
        },
        "total_retries": 8,
        "avg_stream_duration": 12.5
    }
    """
    return get_stream_telemetry_stats()


# ============================================================================
# MIGRATION GUIDE
# ============================================================================

"""
MIGRATION GUIDE: Integrating SSE Error Handler into Existing Routes

Step 1: Import the error handler
--------------------------------
In app/routes/adk_routes.py, add:

    from app.utils.sse_error_handler import (
        RetryConfig,
        SSEStreamWrapper,
        get_stream_telemetry_stats,
    )


Step 2: Replace streaming logic in run_sse_canonical()
-------------------------------------------------------
Find the existing streaming logic (lines ~258-396 in adk_routes.py):

    async def stream_adk_events():
        async with httpx.AsyncClient(timeout=timeout_config) as client:
            async with client.stream(...) as upstream:
                # ... manual error normalization ...
                async for line in upstream.aiter_lines():
                    # ... manual error detection ...
                    yield line

Replace with:

    async def stream_adk_events():
        # Configure retry behavior
        retry_config = RetryConfig(
            max_retries=2,
            base_delay=2.0,
            max_delay=30.0,
            retry_on_codes=[503, 429],
        )

        # Create wrapper
        stream_wrapper = SSEStreamWrapper(
            session_id=request.session_id,
            retry_config=retry_config
        )

        async with httpx.AsyncClient(timeout=timeout_config) as client:
            async for line in stream_wrapper.wrap_stream(
                upstream_url="http://127.0.0.1:8080/run_sse",
                request_payload=request.model_dump(by_alias=True, exclude_none=True),
                client=client,
            ):
                yield line


Step 3: Remove manual error normalization
------------------------------------------
Delete the manual error detection code (lines ~308-354 in adk_routes.py):

    # Phase 3.3: Validate and normalize error events (fix malformed 503 errors)
    if line.startswith('data:'):
        try:
            json_str = line[5:].strip()
            if json_str:
                data = json.loads(json_str)
                if 'error' in data:
                    # ... manual normalization ...

This is now handled automatically by SSEStreamWrapper.


Step 4: Remove manual completion marker
----------------------------------------
Delete the manual completion marker code (lines ~359-365 in adk_routes.py):

    # Send completion marker for frontend (BLOCKER-1 FIX)
    yield "event: done\n"
    yield f"data: {json.dumps({'status': 'completed', ...})}\n\n"

This is now handled automatically by SSEStreamWrapper.


Step 5: Add telemetry endpoint
-------------------------------
Add to adk_router:

    @adk_router.get("/debug/sse-telemetry")
    async def get_sse_telemetry(
        current_user: User | None = Depends(get_current_active_user_optional()),
    ) -> dict[str, Any]:
        '''Get SSE stream telemetry statistics.'''
        return get_stream_telemetry_stats()


Step 6: Update tests
--------------------
Update tests to verify:
- 503 errors trigger retry (max 2 attempts)
- Non-retryable errors don't retry
- Completion markers are added
- Telemetry is collected

See: tests/unit/test_sse_error_handler.py (create this file)


Step 7: Monitor in production
------------------------------
After deployment:
1. Monitor /debug/sse-telemetry endpoint
2. Check error_counts for patterns
3. Adjust retry_config if needed
4. Verify success_rate is > 95%


BENEFITS OF THIS INTEGRATION:
-------------------------------
✓ Automatic detection of 503 "model overloaded" errors
✓ Exponential backoff retry for transient errors
✓ Stream completion tracking
✓ User-friendly error messages
✓ Telemetry for error patterns
✓ Reduced code complexity (removes manual error handling)
✓ Consistent error format across all streams
✓ Better free-tier API handling
"""
