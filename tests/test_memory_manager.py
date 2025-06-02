import time
import unittest
from unittest.mock import MagicMock

from tools.memory_manager import MemoryManager


class TestMemoryManager(unittest.TestCase):
    """Test cases for Memory Manager."""

    def setUp(self):
        self.mock_client = MagicMock()
        self.manager = MemoryManager(self.mock_client, sync_interval=60)

    def test_initialize(self):
        """Test initialization of memory manager."""
        # Setup mock response
        self.mock_client.get_initial_data.return_value = {
            "entities": [
                {"id": "entity1", "name": "Entity 1"},
                {"id": "entity2", "name": "Entity 2"},
            ]
        }

        # Call method
        result = self.manager.initialize()

        # Verify result
        self.assertTrue(result)
        self.assertEqual(len(self.manager.local_cache), 2)
        self.assertIn("entity1", self.manager.local_cache)
        self.assertIn("entity2", self.manager.local_cache)

    def test_sync(self):
        """Test synchronization with delta updates."""
        # Setup mock response
        self.mock_client.sync_delta.return_value = {
            "added": [{"id": "entity3", "name": "Entity 3"}],
            "modified": [{"id": "entity1", "name": "Entity 1 Updated"}],
            "deleted": ["entity2"],
        }

        # Set up initial cache
        self.manager.local_cache = {
            "entity1": {"id": "entity1", "name": "Entity 1"},
            "entity2": {"id": "entity2", "name": "Entity 2"},
        }

        # Call method
        result = self.manager.sync()

        # Verify result
        self.assertTrue(result)
        self.assertEqual(
            len(self.manager.local_cache), 2
        )  # One added, one modified, one deleted
        self.assertEqual(
            self.manager.local_cache["entity1"]["name"], "Entity 1 Updated"
        )
        self.assertIn("entity3", self.manager.local_cache)
        self.assertNotIn("entity2", self.manager.local_cache)

    def test_sync_if_needed(self):
        """Test sync_if_needed method."""
        # Mock the sync method
        self.manager.sync = MagicMock(return_value=True)

        # Set last sync time to now
        self.manager.last_sync_time = time.time()

        # Call method - should not sync as interval hasn't passed
        self.manager.sync_if_needed()
        self.manager.sync.assert_not_called()

        # Set last sync time to more than interval ago
        self.manager.last_sync_time = time.time() - 120

        # Call method - should sync
        self.manager.sync_if_needed()
        self.manager.sync.assert_called_once()


if __name__ == "__main__":
    unittest.main()
