"""
WebSearchClient for VANA

This module provides web search functionality using Brave Search API.
It includes both a real implementation and a mock implementation for testing.
Migrated from Google Custom Search API to Brave Search for better performance.

Usage:
    from tools.web_search_client import get_web_search_client

    # Get real client
    client = get_web_search_client()
    results = client.search("VANA architecture")

    # Get mock client for testing
    mock_client = get_web_search_client(use_mock=True)
    mock_results = mock_client.search("VANA architecture")
"""

import logging
from typing import Any, Dict

from tools.brave_search_client import get_brave_search_client

logger = logging.getLogger(__name__)


class WebSearchClient:
    """Client for web search using Brave Search API (migrated from Google Custom Search)."""

    def __init__(self):
        """Initialize the web search client with Brave Search backend."""
        self.brave_client = get_brave_search_client()
        self.available = self.brave_client.is_available()

        if not self.available:
            logger.error("WebSearchClient: BRAVE_API_KEY is not configured. Web search will not be available.")
        else:
            logger.info("WebSearchClient initialized successfully with Brave Search.")

    def search(self, query: str, num_results: int = 5, **kwargs) -> Dict[str, Any]:
        """
        Search the web using Brave Search API.

        Args:
            query: The search query.
            num_results: Number of results to return (max 20 for Brave Search).
            **kwargs: Additional parameters to pass to the Brave Search API.

        Returns:
            A dictionary containing a list of 'items' (search results)
            or an 'error' message and 'details'.
        """
        if not self.available:
            logger.warning("WebSearchClient not available due to missing configuration. Returning empty result.")
            return {"error": "Web search client not available or not configured.", "items": []}

        try:
            # Use Brave Search client to get results
            brave_results = self.brave_client.search(query, num_results, **kwargs)

            # Convert Brave Search results to Google Custom Search format for compatibility
            items = []
            for result in brave_results:
                item = {
                    "title": result.get("title", ""),
                    "link": result.get("url", ""),
                    "snippet": result.get("snippet", ""),
                    "displayLink": result.get("source", ""),
                    "pagemap": {"metatags": [{"article:published_time": result.get("date", "")}]},
                }
                items.append(item)

            return {"items": items}

        except Exception as e:
            logger.error(f"Unexpected error during web search for '{query}': {e}", exc_info=True)
            return {"error": "An unexpected error occurred during web search.", "details": str(e), "items": []}


class MockWebSearchClient:
    """Mock client for web search used for testing (using Brave Search format)."""

    def __init__(self):
        """Initialize the mock web search client."""
        self.brave_client = get_brave_search_client(use_mock=True)
        self.available = True

    def search(self, query: str, num_results: int = 5, **kwargs) -> Dict[str, Any]:
        """Return mock search results in Google Custom Search format for compatibility."""
        try:
            # Get mock results from Brave Search client
            brave_results = self.brave_client.search(query, num_results)

            # Convert to Google Custom Search format for compatibility
            items = []
            for result in brave_results:
                item = {
                    "title": result.get("title", ""),
                    "link": result.get("url", ""),
                    "snippet": result.get("snippet", ""),
                    "displayLink": result.get("source", ""),
                    "pagemap": {"metatags": [{"article:published_time": result.get("date", "")}]},
                }
                items.append(item)

            return {"items": items}

        except Exception as e:
            logger.error(f"Error in mock web search: {e}")
            return {"error": "Mock search error", "items": []}


def get_web_search_client(use_mock: bool = False) -> Any:
    """
    Get a web search client instance.

    Args:
        use_mock: Whether to use the mock client (for testing) or real client.

    Returns:
        WebSearchClient or MockWebSearchClient instance.
    """
    if use_mock:
        return MockWebSearchClient()
    return WebSearchClient()
