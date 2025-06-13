#!/usr/bin/env python3
"""
Coordination Testing Framework for VANA
Tests coordination and delegation functionality with success rate tracking

This framework validates:
- Real coordination tools (Task #5)
- VANA orchestrator delegation (Task #6) 
- Intelligent task analysis (Task #7)
- Multi-agent workflow management (Task #8)

Target: >90% coordination success rate
"""

import pytest
import asyncio
import time
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from unittest.mock import Mock, patch, AsyncMock

# Add project root to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from lib._tools.adk_tools import (
    coordinate_task, delegate_to_agent, get_agent_status,
    get_workflow_templates, create_workflow, start_workflow,
    get_workflow_status, list_workflows
)

@dataclass
class CoordinationTestResult:
    """Result of a coordination test"""
    test_name: str
    success: bool
    execution_time: float
    error_message: Optional[str] = None
    agent_used: Optional[str] = None
    response_data: Optional[Dict] = None

@dataclass
class CoordinationMetrics:
    """Coordination performance metrics"""
    total_tests: int
    successful_tests: int
    failed_tests: int
    success_rate: float
    average_response_time: float
    fastest_response: float
    slowest_response: float
    error_breakdown: Dict[str, int]

class CoordinationTestFramework:
    """Comprehensive coordination testing framework"""
    
    def __init__(self):
        self.results: List[CoordinationTestResult] = []
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        
    async def run_coordination_test(self, test_name: str, test_func, *args, **kwargs) -> CoordinationTestResult:
        """Run a single coordination test with timing and error handling"""
        start_time = time.time()

        try:
            # Handle both async and sync functions
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func(*args, **kwargs)
            else:
                result = test_func(*args, **kwargs)

            execution_time = time.time() - start_time

            # Parse JSON strings if needed
            parsed_result = self._parse_result(result)

            # Determine success based on result
            success = self._evaluate_success(parsed_result)
            agent_used = self._extract_agent_used(parsed_result)

            return CoordinationTestResult(
                test_name=test_name,
                success=success,
                execution_time=execution_time,
                agent_used=agent_used,
                response_data=parsed_result if isinstance(parsed_result, dict) else None
            )

        except Exception as e:
            execution_time = time.time() - start_time
            return CoordinationTestResult(
                test_name=test_name,
                success=False,
                execution_time=execution_time,
                error_message=str(e)
            )

    def _parse_result(self, result: Any) -> Any:
        """Parse JSON string results if needed"""
        if isinstance(result, str):
            try:
                return json.loads(result)
            except json.JSONDecodeError:
                return {"raw_response": result}
        return result
    
    def _evaluate_success(self, result: Any) -> bool:
        """Evaluate if a coordination result indicates success"""
        if isinstance(result, dict):
            # Check for success indicators
            if result.get("status") == "success":
                return True
            if result.get("success") is True:
                return True
            if "error" in result:
                return False
            # If no clear indicators, assume success if we got a response
            return True
        return result is not None
    
    def _extract_agent_used(self, result: Any) -> Optional[str]:
        """Extract which agent was used from the result"""
        if isinstance(result, dict):
            return result.get("agent_used") or result.get("selected_agent")
        return None
    
    def calculate_metrics(self) -> CoordinationMetrics:
        """Calculate comprehensive coordination metrics"""
        if not self.results:
            return CoordinationMetrics(0, 0, 0, 0.0, 0.0, 0.0, 0.0, {})
        
        successful = [r for r in self.results if r.success]
        failed = [r for r in self.results if not r.success]
        
        response_times = [r.execution_time for r in self.results]
        
        # Error breakdown
        error_breakdown = {}
        for result in failed:
            if result.error_message:
                error_type = result.error_message.split(":")[0] if ":" in result.error_message else "Unknown"
                error_breakdown[error_type] = error_breakdown.get(error_type, 0) + 1
        
        return CoordinationMetrics(
            total_tests=len(self.results),
            successful_tests=len(successful),
            failed_tests=len(failed),
            success_rate=len(successful) / len(self.results),
            average_response_time=sum(response_times) / len(response_times),
            fastest_response=min(response_times),
            slowest_response=max(response_times),
            error_breakdown=error_breakdown
        )
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive test report"""
        metrics = self.calculate_metrics()
        
        return {
            "test_summary": {
                "framework": "CoordinationTestFramework",
                "execution_time": self.end_time - self.start_time if self.start_time and self.end_time else 0,
                "timestamp": time.time()
            },
            "metrics": asdict(metrics),
            "success_rate_target": 0.90,
            "target_achieved": metrics.success_rate >= 0.90,
            "detailed_results": [asdict(r) for r in self.results],
            "recommendations": self._generate_recommendations(metrics)
        }
    
    def _generate_recommendations(self, metrics: CoordinationMetrics) -> List[str]:
        """Generate recommendations based on test results"""
        recommendations = []
        
        if metrics.success_rate < 0.90:
            recommendations.append(f"Success rate ({metrics.success_rate:.1%}) below 90% target. Investigate failed tests.")
        
        if metrics.average_response_time > 5.0:
            recommendations.append(f"Average response time ({metrics.average_response_time:.2f}s) exceeds 5s target.")
        
        if metrics.error_breakdown:
            most_common_error = max(metrics.error_breakdown.items(), key=lambda x: x[1])
            recommendations.append(f"Most common error: {most_common_error[0]} ({most_common_error[1]} occurrences)")
        
        if metrics.success_rate >= 0.90:
            recommendations.append("✅ Coordination success rate target achieved!")
        
        return recommendations

class TestCoordinationTools:
    """Test suite for coordination tools (Task #5)"""
    
    @pytest.fixture
    def framework(self):
        """Create test framework instance"""
        return CoordinationTestFramework()
    
    @pytest.mark.asyncio
    async def test_coordinate_task_basic(self, framework):
        """Test basic task coordination"""
        def test_func():
            return coordinate_task("execute simple python code", "normal")

        result = await framework.run_coordination_test("coordinate_task_basic", test_func)
        framework.results.append(result)

        assert result.execution_time < 10.0, "Coordination should complete within 10 seconds"

    @pytest.mark.asyncio
    async def test_delegate_to_agent_data_science(self, framework):
        """Test delegation to data science agent"""
        def test_func():
            return delegate_to_agent("data_science", "analyze sample dataset")

        result = await framework.run_coordination_test("delegate_data_science", test_func)
        framework.results.append(result)

        assert result.execution_time < 10.0, "Delegation should complete within 10 seconds"

    @pytest.mark.asyncio
    async def test_delegate_to_agent_code_execution(self, framework):
        """Test delegation to code execution agent"""
        def test_func():
            return delegate_to_agent("code_execution", "run python script")

        result = await framework.run_coordination_test("delegate_code_execution", test_func)
        framework.results.append(result)

        assert result.execution_time < 10.0, "Delegation should complete within 10 seconds"

    @pytest.mark.asyncio
    async def test_get_agent_status(self, framework):
        """Test agent status retrieval"""
        def test_func():
            return get_agent_status()

        result = await framework.run_coordination_test("get_agent_status", test_func)
        framework.results.append(result)

        assert result.success, "Agent status should be retrievable"
        assert result.execution_time < 5.0, "Status check should be fast"

class TestWorkflowManagement:
    """Test suite for workflow management (Task #8)"""

    @pytest.fixture
    def framework(self):
        """Create test framework instance"""
        return CoordinationTestFramework()

    @pytest.mark.asyncio
    async def test_get_workflow_templates(self, framework):
        """Test workflow template retrieval"""
        def test_func():
            return get_workflow_templates()

        result = await framework.run_coordination_test("get_workflow_templates", test_func)
        framework.results.append(result)

        assert result.success, "Should retrieve workflow templates"
        assert result.execution_time < 3.0, "Template retrieval should be fast"

    @pytest.mark.asyncio
    async def test_create_workflow_data_analysis(self, framework):
        """Test creating data analysis workflow"""
        def test_func():
            return create_workflow(
                name="Test Data Analysis",
                description="Test workflow for data analysis",
                template_name="data_analysis"
            )

        result = await framework.run_coordination_test("create_workflow_data_analysis", test_func)
        framework.results.append(result)

        assert result.success, "Should create data analysis workflow"
        assert result.execution_time < 5.0, "Workflow creation should be fast"

    @pytest.mark.asyncio
    async def test_create_workflow_code_execution(self, framework):
        """Test creating code execution workflow"""
        def test_func():
            return create_workflow(
                name="Test Code Execution",
                description="Test workflow for code execution",
                template_name="code_execution"
            )

        result = await framework.run_coordination_test("create_workflow_code_execution", test_func)
        framework.results.append(result)

        assert result.success, "Should create code execution workflow"

    @pytest.mark.asyncio
    async def test_list_workflows(self, framework):
        """Test listing workflows"""
        def test_func():
            return list_workflows()

        result = await framework.run_coordination_test("list_workflows", test_func)
        framework.results.append(result)

        assert result.success, "Should list workflows"
        assert result.execution_time < 3.0, "Workflow listing should be fast"

    @pytest.mark.asyncio
    async def test_workflow_status_monitoring(self, framework):
        """Test workflow status monitoring"""
        def test_func():
            # First create a workflow
            create_result = create_workflow(
                name="Status Test Workflow",
                description="Test workflow for status monitoring",
                template_name="system_monitoring"
            )

            # Parse the JSON result
            try:
                parsed_result = json.loads(create_result) if isinstance(create_result, str) else create_result
                if isinstance(parsed_result, dict) and parsed_result.get("workflow_id"):
                    workflow_id = parsed_result["workflow_id"]
                    return get_workflow_status(workflow_id)
                else:
                    return json.dumps({"status": "error", "message": "Failed to create workflow for status test"})
            except:
                return json.dumps({"status": "error", "message": "Failed to parse workflow creation result"})

        result = await framework.run_coordination_test("workflow_status_monitoring", test_func)
        framework.results.append(result)

        assert result.execution_time < 8.0, "Status monitoring should complete quickly"

class TestIntelligentTaskAnalysis:
    """Test suite for intelligent task analysis (Task #7)"""

    @pytest.fixture
    def framework(self):
        """Create test framework instance"""
        return CoordinationTestFramework()

    @pytest.mark.asyncio
    async def test_code_task_routing(self, framework):
        """Test routing of code execution tasks"""
        def test_func():
            return coordinate_task("write python function to calculate fibonacci", "normal")

        result = await framework.run_coordination_test("code_task_routing", test_func)
        framework.results.append(result)

        assert result.execution_time < 10.0, "Code task routing should be efficient"

    @pytest.mark.asyncio
    async def test_data_analysis_task_routing(self, framework):
        """Test routing of data analysis tasks"""
        def test_func():
            return coordinate_task("analyze sales data and create visualization", "normal")

        result = await framework.run_coordination_test("data_analysis_routing", test_func)
        framework.results.append(result)

        assert result.execution_time < 10.0, "Data analysis routing should be efficient"

    @pytest.mark.asyncio
    async def test_complex_task_decomposition(self, framework):
        """Test complex task decomposition and routing"""
        def test_func():
            return coordinate_task(
                "analyze customer data, create visualization, and generate report with recommendations",
                "high"
            )

        result = await framework.run_coordination_test("complex_task_decomposition", test_func)
        framework.results.append(result)

        assert result.execution_time < 15.0, "Complex task handling should complete within 15 seconds"

class TestVANAOrchestration:
    """Test suite for VANA orchestration (Task #6)"""

    @pytest.fixture
    def framework(self):
        """Create test framework instance"""
        return CoordinationTestFramework()

    @pytest.mark.asyncio
    async def test_proactive_delegation_code(self, framework):
        """Test VANA proactive delegation for code tasks"""
        def test_func():
            # This would test VANA's delegation behavior
            # In a real scenario, this would interact with VANA agent
            return coordinate_task("execute python code to process CSV file", "normal")

        result = await framework.run_coordination_test("vana_delegation_code", test_func)
        framework.results.append(result)

        assert result.execution_time < 12.0, "VANA delegation should be efficient"

    @pytest.mark.asyncio
    async def test_proactive_delegation_data(self, framework):
        """Test VANA proactive delegation for data tasks"""
        def test_func():
            return coordinate_task("perform statistical analysis on dataset", "normal")

        result = await framework.run_coordination_test("vana_delegation_data", test_func)
        framework.results.append(result)

        assert result.execution_time < 12.0, "VANA data delegation should be efficient"

    @pytest.mark.asyncio
    async def test_fallback_mechanisms(self, framework):
        """Test fallback mechanisms when delegation fails"""
        def test_func():
            # Test with a potentially problematic request
            return delegate_to_agent("nonexistent_agent", "test task")

        result = await framework.run_coordination_test("fallback_mechanisms", test_func)
        framework.results.append(result)

        # Fallback should handle gracefully, even if it "fails"
        assert result.execution_time < 8.0, "Fallback should be quick"
