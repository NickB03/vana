#!/usr/bin/env python3
"""
Validation script for agent_tools.py - Agent-as-Tools Pattern
Validates all 12 critical functions without external dependencies
"""

import sys
import time
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))


def validate_agent_tools():
    """Validate agent-as-tools pattern functionality"""
    print("🧪 Validating Agent-as-Tools Pattern...")
    print("=" * 60)

    try:
        # Import the agent tools
        from lib._tools.agent_tools import (
            AgentTool,
            AgentToolResult,
            create_agent_tool,
            get_adk_architecture_tool,
            get_adk_devops_tool,
            get_adk_qa_tool,
            get_adk_ui_tool,
            initialize_agent_tools,
        )

        print("✅ Successfully imported agent_tools module")

        # Test 1: AgentTool class functionality
        print("\n📋 Test 1: AgentTool Class Functionality")

        class MockAgent:
            def __init__(self, name):
                self.name = name
                self.description = f"Mock {name} agent"

        mock_agent = MockAgent("test_agent")
        agent_tool = AgentTool(mock_agent, name="test_tool", description="Test tool")

        assert isinstance(agent_tool, AgentTool), "AgentTool creation failed"
        assert agent_tool.name == "test_tool", "AgentTool name incorrect"
        assert isinstance(agent_tool.capabilities, list), "Capabilities must be list"
        print("  ✅ AgentTool initialization works correctly")

        # Test execute method
        result = agent_tool.execute("test context")
        assert isinstance(result, AgentToolResult), "Execute must return AgentToolResult"
        assert isinstance(result.success, bool), "Success must be boolean"
        assert isinstance(result.result, str), "Result must be string"
        assert result.agent_name == "test_tool", "Agent name must match"
        print("  ✅ AgentTool execute method works correctly")

        # Test call method
        call_result = agent_tool("test call")
        assert isinstance(call_result, str), "Call must return string"
        assert len(call_result) > 0, "Call result must not be empty"
        print("  ✅ AgentTool __call__ method works correctly")

        # Test get_tool_info
        info = agent_tool.get_tool_info()
        assert isinstance(info, dict), "Tool info must be dict"
        assert "name" in info, "Tool info must contain name"
        assert "tool_type" in info, "Tool info must contain tool_type"
        assert info["tool_type"] == "agent_as_tool", "Tool type must be correct"
        print("  ✅ AgentTool get_tool_info works correctly")

        # Test 2: Factory functions
        print("\n📋 Test 2: Factory Functions")

        factory_tool = create_agent_tool(mock_agent, name="factory_test")
        assert isinstance(factory_tool, AgentTool), "create_agent_tool must return AgentTool"
        assert factory_tool.name == "factory_test", "Factory tool name must be correct"
        print("  ✅ create_agent_tool factory function works correctly")

        # Test 3: ADK Tool Functions
        print("\n📋 Test 3: ADK Tool Functions")

        # Initialize tools
        initialize_agent_tools()
        print("  ✅ initialize_agent_tools completed successfully")

        # Test architecture tool
        arch_tool = get_adk_architecture_tool()
        assert arch_tool is not None, "Architecture tool must not be None"
        assert hasattr(arch_tool, "name"), "Architecture tool must have name"
        assert arch_tool.name == "architecture_tool", "Architecture tool name must be correct"

        arch_result = arch_tool.func("Design a microservices architecture")
        assert isinstance(arch_result, str), "Architecture tool must return string"
        assert len(arch_result) > 50, "Architecture result must be comprehensive"
        assert "Architecture Analysis" in arch_result, "Must contain architecture analysis"
        print("  ✅ get_adk_architecture_tool works correctly")

        # Test UI tool
        ui_tool = get_adk_ui_tool()
        assert ui_tool is not None, "UI tool must not be None"
        assert ui_tool.name == "ui_tool", "UI tool name must be correct"

        ui_result = ui_tool.func("Design user interface for dashboard")
        assert isinstance(ui_result, str), "UI tool must return string"
        assert len(ui_result) > 50, "UI result must be comprehensive"
        assert "UI/UX Design" in ui_result, "Must contain UI/UX design"
        print("  ✅ get_adk_ui_tool works correctly")

        # Test DevOps tool
        devops_tool = get_adk_devops_tool()
        assert devops_tool is not None, "DevOps tool must not be None"
        assert devops_tool.name == "devops_tool", "DevOps tool name must be correct"

        devops_result = devops_tool.func("Setup CI/CD pipeline")
        assert isinstance(devops_result, str), "DevOps tool must return string"
        assert len(devops_result) > 50, "DevOps result must be comprehensive"
        assert "DevOps Implementation" in devops_result, "Must contain DevOps implementation"
        print("  ✅ get_adk_devops_tool works correctly")

        # Test QA tool
        qa_tool = get_adk_qa_tool()
        assert qa_tool is not None, "QA tool must not be None"
        assert qa_tool.name == "qa_tool", "QA tool name must be correct"

        qa_result = qa_tool.func("Create testing strategy")
        assert isinstance(qa_result, str), "QA tool must return string"
        assert len(qa_result) > 50, "QA result must be comprehensive"
        assert "Quality Assurance Strategy" in qa_result, "Must contain QA strategy"
        print("  ✅ get_adk_qa_tool works correctly")

        # Test 4: Integration test - all tools with same context
        print("\n📋 Test 4: Integration Test - All Tools")

        context = "Build a scalable e-commerce platform"
        tools = [arch_tool, ui_tool, devops_tool, qa_tool]
        results = []

        for tool in tools:
            result = tool.func(context)
            assert isinstance(result, str), f"{tool.name} must return string"
            assert len(result) > 30, f"{tool.name} result must be comprehensive"
            assert context in result, f"{tool.name} must reference context"
            results.append(result)

        # Verify results are different (each specialist provides unique perspective)
        for i, result1 in enumerate(results):
            for j, result2 in enumerate(results):
                if i != j:
                    assert result1 != result2, f"Tool {i} and {j} must provide different results"

        print("  ✅ All specialist tools provide unique, comprehensive responses")

        # Test 5: Error handling
        print("\n📋 Test 5: Error Handling")

        # Test with empty context
        empty_result = agent_tool.execute("")
        assert isinstance(empty_result, AgentToolResult), "Must handle empty context"
        print("  ✅ Error handling works correctly")

        # Test 6: Performance validation
        print("\n📋 Test 6: Performance Validation")

        start_time = time.time()
        perf_result = agent_tool.execute("Performance test")
        end_time = time.time()
        execution_time = end_time - start_time

        assert execution_time < 5.0, "Execution should be fast for simple operations"
        assert perf_result.execution_time < 5.0, "Recorded execution time should be reasonable"
        print(f"  ✅ Performance validation passed (execution time: {execution_time:.3f}s)")

        print("\n🎉 ALL TESTS PASSED!")
        print("=" * 60)
        print("✅ Agent-as-Tools Pattern: 12 functions validated")
        print("✅ Core functionality: AgentTool class works correctly")
        print("✅ Factory functions: create_agent_tool works correctly")
        print("✅ ADK integration: All 4 specialist tools work correctly")
        print("✅ Error handling: Graceful error management")
        print("✅ Performance: Fast execution for simple operations")

        return True

    except Exception as e:
        print(f"\n❌ VALIDATION FAILED: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = validate_agent_tools()
    sys.exit(0 if success else 1)
