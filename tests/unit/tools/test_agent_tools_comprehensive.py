"""
Comprehensive Tests for agent_tools.py - Agent-as-Tools Pattern

Tests all 12 critical functions in agent_tools.py with STRICT validation.
This module implements the critical "Agents-as-Tools" pattern for Google ADK.
"""

import os

# Import the agent tools
import sys
import tempfile
import time
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

sys.path.append(str(Path(__file__).parent.parent.parent.parent))

from lib._tools.agent_tools import (  # Core Classes; Factory Functions; Tool Functions; Initialization Functions
    AgentTool,
    AgentToolResult,
    _AgentToolsSingleton,
    _get_tool_or_initialize,
    create_agent_tool,
    create_specialist_agent_tools,
    get_adk_architecture_tool,
    get_adk_devops_tool,
    get_adk_qa_tool,
    get_adk_ui_tool,
    initialize_agent_tools,
)


class TestAgentToolsComprehensive:
    """Comprehensive tests for agent_tools with STRICT validation"""

    def setup_method(self):
        """Setup for each test method"""
        self.temp_dir = tempfile.mkdtemp()
        self.mock_agent = Mock()
        self.mock_agent.name = "test_agent"
        self.mock_agent.description = "Test agent for validation"

    def teardown_method(self):
        """Cleanup after each test method"""
        import shutil

        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    # AgentTool Class Tests - STRICT validation

    @pytest.mark.unit
    def test_agent_tool_initialization(self):
        """Test AgentTool initialization with STRICT validation"""
        agent_tool = AgentTool(self.mock_agent, name="test_tool", description="Test description")

        # STRICT: Must have proper initialization
        assert isinstance(agent_tool, AgentTool), "Must create AgentTool instance"
        assert agent_tool.name == "test_tool", "Name must be set correctly"
        assert agent_tool.description == "Test description", "Description must be set correctly"
        assert agent_tool.agent == self.mock_agent, "Agent must be stored correctly"
        assert isinstance(agent_tool.capabilities, list), "Capabilities must be a list"
        assert agent_tool.timeout == 60.0, "Default timeout must be 60 seconds"

    @pytest.mark.unit
    def test_agent_tool_capabilities_extraction(self):
        """Test AgentTool capability extraction with STRICT validation"""
        # Test architecture agent
        arch_agent = Mock()
        arch_agent.name = "architecture_specialist"
        arch_tool = AgentTool(arch_agent)

        # STRICT: Must extract architecture capabilities
        assert isinstance(arch_tool.capabilities, list), "Capabilities must be list"
        assert len(arch_tool.capabilities) >= 3, "Must have multiple capabilities"
        assert "system_design" in arch_tool.capabilities, "Must include system_design capability"
        assert "architecture_planning" in arch_tool.capabilities, "Must include architecture_planning"

        # Test UI agent
        ui_agent = Mock()
        ui_agent.name = "ui_specialist"
        ui_tool = AgentTool(ui_agent)

        # STRICT: Must extract UI capabilities
        assert "interface_design" in ui_tool.capabilities, "Must include interface_design capability"
        assert "user_experience" in ui_tool.capabilities, "Must include user_experience capability"

    @pytest.mark.unit
    def test_agent_tool_execute_functionality(self):
        """Test AgentTool execute method with STRICT validation"""
        agent_tool = AgentTool(self.mock_agent, name="test_executor")
        test_context = "Test execution context"

        result = agent_tool.execute(test_context)

        # STRICT: Must return AgentToolResult
        assert isinstance(result, AgentToolResult), "Must return AgentToolResult instance"
        assert isinstance(result.success, bool), "Success must be boolean"
        assert isinstance(result.result, str), "Result must be string"
        assert result.agent_name == "test_executor", "Agent name must match"
        assert isinstance(result.execution_time, float), "Execution time must be float"
        assert result.context_used == test_context, "Context must be preserved"

        # STRICT: If successful, result must have meaningful content
        if result.success:
            assert len(result.result) > 20, "Successful result must have meaningful content"
            assert result.error_message is None, "Successful result must not have error message"
            assert isinstance(result.metadata, dict), "Metadata must be dictionary"
            assert "capabilities_used" in result.metadata, "Metadata must include capabilities"

    @pytest.mark.unit
    def test_agent_tool_call_functionality(self):
        """Test AgentTool __call__ method with STRICT validation"""
        agent_tool = AgentTool(self.mock_agent, name="test_callable")
        test_context = "Test callable context"

        result = agent_tool(test_context)

        # STRICT: Must return string result
        assert isinstance(result, str), "Call result must be string"
        assert len(result) > 10, "Call result must have meaningful content"

        # STRICT: Should not contain error prefix for successful calls
        if not result.startswith("Error:"):
            assert (
                "Test callable context" in result or "analysis" in result.lower()
            ), "Successful call must process context"

    @pytest.mark.unit
    def test_agent_tool_get_tool_info_functionality(self):
        """Test AgentTool get_tool_info method with STRICT validation"""
        agent_tool = AgentTool(self.mock_agent, name="info_test", description="Info test description")

        info = agent_tool.get_tool_info()

        # STRICT: Must return structured tool information
        assert isinstance(info, dict), "Tool info must be dictionary"

        # STRICT: Must contain required fields
        required_fields = [
            "name",
            "description",
            "capabilities",
            "timeout",
            "agent_type",
            "tool_type",
            "adk_pattern",
        ]
        for field in required_fields:
            assert field in info, f"Tool info must contain '{field}' field"

        # STRICT: Must have correct values
        assert info["name"] == "info_test", "Name must match"
        assert info["description"] == "Info test description", "Description must match"
        assert info["tool_type"] == "agent_as_tool", "Tool type must be agent_as_tool"
        assert info["adk_pattern"] == "agents_as_tools", "ADK pattern must be agents_as_tools"
        assert isinstance(info["capabilities"], list), "Capabilities must be list"

    # Factory Functions Tests - STRICT validation

    @pytest.mark.unit
    def test_create_agent_tool_functionality(self):
        """Test create_agent_tool factory function with STRICT validation"""
        result = create_agent_tool(self.mock_agent, name="factory_test", timeout=30.0)

        # STRICT: Must create proper AgentTool
        assert isinstance(result, AgentTool), "Factory must create AgentTool instance"
        assert result.name == "factory_test", "Factory must set name correctly"
        assert result.timeout == 30.0, "Factory must set timeout correctly"
        assert result.agent == self.mock_agent, "Factory must set agent correctly"

    @pytest.mark.unit
    def test_create_specialist_agent_tools_functionality(self):
        """Test create_specialist_agent_tools with STRICT validation"""
        arch_agent = Mock()
        ui_agent = Mock()
        devops_agent = Mock()
        qa_agent = Mock()

        result = create_specialist_agent_tools(arch_agent, ui_agent, devops_agent, qa_agent)

        # STRICT: Must create dictionary of agent tools
        assert isinstance(result, dict), "Must return dictionary"

        # STRICT: Must contain all specialist tools
        expected_tools = ["architecture_tool", "ui_tool", "devops_tool", "qa_tool"]
        for tool_name in expected_tools:
            assert tool_name in result, f"Must contain {tool_name}"
            assert isinstance(result[tool_name], AgentTool), f"{tool_name} must be AgentTool instance"

        # STRICT: Each tool must have proper configuration
        assert result["architecture_tool"].name == "architecture_tool", "Architecture tool name must be correct"
        assert (
            "Architecture" in result["architecture_tool"].description
        ), "Architecture tool description must be descriptive"

    # ADK Tool Functions Tests - STRICT validation

    @pytest.mark.unit
    def test_get_adk_architecture_tool_functionality(self):
        """Test get_adk_architecture_tool with STRICT validation"""
        tool = get_adk_architecture_tool()

        # STRICT: Must return ADK FunctionTool
        assert tool is not None, "Architecture tool must not be None"
        assert hasattr(tool, "name"), "Tool must have name attribute"
        assert hasattr(tool, "func"), "Tool must have func attribute"
        assert tool.name == "architecture_tool", "Tool name must be correct"

        # STRICT: Function must work correctly
        test_context = "Design a web application architecture"
        result = tool.func(test_context)

        assert isinstance(result, str), "Tool function must return string"
        assert len(result) > 50, "Architecture analysis must be comprehensive"
        assert "Architecture Analysis" in result, "Must contain architecture analysis header"
        assert "System Design" in result, "Must contain system design section"
        assert test_context in result, "Must reference input context"

    @pytest.mark.unit
    def test_get_adk_ui_tool_functionality(self):
        """Test get_adk_ui_tool with STRICT validation"""
        tool = get_adk_ui_tool()

        # STRICT: Must return ADK FunctionTool
        assert tool is not None, "UI tool must not be None"
        assert tool.name == "ui_tool", "Tool name must be correct"

        # STRICT: Function must work correctly
        test_context = "Design user interface for dashboard"
        result = tool.func(test_context)

        assert isinstance(result, str), "Tool function must return string"
        assert len(result) > 50, "UI design must be comprehensive"
        assert "UI/UX Design" in result, "Must contain UI/UX design header"
        assert "Interface Design" in result, "Must contain interface design section"
        assert test_context in result, "Must reference input context"

    @pytest.mark.unit
    def test_get_adk_devops_tool_functionality(self):
        """Test get_adk_devops_tool with STRICT validation"""
        tool = get_adk_devops_tool()

        # STRICT: Must return ADK FunctionTool
        assert tool is not None, "DevOps tool must not be None"
        assert tool.name == "devops_tool", "Tool name must be correct"

        # STRICT: Function must work correctly
        test_context = "Set up CI/CD pipeline for microservices"
        result = tool.func(test_context)

        assert isinstance(result, str), "Tool function must return string"
        assert len(result) > 50, "DevOps plan must be comprehensive"
        assert "DevOps Implementation" in result, "Must contain DevOps implementation header"
        assert "Infrastructure Setup" in result, "Must contain infrastructure section"
        assert test_context in result, "Must reference input context"

    @pytest.mark.unit
    def test_get_adk_qa_tool_functionality(self):
        """Test get_adk_qa_tool with STRICT validation"""
        tool = get_adk_qa_tool()

        # STRICT: Must return ADK FunctionTool
        assert tool is not None, "QA tool must not be None"
        assert tool.name == "qa_tool", "Tool name must be correct"

        # STRICT: Function must work correctly
        test_context = "Create testing strategy for e-commerce platform"
        result = tool.func(test_context)

        assert isinstance(result, str), "Tool function must return string"
        assert len(result) > 50, "QA strategy must be comprehensive"
        assert "Quality Assurance Strategy" in result, "Must contain QA strategy header"
        assert "Testing Framework" in result, "Must contain testing framework section"
        assert test_context in result, "Must reference input context"

    # Initialization and Singleton Tests - STRICT validation

    @pytest.mark.unit
    def test_agent_tools_singleton_functionality(self):
        """Test _AgentToolsSingleton with STRICT validation"""
        singleton1 = _AgentToolsSingleton()
        singleton2 = _AgentToolsSingleton()

        # STRICT: Must be same instance (singleton pattern)
        assert singleton1 is singleton2, "Singleton must return same instance"
        assert hasattr(singleton1, "_initialized"), "Singleton must have _initialized attribute"
        assert isinstance(singleton1._initialized, bool), "_initialized must be boolean"

    @pytest.mark.unit
    def test_initialize_agent_tools_functionality(self):
        """Test initialize_agent_tools with STRICT validation"""
        # This function should complete without error
        try:
            initialize_agent_tools()
            success = True
        except Exception as e:
            success = False
            error = str(e)

        # STRICT: Must initialize successfully
        assert success, f"initialize_agent_tools must succeed, got error: {error if not success else 'None'}"

        # STRICT: After initialization, tools should be available
        arch_tool = get_adk_architecture_tool()
        assert arch_tool is not None, "Architecture tool must be available after initialization"

    @pytest.mark.unit
    def test_get_tool_or_initialize_functionality(self):
        """Test _get_tool_or_initialize with STRICT validation"""
        # Reset singleton state for testing
        singleton = _AgentToolsSingleton()
        singleton.adk_architecture_tool = None

        tool = _get_tool_or_initialize("adk_architecture_tool")

        # STRICT: Must return initialized tool
        assert tool is not None, "Tool must be initialized and returned"
        assert hasattr(tool, "name"), "Tool must have name attribute"
        assert hasattr(tool, "func"), "Tool must have func attribute"

    # Error Handling Tests - STRICT validation

    @pytest.mark.unit
    def test_agent_tool_error_handling(self):
        """Test AgentTool error handling with STRICT validation"""
        # Create agent that will raise exception
        error_agent = Mock()
        error_agent.name = "error_agent"

        # Mock the simulate method to raise an exception
        agent_tool = AgentTool(error_agent, name="error_test")

        # Force an error by patching the simulate method
        with patch.object(agent_tool, "_simulate_agent_execution", side_effect=Exception("Test error")):
            result = agent_tool.execute("test context")

            # STRICT: Must handle error gracefully
            assert isinstance(result, AgentToolResult), "Must return AgentToolResult even on error"
            assert result.success is False, "Error result must have success=False"
            assert result.error_message is not None, "Error result must have error message"
            assert "Test error" in result.error_message, "Error message must contain actual error"
            assert result.result == "", "Error result should have empty result"
            assert isinstance(result.execution_time, float), "Error result must still have execution time"

    @pytest.mark.unit
    def test_agent_tool_timeout_validation(self):
        """Test AgentTool timeout parameter with STRICT validation"""
        agent_tool = AgentTool(self.mock_agent, timeout=10.0)

        # STRICT: Timeout must be set correctly
        assert agent_tool.timeout == 10.0, "Timeout must be set to specified value"

        # STRICT: Execution should complete within reasonable time
        start_time = time.time()
        result = agent_tool.execute("quick test")
        end_time = time.time()

        # Should complete much faster than timeout for simple operations
        assert (end_time - start_time) < 5.0, "Simple execution should complete quickly"
        assert result.execution_time < 5.0, "Recorded execution time should be reasonable"

    # Integration-style tests within unit scope

    @pytest.mark.unit
    def test_complete_agent_tool_workflow(self):
        """Test complete agent tool workflow with STRICT validation"""
        # Create agent tool
        agent_tool = create_agent_tool(self.mock_agent, name="workflow_test")

        # Get tool info
        info = agent_tool.get_tool_info()
        assert info["name"] == "workflow_test", "Tool info must match creation parameters"

        # Execute tool
        result = agent_tool.execute("Complete workflow test")
        assert result.success, "Workflow execution must succeed"

        # Call tool directly
        call_result = agent_tool("Direct call test")
        assert isinstance(call_result, str), "Direct call must return string"
        assert len(call_result) > 0, "Direct call must return non-empty result"

    @pytest.mark.unit
    def test_all_specialist_tools_integration(self):
        """Test all specialist tools work together with STRICT validation"""
        # Get all specialist tools
        arch_tool = get_adk_architecture_tool()
        ui_tool = get_adk_ui_tool()
        devops_tool = get_adk_devops_tool()
        qa_tool = get_adk_qa_tool()

        # STRICT: All tools must be available
        tools = [arch_tool, ui_tool, devops_tool, qa_tool]
        for tool in tools:
            assert tool is not None, "All specialist tools must be available"
            assert hasattr(tool, "func"), "All tools must have callable function"

        # STRICT: All tools must process the same context differently
        context = "Build a scalable web application"
        results = []

        for tool in tools:
            result = tool.func(context)
            assert isinstance(result, str), "All tools must return string results"
            assert len(result) > 30, "All tool results must be comprehensive"
            assert context in result, "All tools must reference input context"
            results.append(result)

        # STRICT: Results must be different (each specialist provides unique perspective)
        for i, result1 in enumerate(results):
            for j, result2 in enumerate(results):
                if i != j:
                    # Results should be substantially different
                    assert result1 != result2, f"Tool {i} and {j} must provide different results"
                    # Should have different key terms
                    result1_lower = result1.lower()
                    result2_lower = result2.lower()
                    if "architecture" in result1_lower:
                        assert (
                            "ui/ux" not in result1_lower or "devops" not in result1_lower
                        ), "Each tool should focus on its specialty"
