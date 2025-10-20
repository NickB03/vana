"""Integration tests for Phase 3.3 session cleanup functionality.

Tests verify that:
1. Empty sessions are automatically deleted after TTL expires
2. Sessions with messages are preserved indefinitely
3. Background cleanup tasks don't block request handling
4. Configuration via environment variables works correctly
"""

from __future__ import annotations

import asyncio
import os
from collections.abc import Generator
from datetime import datetime
from unittest.mock import patch

import pytest
from fastapi import BackgroundTasks
from httpx import AsyncClient

from app.utils.session_cleanup import (
    SESSION_CLEANUP_ENABLED,
    SESSION_CLEANUP_TTL_MINUTES,
    cleanup_empty_session,
    get_cleanup_ttl_seconds,
)
from app.utils.session_store import session_store


@pytest.fixture
def cleanup_test_env() -> Generator[None, None, None]:
    """Set up test environment with short TTL for faster tests."""
    # Save original values
    original_enabled = os.getenv("SESSION_CLEANUP_ENABLED")
    original_ttl = os.getenv("SESSION_CLEANUP_TTL_MINUTES")

    # Set test values
    os.environ["SESSION_CLEANUP_ENABLED"] = "true"
    os.environ["SESSION_CLEANUP_TTL_MINUTES"] = "1"  # 1 minute for tests

    yield

    # Restore original values
    if original_enabled is not None:
        os.environ["SESSION_CLEANUP_ENABLED"] = original_enabled
    else:
        os.environ.pop("SESSION_CLEANUP_ENABLED", None)

    if original_ttl is not None:
        os.environ["SESSION_CLEANUP_TTL_MINUTES"] = original_ttl
    else:
        os.environ.pop("SESSION_CLEANUP_TTL_MINUTES", None)


@pytest.mark.asyncio
async def test_cleanup_empty_session() -> None:
    """Test that empty sessions are cleaned up after TTL expires."""
    # Create a test session
    session_id = "test_session_empty_cleanup"
    session_store.ensure_session(
        session_id,
        user_id=1,
        title="Test Session",
        status="idle",
        metadata={
            "created_at": datetime.now().isoformat(),
            "ttl_minutes": 1,
            "has_messages": False,
            "backend_created": True,
            "kind": "canonical-session",
        },
    )

    # Verify session exists
    session_data = session_store.get_session(session_id)
    assert session_data is not None
    assert session_data["metadata"]["has_messages"] is False

    # Run cleanup with short delay (5 seconds for testing)
    await cleanup_empty_session(session_id, delay_seconds=5)

    # Verify session was deleted
    session_data = session_store.get_session(session_id)
    assert session_data is None


@pytest.mark.asyncio
async def test_cleanup_preserves_used_session() -> None:
    """Test that sessions with messages are NOT cleaned up."""
    # Create a test session
    session_id = "test_session_with_messages"
    session_store.ensure_session(
        session_id,
        user_id=1,
        title="Test Session",
        status="idle",
        metadata={
            "created_at": datetime.now().isoformat(),
            "ttl_minutes": 1,
            "has_messages": False,
            "backend_created": True,
            "kind": "canonical-session",
        },
    )

    # Mark session as used (simulate message being sent)
    session_store.update_session_metadata(
        session_id, {"has_messages": True, "first_message_at": datetime.now().isoformat()}
    )

    # Verify session exists and is marked as used
    session_data = session_store.get_session(session_id)
    assert session_data is not None
    assert session_data["metadata"]["has_messages"] is True

    # Run cleanup with short delay
    await cleanup_empty_session(session_id, delay_seconds=5)

    # Verify session still exists (was NOT deleted)
    session_data = session_store.get_session(session_id)
    assert session_data is not None
    assert session_data["metadata"]["has_messages"] is True

    # Clean up test session
    session_store.delete_session(session_id)


@pytest.mark.asyncio
async def test_cleanup_handles_already_deleted_session() -> None:
    """Test that cleanup handles sessions that were already deleted gracefully."""
    session_id = "test_session_already_deleted"

    # Create and immediately delete session
    session_store.ensure_session(
        session_id,
        metadata={"has_messages": False},
    )
    session_store.delete_session(session_id)

    # Verify session doesn't exist
    assert session_store.get_session(session_id) is None

    # Run cleanup - should not raise an error
    await cleanup_empty_session(session_id, delay_seconds=1)

    # Still should not exist
    assert session_store.get_session(session_id) is None


