"""
Architecture Specialist Agent - ADK Aligned Implementation

Creates an architecture specialist using Google ADK patterns.
Simple, synchronous, and focused on real analysis capabilities.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool, load_memory

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

USER CONTEXT:
- Name: {user:name?}
- Role: {user:role?}
- Tech stack: {user:tech_stack?}
- Architecture interests: {user:architecture_interests?}
- Project context: {user:project_context?}
- Experience level: {user:experience_level?}

Use your tools to:
1. For VANA-specific patterns: Use load_memory to query VANA's architecture documentation
2. Analyze code structure and patterns
3. Evaluate architecture quality
4. Check dependencies
5. Provide design recommendations

TOOL SELECTION:
- load_memory: VANA architecture patterns, design decisions, best practices
- analyze_* tools: Current codebase analysis
- adk_read_file/adk_list_directory: Direct file inspection

Tailor your advice to the user's role and experience level. Focus on practical, actionable recommendations.""",
        tools=[
            FunctionTool(analyze_codebase_structure),
            FunctionTool(detect_design_patterns),
            FunctionTool(analyze_dependencies),
            FunctionTool(evaluate_architecture_quality),
            adk_read_file,
            adk_list_directory,
            load_memory,  # VANA corpus access
        ],  # Architecture analysis + VANA knowledge
    )

# Export the specialist as a tool for orchestrator integration
# Note: Will use agent_tool() when ADK integration is complete
architecture_specialist_tool = None  # Placeholder for now


# Optional: Helper function for direct usage
def analyze_architecture(request: str, context: dict = None) -> str:
    """
    Direct interface to architecture specialist for testing.
    Creates a fresh instance for each call.

    Args:
        request: Analysis request
        context: Optional context dictionary

    Returns:
        Analysis results
    """
    specialist = create_architecture_specialist()
    return specialist.run(request, context or {})
