"""
Architecture Specialist Agent - ADK Aligned Implementation

Creates an architecture specialist using Google ADK patterns.
Simple, synchronous, and focused on real analysis capabilities.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

# Import architecture analysis tools
from lib.agents.specialists.architecture_tools import (
    analyze_codebase_structure,
    analyze_dependencies,
    detect_design_patterns,
    evaluate_architecture_quality,
)

# Import shared ADK tools
from lib._tools import adk_list_directory, adk_read_file, adk_search_knowledge

# Note: agent_tool will be imported when ADK integration is complete



def create_architecture_specialist() -> LlmAgent:
    """
    Factory function to create a fresh Architecture Specialist instance.
    
    This prevents 'already has a parent' errors in ADK multi-agent systems
    by creating new instances instead of reusing module-level singletons.
    
    Returns:
        LlmAgent: Fresh architecture specialist instance
    """
    return LlmAgent(
        name="architecture_specialist",
        model="gemini-2.5-flash",
        description="Architecture expert for system design and code patterns",
        instruction="""You are an architecture specialist focused on system design and code quality.

Use your tools to:
1. Analyze code structure and patterns
2. Evaluate architecture quality
3. Check dependencies
4. Provide design recommendations

Focus on practical, actionable advice for better architecture.""",
        tools=[
            FunctionTool(analyze_codebase_structure),
            FunctionTool(detect_design_patterns),
            FunctionTool(analyze_dependencies),
            FunctionTool(evaluate_architecture_quality),
            adk_read_file,
            adk_list_directory,
        ],  # Exactly 6 tools - ADK limit
    )

# Create the default Architecture Specialist instance (backward compatibility)
architecture_specialist = create_architecture_specialist()

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
