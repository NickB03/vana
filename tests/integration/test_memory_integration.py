"""Integration tests for memory system."""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, MagicMock

from app.auth.database import SessionLocal
from app.auth.models import LongTermMemory, User
from app.tools.memory_tools import (
    store_memory_function,
    retrieve_memories_function,
    delete_memory_function,
)


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    from app.auth.security import get_password_hash

    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpass"),
        is_active=True,
        is_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mock_tool_context_with_user(test_user):
    """Create mock tool context with real user ID."""
    context = MagicMock()
    context._invocation_context.user_id = test_user.id
    context._invocation_context.session.id = "integration-test-session"
    return context


@pytest.fixture
def patched_session_local(db_session):
    """Patch SessionLocal to return test database session."""
    with patch('app.tools.memory_tools.SessionLocal', return_value=db_session):
        yield db_session


class TestMemoryIntegration:
    """Integration tests for full memory lifecycle."""

    def test_full_memory_lifecycle(self, mock_tool_context_with_user, patched_session_local):
        """Test storing, retrieving, and deleting a memory."""
        # Store
        result = store_memory_function(
            namespace="test",
            key="lifecycle_test",
            content="This is a test memory",
            tags=["test", "integration"],
            importance=0.9,
            tool_context=mock_tool_context_with_user
        )
        assert "stored" in result.lower()

        # Retrieve
        result = retrieve_memories_function(
            namespace="test",
            key="lifecycle_test",
            tool_context=mock_tool_context_with_user
        )
        assert "lifecycle_test" in result
        assert "This is a test memory" in result

        # Delete
        result = delete_memory_function(
            namespace="test",
            key="lifecycle_test",
            tool_context=mock_tool_context_with_user
        )
        assert "forgotten" in result.lower()

        # Verify deleted
        memory = patched_session_local.query(LongTermMemory).filter_by(
            user_id=mock_tool_context_with_user._invocation_context.user_id,
            namespace="test",
            key="lifecycle_test"
        ).first()
        assert memory.is_deleted == True

    def test_user_isolation(self, patched_session_local):
        """Test that users can only access their own memories."""
        from app.auth.security import get_password_hash

        # Create two users
        user1 = User(
            email="user1@test.com",
            username="user1",
            hashed_password=get_password_hash("pass1"),
            is_active=True
        )
        user2 = User(
            email="user2@test.com",
            username="user2",
            hashed_password=get_password_hash("pass2"),
            is_active=True
        )
        patched_session_local.add_all([user1, user2])
        patched_session_local.commit()

        # Create contexts for each user
        context1 = MagicMock()
        context1._invocation_context.user_id = user1.id
        context1._invocation_context.session.id = "session1"

        context2 = MagicMock()
        context2._invocation_context.user_id = user2.id
        context2._invocation_context.session.id = "session2"

        # User 1 stores memory
        store_memory_function(
            namespace="private",
            key="secret",
            content="User 1's secret",
            tool_context=context1
        )

        # User 2 tries to retrieve - should not see user 1's memory
        result = retrieve_memories_function(
            namespace="private",
            key="secret",
            tool_context=context2
        )
        assert "don't have any memories" in result.lower()

    def test_ttl_expiration(self, mock_tool_context_with_user, patched_session_local):
        """Test that memories with TTL expire correctly."""
        # Store memory with 1-day TTL
        result = store_memory_function(
            namespace="temporary",
            key="expires_soon",
            content="This will expire",
            ttl_days=1,
            tool_context=mock_tool_context_with_user
        )
        assert "stored" in result.lower()

        # Manually set expires_at to the past
        memory = patched_session_local.query(LongTermMemory).filter_by(
            user_id=mock_tool_context_with_user._invocation_context.user_id,
            namespace="temporary",
            key="expires_soon"
        ).first()
        memory.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        patched_session_local.commit()

        # Try to retrieve - should be filtered out
        result = retrieve_memories_function(
            namespace="temporary",
            tool_context=mock_tool_context_with_user
        )
        assert "don't have any memories" in result.lower()

    def test_importance_ordering(self, mock_tool_context_with_user, patched_session_local):
        """Test that memories are returned in order of importance."""
        # Store multiple memories with different importance scores
        store_memory_function(
            namespace="test",
            key="low_importance",
            content="Low priority info",
            importance=0.3,
            tool_context=mock_tool_context_with_user
        )

        store_memory_function(
            namespace="test",
            key="high_importance",
            content="Critical info",
            importance=0.9,
            tool_context=mock_tool_context_with_user
        )

        store_memory_function(
            namespace="test",
            key="medium_importance",
            content="Moderately important",
            importance=0.6,
            tool_context=mock_tool_context_with_user
        )

        # Retrieve all
        result = retrieve_memories_function(
            namespace="test",
            tool_context=mock_tool_context_with_user
        )

        # Check that high_importance appears before low_importance
        high_pos = result.find("high_importance")
        low_pos = result.find("low_importance")
        assert high_pos < low_pos, "High importance memory should appear first"

    def test_tag_filtering(self, mock_tool_context_with_user, patched_session_local):
        """Test filtering memories by tags."""
        # Store memories with different tags
        store_memory_function(
            namespace="test",
            key="python_info",
            content="Python related info",
            tags=["python", "programming"],
            tool_context=mock_tool_context_with_user
        )

        store_memory_function(
            namespace="test",
            key="java_info",
            content="Java related info",
            tags=["java", "programming"],
            tool_context=mock_tool_context_with_user
        )

        store_memory_function(
            namespace="test",
            key="design_info",
            content="Design related info",
            tags=["design", "ui"],
            tool_context=mock_tool_context_with_user
        )

        # Retrieve only Python-tagged memories
        result = retrieve_memories_function(
            tags=["python"],
            tool_context=mock_tool_context_with_user
        )

        assert "python_info" in result
        assert "java_info" not in result
        assert "design_info" not in result

    def test_access_tracking(self, mock_tool_context_with_user, patched_session_local):
        """Test that last_accessed_at is updated on retrieval."""
        import time

        # Store memory
        store_memory_function(
            namespace="test",
            key="access_test",
            content="Test content",
            tool_context=mock_tool_context_with_user
        )

        # Wait a moment
        time.sleep(0.1)

        # Retrieve - this should set last_accessed_at
        retrieve_memories_function(
            namespace="test",
            key="access_test",
            tool_context=mock_tool_context_with_user
        )

        # Get first access time
        memory = patched_session_local.query(LongTermMemory).filter_by(
            user_id=mock_tool_context_with_user._invocation_context.user_id,
            namespace="test",
            key="access_test"
        ).first()
        first_access = memory.last_accessed_at
        assert first_access is not None

        # Wait a moment and retrieve again
        time.sleep(0.1)

        retrieve_memories_function(
            namespace="test",
            key="access_test",
            tool_context=mock_tool_context_with_user
        )

        # Re-query to get fresh object
        memory = patched_session_local.query(LongTermMemory).filter_by(
            user_id=mock_tool_context_with_user._invocation_context.user_id,
            namespace="test",
            key="access_test"
        ).first()

        # Check that last_accessed_at was updated
        assert memory.last_accessed_at > first_access

    def test_update_preserves_metadata(self, mock_tool_context_with_user, patched_session_local):
        """Test that updating content preserves other metadata."""
        # Store initial memory
        store_memory_function(
            namespace="test",
            key="update_test",
            content="Original content",
            tags=["original"],
            importance=0.8,
            tool_context=mock_tool_context_with_user
        )

        # Get initial values
        memory = patched_session_local.query(LongTermMemory).filter_by(
            user_id=mock_tool_context_with_user._invocation_context.user_id,
            namespace="test",
            key="update_test"
        ).first()
        created_at = memory.created_at

        # Update content
        store_memory_function(
            namespace="test",
            key="update_test",
            content="Updated content",
            tool_context=mock_tool_context_with_user
        )

        # Re-query to get fresh object
        memory = patched_session_local.query(LongTermMemory).filter_by(
            user_id=mock_tool_context_with_user._invocation_context.user_id,
            namespace="test",
            key="update_test"
        ).first()

        # Verify update
        assert memory.content == "Updated content"
        assert memory.created_at == created_at  # Should not change
        assert memory.updated_at > created_at  # Should be updated
