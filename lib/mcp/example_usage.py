"""
Example usage of the MCP Integration System.

This script demonstrates how to use the MCP integration system to connect
to external MCP servers and execute tools.
"""

import asyncio
import logging
import os
from pathlib import Path

from lib.mcp.core.mcp_manager import MCPManager
from lib.mcp.core.mcp_registry import MCPRegistry, ServerInfo, ServerStatus
from lib.mcp.servers.brave_search_server import BraveSearchServer
from lib.mcp.servers.fetch_server import FetchServer
from lib.mcp.servers.github_server import GitHubServer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def demonstrate_mcp_manager():
    """Demonstrate MCP Manager functionality."""
    logger.info("=== MCP Manager Demonstration ===")

    # Get configuration path
    config_path = Path(__file__).parent / "config" / "servers.json"

    # Create MCP Manager
    manager = MCPManager(str(config_path))

    try:
        # Start GitHub server (if token is available)
        if os.getenv("GITHUB_TOKEN"):
            logger.info("Starting GitHub server...")
            github_instance = await manager.start_server("github")
            logger.info(f"GitHub server started with {len(github_instance.tools)} tools")

            # Discover tools
            tools = await manager.discover_tools("github")
            logger.info(f"Discovered tools: {[tool.name for tool in tools]}")

            # Execute a tool (example)
            if tools:
                result = await manager.execute_tool("github", "list_repositories", {"user": "octocat", "limit": 5})
                logger.info(f"Tool execution result: {result.success}")

            # Check health
            health = await manager.get_server_health("github")
            logger.info(f"GitHub server health: {health.is_healthy}")

        # Start Brave Search server (if API key is available)
        if os.getenv("BRAVE_API_KEY"):
            logger.info("Starting Brave Search server...")
            brave_instance = await manager.start_server("brave_search")
            logger.info(f"Brave Search server started with {len(brave_instance.tools)} tools")

        # Start Fetch server (always available)
        logger.info("Starting Fetch server...")
        fetch_instance = await manager.start_server("fetch")
        logger.info(f"Fetch server started with {len(fetch_instance.tools)} tools")

        # Get all servers and tools
        all_servers = manager.get_all_servers()
        all_tools = manager.get_all_tools()

        logger.info(f"Total servers running: {len(all_servers)}")
        logger.info(f"Total tools available: {sum(len(tools) for tools in all_tools.values())}")

    finally:
        # Shutdown all servers
        await manager.shutdown()
        logger.info("All servers shut down")


def demonstrate_mcp_registry():
    """Demonstrate MCP Registry functionality."""
    logger.info("=== MCP Registry Demonstration ===")

    # Create registry
    registry = MCPRegistry()

    # Register servers
    github_server = ServerInfo(
        name="github",
        description="GitHub API integration for repository and issue management",
        capabilities=["repositories", "issues", "pull_requests", "search"],
        tools=["create_repository", "list_repositories", "create_issue", "search_code"],
        status=ServerStatus.RUNNING,
        tags={"development", "version_control", "collaboration"},
    )

    brave_server = ServerInfo(
        name="brave_search",
        description="Brave Search API integration for web search capabilities",
        capabilities=["web_search", "news_search", "image_search", "video_search"],
        tools=["web_search", "news_search", "image_search", "video_search"],
        status=ServerStatus.RUNNING,
        tags={"search", "web", "information"},
    )

    fetch_server = ServerInfo(
        name="fetch",
        description="HTTP client for web requests and content fetching",
        capabilities=["http_requests", "web_scraping", "file_download"],
        tools=["http_get", "http_post", "scrape_content", "download_file"],
        status=ServerStatus.RUNNING,
        tags={"http", "web", "content"},
    )

    # Register all servers
    registry.register_server(github_server)
    registry.register_server(brave_server)
    registry.register_server(fetch_server)

    logger.info("Registered 3 servers in registry")

    # Demonstrate tool discovery
    repo_servers = registry.find_tool("create_repository")
    logger.info(f"Servers with 'create_repository' tool: {[s.name for s in repo_servers]}")

    search_servers = registry.find_tool("web_search")
    logger.info(f"Servers with 'web_search' tool: {[s.name for s in search_servers]}")

    # Demonstrate capability discovery
    dev_servers = registry.find_by_capability("repositories")
    logger.info(f"Servers with 'repositories' capability: {[s.name for s in dev_servers]}")

    search_cap_servers = registry.find_by_capability("web_search")
    logger.info(f"Servers with 'web_search' capability: {[s.name for s in search_cap_servers]}")

    # Demonstrate tag discovery
    dev_tagged = registry.find_by_tag("development")
    logger.info(f"Servers tagged 'development': {[s.name for s in dev_tagged]}")

    web_tagged = registry.find_by_tag("web")
    logger.info(f"Servers tagged 'web': {[s.name for s in web_tagged]}")

    # Get all tools
    all_tools = registry.get_all_tools()
    logger.info(f"All tools in registry: {dict(all_tools)}")


