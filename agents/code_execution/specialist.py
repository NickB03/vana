"""
Code Execution Specialist Agent

Provides secure code execution capabilities across multiple programming languages
using the VANA sandbox environment with comprehensive security and monitoring.
"""

import os
import sys
import asyncio
import json
import logging
from typing import Dict, Any, Optional, List
from dotenv import load_dotenv

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import sandbox components
from lib.sandbox.core.execution_engine import ExecutionEngine, ExecutionStatus
from lib.sandbox.core.security_manager import SecurityManager

logger = logging.getLogger(__name__)

# Initialize sandbox components globally
execution_engine = ExecutionEngine()
security_manager = SecurityManager()


def execute_code(language: str, code: str, timeout: int = 30, description: str = "") -> str:
    """
    Execute code in secure sandbox environment.

    Args:
        language: Programming language (python, javascript, shell)
        code: Code to execute
        timeout: Execution timeout in seconds
        description: Optional description of the code

    Returns:
        Formatted execution result as string
    """
    try:
        # Add description to metadata if provided
        metadata = {"description": description} if description else {}

        # Execute code using the sandbox engine (synchronous call for now)
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            result = loop.run_until_complete(
                execution_engine.execute_code(
                    language=language,
                    code=code,
                    timeout=timeout,
                    metadata=metadata
                )
            )
        finally:
            loop.close()

        # Format result for agent response
        if result.status == ExecutionStatus.COMPLETED:
            response = f"""✅ Code Execution Successful

**Language**: {result.language}
**Execution Time**: {round(result.execution_time, 3)}s
**Output**:
```
{result.output}
```"""
        else:
            error_analysis = _analyze_error(result.error or "Unknown error", language)
            response = f"""❌ Code Execution Failed

**Language**: {result.language}
**Status**: {result.status.value}
**Error**: {result.error}
**Analysis**: {error_analysis}
**Execution Time**: {round(result.execution_time, 3)}s"""

        return response

    except Exception as e:
        logger.error(f"Code execution failed: {str(e)}")
        return f"❌ Execution failed: {str(e)}"


def validate_code_security(language: str, code: str) -> str:
    """
    Validate code for security issues.

    Args:
        language: Programming language
        code: Code to validate

    Returns:
        Validation result as formatted string
    """
    try:
        # Use security manager to validate code
        security_manager.validate_code(code, language)

        return f"""✅ Security Validation Passed

**Language**: {language}
**Status**: Safe
**Message**: Code passed security validation"""

    except Exception as e:
        recommendations = _get_security_recommendations(str(e), language)
        rec_text = "\n".join([f"- {rec}" for rec in recommendations])

        return f"""⚠️ Security Validation Failed

**Language**: {language}
**Status**: Unsafe
**Error**: {str(e)}
**Recommendations**:
{rec_text}"""


def get_execution_history(limit: int = 10) -> str:
    """Get recent execution history."""
    try:
        history = execution_engine.get_execution_history(limit)

        if not history:
            return "📋 No execution history available"

        # Calculate summary statistics
        total_executions = len(history)
        successful_executions = sum(1 for r in history if r.status == ExecutionStatus.COMPLETED)
        success_rate = round(successful_executions / total_executions * 100, 1) if total_executions > 0 else 0

        # Format history
        history_text = []
        for result in history[-5:]:  # Show last 5 executions
            status_emoji = "✅" if result.status == ExecutionStatus.COMPLETED else "❌"
            history_text.append(f"{status_emoji} {result.language} - {round(result.execution_time, 3)}s")

        return f"""📋 Execution History

**Summary**:
- Total executions: {total_executions}
- Success rate: {success_rate}%
- Recent executions:
{chr(10).join(history_text)}"""

    except Exception as e:
        logger.error(f"Failed to get execution history: {str(e)}")
        return f"❌ Failed to retrieve execution history: {str(e)}"


