"""
Unit tests for Tool Registry (Phase 2)
Tests tool categorization, registration, and distribution
"""

from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from lib._tools.adk_tools import FunctionTool
from lib._tools.registry import ToolCategory, ToolMetadata, ToolRegistry, get_tool_registry


def create_mock_tool(name):
    """Helper to create a mock tool with name attribute"""
    tool = Mock(spec=FunctionTool)
    tool.name = name
    return tool


@pytest.mark.unit
class TestToolCategory:
    """Test tool category enum"""

    def test_tool_categories_exist(self):
        """Verify all required categories are defined"""
        assert ToolCategory.ANALYSIS
        assert ToolCategory.EXECUTION
        assert ToolCategory.INTEGRATION
        assert ToolCategory.UTILITY

    def test_category_values(self):
        """Verify category string values"""
        assert ToolCategory.ANALYSIS.value == "analysis"
        assert ToolCategory.EXECUTION.value == "execution"
        assert ToolCategory.INTEGRATION.value == "integration"
        assert ToolCategory.UTILITY.value == "utility"


@pytest.mark.unit
class TestToolMetadata:
    """Test tool metadata tracking"""

    def test_metadata_initialization(self):
        """Test metadata is properly initialized"""
        mock_tool = create_mock_tool("test_tool")
        metadata = ToolMetadata(mock_tool, ToolCategory.UTILITY)

        assert metadata.tool == mock_tool
        assert metadata.category == ToolCategory.UTILITY
        assert metadata.usage_count == 0
        assert metadata.last_used is None
        assert metadata.success_rate == 1.0
        assert metadata.avg_execution_time == 0.0
        assert isinstance(metadata.created_at, datetime)

    def test_record_usage_success(self):
        """Test recording successful tool usage"""
        mock_tool = create_mock_tool("test_tool")
        metadata = ToolMetadata(mock_tool, ToolCategory.UTILITY)

        metadata.record_usage(success=True, execution_time=0.5)

        assert metadata.usage_count == 1
        assert metadata.last_used is not None
        assert metadata.success_rate == 1.0
        assert metadata.avg_execution_time == 0.5

    def test_record_usage_failure(self):
        """Test recording failed tool usage"""
        mock_tool = create_mock_tool("test_tool")
        metadata = ToolMetadata(mock_tool, ToolCategory.UTILITY)

        # Record one success and one failure
        metadata.record_usage(success=True, execution_time=0.5)
        metadata.record_usage(success=False, execution_time=0.3)

        assert metadata.usage_count == 2
        assert metadata.success_rate == 0.5
        assert metadata.avg_execution_time == 0.4


