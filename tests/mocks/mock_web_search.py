"""
Mock Web Search for Testing - Returns simulated results for common queries
"""

import json
from datetime import datetime, timezone
import pytz


async def mock_web_search(query: str, max_results: int = 5) -> str:
    """Mock web search that returns simulated results for testing."""
    
    query_lower = query.lower()
    
    # Mock responses for common queries
    if "time" in query_lower and ("dallas" in query_lower or "texas" in query_lower):
        # Get actual current time in Dallas
        dallas_tz = pytz.timezone('America/Chicago')
        dallas_time = datetime.now(dallas_tz)
        
        return json.dumps({
            "query": query,
            "results": [
                {
                    "title": "Current Time in Dallas, Texas",
                    "url": "https://time.is/Dallas",
                    "description": f"The current time in Dallas, Texas is {dallas_time.strftime('%I:%M %p %Z on %A, %B %d, %Y')}",
                    "relevance_score": 1.0
                },
                {
                    "title": "Dallas Time Zone Information",
                    "url": "https://www.timeanddate.com/time/zone/usa/dallas",
                    "description": "Dallas is in the Central Time Zone (CT). Central Standard Time (CST) is UTC-6, and Central Daylight Time (CDT) is UTC-5.",
                    "relevance_score": 0.9
                }
            ],
            "timestamp": datetime.now().isoformat()
        }, indent=2)
    
    elif "weather" in query_lower:
        location = "the specified location"
        if "dallas" in query_lower:
            location = "Dallas, Texas"
        elif "new york" in query_lower:
            location = "New York City"
        
        return json.dumps({
            "query": query,
            "results": [
                {
                    "title": f"Weather in {location}",
                    "url": "https://weather.com",
                    "description": f"Current weather in {location}: Partly cloudy, 75°F (24°C), Humidity: 65%, Wind: 10 mph",
                    "relevance_score": 1.0
                },
                {
                    "title": "7-Day Weather Forecast",
                    "url": "https://weather.com/forecast",
                    "description": "This week: Mix of sun and clouds, highs 72-78°F, lows 58-63°F. Chance of rain Thursday.",
                    "relevance_score": 0.8
                }
            ],
            "timestamp": datetime.now().isoformat()
        }, indent=2)
    
    elif "vana" in query_lower:
        return json.dumps({
            "query": query,
            "results": [
                {
                    "title": "VANA - Multi-Agent AI System",
                    "url": "https://github.com/vana-ai/vana",
                    "description": "VANA is an intelligent multi-agent AI system built with Google's Agent Development Kit (ADK). It provides coordinated search, task routing, and specialized agent capabilities.",
                    "relevance_score": 1.0
                },
                {
                    "title": "VANA Documentation",
                    "url": "https://docs.vana.ai",
                    "description": "VANA features automatic task routing, memory-first search priority, and integration with multiple AI models including Gemini.",
                    "relevance_score": 0.9
                }
            ],
            "timestamp": datetime.now().isoformat()
        }, indent=2)
    
    else:
        # Generic response for other queries
        return json.dumps({
            "query": query,
            "results": [
                {
                    "title": f"Search results for: {query}",
                    "url": "https://www.google.com/search?q=" + query.replace(" ", "+"),
                    "description": f"Mock search result for '{query}'. In a production environment, this would return real search results from a web search API.",
                    "relevance_score": 0.7
                }
            ],
            "note": "This is a mock response for testing. Configure BRAVE_API_KEY for real web search.",
            "timestamp": datetime.now().isoformat()
        }, indent=2)


# Create a synchronous wrapper
def sync_mock_web_search(query: str, max_results: int = 5) -> str:
    """Synchronous wrapper for mock web search."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(asyncio.run, mock_web_search(query, max_results))
                return future.result()
        else:
            return loop.run_until_complete(mock_web_search(query, max_results))
    except RuntimeError:
        return asyncio.run(mock_web_search(query, max_results))