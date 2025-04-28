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


class WebSearchClient:
    """Client for web search using Google Custom Search API."""
    
    def __init__(self):
        """Initialize the web search client with API credentials."""
        self.api_key = os.environ.get("GOOGLE_SEARCH_API_KEY")
        self.search_engine_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
        
        if not self.api_key or not self.search_engine_id:
            raise ValueError("Missing Google Custom Search API credentials. "
                             "Please set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID "
                             "environment variables.")
    
    def search(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search the web using Google Custom Search API.
        
        Args:
            query: The search query.
            num_results: Number of results to return (max 10).
            
        Returns:
            List of search results.
        """
        if num_results > 10:
            num_results = 10  # API limit is 10 results per request
            
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query,
            "num": num_results
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()  # Raise exception for HTTP errors
            
            search_results = response.json()
            
            if "items" not in search_results:
                return []
                
            results = []
            for item in search_results["items"]:
                result = {
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "source": "web"
                }
                results.append(result)
                
            return results
            
        except requests.exceptions.RequestException as e:
            print(f"Error during web search: {e}")
            return []
        except Exception as e:
            print(f"Unexpected error during web search: {e}")
            return []


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
