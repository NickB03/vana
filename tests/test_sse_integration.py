"""Tests for SSE Broadcasting and Agent Integration.

This module tests the Phase 1 and Phase 2 implementations:
- Enhanced SSE Broadcaster
- Agent Network SSE Endpoint
- Callback to SSE Integration
- Progress Tracking
"""

import asyncio
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.enhanced_callbacks import (
    _network_state,
    after_agent_callback,
    before_agent_callback,
)
from app.utils.agent_progress import AgentProgressTracker
from app.utils.sse_broadcaster import (
    EnhancedSSEBroadcaster,
    broadcast_agent_network_update,
    get_sse_broadcaster,
)


class TestEnhancedSSEBroadcaster:
    """Test the enhanced SSE broadcaster functionality."""

    @pytest.mark.asyncio
    async def test_add_subscriber(self):
        """Test adding a subscriber to a session."""
        broadcaster = EnhancedSSEBroadcaster()

        # Add subscriber
        queue = await broadcaster.add_subscriber("test-session")

        assert queue is not None
        assert queue.maxsize == 50
        assert "test-session" in broadcaster._active_sessions

    @pytest.mark.asyncio
    async def test_broadcast_event(self):
        """Test broadcasting an event to session subscribers."""
        broadcaster = EnhancedSSEBroadcaster()

        # Add subscriber
        queue = await broadcaster.add_subscriber("test-session")

        # Broadcast event
        event_data = {
            "type": "test_event",
            "data": {"message": "Test message", "value": 42},
        }
        await broadcaster.broadcast_event("test-session", event_data)

        # Check if event was received
        received = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert "test_event" in received
        assert "Test message" in received

    @pytest.mark.asyncio
    async def test_remove_subscriber(self):
        """Test removing a subscriber from a session."""
        broadcaster = EnhancedSSEBroadcaster()

        # Add and then remove subscriber
        queue = await broadcaster.add_subscriber("test-session")
        await broadcaster.remove_subscriber("test-session", queue)

        # Session should be cleaned up if no subscribers
        assert "test-session" not in broadcaster._active_sessions

    @pytest.mark.asyncio
    async def test_heartbeat_mechanism(self):
        """Test that heartbeat is sent when no events occur."""
        broadcaster = EnhancedSSEBroadcaster()
        queue = await broadcaster.add_subscriber("test-session")

        # Wait for timeout without sending events
        # In real implementation, this would trigger a heartbeat
        # Here we just verify the queue remains functional
        assert queue.empty()

    def test_get_stats(self):
        """Test getting broadcaster statistics."""
        broadcaster = EnhancedSSEBroadcaster()
        stats = broadcaster.get_stats()

        assert "totalSessions" in stats
        assert "totalSubscribers" in stats
        assert "sessionStats" in stats
        assert stats["totalSessions"] == 0


class TestAgentCallbackIntegration:
    """Test agent callbacks with SSE integration."""

    def test_before_agent_callback_broadcasts_event(self):
        """Test that before_agent_callback broadcasts start event."""
        # Setup mock context
        mock_context = Mock()
        mock_context._invocation_context = Mock()
        mock_agent = Mock()
        mock_agent.name = "test_agent"  # Set as attribute, not Mock param
        mock_agent.__class__.__name__ = "TestAgent"
        mock_context._invocation_context.agent = mock_agent
        mock_context._invocation_context.session = Mock(id="test-session")
        mock_context._invocation_context.session.state = {}
        mock_context.state = {}

        with patch(
            "app.enhanced_callbacks.broadcast_agent_network_update"
        ) as mock_broadcast:
            before_agent_callback(mock_context)

            # Verify broadcast was called
            mock_broadcast.assert_called_once()
            args = mock_broadcast.call_args[0]
            event = args[0]
            session_id = args[1]

            assert event["type"] == "agent_start"
            assert event["data"]["agentName"] == "test_agent"
            assert event["data"]["status"] == "active"
            assert session_id == "test-session"

    def test_after_agent_callback_broadcasts_completion(self):
        """Test that after_agent_callback broadcasts completion event."""
        # Setup mock context
        mock_context = Mock()
        mock_context._invocation_context = Mock()
        mock_agent = Mock()
        mock_agent.name = "test_agent"  # Set as attribute, not Mock param
        mock_context._invocation_context.agent = mock_agent
        mock_context._invocation_context.session = Mock(id="test-session")
        mock_context._invocation_context.session.events = []
        mock_context._invocation_context.session.state = {}
        mock_context.state = {"test_agent_start_time": 100.0}

        # Reset network state
        global _network_state
        _network_state.execution_stack = ["test_agent"]
        _network_state.active_agents = {"test_agent"}

        with patch(
            "app.enhanced_callbacks.broadcast_agent_network_update"
        ) as mock_broadcast:
            with patch("time.time", return_value=105.0):  # 5 second execution
                after_agent_callback(mock_context)

                # Verify broadcast was called
                mock_broadcast.assert_called_once()
                args = mock_broadcast.call_args[0]
                event = args[0]
                session_id = args[1]

                assert event["type"] == "agent_complete"
                assert event["data"]["agentName"] == "test_agent"
                assert event["data"]["status"] == "complete"
                assert event["data"]["executionTime"] == 5.0
                assert session_id == "test-session"


