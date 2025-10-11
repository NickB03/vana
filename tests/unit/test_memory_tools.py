"""Unit tests for long-term memory tools."""

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from app.tools.memory_tools import (
    store_memory_function,
    retrieve_memories_function,
    delete_memory_function,
    MAX_CONTENT_LENGTH,
    MAX_TAGS,
)
from app.auth.models import LongTermMemory


@pytest.fixture
def mock_tool_context():
    """Create mock ADK ToolContext with user_id."""
    context = MagicMock()
    context._invocation_context.user_id = 1
    context._invocation_context.session.id = "test-session-123"
    return context


@pytest.fixture
def mock_db_session(monkeypatch):
    """Mock database session."""
    mock_session = MagicMock()

    # Mock SessionLocal to return our mock session
    with patch('app.tools.memory_tools.SessionLocal', return_value=mock_session):
        yield mock_session


class TestStoreMemoryFunction:
    """Tests for store_memory_function."""

    def test_store_new_memory(self, mock_tool_context, mock_db_session):
        """Test storing a new memory."""
        # Setup: No existing memory
        mock_db_session.execute().scalar_one_or_none.return_value = None

        result = store_memory_function(
            namespace="preferences",
            key="favorite_color",
            content="The user's favorite color is blue",
            tags=["color", "preference"],
            importance=0.8,
            tool_context=mock_tool_context
        )

        assert "stored" in result.lower()
        assert "favorite_color" in result
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()

    def test_update_existing_memory(self, mock_tool_context, mock_db_session):
        """Test updating an existing memory."""
        # Setup: Existing memory
        existing_memory = MagicMock(spec=LongTermMemory)
        mock_db_session.execute().scalar_one_or_none.return_value = existing_memory

        result = store_memory_function(
            namespace="preferences",
            key="favorite_color",
            content="The user's favorite color is now green",
            tool_context=mock_tool_context
        )

        assert "updated" in result.lower()
        assert existing_memory.content == "The user's favorite color is now green"
        mock_db_session.commit.assert_called_once()

    def test_store_without_context(self):
        """Test storing without tool_context fails gracefully."""
        result = store_memory_function(
            namespace="test",
            key="key",
            content="content"
        )

        assert "error" in result.lower()
        assert "context not available" in result.lower()

    def test_content_too_long(self, mock_tool_context):
        """Test content length validation."""
        result = store_memory_function(
            namespace="test",
            key="key",
            content="x" * (MAX_CONTENT_LENGTH + 1),
            tool_context=mock_tool_context
        )

        assert "error" in result.lower()
        assert "too long" in result.lower()

    def test_too_many_tags(self, mock_tool_context):
        """Test tag count validation."""
        result = store_memory_function(
            namespace="test",
            key="key",
            content="content",
            tags=[f"tag{i}" for i in range(MAX_TAGS + 1)],
            tool_context=mock_tool_context
        )

        assert "error" in result.lower()
        assert "too many tags" in result.lower()

    def test_invalid_importance(self, mock_tool_context):
        """Test importance score validation."""
        result = store_memory_function(
            namespace="test",
            key="key",
            content="content",
            importance=1.5,  # Invalid: > 1.0
            tool_context=mock_tool_context
        )

        assert "error" in result.lower()
        assert "importance" in result.lower()

    def test_store_with_ttl(self, mock_tool_context, mock_db_session):
        """Test storing memory with TTL."""
        mock_db_session.execute().scalar_one_or_none.return_value = None

        result = store_memory_function(
            namespace="temporary",
            key="session_context",
            content="This session's context",
            ttl_days=7,
            tool_context=mock_tool_context
        )

        assert "stored" in result.lower()
        mock_db_session.commit.assert_called_once()


