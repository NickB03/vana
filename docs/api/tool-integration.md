# Tool Integration Guide

## Creating Custom Tools

### Google ADK FunctionTool Pattern
All VANA tools use Google ADK's FunctionTool pattern with synchronous execution.

```python
from google.adk import FunctionTool
from typing import Dict, Any, Optional

class CustomTool(FunctionTool):
    def __init__(self):
        super().__init__(
            name="adk_custom_tool",
            description="Description of what the tool does and its capabilities",
            parameters={
                "param1": {
                    "type": "string",
                    "description": "Description of parameter 1",
                    "required": True
                },
                "param2": {
                    "type": "integer",
                    "description": "Optional parameter with default value",
                    "default": 10,
                    "minimum": 1,
                    "maximum": 100
                },
                "param3": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of string values"
                }
            }
        )

    def func(self, param1: str, param2: int = 10, param3: Optional[list] = None) -> Dict[str, Any]:
        """
        Execute the tool with given parameters (synchronous execution).

        Args:
            param1: Required string parameter
            param2: Optional integer parameter (default: 10)
            param3: Optional list of strings

        Returns:
            Dict containing execution results and metadata
        """
        try:
            # Validate inputs
            self._validate_inputs(param1, param2, param3)

            # Perform tool operation
            result = self._perform_operation(param1, param2, param3)

            # Return standardized response
            return {
                "success": True,
                "result": result,
                "metadata": {
                    "tool_version": "1.0.0",
                    "timestamp": self._get_timestamp()
                }
            }

        except Exception as e:
            return self._handle_error(e)

    def _validate_inputs(self, param1: str, param2: int, param3: Optional[list]):
        """Validate input parameters."""
        if not param1 or len(param1.strip()) == 0:
            raise ValueError("param1 cannot be empty")

        if param2 < 1 or param2 > 100:
            raise ValueError("param2 must be between 1 and 100")

        if param3 and not isinstance(param3, list):
            raise TypeError("param3 must be a list")

    def _perform_operation(self, param1: str, param2: int, param3: Optional[list]):
        """Implement the core tool functionality."""
        # Your tool logic here (synchronous)

        return {
            "processed_param1": param1.upper(),
            "multiplied_param2": param2 * 2,
            "param3_count": len(param3) if param3 else 0
        }

    def _handle_error(self, error: Exception) -> Dict[str, Any]:
        """Handle errors with standardized error response."""
        return {
            "success": False,
            "error": {
                "type": type(error).__name__,
                "message": str(error),
                "tool": self.name
            },
            "metadata": {
                "timestamp": self._get_timestamp()
            }
        }
```

### Advanced Tool Features

#### Tool with Error Handling and Fallbacks
```python
class RobustTool(FunctionTool):
    def __init__(self):
        super().__init__(
            name="adk_robust_tool",
            description="Tool with comprehensive error handling and fallback mechanisms",
            parameters={
                "operation": {"type": "string", "required": True},
                "fallback_enabled": {"type": "boolean", "default": True}
            }
        )

    def func(self, operation: str, fallback_enabled: bool = True) -> Dict[str, Any]:
        """Execute operation with fallback mechanisms."""

        try:
            # Primary operation
            result = self._primary_operation(operation)

            return {
                "success": True,
                "result": result,
                "metadata": {
                    "method": "primary",
                    "operation": operation
                }
            }

        except Exception as e:
            if fallback_enabled:
                # Try fallback operation
                try:
                    result = self._fallback_operation(operation)
                    return {
                        "success": True,
                        "result": result,
                        "metadata": {
                            "method": "fallback",
                            "primary_error": str(e),
                            "operation": operation
                        }
                    }
                except Exception as fallback_error:
                    return self._handle_complete_failure(e, fallback_error)
            else:
                return self._handle_error(e)
```

#### Tool with Validation and Logging
```python
import logging
import time
from functools import wraps

class ValidatedTool(FunctionTool):
    def __init__(self):
        super().__init__(
            name="adk_validated_tool",
            description="Tool with comprehensive input validation and logging",
            parameters={
                "query": {"type": "string", "required": True},
                "options": {"type": "object", "default": {}}
            }
        )
        self.logger = logging.getLogger(f"tool.{self.name}")

    def func(self, query: str, options: dict = None) -> Dict[str, Any]:
        """Execute operation with validation and logging."""

        start_time = time.time()
        self.logger.info(f"Starting {self.name} execution", extra={
            "query": query,
            "options": options
        })

        try:
            # Validate inputs
            self._validate_query(query)
            self._validate_options(options or {})

            # Execute operation
            result = self._execute_operation(query, options or {})

            execution_time = time.time() - start_time
            self.logger.info(f"Completed {self.name} execution", extra={
                "execution_time": execution_time,
                "success": True
            })

            return {
                "success": True,
                "result": result,
                "metadata": {
                    "execution_time": execution_time,
                    "validated": True
                }
            }

        except Exception as e:
            execution_time = time.time() - start_time
            self.logger.error(f"Failed {self.name} execution", extra={
                "error": str(e),
                "execution_time": execution_time
            })
            return self._handle_error(e)

    def _validate_query(self, query: str):
        """Validate query parameter."""
        if not query or not query.strip():
            raise ValueError("Query cannot be empty")
        if len(query) > 1000:
            raise ValueError("Query too long (max 1000 characters)")

    def _validate_options(self, options: dict):
        """Validate options parameter."""
        allowed_keys = {"timeout", "format", "limit"}
        invalid_keys = set(options.keys()) - allowed_keys
        if invalid_keys:
            raise ValueError(f"Invalid options: {invalid_keys}")
```

