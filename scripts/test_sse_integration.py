#!/usr/bin/env python3
"""Test SSE integration to verify the fix is working."""

import asyncio
import json
import time
import httpx

async def test_integration():
    """Test the complete SSE integration flow."""

    # Create unique session ID
    session_id = f"test_session_{int(time.time())}_verified"
    backend_url = "http://localhost:8000"
    frontend_url = "http://localhost:3001"

    print(f"\n=== Testing SSE Integration ===")
    print(f"Session ID: {session_id}")
    print(f"Backend: {backend_url}")
    print(f"Frontend Proxy: {frontend_url}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Start research via backend directly
        print("\n1. Starting research session via backend...")
        try:
            response = await client.post(
                f"{backend_url}/api/run_sse/{session_id}",
                json={"query": "Test query to verify SSE integration is working"}
            )
            print(f"   Backend POST: {response.status_code}")
            if response.status_code == 200:
                print(f"   Response: {response.json()}")
            else:
                print(f"   Error: {response.text}")
                return False
        except Exception as e:
            print(f"   ERROR: {e}")
            return False

        # Step 2: Connect to SSE stream via frontend proxy
        print("\n2. Connecting to SSE via frontend proxy...")
        proxy_url = f"{frontend_url}/api/sse/api/run_sse/{session_id}"
        print(f"   Proxy URL: {proxy_url}")

        try:
            events_received = []
            start_time = time.time()

            async with client.stream(
                "GET",
                proxy_url,
                headers={"Accept": "text/event-stream"}
            ) as response:
                print(f"   Response status: {response.status_code}")

                if response.status_code != 200:
                    print(f"   ERROR: {await response.aread()}")
                    return False

                print("\n3. Receiving SSE events...")

                # Read events for up to 5 seconds
                async for line in response.aiter_lines():
                    if time.time() - start_time > 5:
                        break

                    line = line.strip()
                    if line.startswith("event:"):
                        event_type = line[6:].strip()
                        events_received.append(event_type)
                        print(f"   ✓ Event: {event_type}")
                    elif line.startswith("data:"):
                        try:
                            data = json.loads(line[5:].strip())
                            if "status" in data:
                                print(f"     Status: {data.get('status')}")
                            if "current_phase" in data:
                                print(f"     Phase: {data.get('current_phase')}")
                        except:
                            pass

                print(f"\n4. Results:")
                print(f"   Total events received: {len(events_received)}")
                print(f"   Event types: {', '.join(set(events_received))}")

                if len(events_received) > 0:
                    print("\n✅ SUCCESS: SSE integration is working!")
                    return True
                else:
                    print("\n❌ FAILURE: No events received")
                    return False

        except Exception as e:
            print(f"\n   ERROR connecting to proxy: {e}")
            return False

if __name__ == "__main__":
    result = asyncio.run(test_integration())
    exit(0 if result else 1)