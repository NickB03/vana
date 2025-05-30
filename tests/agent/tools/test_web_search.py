"""
Tests for the Web Search tool.
"""

import unittest
from unittest.mock import patch, MagicMock
from agent.tools.web_search import WebSearchTool, search, search_mock

class TestWebSearchTool(unittest.TestCase):
    """Test cases for the WebSearchTool class."""
    
    def setUp(self):
        """Set up test environment."""
        # Create a tool instance with mock client
        self.web_search_tool = WebSearchTool(use_mock=True)
        
    def test_initialization(self):
        """Test tool initialization."""
        self.assertTrue(self.web_search_tool.use_mock)
        
        # Test with custom parameters
        tool = WebSearchTool(use_mock=False)
        self.assertFalse(tool.use_mock)
        
    @patch('agent.tools.web_search.get_web_search_client')
    def test_search_with_real_client(self, mock_get_client):
        """Test searching with real client."""
        # Set up mock client
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # Set up mock search results (Google CSE API format)
        mock_results = {
            "items": [
                {
                    "title": "Test Result 1",
                    "link": "https://example.com/1",
                    "snippet": "This is test result 1"
                },
                {
                    "title": "Test Result 2",
                    "link": "https://example.com/2",
                    "snippet": "This is test result 2"
                }
            ]
        }
        mock_client.search.return_value = mock_results
        
        # Create tool with the mocked client
        tool = WebSearchTool(use_mock=False)
        
        # Test search with valid parameters
        result = tool.search("test query", 2)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["results"]), 2)
        
        # Check that results are formatted correctly
        formatted_results = result["results"]
        self.assertEqual(formatted_results[0]["title"], "Test Result 1")
        self.assertEqual(formatted_results[0]["link"], "https://example.com/1")
        self.assertEqual(formatted_results[0]["snippet"], "This is test result 1")
        self.assertEqual(formatted_results[0]["source"], "web")
        
        # Test with invalid query
        result = tool.search("", 2)
        self.assertFalse(result["success"])
        self.assertIn("Invalid query", result["error"])
        
        # Test with invalid num_results
        result = tool.search("test query", 0)
        self.assertFalse(result["success"])
        self.assertIn("Invalid num_results", result["error"])
        
        # Test with API error
        mock_client.search.return_value = {"error": "API error", "details": "Test error details"}
        result = tool.search("test query", 2)
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "API error")
        self.assertEqual(result["details"], "Test error details")
        
        # Test with exception
        mock_client.search.side_effect = Exception("Test exception")
        result = tool.search("test query", 2)
        self.assertFalse(result["success"])
        self.assertIn("Test exception", result["error"])
        
    @patch('agent.tools.web_search.get_web_search_client')
    def test_search_with_mock_client(self, mock_get_client):
        """Test searching with mock client."""
        # Set up mock client
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        
        # Set up mock search results (mock client format)
        mock_results = [
            {
                "title": "Mock Result 1",
                "link": "https://example.com/mock1",
                "snippet": "This is mock result 1",
                "source": "web"
            },
            {
                "title": "Mock Result 2",
                "link": "https://example.com/mock2",
                "snippet": "This is mock result 2",
                "source": "web"
            }
        ]
        mock_client.search.return_value = mock_results
        
        # Create tool with the mocked client
        tool = WebSearchTool(use_mock=True)
        
        # Test search with valid parameters
        result = tool.search("test query", 2)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["results"]), 2)
        
        # Check that results are formatted correctly
        formatted_results = result["results"]
        self.assertEqual(formatted_results[0]["title"], "Mock Result 1")
        self.assertEqual(formatted_results[0]["link"], "https://example.com/mock1")
        self.assertEqual(formatted_results[0]["snippet"], "This is mock result 1")
        self.assertEqual(formatted_results[0]["source"], "web")
        
    def test_get_metadata(self):
        """Test getting tool metadata."""
        metadata = self.web_search_tool.get_metadata()
        
        self.assertEqual(metadata["name"], "web_search")
        self.assertIn("description", metadata)
        self.assertIn("operations", metadata)
        
        # Check operations
        operations = metadata["operations"]
        self.assertEqual(len(operations), 1)
        self.assertEqual(operations[0]["name"], "search")
        
        # Check parameters
        parameters = operations[0]["parameters"]
        param_names = [param["name"] for param in parameters]
        self.assertIn("query", param_names)
        self.assertIn("num_results", param_names)
        
    @patch('agent.tools.web_search.WebSearchTool')
    def test_function_wrappers(self, mock_tool_class):
        """Test the function wrappers."""
        # Set up mock tool
        mock_tool = MagicMock()
        mock_tool_class.return_value = mock_tool
        
        # Set up mock results
        mock_search_result = {
            "success": True,
            "results": [
                {"title": "Result 1", "link": "https://example.com/1", "snippet": "Snippet 1", "source": "web"},
                {"title": "Result 2", "link": "https://example.com/2", "snippet": "Snippet 2", "source": "web"}
            ]
        }
        mock_tool.search.return_value = mock_search_result
        
        # Test search wrapper
        results = search("test query", 2)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["title"], "Result 1")
        
        # Test with error results
        mock_tool.search.return_value = {"success": False, "error": "Test error"}
        result = search("test query", 2)
        self.assertEqual(result, {"success": False, "error": "Test error"})
        
        # Test search_mock wrapper
        mock_tool_class.reset_mock()
        mock_tool.search.return_value = mock_search_result
        results = search_mock("test query", 2)
        self.assertEqual(len(results), 2)
        
        # Verify that use_mock=True was passed to the constructor
        mock_tool_class.assert_called_with(use_mock=True)
        
if __name__ == "__main__":
    unittest.main()
