# Copyright 2025 Google LLC
# Licensed under the Apache License, Version 2.0 (the "License")

import pytest
import asyncio
import json
import time
import threading
import uuid
from typing import List, Dict, Any, Optional, AsyncGenerator
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from dataclasses import dataclass
from collections import defaultdict

from app.utils.sse_broadcaster import (
    agent_network_event_stream, 
    get_agent_network_event_history,
    AgentNetworkEventBroadcaster
)


@dataclass
class MockSSEEvent:
    """Mock SSE event for testing."""
    event_type: str
    data: Dict[str, Any]
    timestamp: float = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = time.time()


class TestSSEBroadcaster:
    """Test the SSE broadcasting functionality."""
    
    def setup_method(self):
        """Set up test environment."""
        self.session_id = str(uuid.uuid4())
        self.broadcaster = AgentNetworkEventBroadcaster()
        
    def teardown_method(self):
        """Clean up after tests."""
        # Clear any existing events
        if hasattr(self.broadcaster, 'clear_events'):
            self.broadcaster.clear_events()
    
    def test_event_broadcasting_basic(self):
        """Test basic event broadcasting functionality."""
        test_event = {
            "type": "agent_start",
            "agent_id": "test_agent_001",
            "timestamp": time.time(),
            "session_id": self.session_id
        }
        
        # Add event to broadcaster
        self.broadcaster.broadcast_event(self.session_id, test_event)
        
        # Retrieve recent events
        history = get_agent_network_event_history(limit=10)
        
        # Verify event was stored
        assert len(history) >= 1
        
        # Find our event in history
        found_event = None
        for event in history:
            if event.get("agent_id") == "test_agent_001":
                found_event = event
                break
                
        assert found_event is not None
        assert found_event["type"] == "agent_start"
        assert found_event["session_id"] == self.session_id
        
    def test_event_streaming_lifecycle(self):
        """Test the complete event streaming lifecycle."""
        events_received = []
        
        async def collect_events():
            """Collect events from stream."""
            count = 0
            async for event_data in agent_network_event_stream(self.session_id):
                events_received.append(event_data)
                count += 1
                if count >= 3:  # Stop after receiving 3 events
                    break
                    
        async def send_test_events():
            """Send test events to the stream."""
            await asyncio.sleep(0.1)  # Small delay to ensure stream is ready
            
            test_events = [
                {
                    "type": "agent_start",
                    "agent_id": "agent_001",
                    "timestamp": time.time(),
                    "session_id": self.session_id
                },
                {
                    "type": "agent_progress",
                    "agent_id": "agent_001", 
                    "progress": 0.5,
                    "timestamp": time.time(),
                    "session_id": self.session_id
                },
                {
                    "type": "agent_complete",
                    "agent_id": "agent_001",
                    "result": "success",
                    "timestamp": time.time(),
                    "session_id": self.session_id
                }
            ]
            
            for event in test_events:
                self.broadcaster.broadcast_event(self.session_id, event)
                await asyncio.sleep(0.1)  # Small delay between events
                
        # Run the event collection and sending concurrently
        async def run_test():
            await asyncio.gather(
                collect_events(),
                send_test_events()
            )
            
        # Execute the async test
        asyncio.run(run_test())
        
        # Verify we received the expected events
        assert len(events_received) == 3
        
        event_types = [event.get("type") for event in events_received]
        assert "agent_start" in event_types
        assert "agent_progress" in event_types  
        assert "agent_complete" in event_types
        
    def test_multiple_session_isolation(self):
        """Test that events are properly isolated between sessions."""
        session1 = str(uuid.uuid4())
        session2 = str(uuid.uuid4())
        
        # Send events to different sessions
        event1 = {
            "type": "agent_start",
            "agent_id": "session1_agent",
            "session_id": session1
        }
        
        event2 = {
            "type": "agent_start", 
            "agent_id": "session2_agent",
            "session_id": session2
        }
        
        self.broadcaster.broadcast_event(session1, event1)
        self.broadcaster.broadcast_event(session2, event2)
        
        # Collect events for session1 only
        session1_events = []
        
        async def collect_session1_events():
            count = 0
            async for event_data in agent_network_event_stream(session1):
                session1_events.append(event_data)
                count += 1
                if count >= 1:  # Just get the first event
                    break
                    
        asyncio.run(collect_session1_events())
        
        # Verify only session1 events were received
        assert len(session1_events) == 1
        assert session1_events[0]["agent_id"] == "session1_agent"
        assert session1_events[0]["session_id"] == session1
        
    def test_event_history_limit(self):
        """Test event history respects limit parameter."""
        # Generate multiple events
        for i in range(15):
            event = {
                "type": "test_event",
                "event_number": i,
                "timestamp": time.time(),
                "session_id": self.session_id
            }
            self.broadcaster.broadcast_event(self.session_id, event)
            
        # Test different limits
        history_5 = get_agent_network_event_history(limit=5)
        history_10 = get_agent_network_event_history(limit=10)
        history_20 = get_agent_network_event_history(limit=20)
        
        assert len(history_5) <= 5
        assert len(history_10) <= 10
        assert len(history_20) <= 20
        
        # History should be ordered (most recent first typically)
        if len(history_10) > 1:
            timestamps = [event.get("timestamp", 0) for event in history_10]
            # Either ascending or descending order is fine
            is_ordered = (timestamps == sorted(timestamps) or 
                         timestamps == sorted(timestamps, reverse=True))
            assert is_ordered
            
    def test_concurrent_event_broadcasting(self):
        """Test concurrent event broadcasting doesn't cause issues."""
        num_threads = 5
        events_per_thread = 10
        all_events = []
        
        def broadcast_events(thread_id):
            """Broadcast events from a thread."""
            thread_events = []
            for i in range(events_per_thread):
                event = {
                    "type": "concurrent_test",
                    "thread_id": thread_id,
                    "event_id": i,
                    "timestamp": time.time(),
                    "session_id": self.session_id
                }
                self.broadcaster.broadcast_event(self.session_id, event)
                thread_events.append(event)
                time.sleep(0.01)  # Small delay
            return thread_events
            
        # Start multiple threads broadcasting events
        threads = []
        thread_results = []
        
        for thread_id in range(num_threads):
            thread = threading.Thread(
                target=lambda tid=thread_id: thread_results.append(
                    broadcast_events(tid)
                )
            )
            threads.append(thread)
            thread.start()
            
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
            
        # Verify total event count
        total_expected = num_threads * events_per_thread
        
        # Allow some time for events to be processed
        time.sleep(0.5)
        
        history = get_agent_network_event_history(limit=total_expected + 10)
        concurrent_events = [
            event for event in history 
            if event.get("type") == "concurrent_test"
        ]
        
        # Should have received all events (or at least most of them)
        assert len(concurrent_events) >= total_expected * 0.8  # Allow some tolerance


