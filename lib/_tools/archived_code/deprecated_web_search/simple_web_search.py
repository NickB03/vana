"""
Simple Web Search using Python's built-in capabilities
No external API keys required
"""

import json
import logging
import urllib.parse
import urllib.request
from datetime import datetime
from typing import Dict, List

logger = logging.getLogger(__name__)


def search_duckduckgo_instant(query: str) -> List[Dict]:
    """Search using DuckDuckGo Instant Answer API (no key required)."""
    try:
        # DuckDuckGo Instant Answer API
        base_url = "https://api.duckduckgo.com/"
        params = {
            "q": query,
            "format": "json",
            "no_html": "1",
            "skip_disambig": "1"
        }
        
        url = base_url + "?" + urllib.parse.urlencode(params)
        
        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())
            
        results = []
        
        # Extract instant answer if available
        if data.get("AbstractText"):
            results.append({
                "title": data.get("Heading", "Instant Answer"),
                "description": data["AbstractText"],
                "url": data.get("AbstractURL", ""),
                "source": "instant_answer"
            })
        
        # Extract answer box
        if data.get("Answer"):
            results.append({
                "title": "Direct Answer",
                "description": data["Answer"],
                "url": "",
                "source": "answer_box"
            })
        
        # Extract definition
        if data.get("Definition"):
            results.append({
                "title": "Definition",
                "description": data["Definition"],
                "url": data.get("DefinitionURL", ""),
                "source": "definition"
            })
        
        # Extract related topics
        for topic in data.get("RelatedTopics", [])[:3]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({
                    "title": topic.get("Text", "").split(" - ")[0],
                    "description": topic.get("Text", ""),
                    "url": topic.get("FirstURL", ""),
                    "source": "related_topic"
                })
        
        return results
        
    except Exception as e:
        logger.error(f"DuckDuckGo search error: {e}")
        return []


def search_time_info(query: str) -> List[Dict]:
    """Provide time information for location queries."""
    query_lower = query.lower()
    
    # Simple time zone mapping for common cities
    timezone_map = {
        "new york": "America/New_York",
        "los angeles": "America/Los_Angeles", 
        "chicago": "America/Chicago",
        "dallas": "America/Chicago",
        "houston": "America/Chicago",
        "phoenix": "America/Phoenix",
        "london": "Europe/London",
        "paris": "Europe/Paris",
        "tokyo": "Asia/Tokyo",
        "sydney": "Australia/Sydney"
    }
    
    # Check if query is asking for time
    if any(word in query_lower for word in ["time", "clock", "what time"]):
        for city, tz in timezone_map.items():
            if city in query_lower:
                try:
                    import pytz
                    tz_obj = pytz.timezone(tz)
                    local_time = datetime.now(tz_obj)
                    
                    return [{
                        "title": f"Current time in {city.title()}",
                        "description": f"The current time in {city.title()} is {local_time.strftime('%I:%M %p %Z on %A, %B %d, %Y')}",
                        "url": "",
                        "source": "time_service"
                    }]
                except:
                    pass
    
    return []


async def simple_web_search(query: str, max_results: int = 5) -> str:
    """
    Simple web search that combines multiple free sources.
    
    Args:
        query: Search query
        max_results: Maximum number of results to return
        
    Returns:
        JSON string with search results
    """
    all_results = []
    
    # Try time information first
    time_results = search_time_info(query)
    if time_results:
        all_results.extend(time_results)
    
    # Try DuckDuckGo instant answers
    ddg_results = search_duckduckgo_instant(query)
    all_results.extend(ddg_results)
    
    # If no results, provide a fallback
    if not all_results:
        all_results.append({
            "title": f"Search: {query}",
            "description": f"Please try a more specific search query or check your internet connection.",
            "url": f"https://www.google.com/search?q={urllib.parse.quote(query)}",
            "source": "fallback"
        })
    
    # Limit results
    all_results = all_results[:max_results]
    
    return json.dumps({
        "query": query,
        "results": all_results,
        "timestamp": datetime.now().isoformat()
    }, indent=2)


# Synchronous wrapper
def sync_simple_web_search(query: str, max_results: int = 5) -> str:
    """Synchronous wrapper for simple web search."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, simple_web_search(query, max_results))
                return future.result()
        else:
            return loop.run_until_complete(simple_web_search(query, max_results))
    except RuntimeError:
        return asyncio.run(simple_web_search(query, max_results))