class TestRetrieveMemoriesFunction:
    """Tests for retrieve_memories_function."""

    def test_retrieve_all_memories(self, mock_tool_context, mock_db_session):
        """Test retrieving all user memories."""
        # Create mock memories
        memory1 = MagicMock(spec=LongTermMemory)
        memory1.namespace = "preferences"
        memory1.key = "name"
        memory1.content = "User's name is Alice"
        memory1.tags = ["personal"]
        memory1.importance = 0.9
        memory1.is_expired = False

        memory2 = MagicMock(spec=LongTermMemory)
        memory2.namespace = "research"
        memory2.key = "topic"
        memory2.content = "Interested in AI"
        memory2.tags = ["ai", "topic"]
        memory2.importance = 0.8
        memory2.is_expired = False

        mock_db_session.execute().scalars().all.return_value = [memory1, memory2]

        result = retrieve_memories_function(
            tool_context=mock_tool_context
        )

        assert "2 relevant memories" in result
        assert "preferences/name" in result
        assert "research/topic" in result
        mock_db_session.commit.assert_called_once()  # For access tracking

    def test_retrieve_by_namespace(self, mock_tool_context, mock_db_session):
        """Test filtering by namespace."""
        memory = MagicMock(spec=LongTermMemory)
        memory.namespace = "preferences"
        memory.key = "name"
        memory.content = "Alice"
        memory.tags = None
        memory.importance = 0.9
        memory.is_expired = False

        mock_db_session.execute().scalars().all.return_value = [memory]

        result = retrieve_memories_function(
            namespace="preferences",
            tool_context=mock_tool_context
        )

        assert "1 relevant" in result
        assert "preferences/name" in result

    def test_retrieve_by_tags(self, mock_tool_context, mock_db_session):
        """Test filtering by tags."""
        memory = MagicMock(spec=LongTermMemory)
        memory.namespace = "research"
        memory.key = "topic"
        memory.content = "AI research"
        memory.tags = ["ai", "ml"]
        memory.importance = 0.8
        memory.is_expired = False

        mock_db_session.execute().scalars().all.return_value = [memory]

        result = retrieve_memories_function(
            tags=["ai"],
            tool_context=mock_tool_context
        )

        assert "1 relevant" in result
        assert "ai" in result.lower()

    def test_retrieve_filters_expired(self, mock_tool_context, mock_db_session):
        """Test that expired memories are filtered out."""
        expired_memory = MagicMock(spec=LongTermMemory)
        expired_memory.is_expired = True

        valid_memory = MagicMock(spec=LongTermMemory)
        valid_memory.namespace = "test"
        valid_memory.key = "key"
        valid_memory.content = "content"
        valid_memory.tags = None
        valid_memory.importance = 0.5
        valid_memory.is_expired = False

        mock_db_session.execute().scalars().all.return_value = [expired_memory, valid_memory]

        result = retrieve_memories_function(
            tool_context=mock_tool_context
        )

        assert "1 relevant" in result

    def test_retrieve_without_context(self):
        """Test retrieval without tool_context fails gracefully."""
        result = retrieve_memories_function()

        assert "error" in result.lower()
        assert "context not available" in result.lower()

    def test_retrieve_no_memories_found(self, mock_tool_context, mock_db_session):
        """Test when no memories match criteria."""
        mock_db_session.execute().scalars().all.return_value = []

        result = retrieve_memories_function(
            namespace="nonexistent",
            tool_context=mock_tool_context
        )

        assert "don't have any memories" in result.lower()


class TestDeleteMemoryFunction:
    """Tests for delete_memory_function."""

    def test_soft_delete(self, mock_tool_context, mock_db_session):
        """Test soft deleting a memory."""
        memory = MagicMock(spec=LongTermMemory)
        mock_db_session.execute().scalar_one_or_none.return_value = memory

        result = delete_memory_function(
            namespace="test",
            key="old_data",
            hard_delete=False,
            tool_context=mock_tool_context
        )

        assert "forgotten" in result.lower()
        assert memory.is_deleted == True
        mock_db_session.commit.assert_called_once()
        mock_db_session.delete.assert_not_called()

    def test_hard_delete(self, mock_tool_context, mock_db_session):
        """Test permanently deleting a memory."""
        memory = MagicMock(spec=LongTermMemory)
        mock_db_session.execute().scalar_one_or_none.return_value = memory

        result = delete_memory_function(
            namespace="test",
            key="old_data",
            hard_delete=True,
            tool_context=mock_tool_context
        )

        assert "permanently deleted" in result.lower()
        mock_db_session.delete.assert_called_once_with(memory)
        mock_db_session.commit.assert_called_once()

    def test_delete_nonexistent_memory(self, mock_tool_context, mock_db_session):
        """Test deleting a memory that doesn't exist."""
        mock_db_session.execute().scalar_one_or_none.return_value = None

        result = delete_memory_function(
            namespace="test",
            key="nonexistent",
            tool_context=mock_tool_context
        )

        assert "don't have a memory" in result.lower()

    def test_delete_without_context(self):
        """Test deletion without tool_context fails gracefully."""
        result = delete_memory_function(
            namespace="test",
            key="key"
        )

        assert "error" in result.lower()
        assert "context not available" in result.lower()