class TestSSEConnectionHandling:
    """Test SSE connection handling, reconnection, and error scenarios."""
    
    def setup_method(self):
        """Set up connection testing."""
        self.session_id = str(uuid.uuid4())
        
    def test_sse_stream_format(self):
        """Test that SSE stream produces correctly formatted output."""
        # Mock event data
        test_event = {
            "type": "format_test",
            "data": {"message": "test"},
            "session_id": self.session_id
        }
        
        async def test_format():
            # Generate a single event and check format
            broadcaster = AgentNetworkEventBroadcaster()
            broadcaster.broadcast_event(self.session_id, test_event)
            
            events = []
            async for event_data in agent_network_event_stream(self.session_id):
                events.append(event_data)
                if len(events) >= 1:
                    break
                    
            if events:
                event = events[0]
                # Should be a dictionary with expected fields
                assert isinstance(event, dict)
                assert "type" in event
                assert "session_id" in event
                
        asyncio.run(test_format())
        
    def test_stream_connection_timeout(self):
        """Test stream behavior with connection timeout."""
        async def test_timeout():
            start_time = time.time()
            events_received = 0
            
            try:
                # Set a short timeout
                timeout = 2.0
                
                async for event_data in agent_network_event_stream(self.session_id):
                    events_received += 1
                    elapsed = time.time() - start_time
                    
                    if elapsed > timeout:
                        break
                        
            except asyncio.TimeoutError:
                pass  # Expected for this test
                
            # Should handle timeout gracefully
            elapsed_time = time.time() - start_time
            assert elapsed_time >= 1.0  # Should run for at least some time
            
        asyncio.run(test_timeout())
        
    def test_malformed_event_handling(self):
        """Test handling of malformed events."""
        malformed_events = [
            None,  # Null event
            "",    # Empty string
            {"type": "test"},  # Missing session_id
            {"session_id": "different_session"},  # Wrong session
            {"invalid": "structure"},  # Unexpected structure
        ]
        
        broadcaster = AgentNetworkEventBroadcaster()
        
        for malformed_event in malformed_events:
            try:
                # Should handle malformed events gracefully
                broadcaster.broadcast_event(self.session_id, malformed_event)
            except Exception as e:
                # If it raises an exception, it should be a reasonable one
                assert isinstance(e, (ValueError, TypeError, KeyError))
                
    def test_event_stream_memory_management(self):
        """Test that event streaming doesn't cause memory leaks."""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss
        
        # Generate many events
        broadcaster = AgentNetworkEventBroadcaster()
        
        async def generate_many_events():
            for i in range(1000):
                event = {
                    "type": "memory_test",
                    "event_id": i,
                    "large_data": "x" * 1000,  # 1KB of data per event
                    "timestamp": time.time(),
                    "session_id": self.session_id
                }
                broadcaster.broadcast_event(self.session_id, event)
                
                if i % 100 == 0:
                    await asyncio.sleep(0.01)  # Yield control periodically
                    
        asyncio.run(generate_many_events())
        
        # Allow some time for cleanup
        time.sleep(1.0)
        
        final_memory = process.memory_info().rss
        memory_increase = final_memory - initial_memory
        
        # Memory increase should be reasonable (less than 100MB)
        max_acceptable_increase = 100 * 1024 * 1024  # 100MB
        assert memory_increase < max_acceptable_increase


