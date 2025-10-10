"""SSE timing validation tests.

This module validates the exact timing requirements for SSE connections
to ensure the race condition fix works correctly.
"""

import asyncio
import os
import time
from datetime import datetime

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
)


class TestSSETiming:
    """Test suite for SSE timing validation."""

    @pytest.fixture
    async def broadcaster(self):
        """Create broadcaster for testing."""
        config = BroadcasterConfig(
            max_queue_size=100,
            max_history_per_session=100,
            event_ttl=60.0,
            session_ttl=300.0,
            cleanup_interval=5.0,
            enable_metrics=True,
        )
        broadcaster = EnhancedSSEBroadcaster(config)
        yield broadcaster
        await broadcaster.shutdown()

    @pytest.mark.asyncio
    async def test_sse_connection_before_post(self, broadcaster):
        """Test that SSE connection establishes before POST request processing."""
        session_id = "test_timing_sse_first"

        # Track timestamps
        sse_connect_time = None
        post_process_time = None

        # Step 1: SSE connects (simulated)
        sse_connect_time = time.time()
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Ensure some time passes (simulating network delay)
            await asyncio.sleep(0.1)

            # Step 2: POST processing (simulated by broadcast)
            post_process_time = time.time()
            event_data = {
                "type": "test_event",
                "data": {"message": "POST processing"},
            }
            await broadcaster.broadcast_event(session_id, event_data)

            # Verify timing
            assert sse_connect_time < post_process_time, \
                f"SSE connection ({sse_connect_time}) should happen before POST ({post_process_time})"

            # Calculate time difference (should be at least 100ms based on sleep)
            time_diff = post_process_time - sse_connect_time
            assert time_diff >= 0.09, \
                f"Time difference should be at least 90ms, got {time_diff*1000:.1f}ms"

            # Verify event received
            event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)
            assert "test_event" in event

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_subscriber_ready_within_timeout(self, broadcaster):
        """Test that subscriber becomes ready within acceptable timeout."""
        session_id = "test_timeout_ready"

        # Measure time to add subscriber
        start_time = time.time()
        queue = await broadcaster.add_subscriber(session_id)
        subscriber_ready_time = time.time() - start_time

        try:
            # Should be very fast (< 100ms)
            assert subscriber_ready_time < 0.1, \
                f"Subscriber should be ready in < 100ms, took {subscriber_ready_time*1000:.1f}ms"

            # Verify subscriber is actually ready
            async with broadcaster._lock:
                assert session_id in broadcaster._subscribers
                assert len(broadcaster._subscribers[session_id]) == 1

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_event_broadcast_latency(self, broadcaster):
        """Test event broadcast latency from broadcast to receive."""
        session_id = "test_latency"

        # Connect subscriber
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Measure broadcast to receive time
            broadcast_start = time.time()

            event_data = {
                "type": "latency_test",
                "data": {
                    "message": "Latency test",
                    "timestamp": datetime.now().isoformat(),
                },
            }
            await broadcaster.broadcast_event(session_id, event_data)

            # Receive event
            event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)
            receive_time = time.time()

            latency = (receive_time - broadcast_start) * 1000  # Convert to ms

            # Latency should be very low (< 100ms)
            assert latency < 100, f"Broadcast latency should be < 100ms, got {latency:.1f}ms"

            # Verify event content
            assert "latency_test" in event

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_wait_for_subscriber_timing(self, broadcaster):
        """Test timing of wait_for_subscriber function."""
        session_id = "test_wait_timing"

        async def wait_for_subscriber(session_id: str, timeout: float = 5.0) -> tuple[bool, float]:
            """Wait for subscriber and return result with time taken."""
            start_time = time.time()

            while (time.time() - start_time) < timeout:
                async with broadcaster._lock:
                    if (session_id in broadcaster._subscribers and
                        len(broadcaster._subscribers[session_id]) > 0):
                        wait_time = time.time() - start_time
                        return True, wait_time

                await asyncio.sleep(0.1)

            wait_time = time.time() - start_time
            return False, wait_time

        # Test 1: Subscriber connects immediately
        queue1 = await broadcaster.add_subscriber(session_id)
        try:
            result, wait_time = await wait_for_subscriber(session_id, timeout=5.0)
            assert result is True, "Should find subscriber immediately"
            assert wait_time < 0.2, f"Should find subscriber in < 200ms, took {wait_time*1000:.1f}ms"
        finally:
            await broadcaster.remove_subscriber(session_id, queue1)

        # Test 2: Subscriber connects after delay
        session_id2 = "test_wait_timing_delayed"
        wait_task = asyncio.create_task(wait_for_subscriber(session_id2, timeout=5.0))

        # Wait 500ms then connect
        await asyncio.sleep(0.5)
        queue2 = await broadcaster.add_subscriber(session_id2)

        try:
            result, wait_time = await wait_task
            assert result is True, "Should find delayed subscriber"
            assert 0.4 < wait_time < 1.0, \
                f"Wait time should be 400-1000ms, got {wait_time*1000:.1f}ms"
        finally:
            await broadcaster.remove_subscriber(session_id2, queue2)

    @pytest.mark.asyncio
    async def test_frontend_wait_simulation(self, broadcaster):
        """Simulate the frontend wait logic from message-handlers.ts."""
        session_id = "test_frontend_wait"

        # Simulate frontend's SSE connection wait
        async def frontend_wait_for_connection(max_wait_ms: int = 5000):
            """Simulate frontend waiting for SSE connection."""
            start_time = time.time()
            is_connected = False

            while not is_connected and ((time.time() - start_time) * 1000) < max_wait_ms:
                # Check if connected (simulated)
                async with broadcaster._lock:
                    is_connected = (session_id in broadcaster._subscribers and
                                  len(broadcaster._subscribers[session_id]) > 0)

                if not is_connected:
                    await asyncio.sleep(0.1)  # Poll every 100ms

            wait_time = (time.time() - start_time) * 1000
            return is_connected, wait_time

        # Test: Connect subscriber then wait
        queue = await broadcaster.add_subscriber(session_id)

        try:
            is_connected, wait_time = await frontend_wait_for_connection(max_wait_ms=5000)

            assert is_connected, "Frontend should detect connection"
            assert wait_time < 500, f"Frontend should detect connection quickly, took {wait_time:.1f}ms"

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_buffer_time_after_connection(self, broadcaster):
        """Test the 200ms buffer time after SSE connection (from SOLUTION.md)."""
        session_id = "test_buffer_time"

        # Connect subscriber
        connection_time = time.time()
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Wait 200ms buffer (as per frontend fix)
            await asyncio.sleep(0.2)
            buffer_end_time = time.time()

            # Now broadcast event
            event_data = {
                "type": "buffer_test",
                "data": {"message": "After buffer"},
            }
            await broadcaster.broadcast_event(session_id, event_data)

            # Verify buffer time
            buffer_duration = (buffer_end_time - connection_time) * 1000
            assert 190 <= buffer_duration <= 250, \
                f"Buffer time should be ~200ms, got {buffer_duration:.1f}ms"

            # Event should be received
            event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)
            assert "buffer_test" in event

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_concurrent_timing_accuracy(self, broadcaster):
        """Test timing accuracy with concurrent operations."""
        num_sessions = 5
        results = []

        async def timed_operation(session_id: str):
            """Perform timed SSE connection and broadcast."""
            # Connect
            connect_start = time.time()
            queue = await broadcaster.add_subscriber(session_id)
            connect_time = time.time() - connect_start

            try:
                # Broadcast
                broadcast_start = time.time()
                event_data = {
                    "type": "timing_test",
                    "data": {"session_id": session_id},
                }
                await broadcaster.broadcast_event(session_id, event_data)

                # Receive
                event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)
                total_time = time.time() - connect_start

                return {
                    "session_id": session_id,
                    "connect_time": connect_time * 1000,
                    "total_time": total_time * 1000,
                    "success": "timing_test" in event,
                }
            finally:
                await broadcaster.remove_subscriber(session_id, queue)

        # Run concurrent operations
        tasks = [
            asyncio.create_task(timed_operation(f"concurrent_{i}"))
            for i in range(num_sessions)
        ]
        results = await asyncio.gather(*tasks)

        # All should succeed
        assert all(r["success"] for r in results), "All concurrent operations should succeed"

        # All should complete reasonably fast
        for result in results:
            assert result["connect_time"] < 100, \
                f"Connect time should be < 100ms, got {result['connect_time']:.1f}ms"
            assert result["total_time"] < 500, \
                f"Total time should be < 500ms, got {result['total_time']:.1f}ms"

    @pytest.mark.asyncio
    async def test_history_replay_timing(self, broadcaster):
        """Test timing of history replay to new subscribers."""
        session_id = "test_history_timing"

        # Broadcast 50 events without subscriber
        for i in range(50):
            event_data = {
                "type": "history_event",
                "data": {"sequence": i},
            }
            await broadcaster.broadcast_event(session_id, event_data)

        # Now connect and measure history replay time
        replay_start = time.time()
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Count received historical events
            historical_count = 0
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(timeout=1.0), timeout=2.0)
                    if "history_event" in event:
                        historical_count += 1
                except asyncio.TimeoutError:
                    break

            replay_time = (time.time() - replay_start) * 1000

            # Should replay all 50 events
            assert historical_count == 50, \
                f"Should replay 50 events, got {historical_count}"

            # Replay should be reasonably fast (< 5 seconds)
            assert replay_time < 5000, \
                f"History replay should be < 5s, took {replay_time:.1f}ms"

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_keepalive_timing(self, broadcaster):
        """Test keepalive event timing (30 second timeout)."""
        session_id = "test_keepalive"

        # Connect subscriber
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Wait for keepalive (should arrive within 30 seconds)
            # We'll use a shorter timeout for the test
            try:
                event = await asyncio.wait_for(queue.get(timeout=30.0), timeout=31.0)

                # Should receive either a keepalive or timeout
                # The queue.get() with timeout=30.0 should return a keepalive dict
                if isinstance(event, dict):
                    assert event.get("type") == "keepalive", "Should receive keepalive event"
                else:
                    # Or regular event string (which is also valid)
                    assert isinstance(event, str), "Should receive event string"

            except asyncio.TimeoutError:
                pytest.fail("Should receive keepalive within 30 seconds")

        finally:
            await broadcaster.remove_subscriber(session_id, queue)