## Tool Registration

### Google ADK Agent Tool Registration
Register FunctionTool objects with Google ADK agents.

```python
from google.adk import LlmAgent
from lib._tools.custom_tool import CustomTool
from lib._tools.validated_tool import ValidatedTool

class MyAgent(LlmAgent):
    def __init__(self):
        # Initialize tools
        custom_tool = CustomTool()
        validated_tool = ValidatedTool()

        super().__init__(
            name="my_agent",
            description="Agent with custom tools",
            tools=[
                custom_tool,
                validated_tool,
                # Add more FunctionTool objects as needed
            ]
        )

    def initialize(self):
        """Initialize agent and configure tools."""
        super().initialize()

        # Tools are automatically registered with ADK
        # Access tools via self.tools or by name
        for tool in self.tools:
            if hasattr(tool, 'configure'):
                tool.configure()
```

### Tool Usage in Agents
Access and use tools within Google ADK agents.

```python
from google.adk import LlmAgent

class ToolUsingAgent(LlmAgent):
    def __init__(self):
        super().__init__(
            name="tool_using_agent",
            description="Agent that demonstrates tool usage patterns",
            tools=[
                CustomTool(),
                ValidatedTool(),
            ]
        )

    def process_request(self, request: str) -> Dict[str, Any]:
        """Process request using available tools."""

        # Access tools by name or iterate through self.tools
        custom_tool = None
        for tool in self.tools:
            if tool.name == "adk_custom_tool":
                custom_tool = tool
                break

        if custom_tool:
            # Use tool via .func() method (Google ADK pattern)
            result = custom_tool.func(
                param1="example",
                param2=42,
                param3=["item1", "item2"]
            )

            return {
                "success": True,
                "tool_result": result,
                "tool_used": custom_tool.name
            }

        return {
            "success": False,
            "error": "Required tool not available"
        }

    def get_available_tools(self) -> List[str]:
        """Get list of available tool names."""
        return [tool.name for tool in self.tools]
```

## Error Handling Best Practices

### Comprehensive Error Handling
Implement robust error handling for all tool operations using Google ADK patterns.

```python
class RobustTool(FunctionTool):
    def __init__(self):
        super().__init__(
            name="adk_robust_tool",
            description="Tool with comprehensive error handling",
            parameters={
                "operation": {"type": "string", "required": True}
            }
        )

    def func(self, operation: str) -> Dict[str, Any]:
        """Execute with comprehensive error handling (synchronous)."""

        try:
            # Validate operation
            self._validate_operation(operation)

            # Execute operation
            result = self._perform_operation(operation)

            return {
                "success": True,
                "result": result,
                "metadata": {
                    "operation": operation,
                    "tool": self.name
                }
            }

        except ValueError as e:
            return self._validation_error(e)
        except PermissionError as e:
            return self._permission_error(e)
        except Exception as e:
            return self._unexpected_error(e)

    def _validate_operation(self, operation: str):
        """Validate operation parameter."""
        if not operation or not operation.strip():
            raise ValueError("Operation cannot be empty")

        allowed_operations = {"read", "write", "process", "analyze"}
        if operation not in allowed_operations:
            raise ValueError(f"Invalid operation. Allowed: {allowed_operations}")

    def _perform_operation(self, operation: str):
        """Perform the actual operation."""
        # Implementation here
        return f"Completed operation: {operation}"

    def _validation_error(self, error: Exception) -> Dict[str, Any]:
        """Handle validation errors."""
        return {
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(error),
                "type": "validation",
                "recoverable": True,
                "suggestion": "Please check your input parameters and try again"
            }
        }

    def _permission_error(self, error: Exception) -> Dict[str, Any]:
        """Handle permission errors."""
        return {
            "success": False,
            "error": {
                "code": "PERMISSION_ERROR",
                "message": "Insufficient permissions to perform operation",
                "type": "permission",
                "recoverable": False,
                "suggestion": "Contact administrator for required permissions"
            }
        }

    def _unexpected_error(self, error: Exception) -> Dict[str, Any]:
        """Handle unexpected errors."""
        return {
            "success": False,
            "error": {
                "code": "UNEXPECTED_ERROR",
                "message": f"Unexpected error: {str(error)}",
                "type": "unexpected",
                "recoverable": False,
                "suggestion": "Please report this error to the development team"
            }
        }
```

