"""
Fixed web search tool without default values
"""

from google.adk.tools import FunctionTool
from lib._tools.adk_tools import adk_web_search


def create_fixed_web_search_tool() -> FunctionTool:
    """Create a fixed version of web_search without default values."""
    
    # Create wrapper that requires all parameters
    def fixed_web_search(query: str, max_results: int) -> str:
        """
        🌐 Search the web for current information.
        
        Args:
            query: The search query
            max_results: Maximum number of results (use 5 if unsure)
            
        Returns:
            Web search results as JSON string
        """
        # Call original with explicit parameters
        return adk_web_search.func(query, max_results)
    
    tool = FunctionTool(func=fixed_web_search)
    tool.name = "web_search"
    tool.description = "🌐 Search the web for current information (time, weather, news, etc.). Always provide both query and max_results parameters."
    tool.parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query"
            },
            "max_results": {
                "type": "integer",
                "description": "Maximum number of results (recommend 5)"
            }
        },
        "required": ["query", "max_results"]
    }
    
    return tool