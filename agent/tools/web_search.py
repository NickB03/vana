"""
Web Search Tool for VANA Agent

This module provides a wrapper around the Web Search client for the VANA agent.
It includes methods for searching the web with appropriate error handling and
result formatting.
"""

import logging
from typing import Dict, Any, Optional, List, Union

# Import the Web Search client
import sys
import os

# Add the project root to the path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Import the web search client - no fallback to mock in production
try:
    from tools.web_search_client import get_web_search_client
except ImportError as e:
    # No fallback mock implementation in production
    raise ImportError(f"Web search client not available: {e}. Ensure web search is properly configured.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebSearchTool:
    """
    Web Search tool for the VANA agent.

    This tool provides a wrapper around the Web Search client with
    appropriate error handling and result formatting for agent use.
    """

    def __init__(self, use_mock: bool = False):
        """
        Initialize the Web Search tool.

        Args:
            use_mock: Whether to use the mock implementation
        """
        self.client = get_web_search_client(use_mock=use_mock)
        self.use_mock = use_mock
        logger.info(f"Initialized WebSearchTool with use_mock={use_mock}")

    def search(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """
        Search the web using Google Custom Search API.

        Args:
            query: The search query
            num_results: Number of results to return (max 10)

        Returns:
            Dictionary with 'success', 'results', and optional 'error' keys
        """
        try:
            # Validate input
            if not query or not isinstance(query, str):
                return {
                    "success": False,
                    "error": "Invalid query: must be a non-empty string"
                }

            if not isinstance(num_results, int) or num_results < 1:
                return {
                    "success": False,
                    "error": "Invalid num_results: must be a positive integer"
                }

            # Perform search
            response = self.client.search(query, num_results)

            # Check for error in response
            if "error" in response:
                logger.error(f"Error searching web: {response['error']}")
                return {
                    "success": False,
                    "error": response["error"],
                    "details": response.get("details", "")
                }

            # Extract and format results
            formatted_results = []

            # Handle different response formats (mock vs. real)
            if "items" in response:
                # Real Google CSE API response
                for item in response.get("items", []):
                    formatted_result = {
                        "title": item.get("title", ""),
                        "link": item.get("link", ""),
                        "snippet": item.get("snippet", ""),
                        "source": "web"
                    }
                    formatted_results.append(formatted_result)
            elif isinstance(response, list):
                # Mock client response
                formatted_results = response

            logger.info(f"Successfully searched web for '{query}' with {len(formatted_results)} results")
            return {
                "success": True,
                "results": formatted_results
            }
        except Exception as e:
            logger.error(f"Error searching web: {str(e)}")
            return {
                "success": False,
                "error": f"Error searching web: {str(e)}"
            }

    def get_metadata(self) -> Dict[str, Any]:
        """
        Get metadata about the tool.

        Returns:
            Tool metadata
        """
        return {
            "name": "web_search",
            "description": "Tool for searching the web using Google Custom Search API",
            "operations": [
                {
                    "name": "search",
                    "description": "Search the web using Google Custom Search API",
                    "parameters": [
                        {
                            "name": "query",
                            "type": "string",
                            "description": "The search query",
                            "required": True
                        },
                        {
                            "name": "num_results",
                            "type": "integer",
                            "description": "Number of results to return (max 10)",
                            "required": False,
                            "default": 5
                        }
                    ]
                }
            ]
        }


# Function wrapper for the tool
def search(query: str, num_results: int = 5) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Search the web using Google Custom Search API.

    Args:
        query: The search query
        num_results: Number of results to return (max 10)

    Returns:
        List of search results if successful, error dictionary otherwise
    """
    tool = WebSearchTool()
    result = tool.search(query, num_results)

    if result["success"]:
        return result["results"]
    return result


