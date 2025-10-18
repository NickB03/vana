#!/usr/bin/env python3
"""
Event bus for multicasting ADK events to multiple consumers (Phase 1.2).

This module provides event forwarding capabilities to support gradual migration
from custom research_* events to canonical ADK Event JSON. During the transition
period, raw ADK events can be converted to legacy formats when the feature flag
is disabled.

Based on: docs/plans/multi_agent_adk_alignment_plan.md Phase 1.2
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Any

from app.config import is_adk_canonical_stream_enabled

logger = logging.getLogger(__name__)


async def forward_adk_event_to_legacy(
    session_id: str,
    event_json: dict[str, Any]
) -> None:
    """
    Forward raw ADK Event JSON to legacy broadcaster when feature flag disabled.

    This function extracts content from ADK Event structure and converts it to
    the legacy research_update format that existing clients expect. This allows
    gradual migration without breaking existing integrations.

    ADK Event structure (from docs/adk/refs/official-adk-python/src/google/adk/events/event.py):
    {
        "id": "event_123",
        "author": "research_agent",
        "invocationId": "inv_456",
        "timestamp": 1234567890.123,
        "content": {
            "parts": [
                {"text": "Model streaming output"},
                {"functionResponse": {
                    "response": {"result": "Agent tool output"}
                }},
                {"functionCall": {...}}
            ]
        },
        "actions": {...}
    }

    Args:
        session_id: Session identifier for routing
        event_json: Raw ADK Event JSON dictionary

    Returns:
        None

    Example:
        >>> await forward_adk_event_to_legacy(
        ...     "session_123",
        ...     {
        ...         "content": {
        ...             "parts": [
        ...                 {"text": "Research findings..."},
        ...                 {"functionResponse": {
        ...                     "response": {"result": "Analysis complete"}
        ...                 }}
        ...             ]
        ...         },
        ...         "timestamp": 1234567890.123
        ...     }
        ... )
    """
    # Only forward when canonical streaming is disabled (legacy mode)
    if is_adk_canonical_stream_enabled():
        logger.debug(
            f"Skipping legacy forwarding for session {session_id}: "
            "canonical streaming enabled"
        )
        return

    try:
        # Import broadcaster only when needed to avoid circular imports
        from app.utils.sse_broadcaster import get_sse_broadcaster

        broadcaster = get_sse_broadcaster()

        # Extract content from ADK Event structure
        content_obj = event_json.get("content")
        if not content_obj or not isinstance(content_obj, dict):
            logger.debug(
                f"No content in ADK event for session {session_id}, skipping"
            )
            return

        parts = content_obj.get("parts", [])
        if not parts:
            return

        # Collect text content from all parts
        text_content: list[str] = []

        for part in parts:
            if not isinstance(part, dict):
                continue

            # PART 1: Extract regular text streaming
            # Used for: Model responses, status updates, explanations
            text = part.get("text")
            if text:
                text_content.append(text)

            # PART 2: Extract functionResponse (CRITICAL!)
            # Used for: Research plans, agent tool outputs, analysis results
            # This is where plan_generator and other agent outputs appear
            function_response = part.get("functionResponse")
            if function_response and isinstance(function_response, dict):
                response_data = function_response.get("response", {})
                result_text = response_data.get("result")
                if result_text:
                    text_content.append(result_text)
                    logger.debug(
                        f"Extracted functionResponse content for session {session_id}: "
                        f"{len(result_text)} chars"
                    )

        # Only broadcast if we have content
        if text_content:
            combined_content = "".join(text_content)

            # Convert to legacy research_update format
            legacy_event = {
                "type": "research_update",
                "data": {
                    "content": combined_content,
                    "timestamp": event_json.get("timestamp") or datetime.now().timestamp()
                }
            }

            await broadcaster.broadcast_event(session_id, legacy_event)

            logger.debug(
                f"Forwarded ADK event to legacy broadcaster for session {session_id}: "
                f"{len(combined_content)} chars"
            )

    except ImportError:
        logger.warning(
            f"Could not import broadcaster for session {session_id}, "
            "skipping legacy forwarding"
        )
    except Exception as e:
        logger.error(
            f"Error forwarding ADK event to legacy broadcaster for session {session_id}: {e}",
            exc_info=True
        )


async def broadcast_agent_status_from_adk(
    session_id: str,
    event_json: dict[str, Any]
) -> None:
    """
    Extract and broadcast agent status from ADK Event actions.

    ADK events may include agent transfer actions or status updates in the
    actions field. This function converts them to legacy agent_status events.

    Args:
        session_id: Session identifier
        event_json: Raw ADK Event JSON

    Example:
        >>> await broadcast_agent_status_from_adk(
        ...     "session_123",
        ...     {
        ...         "author": "research_agent",
        ...         "actions": {
        ...             "transfer_to_agent": "analysis_agent"
        ...         }
        ...     }
        ... )
    """
    if is_adk_canonical_stream_enabled():
        return  # Only for legacy mode

    try:
        from app.utils.sse_broadcaster import get_sse_broadcaster

        broadcaster = get_sse_broadcaster()

        # Extract agent information
        author = event_json.get("author", "unknown")
        actions = event_json.get("actions", {})

        # Check for agent transfer actions
        transfer_to = actions.get("transfer_to_agent")
        if transfer_to:
            legacy_event = {
                "type": "agent_status",
                "data": {
                    "agents": [{
                        "agent_id": transfer_to,
                        "name": transfer_to.replace("_", " ").title(),
                        "status": "active",
                        "current_task": f"Taking over from {author}"
                    }],
                    "timestamp": event_json.get("timestamp") or datetime.now().timestamp()
                }
            }
            await broadcaster.broadcast_event(session_id, legacy_event)
            logger.debug(f"Forwarded agent transfer to legacy format: {author} -> {transfer_to}")

    except Exception as e:
        logger.error(f"Error broadcasting agent status for session {session_id}: {e}")


async def multicast_adk_event(
    session_id: str,
    event_json: dict[str, Any]
) -> None:
    """
    Multicast an ADK event to all relevant consumers.

    This is the main entry point for Phase 1.2 event multicasting. It handles:
    1. Legacy format conversion when feature flag is disabled
    2. Direct passthrough when canonical streaming is enabled
    3. Agent status extraction and forwarding

    Args:
        session_id: Session identifier for routing
        event_json: Raw ADK Event JSON dictionary

    Example:
        >>> await multicast_adk_event("session_123", {
        ...     "author": "research_agent",
        ...     "content": {"parts": [{"text": "Analysis complete"}]},
        ...     "timestamp": 1234567890.123
        ... })
    """
    # Forward to legacy consumers (only when flag disabled)
    await forward_adk_event_to_legacy(session_id, event_json)

    # Extract and forward agent status
    await broadcast_agent_status_from_adk(session_id, event_json)

    # Future: Add more multicasting destinations here
    # - Metrics collection
    # - Analytics pipeline
    # - Audit logging
    # - Real-time dashboards
