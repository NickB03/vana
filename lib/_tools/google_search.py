"""
Google Custom Search API implementation for ADK
Provides web search functionality using Google's native search capabilities
"""

import os
import json
import logging
from typing import List, Dict, Any
from datetime import datetime
import urllib.parse
import urllib.request
from google.adk.tools import FunctionTool

logger = logging.getLogger(__name__)

# Cache for recent searches (simple in-memory cache)
_search_cache = {}
_cache_ttl = 300  # 5 minutes


def _get_from_cache(query: str) -> str:
    """Get cached search results if available and not expired."""
    cache_key = query.lower().strip()
    if cache_key in _search_cache:
        cached_data, timestamp = _search_cache[cache_key]
        if (datetime.now() - timestamp).seconds < _cache_ttl:
            logger.info(f"Cache hit for query: {query}")
            return cached_data
    return None


def _save_to_cache(query: str, result: str):
    """Save search results to cache."""
    cache_key = query.lower().strip()
    _search_cache[cache_key] = (result, datetime.now())
    
    # Simple cache size management
    if len(_search_cache) > 100:
        # Remove oldest entries
        oldest_key = min(_search_cache.keys(), key=lambda k: _search_cache[k][1])
        del _search_cache[oldest_key]


def _extract_location(query: str) -> str:
    """Extract location from time/weather queries."""
    query_lower = query.lower()
    
    # Common patterns
    patterns = [
        "in ", "at ", "for ", "near "
    ]
    
    for pattern in patterns:
        if pattern in query_lower:
            parts = query_lower.split(pattern)
            if len(parts) > 1:
                # Get the location part and clean it
                location = parts[-1].strip()
                # Remove common ending words
                for ending in ["?", ".", ",", " time", " weather", " now"]:
                    if location.endswith(ending):
                        location = location.replace(ending, "").strip()
                return location
    
    return ""


def _handle_time_query(query: str) -> str:
    """Handle time-specific queries with enhanced results."""
    location = _extract_location(query)
    
    if location:
        # Create a focused search query for time
        search_query = f"current time in {location} timezone"
    else:
        search_query = "current time UTC"
    
    # Perform the search WITHOUT special handling to avoid recursion
    # Temporarily disable special query handling
    from lib._tools.web_search_sync import web_search as ddg_search
    return ddg_search(search_query, max_results=3)


def _handle_weather_query(query: str) -> str:
    """Handle weather-specific queries."""
    location = _extract_location(query)
    
    if location:
        search_query = f"weather forecast {location} today"
    else:
        search_query = "weather forecast"
    
    # Use DDG to avoid recursion
    from lib._tools.web_search_sync import web_search as ddg_search
    return ddg_search(search_query, max_results=3)


def _handle_local_query(query: str) -> str:
    """Handle local business/venue queries."""
    # Enhance query for better local results
    if "live music" in query.lower():
        # Extract location and enhance
        location = _extract_location(query)
        if location:
            enhanced_query = f"live music venues concerts tonight {location}"
        else:
            enhanced_query = query + " concerts venues events"
    else:
        enhanced_query = query
    
    # Use DDG to avoid recursion
    from lib._tools.web_search_sync import web_search as ddg_search
    return ddg_search(enhanced_query, max_results=8)


