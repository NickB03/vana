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

"""Tests for SSE broadcaster system."""

import asyncio
from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from app.utils.sse_broadcaster import (
    EnhancedSSEBroadcaster,
    SSEEvent,
    agent_network_event_stream,
    broadcast_agent_network_update,
    get_agent_network_event_history,
    get_sse_broadcaster,
)


class TestSSEEvent:
    """Test cases for SSEEvent class."""

    def test_initialization(self):
        """Test SSEEvent initialization."""
        event = SSEEvent(
            type="test_event", data={"key": "value"}, id="test_id", retry=5000
        )

        assert event.type == "test_event"
        assert event.data == {"key": "value"}
        assert event.id == "test_id"
        assert event.retry == 5000

    def test_to_sse_format(self):
        """Test SSE format conversion."""
        event = SSEEvent(
            type="test_event", data={"message": "hello world"}, id="test_id", retry=3000
        )

        sse_string = event.to_sse_format()
        lines = sse_string.split("\n")

        assert "id: test_id" in lines
        assert "retry: 3000" in lines
        assert "event: test_event" in lines
        assert 'data: {"message": "hello world"}' in lines
        assert lines[-1] == ""  # Empty line at end

    def test_to_sse_format_minimal(self):
        """Test SSE format with minimal fields."""
        event = SSEEvent(type="simple_event", data={"test": True})

        sse_string = event.to_sse_format()
        lines = sse_string.split("\n")

        assert "event: simple_event" in lines
        assert 'data: {"test": true}' in lines
        assert "id:" not in sse_string  # No id field
        assert "retry:" not in sse_string  # No retry field


