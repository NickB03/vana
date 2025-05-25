"""
Tests for the Vector Search tool.
"""

import unittest
from unittest.mock import patch, MagicMock
from agent.tools.vector_search import VectorSearchTool, search, search_knowledge, get_health_status, upload_content

class TestVectorSearchTool(unittest.TestCase):
    """Test cases for the VectorSearchTool class."""
    
    def setUp(self):
        """Set up test environment."""
        # Create a tool instance with mock client
        self.vector_search_tool = VectorSearchTool(use_mock=True)
        
    def test_initialization(self):
        """Test tool initialization."""
        self.assertTrue(self.vector_search_tool.use_mock)
        self.assertTrue(self.vector_search_tool.auto_fallback)
        
        # Test with custom parameters
        tool = VectorSearchTool(use_mock=False, auto_fallback=False)
        self.assertFalse(tool.use_mock)
        self.assertFalse(tool.auto_fallback)
        
    @patch('agent.tools.vector_search.VectorSearchClient')
    def test_search(self, mock_client_class):
        """Test searching with Vector Search."""
        # Set up mock client
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        # Set up mock search results
        mock_results = [
            {
                "content": "Test content 1",
                "score": 0.9,
                "metadata": {"source": "test-source-1"},
                "id": "test-id-1"
            },
            {
                "content": "Test content 2",
                "score": 0.8,
                "metadata": {"source": "test-source-2"},
                "id": "test-id-2"
            }
        ]
        mock_client.search.return_value = mock_results
        
        # Create tool with the mocked client
        tool = VectorSearchTool()
        
        # Test search with valid parameters
        result = tool.search("test query", 2)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["results"]), 2)
        
        # Check that results are formatted correctly
        formatted_results = result["results"]
        self.assertEqual(formatted_results[0]["content"], "Test content 1")
        self.assertEqual(formatted_results[0]["score"], 0.9)
        self.assertEqual(formatted_results[0]["source"], "test-source-1")
        self.assertEqual(formatted_results[0]["id"], "test-id-1")
        
        # Test with invalid query
        result = tool.search("", 2)
        self.assertFalse(result["success"])
        self.assertIn("Invalid query", result["error"])
        
        # Test with invalid top_k
        result = tool.search("test query", 0)
        self.assertFalse(result["success"])
        self.assertIn("Invalid top_k", result["error"])
        
        # Test with client error
        mock_client.search.return_value = {"error": "Test error"}
        result = tool.search("test query", 2)
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "Test error")
        
        # Test with exception
        mock_client.search.side_effect = Exception("Test exception")
        result = tool.search("test query", 2)
        self.assertFalse(result["success"])
        self.assertIn("Test exception", result["error"])
        
    @patch('agent.tools.vector_search.VectorSearchClient')
    def test_search_knowledge(self, mock_client_class):
        """Test searching knowledge with Vector Search."""
        # Set up mock client
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        # Set up mock search results
        mock_results = [
            {
                "content": "Knowledge content 1",
                "score": 0.9,
                "source": "knowledge-source-1",
                "id": "knowledge-id-1",
                "metadata": {"source": "knowledge-source-1"},
                "vector_source": True
            },
            {
                "content": "Knowledge content 2",
                "score": 0.8,
                "source": "knowledge-source-2",
                "id": "knowledge-id-2",
                "metadata": {"source": "knowledge-source-2"},
                "vector_source": True
            }
        ]
        mock_client.search_knowledge.return_value = mock_results
        
        # Create tool with the mocked client
        tool = VectorSearchTool()
        
        # Test search_knowledge with valid parameters
        result = tool.search_knowledge("test query", 2)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["results"]), 2)
        
        # Check that results are returned correctly
        knowledge_results = result["results"]
        self.assertEqual(knowledge_results[0]["content"], "Knowledge content 1")
        self.assertEqual(knowledge_results[0]["score"], 0.9)
        self.assertEqual(knowledge_results[0]["source"], "knowledge-source-1")
        self.assertEqual(knowledge_results[0]["id"], "knowledge-id-1")
        self.assertTrue(knowledge_results[0]["vector_source"])
        
        # Test with invalid query
        result = tool.search_knowledge("", 2)
        self.assertFalse(result["success"])
        self.assertIn("Invalid query", result["error"])
        
        # Test with invalid top_k
        result = tool.search_knowledge("test query", 0)
        self.assertFalse(result["success"])
        self.assertIn("Invalid top_k", result["error"])
        
        # Test with client error
        mock_client.search_knowledge.return_value = {"error": "Test error"}
        result = tool.search_knowledge("test query", 2)
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "Test error")
        
        # Test with exception
        mock_client.search_knowledge.side_effect = Exception("Test exception")
        result = tool.search_knowledge("test query", 2)
        self.assertFalse(result["success"])
        self.assertIn("Test exception", result["error"])
        
    @patch('agent.tools.vector_search.VectorSearchClient')
    def test_get_health_status(self, mock_client_class):
        """Test getting health status."""
        # Set up mock client
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        # Set up mock health status
        mock_status = {
            "status": "healthy",
            "message": "Vector Search is healthy",
            "details": {"initialized": True, "using_mock": False}
        }
        mock_client.get_health_status.return_value = mock_status
        
        # Create tool with the mocked client
        tool = VectorSearchTool()
        
        # Test get_health_status
        result = tool.get_health_status()
        self.assertTrue(result["success"])
        self.assertEqual(result["status"], mock_status)
        
        # Test with exception
        mock_client.get_health_status.side_effect = Exception("Test exception")
        result = tool.get_health_status()
        self.assertFalse(result["success"])
        self.assertIn("Test exception", result["error"])
        
    @patch('agent.tools.vector_search.VectorSearchClient')
    def test_upload_content(self, mock_client_class):
        """Test uploading content to Vector Search."""
        # Set up mock client
        mock_client = MagicMock()
        mock_client_class.return_value = mock_client
        
        # Set up mock upload result
        mock_client.upload_embedding.return_value = True
        
        # Create tool with the mocked client
        tool = VectorSearchTool()
        
        # Test upload_content with valid parameters
        result = tool.upload_content("Test content", {"source": "test"})
        self.assertTrue(result["success"])
        
        # Test with invalid content
        result = tool.upload_content("", {"source": "test"})
        self.assertFalse(result["success"])
        self.assertIn("Invalid content", result["error"])
        
        # Test with invalid metadata
        result = tool.upload_content("Test content", "not a dict")
        self.assertFalse(result["success"])
        self.assertIn("Invalid metadata", result["error"])
        
        # Test with upload failure
        mock_client.upload_embedding.return_value = False
        result = tool.upload_content("Test content", {"source": "test"})
        self.assertFalse(result["success"])
        self.assertIn("Failed to upload", result["error"])
        
        # Test with exception
        mock_client.upload_embedding.side_effect = Exception("Test exception")
        result = tool.upload_content("Test content", {"source": "test"})
        self.assertFalse(result["success"])
        self.assertIn("Test exception", result["error"])
        
    def test_get_metadata(self):
        """Test getting tool metadata."""
        metadata = self.vector_search_tool.get_metadata()
        
        self.assertEqual(metadata["name"], "vector_search")
        self.assertIn("description", metadata)
        self.assertIn("operations", metadata)
        
        # Check operations
        operations = metadata["operations"]
        operation_names = [op["name"] for op in operations]
        self.assertIn("search", operation_names)
        self.assertIn("search_knowledge", operation_names)
        self.assertIn("get_health_status", operation_names)
        self.assertIn("upload_content", operation_names)
        
    @patch('agent.tools.vector_search.VectorSearchTool')
    def test_function_wrappers(self, mock_tool_class):
        """Test the function wrappers."""
        # Set up mock tool
        mock_tool = MagicMock()
        mock_tool_class.return_value = mock_tool
        
        # Set up mock results
        mock_search_result = {"success": True, "results": ["result1", "result2"]}
        mock_tool.search.return_value = mock_search_result
        
        mock_knowledge_result = {"success": True, "results": ["knowledge1", "knowledge2"]}
        mock_tool.search_knowledge.return_value = mock_knowledge_result
        
        mock_health_result = {"success": True, "status": {"status": "healthy"}}
        mock_tool.get_health_status.return_value = mock_health_result
        
        mock_upload_result = {"success": True}
        mock_tool.upload_content.return_value = mock_upload_result
        
        # Test search wrapper
        results = search("test query", 2)
        self.assertEqual(results, ["result1", "result2"])
        
        # Test search_knowledge wrapper
        results = search_knowledge("test query", 2)
        self.assertEqual(results, ["knowledge1", "knowledge2"])
        
        # Test get_health_status wrapper
        status = get_health_status()
        self.assertEqual(status, {"status": "healthy"})
        
        # Test upload_content wrapper
        result = upload_content("Test content", {"source": "test"})
        self.assertEqual(result, {"success": True})
        
        # Test with error results
        mock_tool.search.return_value = {"success": False, "error": "Test error"}
        result = search("test query", 2)
        self.assertEqual(result, {"success": False, "error": "Test error"})
        
if __name__ == "__main__":
    unittest.main()
