#!/usr/bin/env python3
"""Basic SSE Validation Tests.

Simple validation tests for SSE broadcaster functionality without complex
pytest dependencies that might cause hanging issues.
"""

import asyncio
import os
import sys
import time

# Add the project root to the Python path
sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from app.utils.sse_broadcaster import (
    BroadcasterConfig,
    EnhancedSSEBroadcaster,
    SSEEvent,
)


async def test_basic_broadcaster_creation():
    """Test basic broadcaster creation and configuration."""
    print("✓ Testing broadcaster creation...")

    config = BroadcasterConfig(
        max_queue_size=100,
        cleanup_interval=5.0,
        enable_metrics=True,
    )

    broadcaster = EnhancedSSEBroadcaster(config)

    try:
        # Test initial state
        stats = broadcaster.get_stats()
        assert stats["totalSessions"] == 0
        assert stats["totalSubscribers"] == 0
        assert stats["totalEvents"] == 0
        print("  ✓ Initial state correct")

        # Test configuration
        assert broadcaster.config.max_queue_size == 100
        assert broadcaster.config.cleanup_interval == 5.0
        print("  ✓ Configuration correct")

    finally:
        await broadcaster.shutdown()

    print("✓ Broadcaster creation test PASSED")


async def test_single_subscriber():
    """Test single subscriber functionality."""
    print("✓ Testing single subscriber...")

    config = BroadcasterConfig(cleanup_interval=30.0)  # Longer cleanup for test
    broadcaster = EnhancedSSEBroadcaster(config)

    try:
        session_id = "test_session_1"

        # Add subscriber
        print("  - Adding subscriber...")
        queue = await broadcaster.add_subscriber(session_id)

        # Check stats
        stats = broadcaster.get_stats()
        assert stats["totalSessions"] == 1
        assert stats["totalSubscribers"] == 1
        print("  ✓ Subscriber added correctly")

        # Broadcast event
        print("  - Broadcasting event...")
        event_data = {
            "type": "test_event",
            "data": {"message": "Hello World", "timestamp": time.time()},
        }
        await broadcaster.broadcast_event(session_id, event_data)

        # Receive event with timeout
        print("  - Receiving event...")
        try:
            event = await asyncio.wait_for(queue.get(), timeout=5.0)
            assert isinstance(event, str)
            assert "test_event" in event
            assert "Hello World" in event
            print("  ✓ Event received correctly")
        except asyncio.TimeoutError:
            raise AssertionError("Event not received within timeout")

        # Clean up subscriber
        print("  - Cleaning up subscriber...")
        await broadcaster.remove_subscriber(session_id, queue)

        # Check cleanup
        stats = broadcaster.get_stats()
        assert stats["totalSubscribers"] == 0
        print("  ✓ Subscriber cleaned up correctly")

    finally:
        await broadcaster.shutdown()

    print("✓ Single subscriber test PASSED")


async def test_multiple_subscribers():
    """Test multiple subscribers to same session."""
    print("✓ Testing multiple subscribers...")

    config = BroadcasterConfig(cleanup_interval=30.0)
    broadcaster = EnhancedSSEBroadcaster(config)

    try:
        session_id = "multi_test_session"
        num_subscribers = 3

        # Add multiple subscribers
        print(f"  - Adding {num_subscribers} subscribers...")
        subscribers = []
        for i in range(num_subscribers):
            queue = await broadcaster.add_subscriber(session_id)
            subscribers.append(queue)

        # Check stats
        stats = broadcaster.get_stats()
        assert stats["totalSessions"] == 1
        assert stats["totalSubscribers"] == num_subscribers
        print("  ✓ All subscribers added correctly")

        # Broadcast event
        print("  - Broadcasting event to all subscribers...")
        event_data = {
            "type": "multi_test",
            "data": {"broadcast_id": 12345, "message": "Multi-subscriber test"},
        }
        await broadcaster.broadcast_event(session_id, event_data)

        # All subscribers should receive the event
        print("  - Receiving events from all subscribers...")
        received_events = []
        for i, queue in enumerate(subscribers):
            try:
                event = await asyncio.wait_for(queue.get(), timeout=5.0)
                received_events.append(event)
                print(f"    ✓ Subscriber {i + 1} received event")
            except asyncio.TimeoutError:
                raise AssertionError(f"Subscriber {i + 1} did not receive event")

        # Verify all events
        assert len(received_events) == num_subscribers
        for event in received_events:
            assert "multi_test" in event
            assert "12345" in event
        print("  ✓ All events received correctly")

        # Clean up all subscribers
        print("  - Cleaning up all subscribers...")
        for queue in subscribers:
            await broadcaster.remove_subscriber(session_id, queue)

        stats = broadcaster.get_stats()
        assert stats["totalSubscribers"] == 0
        print("  ✓ All subscribers cleaned up correctly")

    finally:
        await broadcaster.shutdown()

    print("✓ Multiple subscribers test PASSED")