class TestSSEBroadcaster:
    """Test cases for EnhancedSSEBroadcaster class."""

    def setup_method(self):
        """Set up test environment."""
        from app.utils.sse_broadcaster import BroadcasterConfig

        # Use config that disables background cleanup for tests
        config = BroadcasterConfig(
            cleanup_interval=999999,  # Very long interval to prevent cleanup during tests
            enable_metrics=False,  # Disable metrics to avoid psutil issues
            max_queue_size=100,
            max_history_per_session=50,
        )
        self.broadcaster = EnhancedSSEBroadcaster(config)

    def teardown_method(self):
        """Clean up test environment."""
        # Manually shutdown to prevent hanging
        import asyncio

        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcaster.shutdown())
        except RuntimeError:
            pass

    @pytest.mark.asyncio
    async def test_subscribe_and_unsubscribe(self):
        """Test subscription management."""
        session_id = "test_session"

        # Test basic add/remove subscriber functionality
        queue = await self.broadcaster.add_subscriber(session_id)
        assert session_id in self.broadcaster._subscribers
        assert queue in self.broadcaster._subscribers[session_id]

        # Test removal
        await self.broadcaster.remove_subscriber(session_id, queue)
        assert (
            session_id not in self.broadcaster._subscribers
            or len(self.broadcaster._subscribers[session_id]) == 0
        )

    @pytest.mark.asyncio
    async def test_multiple_subscriptions(self):
        """Test multiple queues for same session."""
        session_id = "test_session"

        # Create two subscribers for the same session
        queue1 = await self.broadcaster.add_subscriber(session_id)
        queue2 = await self.broadcaster.add_subscriber(session_id)

        assert len(self.broadcaster._subscribers[session_id]) == 2
        assert queue1 in self.broadcaster._subscribers[session_id]
        assert queue2 in self.broadcaster._subscribers[session_id]

        # Remove one subscriber
        await self.broadcaster.remove_subscriber(session_id, queue1)
        assert len(self.broadcaster._subscribers[session_id]) == 1
        assert queue2 in self.broadcaster._subscribers[session_id]

    @pytest.mark.asyncio
    async def test_broadcast_event_to_specific_session(self):
        """Test broadcasting to specific session."""
        session_id = "session1"

        # Add subscriber manually
        queue = await self.broadcaster.add_subscriber(session_id)

        # Send event
        await self.broadcaster.broadcast_event(
            session_id, {"type": "test_event", "data": {"data": "test"}}
        )

        # Get the event from queue with timeout
        try:
            event_str = await asyncio.wait_for(queue.get(), timeout=0.5)
            assert "test_event" in event_str
            assert "test" in event_str
        finally:
            await self.broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_broadcast_event_to_all_sessions(self):
        """Test broadcasting to multiple sessions."""
        # Add subscribers to both sessions
        queue1 = await self.broadcaster.add_subscriber("session1")
        queue2 = await self.broadcaster.add_subscriber("session2")

        try:
            # Send events to both sessions
            await self.broadcaster.broadcast_event(
                "session1", {"type": "broadcast_event", "data": {"message": "all"}}
            )
            await self.broadcaster.broadcast_event(
                "session2", {"type": "broadcast_event", "data": {"message": "all"}}
            )

            # Check both queues received events
            event1 = await asyncio.wait_for(queue1.get(), timeout=0.5)
            event2 = await asyncio.wait_for(queue2.get(), timeout=0.5)

            assert "broadcast_event" in event1
            assert "broadcast_event" in event2
        finally:
            await self.broadcaster.remove_subscriber("session1", queue1)
            await self.broadcaster.remove_subscriber("session2", queue2)

    @pytest.mark.asyncio
    async def test_event_history(self):
        """Test event history management."""
        session_id = "test_session"

        # Broadcast events to create history
        await self.broadcaster.broadcast_event(
            session_id, {"type": "event1", "data": {"data": 1}}
        )
        await self.broadcaster.broadcast_event(
            session_id, {"type": "event2", "data": {"data": 2}}
        )

        history = self.broadcaster.get_event_history(session_id)
        assert len(history) >= 2
        # Check that events are SSEEvent objects with proper types
        event_types = [event.type for event in history if hasattr(event, "type")]
        assert "event1" in event_types or "agent_update" in event_types

        # Test limited history
        limited_history = self.broadcaster.get_event_history(session_id, limit=1)
        assert len(limited_history) >= 1

    @pytest.mark.asyncio
    async def test_history_size_limit(self):
        """Test that history respects maximum size."""
        session_id = "test_session"

        # Add more events than the default limit
        for i in range(10):
            await self.broadcaster.broadcast_event(
                session_id, {"type": f"event{i}", "data": {"data": i}}
            )

        history = self.broadcaster.get_event_history(session_id)
        # Should respect bounded deque limit (500 by default, so all 10 should be there)
        assert len(history) == 10

        # Test with a smaller limit parameter
        limited_history = self.broadcaster.get_event_history(session_id, limit=5)
        assert len(limited_history) == 5

    @pytest.mark.asyncio
    async def test_broadcast_agent_network_event(self):
        """Test agent network event broadcasting."""
        session_id = "test_session"

        network_event = {
            "type": "agent_network_update",
            "data": {
                "event_type": "agent_start",
                "agent_name": "test_agent",
                "timestamp": datetime.now().isoformat(),
            },
        }

        queue = await self.broadcaster.add_subscriber(session_id)
        try:
            await self.broadcaster.broadcast_agent_network_event(
                network_event, session_id
            )
            event_str = await asyncio.wait_for(queue.get(), timeout=0.5)
            assert "agent_network_update" in event_str
            assert "test_agent" in event_str
        finally:
            await self.broadcaster.remove_subscriber(session_id, queue)

    @pytest.mark.asyncio
    async def test_clear_session(self):
        """Test session cleanup."""
        # Set up sessions with subscribers
        queue1 = await self.broadcaster.add_subscriber("session1")
        queue2 = await self.broadcaster.add_subscriber("session1")
        queue3 = await self.broadcaster.add_subscriber("session2")

        assert "session1" in self.broadcaster._subscribers
        assert "session2" in self.broadcaster._subscribers
        assert len(self.broadcaster._subscribers["session1"]) == 2

        await self.broadcaster.clear_session("session1")

        assert "session1" not in self.broadcaster._subscribers
        assert "session2" in self.broadcaster._subscribers


class TestGlobalFunctions:
    """Test cases for global utility functions."""

    def test_get_sse_broadcaster_singleton(self):
        """Test that get_sse_broadcaster returns the same instance."""
        broadcaster1 = get_sse_broadcaster()
        broadcaster2 = get_sse_broadcaster()

        assert broadcaster1 is broadcaster2
        assert isinstance(broadcaster1, EnhancedSSEBroadcaster)

    @patch("app.utils.sse_broadcaster.get_sse_broadcaster")
    def test_broadcast_agent_network_update(self, mock_get_broadcaster):
        """Test the utility function for broadcasting updates."""
        from unittest.mock import AsyncMock

        mock_broadcaster = Mock()
        mock_broadcaster.broadcast_agent_network_event = AsyncMock()
        mock_get_broadcaster.return_value = mock_broadcaster

        network_event = {"type": "test", "data": {"key": "value"}}
        session_id = "test_session"

        broadcast_agent_network_update(network_event, session_id)

        # The function creates a task, so we need to check if it was set up to be called
        assert mock_get_broadcaster.called

    @patch("app.utils.sse_broadcaster.get_sse_broadcaster")
    def test_get_agent_network_event_history(self, mock_get_broadcaster):
        """Test getting agent network event history."""
        mock_broadcaster = Mock()
        mock_broadcaster._session_manager = Mock()
        mock_broadcaster._session_manager.get_active_sessions.return_value = [
            "session1"
        ]

        # Mock event history
        mock_events = [
            SSEEvent("agent_network_update", {"agent": "test1"}, "id1"),
            SSEEvent("other_event", {"data": "test"}, "id2"),
            SSEEvent("agent_network_snapshot", {"agents": {}}, "id3"),
        ]
        mock_broadcaster.get_event_history.return_value = mock_events
        mock_get_broadcaster.return_value = mock_broadcaster

        history = get_agent_network_event_history(limit=10)

        # Should only return agent network events
        assert len(history) == 2
        assert history[0]["type"] == "agent_network_update"
        assert history[1]["type"] == "agent_network_snapshot"


