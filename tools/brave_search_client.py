"""
Brave Search Client for VANA

This module provides web search functionality using Brave Search API.
It replaces the Google Custom Search API with Brave Search for better performance and cost efficiency.

Usage:
    from tools.brave_search_client import BraveSearchClient

    client = BraveSearchClient()
    results = client.search("VANA architecture")
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
import requests
from dotenv import load_dotenv

# Load environment variables from multiple possible locations
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

load_dotenv()  # Load from current directory
load_dotenv(os.path.join(project_root, "vana_multi_agent", ".env"))  # Load from vana_multi_agent directory
load_dotenv(os.path.join(project_root, ".env"))  # Load from project root

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BraveSearchClient:
    """Client for performing web searches using Brave Search API"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the Brave Search client"""
        self.api_key = api_key or os.getenv("BRAVE_API_KEY")
        self.base_url = "https://api.search.brave.com/res/v1/web/search"

        if self.api_key:
            # Log the API key being used (first 5 and last 5 characters for security)
            logger.info(f"Using Brave API key: {self.api_key[:5]}...{self.api_key[-5:]}")
        else:
            logger.warning("No Brave API key found. Web search will not be available.")

    def is_available(self) -> bool:
        """Check if Brave Search is available"""
        return self.api_key is not None

    def search(self, query: str, num_results: int = 5, **kwargs) -> List[Dict[str, Any]]:
        """
        Perform a web search using Brave Search API

        Args:
            query: Search query
            num_results: Number of results to return (max 20)
            **kwargs: Additional parameters for Brave Search API

        Returns:
            List of search results with title, snippet, and URL
        """
        if not self.is_available():
            logger.error("Brave Search not available - missing API key")
            return []

        # Ensure num_results is within limits (Brave Search allows up to 20)
        if num_results > 20:
            num_results = 20
            logger.warning("Requested result count exceeded maximum (20), limiting to 20 results")

        try:
            # Construct request headers
            headers = {
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": self.api_key
            }

            # Construct request parameters
            params = {
                "q": query,
                "count": num_results,
                "offset": 0,
                "mkt": "en-US",  # Market - US English
                "safesearch": "moderate",  # Safe search level
                "freshness": "pw",  # Past week for fresher results
                "text_decorations": False,  # No text decorations
                "spellcheck": True  # Enable spell checking
            }

            # Add any additional parameters
            params.update(kwargs)

            # Make request
            response = requests.get(self.base_url, headers=headers, params=params)
            response.raise_for_status()

            # Parse results
            data = response.json()

            if "web" not in data or "results" not in data["web"]:
                logger.warning(f"No search results found for query: {query}")
                return []

            # Format results to match expected format
            results = []
            for item in data["web"]["results"]:
                result = {
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("description", ""),
                    "source": item.get("profile", {}).get("name", ""),
                    "date": item.get("age", ""),
                    "language": item.get("language", "en")
                }
                results.append(result)

            logger.info(f"Brave Search returned {len(results)} results for query: {query}")
            return results

        except requests.RequestException as e:
            logger.error(f"Error performing Brave Search: {str(e)}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing Brave Search response: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in Brave Search: {str(e)}")
            return []

    def format_results(self, results: List[Dict[str, Any]]) -> str:
        """
        Format search results for display

        Args:
            results: List of search results

        Returns:
            Formatted string representation of results
        """
        if not results:
            return "No search results found."

        formatted = "🔍 Brave Search Results:\n\n"

        for i, result in enumerate(results, 1):
            title = result.get("title", "No title")
            url = result.get("url", "")
            snippet = result.get("snippet", "No description available")
            source = result.get("source", "")

            formatted += f"{i}. **{title}**\n"
            if source:
                formatted += f"   Source: {source}\n"
            formatted += f"   URL: {url}\n"
            formatted += f"   {snippet}\n\n"

        return formatted


class MockBraveSearchClient:
    """Mock Brave Search client for testing purposes"""

    def __init__(self):
        """Initialize the mock client with sample data"""
        self.mock_results = {
            "vana": [
                {
                    "title": "VANA - AI Agent Development Platform",
                    "url": "https://github.com/vana-ai/vana",
                    "snippet": "VANA is an advanced AI agent development platform that enables the creation of intelligent, multi-agent systems with enhanced capabilities.",
                    "source": "GitHub",
                    "date": "2024-01-15"
                },
                {
                    "title": "VANA Documentation - Getting Started",
                    "url": "https://docs.vana.ai/getting-started",
                    "snippet": "Complete guide to getting started with VANA, including installation, configuration, and basic usage examples.",
                    "source": "VANA Docs",
                    "date": "2024-01-10"
                }
            ],
            "ai agent": [
                {
                    "title": "Understanding AI Agents - A Comprehensive Guide",
                    "url": "https://example.com/ai-agents-guide",
                    "snippet": "AI agents are autonomous software entities that can perceive their environment and take actions to achieve specific goals.",
                    "source": "AI Research",
                    "date": "2024-01-20"
                }
            ],
            "default": [
                {
                    "title": "Sample Search Result",
                    "url": "https://example.com/sample",
                    "snippet": "This is a sample search result for testing purposes.",
                    "source": "Example",
                    "date": "2024-01-01"
                }
            ]
        }

    def is_available(self) -> bool:
        """Mock client is always available"""
        return True

    def search(self, query: str, num_results: int = 5, **kwargs) -> List[Dict[str, Any]]:
        """Return mock search results based on the query"""
        # Simple keyword matching for mock results
        for key, results in self.mock_results.items():
            if key.lower() in query.lower():
                return results[:num_results]

        # Return default results if no match
        return self.mock_results["default"][:num_results]

    def format_results(self, results: List[Dict[str, Any]]) -> str:
        """Format mock results for display"""
        if not results:
            return "No mock search results found."

        formatted = "🔍 Mock Brave Search Results:\n\n"

        for i, result in enumerate(results, 1):
            title = result.get("title", "No title")
            url = result.get("url", "")
            snippet = result.get("snippet", "No description available")

            formatted += f"{i}. **{title}**\n"
            formatted += f"   URL: {url}\n"
            formatted += f"   {snippet}\n\n"

        return formatted


def get_brave_search_client(use_mock: bool = False) -> Any:
    """
    Get a Brave Search client instance.

    Args:
        use_mock: Whether to use the mock client (for testing) or real client.

    Returns:
        BraveSearchClient or MockBraveSearchClient instance.
    """
    if use_mock:
        return MockBraveSearchClient()
    return BraveSearchClient()


# For backward compatibility and easy testing
if __name__ == "__main__":
    import sys

    # Simple command line interface for testing
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        client = get_brave_search_client()

        if client.is_available():
            results = client.search(query)
            formatted = client.format_results(results)
            print(formatted)
        else:
            print("Brave Search client not available. Please check your API key configuration.")
    else:
        print("Usage: python brave_search_client.py <search query>")