def demonstrate_github_server():
    """Demonstrate GitHub Server functionality."""
    logger.info("=== GitHub Server Demonstration ===")

    # Check if GitHub token is available
    github_token = os.getenv("GITHUB_TOKEN")
    if not github_token:
        logger.warning("GITHUB_TOKEN not set, skipping GitHub demonstration")
        return

    # Create GitHub server
    github = GitHubServer(github_token)

    try:
        # List repositories for a user
        repos = github.list_repositories("octocat", limit=5)
        logger.info(f"Found {len(repos)} repositories for octocat")

        if repos:
            repo = repos[0]
            logger.info(f"First repo: {repo.name} ({repo.language}) - {repo.stars} stars")

        # Search for issues
        issues = github.search_issues("bug", repo="octocat/Hello-World")
        logger.info(f"Found {len(issues)} issues with 'bug' in octocat/Hello-World")

        # Search code
        code_results = github.search_code("function", language="python")
        logger.info(f"Found {len(code_results)} code results for 'function' in Python")

    except Exception as e:
        logger.error(f"GitHub API error: {e}")


def demonstrate_brave_search_server():
    """Demonstrate Brave Search Server functionality."""
    logger.info("=== Brave Search Server Demonstration ===")

    # Check if Brave API key is available
    brave_api_key = os.getenv("BRAVE_API_KEY")
    if not brave_api_key:
        logger.warning("BRAVE_API_KEY not set, skipping Brave Search demonstration")
        return

    # Create Brave Search server
    brave = BraveSearchServer(brave_api_key)

    try:
        # Web search
        web_results = brave.web_search("Python programming", count=5)
        logger.info(f"Web search found {len(web_results.results)} results")
        logger.info(f"Search took {web_results.search_time:.2f} seconds")

        if web_results.results:
            first_result = web_results.results[0]
            logger.info(f"First result: {first_result.title}")

        # News search
        news_results = brave.news_search("artificial intelligence", count=3)
        logger.info(f"News search found {len(news_results.results)} results")

        # Get suggestions
        suggestions = brave.get_suggestions("machine learn")
        logger.info(f"Search suggestions: {suggestions[:3]}")

    except Exception as e:
        logger.error(f"Brave Search API error: {e}")


def demonstrate_fetch_server():
    """Demonstrate Fetch Server functionality."""
    logger.info("=== Fetch Server Demonstration ===")

    # Create Fetch server
    fetch = FetchServer()

    try:
        # HTTP GET request
        response = fetch.http_get("https://httpbin.org/get", params={"test": "value"})
        logger.info(f"HTTP GET: {response.status_code} - {response.size} bytes")

        # Check URL status
        status = fetch.check_url_status("https://github.com")
        logger.info(f"GitHub status: {status.status_code} - accessible: {status.accessible}")
        logger.info(f"Response time: {status.response_time:.3f} seconds")

        # Scrape content (simple example)
        try:
            scraped = fetch.scrape_content("https://httpbin.org/html")
            logger.info(f"Scraped content: {len(scraped.content)} characters")
            if scraped.title:
                logger.info(f"Page title: {scraped.title}")
        except Exception as e:
            logger.warning(f"Content scraping failed: {e}")

    except Exception as e:
        logger.error(f"Fetch server error: {e}")


async def main():
    """Main demonstration function."""
    logger.info("Starting MCP Integration System Demonstration")

    # Demonstrate each component
    await demonstrate_mcp_manager()
    demonstrate_mcp_registry()
    demonstrate_github_server()
    demonstrate_brave_search_server()
    demonstrate_fetch_server()

    logger.info("MCP Integration System Demonstration Complete")


if __name__ == "__main__":
    # Set up environment variables for testing (optional)
    # os.environ["GITHUB_TOKEN"] = "your_github_token_here"
    # os.environ["BRAVE_API_KEY"] = "your_brave_api_key_here"

    # Run the demonstration
    asyncio.run(main())
