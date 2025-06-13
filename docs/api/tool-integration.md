# Tool Integration Guide

## Creating Custom Tools

### Tool Class Structure
All VANA tools inherit from the base Tool class and implement standardized interfaces.

```python
from google.adk import Tool
from typing import Dict, Any, Optional
import asyncio

class CustomTool(Tool):
    def __init__(self):
        super().__init__(
            name="custom_tool",
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
    
    async def execute(self, param1: str, param2: int = 10, param3: Optional[list] = None) -> Dict[str, Any]:
        """
        Execute the tool with given parameters.
        
        Args:
            param1: Required string parameter
            param2: Optional integer parameter (default: 10)
            param3: Optional list of strings
            
        Returns:
            Dict containing execution results and metadata
        """
        try:
            # Validate inputs
            await self._validate_inputs(param1, param2, param3)
            
            # Perform tool operation
            result = await self._perform_operation(param1, param2, param3)
            
            # Return standardized response
            return {
                "success": True,
                "result": result,
                "metadata": {
                    "execution_time": self.execution_time,
                    "tool_version": "1.0.0",
                    "timestamp": self.get_timestamp()
                }
            }
            
        except Exception as e:
            return await self._handle_error(e)
    
    async def _validate_inputs(self, param1: str, param2: int, param3: Optional[list]):
        """Validate input parameters."""
        if not param1 or len(param1.strip()) == 0:
            raise ValueError("param1 cannot be empty")
        
        if param2 < 1 or param2 > 100:
            raise ValueError("param2 must be between 1 and 100")
        
        if param3 and not isinstance(param3, list):
            raise TypeError("param3 must be a list")
    
    async def _perform_operation(self, param1: str, param2: int, param3: Optional[list]):
        """Implement the core tool functionality."""
        # Your tool logic here
        await asyncio.sleep(0.1)  # Simulate async operation
        
        return {
            "processed_param1": param1.upper(),
            "multiplied_param2": param2 * 2,
            "param3_count": len(param3) if param3 else 0
        }
    
    async def _handle_error(self, error: Exception) -> Dict[str, Any]:
        """Handle errors with standardized error response."""
        return {
            "success": False,
            "error": {
                "type": type(error).__name__,
                "message": str(error),
                "tool": self.name
            },
            "metadata": {
                "timestamp": self.get_timestamp()
            }
        }
```

### Advanced Tool Features

#### Async Tool with Progress Tracking
```python
class LongRunningTool(Tool):
    def __init__(self):
        super().__init__(
            name="long_running_tool",
            description="Tool that performs long-running operations with progress tracking",
            parameters={
                "operation": {"type": "string", "required": True},
                "data_size": {"type": "integer", "default": 1000}
            }
        )
        self.progress_callback = None
    
    async def execute(self, operation: str, data_size: int = 1000) -> Dict[str, Any]:
        """Execute long-running operation with progress updates."""
        
        total_steps = data_size // 100
        
        for step in range(total_steps):
            # Perform work
            await self._process_chunk(step)
            
            # Update progress
            progress = (step + 1) / total_steps * 100
            if self.progress_callback:
                await self.progress_callback(progress, f"Processing step {step + 1}/{total_steps}")
            
            # Yield control to allow other operations
            await asyncio.sleep(0.01)
        
        return {
            "success": True,
            "result": f"Completed {operation} on {data_size} items",
            "metadata": {
                "steps_completed": total_steps,
                "execution_time": self.execution_time
            }
        }
    
    def set_progress_callback(self, callback):
        """Set callback function for progress updates."""
        self.progress_callback = callback
```

#### Tool with Caching
```python
from functools import wraps
import hashlib
import json

class CachedTool(Tool):
    def __init__(self):
        super().__init__(
            name="cached_tool",
            description="Tool with intelligent caching for expensive operations",
            parameters={
                "query": {"type": "string", "required": True},
                "cache_ttl": {"type": "integer", "default": 300}
            }
        )
        self.cache = {}
    
    def cache_result(self, ttl_seconds=300):
        """Decorator to cache tool results."""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = self._generate_cache_key(args, kwargs)
                
                # Check cache
                if cache_key in self.cache:
                    result, timestamp = self.cache[cache_key]
                    if time.time() - timestamp < ttl_seconds:
                        return result
                
                # Execute and cache result
                result = await func(*args, **kwargs)
                self.cache[cache_key] = (result, time.time())
                
                return result
            return wrapper
        return decorator
    
    @cache_result(ttl_seconds=300)
    async def execute(self, query: str, cache_ttl: int = 300) -> Dict[str, Any]:
        """Execute expensive operation with caching."""
        
        # Simulate expensive operation
        await asyncio.sleep(2.0)
        
        result = f"Processed query: {query}"
        
        return {
            "success": True,
            "result": result,
            "metadata": {
                "cached": False,
                "execution_time": self.execution_time
            }
        }
    
    def _generate_cache_key(self, args, kwargs):
        """Generate unique cache key from parameters."""
        key_data = {"args": args, "kwargs": kwargs}
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
```

