"""Brave Search tool integration for Google ADK agents.

This module provides web search capabilities through the Brave Search API,
optimized for use with Google Agent Development Kit (ADK). It includes both
asynchronous and synchronous interfaces with connection pooling, error handling,
and proper resource management.

Key Features:
    - Async HTTP client with connection pooling for performance
    - Synchronous wrapper compatible with ADK FunctionTool
    - Automatic event loop management for different execution contexts
    - Proper error handling and timeout management
    - Resource cleanup utilities

Environment Configuration:
    BRAVE_API_KEY: Required Brave Search API subscription token

Exports:
    brave_search: Primary ADK FunctionTool for web search
    web_search: Backward compatibility alias
    brave_web_search_async: Async search function
    brave_web_search_function: Sync wrapper function
    get_http_session: HTTP session management
    cleanup_http_session: Resource cleanup
"""

import asyncio
import logging
import os
import threading
from typing import Any

import aiohttp
from google.adk.tools.function_tool import FunctionTool

logger = logging.getLogger(__name__)


# Thread-local storage for HTTP sessions to avoid event loop conflicts
_thread_local = threading.local()
"""Thread-local storage for aiohttp.ClientSession instances.

Each thread gets its own session to avoid event loop conflicts when
running searches in different thread contexts (e.g., from sync wrapper).
"""


async def get_http_session() -> aiohttp.ClientSession:
    """Get or create a thread-local HTTP session with optimized connection pooling.

    Creates a thread-local aiohttp ClientSession with performance optimizations:
    - Connection pooling (100 total, 20 per host)
    - DNS caching with 5-minute TTL
    - Keepalive connections for 30 seconds
    - Appropriate timeout configurations

    Returns:
        Configured aiohttp.ClientSession instance with connection pooling

    Note:
        This function maintains a thread-local session to avoid event loop
        conflicts when running searches in different thread contexts.
    """
    # Check if we have a session for this thread
    if not hasattr(_thread_local, 'session') or _thread_local.session is None or _thread_local.session.closed:
        # Configure connection pooling for optimal performance
        connector = aiohttp.TCPConnector(
            limit=100,  # Total connection pool size
            limit_per_host=20,  # Connections per host
            ttl_dns_cache=300,  # DNS cache TTL in seconds
            use_dns_cache=True,
            keepalive_timeout=30,  # Keep connections alive for 30 seconds
            enable_cleanup_closed=True,
        )

        # Configure timeout settings
        timeout = aiohttp.ClientTimeout(
            total=30,  # Total timeout
            connect=10,  # Connection timeout
            sock_read=20,  # Socket read timeout
        )

        _thread_local.session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                "User-Agent": "Vana-ADK/1.0",
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
            },
        )

        logger.info(f"Created new HTTP session for thread {threading.current_thread().name}")

    return _thread_local.session


async def cleanup_http_session() -> None:
    """Clean up the thread-local HTTP session and release resources.

    Properly closes the thread-local aiohttp session and sets it to None to ensure
    clean resource management. Should be called during application shutdown.

    Note:
        This function is safe to call multiple times and will only close
        sessions that are still open.
    """
    if hasattr(_thread_local, 'session') and _thread_local.session and not _thread_local.session.closed:
        await _thread_local.session.close()
        _thread_local.session = None
        logger.info(f"Cleaned up HTTP session for thread {threading.current_thread().name}")


async def brave_web_search_async(
    query: str, count: int = 5, **kwargs
) -> dict[str, Any]:
    """Perform asynchronous web search using Brave Search API.

    Executes a web search query through Brave's Search API with connection pooling
    and proper error handling. Results are formatted for consistency with ADK
    tool requirements.

    Args:
        query: The search query string to execute
        count: Maximum number of results to return (default: 5, max: 20)
        **kwargs: Additional parameters including optional 'api_key'

    Returns:
        Dictionary containing search results with structure:
            {
                "results": [{
                    "title": str,
                    "link": str,
                    "snippet": str
                }],
                "query": str,
                "source": "brave_search"
            }

        On error, returns:
            {
                "error": str,
                "query": str,
                "results": []
            }

    Environment Variables:
        BRAVE_API_KEY: Brave Search API subscription token (required)

    Raises:
        No exceptions are raised; errors are returned in the response dictionary

    Example:
        >>> results = await brave_web_search_async("Python tutorials", count=3)
        >>> print(f"Found {len(results['results'])} results")
    """
    try:
        # Retrieve API key with fallback chain: kwargs -> environment
        api_key = kwargs.get("api_key") or os.getenv("BRAVE_API_KEY")
        if not api_key:
            raise ValueError(
                "BRAVE_API_KEY environment variable is not set. "
                "Please obtain an API key from https://brave.com/search/api/"
            )

        # Enforce API limits: Brave Search API allows max 20 results per request
        count = min(max(1, count), 20)  # Ensure count is between 1 and 20

        # Get HTTP session with connection pooling
        session = await get_http_session()

        # Perform async search
        base_url = "https://api.search.brave.com/res/v1"
        headers = {"X-Subscription-Token": api_key}

        params = {
            "q": query,
            "count": count,
            "text_decorations": "false",  # API expects string, not boolean
            "search_lang": "en",
        }

        async with session.get(
            f"{base_url}/web/search", headers=headers, params=params
        ) as response:
            response.raise_for_status()
            data = await response.json()

        # Format results for ADK
        formatted_results = []
        for item in data.get("web", {}).get("results", []):
            formatted_results.append(
                {
                    "title": item.get("title", ""),
                    "link": item.get("url", ""),
                    "snippet": item.get("description", ""),
                }
            )

        return {"results": formatted_results, "query": query, "source": "brave_search"}

    except Exception as e:
        logger.error(f"Brave async search error: {e}")
        return {"error": str(e), "query": query, "results": []}


