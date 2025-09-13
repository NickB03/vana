"""Brave Search tool for ADK agents using MCP integration."""

import asyncio
import logging
import os
from typing import Any

import aiohttp
from google.adk.tools.function_tool import FunctionTool

logger = logging.getLogger(__name__)


# Global HTTP client session with connection pooling
_http_session: aiohttp.ClientSession | None = None


async def get_http_session() -> aiohttp.ClientSession:
    """Get or create a global HTTP session with connection pooling."""
    global _http_session

    if _http_session is None or _http_session.closed:
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

        _http_session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={
                "User-Agent": "Vana-ADK/1.0",
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate",
            },
        )

        logger.info("Created new HTTP session with connection pooling")

    return _http_session


async def cleanup_http_session():
    """Clean up the global HTTP session."""
    global _http_session

    if _http_session and not _http_session.closed:
        await _http_session.close()
        _http_session = None
        logger.info("Cleaned up HTTP session")


async def brave_web_search_async(
    query: str, count: int = 5, **kwargs
) -> dict[str, Any]:
    """
    Async version of Brave Search API.

    Args:
        query: Search query string
        count: Number of results to return (default: 5, max: 20)

    Returns:
        Dictionary containing search results
    """
    try:
        # Use the API key from environment or kwargs
        api_key = kwargs.get("api_key") or os.getenv("BRAVE_API_KEY")
        if not api_key:
            raise ValueError("BRAVE_API_KEY environment variable is not set")

        # Limit count to reasonable number
        count = min(count, 20)

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


# Create the Brave search function - synchronous version for ADK compatibility
def brave_web_search_function(query: str, count: int = 5, **kwargs) -> dict[str, Any]:
    """
    Search the web using Brave Search API (sync wrapper for async implementation).

    Args:
        query: Search query string
        count: Number of results to return (default: 5, max: 20)

    Returns:
        Dictionary containing search results
    """
    try:
        # Check if we're already in an async context
        try:
            loop = asyncio.get_running_loop()
            # We're in an async context, need to run in thread pool
            import concurrent.futures

            def run_async():
                # Create new event loop for this thread
                new_loop = asyncio.new_event_loop()
                asyncio.set_event_loop(new_loop)
                try:
                    result = new_loop.run_until_complete(
                        brave_web_search_async(query, count, **kwargs)
                    )
                    return result
                except Exception as e:
                    logger.error(f"Brave async search thread error: {e}")
                    return {"error": str(e), "query": query, "results": []}
                finally:
                    try:
                        new_loop.close()
                    except Exception:
                        pass  # Ignore close errors

            with concurrent.futures.ThreadPoolExecutor() as executor:
                future = executor.submit(run_async)
                return future.result(timeout=60)  # 60 second timeout

        except RuntimeError:
            # No running loop, safe to use asyncio.run
            return asyncio.run(brave_web_search_async(query, count, **kwargs))

    except Exception as e:
        logger.error(f"Brave search wrapper error: {e}")
        return {"error": str(e), "query": query, "results": []}


# Create ADK tool directly from the synchronous function
brave_search = FunctionTool(brave_web_search_function)

# For backward compatibility with google_search naming
web_search = brave_search