@pytest.mark.unit
class TestToolRegistry:
    """Test the main Tool Registry functionality"""

    def test_singleton_instance(self):
        """Test registry is a singleton"""
        registry1 = get_tool_registry()
        registry2 = get_tool_registry()
        assert registry1 is registry2

    def test_register_tool_with_category(self):
        """Test registering a tool with explicit category"""
        registry = ToolRegistry()
        mock_tool = create_mock_tool("analyze_code")

        registry.register_tool(mock_tool, ToolCategory.ANALYSIS)

        assert "analyze_code" in registry.tools
        assert registry.tools["analyze_code"].category == ToolCategory.ANALYSIS
        assert "analyze_code" in registry.categories[ToolCategory.ANALYSIS]

    def test_register_tool_auto_detect_category(self):
        """Test auto-detection of tool category"""
        registry = ToolRegistry()

        # Test various tool names
        test_cases = [
            ("analyze_code", ToolCategory.ANALYSIS),
            ("execute_command", ToolCategory.EXECUTION),
            ("api_fetch_data", ToolCategory.INTEGRATION),
            ("format_output", ToolCategory.UTILITY),
            ("scan_vulnerabilities", ToolCategory.ANALYSIS),
            ("run_tests", ToolCategory.EXECUTION),
            ("search_knowledge", ToolCategory.INTEGRATION),
            ("transform_data", ToolCategory.UTILITY),
            ("unknown_tool", ToolCategory.UTILITY),  # Default
        ]

        for tool_name, expected_category in test_cases:
            mock_tool = create_mock_tool(tool_name)
            registry.register_tool(mock_tool)
            assert registry.tools[tool_name].category == expected_category

    def test_get_tool(self):
        """Test retrieving a tool by name"""
        registry = ToolRegistry()
        mock_tool = create_mock_tool("test_tool")

        registry.register_tool(mock_tool)
        retrieved = registry.get_tool("test_tool")

        assert retrieved == mock_tool
        assert registry.get_tool("nonexistent") is None

    def test_get_tools_for_category(self):
        """Test retrieving tools by category"""
        registry = ToolRegistry()

        # Register tools in different categories
        analysis_tools = [create_mock_tool(f"analyze_{i}") for i in range(3)]
        execution_tools = [create_mock_tool(f"execute_{i}") for i in range(2)]

        for tool in analysis_tools:
            registry.register_tool(tool, ToolCategory.ANALYSIS)
        for tool in execution_tools:
            registry.register_tool(tool, ToolCategory.EXECUTION)

        # Verify retrieval
        retrieved_analysis = registry.get_tools_for_category(ToolCategory.ANALYSIS)
        retrieved_execution = registry.get_tools_for_category(ToolCategory.EXECUTION)

        assert len(retrieved_analysis) == 3
        assert len(retrieved_execution) == 2
        assert all(tool in analysis_tools for tool in retrieved_analysis)
        assert all(tool in execution_tools for tool in retrieved_execution)

    def test_get_tools_for_agent_security_specialist(self):
        """Test tool assignment for security specialist"""
        registry = ToolRegistry()

        # Register appropriate tools
        tools = {
            ToolCategory.ANALYSIS: [create_mock_tool(f"analyze_{i}") for i in range(4)],
            ToolCategory.EXECUTION: [create_mock_tool(f"execute_{i}") for i in range(2)],
            ToolCategory.INTEGRATION: [create_mock_tool(f"api_{i}") for i in range(2)],
            ToolCategory.UTILITY: [create_mock_tool(f"format_{i}") for i in range(2)],
        }

        for category, tool_list in tools.items():
            for tool in tool_list:
                registry.register_tool(tool, category)

        # Get tools for security specialist
        assigned = registry.get_tools_for_agent("security_specialist")

        # Should get 6 tools total: 3 analysis, 1 execution, 1 integration, 1 utility
        assert len(assigned) == 6

        # Count by category
        category_counts = {}
        for tool in assigned:
            cat = registry.tools[tool.name].category
            category_counts[cat] = category_counts.get(cat, 0) + 1

        assert category_counts[ToolCategory.ANALYSIS] == 3
        assert category_counts[ToolCategory.EXECUTION] == 1
        assert category_counts[ToolCategory.INTEGRATION] == 1
        assert category_counts[ToolCategory.UTILITY] == 1

    def test_get_tools_for_agent_respects_max_limit(self):
        """Test that agent tool assignment respects max limit"""
        registry = ToolRegistry()

        # Register many tools
        for i in range(20):
            tool = create_mock_tool(f"tool_{i}")
            registry.register_tool(tool)

        assigned = registry.get_tools_for_agent("any_agent", max_tools=6)
        assert len(assigned) <= 6

    def test_get_registry_stats(self):
        """Test registry statistics"""
        registry = ToolRegistry()

        # Register some tools
        for i in range(3):
            registry.register_tool(create_mock_tool(f"analyze_{i}"), ToolCategory.ANALYSIS)
        for i in range(2):
            registry.register_tool(create_mock_tool(f"execute_{i}"), ToolCategory.EXECUTION)

        stats = registry.get_registry_stats()

        assert stats["total_tools"] == 5
        assert stats["categories"][ToolCategory.ANALYSIS.value]["count"] == 3
        assert stats["categories"][ToolCategory.EXECUTION.value]["count"] == 2

    def test_optimize_tool_assignment(self):
        """Test optimized tool assignment based on performance"""
        registry = ToolRegistry()

        # Register tools across different categories with different success rates
        tools = []
        categories = [ToolCategory.ANALYSIS, ToolCategory.EXECUTION, ToolCategory.INTEGRATION, ToolCategory.UTILITY]

        for i in range(8):
            tool = create_mock_tool(f"tool_{i}")
            # Distribute tools across categories
            category = categories[i % len(categories)]
            registry.register_tool(tool, category)
            # Simulate different success rates
            registry.tools[tool.name].success_rate = 0.5 + (i * 0.05)
            tools.append(tool)

        # Test without performance history
        base_assignment = registry.optimize_tool_assignment("test_agent")
        assert len(base_assignment) <= 6

        # Test with performance history
        performance_history = {
            "tool_0": 0.9,  # Better recent performance (ANALYSIS category)
            "tool_4": 0.9,  # Better recent performance (ANALYSIS category)
            "tool_7": 0.3,  # Worse recent performance (UTILITY category)
        }

        optimized = registry.optimize_tool_assignment("test_agent", performance_history)

        # Should prefer tools with better performance history
        tool_names = [t.name for t in optimized]
        # Check that at least one of the high-performance tools is included
        assert "tool_0" in tool_names or "tool_4" in tool_names


@pytest.mark.unit
class TestToolPatterns:
    """Test tool naming pattern detection"""

    def test_analysis_patterns(self):
        """Test analysis tool pattern detection"""
        registry = ToolRegistry()
        analysis_names = [
            "analyze_code",
            "scan_vulnerabilities",
            "evaluate_design",
            "assess_risk",
            "inspect_data",
            "examine_structure",
            "review_changes",
            "check_quality",
            "validate_input",
            "audit_security",
        ]

        for name in analysis_names:
            category = registry._detect_category(name)
            assert category == ToolCategory.ANALYSIS, f"{name} should be ANALYSIS"

    def test_execution_patterns(self):
        """Test execution tool pattern detection"""
        registry = ToolRegistry()
        execution_names = [
            "run_command",
            "execute_script",
            "generate_code",
            "create_file",
            "write_data",
            "build_project",
            "deploy_app",
            "start_service",
            "stop_process",
            "apply_changes",
        ]

        for name in execution_names:
            category = registry._detect_category(name)
            assert category == ToolCategory.EXECUTION, f"{name} should be EXECUTION"

    def test_integration_patterns(self):
        """Test integration tool pattern detection"""
        registry = ToolRegistry()
        integration_names = [
            "api_call",
            "search_web",
            "fetch_data",
            "query_database",
            "connect_service",
            "sync_data",
            "pull_updates",
            "push_changes",
            "integrate_system",
            "webhook_handler",
        ]

        for name in integration_names:
            category = registry._detect_category(name)
            assert category == ToolCategory.INTEGRATION, f"{name} should be INTEGRATION"

    def test_utility_patterns(self):
        """Test utility tool pattern detection"""
        registry = ToolRegistry()
        utility_names = [
            "format_output",
            "transform_data",
            "convert_format",
            "parse_json",
            "encode_base64",
            "decode_string",
            "compress_file",
            "extract_archive",
            "filter_results",
            "sort_items",
        ]

        for name in utility_names:
            category = registry._detect_category(name)
            assert category == ToolCategory.UTILITY, f"{name} should be UTILITY"
