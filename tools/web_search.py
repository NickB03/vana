"""
Web Search Tool for VANA

This module provides web search capabilities using Google Custom Search API.
It enables VANA to retrieve recent information from the web with proper citation handling.
"""

import os
import json
import logging
from typing import List, Dict, Any
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebSearchClient:
    """Client for performing web searches using Google Custom Search"""
    
    def __init__(self):
        """Initialize the web search client"""
        self.api_key = os.environ.get("GOOGLE_SEARCH_API_KEY")
        self.search_engine_id = os.environ.get("GOOGLE_SEARCH_ENGINE_ID")
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        
        # Validate configuration
        if not self.api_key or not self.search_engine_id:
            logger.warning("Google Search API key or Search Engine ID not configured")
    
    def is_available(self) -> bool:
        """Check if web search is available"""
        return self.api_key is not None and self.search_engine_id is not None
    
    def search(self, query: str, num_results: int = 5) -> List[Dict[str, Any]]:
        """
        Perform a web search using Google Custom Search
        
        Args:
            query: Search query
            num_results: Number of results to return (max 10)
            
        Returns:
            List of search results with title, snippet, and URL
        """
        if not self.is_available():
            logger.error("Web search not available - missing API key or Search Engine ID")
            return []
        
        # Ensure num_results is within limits
        if num_results > 10:
            num_results = 10
            logger.warning("Requested result count exceeded maximum (10), limiting to 10 results")
        
        try:
            # Construct request parameters
            params = {
                "key": self.api_key,
                "cx": self.search_engine_id,
                "q": query,
                "num": num_results,
                "gl": "us",  # Geolocation - US results
                "safe": "active",  # Safe search
                "lr": "lang_en"  # English language results
            }
            
            # Make request
            response = requests.get(self.base_url, params=params)
            response.raise_for_status()
            
            # Parse results
            data = response.json()
            
            if "items" not in data:
                logger.warning(f"No search results found for query: {query}")
                return []
            
            # Format results
            results = []
            for item in data["items"]:
                result = {
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "source": item.get("displayLink", ""),
                    "date": item.get("pagemap", {}).get("metatags", [{}])[0].get("article:published_time", "")
                }
                results.append(result)
            
            logger.info(f"Search returned {len(results)} results for query: {query}")
            return results
        
        except requests.RequestException as e:
            logger.error(f"Error performing web search: {str(e)}")
            return []
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing search response: {str(e)}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in web search: {str(e)}")
            return []
    
    def format_results(self, results: List[Dict[str, Any]]) -> str:
        """
        Format search results for display
        
        Args:
            results: List of search results
            
        Returns:
            Formatted string with search results
        """
        if not results:
            return "No search results found."
        
        formatted = "Search Results:\n\n"
        
        for i, result in enumerate(results, 1):
            title = result.get("title", "Untitled")
            url = result.get("url", "")
            snippet = result.get("snippet", "")
            source = result.get("source", "")
            date = result.get("date", "")
            
            # Format date if available
            date_str = f" ({date[:10]})" if date else ""
            
            formatted += f"{i}. {title}\n"
            formatted += f"   {snippet}\n"
            formatted += f"   Source: {source}{date_str}\n"
            formatted += f"   {url}\n\n"
        
        return formatted
