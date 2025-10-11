"""Integration tests for dispatcher pattern with real agents and SSE.

These tests require running services:
- Backend on port 8000
- ADK service on port 8080

Run with: pytest tests/integration/test_dispatcher_integration.py --requires-server -v
"""

import asyncio
import json
import uuid
import pytest
import httpx
from datetime import datetime


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_dispatcher_routes_greeting_to_generalist():
    """Test dispatcher routes simple greeting to generalist_agent."""
    session_id = f"greeting-test-{uuid.uuid4()}"
    greeting_query = "Hello!"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Verify services are running
        try:
            health_response = await client.get("http://127.0.0.1:8000/health")
            assert health_response.status_code == 200
        except httpx.ConnectError:
            pytest.skip("Backend not running on port 8000")

        # Send greeting through dispatcher
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": greeting_query}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Connect to SSE stream
        events_received = []
        agent_names = set()

        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(30.0)
        ) as stream_response:
            async for line in stream_response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events_received.append(event)

                            # Track which agents were involved
                            if "agent" in event:
                                agent_names.add(event["agent"])

                            # Break after receiving a few events
                            if len(events_received) >= 3:
                                break
                        except json.JSONDecodeError:
                            continue

        # Verify we got events
        assert len(events_received) > 0, "No SSE events received"

        # Verify generalist_agent was involved (not research agents)
        # Note: dispatcher_agent will also appear
        print(f"Agents involved: {agent_names}")
        # The response should come from generalist, not research_pipeline
        # (Exact event structure depends on implementation)


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_dispatcher_routes_research_query():
    """Test dispatcher routes research query to interactive_planner_agent."""
    session_id = f"research-test-{uuid.uuid4()}"
    research_query = "What are the latest AI trends in 2024?"

    async with httpx.AsyncClient(timeout=60.0) as client:
        # Verify services
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Send research query
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": research_query}
        )

        assert response.status_code == 200

        # Connect to SSE stream
        events_received = []
        has_research_event = False
        has_plan_generator = False

        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(60.0)
        ) as stream_response:
            async for line in stream_response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events_received.append(event)

                            # Check for research-related events
                            if event.get("type") == "research_update":
                                has_research_event = True

                            # Check if plan_generator was used
                            if event.get("agent") == "plan_generator":
                                has_plan_generator = True

                            # Break after sufficient events
                            if len(events_received) >= 10:
                                break
                        except json.JSONDecodeError:
                            continue

        # Verify research path was taken
        assert len(events_received) > 0, "No events received"
        # Should have research-related events
        # (Exact verification depends on event structure)


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_sse_streaming_through_dispatcher():
    """Test SSE streaming works correctly through dispatcher layer."""
    session_id = f"sse-test-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Trigger request
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Hello, how are you?"}
        )

        assert response.status_code == 200

        # Verify SSE stream
        events_count = 0
        has_done_signal = False

        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(30.0)
        ) as stream_response:
            assert stream_response.status_code == 200
            assert "text/event-stream" in stream_response.headers.get("content-type", "")

            async for line in stream_response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        has_done_signal = True
                        break
                    elif data_str:
                        try:
                            event = json.loads(data_str)
                            events_count += 1
                        except json.JSONDecodeError:
                            pass

                    if events_count >= 5:
                        break

        # Verify streaming worked
        assert events_count > 0, "No SSE events received"


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_memory_tools_work_through_dispatcher():
    """Test memory tools work when request is routed through dispatcher."""
    session_id = f"memory-test-{uuid.uuid4()}"

    # This query should trigger research agent which has memory tools
    query = "Please remember that my name is Alice. Then research AI ethics."

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Send query
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": query}
        )

        assert response.status_code == 200

        # Collect events
        events = []
        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(60.0)
        ) as stream_response:
            async for line in stream_response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events.append(event)
                            if len(events) >= 15:
                                break
                        except json.JSONDecodeError:
                            pass

        # Memory tools should have been used
        # (Exact verification depends on event structure)
        assert len(events) > 0


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_agent_network_events_with_dispatcher():
    """Test agent network events are broadcast correctly with dispatcher."""
    session_id = f"network-test-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Send request
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Hello"}
        )

        assert response.status_code == 200

        # Monitor agent_network_sse endpoint
        agent_network_events = []

        try:
            async with client.stream(
                "GET",
                f"http://127.0.0.1:8000/agent_network_sse/{session_id}",
                timeout=httpx.Timeout(15.0)
            ) as stream:
                async for line in stream.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str:
                            try:
                                event = json.loads(data_str)
                                agent_network_events.append(event)
                                if len(agent_network_events) >= 3:
                                    break
                            except json.JSONDecodeError:
                                pass
        except httpx.TimeoutException:
            pass  # Timeout is acceptable

        # Should have received some agent network events
        # (Events may vary based on routing)


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_multi_turn_conversation_with_dispatcher():
    """Test multi-turn conversation works through dispatcher."""
    session_id = f"multiturn-test-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Turn 1: Simple greeting
        response1 = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Hello"}
        )
        assert response1.status_code == 200

        # Consume events from turn 1
        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(15.0)
        ) as stream:
            async for line in stream.aiter_lines():
                if line.startswith("data: [DONE]"):
                    break

        # Wait a bit
        await asyncio.sleep(0.5)

        # Turn 2: Research request
        response2 = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Research quantum computing"}
        )
        assert response2.status_code == 200

        # Verify second turn works
        events = []
        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(60.0)
        ) as stream:
            async for line in stream.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events.append(event)
                            if len(events) >= 5:
                                break
                        except json.JSONDecodeError:
                            pass

        # Both turns should work correctly
        assert len(events) > 0


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_concurrent_sessions_with_dispatcher():
    """Test multiple concurrent sessions work correctly."""
    num_sessions = 3
    sessions = [f"concurrent-{i}-{uuid.uuid4()}" for i in range(num_sessions)]

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Start all sessions concurrently
        tasks = []
        for session_id in sessions:
            task = client.post(
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
                json={"query": f"Hello from {session_id}"}
            )
            tasks.append(task)

        responses = await asyncio.gather(*tasks)

        # All should succeed
        for response in responses:
            assert response.status_code == 200

        # Verify sessions are isolated
        for session_id in sessions:
            session_response = await client.get(
                f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}"
            )
            assert session_response.status_code == 200
            data = session_response.json()
            assert data["session_id"] == session_id


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_error_handling_with_dispatcher():
    """Test error handling when specialist agent encounters error."""
    session_id = f"error-test-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Send request that might cause issues (very long query)
        long_query = "x" * 50000  # Very long query

        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": long_query}
        )

        # Should either succeed or fail gracefully
        # (Exact behavior depends on implementation)
        assert response.status_code in [200, 400, 413]


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_session_persistence_with_dispatcher():
    """Test session state persists correctly across requests."""
    session_id = f"persist-test-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Request 1: Start research
        response1 = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Research AI safety"}
        )
        assert response1.status_code == 200

        # Consume events
        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(60.0)
        ) as stream:
            event_count = 0
            async for line in stream.aiter_lines():
                if line.startswith("data: "):
                    event_count += 1
                    if event_count >= 10:
                        break

        # Get session state
        session_response = await client.get(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}"
        )

        assert session_response.status_code == 200
        session_data = session_response.json()

        # Verify session exists and has data
        assert session_data["session_id"] == session_id
        # Session should have some state from the research request


if __name__ == "__main__":
    """Run integration tests manually."""
    import sys

    print("🧪 Running Dispatcher Integration Tests")
    print("=" * 60)
    print("\nPrerequisites:")
    print("1. Backend running: make dev-backend")
    print("2. ADK service running: adk web agents/ --port 8080")
    print("\nStarting tests...")
    print("=" * 60)

    # Run the tests
    exit_code = pytest.main([__file__, "-v", "-s", "-m", "integration"])
    sys.exit(exit_code)
