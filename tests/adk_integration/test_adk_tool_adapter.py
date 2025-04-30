"""
Tests for the ADKToolAdapter class.
"""

import unittest
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


if __name__ == "__main__":
    unittest.main()