### Current Tool Categories
VANA implements 6 validated tool categories with 90.3% success rate:

```python
# Example of current tool categories in VANA
TOOL_CATEGORIES = {
    "file_system": [
        "adk_read_file",
        "adk_write_file",
        "adk_list_directory",
        "adk_file_exists"
    ],
    "search": [
        "adk_vector_search",
        "adk_web_search",
        "adk_search_knowledge"
    ],
    "system": [
        "adk_echo",
        "adk_get_health_status"
    ],
    "coordination": [
        "adk_coordinate_task",
        "adk_delegate_to_agent",
        "adk_get_agent_status",
        "adk_transfer_to_agent"
    ],
    "task_analysis": [
        "adk_analyze_task",
        "adk_match_capabilities",
        "adk_classify_task"
    ],
    "workflow_management": [
        "adk_create_workflow",
        "adk_start_workflow",
        "adk_get_workflow_status",
        "adk_list_workflows",
        "adk_pause_workflow",
        "adk_resume_workflow",
        "adk_cancel_workflow",
        "adk_get_workflow_templates"
    ]
}

# Tool usage example
def use_tool_example():
    """Example of how tools are used in VANA agents."""
    # Tools are accessed via .func() method
    result = adk_read_file.func({"file_path": "/path/to/file.txt"})

    if result.get("success"):
        content = result["result"]["content"]
        return {"status": "success", "data": content}
    else:
        return {"status": "error", "message": result.get("error", "Unknown error")}
```

## Testing Tools

### Unit Testing
Create comprehensive unit tests for Google ADK FunctionTool objects.

```python
import pytest
from unittest.mock import patch, MagicMock

class TestCustomTool:
    @pytest.fixture
    def tool(self):
        return CustomTool()

    def test_successful_execution(self, tool):
        """Test successful tool execution."""
        result = tool.func(
            param1="test_value",
            param2=25,
            param3=["item1", "item2"]
        )

        assert result["success"] is True
        assert result["result"]["processed_param1"] == "TEST_VALUE"
        assert result["result"]["multiplied_param2"] == 50
        assert result["result"]["param3_count"] == 2

    def test_validation_error(self, tool):
        """Test input validation error handling."""
        result = tool.func(
            param1="",  # Invalid empty string
            param2=25
        )

        assert result["success"] is False
        assert "param1 cannot be empty" in result["error"]["message"]

    def test_parameter_bounds(self, tool):
        """Test parameter boundary validation."""
        result = tool.func(
            param1="test",
            param2=150  # Exceeds maximum of 100
        )

        assert result["success"] is False
        assert "must be between 1 and 100" in result["error"]["message"]

    def test_operation_mock(self, tool):
        """Test with mocked operations."""
        with patch.object(tool, '_perform_operation') as mock_op:
            mock_op.return_value = {"mocked": True}

            result = tool.func(param1="test")

            assert result["success"] is True
            assert result["result"]["mocked"] is True
            mock_op.assert_called_once()
```

### Integration Testing
Test tool integration with Google ADK agents.

```python
@pytest.mark.integration
class TestToolIntegration:
    @pytest.fixture
    def agent_with_tool(self):
        """Create agent with custom tool for testing."""
        agent = MyAgent()
        agent.initialize()
        return agent

    def test_agent_tool_execution(self, agent_with_tool):
        """Test tool execution through agent interface."""
        # Find the tool in the agent's tools
        custom_tool = None
        for tool in agent_with_tool.tools:
            if tool.name == "adk_custom_tool":
                custom_tool = tool
                break

        assert custom_tool is not None

        # Execute tool via .func() method
        result = custom_tool.func(
            param1="integration_test",
            param2=42
        )

        assert result["success"] is True
        assert "integration_test" in str(result["result"])

    def test_tool_error_propagation(self, agent_with_tool):
        """Test error propagation from tool to agent."""
        custom_tool = None
        for tool in agent_with_tool.tools:
            if tool.name == "adk_custom_tool":
                custom_tool = tool
                break

        result = custom_tool.func(
            param1="",  # Invalid parameter
            param2=42
        )

        assert result["success"] is False
        assert "error" in result

### Current VANA Testing Framework
VANA uses a comprehensive testing framework with 90.3% success rate:

```python
# Example from VANA's actual testing framework
class TestVANATools:
    """Test suite based on VANA's production testing framework."""

    def test_file_system_tools(self):
        """Test file system tool category (12/17 tests passing)."""
        # Tests for adk_read_file, adk_write_file, etc.
        pass

    def test_search_tools(self):
        """Test search tool category (16/16 tests passing)."""
        # Tests for adk_vector_search, adk_web_search, etc.
        pass

    def test_coordination_tools(self):
        """Test coordination tool category (24/24 tests passing)."""
        # Tests for adk_coordinate_task, adk_delegate_to_agent, etc.
        pass
```