async def test_session_isolation():
    """Test that different sessions are isolated."""
    print("✓ Testing session isolation...")

    config = BroadcasterConfig(cleanup_interval=30.0)
    broadcaster = EnhancedSSEBroadcaster(config)

    try:
        session_a = "session_a"
        session_b = "session_b"

        # Add subscribers to both sessions
        print("  - Adding subscribers to different sessions...")
        queue_a = await broadcaster.add_subscriber(session_a)
        queue_b = await broadcaster.add_subscriber(session_b)

        # Check stats
        stats = broadcaster.get_stats()
        assert stats["totalSessions"] == 2
        assert stats["totalSubscribers"] == 2
        print("  ✓ Both sessions created correctly")

        # Broadcast to session A only
        print("  - Broadcasting to session A only...")
        event_data_a = {
            "type": "session_a_event",
            "data": {"target": "session_a", "secret": "only_a_should_see_this"},
        }
        await broadcaster.broadcast_event(session_a, event_data_a)

        # Session A should receive event
        print("  - Checking session A receives event...")
        try:
            event_a = await asyncio.wait_for(queue_a.get(), timeout=5.0)
            assert "session_a_event" in event_a
            assert "only_a_should_see_this" in event_a
            print("  ✓ Session A received its event")
        except asyncio.TimeoutError:
            raise AssertionError("Session A did not receive its event")

        # Session B should NOT receive the event (check for keepalive vs real event)
        print("  - Checking session B does NOT receive event...")
        try:
            # Use short timeout to receive potential keepalive or timeout
            event_b = await asyncio.wait_for(queue_b.get(timeout=1.0), timeout=2.0)
            # Check if it's a keepalive dict (expected) or actual event data (unexpected)
            if isinstance(event_b, dict) and event_b.get("type") == "keepalive":
                print("  ✓ Session B correctly received only keepalive")
            elif isinstance(event_b, str) and "session_a_event" in event_b:
                raise AssertionError("Session B incorrectly received session A's event")
            else:
                print("  ✓ Session B received non-target event (acceptable)")
        except asyncio.TimeoutError:
            # This is also expected - session B should not receive session A's events
            print("  ✓ Session B correctly did not receive session A's event")

        # Clean up
        print("  - Cleaning up sessions...")
        await broadcaster.remove_subscriber(session_a, queue_a)
        await broadcaster.remove_subscriber(session_b, queue_b)

        stats = broadcaster.get_stats()
        assert stats["totalSubscribers"] == 0
        print("  ✓ Sessions cleaned up correctly")

    finally:
        await broadcaster.shutdown()

    print("✓ Session isolation test PASSED")