# Synchronous search function that doesn't reuse sessions across calls
def _sync_brave_search(query: str, count: int, api_key: str) -> dict[str, Any]:
    """Perform synchronous Brave search without connection pooling.

    Creates a fresh session for each search to avoid event loop conflicts.
    Trade-off: Slightly slower but more reliable across different execution contexts.

    Args:
        query: Search query string
        count: Number of results (1-20)
        api_key: Brave API key

    Returns:
        Search results dictionary
    """
    import requests

    try:
        base_url = "https://api.search.brave.com/res/v1"
        headers = {
            "X-Subscription-Token": api_key,
            "Accept": "application/json",
        }
        params = {
            "q": query,
            "count": min(max(1, count), 20),
            "text_decorations": "false",
            "search_lang": "en",
        }

        response = requests.get(
            f"{base_url}/web/search",
            headers=headers,
            params=params,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        # Format results
        formatted_results = []
        for item in data.get("web", {}).get("results", []):
            formatted_results.append({
                "title": item.get("title", ""),
                "link": item.get("url", ""),
                "snippet": item.get("description", ""),
            })

        return {"results": formatted_results, "query": query, "source": "brave_search"}

    except Exception as e:
        logger.error(f"Brave sync search error: {e}")
        return {"error": str(e), "query": query, "results": []}


# Create the Brave search function - synchronous version for ADK compatibility
def brave_web_search_function(query: str, count: int = 5, **kwargs) -> dict[str, Any]:
    """Synchronous wrapper for Brave Search API compatible with ADK tools.

    Provides a synchronous interface using requests library to avoid
    event loop complexity. This function is designed for use with Google ADK
    FunctionTool which expects synchronous interfaces.

    Args:
        query: The search query string to execute
        count: Maximum number of results to return (default: 5, max: 20)
        **kwargs: Additional parameters including optional 'api_key'

    Returns:
        Dictionary containing search results in the same format as
        brave_web_search_async()

    Implementation Details:
        - Uses requests library for synchronous HTTP calls
        - No connection pooling to avoid event loop conflicts
        - Reliable across different execution contexts (threads, async, sync)

    Example:
        >>> # Use in ADK tool
        >>> search_tool = FunctionTool(brave_web_search_function)
        >>> results = search_tool.invoke("AI research papers")
    """
    try:
        # Retrieve API key
        api_key = kwargs.get("api_key") or os.getenv("BRAVE_API_KEY")
        if not api_key:
            return {
                "error": "BRAVE_API_KEY environment variable is not set",
                "query": query,
                "results": []
            }

        return _sync_brave_search(query, count, api_key)

    except Exception as e:
        logger.error(f"Brave search wrapper error: {e}")
        return {"error": str(e), "query": query, "results": []}


# Create ADK tool directly from the synchronous function
brave_search = FunctionTool(brave_web_search_function)
"""Google ADK FunctionTool instance for Brave Search integration.

This tool provides web search capabilities to ADK agents using the Brave Search API.
It's configured with the synchronous wrapper function to ensure compatibility
with ADK's execution model.

Usage:
    The tool can be imported and used directly in ADK agent configurations:
    >>> from tools.brave_search import brave_search
    >>> # Tool is automatically available to agents
"""

# For backward compatibility with google_search naming
web_search = brave_search
"""Alias for brave_search tool to maintain backward compatibility.

Provides the same Brave Search functionality under the legacy 'web_search' name
for existing code that references the previous naming convention.
"""
