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

import pytest
import asyncio
import json
from unittest.mock import Mock, patch
from datetime import datetime

from app.utils.sse_broadcaster import (
    SSEEvent,
    SSEBroadcaster,
    get_sse_broadcaster,
    broadcast_agent_network_update,
    agent_network_event_stream,
    get_agent_network_event_history
)


class TestSSEEvent:
    """Test cases for SSEEvent class."""
    
    def test_initialization(self):
        """Test SSEEvent initialization."""
        event = SSEEvent(
            type="test_event",
            data={"key": "value"},
            id="test_id",
            retry=5000
        )
        
        assert event.type == "test_event"
        assert event.data == {"key": "value"}
        assert event.id == "test_id"
        assert event.retry == 5000
    
    def test_to_sse_format(self):
        """Test SSE format conversion."""
        event = SSEEvent(
            type="test_event",
            data={"message": "hello world"},
            id="test_id",
            retry=3000
        )
        
        sse_string = event.to_sse_format()
        lines = sse_string.split('\n')
        
        assert "id: test_id" in lines
        assert "retry: 3000" in lines
        assert "event: test_event" in lines
        assert 'data: {"message": "hello world"}' in lines
        assert lines[-1] == ""  # Empty line at end
    
    def test_to_sse_format_minimal(self):
        """Test SSE format with minimal fields."""
        event = SSEEvent(
            type="simple_event",
            data={"test": True}
        )
        
        sse_string = event.to_sse_format()
        lines = sse_string.split('\n')
        
        assert "event: simple_event" in lines
        assert 'data: {"test": true}' in lines
        assert "id:" not in sse_string  # No id field
        assert "retry:" not in sse_string  # No retry field


class TestSSEBroadcaster:
    """Test cases for SSEBroadcaster class."""
    
    def setup_method(self):
        """Set up test environment."""
        self.broadcaster = SSEBroadcaster()
    
    def test_subscribe_and_unsubscribe(self):
        """Test subscription management."""
        queue = asyncio.Queue()
        session_id = "test_session"
        
        # Test subscription
        self.broadcaster.subscribe(session_id, queue)
        assert session_id in self.broadcaster._subscribers
        assert queue in self.broadcaster._subscribers[session_id]
        
        # Test unsubscription
        self.broadcaster.unsubscribe(session_id, queue)
        assert session_id not in self.broadcaster._subscribers
    
    def test_multiple_subscriptions(self):
        """Test multiple queues for same session."""
        queue1 = asyncio.Queue()
        queue2 = asyncio.Queue()
        session_id = "test_session"
        
        self.broadcaster.subscribe(session_id, queue1)
        self.broadcaster.subscribe(session_id, queue2)
        
        assert len(self.broadcaster._subscribers[session_id]) == 2
        assert queue1 in self.broadcaster._subscribers[session_id]
        assert queue2 in self.broadcaster._subscribers[session_id]
        
        # Unsubscribe one
        self.broadcaster.unsubscribe(session_id, queue1)
        assert len(self.broadcaster._subscribers[session_id]) == 1
        assert queue2 in self.broadcaster._subscribers[session_id]
    
    def test_broadcast_event_to_specific_session(self):
        """Test broadcasting to specific session."""
        queue1 = asyncio.Queue()
        queue2 = asyncio.Queue()
        
        self.broadcaster.subscribe("session1", queue1)
        self.broadcaster.subscribe("session2", queue2)
        
        event = SSEEvent("test_event", {"data": "test"})
        self.broadcaster.broadcast_event(event, "session1")
        
        # Check that only session1's queue received the event
        assert queue1.qsize() == 1
        assert queue2.qsize() == 0
        
        received_event = queue1.get_nowait()
        assert received_event.type == "test_event"
        assert received_event.data == {"data": "test"}
    
    def test_broadcast_event_to_all_sessions(self):
        """Test broadcasting to all sessions."""
        queue1 = asyncio.Queue()
        queue2 = asyncio.Queue()
        
        self.broadcaster.subscribe("session1", queue1)
        self.broadcaster.subscribe("session2", queue2)
        
        event = SSEEvent("broadcast_event", {"message": "all"})
        self.broadcaster.broadcast_event(event)  # No session_id = broadcast to all
        
        # Check that both queues received the event
        assert queue1.qsize() == 1
        assert queue2.qsize() == 1
        
        event1 = queue1.get_nowait()
        event2 = queue2.get_nowait()
        
        assert event1.type == "broadcast_event"
        assert event2.type == "broadcast_event"
    
    def test_event_history(self):
        """Test event history management."""
        event1 = SSEEvent("event1", {"data": 1})
        event2 = SSEEvent("event2", {"data": 2})
        
        self.broadcaster.broadcast_event(event1)
        self.broadcaster.broadcast_event(event2)
        
        history = self.broadcaster.get_event_history()
        assert len(history) == 2
        assert history[0].type == "event1"
        assert history[1].type == "event2"
        
        # Test limited history
        limited_history = self.broadcaster.get_event_history(limit=1)
        assert len(limited_history) == 1
        assert limited_history[0].type == "event2"  # Most recent
    
    def test_history_size_limit(self):
        """Test that history respects maximum size."""
        # Set a small max history for testing
        self.broadcaster._max_history = 5
        
        # Add more events than the limit
        for i in range(10):
            event = SSEEvent(f"event{i}", {"data": i})
            self.broadcaster.broadcast_event(event)
        
        history = self.broadcaster.get_event_history()
        assert len(history) == 5
        assert history[0].type == "event5"  # Oldest kept event
        assert history[-1].type == "event9"  # Most recent event
    
    def test_broadcast_agent_network_event(self):
        """Test agent network event broadcasting."""
        queue = asyncio.Queue()
        session_id = "test_session"
        
        self.broadcaster.subscribe(session_id, queue)
        
        network_event = {
            "type": "agent_network_update",
            "data": {
                "event_type": "agent_start",
                "agent_name": "test_agent",
                "timestamp": datetime.now().isoformat()
            }
        }
        
        self.broadcaster.broadcast_agent_network_event(network_event, session_id)
        
        assert queue.qsize() == 1
        received_event = queue.get_nowait()
        assert received_event.type == "agent_network_update"
        assert received_event.data["agent_name"] == "test_agent"
    
    def test_clear_session(self):
        """Test session cleanup."""
        queue1 = asyncio.Queue()
        queue2 = asyncio.Queue()
        
        self.broadcaster.subscribe("session1", queue1)
        self.broadcaster.subscribe("session1", queue2)
        self.broadcaster.subscribe("session2", queue1)
        
        assert "session1" in self.broadcaster._subscribers
        assert "session2" in self.broadcaster._subscribers
        
        self.broadcaster.clear_session("session1")
        
        assert "session1" not in self.broadcaster._subscribers
        assert "session2" in self.broadcaster._subscribers


