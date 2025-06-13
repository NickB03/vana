"""
Test script for WebSearchClient implementation.

This script tests both the mock implementation and (if credentials are available)
the real implementation of WebSearchClient.

Usage:
    python -m tests.test_web_search
"""

import os
import sys
import unittest
from typing import List, Dict, Any

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from tools.web_search_client import get_web_search_client, MockWebSearchClient, WebSearchClient


class TestWebSearchClient(unittest.TestCase):
    """Test WebSearchClient implementation."""

    def test_mock_client(self):
        """Test the mock client implementation."""
        client = get_web_search_client(use_mock=True)
        
        # Test basic functionality
        self.assertIsInstance(client, MockWebSearchClient)
        
        # Test specific query matching
        results = client.search("VANA architecture")
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]["title"], "VANA Architecture Overview")
        
        # Test another query
        results = client.search("hybrid search in detail")
        self.assertTrue(len(results) > 0)
        self.assertTrue("Hybrid Search" in results[0]["title"])
        
        # Test default results
        results = client.search("something completely unrelated")
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0]["title"], "Generic Search Result")
        
        # Test result count limiting
        results = client.search("VANA architecture", num_results=1)
        self.assertEqual(len(results), 1)
        
        print("Mock client tests passed.")

    def test_real_client(self):
        """Test the real client implementation if credentials are available."""
        # Skip the test if credentials are not available
        if not os.environ.get("GOOGLE_SEARCH_API_KEY") or not os.environ.get("GOOGLE_SEARCH_ENGINE_ID"):
            print("Skipping real client test - API credentials not found.")
            return
            
        try:
            client = get_web_search_client(use_mock=False)
            self.assertIsInstance(client, WebSearchClient)
            
            # Test basic search
            results = client.search("Google Cloud Platform")
            self.assertTrue(len(results) > 0)
            
            # Verify result structure
            result = results[0]
            self.assertIn("title", result)
            self.assertIn("link", result)
            self.assertIn("snippet", result)
            self.assertEqual(result["source"], "web")
            
            # Test result count limiting
            results = client.search("Google Cloud Platform", num_results=3)
            self.assertLessEqual(len(results), 3)
            
            print("Real client tests passed.")
            
        except Exception as e:
            self.fail(f"Real client test failed: {e}")


if __name__ == "__main__":
    # Run tests
    print("Testing WebSearchClient...")
    unittest.main()
