import unittest
import os
import responses
from tools.mcp_memory_client import MCPMemoryClient

class TestMCPClient(unittest.TestCase):
    """Test cases for MCP Memory Client."""
    
    def setUp(self):
        self.endpoint = "https://example.com"
        self.namespace = "test-namespace"
        self.api_key = "test-api-key"
        self.client = MCPMemoryClient(self.endpoint, self.namespace, self.api_key)
    
    @responses.activate
    def test_store_entity(self):
        """Test storing an entity."""
        # Setup mock response
        responses.add(
            responses.POST,
            f"{self.endpoint}/{self.namespace}/memory",
            json={"success": True, "entityId": "test-id"},
            status=200
        )
        
        # Call method
        result = self.client.store_entity(
            "Test Entity", "TestType", ["Observation 1", "Observation 2"]
        )
        
        # Verify result
        self.assertTrue(result.get("success"))
        self.assertEqual(result.get("entityId"), "test-id")
    
    @responses.activate
    def test_sync_delta(self):
        """Test delta synchronization."""
        # Setup mock response
        responses.add(
            responses.POST,
            f"{self.endpoint}/{self.namespace}/memory",
            json={
                "added": [{"id": "new-entity", "name": "New Entity"}],
                "modified": [],
                "deleted": [],
                "currentTimestamp": "2025-04-01T12:00:00Z"
            },
            status=200
        )
        
        # Set last sync timestamp
        self.client.last_sync_timestamp = "2025-03-31T12:00:00Z"
        
        # Call method
        result = self.client.sync_delta()
        
        # Verify result
        self.assertEqual(len(result.get("added", [])), 1)
        self.assertEqual(result.get("added")[0].get("name"), "New Entity")
        self.assertEqual(self.client.last_sync_timestamp, "2025-04-01T12:00:00Z")

if __name__ == "__main__":
    unittest.main()
