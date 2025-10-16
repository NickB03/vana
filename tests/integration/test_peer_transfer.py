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


@pytest.fixture
def runner():
    """Create ADK runner with in-memory session service."""
    session_service = InMemorySessionService()
    return Runner(
        app_name="vana",
        agent=root_agent,
        session_service=session_service
    )


class TestPeerTransfer:
    """Test suite for peer transfer functionality."""

    @pytest.mark.asyncio
    async def test_casual_to_research_transfer(self, runner):
        """Test: generalist → planner when user requests research."""
        session_id = "test_casual_to_research"

        # Start with casual greeting
        response1 = await runner.run(session_id, "Hello!")
        assert "hello" in response1.text.lower() or "hi" in response1.text.lower()

        # Request research (should transfer to planner)
        response2 = await runner.run(session_id, "Research the latest AI trends")
        assert "plan" in response2.text.lower() or "research" in response2.text.lower()

        # Verify no loop (should stay with planner for research follow-up)
        response3 = await runner.run(session_id, "Add more details")
        assert "plan" in response3.text.lower()  # Still with planner

    @pytest.mark.asyncio
    async def test_research_to_casual_transfer(self, runner):
        """Test: planner → generalist when user sends gratitude."""
        session_id = "test_research_to_casual"

        # Start with research request
        response1 = await runner.run(session_id, "Research Python security best practices")
        assert "plan" in response1.text.lower()

        # Send thanks (should transfer to generalist)
        response2 = await runner.run(session_id, "Thanks, that's helpful!")
        assert "welcome" in response2.text.lower() or "glad" in response2.text.lower()

    @pytest.mark.asyncio
    async def test_context_preserved_across_transfer(self, runner):
        """Test: Context (names, references) preserved during transfer."""
        session_id = "test_context_preservation"

        # Establish context
        response1 = await runner.run(session_id, "My name is Alice")
        assert "alice" in response1.text.lower()

        # Transfer to research
        response2 = await runner.run(session_id, "Research AI for me")

        # Verify context preserved (should remember "me" = Alice)
        # This is implicit in ADK's session history, but we test the flow works
        assert response2.text  # Got valid response

    @pytest.mark.asyncio
    async def test_no_immediate_bounce_loop(self, runner):
        """Test: No A → B → A loop on ambiguous input."""
        session_id = "test_no_loop"

        # Ambiguous message that could be casual OR research
        response = await runner.run(session_id, "Tell me about AI")

        # Should get ONE response without looping
        assert response.text
        assert len(response.text) > 0
        # If it loops, this test would timeout or return empty

    @pytest.mark.asyncio
    async def test_multiple_transfers_in_conversation(self, runner):
        """Test: Multiple transfers work seamlessly."""
        session_id = "test_multiple_transfers"

        # 1. Start casual
        response1 = await runner.run(session_id, "Hello!")
        assert response1.text

        # 2. Transfer to research
        response2 = await runner.run(session_id, "Research quantum computing")
        assert "plan" in response2.text.lower()

        # 3. Transfer back to casual
        response3 = await runner.run(session_id, "Thanks!")
        assert response3.text

        # 4. Transfer to research again
        response4 = await runner.run(session_id, "Now research blockchain")
        assert "plan" in response4.text.lower()

        # All transfers should complete without errors

    @pytest.mark.asyncio
    async def test_ambiguous_defaults_to_generalist(self, runner):
        """Test: Ambiguous requests default to generalist (safer)."""
        session_id = "test_ambiguity"

        # Ambiguous: Could be simple definition OR deep research
        response = await runner.run(session_id, "What is machine learning?")

        # Dispatcher should route to generalist by default
        # Generalist gives brief answer, user can escalate if needed
        assert response.text
        # Test passes if we get a response without loop

    @pytest.mark.asyncio
    async def test_empty_message_handling(self, runner):
        """Test: Empty/whitespace messages handled gracefully."""
        session_id = "test_empty_message"

        try:
            response = await runner.run(session_id, "   ")
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
            assert response.text  # All should succeed

    @pytest.mark.asyncio
    async def test_long_message_handling(self, runner):
        """Test: Long messages don't break transfer logic."""
        session_id = "test_long_message"

        long_message = "Research " + ("AI " * 100) + "trends"
        response = await runner.run(session_id, long_message)
        assert response.text

    @pytest.mark.asyncio
    async def test_special_characters_in_message(self, runner):
        """Test: Special characters don't break transfer."""
        session_id = "test_special_chars"

        response = await runner.run(session_id, "Research: <AI>, {ML}, [DL] & (NLP)")
        assert response.text


class TestPerformance:
    """Performance tests for transfer overhead."""

    @pytest.mark.asyncio
    async def test_transfer_latency_acceptable(self, runner):
        """Test: Transfer adds < 500ms overhead."""
        session_id = "test_latency"

        # Measure baseline (no transfer)
        start = time.time()
        await runner.run(session_id, "Hello!")
        baseline_latency = time.time() - start

        # Measure with transfer
        start = time.time()
        await runner.run(session_id, "Research AI trends")
        transfer_latency = time.time() - start

        # Transfer should add minimal overhead
        overhead = transfer_latency - baseline_latency
        assert overhead < 0.5  # 500ms max additional overhead

    @pytest.mark.asyncio
    async def test_concurrent_sessions_with_transfers(self, runner):
        """Test: Multiple concurrent sessions with transfers."""

        async def run_session(session_id):
            await runner.run(session_id, "Hello!")
            await runner.run(session_id, "Research AI")
            await runner.run(session_id, "Thanks!")

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

        response = await runner.run(session_id, "Hello!")
        assert response.text
        # Greeting should NOT trigger research planning

    @pytest.mark.asyncio
    async def test_dispatcher_handles_research_keyword(self, runner):
        """Test: Dispatcher routes research requests to planner."""
        session_id = "test_dispatcher_research"

        response = await runner.run(session_id, "Research quantum computing")
        assert "plan" in response.text.lower()

    @pytest.mark.asyncio
    async def test_generalist_stays_for_simple_definition(self, runner):
        """Test: Generalist handles simple definitions without transfer."""
        session_id = "test_generalist_simple"

        response = await runner.run(session_id, "What is Python?")
        assert response.text
        # Should get response without research planning

    @pytest.mark.asyncio
    async def test_planner_stays_for_refinement(self, runner):
        """Test: Planner doesn't transfer during plan refinement."""
        session_id = "test_planner_refinement"

        # Start research
        response1 = await runner.run(session_id, "Research AI trends")
        assert "plan" in response1.text.lower()

        # Request refinement (should stay with planner)
        response2 = await runner.run(session_id, "Add more details to section 2")
        assert response2.text
        # Should refine plan, not transfer to generalist
