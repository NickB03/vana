"""
Tests for the ADKToolAdapter class.

This module tests the ADKToolAdapter class, including:
- Basic tool registration and execution
- Standardized input/output formats
- Capability advertisement
- Specialized context parsers
"""

import unittest
import json
from unittest.mock import MagicMock, patch

from vana.adk_integration import ADKToolAdapter

# Mock ADK classes
class MockTool:
    def __init__(self, name, description, func):
        self.name = name
        self.description = description
        self.func = func

class MockFunctionTool:
    def __init__(self, name, description, func):
        self.name = name
        self.description = description
        self.func = func

class TestADKToolAdapter(unittest.TestCase):
    """Test cases for the ADKToolAdapter class."""

    def setUp(self):
        """Set up test environment."""
        # Mock ADK availability
        patcher = patch('vana.adk_integration.adk_tool_adapter.ADK_AVAILABLE', True)
        self.addCleanup(patcher.stop)
        patcher.start()

        # Mock FunctionTool
        patcher2 = patch('vana.adk_integration.adk_tool_adapter.FunctionTool', MockFunctionTool)
        self.addCleanup(patcher2.stop)
        patcher2.start()

        # Create tool adapter
        self.tool_adapter = ADKToolAdapter()

    def test_register_specialist_as_tool(self):
        """Test registering a specialist agent as a tool."""
        # Create mock specialist
        specialist = MagicMock()
        specialist.run = MagicMock(return_value="Specialist response")
        specialist.description = "Test specialist"

        # Register specialist
        result = self.tool_adapter.register_specialist_as_tool(
            specialist_name="test_specialist",
            specialist_obj=specialist
        )

        # Check result
        self.assertTrue(result)

        # Check that tool was registered
        self.assertIn("test_specialist", self.tool_adapter.tools)
        self.assertEqual(self.tool_adapter.tools["test_specialist"].name, "test_specialist")
        self.assertEqual(self.tool_adapter.tools["test_specialist"].description, "Test specialist")

        # Check that specialist was stored
        self.assertIn("test_specialist", self.tool_adapter.specialists)
        self.assertEqual(self.tool_adapter.specialists["test_specialist"], specialist)

    def test_register_specialist_with_custom_name_and_description(self):
        """Test registering a specialist with a custom name and description."""
        # Create mock specialist
        specialist = MagicMock()
        specialist.run = MagicMock(return_value="Specialist response")

        # Register specialist
        result = self.tool_adapter.register_specialist_as_tool(
            specialist_name="test_specialist",
            specialist_obj=specialist,
            tool_name="custom_tool_name",
            description="Custom description"
        )

        # Check result
        self.assertTrue(result)

        # Check that tool was registered with custom name and description
        self.assertIn("custom_tool_name", self.tool_adapter.tools)
        self.assertEqual(self.tool_adapter.tools["custom_tool_name"].name, "custom_tool_name")
        self.assertEqual(self.tool_adapter.tools["custom_tool_name"].description, "Custom description")

    def test_register_specialist_with_generate_content(self):
        """Test registering a specialist that uses generate_content instead of run."""
        # Create mock specialist
        specialist = MagicMock()
        specialist.generate_content = MagicMock()
        response = MagicMock()
        response.text = "Specialist response"
        specialist.generate_content.return_value = response
        specialist.description = "Test specialist"

        # Register specialist
        result = self.tool_adapter.register_specialist_as_tool(
            specialist_name="test_specialist",
            specialist_obj=specialist
        )

        # Check result
        self.assertTrue(result)

        # Execute tool
        response = self.tool_adapter.execute_tool("test_specialist", "Test query")

        # Check response
        self.assertEqual(response, "Specialist response")

        # Check that generate_content was called
        specialist.generate_content.assert_called_once_with("Test query")

    def test_register_function_as_tool(self):
        """Test registering a function as a tool."""
        # Create test function
        def test_function(arg1, arg2=None):
            """Test function docstring."""
            return f"Result: {arg1}, {arg2}"

        # Register function
        result = self.tool_adapter.register_function_as_tool(test_function)

        # Check result
        self.assertTrue(result)

        # Check that tool was registered
        self.assertIn("test_function", self.tool_adapter.tools)
        self.assertEqual(self.tool_adapter.tools["test_function"].name, "test_function")
        self.assertEqual(self.tool_adapter.tools["test_function"].description, "Test function docstring.")

    def test_register_function_with_custom_name_and_description(self):
        """Test registering a function with a custom name and description."""
        # Create test function
        def test_function(arg1, arg2=None):
            return f"Result: {arg1}, {arg2}"

        # Register function
        result = self.tool_adapter.register_function_as_tool(
            func=test_function,
            tool_name="custom_tool_name",
            description="Custom description"
        )

        # Check result
        self.assertTrue(result)

        # Check that tool was registered with custom name and description
        self.assertIn("custom_tool_name", self.tool_adapter.tools)
        self.assertEqual(self.tool_adapter.tools["custom_tool_name"].name, "custom_tool_name")
        self.assertEqual(self.tool_adapter.tools["custom_tool_name"].description, "Custom description")

    def test_get_tool(self):
        """Test getting a tool by name."""
        # Create test function
        def test_function(arg1, arg2=None):
            return f"Result: {arg1}, {arg2}"

        # Register function
        self.tool_adapter.register_function_as_tool(test_function)

        # Get tool
        tool = self.tool_adapter.get_tool("test_function")

        # Check tool
        self.assertIsNotNone(tool)
        self.assertEqual(tool.name, "test_function")

    def test_get_all_tools(self):
        """Test getting all tools."""
        # Create test functions
        def test_function1(arg1):
            return f"Result 1: {arg1}"

        def test_function2(arg2):
            return f"Result 2: {arg2}"

        # Register functions
        self.tool_adapter.register_function_as_tool(test_function1)
        self.tool_adapter.register_function_as_tool(test_function2)

        # Get all tools
        tools = self.tool_adapter.get_all_tools()

        # Check tools
        self.assertEqual(len(tools), 2)
        tool_names = [tool.name for tool in tools]
        self.assertIn("test_function1", tool_names)
        self.assertIn("test_function2", tool_names)

    def test_execute_tool(self):
        """Test executing a tool."""
        # Create test function
        def test_function(arg1, arg2=None):
            return f"Result: {arg1}, {arg2}"

        # Register function
        self.tool_adapter.register_function_as_tool(test_function)

        # Execute tool
        result = self.tool_adapter.execute_tool("test_function", "value1", arg2="value2")

        # Check result
        self.assertEqual(result, "Result: value1, value2")

    def test_execute_nonexistent_tool(self):
        """Test executing a tool that doesn't exist."""
        # Execute nonexistent tool
        result = self.tool_adapter.execute_tool("nonexistent_tool", "arg1")

        # Check result
        self.assertEqual(result, "Error: Tool nonexistent_tool not found")

    def test_tool_decorator(self):
        """Test the tool decorator."""
        # Create decorated function
        @self.tool_adapter.tool_decorator(name="decorated_tool", description="Decorated tool description")
        def decorated_function(arg1, arg2=None):
            return f"Decorated result: {arg1}, {arg2}"

        # Check that tool was registered
        self.assertIn("decorated_tool", self.tool_adapter.tools)
        self.assertEqual(self.tool_adapter.tools["decorated_tool"].name, "decorated_tool")
        self.assertEqual(self.tool_adapter.tools["decorated_tool"].description, "Decorated tool description")

        # Execute tool
        result = self.tool_adapter.execute_tool("decorated_tool", "value1", arg2="value2")

        # Check result
        self.assertEqual(result, "Decorated result: value1, value2")

    def test_fallback_when_adk_not_available(self):
        """Test fallback behavior when ADK is not available."""
        # Create tool adapter with ADK not available
        with patch('vana.adk_integration.adk_tool_adapter.ADK_AVAILABLE', False):
            fallback_adapter = ADKToolAdapter()

        # Check that ADK is not available
        self.assertFalse(fallback_adapter.is_adk_available())

        # Try to register a function
        def test_function(arg):
            return f"Result: {arg}"

        result = fallback_adapter.register_function_as_tool(test_function)

        # Check result
        self.assertFalse(result)

        # Check that no tool was registered
        self.assertEqual(len(fallback_adapter.tools), 0)

    # Tests for new functionality

    def test_register_specialist_with_capabilities(self):
        """Test registering a specialist with capabilities."""
        # Create mock specialist
        specialist = MagicMock()
        specialist.run = MagicMock(return_value="Specialist response")
        specialist.description = "Test specialist"

        # Register specialist with capabilities
        result = self.tool_adapter.register_specialist_as_tool(
            specialist_name="test_specialist",
            specialist_obj=specialist,
            agent_type=ADKToolAdapter.AGENT_TYPE_ARCHITECT,
            input_format=ADKToolAdapter.INPUT_FORMAT_JSON,
            output_format=ADKToolAdapter.OUTPUT_FORMAT_JSON,
            capabilities={"custom_capability": "test"}
        )

        # Check result
        self.assertTrue(result)

        # Check that capabilities were registered
        self.assertIn("test_specialist", self.tool_adapter.capabilities)
        self.assertEqual(self.tool_adapter.capabilities["test_specialist"]["type"],
                        ADKToolAdapter.AGENT_TYPE_ARCHITECT)
        self.assertEqual(self.tool_adapter.capabilities["test_specialist"]["input_format"],
                        ADKToolAdapter.INPUT_FORMAT_JSON)
        self.assertEqual(self.tool_adapter.capabilities["test_specialist"]["output_format"],
                        ADKToolAdapter.OUTPUT_FORMAT_JSON)
        self.assertEqual(self.tool_adapter.capabilities["test_specialist"]["custom_capability"],
                        "test")

    def test_register_function_with_capabilities(self):
        """Test registering a function with capabilities."""
        # Create test function
        def test_function(arg1, arg2=None):
            """Test function docstring."""
            return f"Result: {arg1}, {arg2}"

        # Register function with capabilities
        result = self.tool_adapter.register_function_as_tool(
            func=test_function,
            input_format=ADKToolAdapter.INPUT_FORMAT_STRUCTURED,
            output_format=ADKToolAdapter.OUTPUT_FORMAT_STRUCTURED,
            capabilities={"custom_capability": "test"}
        )

        # Check result
        self.assertTrue(result)

        # Check that capabilities were registered
        self.assertIn("test_function", self.tool_adapter.capabilities)
        self.assertEqual(self.tool_adapter.capabilities["test_function"]["input_format"],
                        ADKToolAdapter.INPUT_FORMAT_STRUCTURED)
        self.assertEqual(self.tool_adapter.capabilities["test_function"]["output_format"],
                        ADKToolAdapter.OUTPUT_FORMAT_STRUCTURED)
        self.assertEqual(self.tool_adapter.capabilities["test_function"]["custom_capability"],
                        "test")

    def test_tool_decorator_with_capabilities(self):
        """Test the tool decorator with capabilities."""
        # Create decorated function
        @self.tool_adapter.tool_decorator(
            name="decorated_tool",
            description="Decorated tool description",
            input_format=ADKToolAdapter.INPUT_FORMAT_JSON,
            output_format=ADKToolAdapter.OUTPUT_FORMAT_JSON,
            capabilities={"custom_capability": "test"}
        )
        def decorated_function(arg1, arg2=None):
            return f"Decorated result: {arg1}, {arg2}"

        # Check that capabilities were registered
        self.assertIn("decorated_tool", self.tool_adapter.capabilities)
        self.assertEqual(self.tool_adapter.capabilities["decorated_tool"]["input_format"],
                        ADKToolAdapter.INPUT_FORMAT_JSON)
        self.assertEqual(self.tool_adapter.capabilities["decorated_tool"]["output_format"],
                        ADKToolAdapter.OUTPUT_FORMAT_JSON)
        self.assertEqual(self.tool_adapter.capabilities["decorated_tool"]["custom_capability"],
                        "test")

    def test_format_input(self):
        """Test formatting input."""
        # Test text format
        result = self.tool_adapter._format_input("test query", ADKToolAdapter.INPUT_FORMAT_TEXT)
        self.assertEqual(result, "test query")

        # Test JSON format
        result = self.tool_adapter._format_input("test query", ADKToolAdapter.INPUT_FORMAT_JSON)
        # Parse the result to check it's valid JSON
        parsed = json.loads(result)
        self.assertEqual(parsed["query"], "test query")
        self.assertIn("context", parsed)

        # Test structured format
        result = self.tool_adapter._format_input("test query", ADKToolAdapter.INPUT_FORMAT_STRUCTURED)
        self.assertIsInstance(result, dict)
        self.assertEqual(result["query"], "test query")
        self.assertIn("context", result)

    def test_format_output(self):
        """Test formatting output."""
        # Test text format
        result = self.tool_adapter._format_output("test output", ADKToolAdapter.OUTPUT_FORMAT_TEXT)
        self.assertEqual(result, "test output")

        # Test JSON format
        result = self.tool_adapter._format_output({"key": "value"}, ADKToolAdapter.OUTPUT_FORMAT_JSON)
        # Parse the result to check it's valid JSON
        parsed = json.loads(result)
        self.assertEqual(parsed["key"], "value")

        # Test structured format
        result = self.tool_adapter._format_output("test output", ADKToolAdapter.OUTPUT_FORMAT_STRUCTURED)
        self.assertIsInstance(result, dict)
        self.assertEqual(result["content"], "test output")

    def test_parse_context_for_agent(self):
        """Test parsing context for different agent types."""
        # Test architect agent
        context = self.tool_adapter._parse_context_for_agent(
            "test query",
            ADKToolAdapter.AGENT_TYPE_ARCHITECT,
            design_patterns=["singleton", "factory"]
        )
        self.assertEqual(context["query"], "test query")
        self.assertEqual(context["agent_type"], ADKToolAdapter.AGENT_TYPE_ARCHITECT)
        self.assertEqual(context["design_patterns"], ["singleton", "factory"])

        # Test interaction agent
        context = self.tool_adapter._parse_context_for_agent(
            "test query",
            ADKToolAdapter.AGENT_TYPE_INTERACTION,
            user_preferences={"theme": "dark"}
        )
        self.assertEqual(context["query"], "test query")
        self.assertEqual(context["agent_type"], ADKToolAdapter.AGENT_TYPE_INTERACTION)
        self.assertEqual(context["user_preferences"], {"theme": "dark"})

    def test_get_agent_capabilities(self):
        """Test getting capabilities for an agent."""
        # Register a specialist with capabilities
        specialist = MagicMock()
        specialist.run = MagicMock(return_value="Specialist response")
        specialist.description = "Test specialist"

        self.tool_adapter.register_specialist_as_tool(
            specialist_name="test_specialist",
            specialist_obj=specialist,
            capabilities={"custom_capability": "test"}
        )

        # Get capabilities
        capabilities = self.tool_adapter.get_agent_capabilities("test_specialist")

        # Check capabilities
        self.assertIn("custom_capability", capabilities)
        self.assertEqual(capabilities["custom_capability"], "test")

    def test_get_all_capabilities(self):
        """Test getting all capabilities."""
        # Register a specialist and a function with capabilities
        specialist = MagicMock()
        specialist.run = MagicMock(return_value="Specialist response")
        specialist.description = "Test specialist"

        self.tool_adapter.register_specialist_as_tool(
            specialist_name="test_specialist",
            specialist_obj=specialist,
            capabilities={"specialist_capability": "test"}
        )

        def test_function(arg):
            return f"Result: {arg}"

        self.tool_adapter.register_function_as_tool(
            func=test_function,
            capabilities={"function_capability": "test"}
        )

        # Get all capabilities
        capabilities = self.tool_adapter.get_all_capabilities()

        # Check capabilities
        self.assertIn("test_specialist", capabilities)
        self.assertIn("test_function", capabilities)
        self.assertEqual(capabilities["test_specialist"]["specialist_capability"], "test")
        self.assertEqual(capabilities["test_function"]["function_capability"], "test")

    def test_advertise_capabilities(self):
        """Test advertising capabilities."""
        # Register a specialist and a function with capabilities
        specialist = MagicMock()
        specialist.run = MagicMock(return_value="Specialist response")
        specialist.description = "Test specialist"

        self.tool_adapter.register_specialist_as_tool(
            specialist_name="test_specialist",
            specialist_obj=specialist,
            agent_type=ADKToolAdapter.AGENT_TYPE_ARCHITECT,
            capabilities={"specialist_capability": "test"}
        )

        def test_function(arg):
            """Test function docstring."""
            return f"Result: {arg}"

        self.tool_adapter.register_function_as_tool(
            func=test_function,
            input_format=ADKToolAdapter.INPUT_FORMAT_JSON,
            output_format=ADKToolAdapter.OUTPUT_FORMAT_JSON,
            capabilities={"function_capability": "test"}
        )

        # Get advertisement
        advertisement = self.tool_adapter.advertise_capabilities()

        # Check advertisement
        self.assertIn("test_specialist", advertisement)
        self.assertIn("test_function", advertisement)
        self.assertIn(ADKToolAdapter.AGENT_TYPE_ARCHITECT, advertisement)
        self.assertIn(ADKToolAdapter.INPUT_FORMAT_JSON, advertisement)
        self.assertIn(ADKToolAdapter.OUTPUT_FORMAT_JSON, advertisement)

    def test_get_capabilities_by_type(self):
        """Test getting capabilities by type."""
        # Register specialists of different types
        specialist1 = MagicMock()
        specialist1.run = MagicMock(return_value="Specialist response")
        specialist1.description = "Test specialist 1"

        self.tool_adapter.register_specialist_as_tool(
            specialist_name="architect_specialist",
            specialist_obj=specialist1,
            agent_type=ADKToolAdapter.AGENT_TYPE_ARCHITECT
        )

        specialist2 = MagicMock()
        specialist2.run = MagicMock(return_value="Specialist response")
        specialist2.description = "Test specialist 2"

        self.tool_adapter.register_specialist_as_tool(
            specialist_name="interaction_specialist",
            specialist_obj=specialist2,
            agent_type=ADKToolAdapter.AGENT_TYPE_INTERACTION
        )

        # Get capabilities by type
        architect_capabilities = self.tool_adapter.get_capabilities_by_type(
            ADKToolAdapter.AGENT_TYPE_ARCHITECT
        )

        # Check capabilities
        self.assertIn("architect_specialist", architect_capabilities)
        self.assertNotIn("interaction_specialist", architect_capabilities)

    def test_get_capabilities_by_format(self):
        """Test getting capabilities by format."""
        # Register specialists with different formats
        specialist1 = MagicMock()
        specialist1.run = MagicMock(return_value="Specialist response")
        specialist1.description = "Test specialist 1"

        self.tool_adapter.register_specialist_as_tool(
            specialist_name="json_specialist",
            specialist_obj=specialist1,
            input_format=ADKToolAdapter.INPUT_FORMAT_JSON,
            output_format=ADKToolAdapter.OUTPUT_FORMAT_JSON
        )

        specialist2 = MagicMock()
        specialist2.run = MagicMock(return_value="Specialist response")
        specialist2.description = "Test specialist 2"

        self.tool_adapter.register_specialist_as_tool(
            specialist_name="text_specialist",
            specialist_obj=specialist2,
            input_format=ADKToolAdapter.INPUT_FORMAT_TEXT,
            output_format=ADKToolAdapter.OUTPUT_FORMAT_TEXT
        )

        # Get capabilities by format
        json_capabilities = self.tool_adapter.get_capabilities_by_format(
            input_format=ADKToolAdapter.INPUT_FORMAT_JSON,
            output_format=ADKToolAdapter.OUTPUT_FORMAT_JSON
        )

        # Check capabilities
        self.assertIn("json_specialist", json_capabilities)
        self.assertNotIn("text_specialist", json_capabilities)


if __name__ == "__main__":
    unittest.main()
