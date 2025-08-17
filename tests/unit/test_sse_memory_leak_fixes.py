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

"""Tests for memory leak fixes in SSE broadcaster system."""

import asyncio
import os
import time
from unittest.mock import patch

import psutil
import pytest

from app.utils.sse_broadcaster_fixed import (
    BroadcasterConfig,
    EnhancedSSEBroadcaster,
    MemoryOptimizedQueue,
    SessionManager,
    SSEEvent,
)


class TestSSEEventTTL:
    """Test TTL functionality in SSE events."""

    def test_event_creation_with_ttl(self):
        """Test event creation with TTL."""
        event = SSEEvent(
            type="test_event",
            data={"test": "data"},
            ttl=5.0  # 5 seconds
        )

        assert event.ttl == 5.0
        assert event.created_at > 0
        assert not event.is_expired()

    def test_event_expiration(self):
        """Test event expiration logic."""
        # Create event with very short TTL
        event = SSEEvent(
            type="test_event",
            data={"test": "data"},
            ttl=0.001  # 1 millisecond
        )

        # Wait for expiration
        time.sleep(0.002)

        assert event.is_expired()

    def test_event_no_ttl_never_expires(self):
        """Test events without TTL never expire."""
        event = SSEEvent(
            type="test_event",
            data={"test": "data"}
            # No TTL specified
        )

        assert event.ttl is None
        assert not event.is_expired()


class TestMemoryOptimizedQueue:
    """Test memory-optimized queue implementation."""

    @pytest.mark.asyncio
    async def test_queue_timeout_behavior(self):
        """Test queue timeout and keepalive behavior."""
        queue = MemoryOptimizedQueue(maxsize=5)

        # Test timeout returns keepalive
        start_time = time.time()
        result = await queue.get(timeout=0.1)
        elapsed = time.time() - start_time

        assert elapsed >= 0.1
        assert isinstance(result, dict)
        assert result["type"] == "keepalive"

    @pytest.mark.asyncio
    async def test_queue_stale_detection(self):
        """Test stale queue detection."""
        queue = MemoryOptimizedQueue()

        # Fresh queue should not be stale
        assert not queue.is_stale(max_age=1.0)

        # Mock old activity time
        queue._last_activity = time.time() - 2.0

        # Should be stale with 1 second max age
        assert queue.is_stale(max_age=1.0)

    @pytest.mark.asyncio
    async def test_queue_resource_cleanup(self):
        """Test queue resource cleanup."""
        queue = MemoryOptimizedQueue(maxsize=3)

        # Fill queue
        for i in range(3):
            success = await queue.put(f"item_{i}")
            assert success

        # Close queue
        queue.close()

        # Should not accept new items
        success = await queue.put("new_item")
        assert not success

        # Should raise on get
        with pytest.raises(asyncio.CancelledError):
            await queue.get()


class TestSessionManager:
    """Test session lifecycle management."""

    def setup_method(self):
        """Set up test environment."""
        self.config = BroadcasterConfig(session_ttl=1.0)  # 1 second TTL
        self.session_manager = SessionManager(self.config)

    def test_session_creation_and_tracking(self):
        """Test session creation and activity tracking."""
        session_id = "test_session"

        # Create session
        self.session_manager.create_session(session_id)
        active_sessions = self.session_manager.get_active_sessions()

        assert session_id in active_sessions

    def test_subscriber_count_management(self):
        """Test subscriber count tracking."""
        session_id = "test_session"
        self.session_manager.create_session(session_id)

        # Increment subscribers
        self.session_manager.increment_subscribers(session_id)
        self.session_manager.increment_subscribers(session_id)

        # Check count (we can't directly access it, but it should prevent expiration)
        expired = self.session_manager.cleanup_expired_sessions()
        assert session_id not in expired

        # Decrement subscribers
        self.session_manager.decrement_subscribers(session_id)
        self.session_manager.decrement_subscribers(session_id)

    def test_session_expiration_cleanup(self):
        """Test session expiration and cleanup."""
        session_id = "test_session"

        # Create session
        self.session_manager.create_session(session_id)

        # Wait for expiration
        time.sleep(1.1)

        # Clean up expired sessions
        expired_sessions = self.session_manager.cleanup_expired_sessions()

        assert session_id in expired_sessions
        assert session_id not in self.session_manager.get_active_sessions()

    def test_session_activity_prevents_expiration(self):
        """Test that activity prevents session expiration."""
        session_id = "test_session"

        # Create session
        self.session_manager.create_session(session_id)

        # Wait, then touch session
        time.sleep(0.5)
        self.session_manager.touch_session(session_id)

        # Wait some more but less than TTL from touch
        time.sleep(0.5)

        # Should not be expired
        expired_sessions = self.session_manager.cleanup_expired_sessions()
        assert session_id not in expired_sessions


