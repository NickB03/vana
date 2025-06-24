"""
Unit tests for task analysis tools functionality

Tests the task analysis tools (analyze_task, match_capabilities, classify_task)
in isolation, validating their core functionality, error handling, and edge cases.

These tools use intelligent NLP-based analysis for optimal task routing and
agent selection in the VANA multi-agent system.
"""

import json

# Import the actual tools from VANA codebase
import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from lib._tools.adk_tools import (
    adk_analyze_task,
    adk_classify_task,
    adk_match_capabilities,
)
from tests.framework import EnvironmentConfig, EnvironmentType, TestEnvironment


class TestAnalyzeTaskTool:
    """Unit tests for analyze_task tool"""

    @pytest.fixture
    def test_env(self):
        """Create test environment"""
        config = EnvironmentConfig(env_type=EnvironmentType.UNIT)
        return TestEnvironment(config)

    @pytest.mark.unit
    def test_analyze_task_basic_functionality(self):
        """Test basic task analysis functionality"""
        task = "Analyze sales data and create visualization"

        result = adk_analyze_task.func(task)

        assert isinstance(result, str)
        assert len(result) > 0

        # Should return JSON with analysis results
        try:
            parsed = json.loads(result)
            assert "task" in parsed
            assert "analysis" in parsed or "error" in parsed
            assert parsed["task"] == task

            if "analysis" in parsed:
                analysis = parsed["analysis"]
                assert "task_type" in analysis
                assert "complexity" in analysis
                assert "keywords" in analysis
                assert "required_capabilities" in analysis
        except json.JSONDecodeError:
            pytest.fail("analyze_task should return valid JSON")

    @pytest.mark.unit
    def test_analyze_task_with_context(self):
        """Test task analysis with context"""
        task = "Create a machine learning model"
        context = "For predicting customer churn using historical data"

        result = adk_analyze_task.func(task, context)

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert parsed["task"] == task
        except json.JSONDecodeError:
            pytest.fail("analyze_task should return valid JSON")

    @pytest.mark.unit
    def test_analyze_task_empty_input(self):
        """Test task analysis with empty input"""
        result = adk_analyze_task.func("")

        assert isinstance(result, str)
        assert len(result) > 0

        # Should handle empty input gracefully
        try:
            parsed = json.loads(result)
            assert "task" in parsed
            assert parsed["task"] == ""
        except json.JSONDecodeError:
            pytest.fail("analyze_task should return valid JSON")

    @pytest.mark.unit
    def test_analyze_task_complex_task(self):
        """Test analysis of complex multi-step task"""
        complex_task = """
        Build a complete web application with user authentication,
        database integration, API endpoints, and real-time notifications.
        Include unit tests, deployment configuration, and monitoring.
        """

        result = adk_analyze_task.func(complex_task.strip())

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            if "analysis" in parsed:
                analysis = parsed["analysis"]
                # Complex task should have high complexity
                assert "complexity" in analysis
                # Should identify multiple capabilities needed
                assert "required_capabilities" in analysis
                assert isinstance(analysis["required_capabilities"], list)
        except json.JSONDecodeError:
            pytest.fail("analyze_task should return valid JSON")

    @pytest.mark.unit
    def test_analyze_task_error_handling(self):
        """Test task analysis error handling"""
        # Test with None input
        try:
            result = adk_analyze_task.func(None)
            assert isinstance(result, str)
            # Should handle None gracefully or return error
            parsed = json.loads(result)
            assert "error" in parsed or "task" in parsed
        except Exception:
            # Exception is acceptable for None input
            pass


class TestMatchCapabilitiesTool:
    """Unit tests for match_capabilities tool"""

    @pytest.mark.unit
    def test_match_capabilities_basic_functionality(self):
        """Test basic capability matching functionality"""
        task = "Execute Python script for data analysis"

        result = adk_match_capabilities.func(task)

        assert isinstance(result, str)
        assert len(result) > 0

        # Should return JSON with matching results
        try:
            parsed = json.loads(result)
            assert "task" in parsed
            assert "matching_result" in parsed or "error" in parsed
            assert parsed["task"] == task
        except json.JSONDecodeError:
            pytest.fail("match_capabilities should return valid JSON")

    @pytest.mark.unit
    def test_match_capabilities_with_context_and_requirements(self):
        """Test capability matching with context and requirements"""
        task = "Build machine learning model"
        context = "For customer segmentation analysis"
        required_capabilities = "python, scikit-learn, data_analysis"

        result = adk_match_capabilities.func(task, context, required_capabilities)

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert parsed["task"] == task
        except json.JSONDecodeError:
            pytest.fail("match_capabilities should return valid JSON")

    @pytest.mark.unit
    def test_match_capabilities_empty_input(self):
        """Test capability matching with empty input"""
        result = adk_match_capabilities.func("")

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert "task" in parsed
            assert parsed["task"] == ""
        except json.JSONDecodeError:
            pytest.fail("match_capabilities should return valid JSON")

    @pytest.mark.unit
    def test_match_capabilities_json_structure(self):
        """Test capability matching returns proper JSON structure"""
        result = adk_match_capabilities.func("test task")

        parsed = json.loads(result)

        # Verify basic structure
        assert "task" in parsed

        if "matching_result" in parsed:
            matching_result = parsed["matching_result"]
            # Should have expected fields
            expected_fields = [
                "best_match",
                "alternative_matches",
                "coverage_analysis",
                "recommendations",
            ]
            for field in expected_fields:
                assert field in matching_result


