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
        Perform a web search using Brave Search API with Free AI plan optimizations

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

            # Construct optimized request parameters for Free AI plan
            params = {
                "q": query,
                "count": num_results,
                "offset": 0,
                "country": "US",  # Search country
                "search_lang": "en",  # Search language
                "ui_lang": "en-US",  # UI language
                "safesearch": "moderate",  # Safe search level
                "freshness": "pw",  # Past week for fresher results
                "text_decorations": False,  # No text decorations for cleaner parsing
                "spellcheck": True,  # Enable spell checking
                # Free AI plan exclusive features
                "extra_snippets": True,  # Get up to 5 additional excerpts (Free AI feature)
                "summary": True,  # Enable summary generation (Free AI feature)
                "result_filter": "web,news,videos,infobox,faq"  # Optimize result types
            }

            # Add any additional parameters
            params.update(kwargs)

            # Make request
            response = requests.get(self.base_url, headers=headers, params=params)
            response.raise_for_status()

            # Parse results with Free AI plan enhancements
            data = response.json()

            if "web" not in data or "results" not in data["web"]:
                logger.warning(f"No search results found for query: {query}")
                return []

            # Format results to match expected format with Free AI enhancements
            results = []
            for item in data["web"]["results"]:
                result = {
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "snippet": item.get("description", ""),
                    "source": item.get("profile", {}).get("name", ""),
                    "date": item.get("age", ""),
                    "language": item.get("language", "en"),
                    # Free AI plan enhancements
                    "extra_snippets": item.get("extra_snippets", []),  # Additional excerpts
                    "summary": item.get("summary", ""),  # AI-generated summary
                    "type": item.get("type", "web"),  # Result type
                    "meta_url": item.get("meta_url", {})  # Enhanced metadata
                }
                results.append(result)

            # Add query-level enhancements from Free AI plan
            query_info = data.get("query", {})
            if query_info:
                # Log query modifications and spell corrections
                if query_info.get("altered"):
                    logger.info(f"Query spell-corrected from '{query}' to '{query_info.get('altered')}'")
                if query_info.get("safesearch"):
                    logger.info(f"Safe search applied: {query_info.get('safesearch')}")

            # Add summarizer results if available (Free AI feature)
            if "summarizer" in data and data["summarizer"].get("key"):
                logger.info(f"AI summary available for query: {query}")
                # Add summary to first result for easy access
                if results:
                    results[0]["ai_summary"] = data["summarizer"].get("key", "")

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

    def optimized_search(self, query: str, search_type: str = "comprehensive", **kwargs) -> List[Dict[str, Any]]:
        """
        Perform optimized search using Free AI plan features with intelligent parameter selection

        Args:
            query: Search query
            search_type: Type of search optimization
                - "comprehensive": Maximum data extraction with all Free AI features
                - "fast": Quick search with essential features only
                - "academic": Academic/research focused with goggles
                - "recent": Focus on recent content
                - "local": Location-based search optimization
            **kwargs: Additional parameters

        Returns:
            Optimized search results with enhanced data
        """
        # Base optimization parameters
        base_params = {
            "extra_snippets": True,
            "summary": True,
            "spellcheck": True,
            "text_decorations": False
        }

        # Search type specific optimizations
        if search_type == "comprehensive":
            params = {
                **base_params,
                "count": 20,  # Maximum results
                "result_filter": "web,news,videos,infobox,faq,discussions",
                "freshness": "pm",  # Past month for comprehensive coverage
                "safesearch": "moderate"
            }
        elif search_type == "fast":
            params = {
                "count": 5,  # Fewer results for speed
                "result_filter": "web,infobox",  # Essential results only
                "spellcheck": True,
                "text_decorations": False
            }
        elif search_type == "academic":
            params = {
                **base_params,
                "count": 15,
                "result_filter": "web,news,faq",
                "freshness": "py",  # Past year for academic content
                "safesearch": "strict"
            }
        elif search_type == "recent":
            params = {
                **base_params,
                "count": 10,
                "result_filter": "web,news,videos",
                "freshness": "pd",  # Past day for recent content
                "safesearch": "moderate"
            }
        elif search_type == "local":
            params = {
                **base_params,
                "count": 10,
                "result_filter": "web,locations,news",
                "country": kwargs.get("country", "US"),
                "safesearch": "moderate"
            }
        else:
            # Default to comprehensive
            params = {
                **base_params,
                "count": 10,
                "result_filter": "web,news,infobox",
                "safesearch": "moderate"
            }

        # Merge with any additional parameters
        params.update(kwargs)

        logger.info(f"Performing {search_type} optimized search for: {query}")
        return self.search(query, num_results=params.get("count", 10), **params)

    def search_with_goggles(self, query: str, goggle_type: str = "academic", **kwargs) -> List[Dict[str, Any]]:
        """
        Search with Brave Goggles for custom result ranking (Free AI plan feature)

        Args:
            query: Search query
            goggle_type: Type of goggle to apply
                - "academic": Academic and archival sources
                - "news": News and journalism focus
                - "tech": Technology and programming focus
                - "custom": Custom goggle URL (provide goggle_url in kwargs)
            **kwargs: Additional parameters including goggle_url for custom goggles

        Returns:
            Search results re-ranked according to goggle rules
        """
        # Predefined goggle URLs for common use cases
        goggles = {
            "academic": "https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/academic.goggle",
            "news": "https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/news.goggle",
            "tech": "https://raw.githubusercontent.com/brave/goggles-quickstart/main/goggles/tech.goggle"
        }

        if goggle_type == "custom":
            goggle_url = kwargs.get("goggle_url")
            if not goggle_url:
                logger.error("Custom goggle type requires goggle_url parameter")
                return self.search(query, **kwargs)
        else:
            goggle_url = goggles.get(goggle_type)
            if not goggle_url:
                logger.warning(f"Unknown goggle type: {goggle_type}, using standard search")
                return self.search(query, **kwargs)

        # Add goggle to search parameters
        params = {
            "goggles": [goggle_url],
            "extra_snippets": True,
            "summary": True,
            **kwargs
        }

        logger.info(f"Searching with {goggle_type} goggle: {goggle_url}")
        return self.search(query, **params)

    def multi_type_search(self, query: str, result_types: List[str] = None, **kwargs) -> Dict[str, List[Dict[str, Any]]]:
        """
        Perform search across multiple result types simultaneously (Free AI optimization)

        Args:
            query: Search query
            result_types: List of result types to search
                Available: web, news, videos, infobox, faq, discussions, locations
            **kwargs: Additional parameters

        Returns:
            Dictionary with results categorized by type
        """
        if result_types is None:
            result_types = ["web", "news", "videos", "infobox"]

        # Perform search with all requested result types
        params = {
            "result_filter": ",".join(result_types),
            "extra_snippets": True,
            "summary": True,
            "count": kwargs.get("count", 15),
            **kwargs
        }

        logger.info(f"Multi-type search for: {query} across types: {result_types}")
        all_results = self.search(query, **params)

        # Categorize results by type (this would need API response analysis)
        categorized = {result_type: [] for result_type in result_types}

        # For now, put all results in 'web' category
        # In a real implementation, you'd parse the API response to categorize properly
        categorized["web"] = all_results

        return categorized


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
