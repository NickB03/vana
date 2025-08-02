"""Brave Search tool for ADK agents using MCP integration."""

import os
import json
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

import httpx
from google.adk.tools import BaseTool
from google.adk.tools.function_tool import FunctionTool

logger = logging.getLogger(__name__)


# Create the Brave search function - synchronous version for ADK
def brave_web_search_function(
    query: str,
    count: int = 5,
    **kwargs
) -> Dict[str, Any]:
    """
    Search the web using Brave Search API.
    
    Args:
        query: Search query string
        count: Number of results to return (default: 5, max: 20)
    
    Returns:
        Dictionary containing search results
    """
    try:
        # Use the API key from environment or kwargs
        api_key = kwargs.get("api_key") or os.getenv("BRAVE_API_KEY", "BSA6fMCYrfJC5seE-AVsWrKjpOFk6Nm")
        
        # Limit count to reasonable number
        count = min(count, 20)
        
        # Perform synchronous search using httpx
        base_url = "https://api.search.brave.com/res/v1"
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": api_key
        }
        
        with httpx.Client() as client:
            response = client.get(
                f"{base_url}/web/search",
                headers=headers,
                params={
                    "q": query,
                    "count": count,
                    "text_decorations": False,
                    "search_lang": "en"
                }
            )
            response.raise_for_status()
            data = response.json()
        
        # Format results for ADK
        formatted_results = []
        for item in data.get("web", {}).get("results", []):
            formatted_results.append({
                "title": item.get("title", ""),
                "link": item.get("url", ""),
                "snippet": item.get("description", "")
            })
        
        return {
            "results": formatted_results,
            "query": query,
            "source": "brave_search"
        }
        
    except Exception as e:
        logger.error(f"Brave search error: {e}")
        return {
            "error": str(e),
            "query": query,
            "results": []
        }


# Create ADK tool directly from the synchronous function
brave_search = FunctionTool(brave_web_search_function)

# For backward compatibility with google_search naming
web_search = brave_search