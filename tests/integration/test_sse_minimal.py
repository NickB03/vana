#!/usr/bin/env python3
"""Minimal SSE Test - Quick validation without background tasks."""

import asyncio
import os
import sys

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.utils.sse_broadcaster import BroadcasterConfig, EnhancedSSEBroadcaster


async def minimal_test():
    """Minimal test that should work quickly."""
    print("Running minimal SSE test...")

    # Create broadcaster without background cleanup
    config = BroadcasterConfig(
        max_queue_size=10,
        cleanup_interval=300.0,  # Very long cleanup interval to avoid background tasks
        enable_metrics=False,    # Disable metrics to avoid psutil issues
    )

    broadcaster = EnhancedSSEBroadcaster(config)

    try:
        print("1. Creating subscriber...")
        session_id = "minimal_test"
        queue = await broadcaster.add_subscriber(session_id)
        print("   ✓ Subscriber created")

        print("2. Broadcasting event...")
        await broadcaster.broadcast_event(session_id, {
            "type": "test",
            "data": {"message": "Hello"}
        })
        print("   ✓ Event broadcast")

        print("3. Receiving event (5s timeout)...")
        try:
            event = await asyncio.wait_for(queue.get(), timeout=5.0)
            print(f"   ✓ Received: {event[:50]}...")
        except asyncio.TimeoutError:
            print("   ❌ Timeout waiting for event")
            return False

        print("4. Cleaning up...")
        await broadcaster.remove_subscriber(session_id, queue)
        print("   ✓ Cleaned up")

        return True

    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

    finally:
        print("5. Shutting down...")
        await broadcaster.shutdown()
        print("   ✓ Shutdown complete")


if __name__ == "__main__":
    try:
        success = asyncio.run(minimal_test())
        if success:
            print("\n🎉 Minimal test PASSED!")
            sys.exit(0)
        else:
            print("\n💥 Minimal test FAILED!")
            sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test crashed: {e}")
        sys.exit(1)
