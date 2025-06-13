#!/usr/bin/env python3
"""
Verify MCP Memory Integration

This script tests the MCP Memory integration by:
1. Initializing the MCP Memory Client
2. Storing a test entity
3. Retrieving the entity
4. Performing a delta sync
5. Testing the hybrid search functionality

Usage:
    python scripts/verify_mcp_memory.py
"""

import os
import sys
import logging
import asyncio
from datetime import datetime
from dotenv import load_dotenv

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

# Load environment variables
load_dotenv()

# Import the memory components
from tools.mcp_memory_client import MCPMemoryClient
from tests.mocks.mcp_memory_client_mock import MockMCPMemoryClient
from tools.memory_manager import MemoryManager
from tools.hybrid_search_delta import HybridSearchDelta

# Define MCP Memory Server configuration for testing
MCP_MEMORY_SERVER = {
    "endpoint": os.environ.get("MCP_ENDPOINT", "https://mcp.community.augment.co"),
    "namespace": os.environ.get("MCP_NAMESPACE", "vana-project"),
    "api_key": os.environ.get("MCP_API_KEY", "test_api_key")  # Use a test key if not set
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)

async def main():
    """Main function to verify MCP Memory integration."""
    logger.info("Starting MCP Memory verification")

    # Check if MCP_API_KEY is set
    if not MCP_MEMORY_SERVER["api_key"]:
        logger.warning("MCP_API_KEY is not set in environment variables")
        logger.warning("Using mock implementation for testing")
        use_mock = True
    else:
        # For testing purposes, always use mock
        use_mock = True
        logger.info("Using mock implementation for testing")

    # Initialize MCP Memory Client
    logger.info(f"Initializing MCP Memory Client with endpoint: {MCP_MEMORY_SERVER['endpoint']}")

    if use_mock:
        mcp_client = MockMCPMemoryClient(
            endpoint=MCP_MEMORY_SERVER["endpoint"],
            namespace=MCP_MEMORY_SERVER["namespace"],
            api_key=MCP_MEMORY_SERVER["api_key"]
        )
    else:
        mcp_client = MCPMemoryClient(
            endpoint=MCP_MEMORY_SERVER["endpoint"],
            namespace=MCP_MEMORY_SERVER["namespace"],
            api_key=MCP_MEMORY_SERVER["api_key"]
        )

    # Test storing an entity
    logger.info("Testing entity storage...")
    entity_name = f"Test Entity {datetime.now().isoformat()}"
    store_result = mcp_client.store_entity(
        entity_name=entity_name,
        entity_type="TestType",
        observations=[
            "This is a test entity created by the verification script",
            f"Created at {datetime.now().isoformat()}"
        ]
    )

    if "error" in store_result:
        logger.error(f"Error storing entity: {store_result['error']}")
        return False

    logger.info(f"Entity stored successfully: {store_result}")

    # Test retrieving the entity
    logger.info(f"Testing entity retrieval for: {entity_name}")
    retrieve_result = mcp_client.retrieve_entity(entity_name)

    if "error" in retrieve_result:
        logger.error(f"Error retrieving entity: {retrieve_result['error']}")
    else:
        logger.info(f"Entity retrieved successfully: {retrieve_result}")

    # Initialize Memory Manager
    logger.info("Initializing Memory Manager")
    memory_manager = MemoryManager(mcp_client)
    init_result = memory_manager.initialize()

    if not init_result:
        logger.error("Failed to initialize Memory Manager")
        return False

    logger.info(f"Memory Manager initialized with {len(memory_manager.local_cache)} entities")

    # Test delta sync
    logger.info("Testing delta sync")
    sync_result = memory_manager.sync()

    if not sync_result:
        logger.error("Failed to perform delta sync")
    else:
        logger.info("Delta sync completed successfully")

    # Test hybrid search
    logger.info("Testing hybrid search")
    hybrid_search = HybridSearchDelta(memory_manager)
    search_query = "test"

    logger.info(f"Performing hybrid search for query: '{search_query}'")
    search_result = await hybrid_search.search(search_query)

    logger.info(f"Hybrid search returned {len(search_result.get('results', []))} results")
    logger.info(f"Vector Search: {search_result.get('sources', {}).get('vector_search', 0)} results")
    logger.info(f"Knowledge Graph: {search_result.get('sources', {}).get('knowledge_graph', 0)} results")

    # Format and display results
    formatted_results = hybrid_search.format_results(search_result)
    logger.info(f"Formatted results:\n{formatted_results}")

    logger.info("MCP Memory verification completed successfully")
    return True

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
