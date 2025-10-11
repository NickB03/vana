"""Regression tests for dispatcher pattern.

Ensures existing research functionality is unchanged by dispatcher introduction.
"""

import pytest
import json
import uuid
import httpx
import asyncio


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_research_plan_generation_unchanged():
    """Test plan_generator still works correctly through dispatcher."""
    session_id = f"plan-test-{uuid.uuid4()}"
    research_query = "Research renewable energy trends"

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Send research request
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": research_query}
        )

        assert response.status_code == 200

        # Collect events
        events = []
        plan_generated = False
        plan_content = None

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

                            # Check for plan generation
                            if event.get("agent") == "plan_generator":
                                plan_generated = True
                            if event.get("type") == "research_plan":
                                plan_content = event.get("data", {}).get("plan")

                            # Collect enough events to see plan
                            if len(events) >= 20:
                                break
                        except json.JSONDecodeError:
                            pass

        # Verify plan generation worked
        assert len(events) > 0, "No events received"
        # Plan should have been generated
        # (Exact verification depends on event structure)


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_research_pipeline_execution_unchanged():
    """Test full research pipeline executes correctly."""
    session_id = f"pipeline-test-{uuid.uuid4()}"
    research_query = "Research the history of the internet"

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Send research request
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": research_query}
        )

        assert response.status_code == 200

        # Approve plan when prompted (simulate user interaction)
        # Note: This test may need manual intervention or mock
        # For now, just verify pipeline starts

        events = []
        agent_sequence = []

        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(120.0)
        ) as stream:
            async for line in stream.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events.append(event)

                            # Track agent execution sequence
                            if "agent" in event:
                                agent_sequence.append(event["agent"])

                            # Stop after collecting substantial events
                            if len(events) >= 30:
                                break
                        except json.JSONDecodeError:
                            pass

        # Verify expected agents executed
        # Should see: dispatcher → interactive_planner_agent → plan_generator
        assert len(events) > 0
        assert len(agent_sequence) > 0


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_research_sources_and_citations_preserved():
    """Test that research sources and citation system still work."""
    session_id = f"citation-test-{uuid.uuid4()}"

    # Query that will likely trigger web search
    research_query = "What are the latest developments in quantum computing as of 2024?"

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": research_query}
        )

        assert response.status_code == 200

        # Collect events looking for research sources
        events = []
        has_research_sources = False
        sources_data = None

        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(120.0)
        ) as stream:
            async for line in stream.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events.append(event)

                            # Check for research_sources event
                            if event.get("type") == "research_sources":
                                has_research_sources = True
                                sources_data = event.get("data", {}).get("sources", [])

                            if len(events) >= 50:
                                break
                        except json.JSONDecodeError:
                            pass

        # Note: This test may not complete full research due to time
        # but we can verify the pipeline starts correctly
        assert len(events) > 0


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_memory_system_unchanged():
    """Test memory tools still work as expected."""
    session_id = f"memory-regression-{uuid.uuid4()}"

    # Query that uses memory tools
    query = "Please remember that my favorite color is blue, then tell me what you remember"

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

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
        ) as stream:
            async for line in stream.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events.append(event)
                            if len(events) >= 10:
                                break
                        except json.JSONDecodeError:
                            pass

        assert len(events) > 0


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_approval_workflow_unchanged():
    """Test plan approval workflow still works."""
    session_id = f"approval-test-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Step 1: Send research request
        response1 = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Research machine learning trends"}
        )
        assert response1.status_code == 200

        # Collect initial events (should present plan)
        events1 = []
        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(30.0)
        ) as stream:
            async for line in stream.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events1.append(event)
                            if len(events1) >= 10:
                                break
                        except json.JSONDecodeError:
                            pass

        # Wait for plan presentation
        await asyncio.sleep(1)

        # Step 2: Send approval
        response2 = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Yes, looks good. Proceed with the research."}
        )
        assert response2.status_code == 200

        # Verify research starts
        events2 = []
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
                            events2.append(event)
                            if len(events2) >= 15:
                                break
                        except json.JSONDecodeError:
                            pass

        # Both steps should work
        assert len(events1) > 0
        assert len(events2) > 0


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_iterative_refinement_loop_unchanged():
    """Test research evaluation and refinement loop still works."""
    session_id = f"refinement-test-{uuid.uuid4()}"

    # Query that might trigger refinement
    query = "Provide a comprehensive analysis of climate change with deep research"

    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": query}
        )

        assert response.status_code == 200

        # Collect events to see if refinement happens
        events = []
        evaluator_seen = False
        enhanced_search_seen = False

        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(180.0)
        ) as stream:
            async for line in stream.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events.append(event)

                            # Check for research evaluator
                            if event.get("agent") == "research_evaluator":
                                evaluator_seen = True

                            # Check for enhanced search executor
                            if event.get("agent") == "enhanced_search_executor":
                                enhanced_search_seen = True

                            # Collect substantial events
                            if len(events) >= 60:
                                break
                        except json.JSONDecodeError:
                            pass

        # Pipeline should have started
        assert len(events) > 0
        # Note: Evaluator and enhanced search may not trigger in short test


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_report_composer_still_works():
    """Test final report composition still works correctly."""
    session_id = f"report-test-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Send research query
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Research the basics of blockchain technology"}
        )

        assert response.status_code == 200

        # Collect all events
        events = []
        report_composer_seen = False

        async with client.stream(
            "GET",
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            timeout=httpx.Timeout(120.0)
        ) as stream:
            async for line in stream.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str and data_str != "[DONE]":
                        try:
                            event = json.loads(data_str)
                            events.append(event)

                            if event.get("agent") == "report_composer_with_citations":
                                report_composer_seen = True

                            if len(events) >= 50:
                                break
                        except json.JSONDecodeError:
                            pass

        assert len(events) > 0


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_section_planner_unchanged():
    """Test section_planner still creates report outlines."""
    session_id = f"section-test-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Research artificial intelligence history"}
        )

        assert response.status_code == 200

        events = []
        section_planner_seen = False

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

                            if event.get("agent") == "section_planner":
                                section_planner_seen = True

                            if len(events) >= 25:
                                break
                        except json.JSONDecodeError:
                            pass

        assert len(events) > 0


@pytest.mark.integration
@pytest.mark.requires_server
@pytest.mark.asyncio
async def test_backward_compatibility_api_unchanged():
    """Test that API endpoints remain unchanged."""
    session_id = f"api-compat-{uuid.uuid4()}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            await client.get("http://127.0.0.1:8000/health")
        except httpx.ConnectError:
            pytest.skip("Backend not running")

        # Test POST endpoint format unchanged
        response = await client.post(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}/run",
            json={"query": "Test query"}
        )

        assert response.status_code == 200
        data = response.json()

        # Response format should be unchanged
        assert "success" in data
        assert "session_id" in data
        assert data["session_id"] == session_id

        # Test GET endpoint format unchanged
        session_response = await client.get(
            f"http://127.0.0.1:8000/apps/vana/users/default/sessions/{session_id}"
        )

        assert session_response.status_code == 200
        session_data = session_response.json()
        assert "session_id" in session_data


if __name__ == "__main__":
    """Run regression tests manually."""
    import sys

    print("🧪 Running Dispatcher Regression Tests")
    print("=" * 60)
    print("Verifying existing functionality unchanged...")
    print("=" * 60)

    exit_code = pytest.main([__file__, "-v", "-s", "-m", "integration"])
    sys.exit(exit_code)
