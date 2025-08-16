#!/usr/bin/env python3
"""Debug script to identify SSE broadcaster hanging issue."""

import asyncio
import signal
import sys
import time


def timeout_handler(signum, frame):
    print("Timeout! Hanging detected.")
    sys.exit(1)


async def test_broadcaster_basic():
    """Test basic broadcaster operations with timeouts."""
    print("Starting basic broadcaster test...")

    try:
        print("1. Importing broadcaster...")
        from app.utils.sse_broadcaster_fixed import get_sse_broadcaster
        print("   ✓ Import successful")

        print("2. Getting broadcaster instance...")
        broadcaster = get_sse_broadcaster()
        print(f"   ✓ Broadcaster created: {type(broadcaster)}")

        print("3. Creating session...")
        session_id = "debug_session"

        print("4. Adding subscriber...")
        # Use asyncio.wait_for to add timeout
        queue = await asyncio.wait_for(
            broadcaster.add_subscriber(session_id),
            timeout=5.0
        )
        print(f"   ✓ Subscriber added: {type(queue)}")

        print("5. Broadcasting event...")
        await asyncio.wait_for(
            broadcaster.broadcast_event(session_id, {"type": "test", "data": {}}),
            timeout=5.0
        )
        print("   ✓ Event broadcasted")

        print("6. Removing subscriber...")
        await asyncio.wait_for(
            broadcaster.remove_subscriber(session_id, queue),
            timeout=5.0
        )
        print("   ✓ Subscriber removed")

        print("7. Getting stats...")
        stats = broadcaster.get_stats()
        print(f"   ✓ Stats: {stats.get('totalSessions', 0)} sessions")

        print("8. Shutting down...")
        await asyncio.wait_for(
            broadcaster.shutdown(),
            timeout=5.0
        )
        print("   ✓ Shutdown complete")

        print("✅ All tests passed!")

    except asyncio.TimeoutError as e:
        print(f"❌ Timeout error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True


async def test_memory_optmized_queue():
    """Test the MemoryOptimizedQueue directly."""
    print("\nTesting MemoryOptimizedQueue...")

    try:
        from app.utils.sse_broadcaster_fixed import MemoryOptimizedQueue

        print("1. Creating queue...")
        queue = MemoryOptimizedQueue(maxsize=5)
        print("   ✓ Queue created")

        print("2. Testing put/get...")
        await asyncio.wait_for(queue.put("test_item"), timeout=1.0)
        item = await asyncio.wait_for(queue.get(), timeout=1.0)
        print(f"   ✓ Put/get successful: {item}")

        print("3. Testing timeout...")
        start_time = time.time()
        result = await asyncio.wait_for(queue.get(timeout=0.1), timeout=1.0)
        elapsed = time.time() - start_time
        print(f"   ✓ Timeout result: {result} (elapsed: {elapsed:.3f}s)")

        print("4. Closing queue...")
        queue.close()
        print("   ✓ Queue closed")

        print("✅ Queue tests passed!")
        return True

    except Exception as e:
        print(f"❌ Queue test error: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Main test function."""
    print("🔍 Debugging SSE broadcaster hanging issue...")

    # Test queue directly first
    queue_ok = await test_memory_optmized_queue()
    if not queue_ok:
        print("❌ Queue tests failed, stopping")
        return

    # Test broadcaster
    broadcaster_ok = await test_broadcaster_basic()
    if not broadcaster_ok:
        print("❌ Broadcaster tests failed")
        return

    print("🎉 All debug tests completed successfully!")


if __name__ == "__main__":
    # Set up timeout signal
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(30)  # 30 second timeout

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️  Interrupted by user")
    finally:
        signal.alarm(0)  # Cancel timeout