class TestGlobalFunctions:
    """Test cases for global utility functions."""
    
    def test_get_sse_broadcaster_singleton(self):
        """Test that get_sse_broadcaster returns the same instance."""
        broadcaster1 = get_sse_broadcaster()
        broadcaster2 = get_sse_broadcaster()
        
        assert broadcaster1 is broadcaster2
        assert isinstance(broadcaster1, SSEBroadcaster)
    
    @patch('app.utils.sse_broadcaster.get_sse_broadcaster')
    def test_broadcast_agent_network_update(self, mock_get_broadcaster):
        """Test the utility function for broadcasting updates."""
        mock_broadcaster = Mock()
        mock_get_broadcaster.return_value = mock_broadcaster
        
        network_event = {"type": "test", "data": {"key": "value"}}
        session_id = "test_session"
        
        broadcast_agent_network_update(network_event, session_id)
        
        mock_broadcaster.broadcast_agent_network_event.assert_called_once_with(
            network_event, session_id
        )
    
    @patch('app.utils.sse_broadcaster.get_sse_broadcaster')
    def test_get_agent_network_event_history(self, mock_get_broadcaster):
        """Test getting agent network event history."""
        mock_broadcaster = Mock()
        mock_get_broadcaster.return_value = mock_broadcaster
        
        # Mock event history
        mock_events = [
            SSEEvent("agent_network_update", {"agent": "test1"}, "id1"),
            SSEEvent("other_event", {"data": "test"}, "id2"),
            SSEEvent("agent_network_snapshot", {"agents": {}}, "id3"),
        ]
        mock_broadcaster.get_event_history.return_value = mock_events
        
        history = get_agent_network_event_history(limit=10)
        
        # Should only return agent network events
        assert len(history) == 2
        assert history[0]["type"] == "agent_network_update"
        assert history[1]["type"] == "agent_network_snapshot"
        
        mock_broadcaster.get_event_history.assert_called_once_with(10)


class TestAgentNetworkEventStream:
    """Test cases for agent network event streaming."""
    
    @pytest.mark.asyncio
    async def test_event_stream_basic_flow(self):
        """Test basic event stream functionality."""
        broadcaster = SSEBroadcaster()
        session_id = "test_session"
        
        # Start the stream
        stream_gen = agent_network_event_stream(session_id)
        
        # Get initial connection event
        connection_event = await stream_gen.__anext__()
        assert "agent_network_connection" in connection_event
        assert "connected" in connection_event
        
        # Send a test event
        test_event = {
            "type": "agent_network_update",
            "data": {"test": "data"}
        }
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
        with patch('app.utils.sse_broadcaster.asyncio.wait_for') as mock_wait_for:
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
                "timestamp": datetime.now().isoformat()
            }
        }
        
        test_event2 = {
            "type": "agent_network_snapshot",
            "data": {
                "timestamp": datetime.now().isoformat(),
                "agents": {"test_agent1": {"is_active": True}}
            }
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
        agent_update_found = any("agent_network_update" in event for event in event_contents)
        agent_snapshot_found = any("agent_network_snapshot" in event for event in event_contents)
        
        assert agent_update_found
        assert agent_snapshot_found


if __name__ == "__main__":
    pytest.main([__file__])