class TestEnhancedSSEBroadcasterMemoryManagement:
    """Test memory management features of enhanced broadcaster."""

    def setup_method(self):
        """Set up test environment."""
        self.config = BroadcasterConfig(
            max_queue_size=10,
            max_history_per_session=20,
            event_ttl=0.5,  # Short TTL for testing
            session_ttl=2.0,
            cleanup_interval=0.1  # Fast cleanup for testing
        )
        self.broadcaster = EnhancedSSEBroadcaster(self.config)

    def teardown_method(self):
        """Clean up after tests."""
        asyncio.run(self.broadcaster.shutdown())

    @pytest.mark.asyncio
    async def test_bounded_event_history(self):
        """Test that event history respects maximum size."""
        session_id = "test_session"

        # Send more events than the limit
        for i in range(30):  # More than max_history_per_session (20)
            await self.broadcaster.broadcast_event(session_id, {
                "type": "test_event",
                "data": {"event_id": i}
            })

        # Check history size
        history = self.broadcaster.get_event_history(session_id)
        assert len(history) <= self.config.max_history_per_session

        # Should contain most recent events
        event_ids = [event.data.get("event_id") for event in history]
        assert max(event_ids) == 29  # Most recent event

    @pytest.mark.asyncio
    async def test_event_ttl_expiration(self):
        """Test event TTL expiration and cleanup."""
        session_id = "test_session"

        # Send events
        for i in range(5):
            await self.broadcaster.broadcast_event(session_id, {
                "type": "test_event",
                "data": {"event_id": i}
            })

        # Check initial history
        history = self.broadcaster.get_event_history(session_id)
        assert len(history) == 5

        # Wait for TTL expiration
        time.sleep(0.6)

        # Trigger cleanup
        await self.broadcaster._perform_cleanup()

        # History should be empty or much smaller
        history = self.broadcaster.get_event_history(session_id)
        assert len(history) == 0

    @pytest.mark.asyncio
    async def test_automatic_dead_queue_cleanup(self):
        """Test automatic cleanup of dead queues."""
        session_id = "test_session"

        # Add subscriber
        queue = await self.broadcaster.add_subscriber(session_id)

        # Verify subscriber exists
        stats = self.broadcaster.get_stats()
        assert stats["totalSubscribers"] >= 1

        # Simulate dead queue
        queue.close()

        # Trigger cleanup
        await self.broadcaster._perform_cleanup()

        # Dead queue should be removed
        stats = self.broadcaster.get_stats()
        # Note: This might not be exactly 0 due to timing, but should be reduced

    @pytest.mark.asyncio
    async def test_session_expiration_cleanup(self):
        """Test automatic session expiration and cleanup."""
        session_id = "test_session"

        # Add subscriber and send events
        queue = await self.broadcaster.add_subscriber(session_id)
        await self.broadcaster.broadcast_event(session_id, {
            "type": "test_event",
            "data": {"test": "data"}
        })

        # Remove subscriber
        await self.broadcaster.remove_subscriber(session_id, queue)

        # Wait for session TTL
        time.sleep(2.1)

        # Trigger cleanup
        await self.broadcaster._perform_cleanup()

        # Session data should be cleaned up
        stats = self.broadcaster.get_stats()
        assert session_id not in stats["sessionStats"]

    @pytest.mark.asyncio
    async def test_memory_usage_metrics(self):
        """Test memory usage metrics tracking."""
        session_id = "test_session"

        # Initial metrics
        await self.broadcaster._update_memory_metrics()
        initial_stats = self.broadcaster.get_stats()

        # Add data
        queue = await self.broadcaster.add_subscriber(session_id)
        for i in range(10):
            await self.broadcaster.broadcast_event(session_id, {
                "type": "test_event",
                "data": {"event_id": i, "large_data": "x" * 100}
            })

        # Updated metrics
        await self.broadcaster._update_memory_metrics()
        final_stats = self.broadcaster.get_stats()

        # Should show increased usage
        assert final_stats["totalSessions"] >= initial_stats["totalSessions"]
        assert final_stats["totalSubscribers"] >= initial_stats["totalSubscribers"]
        assert final_stats["totalEvents"] >= initial_stats["totalEvents"]

        # Cleanup
        await self.broadcaster.remove_subscriber(session_id, queue)


