"""
Test MVP Orchestrator with ADK Evaluation
Tests the simplified orchestrator that responds without tools
"""

import asyncio
import pytest
from pathlib import Path

# Test if we can import ADK evaluation
try:
    from google.adk.evaluation.agent_evaluator import AgentEvaluator
    ADK_AVAILABLE = True
except ImportError as e:
    ADK_AVAILABLE = False
    import_error = str(e)


class TestMVPOrchestrator:
    """Test the MVP orchestrator for basic ADK compliance."""
    
    @pytest.mark.skipif(not ADK_AVAILABLE, reason="ADK not available")
    @pytest.mark.asyncio
    async def test_mvp_basic_response(self):
        """Test MVP orchestrator with basic response test."""
        test_dir = Path(__file__).parent
        
        # Create a simple test case
        test_json = {
            "eval_set_id": "mvp_basic_test",
            "description": "Test MVP orchestrator basic response",
            "criteria": {
                "tool_trajectory_avg_score": 1.0,  # No tools expected
                "response_match_score": 0.9  # High similarity expected
            },
            "eval_cases": [{
                "eval_id": "help_query",
                "description": "Test response to help query",
                "conversation": [{
                    "user_content": {
                        "parts": [{"text": "What can you help me with?"}]
                    },
                    "final_response": {
                        "parts": [{"text": "I can help you with various tasks"}]
                    },
                    "intermediate_data": {
                        "tool_uses": []  # No tools expected
                    }
                }]
            }]
        }
        
        # Write test file
        import json
        test_file = test_dir / "mvp_basic.test.json"
        with open(test_file, 'w') as f:
            json.dump(test_json, f, indent=2)
        
        try:
            # Run evaluation
            result = await AgentEvaluator.evaluate(
                agent_module="agents.vana.mvp_orchestrator",
                eval_dataset_file_path_or_dir=str(test_file),
                num_runs=1,
                agent_name="mvp_orchestrator"
            )
            
            # Check results
            assert result is not None
            if hasattr(result, 'passed'):
                if result.passed:
                    print("✅ MVP test passed!")
                    if hasattr(result, 'tool_trajectory_avg_score'):
                        print(f"   Tool trajectory score: {result.tool_trajectory_avg_score}")
                    if hasattr(result, 'response_match_score'):
                        print(f"   Response match score: {result.response_match_score}")
                else:
                    print("❌ MVP test failed")
                    if hasattr(result, 'summary'):
                        print(f"   Summary: {result.summary}")
                
                assert result.passed, "MVP evaluation failed"
                
        finally:
            # Clean up test file
            if test_file.exists():
                test_file.unlink()
    
    def test_mvp_import(self):
        """Test that MVP orchestrator can be imported."""
        try:
            from agents.vana.mvp_orchestrator import mvp_orchestrator, root_agent
            assert mvp_orchestrator is not None
            assert root_agent is not None
            assert root_agent == mvp_orchestrator
            print("✅ MVP orchestrator imported successfully")
        except ImportError as e:
            pytest.fail(f"Cannot import MVP orchestrator: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])