def google_web_search(query: str, max_results: int = 5) -> str:
    """
    🔍 Search the web using Google Custom Search API.
    
    This function provides ADK-compliant web search functionality using Google's
    Custom Search API. It automatically handles time queries, weather requests,
    and local searches with appropriate enhancements.
    
    Args:
        query: Search query string
        max_results: Maximum number of results (1-10, default 5)
    
    Returns:
        JSON string with search results including title, URL, and snippet
    """
    try:
        logger.info(f"Google web search for: {query}")
        
        # Check cache first
        cached_result = _get_from_cache(query)
        if cached_result:
            return cached_result
        
        # Handle special query types
        query_lower = query.lower()
        if "time" in query_lower or "clock" in query_lower:
            return _handle_time_query(query)
        elif "weather" in query_lower:
            return _handle_weather_query(query)
        elif any(term in query_lower for term in ["live music", "restaurant", "venue", "near"]):
            return _handle_local_query(query)
        
        # Get API credentials
        api_key = os.getenv("GOOGLE_API_KEY")
        cx = os.getenv("GOOGLE_CSE_ID", "017576662512468239146:omuauf_lfve")  # Default public CSE
        
        if not api_key:
            logger.warning("GOOGLE_API_KEY not configured, falling back to DuckDuckGo")
            # Fallback to DuckDuckGo
            from lib._tools.web_search_sync import web_search as ddg_search
            return ddg_search(query, max_results)
        
        # Build request URL
        base_url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": api_key,
            "cx": cx,
            "q": query,
            "num": min(max_results, 10),  # API limit is 10
            "safe": "active",  # Safe search
            "dateRestrict": "m1"  # Prefer recent results (last month)
        }
        
        # Encode parameters
        url = base_url + "?" + urllib.parse.urlencode(params)
        
        # Make request
        req = urllib.request.Request(url, headers={
            "User-Agent": "VANA-Agent/1.0"
        })
        
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
        
        # Extract results
        results = []
        items = data.get("items", [])
        
        for item in items[:max_results]:
            result = {
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "source": "google_search"
            }
            
            # Add any available metadata
            if "pagemap" in item:
                pagemap = item["pagemap"]
                
                # Extract rating if available (for venues)
                if "aggregaterating" in pagemap:
                    rating = pagemap["aggregaterating"][0]
                    result["rating"] = rating.get("ratingvalue", "")
                    result["review_count"] = rating.get("ratingcount", "")
                
                # Extract address if available
                if "postaladdress" in pagemap:
                    address = pagemap["postaladdress"][0]
                    result["address"] = address.get("streetaddress", "")
                    
                # Extract event info if available
                if "event" in pagemap:
                    event = pagemap["event"][0]
                    result["event_name"] = event.get("name", "")
                    result["event_date"] = event.get("startdate", "")
            
            results.append(result)
        
        # Add search metadata
        search_info = data.get("searchInformation", {})
        
        response_data = {
            "query": query,
            "results": results,
            "total_results": search_info.get("formattedTotalResults", "0"),
            "search_time": search_info.get("formattedSearchTime", "0"),
            "mode": "google_custom_search",
            "cached": False
        }
        
        # Special formatting for time results
        if "time" in query_lower and results:
            # Try to extract time from snippets
            for result in results:
                snippet = result.get("snippet", "").lower()
                if "time" in snippet or ":" in snippet:
                    # This likely contains time information
                    response_data["extracted_time"] = result["snippet"]
                    break
        
        result_json = json.dumps(response_data, indent=2)
        
        # Save to cache
        _save_to_cache(query, result_json)
        
        logger.info(f"Google search completed: {len(results)} results")
        return result_json
        
    except urllib.error.HTTPError as e:
        if e.code == 429:
            logger.error("Google API quota exceeded, falling back to DuckDuckGo")
        else:
            logger.error(f"Google API error {e.code}: {e.reason}")
        
        # Fallback to DuckDuckGo
        from lib._tools.web_search_sync import web_search as ddg_search
        return ddg_search(query, max_results)
        
    except Exception as e:
        logger.error(f"Google search error: {e}")
        # Fallback to DuckDuckGo
        from lib._tools.web_search_sync import web_search as ddg_search
        return ddg_search(query, max_results)


# Create ADK tool
adk_google_web_search = FunctionTool(func=google_web_search)
adk_google_web_search.name = "google_web_search"
adk_google_web_search.description = "Search the web using Google Search for current information, local businesses, news, and more"


# Export for use in other modules
__all__ = ["google_web_search", "adk_google_web_search"]