"""
Research Specialist Agent - ADK Compliant Implementation

Expert in conducting comprehensive research using Google Search grounding.
Uses built-in google_search tool for real search capabilities.
"""

from google.adk.agents import LlmAgent
from google.adk.tools import google_search

def create_research_specialist() -> LlmAgent:
    """
    Factory function to create a fresh Research Specialist instance.
    
    This prevents 'already has a parent' errors in ADK multi-agent systems
    by creating new instances instead of reusing module-level singletons.
    
    Returns:
        LlmAgent: Fresh research specialist instance
    """
    return LlmAgent(
        name="research_specialist",
        model="gemini-2.5-flash",
        description="Research specialist for in-depth information gathering",
        instruction="""You are a research specialist. Use google_search to find comprehensive information.

When researching:
1. ALWAYS use google_search for current information
2. Gather from multiple credible sources
3. Cite your sources
4. Provide balanced, factual summaries

Focus on accuracy and comprehensiveness.""",
        tools=[google_search]  # Built-in google_search only for now
    )

# Research tools will be added when available
research_tools = []

# Create the Research Specialist using factory function
research_specialist = create_research_specialist()

# Helper function for testing
def conduct_research(request: str, context: dict = None) -> str:
    """Direct interface to research specialist for testing."""
    return research_specialist.run(request, context or {})