## Tool Registration

### Agent Tool Registration
Register tools with agents to make them available for execution.

```python
from agents.base_agent import BaseAgent
from tools.custom_tool import CustomTool
from tools.cached_tool import CachedTool

class MyAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="my_agent",
            description="Agent with custom tools",
            tools=[
                CustomTool(),
                CachedTool(),
                # Add more tools as needed
            ]
        )
    
    async def initialize(self):
        """Initialize agent and register tools."""
        await super().initialize()
        
        # Configure tool-specific settings
        for tool in self.tools:
            if isinstance(tool, CachedTool):
                tool.cache_ttl = 600  # 10 minutes
            elif isinstance(tool, LongRunningTool):
                tool.set_progress_callback(self._progress_handler)
    
    async def _progress_handler(self, progress: float, message: str):
        """Handle progress updates from long-running tools."""
        await self.emit_event("tool_progress", {
            "progress": progress,
            "message": message,
            "timestamp": time.time()
        })
```

### Dynamic Tool Loading
Load tools dynamically based on configuration or runtime requirements.

```python
import importlib
from typing import List, Type

class DynamicToolLoader:
    def __init__(self, tool_config: Dict[str, Any]):
        self.tool_config = tool_config
        self.loaded_tools = {}
    
    async def load_tools(self, tool_names: List[str]) -> List[Tool]:
        """Dynamically load tools by name."""
        tools = []
        
        for tool_name in tool_names:
            if tool_name in self.loaded_tools:
                tools.append(self.loaded_tools[tool_name])
            else:
                tool = await self._load_tool(tool_name)
                if tool:
                    self.loaded_tools[tool_name] = tool
                    tools.append(tool)
        
        return tools
    
    async def _load_tool(self, tool_name: str) -> Optional[Tool]:
        """Load a single tool by name."""
        try:
            # Get tool configuration
            tool_config = self.tool_config.get(tool_name)
            if not tool_config:
                raise ValueError(f"No configuration found for tool: {tool_name}")
            
            # Import tool module
            module_path = tool_config["module"]
            class_name = tool_config["class"]
            
            module = importlib.import_module(module_path)
            tool_class = getattr(module, class_name)
            
            # Create tool instance
            tool = tool_class()
            
            # Apply configuration
            if "config" in tool_config:
                await self._configure_tool(tool, tool_config["config"])
            
            return tool
            
        except Exception as e:
            logger.error(f"Failed to load tool {tool_name}: {e}")
            return None
    
    async def _configure_tool(self, tool: Tool, config: Dict[str, Any]):
        """Apply configuration to tool instance."""
        for key, value in config.items():
            if hasattr(tool, key):
                setattr(tool, key, value)
```

## Error Handling Best Practices

### Comprehensive Error Handling
Implement robust error handling for all tool operations.

```python
class RobustTool(Tool):
    def __init__(self):
        super().__init__(
            name="robust_tool",
            description="Tool with comprehensive error handling",
            parameters={
                "operation": {"type": "string", "required": True}
            }
        )
    
    async def execute(self, operation: str) -> Dict[str, Any]:
        """Execute with comprehensive error handling."""
        
        try:
            # Validate operation
            await self._validate_operation(operation)
            
            # Execute with timeout
            result = await asyncio.wait_for(
                self._perform_operation(operation),
                timeout=30.0
            )
            
            return {
                "success": True,
                "result": result,
                "metadata": {
                    "operation": operation,
                    "execution_time": self.execution_time
                }
            }
            
        except asyncio.TimeoutError:
            return self._timeout_error(operation)
        except ValidationError as e:
            return self._validation_error(e)
        except PermissionError as e:
            return self._permission_error(e)
        except Exception as e:
            return self._unexpected_error(e)
    
    def _timeout_error(self, operation: str) -> Dict[str, Any]:
        """Handle timeout errors."""
        return {
            "success": False,
            "error": {
                "code": "TIMEOUT_ERROR",
                "message": f"Operation '{operation}' timed out after 30 seconds",
                "type": "timeout",
                "recoverable": True,
                "suggestion": "Try reducing the scope of the operation or increasing timeout"
            }
        }
    
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

### Retry Mechanisms
Implement intelligent retry logic for transient failures.

```python
import random