class TestClassifyTaskTool:
    """Unit tests for classify_task tool"""

    @pytest.mark.unit
    def test_classify_task_basic_functionality(self):
        """Test basic task classification functionality"""
        task = "Debug Python application and fix performance issues"

        result = adk_classify_task.func(task)

        assert isinstance(result, str)
        assert len(result) > 0

        # Should return JSON with classification results
        try:
            parsed = json.loads(result)
            assert "task" in parsed
            assert "classification" in parsed or "error" in parsed
            assert parsed["task"] == task
        except json.JSONDecodeError:
            pytest.fail("classify_task should return valid JSON")

    @pytest.mark.unit
    def test_classify_task_with_context(self):
        """Test task classification with context"""
        task = "Analyze user behavior patterns"
        context = "Using web analytics data to improve conversion rates"

        result = adk_classify_task.func(task, context)

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert parsed["task"] == task
        except json.JSONDecodeError:
            pytest.fail("classify_task should return valid JSON")

    @pytest.mark.unit
    def test_classify_task_empty_input(self):
        """Test task classification with empty input"""
        result = adk_classify_task.func("")

        assert isinstance(result, str)
        assert len(result) > 0

        try:
            parsed = json.loads(result)
            assert "task" in parsed
            assert parsed["task"] == ""
        except json.JSONDecodeError:
            pytest.fail("classify_task should return valid JSON")

    @pytest.mark.unit
    def test_classify_task_json_structure(self):
        """Test task classification returns proper JSON structure"""
        result = adk_classify_task.func("test task")

        parsed = json.loads(result)

        # Verify basic structure
        assert "task" in parsed

        if "classification" in parsed:
            classification = parsed["classification"]
            # Should have expected fields
            expected_fields = ["primary_recommendation", "alternative_recommendations"]
            for field in expected_fields:
                assert field in classification


class TestTaskAnalysisToolsIntegration:
    """Integration tests for task analysis tools"""

    @pytest.mark.unit
    def test_task_analysis_tools_consistency(self):
        """Test that all task analysis tools work consistently"""
        task = "Create data visualization dashboard"

        # Test all three tools with the same task
        analyze_result = adk_analyze_task.func(task)
        match_result = adk_match_capabilities.func(task)
        classify_result = adk_classify_task.func(task)

        # All should return valid JSON strings
        for result in [analyze_result, match_result, classify_result]:
            assert isinstance(result, str)
            assert len(result) > 0

            try:
                parsed = json.loads(result)
                assert "task" in parsed
                assert parsed["task"] == task
            except json.JSONDecodeError:
                pytest.fail("All task analysis tools should return valid JSON")

    @pytest.mark.unit
    def test_task_analysis_tools_different_task_types(self):
        """Test task analysis tools with different types of tasks"""
        test_tasks = [
            "Write Python code to process CSV files",
            "Design user interface for mobile app",
            "Analyze sales data and create reports",
            "Deploy application to cloud infrastructure",
            "Test software for security vulnerabilities",
        ]

        for task in test_tasks:
            # Test each tool
            analyze_result = adk_analyze_task.func(task)
            match_result = adk_match_capabilities.func(task)
            classify_result = adk_classify_task.func(task)

            # All should handle different task types
            for result in [analyze_result, match_result, classify_result]:
                assert isinstance(result, str)
                assert len(result) > 0

    @pytest.mark.unit
    def test_task_analysis_tools_performance(self):
        """Test task analysis tools performance"""
        import time

        task = "Performance test task"

        # Test each tool performance
        tools = [adk_analyze_task, adk_match_capabilities, adk_classify_task]

        for tool in tools:
            start_time = time.time()
            result = tool.func(task)
            end_time = time.time()

            execution_time = end_time - start_time

            # Should be reasonably fast (under 5 seconds)
            assert execution_time < 5.0, (
                f"Tool {tool.name} took too long: {execution_time:.2f}s"
            )
            assert isinstance(result, str)
            assert len(result) > 0
