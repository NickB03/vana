"""
Test script for the WorkflowInterface class.

This script tests the WorkflowInterface class with both n8n available and not available.
"""

import logging
import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the WorkflowInterface class
try:
    from adk_setup.vana.workflows import WorkflowInterface
except ImportError:
    from vana.workflows import WorkflowInterface


class TestWorkflowInterface(unittest.TestCase):
    """Test the WorkflowInterface class."""

    def setUp(self):
        """Set up the test environment."""
        # Configure logging
        logging.basicConfig(level=logging.INFO)

        # Create a mock environment
        self.env_patcher = patch.dict(
            os.environ,
            {
                "N8N_WEBHOOK_URL": "",
                "N8N_WEBHOOK_USERNAME": "",
                "N8N_WEBHOOK_PASSWORD": "",
                "MEMORY_CACHE_SIZE": "1000",
                "MEMORY_CACHE_TTL": "3600",
                "ENTITY_HALF_LIFE_DAYS": "30",
                "VECTOR_SEARCH_WEIGHT": "0.7",
                "KNOWLEDGE_GRAPH_WEIGHT": "0.3",
            },
        )
        self.env_patcher.start()

    def tearDown(self):
        """Tear down the test environment."""
        self.env_patcher.stop()

    def test_init_n8n_not_available(self):
        """Test initialization with n8n not available."""
        workflow_interface = WorkflowInterface()
        self.assertFalse(workflow_interface.n8n_available)

    @patch.dict(os.environ, {"N8N_WEBHOOK_URL": "http://localhost:5678"})
    @patch("requests.get")
    def test_init_n8n_available(self, mock_get):
        """Test initialization with n8n available."""
        # Mock the response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_get.return_value = mock_response

        # Create the workflow interface
        workflow_interface = WorkflowInterface()

        # Check that n8n is available
        self.assertTrue(workflow_interface.n8n_available)

        # Check that the request was made
        mock_get.assert_called_once_with("http://localhost:5678/healthz", timeout=5)

    @patch.dict(os.environ, {"N8N_WEBHOOK_URL": "http://localhost:5678"})
    @patch("requests.get")
    def test_init_n8n_error(self, mock_get):
        """Test initialization with n8n error."""
        # Mock the response
        mock_get.side_effect = Exception("Connection error")

        # Create the workflow interface
        workflow_interface = WorkflowInterface()

        # Check that n8n is not available
        self.assertFalse(workflow_interface.n8n_available)

        # Check that the request was made
        mock_get.assert_called_once_with("http://localhost:5678/healthz", timeout=5)

    @patch("vana.memory.MemoryManager")
    def test_trigger_memory_save_direct(self, mock_memory_manager):
        """Test trigger_memory_save with direct implementation."""
        # Mock the memory manager
        mock_memory_manager_instance = MagicMock()
        mock_memory_manager.return_value = mock_memory_manager_instance
        mock_memory_manager_instance.save_buffer.return_value = {
            "success": True,
            "message": "Memory saved successfully",
        }

        # Create the workflow interface
        workflow_interface = WorkflowInterface()

        # Call the method
        buffer = [
            {"role": "user", "content": "How do I implement memory in VANA?"},
            {
                "role": "assistant",
                "content": "You can use the memory management system...",
            },
        ]
        tags = ["memory", "vana"]
        result = workflow_interface.trigger_memory_save(buffer, tags)

        # Check the result
        self.assertEqual(
            result, {"success": True, "message": "Memory saved successfully"}
        )

        # Check that the memory manager was called
        mock_memory_manager_instance.save_buffer.assert_called_once_with(buffer, tags)

    @patch.dict(os.environ, {"N8N_WEBHOOK_URL": "http://localhost:5678"})
    @patch("requests.get")
    @patch("requests.post")
    def test_trigger_memory_save_n8n(self, mock_post, mock_get):
        """Test trigger_memory_save with n8n."""
        # Mock the get response
        mock_get_response = MagicMock()
        mock_get_response.status_code = 200
        mock_get.return_value = mock_get_response

        # Mock the post response
        mock_post_response = MagicMock()
        mock_post_response.status_code = 200
        mock_post_response.json.return_value = {
            "success": True,
            "message": "Memory saved successfully",
        }
        mock_post.return_value = mock_post_response

        # Create the workflow interface
        workflow_interface = WorkflowInterface()

        # Call the method
        buffer = [
            {"role": "user", "content": "How do I implement memory in VANA?"},
            {
                "role": "assistant",
                "content": "You can use the memory management system...",
            },
        ]
        tags = ["memory", "vana"]
        result = workflow_interface.trigger_memory_save(buffer, tags)

        # Check the result
        self.assertEqual(
            result, {"success": True, "message": "Memory saved successfully"}
        )

        # Check that the request was made
        mock_post.assert_called_once_with(
            "http://localhost:5678/webhook/save-memory",
            json={"buffer": buffer, "tags": tags, "memory_on": True},
            headers={"Content-Type": "application/json"},
            auth=None,
            timeout=30,
        )

    @patch.dict(os.environ, {"N8N_WEBHOOK_URL": "http://localhost:5678"})
    @patch("requests.get")
    @patch("requests.post")
    def test_trigger_memory_save_n8n_error(self, mock_post, mock_get):
        """Test trigger_memory_save with n8n error."""
        # Mock the get response
        mock_get_response = MagicMock()
        mock_get_response.status_code = 200
        mock_get.return_value = mock_get_response

        # Mock the post response
        mock_post.side_effect = Exception("Connection error")

        # Create the workflow interface
        workflow_interface = WorkflowInterface()

        # Call the method
        buffer = [
            {"role": "user", "content": "How do I implement memory in VANA?"},
            {
                "role": "assistant",
                "content": "You can use the memory management system...",
            },
        ]
        tags = ["memory", "vana"]
        result = workflow_interface.trigger_memory_save(buffer, tags)

        # Check the result
        self.assertEqual(result, {"error": "Connection error"})

        # Check that the request was made
        mock_post.assert_called_once_with(
            "http://localhost:5678/webhook/save-memory",
            json={"buffer": buffer, "tags": tags, "memory_on": True},
            headers={"Content-Type": "application/json"},
            auth=None,
            timeout=30,
        )

    @patch("vana.memory.MemoryManager")
    def test_trigger_memory_sync_direct(self, mock_memory_manager):
        """Test trigger_memory_sync with direct implementation."""
        # Mock the memory manager
        mock_memory_manager_instance = MagicMock()
        mock_memory_manager.return_value = mock_memory_manager_instance
        mock_memory_manager_instance.sync_memory.return_value = {
            "success": True,
            "message": "Memory synced successfully",
        }

        # Create the workflow interface
        workflow_interface = WorkflowInterface()

        # Call the method
        user_id = "user123"
        session_id = "session456"
        result = workflow_interface.trigger_memory_sync(user_id, session_id)

        # Check the result
        self.assertEqual(
            result, {"success": True, "message": "Memory synced successfully"}
        )

        # Check that the memory manager was called
        mock_memory_manager_instance.sync_memory.assert_called_once_with(
            user_id, session_id
        )

    @patch("vana.knowledge_graph.KnowledgeGraphManager")
    def test_trigger_knowledge_graph_sync_direct(self, mock_kg_manager):
        """Test trigger_knowledge_graph_sync with direct implementation."""
        # Mock the knowledge graph manager
        mock_kg_manager_instance = MagicMock()
        mock_kg_manager.return_value = mock_kg_manager_instance
        mock_kg_manager_instance.sync_entities.return_value = {
            "success": True,
            "message": "Entities synced successfully",
        }

        # Create the workflow interface
        workflow_interface = WorkflowInterface()

        # Call the method
        entities = [
            {
                "name": "VANA",
                "type": "project",
                "observation": "VANA is a multi-agent system using Google ADK.",
            }
        ]
        result = workflow_interface.trigger_knowledge_graph_sync(entities)

        # Check the result
        self.assertEqual(
            result, {"success": True, "message": "Entities synced successfully"}
        )

        # Check that the knowledge graph manager was called
        mock_kg_manager_instance.sync_entities.assert_called_once_with(entities)

    @patch("vana.document_processing.DocumentProcessor")
    def test_trigger_document_processing_direct(self, mock_document_processor):
        """Test trigger_document_processing with direct implementation."""
        # Mock the document processor
        mock_document_processor_instance = MagicMock()
        mock_document_processor.return_value = mock_document_processor_instance
        mock_document_processor_instance.process.return_value = {
            "success": True,
            "message": "Document processed successfully",
        }

        # Create the workflow interface
        workflow_interface = WorkflowInterface()

        # Call the method
        document_path = "/path/to/document.txt"
        options = {"chunk_size": 1000, "chunk_overlap": 200, "extract_entities": True}
        result = workflow_interface.trigger_document_processing(document_path, options)

        # Check the result
        self.assertEqual(
            result, {"success": True, "message": "Document processed successfully"}
        )

        # Check that the document processor was called
        mock_document_processor_instance.process.assert_called_once_with(
            document_path, options
        )


if __name__ == "__main__":
    unittest.main()
