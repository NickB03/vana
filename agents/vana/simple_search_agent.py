"""
Simple Search Agent - Handles basic queries
Uses only google_search tool for simple factual questions
"""

from google.adk.agents import LlmAgent
from google.adk.tools import google_search

def create_simple_search_agent() -> LlmAgent:
    """
    Create a simple search agent for basic queries.
    This agent ONLY uses google_search, no other tools.
    """
    
    return LlmAgent(
        name="simple_search_agent",
        model="gemini-2.0-flash",
        description="Simple search agent for basic factual queries",
        instruction="""You are a simple search assistant.

Your job is to:
1. Use google_search to find current information
2. Provide direct, concise answers
3. Include relevant details from search results
4. Cite sources when appropriate

You handle:
- Time and date queries
- Weather information
- Basic facts and definitions
- Current events and news
- Simple conversions
- General knowledge questions

Keep responses brief and factual.""",
        tools=[google_search]  # ONLY google_search tool
    )

# Create instance
simple_search_agent = create_simple_search_agent()

# Export
__all__ = ["simple_search_agent"]