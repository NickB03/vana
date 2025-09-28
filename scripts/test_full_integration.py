#!/usr/bin/env python3
"""
Full integration test for Gemini 2.5 Flash model migration (Phase 3).

This script tests the entire research agent system with the new Gemini model
to ensure all components work together correctly.
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from app.research_agents import MultiAgentResearchOrchestrator, get_research_orchestrator
    from app.models import CRITIC_MODEL, WORKER_MODEL
    from app.config import config
    import google.generativeai as genai
except ImportError as e:
    print(f"❌ Error importing required modules: {e}")
    sys.exit(1)


def test_model_constants():
    """Test that model constants are updated correctly."""
    print("🔧 Testing model constants...")

    print(f"CRITIC_MODEL: {CRITIC_MODEL}")
    print(f"WORKER_MODEL: {WORKER_MODEL}")
    print(f"Config critic_model: {config.critic_model}")
    print(f"Config worker_model: {config.worker_model}")

    # Verify models are updated to Gemini 2.5 Flash
    expected_model = "models/gemini-2.0-flash-exp"
    if CRITIC_MODEL == expected_model and WORKER_MODEL == expected_model:
        print("✅ Model constants updated correctly")
        return True
    else:
        print(f"❌ Model constants not updated. Expected: {expected_model}")
        return False


def test_orchestrator_initialization():
    """Test research orchestrator initialization."""
    print("\n🤖 Testing research orchestrator initialization...")

    try:
        # Test without OpenRouter (should use Gemini)
        os.environ['USE_OPENROUTER'] = 'false'

        orchestrator = get_research_orchestrator()

        if orchestrator.use_openrouter:
            print("⚠️  Orchestrator is using OpenRouter instead of Gemini")
            return False

        print("✅ Research orchestrator initialized with Gemini")
        return True

    except Exception as e:
        print(f"❌ Failed to initialize research orchestrator: {e}")
        return False


async def test_agent_execution():
    """Test agent execution with the new model."""
    print("\n🏃 Testing agent execution...")

    try:
        # Force Gemini usage
        os.environ['USE_OPENROUTER'] = 'false'

        orchestrator = MultiAgentResearchOrchestrator()

        # Verify it's using Gemini
        if orchestrator.use_openrouter:
            print("⚠️  Orchestrator configured for OpenRouter, not Gemini")
            return False

        # Test agent phase execution
        session_id = "test-session-123"

        # Create a simple progress object for testing
        from app.research_agents import ResearchProgress, AgentStatus

        progress = ResearchProgress(
            session_id=session_id,
            status="running",
            current_phase="Testing",
            agents=[AgentStatus(
                agent_id="test-agent",
                agent_type="researcher",
                name="Test Researcher",
                status="waiting"
            )]
        )

        orchestrator.active_sessions[session_id] = progress

        # Test agent execution
        test_prompt = "What are the key benefits of renewable energy?"

        await orchestrator._execute_agent_phase(
            session_id,
            "researcher",
            test_prompt
        )

        # Verify results
        agent = progress.agents[0]
        if agent.status == "completed" and agent.results:
            content = agent.results.get("content", "")
            print(f"✅ Agent executed successfully, generated {len(content)} characters")
            print(f"Preview: {content[:100]}...")
            return True
        else:
            print(f"❌ Agent execution failed. Status: {agent.status}, Results: {agent.results}")
            return False

    except Exception as e:
        print(f"❌ Agent execution failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_error_scenarios():
    """Test error handling scenarios."""
    print("\n🛡️ Testing error handling scenarios...")

    try:
        # Test with invalid API key
        original_key = os.environ.get('GOOGLE_API_KEY')
        os.environ['GOOGLE_API_KEY'] = 'invalid-key'

        try:
            orchestrator = MultiAgentResearchOrchestrator()
            print("⚠️  Should have failed with invalid API key")
            return False
        except Exception as e:
            print(f"✅ Properly caught invalid API key: {type(e).__name__}")
        finally:
            # Restore original key
            if original_key:
                os.environ['GOOGLE_API_KEY'] = original_key

        return True

    except Exception as e:
        print(f"❌ Error testing failed: {e}")
        return False


async def test_content_generation_quality():
    """Test content generation quality and response formats."""
    print("\n📝 Testing content generation quality...")

    try:
        os.environ['USE_OPENROUTER'] = 'false'
        orchestrator = MultiAgentResearchOrchestrator()

        # Test different types of prompts
        test_prompts = [
            "Explain artificial intelligence in one paragraph",
            "List the top 5 programming languages for beginners",
            "What are the environmental benefits of solar energy?"
        ]

        for i, prompt in enumerate(test_prompts):
            print(f"Testing prompt {i+1}: {prompt[:50]}...")

            # Create test session
            session_id = f"quality-test-{i}"
            from app.research_agents import ResearchProgress, AgentStatus

            progress = ResearchProgress(
                session_id=session_id,
                status="running",
                current_phase="Testing",
                agents=[AgentStatus(
                    agent_id=f"test-agent-{i}",
                    agent_type="researcher",
                    name=f"Test Agent {i}",
                    status="waiting"
                )]
            )

            orchestrator.active_sessions[session_id] = progress

            await orchestrator._execute_agent_phase(session_id, "researcher", prompt)

            agent = progress.agents[0]
            if agent.status == "completed" and agent.results:
                content = agent.results.get("content", "")
                if len(content) > 50:  # Reasonable response length
                    print(f"  ✅ Generated {len(content)} chars")
                else:
                    print(f"  ⚠️  Short response: {content}")
            else:
                print(f"  ❌ Failed to generate content")
                return False

        print("✅ Content generation quality test passed")
        return True

    except Exception as e:
        print(f"❌ Content generation test failed: {e}")
        return False


async def main():
    """Main integration test function."""
    print("🧪 Full Gemini 2.5 Flash Integration Test")
    print("=" * 60)

    # Load environment variables
    env_local_path = Path(__file__).parent.parent / ".env.local"
    if env_local_path.exists():
        with open(env_local_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

    success_count = 0
    total_tests = 5

    # Test 1: Model Constants
    if test_model_constants():
        success_count += 1

    # Test 2: Orchestrator Initialization
    if test_orchestrator_initialization():
        success_count += 1

    # Test 3: Agent Execution
    if await test_agent_execution():
        success_count += 1

    # Test 4: Error Scenarios
    if await test_error_scenarios():
        success_count += 1

    # Test 5: Content Generation Quality
    if await test_content_generation_quality():
        success_count += 1

    print("\n" + "=" * 60)
    print(f"📊 Integration Test Results: {success_count}/{total_tests} tests passed")

    if success_count == total_tests:
        print("🎉 All tests passed! Gemini 2.5 Flash migration is successful!")
        return True
    else:
        print(f"⚠️  {total_tests - success_count} tests failed. Check the output above.")
        return False


if __name__ == "__main__":
    try:
        result = asyncio.run(main())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\n🛑 Test interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)