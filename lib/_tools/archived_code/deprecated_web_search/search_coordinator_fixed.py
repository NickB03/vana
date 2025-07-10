"""
Fixed Search Coordinator - Removes default values that cause issues with Google AI
"""

from google.adk.tools import FunctionTool
from lib._tools.search_coordinator import create_coordinated_search_tool


def create_fixed_coordinated_search_tool() -> FunctionTool:
    """Create a fixed version of coordinated search without default values."""
    
    # Get the original tool
    original_tool = create_coordinated_search_tool()
    
    # Create a wrapper that handles the default value
    def fixed_coordinated_search(query: str, max_results: int) -> str:
        """
        🔍 Intelligent search with memory-first priority.
        
        Args:
            query: The search query
            max_results: Maximum number of results to return (use 5 if unsure)
        
        Returns:
            Search results as a formatted string
        """
        # Call the original function
        return original_tool.func(query, max_results)
    
    # Create new tool without default values
    tool = FunctionTool(func=fixed_coordinated_search)
    tool.name = "coordinated_search"
    tool.description = "🔍 Intelligent search with memory-first priority: checks memory → vector → web in order. Use for any information queries. Always provide both query and max_results (use 5 for max_results if unsure)."
    
    # Update parameters to remove default values
    tool.parameters = {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The search query - can be about VANA system, user preferences, technical topics, or current information"
            },
            "max_results": {
                "type": "integer", 
                "description": "Maximum number of results to return (recommend 5)"
            }
        },
        "required": ["query", "max_results"]  # Both are required now
    }
    
    return tool


# Also create fixed versions of other tools with defaults
def create_fixed_web_search_tool() -> FunctionTool:
    """Create a fixed version of web_search without default values."""
    from lib._tools.adk_tools import adk_web_search
    
    # Create wrapper
    def fixed_web_search(query: str, max_results: int) -> str:
        """
        🌐 Search the web for current information.
        
        Args:
            query: The search query
            max_results: Maximum number of results (use 5 if unsure)
            
        Returns:
            Web search results
        """
        # Call original with defaults
        return adk_web_search.func(query, max_results)
    
    tool = FunctionTool(func=fixed_web_search)
    tool.name = "web_search"
    tool.description = "🌐 Search the web for current information. Always provide both query and max_results (use 5 for max_results if unsure)."
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