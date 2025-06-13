#!/usr/bin/env python3
"""
Memory System Initialization Script

This script initializes the VANA memory system, including:
- Verifying MCP server connectivity
- Setting up local database
- Loading initial data
- Performing initial synchronization
"""

import argparse
import logging
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

from config.environment import EnvironmentConfig

# Import components
from tools.mcp_memory_client import MCPMemoryClient
from tools.memory_cache import MemoryCache
from tools.memory_manager import MemoryManager


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Initialize VANA memory system")
    parser.add_argument("--reset", action="store_true", help="Reset memory system (clear local data)")
    parser.add_argument("--seed", action="store_true", help="Seed memory with initial data")
    parser.add_argument(
        "--env", choices=["development", "test", "production"], default="development", help="Environment to initialize"
    )
    return parser.parse_args()


def reset_memory_system():
    """Reset the memory system by clearing local data."""
    logger.info("Resetting memory system...")

    # Get data directory
    data_dir = EnvironmentConfig.get_data_dir()
    db_path = os.path.join(data_dir, "memory_cache.db")

    # Remove local database if it exists
    if os.path.exists(db_path):
        os.remove(db_path)
        logger.info(f"Removed local database: {db_path}")

    logger.info("Memory system reset complete")


def seed_memory_system(memory_manager):
    """Seed the memory system with initial data."""
    logger.info("Seeding memory system with initial data...")

    # Example entities to seed
    entities = [
        {
            "name": "VANA",
            "type": "Agent",
            "observations": [
                "VANA is the primary agent in the system",
                "VANA uses a hybrid memory architecture with Knowledge Graph and Vector Search",
                "VANA was previously known as Ben",
            ],
        },
        {
            "name": "Memory Architecture",
            "type": "Concept",
            "observations": [
                "The memory architecture uses MCP for Knowledge Graph storage",
                "The memory architecture includes local fallback using SQLite",
                "The memory architecture implements delta-based synchronization",
            ],
        },
        {
            "name": "Vector Search",
            "type": "Component",
            "observations": [
                "Vector Search is implemented using Vertex AI Vector Search",
                "Vector Search provides semantic search capabilities",
                "Vector Search requires explicit float conversion for embeddings",
            ],
        },
    ]

    # Store entities
    for entity in entities:
        result = memory_manager.store_entity(entity["name"], entity["type"], entity["observations"])

        if result.get("success", False):
            logger.info(f"Stored entity: {entity['name']}")
        else:
            logger.error(f"Failed to store entity {entity['name']}: {result.get('error', 'Unknown error')}")

    # Create relationships
    relationships = [
        {"from": "VANA", "relationship": "uses", "to": "Memory Architecture"},
        {"from": "Memory Architecture", "relationship": "includes", "to": "Vector Search"},
    ]

    # Store relationships if MCP is available
    if memory_manager.mcp_available:
        for rel in relationships:
            try:
                result = memory_manager.mcp_client.create_relationship(rel["from"], rel["relationship"], rel["to"])

                if "error" not in result:
                    logger.info(f"Created relationship: {rel['from']} {rel['relationship']} {rel['to']}")
                else:
                    logger.error(f"Failed to create relationship: {result.get('error', 'Unknown error')}")
            except Exception as e:
                logger.error(f"Error creating relationship: {e}")

    logger.info("Memory system seeding complete")


def initialize_memory_system(args):
    """Initialize the memory system."""
    logger.info(f"Initializing memory system for {args.env} environment...")

    # Set environment
    os.environ["VANA_ENV"] = args.env

    # Reset if requested
    if args.reset:
        reset_memory_system()

    # Initialize components
    logger.info("Initializing memory components...")

    mcp_client = MCPMemoryClient()
    memory_manager = MemoryManager(mcp_client)
    memory_cache = MemoryCache()

    # Check MCP server connectivity
    if mcp_client.is_available:
        logger.info("MCP server is available")
    else:
        logger.warning("MCP server is not available, will use local storage")

    # Initialize memory manager
    init_result = memory_manager.initialize()

    if init_result:
        logger.info("Memory manager initialized successfully")
    else:
        logger.error("Failed to initialize memory manager")
        return False

    # Seed with initial data if requested
    if args.seed:
        seed_memory_system(memory_manager)

    # Perform initial sync
    sync_result = memory_manager.sync()

    if sync_result:
        logger.info("Initial synchronization completed successfully")
    else:
        logger.warning("Initial synchronization failed or skipped (MCP server not available)")

    logger.info("Memory system initialization complete")
    return True


if __name__ == "__main__":
    args = parse_args()
    success = initialize_memory_system(args)
    sys.exit(0 if success else 1)
