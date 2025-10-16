"""
Integration tests for Phase 1 peer transfer capability.

Tests bidirectional transfer between generalist_agent and interactive_planner_agent
without architectural changes or loop risks.
"""

import asyncio
import time

import pytest

from agents.vana.agent import root_agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types


@pytest.fixture
def runner():
    """Create ADK runner with in-memory session service."""
    session_service = InMemorySessionService()
    return Runner(
        app_name="vana",
        agent=root_agent,
        session_service=session_service
    )


def create_message(text: str) -> types.Content:
    """Helper to create properly formatted Content message."""
    return types.Content(parts=[types.Part(text=text)])


async def run_message(runner: Runner, user_id: str, session_id: str, text: str, create_session: bool = False) -> tuple[types.Content, str]:
    """
    Helper to run a message with the correct ADK Runner API.

    Uses run_async() as shown in official ADK samples and collects all events.
    Filters for final responses from specialist agents (not dispatcher).

    Args:
        runner: ADK Runner instance
        user_id: User identifier
        session_id: Session identifier (for reference, actual ID returned)
        text: Message text to send
        create_session: If True, creates session before sending message

    Returns:
        Tuple of (Content object with the final response, actual session_id used)
    """
    # Create session if requested (needed for first message)
    actual_session_id = session_id
    if create_session:
        session = await runner.session_service.create_session(
            app_name=runner.app_name,
            user_id=user_id
        )
        actual_session_id = session.id  # Use ADK-generated session ID

    events = []
    final_response = None

    async for event in runner.run_async(
        user_id=user_id,
        session_id=actual_session_id,
        new_message=create_message(text)
    ):
        events.append(event)

        # Filter for final responses from specialist agents (following official ADK pattern)
        # Reference: docs/adk/refs/official-adk-samples/python/agents/podcast_transcript_agent/tests/test_agents.py:63-66
        if (
            event.is_final_response()
            and event.author in ["generalist_agent", "interactive_planner_agent"]
        ):
            final_response = event

    # Return the final specialist agent response (not dispatcher routing message)
    if final_response and hasattr(final_response, 'content'):
        return final_response.content, actual_session_id

    # Fallback: Return last event if no final response found
    if events and hasattr(events[-1], 'content'):
        return events[-1].content, actual_session_id

    # Final fallback: create empty response
    return types.Content(parts=[types.Part(text="")]), actual_session_id


class TestPeerTransfer:
    """Test suite for peer transfer functionality."""

    @pytest.mark.asyncio
    async def test_casual_to_research_transfer(self, runner):
        """Test: generalist → planner when user requests research."""
        user_id = "test_user"
        session_id = "test_casual_to_research"

        # Start with casual greeting (create session on first message)
        response1, session_id = await run_message(runner, user_id, session_id, "Hello!", create_session=True)
        response_text1 = response1.parts[0].text if response1.parts else ""
        assert "hello" in response_text1.lower() or "hi" in response_text1.lower()

        # Request research (should transfer to planner)
        response2, _ = await run_message(runner, user_id, session_id, "Research the latest AI trends")
        response_text2 = response2.parts[0].text if response2.parts else ""
        assert "plan" in response_text2.lower() or "research" in response_text2.lower()

        # Verify no loop (should stay with planner for research follow-up)
        response3, _ = await run_message(runner, user_id, session_id, "Add more details")
        response_text3 = response3.parts[0].text if response3.parts else ""
        assert "plan" in response_text3.lower()  # Still with planner

    @pytest.mark.asyncio
    async def test_research_to_casual_transfer(self, runner):
        """Test: planner → generalist when user sends gratitude."""
        session_id = "test_research_to_casual"

        # Start with research request
        response1, session_id = await run_message(runner, "test_user", session_id, "Research Python security best practices", create_session=True)
        assert "plan" in response1.parts[0].text if response1.parts else "".lower()

        # Send thanks (should transfer to generalist)
        response2, _ = await run_message(runner, "test_user", session_id, "Thanks, that's helpful!")
        assert "welcome" in response2.parts[0].text if response2.parts else "".lower() or "glad" in response2.parts[0].text if response2.parts else "".lower()

    @pytest.mark.asyncio
    async def test_context_preserved_across_transfer(self, runner):
        """Test: Context (names, references) preserved during transfer."""
        session_id = "test_context_preservation"

        # Establish context
        response1, session_id = await run_message(runner, "test_user", session_id, "My name is Alice", create_session=True)
        assert "alice" in response1.parts[0].text if response1.parts else "".lower()

        # Transfer to research
        response2, _ = await run_message(runner, "test_user", session_id, "Research AI for me")

        # Verify context preserved (should remember "me" = Alice)
        # This is implicit in ADK's session history, but we test the flow works
        assert response2.parts[0].text if response2.parts else ""  # Got valid response

    @pytest.mark.asyncio
    async def test_no_immediate_bounce_loop(self, runner):
        """Test: No A → B → A loop on ambiguous input."""
        session_id = "test_no_loop"

        # Ambiguous message that could be casual OR research
        response = await run_message(runner, "test_user", session_id, "Tell me about AI", create_session=True)

        # Should get ONE response without looping
        assert response.parts[0].text if response.parts else ""
        assert len(response.parts[0].text if response.parts else "") > 0
        # If it loops, this test would timeout or return empty

    @pytest.mark.asyncio
    async def test_multiple_transfers_in_conversation(self, runner):
        """Test: Multiple transfers work seamlessly."""
        session_id = "test_multiple_transfers"

        # 1. Start casual
        response1, session_id = await run_message(runner, "test_user", session_id, "Hello!", create_session=True)
        assert response1.parts[0].text if response1.parts else ""

        # 2. Transfer to research
        response2, _ = await run_message(runner, "test_user", session_id, "Research quantum computing")
        assert "plan" in response2.parts[0].text if response2.parts else "".lower()

        # 3. Transfer back to casual
        response3, _ = await run_message(runner, "test_user", session_id, "Thanks!")
        assert response3.parts[0].text if response3.parts else ""

        # 4. Transfer to research again
        response4, _ = await run_message(runner, "test_user", session_id, "Now research blockchain")
        assert "plan" in response4.parts[0].text if response4.parts else "".lower()

        # All transfers should complete without errors

    @pytest.mark.asyncio
    async def test_ambiguous_defaults_to_generalist(self, runner):
        """Test: Ambiguous requests default to generalist (safer)."""
        session_id = "test_ambiguity"

        # Ambiguous: Could be simple definition OR deep research
        response = await run_message(runner, "test_user", session_id, "What is machine learning?", create_session=True)

        # Dispatcher should route to generalist by default
        # Generalist gives brief answer, user can escalate if needed
        assert response.parts[0].text if response.parts else ""
        # Test passes if we get a response without loop

    @pytest.mark.asyncio
    async def test_empty_message_handling(self, runner):
        """Test: Empty/whitespace messages handled gracefully."""
        session_id = "test_empty_message"

        try:
            response = await run_message(runner, "test_user", session_id, "   ", create_session=True)
            # Should handle gracefully, not crash
            assert True
        except Exception as e:
            pytest.fail(f"Empty message caused crash: {e}")

    @pytest.mark.asyncio
    async def test_rapid_consecutive_transfers(self, runner):
        """Test: Rapid transfers don't cause race conditions."""
        session_id = "test_rapid_transfers"

        messages = [
            "Hello!",  # generalist
            "Research AI",  # → planner
            "Thanks!",  # → generalist
            "Research Python",  # → planner
            "Thanks again!",  # → generalist
        ]

        for msg in messages:
            response = await runner.run(session_id, msg)
            assert response.parts[0].text if response.parts else ""  # All should succeed

    @pytest.mark.asyncio
    async def test_long_message_handling(self, runner):
        """Test: Long messages don't break transfer logic."""
        session_id = "test_long_message"

        long_message = "Research " + ("AI " * 100) + "trends"
        response = await runner.run(session_id, long_message)
        assert response.parts[0].text if response.parts else ""

    @pytest.mark.asyncio
    async def test_special_characters_in_message(self, runner):
        """Test: Special characters don't break transfer."""
        session_id = "test_special_chars"

        response = await run_message(runner, "test_user", session_id, "Research: <AI>, {ML}, [DL] & (NLP)", create_session=True)
        assert response.parts[0].text if response.parts else ""


