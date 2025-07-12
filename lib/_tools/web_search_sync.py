"""
Synchronous web search tool for ADK compatibility
Uses DuckDuckGo Instant Answer API - no API key required
"""

import json
import logging
import urllib.parse
import urllib.request
from datetime import datetime

from google.adk.tools import FunctionTool

logger = logging.getLogger(__name__)


def web_search(query: str, max_results: int) -> str:
    """
    Search the web for current information using DuckDuckGo.

    Args:
        query: The search query
        max_results: Maximum number of results to return

    Returns:
        Web search results as JSON string
    """
    try:
        logger.info(f"Performing web search for: {query}")

        # Handle time queries specially
        query_lower = query.lower()
        if "time" in query_lower or "clock" in query_lower:
            return _handle_time_query(query)

        # Use DuckDuckGo Instant Answer API
        base_url = "https://api.duckduckgo.com/"
        params = {"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"}

        url = base_url + "?" + urllib.parse.urlencode(params)

        with urllib.request.urlopen(url, timeout=10) as response:
            data = json.loads(response.read().decode())

        results = []

        # Extract instant answer if available
        if data.get("AbstractText"):
            results.append(
                {
                    "title": data.get("Heading", "Instant Answer"),
                    "description": data["AbstractText"],
                    "url": data.get("AbstractURL", ""),
                    "source": "instant_answer",
                }
            )

        # Extract answer box
        if data.get("Answer"):
            results.append({"title": "Direct Answer", "description": data["Answer"], "url": "", "source": "answer_box"})

        # Add definition if available
        if data.get("Definition"):
            results.append(
                {
                    "title": "Definition",
                    "description": data["Definition"],
                    "url": data.get("DefinitionURL", ""),
                    "source": "definition",
                }
            )

        # Add related topics
        for topic in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append(
                    {
                        "title": topic.get("Text", "").split(" - ")[0] if " - " in topic.get("Text", "") else "Related",
                        "description": topic.get("Text", ""),
                        "url": topic.get("FirstURL", ""),
                        "source": "related_topic",
                    }
                )

        # Format response
        response_data = {
            "query": query,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "results": results[:max_results],
            "total_results": len(results),
            "status": "success",
        }

        return json.dumps(response_data, indent=2)

    except Exception as e:
        logger.error(f"Web search error: {e}")
        return json.dumps({"query": query, "error": str(e), "results": [], "status": "error"}, indent=2)


def _handle_time_query(query: str) -> str:
    """Handle time-specific queries with current UTC time and location hints."""
    try:
        # Extract location from query
        location = "UTC"
        query_lower = query.lower()

        # Common patterns: "time in X", "X time", "current time X"
        if " in " in query_lower:
            location = query.split(" in ")[-1].strip()
        elif "time" in query_lower:
            words = query.split()
            for i, word in enumerate(words):
                if word.lower() == "time" and i > 0:
                    location = " ".join(words[:i])
                elif word.lower() == "time" and i < len(words) - 1:
                    location = " ".join(words[i + 1 :])

        # Get current UTC time
        current_utc = datetime.utcnow()

        # Create response
        results = [
            {
                "title": f"Current Time Information",
                "description": f"Current UTC time is {current_utc.strftime('%Y-%m-%d %H:%M:%S')} UTC. For '{location}' specific time, you would need to apply the appropriate timezone offset.",
                "url": "",
                "source": "system_time",
            }
        ]

        # Add timezone hint
        results.append(
            {
                "title": "Timezone Information",
                "description": f"To get the exact time in {location}, apply the timezone offset. Common offsets: EST (UTC-5), CST (UTC-6), MST (UTC-7), PST (UTC-8), CET (UTC+1), JST (UTC+9), etc.",
                "url": "",
                "source": "timezone_info",
            }
        )

        response_data = {
            "query": query,
            "timestamp": current_utc.isoformat() + "Z",
            "results": results,
            "total_results": len(results),
            "status": "success",
            "note": "Time information based on UTC. Apply timezone offset for specific location.",
        }

        return json.dumps(response_data, indent=2)

    except Exception as e:
        logger.error(f"Time query handling error: {e}")
        return json.dumps({"query": query, "error": str(e), "results": [], "status": "error"}, indent=2)


def create_web_search_sync_tool() -> FunctionTool:
    """Create synchronous web search tool for ADK compatibility."""

    # Create FunctionTool with the synchronous function
    tool = FunctionTool(func=web_search)

    # Set metadata for ADK
    tool.name = "web_search"
    tool.description = "Search the web for current information (time, weather, news, etc.)"

    return tool
