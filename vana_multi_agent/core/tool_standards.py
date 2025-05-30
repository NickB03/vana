"""
Tool Standardization Framework for VANA Multi-Agent System

This module provides standardized interfaces, validation, error handling,
and performance monitoring for all VANA tools to ensure consistency
and reliability across the enhanced multi-agent system.
"""

import time
import logging
import traceback
from typing import Dict, Any, List, Optional, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
import json

# Configure logging
logger = logging.getLogger(__name__)

class ToolErrorType(Enum):
    """Standardized tool error types for intelligent error handling."""
    VALIDATION_ERROR = "validation_error"
    PERMISSION_ERROR = "permission_error"
    RESOURCE_ERROR = "resource_error"
    NETWORK_ERROR = "network_error"
    TIMEOUT_ERROR = "timeout_error"
    SYSTEM_ERROR = "system_error"
    UNKNOWN_ERROR = "unknown_error"

@dataclass
class ToolMetrics:
    """Performance metrics for tool execution."""
    execution_time: float = 0.0
    memory_usage: float = 0.0
    success_count: int = 0
    error_count: int = 0
    last_execution: Optional[float] = None
    average_execution_time: float = 0.0

    def update_execution(self, execution_time: float, success: bool):
        """Update metrics after tool execution."""
        self.last_execution = time.time()
        self.execution_time = execution_time

        if success:
            self.success_count += 1
        else:
            self.error_count += 1

        # Update average execution time
        total_executions = self.success_count + self.error_count
        if total_executions > 1:
            self.average_execution_time = (
                (self.average_execution_time * (total_executions - 1) + execution_time)
                / total_executions
            )
        else:
            self.average_execution_time = execution_time

