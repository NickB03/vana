"""
Data Science Specialist Agent - ADK Aligned Implementation  

Simplified data science specialist using only standard library.
No pandas, no numpy - just pure Python for basic analysis.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool, load_memory

# Import our simplified data science tools
from lib.agents.specialists.data_science_tools import (
    analyze_data_simple,
    clean_data_basic,
    create_data_summary,
    generate_data_insights,
)

# Import shared ADK tools
from lib._tools import adk_read_file, adk_search_knowledge

def create_data_science_specialist() -> LlmAgent:
    """
    Factory function to create a fresh Data Science Specialist instance.
    
    This prevents 'already has a parent' errors in ADK multi-agent systems
    by creating new instances instead of reusing module-level singletons.
    
    Returns:
        LlmAgent: Fresh data science specialist instance
    """
    return LlmAgent(
        name="data_science_specialist",
        model="gemini-2.5-flash",
        description="Data science expert for analysis and insights",
        instruction="""You are a data science specialist for analysis and insights.

USER CONTEXT:
- Name: {user:name?}
- Role: {user:role?}
- Data interests: {user:data_interests?}
- Industry: {user:industry?}
- Analytics experience: {user:analytics_experience?}
- Preferred tools: {user:preferred_tools?}

Use your tools to:
1. For VANA data patterns: Use load_memory to query VANA's data science documentation
2. Analyze data structure and statistics
3. Identify patterns and correlations
4. Check data quality
5. Generate actionable insights

TOOL SELECTION:
- load_memory: VANA data patterns, analytics frameworks, ML best practices
- analyze_* tools: Current data analysis
- adk_read_file: Direct file inspection

Adjust technical depth based on the user's analytics experience. Provide clear, practical recommendations relevant to their industry.""",
        tools=[
            FunctionTool(analyze_data_simple),
            FunctionTool(generate_data_insights),
            FunctionTool(clean_data_basic),
            FunctionTool(create_data_summary),
            adk_read_file,
            adk_search_knowledge,
            load_memory,  # VANA corpus access
        ],  # Data analysis + VANA knowledge
    )

# Note: agent_tool conversion will be added when ADK integration is complete
data_science_specialist_tool = None  # Placeholder


# Helper function for direct usage
def analyze_data(request: str, context: dict = None) -> str:
    """
    Direct interface to data science specialist for testing.
    Creates a fresh instance for each call.

    Args:
        request: Analysis request
        context: Optional context dictionary

    Returns:
        Analysis results
    """
    specialist = create_data_science_specialist()
    return specialist.run(request, context or {})