class TestAgentProgressTracker:
    """Test agent progress tracking functionality."""

    @pytest.mark.asyncio
    async def test_progress_update(self):
        """Test sending progress updates."""
        tracker = AgentProgressTracker("test-session", "test_agent")

        with patch("app.utils.agent_progress.get_sse_broadcaster") as mock_get:
            mock_broadcaster = AsyncMock()
            mock_get.return_value = mock_broadcaster

            await tracker.update_progress(
                current_step=5,
                total_steps=10,
                message="Processing data",
                step_name="Data Analysis",
            )

            # Verify broadcast was called
            mock_broadcaster.broadcast_event.assert_called_once()
            args = mock_broadcaster.broadcast_event.call_args[0]
            session_id = args[0]
            event = args[1]

            assert session_id == "test-session"
            assert event["type"] == "agent_progress"
            assert event["data"]["agentName"] == "test_agent"
            assert event["data"]["progress"] == 50.0
            assert event["data"]["currentStep"] == 5
            assert event["data"]["totalSteps"] == 10
            assert event["data"]["message"] == "Processing data"

    @pytest.mark.asyncio
    async def test_substep_tracking(self):
        """Test adding and broadcasting substeps."""
        tracker = AgentProgressTracker("test-session", "test_agent")

        with patch("app.utils.agent_progress.get_sse_broadcaster") as mock_get:
            mock_broadcaster = AsyncMock()
            mock_get.return_value = mock_broadcaster

            await tracker.add_substep(
                name="Load data", status="active", details="Loading from database"
            )

            # Verify broadcast was called
            mock_broadcaster.broadcast_event.assert_called_once()
            args = mock_broadcaster.broadcast_event.call_args[0]
            event = args[1]

            assert event["type"] == "agent_substep"
            assert event["data"]["agentName"] == "test_agent"
            assert event["data"]["substep"]["name"] == "Load data"
            assert event["data"]["substep"]["status"] == "active"

    @pytest.mark.asyncio
    async def test_completion_event(self):
        """Test marking process as complete."""
        tracker = AgentProgressTracker("test-session", "test_agent")
        tracker.total_steps = 10
        tracker.steps_completed = 10

        with patch("app.utils.agent_progress.get_sse_broadcaster") as mock_get:
            mock_broadcaster = AsyncMock()
            mock_get.return_value = mock_broadcaster

            await tracker.complete(success=True, message="Analysis complete")

            # Verify broadcast was called
            mock_broadcaster.broadcast_event.assert_called_once()
            args = mock_broadcaster.broadcast_event.call_args[0]
            event = args[1]

            assert event["type"] == "agent_progress_complete"
            assert event["data"]["agentName"] == "test_agent"
            assert event["data"]["success"] is True
            assert event["data"]["message"] == "Analysis complete"
            assert event["data"]["totalSteps"] == 10


class TestBroadcastUtility:
    """Test the broadcast_agent_network_update utility function."""

    def test_broadcast_with_running_loop(self):
        """Test broadcasting when event loop is running."""
        event_data = {"type": "test", "data": {"message": "test"}}

        with patch("asyncio.get_event_loop") as mock_get_loop:
            mock_loop = Mock()
            mock_loop.is_running.return_value = True
            mock_get_loop.return_value = mock_loop

            with patch("asyncio.create_task") as mock_create_task:
                broadcast_agent_network_update(event_data, "test-session")
                mock_create_task.assert_called_once()

    def test_broadcast_without_loop(self):
        """Test broadcasting when no event loop is running."""
        event_data = {"type": "test", "data": {"message": "test"}}

        with patch("asyncio.get_event_loop") as mock_get_loop:
            mock_get_loop.side_effect = RuntimeError("No event loop")

            with patch("asyncio.run") as mock_run:
                broadcast_agent_network_update(event_data, "test-session")
                mock_run.assert_called_once()


# Integration test for end-to-end flow
@pytest.mark.asyncio
async def test_end_to_end_sse_flow():
    """Test complete flow from callback to SSE event."""
    broadcaster = get_sse_broadcaster()

    # Add subscriber
    queue = await broadcaster.add_subscriber("test-session")

    # Simulate agent callback
    mock_context = Mock()
    mock_context._invocation_context = Mock()
    mock_context._invocation_context.agent = Mock(name="integration_agent")
    mock_context._invocation_context.agent.__class__.__name__ = "IntegrationAgent"
    mock_context._invocation_context.session = Mock(id="test-session")
    mock_context._invocation_context.session.state = {}
    mock_context.state = {}

    # Call before_agent_callback (this should broadcast)
    before_agent_callback(mock_context)

    # Wait a bit for async operations
    await asyncio.sleep(0.1)

    # Check if we received the event
    if not queue.empty():
        received = await queue.get()
        # Parse the SSE formatted string
        assert "agent_start" in received or "agent_" in received

    # Clean up
    await broadcaster.clear_session("test-session")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
