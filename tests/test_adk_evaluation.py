"""
ADK Evaluation Test Runner for VANA

This module provides pytest integration for running ADK evaluation tests.
"""

import asyncio
import pytest
from pathlib import Path
from typing import Dict, Any
from google.adk.evaluation.agent_evaluator import AgentEvaluator


class TestVANAAgentsADK:
    """Run ADK evaluations through pytest for CI/CD integration."""
    
    @pytest.fixture
    def test_root(self) -> Path:
        """Get the test directory root."""
        return Path(__file__).parent
    
    @pytest.mark.asyncio
    async def test_orchestrator_unit_tests(self, test_root):
        """Run orchestrator unit tests using ADK evaluation."""
        result = await AgentEvaluator.evaluate(
            agent_module="agents.vana",
            eval_dataset_file_path_or_dir=str(test_root / "unit/agents/orchestrator.test.json"),
            num_runs=1  # Use 1 run for faster testing
        )
        
        assert result.passed, f"Orchestrator evaluation failed: {result.summary}"
        assert result.tool_trajectory_avg_score == 1.0, \
            f"Tool trajectory score {result.tool_trajectory_avg_score} < 1.0"
        assert result.response_match_score >= 0.8, \
            f"Response match score {result.response_match_score} < 0.8"
    
    @pytest.mark.asyncio
    async def test_file_operations_tools(self, test_root):
        """Test file operation tools using ADK evaluation."""
        result = await AgentEvaluator.evaluate(
            agent_module="agents.vana",
            eval_dataset_file_path_or_dir=str(test_root / "unit/tools/file_operations.test.json"),
            num_runs=1
        )
        
        assert result.passed, f"File operations evaluation failed: {result.summary}"
    
    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_multi_agent_routing(self, test_root):
        """Test complex multi-agent routing scenarios."""
        result = await AgentEvaluator.evaluate(
            agent_module="agents.vana",
            eval_dataset_file_path_or_dir=str(test_root / "integration/multi_agent_routing.evalset.json"),
            num_runs=1
        )
        
        assert result.passed, f"Multi-agent routing failed: {result.summary}"
        assert result.tool_trajectory_avg_score >= 0.95, \
            f"Tool trajectory score {result.tool_trajectory_avg_score} < 0.95"
    
    @pytest.mark.asyncio
    @pytest.mark.parametrize("test_file,agent_module", [
        ("orchestrator.test.json", "agents.vana"),
        # Add more as specialists are implemented
        # ("data_analyst.test.json", "agents.specialists.data_analyst"),
        # ("security_analyst.test.json", "agents.specialists.security_analyst"),
    ])
    async def test_all_unit_tests(self, test_root, test_file, agent_module):
        """Parameterized test runner for all unit tests."""
        test_path = test_root / "unit/agents" / test_file
        if not test_path.exists():
            pytest.skip(f"Test file {test_file} not yet implemented")
        
        result = await AgentEvaluator.evaluate(
            agent_module=agent_module,
            eval_dataset_file_path_or_dir=str(test_path),
            num_runs=1
        )
        
        assert result.passed, f"{agent_module} evaluation failed"


def run_adk_evaluation_cli():
    """
    Run ADK evaluations from command line.
    This can be called directly without pytest.
    """
    import sys
    import subprocess
    
    test_dir = Path(__file__).parent
    
    # Run unit tests
    print("Running unit tests...")
    result = subprocess.run([
        "adk", "eval",
        "agents/vana",
        str(test_dir / "unit"),
        f"--config_file_path={test_dir / 'unit/test_config.json'}"
    ])
    
    if result.returncode != 0:
        print("❌ Unit tests failed!")
        sys.exit(1)
    
    print("✅ All tests passed!")


if __name__ == "__main__":
    # Allow running directly
    run_adk_evaluation_cli()