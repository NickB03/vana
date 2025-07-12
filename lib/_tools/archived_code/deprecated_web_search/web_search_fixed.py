"""
Fixed web search tool that properly handles ADK function naming
"""

from google.adk.tools import FunctionTool

from lib._tools.adk_tools import sync_web_search


def create_web_search_tool() -> FunctionTool:
    """Create a properly named web_search tool for ADK."""
    
    # CRITICAL: Function name MUST match what the agent expects
    # ADK uses the actual function name, not the tool.name property
    def web_search(query: str, max_results: int) -> str:
        """
        Search the web for current information.
        
        Args:
            query: The search query
            max_results: Maximum number of results to return
            
        Returns:
            Web search results as JSON string
        """
        # Call the sync wrapper from adk_tools
        return sync_web_search(query, max_results)
    
    # Create FunctionTool with the properly named function
    tool = FunctionTool(func=web_search)
    
    # Note: These properties might be ignored by ADK in favor of function introspection
    tool.name = "web_search"
    tool.description = "Search the web for current information (time, weather, news, etc.)"
    
    return tool