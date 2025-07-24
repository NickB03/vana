"""
VANA ADK Evaluation Test Suite

This module provides programmatic test execution for VANA's multi-agent system
using Google ADK's evaluation framework.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Dict, List, Optional
import pytest
from google.adk.evaluation.agent_evaluator import AgentEvaluator
from google.adk.evaluation.evaluation_result import EvaluationResult


class VANATestRunner:
    """Test runner for VANA ADK evaluation tests."""
    
    def __init__(self, agent_module: str = "agents/vana", config_path: str = "tests/test_config.json"):
        self.agent_module = agent_module
        self.config_path = config_path
        self.results: Dict[str, EvaluationResult] = {}
    
    async def run_test(self, test_path: str) -> EvaluationResult:
        """Run a single test file."""
        print(f"Running test: {test_path}")
        result = await AgentEvaluator.evaluate(
            agent_module=self.agent_module,
            eval_dataset_file_path_or_dir=test_path,
            config_file_path=self.config_path
        )
        return result
    
    async def run_test_directory(self, directory: str) -> Dict[str, EvaluationResult]:
        """Run all tests in a directory."""
        test_dir = Path(directory)
        results = {}
        
        for test_file in test_dir.glob("*.test.json"):
            result = await self.run_test(str(test_file))
            results[test_file.stem] = result
            
        for test_file in test_dir.glob("*.evalset.json"):
            result = await self.run_test(str(test_file))
            results[test_file.stem] = result
            
        return results
    
    def print_results_summary(self, results: Dict[str, EvaluationResult]):
        """Print a summary of test results."""
        print("\n" + "="*80)
        print("VANA EVALUATION RESULTS SUMMARY")
        print("="*80)
        
        total_tests = len(results)
        passed_tests = sum(1 for r in results.values() if r.passed)
        
        print(f"\nTotal Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {total_tests - passed_tests}")
        print(f"Success Rate: {passed_tests/total_tests*100:.1f}%")
        
        print("\nDetailed Results:")
        print("-"*80)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result.passed else "❌ FAIL"
            print(f"\n{test_name}: {status}")
            
            if hasattr(result, 'tool_trajectory_avg_score'):
                print(f"  Tool Trajectory Score: {result.tool_trajectory_avg_score:.3f}")
            
            if hasattr(result, 'response_match_score'):
                print(f"  Response Match Score: {result.response_match_score:.3f}")
            
            if not result.passed and hasattr(result, 'error_message'):
                print(f"  Error: {result.error_message}")


# Pytest test functions
@pytest.mark.asyncio
@pytest.mark.unit
async def test_orchestrator_routing():
    """Test orchestrator routes queries correctly to specialists."""
    runner = VANATestRunner()
    result = await runner.run_test("tests/unit/orchestrator/basic_routing.test.json")
    
    assert result.passed, f"Orchestrator routing test failed: {getattr(result, 'error_message', 'Unknown error')}"
    assert getattr(result, 'tool_trajectory_avg_score', 0) >= 0.95, "Tool trajectory score below threshold"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_delegation_patterns():
    """Test pure delegation pattern with AgentTool wrapper."""
    runner = VANATestRunner()
    result = await runner.run_test("tests/unit/orchestrator/delegation_patterns.test.json")
    
    assert result.passed, f"Delegation pattern test failed: {getattr(result, 'error_message', 'Unknown error')}"
    assert getattr(result, 'tool_trajectory_avg_score', 0) >= 0.95, "Tool trajectory score below threshold"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_error_handling():
    """Test orchestrator error handling capabilities."""
    runner = VANATestRunner()
    result = await runner.run_test("tests/unit/orchestrator/error_handling.test.json")
    
    assert result.passed, f"Error handling test failed: {getattr(result, 'error_message', 'Unknown error')}"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_simple_search_specialist():
    """Test simple search agent handles basic queries."""
    runner = VANATestRunner()
    result = await runner.run_test("tests/unit/specialists/simple_search.test.json")
    
    assert result.passed, f"Simple search test failed: {getattr(result, 'error_message', 'Unknown error')}"
    assert getattr(result, 'response_match_score', 0) >= 0.80, "Response quality below threshold"


@pytest.mark.asyncio
@pytest.mark.unit
async def test_research_specialist():
    """Test research specialist with tool usage."""
    runner = VANATestRunner()
    result = await runner.run_test("tests/unit/specialists/research_specialist.test.json")
    
    assert result.passed, f"Research specialist test failed: {getattr(result, 'error_message', 'Unknown error')}"
    assert getattr(result, 'tool_trajectory_avg_score', 0) >= 0.90, "Tool usage score below threshold"


@pytest.mark.asyncio
@pytest.mark.integration
async def test_multi_agent_workflows():
    """Test complex multi-agent interactions."""
    runner = VANATestRunner()
    result = await runner.run_test("tests/integration/multi_agent_workflows.evalset.json")
    
    assert result.passed, f"Multi-agent workflow test failed: {getattr(result, 'error_message', 'Unknown error')}"
    assert getattr(result, 'response_match_score', 0) >= 0.80, "Response quality below threshold"


# Main execution
async def main():
    """Run all VANA evaluation tests."""
    runner = VANATestRunner()
    
    # Run unit tests
    print("\n🧪 Running Unit Tests...")
    unit_results = {}
    
    # Orchestrator tests
    orchestrator_results = await runner.run_test_directory("tests/unit/orchestrator")
    unit_results.update(orchestrator_results)
    
    # Specialist tests  
    specialist_results = await runner.run_test_directory("tests/unit/specialists")
    unit_results.update(specialist_results)
    
    # Run integration tests
    print("\n🔗 Running Integration Tests...")
    integration_results = await runner.run_test_directory("tests/integration")
    
    # Combine all results
    all_results = {**unit_results, **integration_results}
    
    # Print summary
    runner.print_results_summary(all_results)
    
    # Save results to file
    with open("tests/evaluation_results.json", "w") as f:
        json.dump(
            {k: {"passed": v.passed, "scores": {
                "tool_trajectory": getattr(v, 'tool_trajectory_avg_score', None),
                "response_match": getattr(v, 'response_match_score', None)
            }} for k, v in all_results.items()},
            f,
            indent=2
        )
    
    return all_results


if __name__ == "__main__":
    asyncio.run(main())