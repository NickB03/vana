"""Background task utilities for session cleanup.

Phase 3.3: Prevent empty session accumulation from pre-created sessions.

This module provides background cleanup tasks that run after session TTL expires
to remove sessions that were created but never used (no messages sent).
"""

from __future__ import annotations

import asyncio
import logging
import os

# Import session_store using string reference to avoid circular import
# The actual import happens at runtime when the function is called
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass

logger = logging.getLogger(__name__)

# Configuration from environment variables
SESSION_CLEANUP_TTL_MINUTES = int(os.getenv("SESSION_CLEANUP_TTL_MINUTES", "30"))
SESSION_CLEANUP_ENABLED = os.getenv("SESSION_CLEANUP_ENABLED", "true").lower() == "true"


async def cleanup_empty_session(session_id: str, delay_seconds: int = 1800) -> None:
    """Background task to cleanup empty sessions after TTL expires.

    This function is designed to run as a FastAPI background task. It waits for
    the specified delay (default 30 minutes), then checks if the session is still
    empty (has_messages=False). If empty, the session is deleted to prevent
    accumulation.

    Args:
        session_id: Session ID to cleanup
        delay_seconds: Delay before cleanup in seconds (default 1800 = 30 minutes)

    Returns:
        None

    Example:
        # In FastAPI endpoint:
        background_tasks.add_task(cleanup_empty_session, session_id, 1800)
    """
    if not SESSION_CLEANUP_ENABLED:
        logger.debug(f"Session cleanup disabled, skipping cleanup for {session_id}")
        return

    try:
        # Wait for TTL to expire
        logger.debug(
            f"Session {session_id[:8]}... scheduled for cleanup in {delay_seconds}s"
        )
        await asyncio.sleep(delay_seconds)

        # Import here to avoid circular dependency
        from app.utils.session_store import session_store

        # Check if session still exists
        session_data = session_store.get_session(session_id)
        if not session_data:
            logger.debug(f"Session {session_id[:8]}... already cleaned up or deleted")
            return

        # Check metadata to see if session was used
        metadata = session_data.get("metadata", {})
        has_messages = metadata.get("has_messages", False)

        if not has_messages:
            # Session never received any messages, safe to delete
            logger.info(
                f"Cleaning up empty session {session_id[:8]}... "
                f"(created {metadata.get('created_at', 'unknown')}, "
                f"TTL {metadata.get('ttl_minutes', 'unknown')} min)"
            )
            session_store.delete_session(session_id)
        else:
            # Session has messages, keep it
            logger.debug(
                f"Session {session_id[:8]}... has messages, preserving "
                f"(first message at {metadata.get('first_message_at', 'unknown')})"
            )

    except asyncio.CancelledError:
        # Task was cancelled (e.g., server shutdown), this is normal
        logger.debug(f"Cleanup task cancelled for session {session_id[:8]}...")
        raise  # Re-raise to allow proper cleanup

    except Exception as error:
        # Log errors but don't crash the server
        logger.error(
            f"Session cleanup error for {session_id[:8]}...: {error}",
            exc_info=True
        )


def get_cleanup_ttl_seconds() -> int:
    """Get the cleanup TTL in seconds from environment configuration.

    Returns:
        TTL in seconds (default 1800 = 30 minutes)
    """
    return SESSION_CLEANUP_TTL_MINUTES * 60


__all__ = [
    "SESSION_CLEANUP_ENABLED",
    "SESSION_CLEANUP_TTL_MINUTES",
    "cleanup_empty_session",
    "get_cleanup_ttl_seconds",
]