@dataclass
class StandardToolResponse:
    """Standardized response format for all VANA tools."""
    success: bool
    data: Any = None
    error: Optional[str] = None
    error_type: Optional[ToolErrorType] = None
    execution_time: float = 0.0
    tool_name: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary format."""
        result = {
            "success": self.success,
            "execution_time": self.execution_time,
            "tool_name": self.tool_name
        }

        if self.success:
            result["data"] = self.data
        else:
            result["error"] = self.error
            result["error_type"] = self.error_type.value if self.error_type else None

        if self.metadata:
            result["metadata"] = self.metadata

        return result

    def to_string(self) -> str:
        """Convert response to user-friendly string format."""
        if self.success:
            if isinstance(self.data, str):
                return self.data
            elif isinstance(self.data, (list, dict)):
                return json.dumps(self.data, indent=2)
            else:
                return str(self.data)
        else:
            return f"❌ Error in {self.tool_name}: {self.error}"

class InputValidator:
    """Standardized input validation for tool parameters."""

    @staticmethod
    def validate_string(value: Any, name: str, required: bool = True,
                       min_length: int = 0, max_length: int = 10000) -> str:
        """Validate string parameter."""
        if value is None:
            if required:
                raise ValueError(f"Parameter '{name}' is required")
            return ""

        if not isinstance(value, str):
            raise ValueError(f"Parameter '{name}' must be a string, got {type(value)}")

        if len(value) < min_length:
            raise ValueError(f"Parameter '{name}' must be at least {min_length} characters")

        if len(value) > max_length:
            raise ValueError(f"Parameter '{name}' must be at most {max_length} characters")

        return value

    @staticmethod
    def validate_integer(value: Any, name: str, required: bool = True,
                        min_value: int = 0, max_value: int = 1000) -> int:
        """Validate integer parameter."""
        if value is None:
            if required:
                raise ValueError(f"Parameter '{name}' is required")
            return 0

        if not isinstance(value, int):
            try:
                value = int(value)
            except (ValueError, TypeError):
                raise ValueError(f"Parameter '{name}' must be an integer, got {type(value)}")

        if value < min_value:
            raise ValueError(f"Parameter '{name}' must be at least {min_value}")

        if value > max_value:
            raise ValueError(f"Parameter '{name}' must be at most {max_value}")

        return value

    @staticmethod
    def validate_path(value: str, name: str = "path") -> str:
        """Validate file path parameter."""
        value = InputValidator.validate_string(value, name, required=True)

        # Basic path validation (extend as needed)
        if ".." in value:
            raise ValueError(f"Path '{name}' cannot contain '..' for security reasons")

        return value

class ErrorHandler:
    """Standardized error handling and classification."""

    @staticmethod
    def classify_error(error: Exception) -> ToolErrorType:
        """Classify error type for intelligent handling."""
        error_str = str(error).lower()

        if isinstance(error, (ValueError, TypeError)):
            return ToolErrorType.VALIDATION_ERROR
        elif isinstance(error, PermissionError):
            return ToolErrorType.PERMISSION_ERROR
        elif isinstance(error, FileNotFoundError):
            return ToolErrorType.RESOURCE_ERROR
        elif isinstance(error, TimeoutError):
            return ToolErrorType.TIMEOUT_ERROR
        elif "network" in error_str or "connection" in error_str:
            return ToolErrorType.NETWORK_ERROR
        elif "memory" in error_str or "resource" in error_str:
            return ToolErrorType.RESOURCE_ERROR
        else:
            return ToolErrorType.UNKNOWN_ERROR

    @staticmethod
    def create_error_response(tool_name: str, error: Exception,
                            execution_time: float = 0.0) -> StandardToolResponse:
        """Create standardized error response."""
        error_type = ErrorHandler.classify_error(error)

        # Log error with appropriate level
        if error_type in [ToolErrorType.VALIDATION_ERROR]:
            logger.warning(f"Tool {tool_name} validation error: {error}")
        else:
            logger.error(f"Tool {tool_name} error: {error}", exc_info=True)

        return StandardToolResponse(
            success=False,
            error=str(error),
            error_type=error_type,
            execution_time=execution_time,
            tool_name=tool_name,
            metadata={"traceback": traceback.format_exc()}
        )

class PerformanceMonitor:
    """Performance monitoring and analytics for tools."""

    def __init__(self):
        self.tool_metrics: Dict[str, ToolMetrics] = {}

    def start_execution(self, tool_name: str) -> float:
        """Start timing tool execution."""
        return time.time()

    def end_execution(self, tool_name: str, start_time: float,
                     success: bool) -> float:
        """End timing and update metrics."""
        execution_time = time.time() - start_time

        if tool_name not in self.tool_metrics:
            self.tool_metrics[tool_name] = ToolMetrics()

        self.tool_metrics[tool_name].update_execution(execution_time, success)
        return execution_time

    def get_metrics(self, tool_name: str) -> Optional[ToolMetrics]:
        """Get metrics for a specific tool."""
        return self.tool_metrics.get(tool_name)

    def get_all_metrics(self) -> Dict[str, ToolMetrics]:
        """Get metrics for all tools."""
        return self.tool_metrics.copy()

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary across all tools."""
        total_executions = sum(
            m.success_count + m.error_count for m in self.tool_metrics.values()
        )
        total_errors = sum(m.error_count for m in self.tool_metrics.values())

        if total_executions == 0:
            return {"total_executions": 0, "error_rate": 0.0, "tools": {}}

        return {
            "total_executions": total_executions,
            "error_rate": total_errors / total_executions,
            "tools": {
                name: {
                    "executions": m.success_count + m.error_count,
                    "success_rate": m.success_count / (m.success_count + m.error_count) if (m.success_count + m.error_count) > 0 else 0,
                    "avg_execution_time": m.average_execution_time
                }
                for name, m in self.tool_metrics.items()
            }
        }

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

def standardized_tool_wrapper(tool_name: str, validate_inputs: bool = True):
    """Decorator to standardize tool execution with monitoring and error handling."""

    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs) -> StandardToolResponse:
            start_time = performance_monitor.start_execution(tool_name)

            try:
                # Execute the tool function
                result = func(*args, **kwargs)

                # Record successful execution
                execution_time = performance_monitor.end_execution(
                    tool_name, start_time, success=True
                )

                # Standardize response format
                if isinstance(result, StandardToolResponse):
                    result.execution_time = execution_time
                    result.tool_name = tool_name
                    return result
                else:
                    return StandardToolResponse(
                        success=True,
                        data=result,
                        execution_time=execution_time,
                        tool_name=tool_name
                    )

            except Exception as error:
                # Record failed execution
                execution_time = performance_monitor.end_execution(
                    tool_name, start_time, success=False
                )

                return ErrorHandler.create_error_response(
                    tool_name, error, execution_time
                )

        return wrapper
    return decorator