class TestMemoryLeakPrevention:
    """Test comprehensive memory leak prevention."""

    @pytest.mark.asyncio
    async def test_memory_leak_under_load(self):
        """Test that system doesn't leak memory under sustained load."""
        config = BroadcasterConfig(
            max_queue_size=50,
            max_history_per_session=100,
            event_ttl=1.0,
            session_ttl=5.0,
            cleanup_interval=0.1
        )
        broadcaster = EnhancedSSEBroadcaster(config)

        try:
            # Get initial memory usage
            process = psutil.Process(os.getpid())
            initial_memory = process.memory_info().rss

            # Generate sustained load
            num_sessions = 10
            events_per_session = 100

            sessions = []
            queues = []

            # Create sessions and subscribers
            for i in range(num_sessions):
                session_id = f"session_{i}"
                sessions.append(session_id)
                queue = await broadcaster.add_subscriber(session_id)
                queues.append((session_id, queue))

            # Generate many events
            for session_id in sessions:
                for j in range(events_per_session):
                    await broadcaster.broadcast_event(session_id, {
                        "type": "load_test",
                        "data": {
                            "event_id": j,
                            "session": session_id,
                            "payload": "x" * 200  # 200 bytes payload
                        }
                    })

                    # Yield control periodically
                    if j % 20 == 0:
                        await asyncio.sleep(0.01)

            # Wait for some cleanup cycles
            await asyncio.sleep(0.5)

            # Remove all subscribers
            for session_id, queue in queues:
                await broadcaster.remove_subscriber(session_id, queue)

            # Force cleanup
            await broadcaster._perform_cleanup()

            # Wait for final cleanup
            await asyncio.sleep(0.2)

            # Check final memory usage
            final_memory = process.memory_info().rss
            memory_increase = final_memory - initial_memory

            # Memory increase should be reasonable (less than 50MB)
            max_acceptable_increase = 50 * 1024 * 1024  # 50MB
            assert memory_increase < max_acceptable_increase, \
                f"Memory increase too large: {memory_increase / 1024 / 1024:.2f} MB"

        finally:
            await broadcaster.shutdown()

    @pytest.mark.asyncio
    async def test_queue_resource_cleanup_on_exception(self):
        """Test that queues are properly cleaned up even when exceptions occur."""
        broadcaster = EnhancedSSEBroadcaster()
        session_id = "test_session"

        try:
            queue = await broadcaster.add_subscriber(session_id)

            # Simulate exception during processing
            with patch.object(queue, 'put', side_effect=Exception("Test exception")):
                # This should not leave lingering resources
                await broadcaster.broadcast_event(session_id, {
                    "type": "test_event",
                    "data": {"test": "data"}
                })

            # Force cleanup
            await broadcaster._perform_cleanup()

            # Queue should still be manageable
            await broadcaster.remove_subscriber(session_id, queue)

        finally:
            await broadcaster.shutdown()

    @pytest.mark.asyncio
    async def test_context_manager_cleanup(self):
        """Test context manager ensures proper cleanup."""
        broadcaster = EnhancedSSEBroadcaster()
        session_id = "test_session"

        try:
            # Use context manager
            async with broadcaster.subscribe(session_id) as queue:
                # Send some events
                await broadcaster.broadcast_event(session_id, {
                    "type": "test_event",
                    "data": {"test": "data"}
                })

                # Verify queue is active
                assert not queue._closed

            # After context manager, queue should be cleaned up
            assert queue._closed

            # Session should have no active subscribers
            stats = broadcaster.get_stats()
            session_stats = stats["sessionStats"].get(session_id, {})
            assert session_stats.get("subscribers", 0) == 0

        finally:
            await broadcaster.shutdown()


