"""
Architecture Specialist Agent - ADK Aligned Implementation

Creates an architecture specialist using Google ADK patterns.
Simple, synchronous, and focused on real analysis capabilities.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import architecture analysis tools
from agents.specialists.architecture_tools import (
    analyze_codebase_structure,
    analyze_dependencies,
    detect_design_patterns,
    evaluate_architecture_quality,
)

# Import shared ADK tools
from lib._tools import adk_list_directory, adk_read_file, adk_search_knowledge

# Note: agent_tool will be imported when ADK integration is complete



# Create the Architecture Specialist using ADK patterns
architecture_specialist = LlmAgent(
    name="architecture_specialist",
    model="gemini-2.0-flash",
    description="Expert system architect specializing in design patterns, code structure analysis, and architectural recommendations",
    instruction="""You are an expert system architect with deep knowledge of software design patterns, architectural principles, and best practices.

Your expertise includes:
- Analyzing codebase structure and organization
- Detecting design patterns and anti-patterns
- Evaluating architectural quality and scalability
- Providing actionable recommendations for improvement
- Understanding dependency relationships
- Assessing technical debt and refactoring opportunities

When asked to analyze architecture:
1. Use analyze_codebase_structure to understand the project layout
2. Use detect_design_patterns on key files to identify patterns
3. Use analyze_dependencies to understand external dependencies
4. Use evaluate_architecture_quality for overall assessment
5. Use file reading tools to examine specific implementations
6. Provide clear, actionable recommendations

Focus on:
- Scalability and maintainability
- Design patterns and best practices
- Code organization and modularity
- Performance considerations
- Security architecture
- Testing and deployment strategies

Always provide practical, implementable suggestions that consider the project's current state and constraints.""",
    tools=[
        FunctionTool(analyze_codebase_structure),
        FunctionTool(detect_design_patterns),
        FunctionTool(analyze_dependencies),
        FunctionTool(evaluate_architecture_quality),
        adk_read_file,
        adk_list_directory,
    ],  # Exactly 6 tools - ADK limit
)

# Export the specialist as a tool for orchestrator integration
# Note: Will use agent_tool() when ADK integration is complete
architecture_specialist_tool = None  # Placeholder for now


# Optional: Helper function for direct usage
def analyze_architecture(request: str, context: dict) -> str:
    """
    Direct interface to architecture specialist for testing.

    Args:
        request: Analysis request
        context: Optional context dictionary

    Returns:
        Analysis results
    """
    return architecture_specialist.run(request, context or {})