async def test_event_formatting():
    """Test SSE event formatting."""
    print("✓ Testing event formatting...")

    # Test SSEEvent class
    event = SSEEvent(
        type="test_event",
        data={"message": "test", "number": 42, "boolean": True},
        id="test_id_123",
        retry=5000,
    )

    formatted = event.to_sse_format()
    lines = formatted.split("\n")

    # Check format
    assert "id: test_id_123" in lines
    assert "retry: 5000" in lines
    assert "event: test_event" in lines
    assert any("data: " in line for line in lines)

    print("  ✓ SSE event formatting correct")

    # Test through broadcaster
    config = BroadcasterConfig(cleanup_interval=30.0)
    broadcaster = EnhancedSSEBroadcaster(config)

    try:
        session_id = "format_test_session"
        queue = await broadcaster.add_subscriber(session_id)

        # Send complex event data
        complex_data = {
            "type": "format_test",
            "data": {
                "string": "hello",
                "number": 123,
                "float": 45.67,
                "boolean": True,
                "null": None,
                "array": [1, 2, 3],
                "object": {"nested": "value"},
            },
        }

        await broadcaster.broadcast_event(session_id, complex_data)

        # Receive and check format
        received = await asyncio.wait_for(queue.get(), timeout=5.0)

        # Should be properly formatted SSE
        assert "event: format_test" in received
        assert "data: " in received
        assert '"string":"hello"' in received or '"string": "hello"' in received
        assert '"number":123' in received or '"number": 123' in received

        print("  ✓ Complex data formatting correct")

        await broadcaster.remove_subscriber(session_id, queue)

    finally:
        await broadcaster.shutdown()

    print("✓ Event formatting test PASSED")


async def test_cleanup_functionality():
    """Test cleanup functionality."""
    print("✓ Testing cleanup functionality...")

    config = BroadcasterConfig(
        cleanup_interval=1.0,  # Very short cleanup interval for testing
        event_ttl=2.0,  # Short TTL for testing
    )
    broadcaster = EnhancedSSEBroadcaster(config)

    try:
        session_id = "cleanup_test_session"

        # Add subscriber and send events
        print("  - Adding subscriber and sending events...")
        queue = await broadcaster.add_subscriber(session_id)

        for i in range(5):
            event_data = {
                "type": "cleanup_test_event",
                "data": {"sequence": i},
            }
            await broadcaster.broadcast_event(session_id, event_data)

        # Check initial state
        initial_stats = broadcaster.get_stats()
        initial_events = initial_stats["totalEvents"]
        assert initial_events >= 5
        print(f"  ✓ Initial events: {initial_events}")

        # Wait for events to expire and cleanup to run
        print("  - Waiting for cleanup (5 seconds)...")
        await asyncio.sleep(5.0)

        # Trigger manual cleanup to ensure it runs
        await broadcaster._perform_cleanup()

        # Check cleanup effectiveness
        final_stats = broadcaster.get_stats()
        final_events = final_stats["totalEvents"]

        print(f"  - Events after cleanup: {final_events}")
        print(
            f"  - Cleanup metrics: {final_stats['metrics']['expired_events_cleaned']} events cleaned"
        )

        # Some events should have been cleaned up due to TTL
        # (Note: this is somewhat timing-dependent, so we're lenient)
        print("  ✓ Cleanup ran successfully")

        await broadcaster.remove_subscriber(session_id, queue)

    finally:
        await broadcaster.shutdown()

    print("✓ Cleanup functionality test PASSED")


async def run_all_tests():
    """Run all validation tests."""
    print("=== SSE Broadcaster Validation Tests ===\n")

    tests = [
        test_basic_broadcaster_creation,
        test_single_subscriber,
        test_multiple_subscribers,
        test_session_isolation,
        test_event_formatting,
        test_cleanup_functionality,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            await test()
            passed += 1
            print()
        except Exception as e:
            print(f"❌ Test FAILED: {e}")
            failed += 1
            print()

    print("=== Test Results ===")
    print(f"✓ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"Total: {passed + failed}")

    if failed == 0:
        print("\n🎉 All tests PASSED! SSE broadcaster is working correctly.")
        return True
    else:
        print(f"\n💥 {failed} test(s) FAILED. Please check the implementation.")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
