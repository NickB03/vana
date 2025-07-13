"""
Lightweight Code Execution Specialist

Provides basic code execution capabilities without Docker dependencies,
using ADK-native tools and security patterns.
"""

import logging
from typing import Dict, Any
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import ADK-native tools
from lib._tools.adk_tools import (
    adk_simple_execute_code,
    adk_mathematical_solve,
    adk_create_file,
    adk_read_file,
    adk_analyze_content
)

logger = logging.getLogger(__name__)


def analyze_code_request(request: str) -> Dict[str, Any]:
    """Analyze a code execution request to determine the best approach."""
    request_lower = request.lower()
    
    # Determine request type
    if any(word in request_lower for word in ["calculate", "compute", "solve", "what is"]):
        # Mathematical calculation
        return {
            "type": "calculation",
            "tool": "mathematical_solve",
            "complexity": "simple"
        }
    elif "python" in request_lower or "code" in request_lower or "script" in request_lower:
        # Python code execution
        # Check for complexity indicators
        complex_indicators = ["import", "class", "async", "thread", "file", "network", "api"]
        is_complex = any(indicator in request_lower for indicator in complex_indicators)
        
        return {
            "type": "code_execution",
            "tool": "simple_execute_code",
            "complexity": "complex" if is_complex else "simple"
        }
    else:
        return {
            "type": "unknown",
            "tool": None,
            "complexity": "unknown"
        }


def suggest_alternatives(code: str, issues: list) -> str:
    """Suggest safe alternatives for blocked operations."""
    suggestions = []
    
    for issue in issues:
        if "import os" in issue:
            suggestions.append("- Instead of 'import os', use basic Python operations")
        elif "file" in issue.lower():
            suggestions.append("- For file operations, use the read_file and create_file tools separately")
        elif "network" in issue.lower():
            suggestions.append("- For web requests, use the web_search tool instead")
        elif "subprocess" in issue.lower():
            suggestions.append("- Subprocess operations are not supported for security")
    
    if not suggestions:
        suggestions.append("- Simplify your code to use only basic Python operations")
        suggestions.append("- Remove all imports except: math, random, datetime, json")
    
    return "\n".join(suggestions)


# Create tool for code analysis
code_analysis_tool = FunctionTool(func=analyze_code_request)
code_analysis_tool.name = "analyze_code_request"
code_analysis_tool.description = "Analyze code execution requests to determine the best approach"

# Create the lightweight code specialist
lightweight_code_specialist = LlmAgent(
    name="lightweight_code_specialist",
    model="gemini-2.5-flash",
    description="Specialist for basic code execution and calculations without Docker",
    output_key="code_results",
    instruction="""You are a Lightweight Code Execution Specialist providing safe, basic code execution capabilities.

## Your Capabilities

**✅ You CAN Execute:**
- Basic Python scripts (no dangerous imports)
- Mathematical calculations and expressions
- Data structure operations (lists, dicts, sets)
- String manipulation and processing
- Simple algorithms and logic
- JSON processing
- Basic datetime operations

**❌ You CANNOT Execute:**
- System operations (os, subprocess)
- File I/O (use separate file tools)
- Network requests (use web_search tool)
- Database operations
- Threading or async operations
- Installing packages
- Long-running operations (10s timeout)

## Workflow

1. **Analyze Request**: Use analyze_code_request to understand what's needed
2. **Choose Approach**:
   - For calculations → use mathematical_solve
   - For simple Python → use simple_execute_code
   - For complex needs → explain limitations
3. **Handle Results**: Format output clearly
4. **Suggest Alternatives**: If blocked, provide safe alternatives

## Security Rules

- ALWAYS validate code before execution
- REJECT any code with dangerous patterns
- EXPLAIN why certain operations are blocked
- SUGGEST safe alternatives when possible

## Response Format

For successful execution:
```
✅ Execution Successful
Output: [result]
Execution Time: [time]
```

For blocked operations:
```
⚠️ Operation Not Supported
Reason: [security concern]
Suggestions:
[safe alternatives]
```

## Examples

Good request: "Calculate the sum of squares from 1 to 10"
→ Use mathematical_solve or simple Python loop

Bad request: "Read all files in /etc/"
→ Explain this requires file system access, suggest using read_file tool for specific files

Remember: You provide BASIC execution for SAFE operations. Always prioritize security over functionality.""",
    tools=[
        adk_simple_execute_code,
        adk_mathematical_solve,
        code_analysis_tool,
        adk_create_file,  # For saving results
        adk_read_file,    # For reading inputs
        adk_analyze_content  # For understanding code structure
    ]
)

# Export for agent discovery
agent = lightweight_code_specialist