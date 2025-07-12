"""
Web search tool without any default parameter values for ADK compatibility
"""

import asyncio
import json
import logging

from google.adk.tools import FunctionTool

logger = logging.getLogger(__name__)


def web_search(query: str, max_results: int) -> str:
    """
    Search the web for current information.
    
    Args:
        query: The search query
        max_results: Maximum number of results to return
        
    Returns:
        Web search results as JSON string
    """
    try:
        # Import the async web search function
        from lib._tools.adk_tools import web_search as async_web_search

        # Run the async function synchronously
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're already in an async context
                future = asyncio.run_coroutine_threadsafe(
                    async_web_search(query, max_results), 
                    loop
                )
                return future.result()
            else:
                # No running loop, create one
                return loop.run_until_complete(async_web_search(query, max_results))
        except RuntimeError:
            # No event loop exists, create a new one
            return asyncio.run(async_web_search(query, max_results))
            
    except Exception as e:
        logger.error(f"Web search error: {e}")
        # Return a fallback result
        return json.dumps({
            "error": str(e),
            "query": query,
            "results": [],
            "fallback": True
        }, indent=2)


def create_web_search_tool_no_defaults() -> FunctionTool:
    """Create web search tool without default parameters for ADK compatibility."""
    
    # Create FunctionTool with the function that has NO default values
    tool = FunctionTool(func=web_search)
    
    # These might be used by ADK for documentation
    tool.name = "web_search"
    tool.description = "Search the web for current information (time, weather, news, etc.)"
    
    return tool