#!/usr/bin/env python3
"""
Integration test for ADK agent system.

Verifies that the FastAPI backend correctly proxies requests to ADK agents
running on port 8080, and that SSE streaming works end-to-end.
"""

import asyncio
import json
import uuid
import pytest
import httpx
from datetime import datetime


@pytest.mark.asyncio
async def test_adk_agents_respond():
    """Test that ADK agents respond to requests (not simulated)."""
    session_id = f"test-{uuid.uuid4()}"
    research_query = "What is the capital of France?"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Step 1: Verify backend is running
        try:
            health_response = await client.get("http://127.0.0.1:8000/health")
            assert health_response.status_code == 200, "Backend not running on port 8000"
        except httpx.ConnectError:
            pytest.skip("Backend not running on port 8000")

        # Step 2: Verify ADK service is running
        try:
            adk_health = await client.get("http://127.0.0.1:8080/health")
            # ADK might not have /health, so any 404 is fine (service is up)
            assert adk_health.status_code in [200, 404], "ADK service not running on port 8080"
        except httpx.ConnectError:
            pytest.skip("ADK service not running on port 8080")

        # Step 3: Trigger research via ADK endpoint
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": research_query}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["session_id"] == session_id

        # Step 4: Connect to SSE stream and verify events
        events_received = []

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

                            # Break after receiving substantive events
                            if len(events_received) >= 5:
                                break
                        except json.JSONDecodeError:
                            continue

        # Verify we received events
        assert len(events_received) > 0, "No SSE events received from ADK"

        # Verify the events contain real data (not mock/simulated)
        has_real_content = any(
            event.get("type") in ["research_update", "research_progress", "agent_network_update"]
            for event in events_received
        )
        assert has_real_content, "Events appear to be simulated, not from real ADK agents"


@pytest.mark.asyncio
async def test_adk_proxy_integration():
    """Test that FastAPI correctly proxies to ADK on port 8080."""
    session_id = f"proxy-test-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Verify services are running
        try:
            await client.get("http://127.0.0.1:8000/health")
            await client.get("http://127.0.0.1:8080/health")
        except httpx.ConnectError:
            pytest.skip("Services not running")

        # Trigger research
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Simple test query"}
        )

        assert response.status_code == 200

        # Verify session was created in backend
        session_response = await client.get(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}"
        )

        assert session_response.status_code == 200
        session_data = session_response.json()
        assert session_data["session_id"] == session_id


if __name__ == "__main__":
    """Run integration test manually."""
    import sys

    print("🧪 Running ADK Integration Test")
    print("=" * 60)
    print("\nPrerequisites:")
    print("1. Backend running on port 8000: make dev-backend")
    print("2. ADK service running on port 8080: adk web agents/ --port 8080")
    print("\nStarting test...")
    print("=" * 60)

    # Run the test
    exit_code = pytest.main([__file__, "-v", "-s"])
    sys.exit(exit_code)
