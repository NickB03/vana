"""
WebSearchClient for VANA

This module provides web search functionality using Google Custom Search API.
It includes both a real implementation and a mock implementation for testing.

Usage:
    from tools.web_search_client import get_web_search_client

    # Get real client
    client = get_web_search_client()
    results = client.search("VANA architecture")

    # Get mock client for testing
    mock_client = get_web_search_client(use_mock=True)
    mock_results = mock_client.search("VANA architecture")
"""

import os
import requests
import time
from typing import List, Dict, Any, Optional
from config.environment import EnvironmentConfig # Import VANA's EnvironmentConfig
# Assuming a logger is available, e.g., from tools.logging.logger import get_logger
# logger = get_logger(__name__) 
# For simplicity if logger isn't set up project-wide yet, use print or basic logging
import logging # Basic logging for now
logger = logging.getLogger(__name__)


class WebSearchClient:
    """Client for web search using Google Custom Search API."""
    BASE_URL = "https://www.googleapis.com/customsearch/v1"

    def __init__(self):
        """Initialize the web search client with API credentials from environment configuration."""
        web_search_config = EnvironmentConfig.get_web_search_config()
        self.api_key = web_search_config.get("api_key")
        self.search_engine_id = web_search_config.get("search_engine_id")

        if not self.api_key or not self.search_engine_id:
            logger.error("WebSearchClient: GOOGLE_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID is not configured. Web search will not be available.")
            self.available = False
        else:
            self.available = True
            logger.info(f"WebSearchClient initialized. Using Search Engine ID: {self.search_engine_id}")
            # Avoid printing API key directly, even parts of it, in production logs.
            # For debugging, one might log: logger.debug(f"API Key loaded (first 5 chars): {self.api_key[:5] if self.api_key else 'None'}")


    def search(self, query: str, num_results: int = 5, **kwargs) -> Dict[str, Any]:
        """
        Search the web using Google Custom Search API.

        Args:
            query: The search query.
            num_results: Number of results to return (max 10).
            **kwargs: Additional parameters to pass to the Google CSE API.

        Returns:
            A dictionary containing a list of 'items' (search results) 
            or an 'error' message and 'details'.
        """
        if not self.available:
            logger.warning("WebSearchClient not available due to missing configuration. Returning empty result.")
            return {"error": "Web search client not available or not configured.", "items": []}

        if num_results > 10:
            logger.debug(f"Requested {num_results} results, but API limit is 10. Setting to 10.")
            num_results = 10
        
        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query,
            "num": num_results
        }
        params.update(kwargs)
        # The following block was a duplicate and is removed.
        # params = {
        #     "key": self.api_key,
        #     "cx": self.search_engine_id,
        #     "q": query,
        #     "num": num_results
        # }

        try:
            response = requests.get(self.BASE_URL, params=params)
            response.raise_for_status()  # Raise exception for HTTP errors (4xx or 5xx)

            # Return the raw JSON response, consumer (e.g. EnhancedHybridSearch) will format it.
            return response.json() 

        except requests.exceptions.HTTPError as http_err:
            logger.error(f"HTTP error during web search for '{query}': {http_err.response.status_code} - {http_err.response.text}", exc_info=True)
            return {"error": f"HTTP error: {http_err.response.status_code}", "details": http_err.response.text, "items": []}
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Request exception during web search for '{query}': {req_err}", exc_info=True)
            return {"error": "Request failed during web search.", "details": str(req_err), "items": []}
        except Exception as e:
            logger.error(f"Unexpected error during web search for '{query}': {e}", exc_info=True)
            return {"error": "An unexpected error occurred during web search.", "details": str(e), "items": []}


class MockWebSearchClient:
    """Mock client for web search used for testing."""

    def __init__(self):
        """Initialize the mock web search client."""
        self.mock_results = {
            "vana architecture": [
                {
                    "title": "VANA Architecture Overview",
                    "link": "https://example.com/vana-architecture",
                    "snippet": "VANA uses a modular architecture with Vector Search, Knowledge Graph, and web integration.",
                    "source": "web"
                },
                {
                    "title": "Building Multi-Agent Systems with VANA",
                    "link": "https://example.com/multi-agent-vana",
                    "snippet": "Learn how VANA implements a hierarchical agent structure with specialized AI agents led by a coordinator.",
                    "source": "web"
                }
            ],
            "hybrid search": [
                {
                    "title": "Enhanced Hybrid Search in VANA",
                    "link": "https://example.com/hybrid-search",
                    "snippet": "VANA's hybrid search combines Vector Search, Knowledge Graph, and Web Search for comprehensive results.",
                    "source": "web"
                },
                {
                    "title": "Improving Search Quality with Hybrid Approaches",
                    "link": "https://example.com/search-quality",
                    "snippet": "Hybrid search approaches improve result quality by combining multiple search methods.",
                    "source": "web"
                }
            ],
            "vertex ai": [
                {
                    "title": "Vertex AI Vector Search Integration",
                    "link": "https://example.com/vertex-ai-integration",
                    "snippet": "Learn how to integrate Vertex AI Vector Search with your applications for semantic search.",
                    "source": "web"
                },
                {
                    "title": "Transitioning from Ragie.ai to Vertex AI",
                    "link": "https://example.com/vertex-transition",
                    "snippet": "Step-by-step guide to migrating from Ragie.ai to Vertex AI Vector Search.",
                    "source": "web"
                }
            ],
            "default": [
                {
                    "title": "Generic Search Result",
                    "link": "https://example.com/generic",
                    "snippet": "This is a generic search result for testing purposes.",
                    "source": "web"
                }
            ]
        }

    def search(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """Return mock search results based on the query."""
        # Simple keyword matching for mock results
        for key, results in self.mock_results.items():
            if key.lower() in query.lower():
                return results[:num_results]

        # Return default results if no match
        return self.mock_results["default"][:num_results]


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
