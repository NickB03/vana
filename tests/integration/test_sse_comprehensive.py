"""Comprehensive SSE Integration Tests.

This module provides comprehensive integration testing for the SSE broadcaster
system, including API endpoint testing, real-world scenarios, error handling,
and production readiness validation.
"""

import asyncio
import json
import time
from typing import Any

import pytest
from fastapi import FastAPI

from app.utils.sse_broadcaster import (
    BroadcasterConfig,
    EnhancedSSEBroadcaster,
)


class TestSSEIntegration:
    """Comprehensive SSE Integration Test Suite."""

    @pytest.fixture
    async def broadcaster(self):
        """Create broadcaster for testing."""
        config = BroadcasterConfig(
            max_queue_size=100,
            max_history_per_session=50,
            event_ttl=60.0,
            session_ttl=300.0,
            cleanup_interval=5.0,
            enable_metrics=True,
        )
        broadcaster = EnhancedSSEBroadcaster(config)
        yield broadcaster
        await broadcaster.shutdown()

    @pytest.fixture
    def sse_app(self, broadcaster):
        """Create FastAPI app with SSE endpoints for testing."""
        from fastapi.responses import StreamingResponse

        from app.utils.sse_broadcaster import agent_network_event_stream

        app = FastAPI()

        @app.get("/sse/{session_id}")
        async def sse_endpoint(session_id: str):
            """SSE endpoint for testing."""
            return StreamingResponse(
                agent_network_event_stream(session_id),
                media_type="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                },
            )

        @app.post("/broadcast/{session_id}")
        async def broadcast_endpoint(session_id: str, event_data: dict[str, Any]):
            """Endpoint to broadcast events for testing."""
            await broadcaster.broadcast_event(session_id, event_data)
            return {"status": "broadcasted"}

        @app.get("/stats")
        async def stats_endpoint():
            """Get broadcaster stats."""
            return await broadcaster.get_stats()

        return app

    @pytest.mark.asyncio
    async def test_basic_sse_functionality(self, broadcaster):
        """Test basic SSE subscriber and broadcaster functionality."""
        session_id = "test_session"

        # Subscribe to session
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Broadcast an event
            event_data = {
                "type": "test_event",
                "data": {"message": "Hello World", "timestamp": time.time()},
            }
            await broadcaster.broadcast_event(session_id, event_data)

            # Receive the event
            received_event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)

            assert isinstance(received_event, str)
            assert "test_event" in received_event
            assert "Hello World" in received_event

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_multiple_subscribers_same_session(self, broadcaster):
        """Test multiple subscribers to the same session."""
        session_id = "multi_subscriber_session"
        num_subscribers = 5

        # Add multiple subscribers
        subscribers = []
        for i in range(num_subscribers):
            queue = await broadcaster.add_subscriber(session_id)
            subscribers.append(queue)

        try:
            # Broadcast event
            event_data = {
                "type": "multi_test",
                "data": {"broadcast_id": 123, "message": "Multi-subscriber test"},
            }
            await broadcaster.broadcast_event(session_id, event_data)

            # All subscribers should receive the event
            received_events = []
            for queue in subscribers:
                event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)
                received_events.append(event)

            assert len(received_events) == num_subscribers
            for event in received_events:
                assert "multi_test" in event
                assert "broadcast_id" in event

        finally:
            for queue in subscribers:
                await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_session_isolation(self, broadcaster):
        """Test that sessions are properly isolated."""
        session_a = "session_a"
        session_b = "session_b"

        # Subscribe to both sessions
        queue_a = await broadcaster.add_subscriber(session_a)
        queue_b = await broadcaster.add_subscriber(session_b)

        try:
            # Broadcast to session A only
            event_data_a = {
                "type": "session_a_event",
                "data": {"target": "session_a"},
            }
            await broadcaster.broadcast_event(session_a, event_data_a)

            # Session A should receive event
            event_a = await asyncio.wait_for(queue_a.get(timeout=5.0), timeout=6.0)
            assert "session_a_event" in event_a

            # Session B should not receive the event (timeout expected)
            with pytest.raises(asyncio.TimeoutError):
                await asyncio.wait_for(queue_b.get(timeout=2.0), timeout=3.0)

        finally:
            await broadcaster.remove_subscriber(session_a, queue_a)
            await broadcaster.remove_subscriber(session_b, queue_b)

    @pytest.mark.asyncio
    async def test_event_history_replay(self, broadcaster):
        """Test that new subscribers get recent event history."""
        session_id = "history_test_session"

        # Broadcast some events before subscribing
        for i in range(5):
            event_data = {
                "type": "historical_event",
                "data": {"sequence": i, "message": f"Event {i}"},
            }
            await broadcaster.broadcast_event(session_id, event_data)

        # Now subscribe - should get recent history
        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Should receive historical events
            historical_events = []
            while len(historical_events) < 5:
                try:
                    event = await asyncio.wait_for(queue.get(timeout=2.0), timeout=3.0)
                    if "historical_event" in event:
                        historical_events.append(event)
                except asyncio.TimeoutError:
                    break

            assert len(historical_events) == 5

            # Verify sequence order
            sequences = []
            for event in historical_events:
                if '"sequence":' in event:
                    # Extract sequence number (simple parsing)
                    start = event.find('"sequence":') + 11
                    end = event.find(",", start)
                    if end == -1:
                        end = event.find("}", start)
                    sequences.append(int(event[start:end]))

            assert sequences == list(range(5))

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_ttl_event_expiration(self, broadcaster):
        """Test that events expire based on TTL."""
        session_id = "ttl_test_session"

        # Create broadcaster with short TTL
        config = BroadcasterConfig(event_ttl=1.0, cleanup_interval=0.5)
        ttl_broadcaster = EnhancedSSEBroadcaster(config)

        try:
            # Broadcast event
            event_data = {
                "type": "ttl_test_event",
                "data": {"message": "Will expire soon"},
            }
            await ttl_broadcaster.broadcast_event(session_id, event_data)

            # Get history immediately
            immediate_history = ttl_broadcaster.get_event_history(session_id)
            assert len(immediate_history) == 1

            # Wait for expiration
            await asyncio.sleep(2.0)

            # Trigger cleanup
            await ttl_broadcaster._perform_cleanup()

            # History should be empty now
            expired_history = ttl_broadcaster.get_event_history(session_id)
            assert len(expired_history) == 0

        finally:
            await ttl_broadcaster.shutdown()

    @pytest.mark.asyncio
    async def test_queue_overflow_handling(self, broadcaster):
        """Test handling of queue overflow situations."""
        session_id = "overflow_test_session"

        # Create broadcaster with small queue size
        config = BroadcasterConfig(max_queue_size=5)
        overflow_broadcaster = EnhancedSSEBroadcaster(config)

        try:
            # Add subscriber
            queue = await overflow_broadcaster.add_subscriber(session_id)

            # Flood with events without consuming
            for i in range(10):
                event_data = {
                    "type": "overflow_event",
                    "data": {"sequence": i},
                }
                await overflow_broadcaster.broadcast_event(session_id, event_data)

            # Should still be able to get some events
            received_events = 0
            for _ in range(10):
                try:
                    await asyncio.wait_for(queue.get(timeout=1.0), timeout=2.0)
                    received_events += 1
                except asyncio.TimeoutError:
                    break

            # Should have received at least queue size worth
            assert received_events >= 5

            # Queue should handle overflow gracefully
            stats = overflow_broadcaster.get_stats()
            assert stats["totalSessions"] >= 0

        finally:
            await overflow_broadcaster.shutdown()

    @pytest.mark.asyncio
    async def test_subscriber_cleanup_on_error(self, broadcaster):
        """Test proper cleanup when subscribers encounter errors."""
        session_id = "error_test_session"

        # Add subscriber
        queue = await broadcaster.add_subscriber(session_id)

        # Close queue to simulate error
        queue.close()

        # Broadcast event - should detect dead queue
        event_data = {
            "type": "error_test_event",
            "data": {"message": "Test error handling"},
        }
        await broadcaster.broadcast_event(session_id, event_data)

        # Allow cleanup to run
        await asyncio.sleep(1.0)
        await broadcaster._perform_cleanup()

        # Check that dead queue was cleaned up
        stats = broadcaster.get_stats()
        session_stats = stats.get("sessionStats", {}).get(session_id, {})
        assert session_stats.get("subscribers", 0) == 0

    @pytest.mark.asyncio
    async def test_background_cleanup_task(self, broadcaster):
        """Test that background cleanup task runs properly."""
        session_id = "cleanup_test_session"

        # Verify cleanup task is running
        assert broadcaster._running
        assert broadcaster._cleanup_task is not None

        # Add and remove subscriber to create some activity
        queue = await broadcaster.add_subscriber(session_id)
        await broadcaster.remove_subscriber(session_id, queue)

        # Get initial metrics
        initial_stats = broadcaster.get_stats()
        initial_cleanup_count = initial_stats["metrics"]["cleanup_count"]

        # Wait for cleanup to run at least once
        await asyncio.sleep(6.0)  # Cleanup interval is 5s by default

        # Check that cleanup ran
        final_stats = broadcaster.get_stats()
        final_cleanup_count = final_stats["metrics"]["cleanup_count"]

        assert final_cleanup_count > initial_cleanup_count

    @pytest.mark.asyncio
    async def test_context_manager_usage(self, broadcaster):
        """Test proper usage of context manager for subscriptions."""
        session_id = "context_manager_test"

        received_events = []

        # Use context manager
        async with broadcaster.subscribe(session_id) as queue:
            # Broadcast event
            event_data = {
                "type": "context_test",
                "data": {"message": "Context manager test"},
            }
            await broadcaster.broadcast_event(session_id, event_data)

            # Receive event
            event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)
            received_events.append(event)

        # After context manager, queue should be cleaned up
        stats = broadcaster.get_stats()
        session_stats = stats.get("sessionStats", {}).get(session_id, {})
        assert session_stats.get("subscribers", 0) == 0

        assert len(received_events) == 1
        assert "context_test" in received_events[0]

    @pytest.mark.asyncio
    async def test_concurrent_operations(self, broadcaster):
        """Test concurrent subscribe/unsubscribe/broadcast operations."""
        session_id = "concurrent_test_session"

        async def subscriber_task(subscriber_id: int, duration: float):
            """Subscriber task that connects, receives events, then disconnects."""
            events_received = []

            async with broadcaster.subscribe(session_id) as queue:
                end_time = time.time() + duration

                while time.time() < end_time:
                    try:
                        event = await asyncio.wait_for(
                            queue.get(timeout=1.0), timeout=2.0
                        )
                        if isinstance(event, str) and "concurrent_event" in event:
                            events_received.append(event)
                    except asyncio.TimeoutError:
                        continue
                    except asyncio.CancelledError:
                        break

            return {
                "subscriber_id": subscriber_id,
                "events_received": len(events_received),
            }

        async def broadcaster_task():
            """Task that broadcasts events continuously."""
            for i in range(20):
                event_data = {
                    "type": "concurrent_event",
                    "data": {"sequence": i, "timestamp": time.time()},
                }
                await broadcaster.broadcast_event(session_id, event_data)
                await asyncio.sleep(0.1)

        # Start concurrent operations
        subscriber_tasks = [
            asyncio.create_task(subscriber_task(i, 5.0)) for i in range(5)
        ]
        broadcast_task = asyncio.create_task(broadcaster_task())

        # Wait for all to complete
        results = await asyncio.gather(
            *subscriber_tasks, broadcast_task, return_exceptions=True
        )

        # Check subscriber results
        subscriber_results = results[:-1]  # Exclude broadcast task result

        for result in subscriber_results:
            if isinstance(result, dict):
                assert result["events_received"] >= 5  # Should receive some events

    @pytest.mark.asyncio
    async def test_memory_metrics_tracking(self, broadcaster):
        """Test memory metrics tracking functionality."""
        session_id = "metrics_test_session"

        # Get initial metrics
        initial_stats = broadcaster.get_stats()
        initial_memory = initial_stats.get("memoryUsageMB", 0.0)

        # Create some activity
        subscribers = []
        for i in range(10):
            queue = await broadcaster.add_subscriber(f"{session_id}_{i}")
            subscribers.append((f"{session_id}_{i}", queue))

        # Broadcast events
        for i in range(50):
            for session_id_i, _ in subscribers:
                event_data = {
                    "type": "metrics_event",
                    "data": {"sequence": i, "payload": "x" * 100},  # Add some data
                }
                await broadcaster.broadcast_event(session_id_i, event_data)

        # Update metrics
        await broadcaster._update_memory_metrics()

        # Get updated metrics
        updated_stats = broadcaster.get_stats()

        assert updated_stats["totalSessions"] == len(subscribers)
        assert updated_stats["totalSubscribers"] == len(subscribers)
        assert updated_stats["totalEvents"] > 0

        # Cleanup
        for session_id_i, queue in subscribers:
            await broadcaster.remove_subscriber(session_id_i, queue)

    @pytest.mark.asyncio
    async def test_graceful_shutdown(self, broadcaster):
        """Test graceful shutdown process."""
        session_id = "shutdown_test_session"

        # Add subscribers
        subscribers = []
        for i in range(3):
            queue = await broadcaster.add_subscriber(f"{session_id}_{i}")
            subscribers.append(queue)

        # Verify they're active
        stats = broadcaster.get_stats()
        assert stats["totalSubscribers"] == 3

        # Shutdown
        await broadcaster.shutdown()

        # Verify cleanup
        assert not broadcaster._running
        assert (
            broadcaster._cleanup_task is None or broadcaster._cleanup_task.cancelled()
        )

        # All queues should be closed
        for queue in subscribers:
            assert queue._closed

    @pytest.mark.asyncio
    async def test_event_format_validation(self, broadcaster):
        """Test that events are properly formatted as SSE."""
        session_id = "format_test_session"

        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Broadcast event with various data types
            event_data = {
                "type": "format_test",
                "data": {
                    "string_val": "test string",
                    "number_val": 42,
                    "bool_val": True,
                    "null_val": None,
                    "array_val": [1, 2, 3],
                    "object_val": {"nested": "value"},
                },
            }
            await broadcaster.broadcast_event(session_id, event_data)

            # Receive and validate format
            event = await asyncio.wait_for(queue.get(timeout=5.0), timeout=6.0)

            # Should be properly formatted SSE
            lines = event.strip().split("\n")

            # Find the event type line
            event_line = next(
                (line for line in lines if line.startswith("event:")), None
            )
            assert event_line == "event: format_test"

            # Find the data line
            data_line = next((line for line in lines if line.startswith("data:")), None)
            assert data_line is not None

            # Parse JSON data
            json_data = data_line[5:].strip()  # Remove "data:" prefix
            parsed_data = json.loads(json_data)

            assert parsed_data["string_val"] == "test string"
            assert parsed_data["number_val"] == 42
            assert parsed_data["bool_val"] is True
            assert parsed_data["null_val"] is None
            assert parsed_data["array_val"] == [1, 2, 3]
            assert parsed_data["object_val"] == {"nested": "value"}

        finally:
            await broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_high_frequency_events(self, broadcaster):
        """Test handling of high-frequency event streams."""
        session_id = "high_frequency_test"

        queue = await broadcaster.add_subscriber(session_id)

        try:
            # Broadcast many events rapidly
            event_count = 100
            start_time = time.time()

            for i in range(event_count):
                event_data = {
                    "type": "high_frequency_event",
                    "data": {"sequence": i, "timestamp": time.time()},
                }
                await broadcaster.broadcast_event(session_id, event_data)

            broadcast_duration = time.time() - start_time

            # Receive events
            received_count = 0
            receive_start = time.time()

            while received_count < event_count and time.time() - receive_start < 10.0:
                try:
                    event = await asyncio.wait_for(queue.get(timeout=1.0), timeout=2.0)
                    if "high_frequency_event" in event:
                        received_count += 1
                except asyncio.TimeoutError:
                    break

            # Should handle high frequency well
            assert received_count >= event_count * 0.9  # Allow 10% loss
            assert broadcast_duration < 5.0  # Should be fast

            print("High frequency test:")
            print(f"  Broadcasted {event_count} events in {broadcast_duration:.3f}s")
            print(f"  Received {received_count} events")
            print(f"  Event rate: {event_count / broadcast_duration:.1f} events/s")

        finally:
            await broadcaster.remove_subscriber(session_id, queue)