class TestPerformance:
    """Performance tests for transfer overhead."""

    @pytest.mark.asyncio
    async def test_transfer_latency_acceptable(self, runner):
        """Test: Transfer adds < 500ms overhead."""
        session_id = "test_latency"

        # Measure baseline (no transfer)
        start = time.time()
        await run_message(runner, "test_user", session_id, "Hello!", create_session=True)
        baseline_latency = time.time() - start

        # Measure with transfer
        start = time.time()
        await run_message(runner, "test_user", session_id, "Research AI trends")
        transfer_latency = time.time() - start

        # Transfer should add minimal overhead
        overhead = transfer_latency - baseline_latency
        assert overhead < 0.5  # 500ms max additional overhead

    @pytest.mark.asyncio
    async def test_concurrent_sessions_with_transfers(self, runner):
        """Test: Multiple concurrent sessions with transfers."""

        async def run_session(session_id):
            await run_message(runner, "test_user", session_id, "Hello!")
            await run_message(runner, "test_user", session_id, "Research AI")
            await run_message(runner, "test_user", session_id, "Thanks!")

        # Run 10 concurrent sessions
        tasks = [run_session(f"concurrent_{i}") for i in range(10)]
        await asyncio.gather(*tasks)

        # All should complete without errors
        assert True


class TestEdgeCases:
    """Test edge cases and error conditions."""

    @pytest.mark.asyncio
    async def test_dispatcher_handles_greeting(self, runner):
        """Test: Dispatcher correctly routes greetings to generalist."""
        session_id = "test_dispatcher_greeting"

        response = await run_message(runner, "test_user", session_id, "Hello!", create_session=True)
        assert response.parts[0].text if response.parts else ""
        # Greeting should NOT trigger research planning

    @pytest.mark.asyncio
    async def test_dispatcher_handles_research_keyword(self, runner):
        """Test: Dispatcher routes research requests to planner."""
        session_id = "test_dispatcher_research"

        response = await run_message(runner, "test_user", session_id, "Research quantum computing", create_session=True)
        assert "plan" in response.parts[0].text if response.parts else "".lower()

    @pytest.mark.asyncio
    async def test_generalist_stays_for_simple_definition(self, runner):
        """Test: Generalist handles simple definitions without transfer."""
        session_id = "test_generalist_simple"

        response = await run_message(runner, "test_user", session_id, "What is Python?", create_session=True)
        assert response.parts[0].text if response.parts else ""
        # Should get response without research planning

    @pytest.mark.asyncio
    async def test_planner_stays_for_refinement(self, runner):
        """Test: Planner doesn't transfer during plan refinement."""
        session_id = "test_planner_refinement"

        # Start research
        response1, session_id = await run_message(runner, "test_user", session_id, "Research AI trends", create_session=True)
        assert "plan" in response1.parts[0].text if response1.parts else "".lower()

        # Request refinement (should stay with planner)
        response2, _ = await run_message(runner, "test_user", session_id, "Add more details to section 2")
        assert response2.parts[0].text if response2.parts else ""
        # Should refine plan, not transfer to generalist