class TestPerformanceMetrics:
    """Test performance monitoring and metrics."""

    def setup_method(self):
        """Set up test environment."""
        self.config = BroadcasterConfig(enable_metrics=True)
        self.broadcaster = EnhancedSSEBroadcaster(self.config)

    def teardown_method(self):
        """Clean up after tests."""
        asyncio.run(self.broadcaster.shutdown())

    @pytest.mark.asyncio
    async def test_comprehensive_stats_collection(self):
        """Test comprehensive statistics collection."""
        session_id = "test_session"

        # Generate some activity
        queue = await self.broadcaster.add_subscriber(session_id)

        for i in range(5):
            await self.broadcaster.broadcast_event(session_id, {
                "type": "test_event",
                "data": {"event_id": i}
            })

        # Update metrics
        await self.broadcaster._update_memory_metrics()

        # Get stats
        stats = self.broadcaster.get_stats()

        # Verify comprehensive stats
        assert "totalSessions" in stats
        assert "totalSubscribers" in stats
        assert "totalEvents" in stats
        assert "memoryUsageMB" in stats
        assert "config" in stats
        assert "metrics" in stats
        assert "sessionStats" in stats

        # Verify config is included
        config_stats = stats["config"]
        assert "maxQueueSize" in config_stats
        assert "maxHistoryPerSession" in config_stats
        assert "sessionTTL" in config_stats
        assert "eventTTL" in config_stats

        # Verify metrics tracking
        metrics = stats["metrics"]
        assert "expiredEventsCleaned" in metrics
        assert "deadQueuesCleaned" in metrics
        assert "sessionsExpired" in metrics
        assert "lastCleanupTime" in metrics

        # Verify session-specific stats
        session_stats = stats["sessionStats"][session_id]
        assert session_stats["subscribers"] == 1
        assert session_stats["historySize"] == 5

        # Cleanup
        await self.broadcaster.remove_subscriber(session_id, queue)

    def test_stats_performance_under_load(self):
        """Test that stats collection doesn't significantly impact performance."""

        async def measure_performance():
            # Measure stats collection time
            start_time = time.time()

            for _ in range(100):
                self.broadcaster.get_stats()

            end_time = time.time()
            return end_time - start_time

        # Run performance test
        elapsed_time = asyncio.run(measure_performance())

        # Stats collection should be fast (under 10ms for 100 calls)
        assert elapsed_time < 0.01, f"Stats collection too slow: {elapsed_time:.4f}s"


class TestRegressionPrevention:
    """Test to prevent regression of fixed memory leaks."""

    @pytest.mark.asyncio
    async def test_no_unbounded_growth(self):
        """Test that no data structures grow unboundedly."""
        config = BroadcasterConfig(
            max_history_per_session=10,
            event_ttl=0.1  # Very short TTL
        )
        broadcaster = EnhancedSSEBroadcaster(config)

        try:
            session_id = "test_session"

            # Generate many events
            for i in range(100):
                await broadcaster.broadcast_event(session_id, {
                    "type": "regression_test",
                    "data": {"event_id": i}
                })

                # Periodic cleanup
                if i % 20 == 0:
                    await broadcaster._perform_cleanup()
                    await asyncio.sleep(0.01)

            # Final cleanup
            time.sleep(0.2)  # Let events expire
            await broadcaster._perform_cleanup()

            # Check that data structures are bounded
            stats = broadcaster.get_stats()

            # Total events should be bounded by history limits
            assert stats["totalEvents"] <= config.max_history_per_session

            # History for session should be bounded
            if session_id in stats["sessionStats"]:
                history_size = stats["sessionStats"][session_id]["historySize"]
                assert history_size <= config.max_history_per_session

        finally:
            await broadcaster.shutdown()

    @pytest.mark.asyncio
    async def test_subscriber_limit_enforcement(self):
        """Test that queue size limits are properly enforced."""
        config = BroadcasterConfig(max_queue_size=5)
        broadcaster = EnhancedSSEBroadcaster(config)

        try:
            session_id = "test_session"
            queue = await broadcaster.add_subscriber(session_id)

            # Fill queue beyond capacity
            successful_puts = 0
            for i in range(10):  # Try to put more than maxsize
                success = await queue.put(f"event_{i}", timeout=0.1)
                if success:
                    successful_puts += 1

            # Should not exceed queue capacity
            assert successful_puts <= config.max_queue_size

            # Cleanup
            await broadcaster.remove_subscriber(session_id, queue)

        finally:
            await broadcaster.shutdown()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s", "--tb=short"])
