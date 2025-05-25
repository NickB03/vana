#!/usr/bin/env python3
"""
Unit tests for the KnowledgeGraphTool class.
"""

import unittest
from unittest.mock import patch, MagicMock
from agent.tools.knowledge_graph import KnowledgeGraphTool, kg_query, kg_store, kg_relationship, kg_extract_entities

class TestKnowledgeGraphTool(unittest.TestCase):
    """Test cases for the KnowledgeGraphTool class."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create a patcher for the KnowledgeGraphManager
        self.kg_manager_patcher = patch('agent.tools.knowledge_graph.KnowledgeGraphManager')
        self.mock_kg_manager_class = self.kg_manager_patcher.start()
        self.mock_kg_manager = self.mock_kg_manager_class.return_value
        
        # Set up mock responses
        self.mock_kg_manager.is_available.return_value = True
        
        # Create the tool
        self.tool = KnowledgeGraphTool()
    
    def tearDown(self):
        """Tear down test fixtures."""
        self.kg_manager_patcher.stop()
    
    def test_is_available(self):
        """Test checking if the Knowledge Graph is available."""
        # Test when available
        self.mock_kg_manager.is_available.return_value = True
        self.assertTrue(self.tool.is_available())
        
        # Test when not available
        self.mock_kg_manager.is_available.return_value = False
        self.assertFalse(self.tool.is_available())
    
    def test_query_success(self):
        """Test querying the Knowledge Graph successfully."""
        # Set up mock response
        mock_entities = [
            {"name": "VANA", "type": "project", "observation": "VANA is an AI project"},
            {"name": "Vector Search", "type": "technology", "observation": "Vector Search is used by VANA"}
        ]
        self.mock_kg_manager.query.return_value = {"entities": mock_entities}
        
        # Query the Knowledge Graph
        result = self.tool.query("project", "VANA")
        
        # Check results
        self.assertTrue(result["success"])
        self.assertEqual(result["entities"], mock_entities)
        
        # Verify the mock was called correctly
        self.mock_kg_manager.query.assert_called_once_with("project", "VANA")
    
    def test_query_error(self):
        """Test querying the Knowledge Graph with an error."""
        # Set up mock response
        self.mock_kg_manager.query.return_value = {"error": "Query failed"}
        
        # Query the Knowledge Graph
        result = self.tool.query("project", "VANA")
        
        # Check results
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        
        # Verify the mock was called correctly
        self.mock_kg_manager.query.assert_called_once_with("project", "VANA")
    
    def test_query_not_available(self):
        """Test querying the Knowledge Graph when it's not available."""
        # Set up mock response
        self.mock_kg_manager.is_available.return_value = False
        
        # Query the Knowledge Graph
        result = self.tool.query("project", "VANA")
        
        # Check results
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        self.assertIn("not available", result["error"])
        
        # Verify the mock was not called
        self.mock_kg_manager.query.assert_not_called()
    
    def test_store_success(self):
        """Test storing information in the Knowledge Graph successfully."""
        # Set up mock response
        self.mock_kg_manager.store.return_value = {"success": True}
        
        # Store information
        result = self.tool.store("VANA", "project", "VANA is an AI project")
        
        # Check results
        self.assertTrue(result["success"])
        self.assertEqual(result["entity"], "VANA")
        self.assertEqual(result["type"], "project")
        
        # Verify the mock was called correctly
        self.mock_kg_manager.store.assert_called_once_with("VANA", "project", "VANA is an AI project")
    
    def test_store_error(self):
        """Test storing information in the Knowledge Graph with an error."""
        # Set up mock response
        self.mock_kg_manager.store.return_value = {"success": False, "error": "Store failed"}
        
        # Store information
        result = self.tool.store("VANA", "project", "VANA is an AI project")
        
        # Check results
        self.assertFalse(result["success"])
        self.assertIn("error", result)
        
        # Verify the mock was called correctly
        self.mock_kg_manager.store.assert_called_once_with("VANA", "project", "VANA is an AI project")
    
    def test_store_relationship_success(self):
        """Test storing a relationship in the Knowledge Graph successfully."""
        # Set up mock response
        self.mock_kg_manager.store_relationship.return_value = {"success": True}
        
        # Store relationship
        result = self.tool.store_relationship("VANA", "uses", "Vector Search")
        
        # Check results
        self.assertTrue(result["success"])
        self.assertEqual(result["entity1"], "VANA")
        self.assertEqual(result["relationship"], "uses")
        self.assertEqual(result["entity2"], "Vector Search")
        
        # Verify the mock was called correctly
        self.mock_kg_manager.store_relationship.assert_called_once_with("VANA", "uses", "Vector Search")
    
    def test_extract_entities_success(self):
        """Test extracting entities from text successfully."""
        # Set up mock response
        mock_entities = [
            {"name": "VANA", "type": "project", "observation": "VANA is an AI project"},
            {"name": "Vector Search", "type": "technology", "observation": "Vector Search is used by VANA"}
        ]
        self.mock_kg_manager.extract_entities.return_value = mock_entities
        
        # Extract entities
        result = self.tool.extract_entities("VANA is a project that uses Vector Search")
        
        # Check results
        self.assertTrue(result["success"])
        self.assertEqual(result["entities"], mock_entities)
        
        # Verify the mock was called correctly
        self.mock_kg_manager.extract_entities.assert_called_once_with("VANA is a project that uses Vector Search")
    
    def test_function_wrappers(self):
        """Test the function wrappers."""
        # Set up mock responses
        mock_entities = [{"name": "VANA", "type": "project"}]
        
        with patch('agent.tools.knowledge_graph.KnowledgeGraphTool') as mock_tool_class:
            # Set up mock tool
            mock_tool = MagicMock()
            mock_tool_class.return_value = mock_tool
            
            # Set up mock responses
            mock_tool.query.return_value = {"success": True, "entities": mock_entities}
            mock_tool.store.return_value = {"success": True, "entity": "VANA", "type": "project"}
            mock_tool.store_relationship.return_value = {"success": True, "entity1": "VANA", "relationship": "uses", "entity2": "Vector Search"}
            mock_tool.extract_entities.return_value = {"success": True, "entities": mock_entities}
            
            # Test kg_query
            result = kg_query("project", "VANA")
            self.assertEqual(result, mock_entities)
            mock_tool.query.assert_called_once_with("project", "VANA")
            
            # Test kg_store
            result = kg_store("VANA", "project", "VANA is an AI project")
            self.assertTrue(result["success"])
            mock_tool.store.assert_called_once_with("VANA", "project", "VANA is an AI project")
            
            # Test kg_relationship
            result = kg_relationship("VANA", "uses", "Vector Search")
            self.assertTrue(result["success"])
            mock_tool.store_relationship.assert_called_once_with("VANA", "uses", "Vector Search")
            
            # Test kg_extract_entities
            result = kg_extract_entities("VANA is a project that uses Vector Search")
            self.assertEqual(result, mock_entities)
            mock_tool.extract_entities.assert_called_once_with("VANA is a project that uses Vector Search")

if __name__ == "__main__":
    unittest.main()