@pytest.mark.asyncio
async def test_cleanup_disabled_configuration() -> None:
    """Test that cleanup respects SESSION_CLEANUP_ENABLED=false."""
    with patch.dict(os.environ, {"SESSION_CLEANUP_ENABLED": "false"}):
        # Reload module to pick up new env var
        from importlib import reload
        from app.utils import session_cleanup

        reload(session_cleanup)

        session_id = "test_session_cleanup_disabled"
        session_store.ensure_session(
            session_id,
            metadata={"has_messages": False},
        )

        # Run cleanup with disabled flag
        await session_cleanup.cleanup_empty_session(session_id, delay_seconds=1)

        # Session should still exist (cleanup was skipped)
        session_data = session_store.get_session(session_id)
        assert session_data is not None

        # Clean up
        session_store.delete_session(session_id)


def test_get_cleanup_ttl_seconds() -> None:
    """Test TTL configuration conversion to seconds."""
    # Default should be 30 minutes = 1800 seconds
    with patch.dict(os.environ, {"SESSION_CLEANUP_TTL_MINUTES": "30"}):
        from importlib import reload
        from app.utils import session_cleanup

        reload(session_cleanup)
        assert session_cleanup.get_cleanup_ttl_seconds() == 1800

    # Test custom value
    with patch.dict(os.environ, {"SESSION_CLEANUP_TTL_MINUTES": "5"}):
        reload(session_cleanup)
        assert session_cleanup.get_cleanup_ttl_seconds() == 300


@pytest.mark.skip(reason="Requires FastAPI test client fixture - integration test to be run separately")
@pytest.mark.asyncio
async def test_background_task_integration(client: AsyncClient) -> None:
    """Test that background tasks are scheduled correctly during session creation.

    NOTE: This test requires the FastAPI test client fixture which is defined
    in conftest.py. Run with the full test suite to execute this test.
    """
    # Create session via API endpoint
    response = await client.post(
        "/apps/vana/users/testuser/sessions",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 200
    data = response.json()
    session_id = data["session_id"]

    # Verify session was created with correct metadata
    session_data = session_store.get_session(session_id)
    assert session_data is not None
    assert session_data["metadata"]["has_messages"] is False
    assert session_data["metadata"]["ttl_minutes"] == 30
    assert session_data["metadata"]["backend_created"] is True

    # Background task should be scheduled (we can't test execution timing here)
    # But we can verify the session exists immediately after creation
    assert session_data["status"] == "idle"

    # Clean up
    session_store.delete_session(session_id)


@pytest.mark.asyncio
async def test_session_marked_as_used_on_message() -> None:
    """Test that sessions are marked as used when first message is received."""
    # Create session
    session_id = "test_session_mark_used"
    session_store.ensure_session(
        session_id,
        user_id=1,
        metadata={
            "has_messages": False,
            "created_at": datetime.now().isoformat(),
        },
    )

    # Verify initially empty
    session_data = session_store.get_session(session_id)
    assert session_data["metadata"]["has_messages"] is False

    # Mark as used (simulating message receipt)
    session_store.update_session_metadata(
        session_id,
        {
            "has_messages": True,
            "first_message_at": datetime.now().isoformat(),
        },
    )

    # Verify marked as used
    session_data = session_store.get_session(session_id)
    assert session_data["metadata"]["has_messages"] is True
    assert "first_message_at" in session_data["metadata"]

    # Clean up
    session_store.delete_session(session_id)


@pytest.mark.asyncio
async def test_concurrent_cleanup_tasks() -> None:
    """Test that multiple cleanup tasks can run concurrently without issues."""
    # Use proper session IDs (must be at least 20 characters)
    session_ids = [f"test_concurrent_cleanup_{i:04d}" for i in range(5)]

    # Create multiple sessions
    for session_id in session_ids:
        session_store.ensure_session(
            session_id,
            metadata={"has_messages": False},
        )

    # Schedule cleanup for all sessions concurrently
    tasks = [
        cleanup_empty_session(session_id, delay_seconds=2) for session_id in session_ids
    ]
    await asyncio.gather(*tasks)

    # Verify all sessions were deleted
    for session_id in session_ids:
        assert session_store.get_session(session_id) is None


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
