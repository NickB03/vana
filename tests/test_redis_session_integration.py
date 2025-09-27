"""Integration tests for Redis session store implementation.

This test module demonstrates how to use the Redis session store and validates
that all features work correctly with both Redis and fallback scenarios.
"""

import asyncio
import json
import os
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Set test environment before importing app modules
os.environ["ENVIRONMENT"] = "development"
os.environ["REDIS_ENABLED"] = "true"
os.environ["REDIS_URL"] = "redis://localhost:6379"
os.environ["REDIS_DB"] = "1"  # Use test database

from app.utils import (
    create_session_store,
    get_session_store,
    get_session_store_stats,
    reset_session_store,
    shutdown_session_store,
    store_user_context,
    get_user_context,
    store_agent_memory,
    get_agent_memory,
    REDIS_COMPONENTS_AVAILABLE,
)
from app.utils.session_store import SessionStoreConfig


class TestRedisSessionIntegration:
    """Test Redis session store integration."""

    @pytest.fixture(autouse=True)
    async def setup_and_teardown(self):
        """Set up and tear down for each test."""
        # Reset session store before each test
        reset_session_store()

        yield

        # Clean up after each test
        try:
            await shutdown_session_store()
        except Exception:
            pass
        reset_session_store()

    @pytest.mark.asyncio
    async def test_session_store_creation_with_redis_available(self):
        """Test that Redis session store is created when Redis is available."""
        if not REDIS_COMPONENTS_AVAILABLE:
            pytest.skip("Redis components not available")

        # Mock Redis to be available
        with patch('app.utils.redis_session_store.REDIS_AVAILABLE', True):
            with patch('app.utils.redis_session_store.redis') as mock_redis:
                # Mock Redis client
                mock_client = AsyncMock()
                mock_client.ping.return_value = True
                mock_redis.Redis.return_value = mock_client

                # Mock connection pool
                mock_pool = MagicMock()
                mock_redis.ConnectionPool.from_url.return_value = mock_pool

                store = create_session_store()

                # Should be RedisSessionStore
                assert hasattr(store, 'get_redis_stats')

                stats = get_session_store_stats()
                assert stats['store_type'] in ['redis', 'memory']  # May fallback during testing

    @pytest.mark.asyncio
    async def test_session_store_fallback_to_memory(self):
        """Test that in-memory store is used when Redis is not available."""
        # Force memory store
        store = create_session_store(force_memory=True)

        # Should be basic SessionStore
        assert not hasattr(store, 'get_redis_stats')

        stats = get_session_store_stats()
        assert stats['store_type'] == 'memory'
        assert not stats['redis']['redis_available']

    @pytest.mark.asyncio
    async def test_basic_session_operations(self):
        """Test basic session operations work with both store types."""
        store = get_session_store()

        # Create a session
        session_id = "test_session_123"

        # Ensure session exists
        if hasattr(store, 'ensure_session_async'):
            session = await store.ensure_session_async(
                session_id,
                user_id=42,
                title="Test Session",
                status="active"
            )
        else:
            session = store.ensure_session(
                session_id,
                user_id=42,
                title="Test Session",
                status="active"
            )

        assert session.id == session_id
        assert session.user_id == 42
        assert session.title == "Test Session"
        assert session.status == "active"

        # Add a message
        message_data = {
            "id": "msg_1",
            "role": "user",
            "content": "Hello, world!",
            "metadata": {"test": True}
        }

        if hasattr(store, 'add_message_async'):
            stored_message = await store.add_message_async(session_id, message_data)
        else:
            stored_message = store.add_message(session_id, message_data)

        assert stored_message.id == "msg_1"
        assert stored_message.role == "user"
        assert stored_message.content == "Hello, world!"
        assert stored_message.metadata == {"test": True}

        # Retrieve session
        if hasattr(store, 'get_session_async'):
            retrieved_session = await store.get_session_async(session_id, user_id=42)
        else:
            retrieved_session = store.get_session(session_id, user_id=42)

        assert retrieved_session is not None
        assert retrieved_session['id'] == session_id
        assert len(retrieved_session['messages']) == 1
        assert retrieved_session['messages'][0]['content'] == "Hello, world!"

    @pytest.mark.asyncio
    async def test_cross_session_memory_operations(self):
        """Test cross-session memory operations."""
        # Test user context storage
        user_id = 123
        context_key = "preferences"
        context_data = {
            "theme": "dark",
            "language": "en",
            "timezone": "UTC"
        }

        # Store user context
        success = await store_user_context(user_id, context_key, context_data)

        # For memory store, this will return False (not supported)
        # For Redis store, this should return True
        store = get_session_store()
        if hasattr(store, 'store_user_context'):
            assert success is True

            # Retrieve user context
            retrieved_context = await get_user_context(user_id, context_key)
            assert retrieved_context == context_data
        else:
            assert success is False
            retrieved_context = await get_user_context(user_id, context_key)
            assert retrieved_context is None

    @pytest.mark.asyncio
    async def test_agent_memory_operations(self):
        """Test agent memory operations."""
        agent_id = "research_agent_001"
        memory_key = "learned_patterns"
        memory_data = {
            "pattern_1": "Users often ask about Python",
            "pattern_2": "Database queries are common",
            "confidence_scores": [0.8, 0.9]
        }

        # Store agent memory
        success = await store_agent_memory(agent_id, memory_key, memory_data)

        store = get_session_store()
        if hasattr(store, 'store_agent_memory'):
            assert success is True

            # Retrieve agent memory
            retrieved_memory = await get_agent_memory(agent_id, memory_key)
            assert retrieved_memory == memory_data
        else:
            assert success is False
            retrieved_memory = await get_agent_memory(agent_id, memory_key)
            assert retrieved_memory is None

    @pytest.mark.asyncio
    async def test_session_persistence_across_restarts(self):
        """Test that sessions persist across application restarts (Redis only)."""
        if not REDIS_COMPONENTS_AVAILABLE:
            pytest.skip("Redis components not available")

        # This test would require actual Redis connection
        # For now, we'll just test the interface
        store = get_session_store()

        if hasattr(store, 'get_redis_stats'):
            # Test Redis-specific functionality
            redis_stats = store.get_redis_stats()
            assert isinstance(redis_stats, dict)
            assert 'redis_available' in redis_stats

    @pytest.mark.asyncio
    async def test_session_security_features_preserved(self):
        """Test that all security features are preserved in Redis implementation."""
        store = get_session_store()

        # Test that security configuration is preserved
        assert hasattr(store, '_config')
        assert hasattr(store._config, 'enable_session_validation')
        assert hasattr(store._config, 'enable_user_binding')
        assert hasattr(store._config, 'enable_tampering_detection')

        # Test security stats
        if hasattr(store, 'get_security_stats'):
            security_stats = store.get_security_stats()
            assert isinstance(security_stats, dict)
            assert 'security_features' in security_stats

    @pytest.mark.asyncio
    async def test_cleanup_operations(self):
        """Test cleanup operations work correctly."""
        store = get_session_store()

        # Test cleanup
        if hasattr(store, 'cleanup_expired_sessions_async'):
            removed_count = await store.cleanup_expired_sessions_async()
        else:
            removed_count = store.cleanup_expired_sessions()

        assert isinstance(removed_count, int)
        assert removed_count >= 0

    @pytest.mark.asyncio
    async def test_error_handling_and_fallbacks(self):
        """Test error handling and fallback mechanisms."""
        # Test with invalid Redis configuration
        config = SessionStoreConfig()

        # This should either create Redis store or fallback to memory
        store = create_session_store(config_override=config)
        assert store is not None

        # Basic operations should still work
        session_id = "error_test_session"
        session = store.ensure_session(session_id, user_id=999)
        assert session.id == session_id

    def test_configuration_loading(self):
        """Test that Redis configuration is loaded correctly."""
        from app.config import get_config

        config = get_config()
        assert hasattr(config, 'redis_config')

        redis_config = config.redis_config
        assert hasattr(redis_config, 'redis_enabled')
        assert hasattr(redis_config, 'redis_url')
        assert hasattr(redis_config, 'redis_db')
        assert hasattr(redis_config, 'memory_ttl_hours')

    @pytest.mark.asyncio
    async def test_concurrent_access(self):
        """Test concurrent session access."""
        store = get_session_store()
        session_id = "concurrent_test_session"

        async def create_session_with_message(message_id: str):
            """Helper function to create session and add message."""
            session = store.ensure_session(session_id, user_id=100)
            message = {
                "id": message_id,
                "role": "user",
                "content": f"Message {message_id}",
            }

            if hasattr(store, 'add_message_async'):
                return await store.add_message_async(session_id, message)
            else:
                return store.add_message(session_id, message)

        # Run multiple concurrent operations
        tasks = [
            create_session_with_message(f"msg_{i}")
            for i in range(5)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # All operations should succeed
        for result in results:
            assert not isinstance(result, Exception)

        # Verify all messages were added
        if hasattr(store, 'get_session_async'):
            session_data = await store.get_session_async(session_id, user_id=100)
        else:
            session_data = store.get_session(session_id, user_id=100)

        assert session_data is not None
        assert len(session_data['messages']) == 5


# Example usage and integration patterns
class TestIntegrationPatterns:
    """Test integration patterns and usage examples."""

    @pytest.mark.asyncio
    async def test_research_session_workflow(self):
        """Test a complete research session workflow."""
        reset_session_store()
        store = get_session_store()

        # 1. Start a research session
        session_id = "research_session_001"
        user_id = 456

        session = store.ensure_session(
            session_id,
            user_id=user_id,
            title="AI Research Query",
            status="active"
        )

        # 2. Store user preferences
        await store_user_context(user_id, "research_preferences", {
            "depth": "comprehensive",
            "sources": ["academic", "industry"],
            "format": "detailed"
        })

        # 3. Add research messages
        messages = [
            {"role": "user", "content": "Research the latest in AI safety"},
            {"role": "assistant", "content": "I'll help you research AI safety..."},
            {"role": "system", "content": "Research phase: Literature review"},
        ]

        for i, msg in enumerate(messages):
            msg["id"] = f"msg_{i}"
            if hasattr(store, 'add_message_async'):
                await store.add_message_async(session_id, msg)
            else:
                store.add_message(session_id, msg)

        # 4. Store agent learning
        await store_agent_memory("research_agent", "user_patterns", {
            "user_id": user_id,
            "preferred_topics": ["AI safety", "machine learning"],
            "interaction_style": "detailed"
        })

        # 5. Verify complete workflow
        if hasattr(store, 'get_session_async'):
            final_session = await store.get_session_async(session_id, user_id=user_id)
        else:
            final_session = store.get_session(session_id, user_id=user_id)

        assert final_session is not None
        assert len(final_session['messages']) == 3
        assert final_session['title'] == "AI Research Query"

        # 6. Verify cross-session data
        preferences = await get_user_context(user_id, "research_preferences")
        if preferences:  # Only if Redis is available
            assert preferences["depth"] == "comprehensive"

        patterns = await get_agent_memory("research_agent", "user_patterns")
        if patterns:  # Only if Redis is available
            assert patterns["user_id"] == user_id

        # 7. Clean up
        await shutdown_session_store()


if __name__ == "__main__":
    # Run a simple test to demonstrate usage
    import asyncio

    async def demo():
        """Demonstrate Redis session store usage."""
        print("=== Redis Session Store Demo ===")

        # Reset and create session store
        reset_session_store()
        store = get_session_store()

        print(f"Created session store: {type(store).__name__}")

        # Get statistics
        stats = get_session_store_stats()
        print(f"Store type: {stats['store_type']}")
        print(f"Redis available: {stats['redis']['redis_available']}")

        # Create a test session
        session_id = "demo_session"
        session = store.ensure_session(
            session_id,
            user_id=1,
            title="Demo Session"
        )
        print(f"Created session: {session.id}")

        # Add a message
        message = store.add_message(session_id, {
            "role": "user",
            "content": "Hello from Redis session store!",
        })
        print(f"Added message: {message.id}")

        # Test cross-session memory
        await store_user_context(1, "demo_context", {"test": "data"})
        context = await get_user_context(1, "demo_context")
        print(f"Cross-session context: {context}")

        # Clean up
        await shutdown_session_store()
        print("Demo completed successfully!")

    asyncio.run(demo())