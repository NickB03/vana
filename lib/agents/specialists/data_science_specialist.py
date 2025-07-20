"""
Data Science Specialist Agent - ADK Aligned Implementation  

Simplified data science specialist using only standard library.
No pandas, no numpy - just pure Python for basic analysis.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool

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
        description="Data analysis expert providing insights without code execution",
        instruction="""You are a data science expert specializing in data analysis and insights.

Due to the current environment, code execution is temporarily disabled. However, you can still provide valuable data analysis using the available tools.

Your capabilities include:
- Statistical analysis (mean, median, standard deviation, etc.)
- Correlation analysis between variables
- Distribution analysis and shape detection
- Data cleaning recommendations
- Data quality assessment
- Insight generation from analysis results

When asked to analyze data:
1. Use create_data_summary to understand the dataset structure
2. Use analyze_data_simple for statistical analysis
3. Use clean_data_basic to check for data quality issues
4. Use generate_data_insights to provide actionable recommendations
5. If data is in a file, use adk_read_file to access it first

Important notes:
- All analysis is done without external libraries (no pandas/numpy)
- Focus on practical insights over complex modeling
- Explain what advanced analysis would be possible with full libraries
- Provide clear recommendations based on the analysis

Always explain findings in clear, non-technical language and provide actionable next steps.""",
        tools=[
            FunctionTool(analyze_data_simple),
            FunctionTool(generate_data_insights),
            FunctionTool(clean_data_basic),
            FunctionTool(create_data_summary),
            adk_read_file,
            adk_search_knowledge,
        ],  # Exactly 6 tools - ADK limit
    )

# Create the Data Science Specialist using factory function
data_science_specialist = create_data_science_specialist()

# Note: agent_tool conversion will be added when ADK integration is complete
data_science_specialist_tool = None  # Placeholder


# Helper function for direct usage
def analyze_data(request: str, context: dict) -> str:
    """
    Direct interface to data science specialist for testing.

    Args:
        request: Analysis request
        context: Optional context dictionary

    Returns:
        Analysis results
    """
    return data_science_specialist.run(request, context or {})