class ToolDocumentationGenerator:
    """Auto-generate documentation for standardized tools."""

    @staticmethod
    def generate_tool_docs(tool_func: Callable, tool_name: str) -> Dict[str, Any]:
        """Generate documentation for a tool function."""
        import inspect

        # Get function signature and docstring
        signature = inspect.signature(tool_func)
        docstring = inspect.getdoc(tool_func) or f"Tool: {tool_name}"

        # Extract parameters
        parameters = []
        for param_name, param in signature.parameters.items():
            param_info = {
                "name": param_name,
                "type": str(param.annotation) if param.annotation != inspect.Parameter.empty else "Any",
                "required": param.default == inspect.Parameter.empty,
                "default": param.default if param.default != inspect.Parameter.empty else None
            }
            parameters.append(param_info)

        # Get return type
        return_type = str(signature.return_annotation) if signature.return_annotation != inspect.Parameter.empty else "Any"

        return {
            "name": tool_name,
            "description": docstring,
            "parameters": parameters,
            "return_type": return_type,
            "signature": str(signature)
        }

    @staticmethod
    def generate_usage_example(tool_name: str, parameters: List[Dict[str, Any]]) -> str:
        """Generate usage example for a tool."""
        # Create example parameters
        example_params = []
        for param in parameters:
            if param["required"]:
                if "str" in param["type"].lower():
                    example_params.append(f'"{param["name"]}_example"')
                elif "int" in param["type"].lower():
                    example_params.append("5")
                elif "bool" in param["type"].lower():
                    example_params.append("True")
                else:
                    example_params.append(f'"{param["name"]}_value"')

        params_str = ", ".join(example_params)
        return f"""
# Example usage:
from vana_multi_agent.tools import {tool_name}

result = {tool_name}({params_str})
if result.success:
    print(f"Success: {{result.data}}")
else:
    print(f"Error: {{result.error}}")
"""

class ToolAnalytics:
    """Analytics framework for tool usage patterns."""

    def __init__(self):
        self.usage_patterns: Dict[str, List[Dict[str, Any]]] = {}

    def record_usage(self, tool_name: str, parameters: Dict[str, Any],
                    result: StandardToolResponse):
        """Record tool usage for analytics."""
        if tool_name not in self.usage_patterns:
            self.usage_patterns[tool_name] = []

        usage_record = {
            "timestamp": time.time(),
            "parameters": parameters,
            "success": result.success,
            "execution_time": result.execution_time,
            "error_type": result.error_type.value if result.error_type else None
        }

        self.usage_patterns[tool_name].append(usage_record)

        # Keep only last 1000 records per tool
        if len(self.usage_patterns[tool_name]) > 1000:
            self.usage_patterns[tool_name] = self.usage_patterns[tool_name][-1000:]

    def get_usage_analytics(self, tool_name: str) -> Dict[str, Any]:
        """Get usage analytics for a specific tool."""
        if tool_name not in self.usage_patterns:
            return {"total_usage": 0, "success_rate": 0.0, "avg_execution_time": 0.0}

        records = self.usage_patterns[tool_name]
        total_usage = len(records)
        successful_usage = sum(1 for r in records if r["success"])

        success_rate = successful_usage / total_usage if total_usage > 0 else 0.0
        avg_execution_time = sum(r["execution_time"] for r in records) / total_usage if total_usage > 0 else 0.0

        return {
            "total_usage": total_usage,
            "success_rate": success_rate,
            "avg_execution_time": avg_execution_time,
            "recent_errors": [
                r["error_type"] for r in records[-10:] if not r["success"]
            ]
        }

# Global analytics instance
tool_analytics = ToolAnalytics()
