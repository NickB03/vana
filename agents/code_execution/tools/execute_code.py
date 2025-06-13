"""
Code Execution Tool

Advanced code execution capabilities with enhanced debugging and analysis features.
"""

import logging
from typing import Any, Dict, List, Optional

from lib.sandbox.core.execution_engine import ExecutionEngine, ExecutionStatus

logger = logging.getLogger(__name__)


async def execute_code_tool(
    language: str,
    code: str,
    timeout: Optional[int] = None,
    debug_mode: bool = False,
    capture_output: bool = True,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Advanced code execution with debugging and analysis capabilities.

    Args:
        language: Programming language (python, javascript, shell)
        code: Code to execute
        timeout: Execution timeout in seconds
        debug_mode: Enable debug mode with additional information
        capture_output: Whether to capture and return output
        metadata: Additional metadata for execution

    Returns:
        Enhanced execution result with debugging information
    """
    try:
        execution_engine = ExecutionEngine()

        # Prepare metadata
        exec_metadata = metadata or {}
        exec_metadata.update({"debug_mode": debug_mode, "capture_output": capture_output, "tool": "execute_code_tool"})

        # Execute code
        result = await execution_engine.execute_code(
            language=language, code=code, timeout=timeout, metadata=exec_metadata
        )

        # Build response
        response = {
            "execution_id": result.execution_id,
            "status": result.status.value,
            "language": result.language,
            "execution_time": round(result.execution_time, 3),
            "success": result.status == ExecutionStatus.COMPLETED,
            "timestamp": result.timestamp,
        }

        # Add output if capture is enabled
        if capture_output:
            response["output"] = result.output

        # Add error information
        if result.error:
            response["error"] = result.error
            response["error_type"] = _classify_error(result.error)

            if debug_mode:
                response["debug_info"] = _generate_debug_info(result.error, language, code)

        # Add resource usage information
        if result.resource_usage:
            response["resource_usage"] = {
                "cpu_percent": result.resource_usage.cpu_percent,
                "memory_mb": result.resource_usage.memory_mb,
                "execution_time": result.resource_usage.execution_time,
                "peak_memory": getattr(result.resource_usage, "peak_memory_mb", None),
            }

        # Add debug information if requested
        if debug_mode:
            response["debug_analysis"] = _analyze_execution(result, code, language)

        return response

    except Exception as e:
        logger.error(f"Code execution tool failed: {str(e)}")
        return {"success": False, "error": f"Execution tool failed: {str(e)}", "error_type": "tool_error"}


def _classify_error(error: str) -> str:
    """Classify error type for better debugging."""
    error_lower = error.lower()

    if "timeout" in error_lower:
        return "timeout_error"
    elif "security" in error_lower:
        return "security_error"
    elif "resource" in error_lower:
        return "resource_error"
    elif "syntax" in error_lower:
        return "syntax_error"
    elif "import" in error_lower or "module" in error_lower:
        return "import_error"
    elif "permission" in error_lower:
        return "permission_error"
    elif "memory" in error_lower:
        return "memory_error"
    else:
        return "runtime_error"


def _generate_debug_info(error: str, language: str, code: str) -> Dict[str, Any]:
    """Generate debugging information for errors."""
    debug_info = {
        "error_classification": _classify_error(error),
        "language": language,
        "code_length": len(code),
        "code_lines": len(code.split("\n")),
    }

    # Language-specific debugging
    if language == "python":
        debug_info.update(_python_debug_info(error, code))
    elif language == "javascript":
        debug_info.update(_javascript_debug_info(error, code))
    elif language == "shell":
        debug_info.update(_shell_debug_info(error, code))

    return debug_info


def _python_debug_info(error: str, code: str) -> Dict[str, Any]:
    """Generate Python-specific debug information."""
    debug_info = {}

    # Check for common Python issues
    if "IndentationError" in error:
        debug_info["issue"] = "indentation_error"
        debug_info["suggestion"] = "Check indentation consistency (spaces vs tabs)"
    elif "NameError" in error:
        debug_info["issue"] = "undefined_variable"
        debug_info["suggestion"] = "Ensure all variables are defined before use"
    elif "ImportError" in error or "ModuleNotFoundError" in error:
        debug_info["issue"] = "import_error"
        debug_info["suggestion"] = "Check if the module is available in the sandbox environment"
    elif "SyntaxError" in error:
        debug_info["issue"] = "syntax_error"
        debug_info["suggestion"] = "Check for missing brackets, quotes, or colons"

    # Analyze code structure
    lines = code.split("\n")
    debug_info["has_imports"] = any(
        line.strip().startswith("import ") or line.strip().startswith("from ") for line in lines
    )
    debug_info["has_functions"] = any("def " in line for line in lines)
    debug_info["has_classes"] = any("class " in line for line in lines)

    return debug_info


def _javascript_debug_info(error: str, code: str) -> Dict[str, Any]:
    """Generate JavaScript-specific debug information."""
    debug_info = {}

    # Check for common JavaScript issues
    if "SyntaxError" in error:
        debug_info["issue"] = "syntax_error"
        debug_info["suggestion"] = "Check for missing brackets, semicolons, or quotes"
    elif "ReferenceError" in error:
        debug_info["issue"] = "undefined_reference"
        debug_info["suggestion"] = "Ensure all variables and functions are defined"
    elif "TypeError" in error:
        debug_info["issue"] = "type_error"
        debug_info["suggestion"] = "Check data types and method calls"

    # Analyze code structure
    lines = code.split("\n")
    debug_info["has_requires"] = any("require(" in line for line in lines)
    debug_info["has_functions"] = any("function " in line or "=>" in line for line in lines)
    debug_info["has_async"] = any("async " in line or "await " in line for line in lines)

    return debug_info


def _shell_debug_info(error: str, code: str) -> Dict[str, Any]:
    """Generate Shell-specific debug information."""
    debug_info = {}

    # Check for common shell issues
    if "command not found" in error.lower():
        debug_info["issue"] = "command_not_found"
        debug_info["suggestion"] = "Check if the command is available in the sandbox environment"
    elif "permission denied" in error.lower():
        debug_info["issue"] = "permission_denied"
        debug_info["suggestion"] = "Check file permissions or use allowed commands"
    elif "no such file" in error.lower():
        debug_info["issue"] = "file_not_found"
        debug_info["suggestion"] = "Verify file paths and existence"

    # Analyze code structure
    lines = [line.strip() for line in code.split("\n") if line.strip()]
    debug_info["command_count"] = len(lines)
    debug_info["has_pipes"] = any("|" in line for line in lines)
    debug_info["has_redirects"] = any(">" in line or "<" in line for line in lines)

    return debug_info


def _analyze_execution(result, code: str, language: str) -> Dict[str, Any]:
    """Analyze execution for debugging insights."""
    analysis = {
        "execution_status": result.status.value,
        "code_complexity": _estimate_complexity(code, language),
        "performance_metrics": {
            "execution_time": result.execution_time,
            "relative_speed": (
                "fast" if result.execution_time < 1.0 else "slow" if result.execution_time > 5.0 else "normal"
            ),
        },
    }

    # Add success-specific analysis
    if result.status == ExecutionStatus.COMPLETED:
        analysis["success_factors"] = [
            "Code executed without errors",
            "Resource limits respected",
            "Security validation passed",
        ]
    else:
        analysis["failure_factors"] = _identify_failure_factors(result)

    return analysis


def _estimate_complexity(code: str, language: str) -> str:
    """Estimate code complexity for debugging context."""
    lines = len([line for line in code.split("\n") if line.strip()])

    if lines <= 5:
        return "simple"
    elif lines <= 20:
        return "moderate"
    elif lines <= 50:
        return "complex"
    else:
        return "very_complex"


def _identify_failure_factors(result) -> List[str]:
    """Identify factors that led to execution failure."""
    factors = []

    if result.status == ExecutionStatus.TIMEOUT:
        factors.append("Execution exceeded time limit")
        factors.append("Consider optimizing algorithm or increasing timeout")
    elif result.status == ExecutionStatus.SECURITY_VIOLATION:
        factors.append("Code contains security violations")
        factors.append("Review security policies and remove restricted operations")
    elif result.status == ExecutionStatus.RESOURCE_LIMIT_EXCEEDED:
        factors.append("Resource limits exceeded")
        factors.append("Optimize memory usage or reduce computational complexity")
    elif result.status == ExecutionStatus.FAILED:
        factors.append("Runtime error occurred")
        factors.append("Check error message for specific issue")

    return factors