class TestRealTimeEventProcessing:
    """Test real-time event processing and performance."""
    
    def setup_method(self):
        """Set up real-time testing."""
        self.session_id = str(uuid.uuid4())
        
    def test_event_latency(self):
        """Test event delivery latency."""
        event_timestamps = []
        received_timestamps = []
        
        async def measure_latency():
            broadcaster = AgentNetworkEventBroadcaster()
            
            # Start collecting events
            async def collect_events():
                async for event_data in agent_network_event_stream(self.session_id):
                    received_timestamps.append(time.time())
                    if len(received_timestamps) >= 5:
                        break
                        
            # Send events with timing
            async def send_timed_events():
                await asyncio.sleep(0.1)  # Let collector start
                
                for i in range(5):
                    event_time = time.time()
                    event_timestamps.append(event_time)
                    
                    event = {
                        "type": "latency_test",
                        "event_id": i,
                        "send_time": event_time,
                        "session_id": self.session_id
                    }
                    
                    broadcaster.broadcast_event(self.session_id, event)
                    await asyncio.sleep(0.1)
                    
            await asyncio.gather(collect_events(), send_timed_events())
            
        asyncio.run(measure_latency())
        
        # Calculate latencies
        if len(event_timestamps) == len(received_timestamps):
            latencies = [
                received - sent 
                for sent, received in zip(event_timestamps, received_timestamps)
            ]
            
            avg_latency = sum(latencies) / len(latencies)
            max_latency = max(latencies)
            
            # Latency should be reasonable (under 100ms average)
            assert avg_latency < 0.1  # 100ms
            assert max_latency < 0.5   # 500ms max
            
    def test_high_frequency_events(self):
        """Test handling of high-frequency event streams."""
        events_sent = 0
        events_received = 0
        
        async def high_frequency_test():
            nonlocal events_sent, events_received
            
            broadcaster = AgentNetworkEventBroadcaster()
            
            async def rapid_sender():
                nonlocal events_sent
                for i in range(100):  # Send 100 events rapidly
                    event = {
                        "type": "high_frequency",
                        "event_id": i,
                        "timestamp": time.time(),
                        "session_id": self.session_id
                    }
                    broadcaster.broadcast_event(self.session_id, event)
                    events_sent += 1
                    
                    # Very small delay (high frequency)
                    await asyncio.sleep(0.001)  # 1ms delay
                    
            async def receiver():
                nonlocal events_received
                timeout = 5.0  # 5 second timeout
                start_time = time.time()
                
                async for event_data in agent_network_event_stream(self.session_id):
                    if event_data.get("type") == "high_frequency":
                        events_received += 1
                        
                    # Break if we've received enough or timed out
                    if events_received >= events_sent or (time.time() - start_time) > timeout:
                        break
                        
            await asyncio.gather(rapid_sender(), receiver())
            
        asyncio.run(high_frequency_test())
        
        # Should handle most events (allow some tolerance for timing)
        reception_rate = events_received / events_sent if events_sent > 0 else 0
        assert reception_rate > 0.8  # Should receive at least 80% of events
        
    def test_burst_event_handling(self):
        """Test handling of bursty event patterns."""
        burst_sizes = [10, 50, 100]
        results = {}
        
        for burst_size in burst_sizes:
            events_received = 0
            
            async def burst_test(size):
                nonlocal events_received
                events_received = 0
                
                broadcaster = AgentNetworkEventBroadcaster()
                
                async def send_burst():
                    # Send a burst of events all at once
                    for i in range(size):
                        event = {
                            "type": "burst_test",
                            "burst_size": size,
                            "event_id": i,
                            "timestamp": time.time(),
                            "session_id": self.session_id
                        }
                        broadcaster.broadcast_event(self.session_id, event)
                    
                async def receive_burst():
                    nonlocal events_received
                    timeout = 3.0
                    start_time = time.time()
                    
                    async for event_data in agent_network_event_stream(self.session_id):
                        if (event_data.get("type") == "burst_test" and 
                            event_data.get("burst_size") == size):
                            events_received += 1
                            
                        if events_received >= size or (time.time() - start_time) > timeout:
                            break
                            
                await asyncio.gather(send_burst(), receive_burst())
                return events_received
                
            received = asyncio.run(burst_test(burst_size))
            results[burst_size] = received / burst_size
            
        # All burst sizes should be handled well
        for burst_size, success_rate in results.items():
            assert success_rate > 0.8, f"Burst size {burst_size} had low success rate: {success_rate}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])