def get_supported_languages() -> str:
    """Get supported programming languages and their capabilities."""
    try:
        languages = execution_engine.get_supported_languages()

        return f"""🔧 Supported Languages

**Available Languages**: {', '.join(languages)}

**Python 3.13**:
- Data science: numpy, pandas, matplotlib
- Web development: requests, flask
- Security: AST validation, import restrictions

**JavaScript (Node.js 20)**:
- Utilities: lodash, moment, axios
- Security: VM isolation, safe require system

**Shell (Bash)**:
- Text processing: grep, sed, awk
- File operations: ls, cat, find
- Security: command validation, path restrictions

**Sandbox Features**:
- Resource monitoring and limits
- Execution timeout protection
- Security validation
- Container isolation"""

    except Exception as e:
        logger.error(f"Failed to get supported languages: {str(e)}")
        return f"❌ Failed to retrieve language information: {str(e)}"


def _analyze_error(error: str, language: str) -> str:
    """Analyze error and provide helpful suggestions."""
    error_lower = error.lower()

    if "timeout" in error_lower:
        return "Code execution timed out. Consider optimizing the algorithm or increasing the timeout."
    elif "security violation" in error_lower:
        return f"Code contains security violations. Review {language} security policies and remove restricted operations."
    elif "resource limit exceeded" in error_lower:
        return "Code exceeded resource limits. Optimize memory usage or reduce computational complexity."
    elif "syntax" in error_lower:
        return f"Syntax error in {language} code. Check for missing brackets, quotes, or incorrect indentation."
    elif "import" in error_lower or "module" in error_lower:
        return f"Module import error. Ensure the required packages are available in the {language} sandbox environment."
    else:
        return "Review the error message and check the code logic. Consider adding error handling or debugging statements."


def _get_security_recommendations(error: str, language: str) -> List[str]:
    """Get security recommendations based on validation error."""
    recommendations = []

    if "import" in error.lower():
        recommendations.append(f"Remove restricted imports in {language} code")
        recommendations.append("Use only allowed standard library modules")

    if "file" in error.lower():
        recommendations.append("Avoid file system operations outside the workspace")
        recommendations.append("Use relative paths within the sandbox environment")

    if "network" in error.lower():
        recommendations.append("Remove network operations (HTTP requests, socket connections)")
        recommendations.append("Use provided tools for external data access")

    if "subprocess" in error.lower() or "exec" in error.lower():
        recommendations.append("Avoid subprocess execution and dynamic code evaluation")
        recommendations.append("Use language-specific alternatives for the desired functionality")

    if not recommendations:
        recommendations.append("Review the security policies for the specific language")
        recommendations.append("Ensure code follows sandbox security guidelines")

    return recommendations


# Create the Code Execution Specialist Agent
code_execution_specialist = LlmAgent(
    name="code_execution_specialist",
    model="gemini-2.0-flash",
    description="Specialist for secure code execution and debugging across multiple programming languages",
    instruction="""You are a Code Execution Specialist with expertise in secure code execution across multiple programming languages.

## Core Capabilities
- **Multi-language Execution**: Python, JavaScript, and Shell code execution in secure sandbox environments
- **Security Validation**: Comprehensive security checks before code execution
- **Error Analysis**: Detailed debugging assistance and error resolution guidance
- **Performance Monitoring**: Resource usage tracking and optimization recommendations
- **Package Management**: Information about available packages and dependencies

## Execution Environment
- **Sandbox Security**: All code runs in isolated containers with resource limits
- **Supported Languages**: Python 3.13, Node.js 20, Bash shell
- **Available Packages**: Data science (numpy, pandas), web (requests, axios), utilities (lodash, moment)
- **Security Features**: AST validation, import restrictions, command filtering

## Response Style
- Provide clear execution results with formatted output
- Include performance metrics (execution time, resource usage)
- Offer detailed error analysis with specific debugging suggestions
- Explain security restrictions and provide safe alternatives
- Give practical examples and best practices

Always prioritize security and provide comprehensive explanations of execution results.""",

    tools=[
        FunctionTool(func=execute_code),
        FunctionTool(func=validate_code_security),
        FunctionTool(func=get_execution_history),
        FunctionTool(func=get_supported_languages)
    ]
)
