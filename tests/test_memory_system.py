#!/usr/bin/env python3
"""
Memory System Integration Test

This script tests the entire memory system, including:
- MCP Memory Client
- Memory Manager
- Memory Cache
- Local fallback functionality
"""

import logging
import os
import sys
import unittest
from datetime import datetime
from unittest.mock import patch

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Import components
from tools.mcp_memory_client import MCPMemoryClient
from tools.memory_cache import MemoryCache
from tools.memory_manager import MemoryManager


class MemorySystemTest(unittest.TestCase):
    """Test suite for the memory system."""

    def setUp(self):
        """Set up test environment."""
        # Set test environment
        os.environ["VANA_ENV"] = "test"
        os.environ["USE_LOCAL_MCP"] = "true"
        os.environ["MCP_ENDPOINT"] = "http://localhost:5000"
        os.environ["MCP_NAMESPACE"] = "vana-test"
        os.environ["MCP_API_KEY"] = "test_key"

        # Create test directory
        self.test_data_dir = os.path.join(os.path.dirname(__file__), "test_data")
        os.makedirs(self.test_data_dir, exist_ok=True)
        os.environ["VANA_DATA_DIR"] = self.test_data_dir

        # Initialize components
        self.mcp_client = MCPMemoryClient()
        self.memory_manager = MemoryManager(self.mcp_client)
        self.memory_cache = MemoryCache(max_size=100, ttl=60)

        # Test data
        self.test_entity = {
            "name": f"Test Entity {datetime.now().isoformat()}",
            "type": "TestType",
            "observations": ["This is a test entity"],
        }

    def tearDown(self):
        """Clean up after tests."""
        # Clean up test data
        if os.path.exists(os.path.join(self.test_data_dir, "memory_cache.db")):
            os.remove(os.path.join(self.test_data_dir, "memory_cache.db"))

    def test_mcp_client_connection(self):
        """Test MCP client connection."""
        # Check if MCP server is available
        is_available = self.mcp_client._verify_connection()

        if is_available:
            logger.info("MCP server is available, testing real connection")
            self.assertTrue(is_available)
        else:
            logger.warning("MCP server is not available, skipping real connection test")
            self.skipTest("MCP server is not available")

    def test_memory_manager_initialization(self):
        """Test memory manager initialization."""
        # Initialize memory manager
        result = self.memory_manager.initialize()
        self.assertTrue(result)

        # Check if local cache is populated
        self.assertIsInstance(self.memory_manager.local_cache, dict)

    def test_store_and_retrieve_entity(self):
        """Test storing and retrieving an entity."""
        # Store entity
        result = self.memory_manager.store_entity(
            self.test_entity["name"],
            self.test_entity["type"],
            self.test_entity["observations"],
        )

        self.assertTrue(result.get("success", False))

        # Retrieve entity
        retrieve_result = self.memory_manager.retrieve_entity(self.test_entity["name"])

        self.assertTrue(retrieve_result.get("success", False))
        self.assertEqual(
            retrieve_result.get("entity", {}).get("name"), self.test_entity["name"]
        )

    def test_memory_cache(self):
        """Test memory cache functionality."""
        # Add item to cache
        key = "test_key"
        value = {"name": "Test Value", "type": "TestType"}

        self.memory_cache.set(key, value)

        # Get item from cache
        cached_value = self.memory_cache.get(key)

        self.assertEqual(cached_value, value)

        # Test cache by name
        self.memory_cache.set("entity_key", {"name": "Entity Name", "type": "TestType"})

        by_name = self.memory_cache.get_by_name("Entity Name")
        self.assertIsNotNone(by_name)

        # Test cache by type
        by_type = self.memory_cache.get_by_type("TestType")
        self.assertGreater(len(by_type), 0)

        # Test cache search
        search_results = self.memory_cache.search("Test")
        self.assertGreater(len(search_results), 0)

        # Test cache stats
        stats = self.memory_cache.get_stats()
        self.assertIn("hit_count", stats)
        self.assertIn("miss_count", stats)

    def test_local_fallback(self):
        """Test local fallback when MCP server is not available."""
        # Mock MCP client to simulate unavailability
        with patch.object(self.mcp_client, "is_available", False):
            # Initialize memory manager with unavailable MCP client
            memory_manager = MemoryManager(self.mcp_client)
            result = memory_manager.initialize()

            self.assertTrue(result)

            # Store entity locally
            entity_name = f"Local Entity {datetime.now().isoformat()}"
            store_result = memory_manager.store_entity(
                entity_name, "LocalType", ["This is a local entity"]
            )

            self.assertTrue(store_result.get("success", False))

            # Retrieve entity from local storage
            retrieve_result = memory_manager.retrieve_entity(entity_name)

            self.assertTrue(retrieve_result.get("success", False))
            self.assertEqual(retrieve_result.get("entity", {}).get("name"), entity_name)

    def test_sync_functionality(self):
        """Test synchronization functionality."""
        # Initialize memory manager
        self.memory_manager.initialize()

        # Store entity
        self.memory_manager.store_entity(
            self.test_entity["name"],
            self.test_entity["type"],
            self.test_entity["observations"],
        )

        # Force sync
        sync_result = self.memory_manager.sync()

        # Check sync result based on MCP availability
        if self.mcp_client.is_available:
            self.assertTrue(sync_result)
        else:
            self.assertFalse(sync_result)

    def test_error_handling(self):
        """Test error handling in the memory system."""
        # Test invalid entity retrieval
        retrieve_result = self.memory_manager.retrieve_entity("NonExistentEntity")

        self.assertFalse(retrieve_result.get("success", True))
        self.assertIn("error", retrieve_result)

        # Test MCP client with invalid endpoint
        with patch.object(self.mcp_client, "endpoint", "http://invalid-endpoint"):
            result = self.mcp_client._verify_connection()
            self.assertFalse(result)


def run_tests():
    """Run the test suite."""
    unittest.main(argv=["first-arg-is-ignored"], exit=False)


if __name__ == "__main__":
    run_tests()