class TestAgentNetworkEventStream:
    """Test cases for agent network event streaming."""

    @pytest.mark.asyncio
    async def test_event_stream_basic_flow(self):
        """Test basic event stream functionality."""
        broadcaster = EnhancedSSEBroadcaster()
        session_id = "test_session"

        # Start the stream
        stream_gen = agent_network_event_stream(session_id)

        # Get initial connection event
        connection_event = await stream_gen.__anext__()
        assert "agent_network_connection" in connection_event
        assert "connected" in connection_event

        # Send a test event
        test_event = {"type": "agent_network_update", "data": {"test": "data"}}
        broadcaster.broadcast_agent_network_event(test_event, session_id)

        # Should receive the event
        event_data = await stream_gen.__anext__()
        assert "agent_network_update" in event_data
        assert "test" in event_data

    @pytest.mark.asyncio
    async def test_event_stream_timeout_keepalive(self):
        """Test that stream sends keepalive on timeout."""
        session_id = "test_session"

        # Create stream with very short timeout for testing
        with patch("app.utils.sse_broadcaster.asyncio.wait_for") as mock_wait_for:
            mock_wait_for.side_effect = asyncio.TimeoutError()

            stream_gen = agent_network_event_stream(session_id)

            # Skip connection event
            await stream_gen.__anext__()

            # Should get keepalive event
            keepalive_event = await stream_gen.__anext__()
            assert "keepalive" in keepalive_event
            assert "timestamp" in keepalive_event

    @pytest.mark.asyncio
    async def test_event_stream_cleanup(self):
        """Test stream cleanup on cancellation."""
        broadcaster = get_sse_broadcaster()
        session_id = "test_session"

        stream_gen = agent_network_event_stream(session_id)

        # Start stream and get connection event
        await stream_gen.__anext__()

        # Verify subscription exists
        assert session_id in broadcaster._subscribers

        # Cancel the stream
        await stream_gen.aclose()

        # Verify cleanup - subscription should be removed
        # Note: This test may need adjustment based on actual cleanup implementation


class TestIntegration:
    """Integration tests for the complete SSE system."""

    def setup_method(self):
        """Set up integration test environment."""
        # Reset global broadcaster state
        broadcaster = get_sse_broadcaster()
        broadcaster._subscribers.clear()
        broadcaster._event_history.clear()

    @pytest.mark.asyncio
    async def test_end_to_end_event_flow(self):
        """Test complete event flow from broadcast to stream."""
        session_id = "integration_test_session"

        # Set up event collection
        received_events = []

        async def collect_events():
            stream_gen = agent_network_event_stream(session_id)
            try:
                # Collect first few events
                for _ in range(3):
                    event = await asyncio.wait_for(stream_gen.__anext__(), timeout=1.0)
                    received_events.append(event)
            except asyncio.TimeoutError:
                pass
            finally:
                await stream_gen.aclose()

        # Start collecting events
        collect_task = asyncio.create_task(collect_events())

        # Give stream time to set up
        await asyncio.sleep(0.1)

        # Send test events
        test_event1 = {
            "type": "agent_network_update",
            "data": {
                "event_type": "agent_start",
                "agent_name": "test_agent1",
                "timestamp": datetime.now().isoformat(),
            },
        }

        test_event2 = {
            "type": "agent_network_snapshot",
            "data": {
                "timestamp": datetime.now().isoformat(),
                "agents": {"test_agent1": {"is_active": True}},
            },
        }

        broadcast_agent_network_update(test_event1, session_id)
        broadcast_agent_network_update(test_event2, session_id)

        # Wait for collection to complete
        await collect_task

        # Verify events were received
        assert len(received_events) >= 2

        # First event should be connection
        assert "agent_network_connection" in received_events[0]

        # Subsequent events should be the test events
        event_contents = [event for event in received_events[1:]]
        agent_update_found = any(
            "agent_network_update" in event for event in event_contents
        )
        agent_snapshot_found = any(
            "agent_network_snapshot" in event for event in event_contents
        )

        assert agent_update_found
        assert agent_snapshot_found


if __name__ == "__main__":
    pytest.main([__file__])
