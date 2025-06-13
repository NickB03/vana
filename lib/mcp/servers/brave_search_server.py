"""
Brave Search Server Integration
Brave Search API integration for web search capabilities.

This module provides comprehensive Brave Search API integration including web search,
news search, image/video search, local search, and search suggestions.
"""

import os
import json
import logging
import requests
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Web search result"""
    title: str
    url: str
    description: str
    published: Optional[str]
    favicon: Optional[str]
    language: str
    family_friendly: bool
    type: str = "web"


@dataclass
class NewsResult:
    """News search result"""
    title: str
    url: str
    description: str
    published: str
    source: str
    thumbnail: Optional[str]
    category: Optional[str]
    breaking: bool = False


@dataclass
class ImageResult:
    """Image search result"""
    title: str
    url: str
    thumbnail_url: str
    source_url: str
    width: int
    height: int
    size: str
    format: str


@dataclass
class VideoResult:
    """Video search result"""
    title: str
    url: str
    thumbnail_url: str
    duration: Optional[str]
    views: Optional[str]
    published: Optional[str]
    source: str


@dataclass
class LocalResult:
    """Local search result"""
    name: str
    address: str
    phone: Optional[str]
    website: Optional[str]
    rating: Optional[float]
    reviews: Optional[int]
    category: str
    distance: Optional[str]


@dataclass
class SearchResults:
    """Container for search results"""
    query: str
    results: List[SearchResult]
    total_count: Optional[int]
    search_time: float
    suggestions: List[str] = None


@dataclass
class NewsResults:
    """Container for news results"""
    query: str
    results: List[NewsResult]
    total_count: Optional[int]
    search_time: float


@dataclass
class ImageResults:
    """Container for image results"""
    query: str
    results: List[ImageResult]
    total_count: Optional[int]
    search_time: float


@dataclass
class VideoResults:
    """Container for video results"""
    query: str
    results: List[VideoResult]
    total_count: Optional[int]
    search_time: float


@dataclass
class LocalResults:
    """Container for local results"""
    query: str
    location: str
    results: List[LocalResult]
    total_count: Optional[int]
    search_time: float


class BraveSearchServer:
    """Brave Search API integration for web search capabilities."""
    
    def __init__(self, api_key: str, rate_limit: int = 100):
        """Initialize with Brave Search API key."""
        self.api_key = api_key
        self.rate_limit = rate_limit
        self.base_url = "https://api.search.brave.com/res/v1"
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": api_key,
            "User-Agent": "VANA-MCP-Brave/1.0"
        })
    
    def web_search(self, query: str, count: int = 10, offset: int = 0, 
                   country: str = "US", language: str = "en") -> SearchResults:
        """Perform web search with filtering options."""
        try:
            import time
            start_time = time.time()
            
            params = {
                "q": query,
                "count": min(count, 20),  # Brave API max is 20
                "offset": offset,
                "country": country,
                "search_lang": language,
                "safesearch": "moderate",
                "freshness": "pd",  # Past day for recent results
                "text_decorations": False,
                "spellcheck": True,
                "result_filter": "web"
            }
            
            response = self.session.get(f"{self.base_url}/web/search", params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            search_time = time.time() - start_time
            
            # Parse web results
            web_results = data.get("web", {}).get("results", [])
            results = []
            
            for result in web_results:
                results.append(SearchResult(
                    title=result.get("title", ""),
                    url=result.get("url", ""),
                    description=result.get("description", ""),
                    published=result.get("age"),
                    favicon=result.get("profile", {}).get("img"),
                    language=result.get("language", language),
                    family_friendly=result.get("family_friendly", True),
                    type="web"
                ))
            
            # Get suggestions if available
            suggestions = []
            query_data = data.get("query", {})
            if "altered" in query_data:
                suggestions.append(query_data["altered"])
            
            return SearchResults(
                query=query,
                results=results,
                total_count=len(results),
                search_time=search_time,
                suggestions=suggestions
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Brave web search failed for '{query}': {e}")
            raise
        except Exception as e:
            logger.error(f"Error in web search: {e}")
            raise
    
    def news_search(self, query: str, count: int = 10, 
                    freshness: str = "pd", country: str = "US") -> NewsResults:
        """Search news articles with date filtering."""
        try:
            import time
            start_time = time.time()
            
            params = {
                "q": query,
                "count": min(count, 20),
                "country": country,
                "freshness": freshness,  # pd=past day, pw=past week, pm=past month
                "text_decorations": False
            }
            
            response = self.session.get(f"{self.base_url}/news/search", params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            search_time = time.time() - start_time
            
            # Parse news results
            news_results = data.get("results", [])
            results = []
            
            for result in news_results:
                results.append(NewsResult(
                    title=result.get("title", ""),
                    url=result.get("url", ""),
                    description=result.get("description", ""),
                    published=result.get("age", ""),
                    source=result.get("source", ""),
                    thumbnail=result.get("thumbnail"),
                    category=result.get("category"),
                    breaking=result.get("breaking", False)
                ))
            
            return NewsResults(
                query=query,
                results=results,
                total_count=len(results),
                search_time=search_time
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Brave news search failed for '{query}': {e}")
            raise
        except Exception as e:
            logger.error(f"Error in news search: {e}")
            raise
    
    def image_search(self, query: str, count: int = 10, 
                     size: str = "medium", type: str = "photo") -> ImageResults:
        """Search images with size and type filtering."""
        try:
            import time
            start_time = time.time()
            
            params = {
                "q": query,
                "count": min(count, 20),
                "size": size,  # small, medium, large, wallpaper
                "type": type,  # photo, clipart, lineart, animated
                "layout": "all",
                "color": "all",
                "license": "all",
                "safesearch": "moderate"
            }
            
            response = self.session.get(f"{self.base_url}/images/search", params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            search_time = time.time() - start_time
            
            # Parse image results
            image_results = data.get("results", [])
            results = []
            
            for result in image_results:
                results.append(ImageResult(
                    title=result.get("title", ""),
                    url=result.get("url", ""),
                    thumbnail_url=result.get("thumbnail", {}).get("src", ""),
                    source_url=result.get("source", ""),
                    width=result.get("properties", {}).get("width", 0),
                    height=result.get("properties", {}).get("height", 0),
                    size=result.get("properties", {}).get("size", ""),
                    format=result.get("properties", {}).get("format", "")
                ))
            
            return ImageResults(
                query=query,
                results=results,
                total_count=len(results),
                search_time=search_time
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Brave image search failed for '{query}': {e}")
            raise
        except Exception as e:
            logger.error(f"Error in image search: {e}")
            raise
    
    def video_search(self, query: str, count: int = 10, 
                     duration: str = "medium") -> VideoResults:
        """Search videos with duration filtering."""
        try:
            import time
            start_time = time.time()
            
            params = {
                "q": query,
                "count": min(count, 20),
                "duration": duration,  # short, medium, long
                "resolution": "all",
                "safesearch": "moderate"
            }
            
            response = self.session.get(f"{self.base_url}/videos/search", params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            search_time = time.time() - start_time
            
            # Parse video results
            video_results = data.get("results", [])
            results = []
            
            for result in video_results:
                results.append(VideoResult(
                    title=result.get("title", ""),
                    url=result.get("url", ""),
                    thumbnail_url=result.get("thumbnail", {}).get("src", ""),
                    duration=result.get("duration"),
                    views=result.get("views"),
                    published=result.get("age"),
                    source=result.get("source", "")
                ))
            
            return VideoResults(
                query=query,
                results=results,
                total_count=len(results),
                search_time=search_time
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Brave video search failed for '{query}': {e}")
            raise
        except Exception as e:
            logger.error(f"Error in video search: {e}")
            raise
    
    def local_search(self, query: str, location: str, 
                     radius: int = 5000) -> LocalResults:
        """Search local businesses and places."""
        try:
            import time
            start_time = time.time()
            
            params = {
                "q": query,
                "location": location,
                "radius": radius,  # in meters
                "count": 20,
                "safesearch": "moderate"
            }
            
            response = self.session.get(f"{self.base_url}/local/search", params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            search_time = time.time() - start_time
            
            # Parse local results
            local_results = data.get("results", [])
            results = []
            
            for result in local_results:
                results.append(LocalResult(
                    name=result.get("title", ""),
                    address=result.get("address", ""),
                    phone=result.get("phone"),
                    website=result.get("url"),
                    rating=result.get("rating"),
                    reviews=result.get("review_count"),
                    category=result.get("category", ""),
                    distance=result.get("distance")
                ))
            
            return LocalResults(
                query=query,
                location=location,
                results=results,
                total_count=len(results),
                search_time=search_time
            )
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Brave local search failed for '{query}' in '{location}': {e}")
            raise
        except Exception as e:
            logger.error(f"Error in local search: {e}")
            raise
    
    def get_suggestions(self, query: str, country: str = "US") -> List[str]:
        """Get search suggestions for query."""
        try:
            params = {
                "q": query,
                "country": country
            }
            
            response = self.session.get(f"{self.base_url}/suggest", params=params, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Parse suggestions
            suggestions = []
            for suggestion in data.get("results", []):
                if isinstance(suggestion, dict):
                    suggestions.append(suggestion.get("query", ""))
                else:
                    suggestions.append(str(suggestion))
            
            return suggestions
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Brave suggestions failed for '{query}': {e}")
            return []
        except Exception as e:
            logger.error(f"Error getting suggestions: {e}")
            return []
