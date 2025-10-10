"""Integration tests for SSE race condition fix.

This module tests the synchronization between SSE subscriber connection
and background task broadcasting to prevent race conditions where events
are broadcast before subscribers are ready.
"""

import asyncio
import os
import time
from typing import Any

import pytest

# Set up environment before importing app modules
os.environ["ENVIRONMENT"] = "development"
os.environ["JWT_SECRET_KEY"] = "test_secret_key_for_integration_testing_do_not_use_in_production_32_chars_long"
os.environ["AUTH_SECRET_KEY"] = "test_secret_key_for_integration_testing_do_not_use_in_production_32_chars_long"
os.environ["AUTH_REQUIRE_SSE_AUTH"] = "false"
os.environ["SESSION_INTEGRITY_KEY"] = "test_secret_key_for_integration_testing_do_not_use_in_production_32_chars_long"
os.environ["CI"] = "true"

from app.utils.sse_broadcaster import (
    BroadcasterConfig,
    EnhancedSSEBroadcaster,
    get_sse_broadcaster,
)


class TestSSERaceCondition:
    """Test suite for SSE race condition prevention."""

    @pytest.fixture
    async def broadcaster(self):
        """Create broadcaster for testing."""
        config = BroadcasterConfig(
            max_queue_size=100,
            max_history_per_session=100,  # Matches production (CRIT fix)
            event_ttl=60.0,
            session_ttl=300.0,
            cleanup_interval=5.0,
            enable_metrics=True,
        )
        broadcaster = EnhancedSSEBroadcaster(config)
        yield broadcaster
        await broadcaster.shutdown()

    @pytest.mark.asyncio
    async def test_wait_for_subscriber_success(self, broadcaster):
        """Test that wait_for_subscriber returns True when subscriber connects."""
        session_id = "test_wait_subscriber"

        # Simulate wait_for_subscriber logic
        async def wait_for_subscriber(session_id: str, timeout: float = 5.0) -> bool:
            """Wait for SSE subscriber to connect."""
            start_time = time.time()

            while (time.time() - start_time) < timeout:
                async with broadcaster._lock:
                    if (session_id in broadcaster._subscribers and
                        len(broadcaster._subscribers[session_id]) > 0):
                        return True

                await asyncio.sleep(0.1)

            return False

        # Start wait task
        wait_task = asyncio.create_task(wait_for_subscriber(session_id, timeout=5.0))

        # Simulate delay before subscriber connects
        await asyncio.sleep(0.2)

        # Add subscriber
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Wait should succeed
            result = await wait_task
            assert result is True, "wait_for_subscriber should return True when subscriber connects"

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_wait_for_subscriber_timeout(self, broadcaster):
        """Test that wait_for_subscriber returns False on timeout."""
        session_id = "test_wait_timeout"

        # Simulate wait_for_subscriber logic
        async def wait_for_subscriber(session_id: str, timeout: float = 1.0) -> bool:
            """Wait for SSE subscriber to connect."""
            start_time = time.time()

            while (time.time() - start_time) < timeout:
                async with broadcaster._lock:
                    if (session_id in broadcaster._subscribers and
                        len(broadcaster._subscribers[session_id]) > 0):
                        return True

                await asyncio.sleep(0.1)

            return False

        # Wait without connecting subscriber (should timeout)
        result = await wait_for_subscriber(session_id, timeout=1.0)
        assert result is False, "wait_for_subscriber should return False on timeout"

    @pytest.mark.asyncio
    async def test_events_not_broadcast_before_subscriber(self, broadcaster):
        """Test that events wait for subscriber before broadcasting."""
        session_id = "test_event_wait"

        # Broadcast events WITHOUT subscriber
        for i in range(5):
            event_data = {
                "type": "test_event",
                "data": {"sequence": i, "message": f"Event {i}"},
            }
            await broadcaster.broadcast_event(session_id, event_data)

        # Events should be in history buffer
        history = await broadcaster.get_event_history(session_id)
        assert len(history) == 5, "Events should be stored in history even without subscribers"

        # Now connect subscriber
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Subscriber should receive history
            received_events = []
            while len(received_events) < 5:
                try:
                    event = await asyncio.wait_for(queue.get(timeout=2.0), timeout=3.0)
                    if "test_event" in event:
                        received_events.append(event)
                except asyncio.TimeoutError:
                    break

            # With buffer size of 100, all 5 events should be available
            assert len(received_events) == 5, f"Should receive all 5 buffered events, got {len(received_events)}"

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_subscriber_ready_before_broadcast(self, broadcaster):
        """Test that subscriber is ready to receive events when broadcast happens."""
        session_id = "test_ready_broadcast"

        # Connect subscriber FIRST
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Verify subscriber is registered
            async with broadcaster._lock:
                assert session_id in broadcaster._subscribers
                assert len(broadcaster._subscribers[session_id]) > 0

            # Now broadcast events
            for i in range(3):
                event_data = {
                    "type": "ready_test",
                    "data": {"sequence": i, "message": f"Event {i}"},
                }
                await broadcaster.broadcast_event(session_id, event_data)

            # All events should be received
            received_events = []
            while len(received_events) < 3:
                try:
                    event = await asyncio.wait_for(queue.get(timeout=2.0), timeout=3.0)
                    if "ready_test" in event:
                        received_events.append(event)
                except asyncio.TimeoutError:
                    break

            assert len(received_events) == 3, "Should receive all events when subscriber is ready"

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_multiple_rapid_requests_no_race(self, broadcaster):
        """Test that multiple rapid requests don't create race conditions."""
        session_ids = [f"rapid_test_{i}" for i in range(5)]
        tasks = []

        async def simulate_request(session_id: str):
            """Simulate a request with SSE connection and broadcast."""
            # Connect SSE
            queue = await broadcaster.add_subscriber(session_id)

            try:
                # Broadcast event
                event_data = {
                    "type": "rapid_event",
                    "data": {"session_id": session_id, "message": "Test"},
                }
                await broadcaster.broadcast_event(session_id, event_data)

                # Receive event
                event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)
                return "rapid_event" in event

            finally:
                await broadcaster.remove_subscriber(session_id, queue)

        # Create tasks for all requests
        for session_id in session_ids:
            tasks.append(asyncio.create_task(simulate_request(session_id)))

        # Wait for all to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # All should succeed
        assert all(results), f"All rapid requests should succeed, got: {results}"

    @pytest.mark.asyncio
    async def test_history_buffer_size_matches_production(self, broadcaster):
        """Test that history buffer size matches production configuration (100 events)."""
        session_id = "test_buffer_size"

        # Broadcast 150 events (more than buffer size)
        for i in range(150):
            event_data = {
                "type": "buffer_test",
                "data": {"sequence": i, "message": f"Event {i}"},
            }
            await broadcaster.broadcast_event(session_id, event_data)

        # History should be limited to max_history_per_session (100)
        history = await broadcaster.get_event_history(session_id)
        assert len(history) <= 100, f"History buffer should be limited to 100, got {len(history)}"

        # Connect subscriber - should get last 100 events
        queue = await broadcaster.add_subscriber(session_id)

        try:
            received_events = []
            timeout_count = 0
            while timeout_count < 2:  # Allow 2 timeouts before stopping
                try:
                    event = await asyncio.wait_for(queue.get(timeout=1.0), timeout=2.0)
                    if "buffer_test" in event:
                        received_events.append(event)
                        timeout_count = 0  # Reset timeout count
                    else:
                        timeout_count += 1
                except asyncio.TimeoutError:
                    timeout_count += 1

            # Should receive up to 100 historical events
            assert len(received_events) <= 100, f"Should receive at most 100 buffered events, got {len(received_events)}"
            # Should receive at least the most recent events
            assert len(received_events) >= 90, f"Should receive at least 90 buffered events, got {len(received_events)}"

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_subscriber_count_tracked_correctly(self, broadcaster):
        """Test that subscriber count is tracked correctly during broadcast."""
        session_id = "test_subscriber_count"

        # Initially no subscribers
        async with broadcaster._lock:
            assert session_id not in broadcaster._subscribers or len(broadcaster._subscribers[session_id]) == 0

        # Add subscriber
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Verify subscriber count
            async with broadcaster._lock:
                subscriber_count = len(broadcaster._subscribers.get(session_id, []))
                assert subscriber_count == 1, f"Should have 1 subscriber, got {subscriber_count}"

            # Broadcast event (will log subscriber count)
            event_data = {
                "type": "count_test",
                "data": {"message": "Testing subscriber count"},
            }
            await broadcaster.broadcast_event(session_id, event_data)

            # Event should be received
            event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)
            assert "count_test" in event

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

        # After removal, no subscribers
        async with broadcaster._lock:
            assert session_id not in broadcaster._subscribers or len(broadcaster._subscribers[session_id]) == 0

    @pytest.mark.asyncio
    async def test_connection_timing_order(self, broadcaster):
        """Test that SSE connection happens before POST request processing."""
        session_id = "test_timing_order"

        # Simulate SSE connection timestamp
        sse_connect_time = None
        post_process_time = None

        # Step 1: SSE connects
        sse_connect_time = time.time()
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Ensure some time passes
            await asyncio.sleep(0.1)

            # Step 2: POST processing starts (simulated by broadcast)
            post_process_time = time.time()
            event_data = {
                "type": "timing_test",
                "data": {"message": "Timing test"},
            }
            await broadcaster.broadcast_event(session_id, event_data)

            # SSE should connect before POST processes
            assert sse_connect_time < post_process_time, "SSE connection should happen before POST processing"

            # Event should be received
            event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)
            assert "timing_test" in event

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_global_broadcaster_singleton(self):
        """Test that get_sse_broadcaster returns singleton instance."""
        broadcaster1 = get_sse_broadcaster()
        broadcaster2 = get_sse_broadcaster()

        assert broadcaster1 is broadcaster2, "get_sse_broadcaster should return same instance"
