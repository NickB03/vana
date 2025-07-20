"""
Minimal MVP ADK Evaluation Test for Phase 1

Simple test to verify ADK evaluation works with our orchestrator.
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


class TestPhase1ADK:
    """Minimal ADK evaluation test for Phase 1."""
    
    @pytest.mark.skipif(not ADK_AVAILABLE, reason=f"ADK not available: {import_error if not ADK_AVAILABLE else ''}")
    @pytest.mark.asyncio
    async def test_phase1_mvp_orchestrator(self):
        """Run minimal MVP test for Phase 1 orchestrator."""
        test_dir = Path(__file__).parent
        
        # Try to run the evaluation
        try:
            # First try with config file if supported
            config_file = test_dir / "test_config.json"
            
            try:
                result = await AgentEvaluator.evaluate(
                    agent_module="agents.vana",
                    eval_dataset_file_path_or_dir=str(test_dir / "unit/agents/phase1_mvp.test.json"),
                    config_file_path=str(config_file),
                    num_runs=1
                )
            except TypeError:
                # Fallback for older ADK versions without config_file_path
                print("⚠️ config_file_path not supported, using default thresholds")
                result = await AgentEvaluator.evaluate(
                    agent_module="agents.vana",
                    eval_dataset_file_path_or_dir=str(test_dir / "unit/agents/phase1_mvp.test.json"),
                    num_runs=1
                )
            
            # Basic assertions
            assert result is not None, "Evaluation returned None"
            assert hasattr(result, 'passed'), "Result missing 'passed' attribute"
            
            # Check if passed
            if result.passed:
                print(f"✅ Phase 1 MVP test passed!")
                if hasattr(result, 'tool_trajectory_avg_score'):
                    print(f"   Tool trajectory score: {result.tool_trajectory_avg_score}")
                if hasattr(result, 'response_match_score'):
                    print(f"   Response match score: {result.response_match_score}")
            else:
                print(f"❌ Phase 1 MVP test failed")
                if hasattr(result, 'summary'):
                    print(f"   Summary: {result.summary}")
                    
            assert result.passed, "Phase 1 MVP evaluation failed"
            
        except Exception as e:
            pytest.fail(f"ADK evaluation error: {str(e)}")
    
    def test_adk_import(self):
        """Test that ADK can be imported."""
        assert ADK_AVAILABLE, f"Cannot import ADK: {import_error if not ADK_AVAILABLE else ''}"
        print("✅ ADK evaluation module imported successfully")
    
    def test_orchestrator_import(self):
        """Test that orchestrator can be imported."""
        try:
            # Import should work with conftest.py path setup
            from agents.vana.enhanced_orchestrator import enhanced_orchestrator
            assert enhanced_orchestrator is not None
            assert hasattr(enhanced_orchestrator, 'name')
            assert hasattr(enhanced_orchestrator, 'model')
            print(f"✅ Enhanced orchestrator imported successfully: {enhanced_orchestrator.name}")
        except ImportError as e:
            pytest.fail(f"Cannot import orchestrator: {e}")


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "-s"])