class RetryableTool(Tool):
    def __init__(self):
        super().__init__(
            name="retryable_tool",
            description="Tool with intelligent retry mechanisms",
            parameters={
                "operation": {"type": "string", "required": True},
                "max_retries": {"type": "integer", "default": 3}
            }
        )
    
    async def execute(self, operation: str, max_retries: int = 3) -> Dict[str, Any]:
        """Execute with retry logic for transient failures."""
        
        last_error = None
        
        for attempt in range(max_retries + 1):
            try:
                result = await self._attempt_operation(operation, attempt)
                
                return {
                    "success": True,
                    "result": result,
                    "metadata": {
                        "attempts": attempt + 1,
                        "execution_time": self.execution_time
                    }
                }
                
            except TransientError as e:
                last_error = e
                if attempt < max_retries:
                    # Exponential backoff with jitter
                    delay = (2 ** attempt) + random.uniform(0, 1)
                    await asyncio.sleep(delay)
                    continue
                else:
                    break
            except PermanentError as e:
                # Don't retry permanent errors
                return self._permanent_error_response(e)
        
        # All retries exhausted
        return self._retry_exhausted_response(last_error, max_retries + 1)
    
    async def _attempt_operation(self, operation: str, attempt: int):
        """Attempt the operation (may raise TransientError or PermanentError)."""
        # Simulate operation that might fail
        if random.random() < 0.3:  # 30% chance of transient failure
            raise TransientError("Temporary service unavailable")
        
        return f"Operation '{operation}' completed successfully on attempt {attempt + 1}"
    
    def _retry_exhausted_response(self, error: Exception, attempts: int) -> Dict[str, Any]:
        """Response when all retries are exhausted."""
        return {
            "success": False,
            "error": {
                "code": "RETRY_EXHAUSTED",
                "message": f"Operation failed after {attempts} attempts: {str(error)}",
                "type": "retry_exhausted",
                "attempts": attempts,
                "last_error": str(error)
            }
        }
```

## Testing Tools

### Unit Testing
Create comprehensive unit tests for your tools.

```python
import pytest
import asyncio
from unittest.mock import AsyncMock, patch

class TestCustomTool:
    @pytest.fixture
    def tool(self):
        return CustomTool()
    
    @pytest.mark.asyncio
    async def test_successful_execution(self, tool):
        """Test successful tool execution."""
        result = await tool.execute(
            param1="test_value",
            param2=25,
            param3=["item1", "item2"]
        )
        
        assert result["success"] is True
        assert result["result"]["processed_param1"] == "TEST_VALUE"
        assert result["result"]["multiplied_param2"] == 50
        assert result["result"]["param3_count"] == 2
    
    @pytest.mark.asyncio
    async def test_validation_error(self, tool):
        """Test input validation error handling."""
        result = await tool.execute(
            param1="",  # Invalid empty string
            param2=25
        )
        
        assert result["success"] is False
        assert "param1 cannot be empty" in result["error"]["message"]
    
    @pytest.mark.asyncio
    async def test_parameter_bounds(self, tool):
        """Test parameter boundary validation."""
        result = await tool.execute(
            param1="test",
            param2=150  # Exceeds maximum of 100
        )
        
        assert result["success"] is False
        assert "must be between 1 and 100" in result["error"]["message"]
    
    @pytest.mark.asyncio
    async def test_async_operation_mock(self, tool):
        """Test with mocked async operations."""
        with patch.object(tool, '_perform_operation', new_callable=AsyncMock) as mock_op:
            mock_op.return_value = {"mocked": True}
            
            result = await tool.execute(param1="test")
            
            assert result["success"] is True
            assert result["result"]["mocked"] is True
            mock_op.assert_called_once()
```

### Integration Testing
Test tool integration with agents and the broader system.

```python
@pytest.mark.integration
class TestToolIntegration:
    @pytest.fixture
    async def agent_with_tool(self):
        """Create agent with custom tool for testing."""
        agent = MyAgent()
        await agent.initialize()
        return agent
    
    @pytest.mark.asyncio
    async def test_agent_tool_execution(self, agent_with_tool):
        """Test tool execution through agent interface."""
        result = await agent_with_tool.execute_tool(
            tool_name="custom_tool",
            parameters={
                "param1": "integration_test",
                "param2": 42
            }
        )
        
        assert result["success"] is True
        assert "integration_test" in str(result["result"])
    
    @pytest.mark.asyncio
    async def test_tool_error_propagation(self, agent_with_tool):
        """Test error propagation from tool to agent."""
        result = await agent_with_tool.execute_tool(
            tool_name="custom_tool",
            parameters={
                "param1": "",  # Invalid parameter
                "param2": 42
            }
        )
        
        assert result["success"] is False
        assert "error" in result
```
