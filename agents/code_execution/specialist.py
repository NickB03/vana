"""
Code Execution Specialist Agent

Provides secure code execution capabilities across multiple programming languages
using enhanced executor architecture with comprehensive security and monitoring.
"""

from lib.sandbox.executors import JavaScriptExecutor, PythonExecutor, ShellExecutor
from lib.sandbox.core.security_manager import SecurityManager
from google.adk.tools import FunctionTool
from google.adk.agents import LlmAgent
import logging
import os
import sys
from typing import List

from dotenv import load_dotenv

# Add project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables
load_dotenv()

# Google ADK imports


# Import executor components

logger = logging.getLogger(__name__)

# Initialize security manager and executors globally
_security_manager = SecurityManager()
_executors = {
    "python": PythonExecutor(_security_manager),
    "javascript": JavaScriptExecutor(_security_manager),
    "shell": ShellExecutor(_security_manager),
}


async def execute_code(code: str, language: str, timeout: int = 30) -> str:
    """Execute code with security validation and resource monitoring."""
    try:
        executor = _executors.get(language)
        if not executor:
            return f"❌ Unsupported language: {language}"

        result = await executor.execute(code, timeout=timeout)

        if result.success:
            return f"""✅ Code Execution Successful

**Language**: {result.language}
**Execution Time**: {round(result.execution_time, 3)}s
**Memory Usage**: {result.memory_usage} bytes
**Output**:
```
{result.output}
```"""
        else:
            return f"""❌ Code Execution Failed

**Language**: {result.language}
**Status**: {result.status.value}
**Error**: {result.error}
**Execution Time**: {round(result.execution_time, 3)}s"""

    except Exception as e:
        return f"❌ Execution failed: {str(e)}"


async def validate_code_security(code: str, language: str) -> str:
    """Analyze code security and return detailed assessment."""
    try:
        executor = _executors.get(language)
        if not executor:
            return f"❌ Unsupported language: {language}"

        # Try to validate the code
        try:
            executor.validate_code(code)
            return f"""✅ Security Validation Passed

**Language**: {language}
**Status**: Safe
**Risk Level**: Low
**Message**: Code passed security validation"""
        except Exception as security_error:
            recommendations = _get_security_recommendations(
                str(security_error), language
            )
            rec_text = "\n".join([f"- {rec}" for rec in recommendations])

            return f"""⚠️ Security Validation Failed

**Language**: {language}
**Status**: Unsafe
**Risk Level**: High
**Error**: {str(security_error)}
**Recommendations**:
{rec_text}"""

    except Exception as e:
        return f"❌ Security validation failed: {str(e)}"


def _get_security_recommendations(error: str, language: str) -> List[str]:
    """Get security recommendations based on validation error."""
    recommendations = []
    error_lower = error.lower()

    if "import" in error_lower:
        recommendations.append(f"Remove restricted imports in {language} code")
        recommendations.append("Use only allowed standard library modules")

    if "file" in error_lower:
        recommendations.append("Avoid file system operations outside the workspace")
        recommendations.append("Use relative paths within the sandbox environment")

    if "network" in error_lower:
        recommendations.append(
            "Remove network operations (HTTP requests, socket connections)"
        )
        recommendations.append("Use provided tools for external data access")

    if "subprocess" in error_lower or "exec" in error_lower:
        recommendations.append("Avoid subprocess execution and dynamic code evaluation")
        recommendations.append(
            "Use language-specific alternatives for the desired functionality"
        )

    if not recommendations:
        recommendations.append("Review the security policies for the specific language")
        recommendations.append("Ensure code follows sandbox security guidelines")

    return recommendations


# In-memory execution history for demo
_execution_history = []


async def get_execution_history(limit: int = 10) -> str:
    """Get recent execution history with performance metrics."""
    try:
        # For demo purposes, return mock history
        # In production, this would query a real execution history database
        if not _execution_history:
            return """📋 Execution History

**Summary**:
- Total executions: 0
- Success rate: 0%
- Message: No execution history available"""

        # Get limited history
        recent_history = _execution_history[-limit:]

        # Calculate summary statistics
        total_executions = len(_execution_history)
        successful_executions = sum(
            1 for r in _execution_history if r.get("success", False)
        )
        success_rate = (
            round(successful_executions / total_executions * 100, 1)
            if total_executions > 0
            else 0
        )

        # Format recent executions
        history_text = []
        for result in recent_history[-5:]:  # Show last 5 executions
            status_emoji = "✅" if result.get("success", False) else "❌"
            lang = result.get("language", "unknown")
            exec_time = result.get("execution_time", 0)
            history_text.append(f"{status_emoji} {lang} - {round(exec_time, 3)}s")

        return f"""📋 Execution History

**Summary**:
- Total executions: {total_executions}
- Success rate: {success_rate}%
- Recent executions:
{chr(10).join(history_text)}"""

    except Exception as e:
        return f"❌ Failed to retrieve execution history: {str(e)}"


async def get_supported_languages() -> str:
    """Get comprehensive information about supported languages."""
    try:
        languages = list(_executors.keys())

        # Get detailed info for each language
        language_details = []
        for lang_name, executor in _executors.items():
            lang_info = executor.get_language_info()
            details = f"""**{lang_info["name"].title()}**:
- Version: {lang_info["version"]}
- Features: {", ".join(lang_info["features"])}
- Restrictions: {", ".join(lang_info["restrictions"])}"""
            language_details.append(details)

        return f"""🔧 Supported Languages

**Available Languages**: {", ".join(languages)}

{chr(10).join(language_details)}

**Sandbox Features**:
- Resource monitoring and limits
- Execution timeout protection
- Security validation
- Isolated execution environment"""

    except Exception as e:
        return f"❌ Failed to retrieve language information: {str(e)}"


# Create the Code Execution Specialist Agent
code_execution_specialist = LlmAgent(
    name="code_execution_specialist",
    model="gemini-2.0-flash",
    description="Specialist for secure code execution and debugging across multiple programming languages",
    output_key="code_execution_results",
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
        FunctionTool(func=get_supported_languages),
    ],
)

# Export for ADK discovery
root_agent = code_execution_specialist


# Legacy functions for backward compatibility (if needed)
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
