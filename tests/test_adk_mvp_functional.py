"""
Functional ADK Test for VANA Phase 1 MVP

This test validates that our Phase 1 implementation works correctly with ADK components
even if formal ADK evaluation has issues. This is sufficient for MVP validation.
"""

import asyncio
import pytest
from pathlib import Path

class TestADKMVPFunctional:
    """Functional tests that validate ADK integration works for Phase 1 MVP."""
    
    @pytest.mark.asyncio
    async def test_agent_responds_correctly_via_adk_runner(self):
        """Test that our agent responds correctly when run through ADK Runner."""
        try:
            from google.adk.runners import Runner
            from google.adk.sessions import InMemorySessionService
            from google.genai.types import Content, Part
            from agents.vana.agent import root_agent
            
            print(f"Testing agent: {root_agent.name} ({root_agent.model})")
            
            # Create ADK session and runner
            session_service = InMemorySessionService()
            session = await session_service.create_session(
                app_name="mvp_test",
                user_id="test_user",
                session_id="test_session"
            )
            
            runner = Runner(
                agent=root_agent,
                app_name="mvp_test", 
                session_service=session_service
            )
            
            # Test the query from our evaluation test
            test_query = "What can you help me with?"
            expected_response = "I can help you with various tasks"
            
            user_message = Content(parts=[Part(text=test_query)], role="user")
            
            response_text = ""
            async for event in runner.run_async(
                user_id="test_user",
                session_id="test_session",
                new_message=user_message
            ):
                if event.is_final_response() and event.content and event.content.parts:
                    response_text = event.content.parts[0].text
                    break
            
            print(f"Query: '{test_query}'")
            print(f"Expected: '{expected_response}'")
            print(f"Actual: '{response_text}'")
            print(f"Match: {response_text == expected_response}")
            
            # Test passes if agent responds correctly
            assert response_text == expected_response, f"Agent response mismatch: expected '{expected_response}', got '{response_text}'"
            print("✅ Agent responds correctly via ADK Runner")
            
        except Exception as e:
            pytest.fail(f"ADK Runner test failed: {e}")
    
    def test_adk_components_importable(self):
        """Test that all required ADK components can be imported."""
        try:
            # Core ADK components
            from google.adk.agents import LlmAgent
            from google.adk.runners import Runner  
            from google.adk.sessions import InMemorySessionService
            from google.genai.types import Content, Part
            
            # Evaluation components (optional for MVP)
            try:
                from google.adk.evaluation.agent_evaluator import AgentEvaluator
                evaluation_available = True
            except ImportError:
                evaluation_available = False
            
            print("✅ Core ADK components imported successfully")
            print(f"   Evaluation available: {evaluation_available}")
            
        except ImportError as e:
            pytest.fail(f"ADK import test failed: {e}")
    
    def test_agent_module_structure_adk_compatible(self):
        """Test that our agent module structure is compatible with ADK standards."""
        try:
            # Test the ADK-expected module structure
            import agents.vana
            assert hasattr(agents.vana, 'agent'), "Missing agents.vana.agent module"
            assert hasattr(agents.vana.agent, 'root_agent'), "Missing agents.vana.agent.root_agent"
            
            # Test the root_agent is an ADK LlmAgent
            from google.adk.agents import LlmAgent
            root_agent = agents.vana.agent.root_agent
            assert isinstance(root_agent, LlmAgent), f"root_agent is not LlmAgent: {type(root_agent)}"
            
            # Test required attributes
            assert hasattr(root_agent, 'name'), "root_agent missing name"
            assert hasattr(root_agent, 'model'), "root_agent missing model"
            assert hasattr(root_agent, 'instruction'), "root_agent missing instruction"
            
            print(f"✅ Agent module structure ADK-compatible")
            print(f"   Agent: {root_agent.name}")
            print(f"   Model: {root_agent.model}")
            print(f"   Type: {type(root_agent).__name__}")
            
        except Exception as e:
            pytest.fail(f"Agent module structure test failed: {e}")
    
    def test_evaluation_test_file_format(self):
        """Test that our evaluation test file has correct format."""
        test_file = Path(__file__).parent / "unit/agents/phase1_mvp.test.json"
        
        try:
            import json
            with open(test_file, 'r') as f:
                test_data = json.load(f)
            
            # Validate required structure
            assert "eval_set_id" in test_data, "Missing eval_set_id"
            assert "eval_cases" in test_data, "Missing eval_cases"
            assert len(test_data["eval_cases"]) > 0, "No eval cases"
            
            eval_case = test_data["eval_cases"][0]
            assert "eval_id" in eval_case, "Missing eval_id"
            assert "conversation" in eval_case, "Missing conversation"
            assert len(eval_case["conversation"]) > 0, "No conversation entries"
            
            conversation = eval_case["conversation"][0]
            assert "user_content" in conversation, "Missing user_content"
            assert "final_response" in conversation, "Missing final_response"
            assert "intermediate_data" in conversation, "Missing intermediate_data"
            
            print(f"✅ Test file format is correct")
            print(f"   File: {test_file}")
            print(f"   Eval set: {test_data['eval_set_id']}")
            print(f"   Cases: {len(test_data['eval_cases'])}")
            
        except Exception as e:
            pytest.fail(f"Test file format validation failed: {e}")


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "-s"])