#!/usr/bin/env python3
"""Test SSE flow end-to-end to diagnose timeout issue."""

import asyncio
import json
import time
from datetime import datetime
import httpx
import sys

API_URL = "http://localhost:8000"
SESSION_ID = f"test_session_{int(time.time())}"


async def test_sse_flow():
    """Test the complete SSE flow."""
    print(f"\n=== Testing SSE Flow ===")
    print(f"Session ID: {SESSION_ID}")
    print(f"API URL: {API_URL}")

    async with httpx.AsyncClient(timeout=120.0) as client:
        # Step 1: Start research session
        print("\n1. Starting research session...")
        try:
            response = await client.post(
                f"{API_URL}/api/run_sse/{SESSION_ID}",
                json={"query": "Test research query for SSE debugging"},
            )
            print(f"   POST Response: {response.status_code}")
            if response.status_code == 200:
                print(f"   Response body: {response.json()}")
            else:
                print(f"   Error: {response.text}")
                return
        except Exception as e:
            print(f"   Error starting session: {e}")
            return

        # Step 2: Connect to SSE stream
        print("\n2. Connecting to SSE stream...")
        print(f"   URL: {API_URL}/api/run_sse/{SESSION_ID}")

        try:
            # Use streaming response
            async with client.stream(
                "GET",
                f"{API_URL}/api/run_sse/{SESSION_ID}",
                headers={"Accept": "text/event-stream"},
            ) as stream_response:
                print(f"   Stream connected: {stream_response.status_code}")
                print(f"   Headers: {dict(stream_response.headers)}")

                if stream_response.status_code != 200:
                    error_text = await stream_response.aread()
                    print(f"   Error: {error_text}")
                    return

                # Read events for 10 seconds
                start_time = time.time()
                event_count = 0

                print("\n3. Listening for events (10 seconds max)...")
                async for line in stream_response.aiter_lines():
                    if time.time() - start_time > 10:
                        print("   Timeout reached (10s)")
                        break

                    if line.startswith("event:"):
                        event_type = line[6:].strip()
                        print(f"   Event #{event_count}: {event_type}")
                        event_count += 1
                    elif line.startswith("data:"):
                        try:
                            data = json.loads(line[5:].strip())
                            print(f"      Data: {json.dumps(data, indent=2)[:200]}...")
                        except:
                            print(f"      Data: {line[5:].strip()[:100]}...")
                    elif line == "":
                        # Empty line signals end of event
                        pass
                    else:
                        print(f"   Line: {line[:100]}")

                print(f"\n   Total events received: {event_count}")

        except httpx.TimeoutException:
            print("   ERROR: Request timed out!")
        except Exception as e:
            print(f"   ERROR: {type(e).__name__}: {e}")


async def test_direct_broadcaster():
    """Test the SSE broadcaster directly."""
    print("\n=== Testing Direct Broadcaster ===")

    # Import the broadcaster directly
    sys.path.insert(0, '/Users/nick/Projects/vana')
    from app.utils.sse_broadcaster import get_sse_broadcaster, agent_network_event_stream

    broadcaster = get_sse_broadcaster()
    test_session = f"direct_test_{int(time.time())}"

    print(f"Session ID: {test_session}")

    # Broadcast some test events
    print("\n1. Broadcasting test events...")
    for i in range(3):
        await broadcaster.broadcast_event(
            test_session,
            {
                "type": f"test_event_{i}",
                "data": {
                    "message": f"Test message {i}",
                    "timestamp": datetime.now().isoformat(),
                },
            },
        )
        print(f"   Broadcasted event {i}")

    # Try to consume events
    print("\n2. Consuming events...")
    event_count = 0
    async for event in agent_network_event_stream(test_session):
        print(f"   Received: {event[:100]}...")
        event_count += 1
        if event_count >= 5:  # Get initial + 3 test events
            break

    print(f"   Total events consumed: {event_count}")

    # Check broadcaster stats
    stats = broadcaster.get_stats()
    print(f"\n3. Broadcaster stats:")
    print(f"   Total sessions: {stats['totalSessions']}")
    print(f"   Total subscribers: {stats['totalSubscribers']}")
    print(f"   Total events: {stats['totalEvents']}")


if __name__ == "__main__":
    print("Starting SSE flow test...")

    # Test 1: Full HTTP flow
    asyncio.run(test_sse_flow())

    # Test 2: Direct broadcaster test
    asyncio.run(test_direct_broadcaster())

    print("\nTest complete!")