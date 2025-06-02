#!/usr/bin/env python3
"""
Test Local Memory System

This script tests the memory system with the local MCP server.
"""

import logging
import os
import sys

from dotenv import load_dotenv

# Add project root to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def test_local_memory():
    """Test the memory system with the local MCP server."""
    # Set environment variables for local MCP server
    os.environ["MCP_ENDPOINT"] = "http://localhost:5000"
    os.environ["MCP_NAMESPACE"] = "vana-dev"
    os.environ["MCP_API_KEY"] = "local_dev_key"
    os.environ["USE_LOCAL_MCP"] = "true"

    # Import memory components
    from tools.hybrid_search_delta import HybridSearchDelta
    from tools.mcp_memory_client import MCPMemoryClient
    from tools.memory_manager import MemoryManager

    logger.info("Testing memory system with local MCP server...")

    # Initialize MCP client
    mcp_client = MCPMemoryClient()

    # Check if client is connected to local server
    logger.info(f"MCP client endpoint: {mcp_client.endpoint}")
    logger.info(f"MCP client namespace: {mcp_client.namespace}")

    # Test storing an entity
    logger.info("Testing store_entity...")
    result = mcp_client.store_entity(
        entity_name="Local Test Entity",
        entity_type="Test",
        observations=["This is a test entity created for local MCP testing"],
    )

    if result.get("success", False):
        logger.info("✅ Successfully stored entity")
        entity_id = result.get("entity", {}).get("id", "Unknown")
        logger.info(f"Entity ID: {entity_id}")
    else:
        logger.warning(
            f"⚠️ Failed to store entity: {result.get('error', 'Unknown error')}"
        )

    # Initialize memory manager
    logger.info("Initializing memory manager...")
    memory_manager = MemoryManager(mcp_client)
    success = memory_manager.initialize()

    if success:
        logger.info("✅ Memory manager initialized successfully")
        logger.info(f"Loaded {len(memory_manager.local_cache)} entities")
    else:
        logger.warning("⚠️ Memory manager initialization failed")

    # Test hybrid search
    logger.info("Testing hybrid search...")
    hybrid_search = HybridSearchDelta(memory_manager)

    # Perform search
    search_query = "test entity"
    logger.info(f"Searching for: {search_query}")

    import asyncio

    search_results = asyncio.run(hybrid_search.search(search_query))

    if search_results and "results" in search_results:
        logger.info(f"✅ Search returned {len(search_results['results'])} results")
        for i, result in enumerate(search_results["results"]):
            logger.info(
                f"Result {i+1}: {result.get('name', 'Unknown')} ({result.get('source_type', 'Unknown')})"
            )
    else:
        logger.warning("⚠️ Search returned no results")

    logger.info("Local memory system test complete!")


if __name__ == "__main__":
    test_local_memory()
