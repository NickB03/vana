#!/usr/bin/env python3
"""
End-to-end tests for the VANA agent workflow.
"""

import os
import sys
import tempfile
import unittest
from unittest.mock import MagicMock

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
sys.path.append(project_root)

from agent.core import VanaAgent
from agent.memory.memory_bank import MemoryBankManager
from agent.memory.short_term import ShortTermMemory
from agent.tools import (
    echo,
    file_exists,
    list_directory,
    read_file,
    write_file,
)


class TestAgentWorkflow(unittest.TestCase):
    """End-to-end tests for the VANA agent workflow."""

    def setUp(self):
        """Set up test fixtures."""
        # Create a temporary directory for test files
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_dir = self.temp_dir.name

        # Create test files
        self.test_file = os.path.join(self.test_dir, "test.txt")
        with open(self.test_file, "w") as f:
            f.write("This is a test file.")

        # Create agent with real components but mock external services
        self.agent = self._create_agent()

        # Start a session
        self.session_id = self.agent.create_session("test_user")

    def tearDown(self):
        """Tear down test fixtures."""
        self.temp_dir.cleanup()

    def _create_agent(self) -> VanaAgent:
        """
        Create and configure the VANA agent with mock external services.

        Returns:
            Configured VanaAgent instance
        """
        # Create agent with mock model
        agent = VanaAgent(name="vana", model="mock-model")

        # Mock the generate_response method
        agent.generate_response = MagicMock(return_value="Mock response")

        # Add real memory components
        agent.short_term_memory = ShortTermMemory()
        agent.memory_bank = MemoryBankManager(memory_bank_dir=self.test_dir)

        # Register real tools but mock external services
        agent.register_tool("echo", echo)
        agent.register_tool("read_file", read_file)
        agent.register_tool("write_file", write_file)
        agent.register_tool("list_directory", list_directory)
        agent.register_tool("file_exists", file_exists)

        # Mock vector search tools
        mock_vector_search = MagicMock(
            return_value=[
                {"text": "Mock vector search result 1", "score": 0.9},
                {"text": "Mock vector search result 2", "score": 0.8},
            ]
        )
        agent.register_tool("vector_search", mock_vector_search)

        mock_search_knowledge = MagicMock(
            return_value=[
                {"text": "Mock knowledge search result 1", "score": 0.9},
                {"text": "Mock knowledge search result 2", "score": 0.8},
            ]
        )
        agent.register_tool("search_knowledge", mock_search_knowledge)

        mock_get_health_status = MagicMock(
            return_value={
                "status": "healthy",
                "details": {"index_count": 1000, "latency_ms": 50},
            }
        )
        agent.register_tool("get_health_status", mock_get_health_status)

        # Mock web search tool
        mock_web_search = MagicMock(
            return_value=[
                {
                    "title": "Mock web result 1",
                    "snippet": "Mock snippet 1",
                    "url": "https://example.com/1",
                },
                {
                    "title": "Mock web result 2",
                    "snippet": "Mock snippet 2",
                    "url": "https://example.com/2",
                },
            ]
        )
        agent.register_tool("web_search", mock_web_search)

        # Mock knowledge graph tools
        mock_kg_query = MagicMock(
            return_value=[
                {
                    "name": "VANA",
                    "type": "project",
                    "observation": "VANA is an AI project",
                }
            ]
        )
        agent.register_tool("kg_query", mock_kg_query)

        mock_kg_store = MagicMock(return_value={"success": True})
        agent.register_tool("kg_store", mock_kg_store)

        mock_kg_relationship = MagicMock(return_value={"success": True})
        agent.register_tool("kg_relationship", mock_kg_relationship)

        mock_kg_extract_entities = MagicMock(
            return_value=[
                {
                    "name": "VANA",
                    "type": "project",
                    "observation": "VANA is an AI project",
                }
            ]
        )
        agent.register_tool("kg_extract_entities", mock_kg_extract_entities)

        return agent

    def test_basic_interaction(self):
        """Test basic interaction with the agent."""
        # Send a message
        response = self.agent.process_message("Hello", session_id=self.session_id)

        # Check that the response is correct
        self.assertEqual(response, "Mock response")

        # Check that the message was added to short-term memory
        memory_items = self.agent.short_term_memory.get_all()
        self.assertEqual(len(memory_items), 2)  # User message and agent response
        self.assertEqual(memory_items[0]["role"], "user")
        self.assertEqual(memory_items[0]["content"], "Hello")
        self.assertEqual(memory_items[1]["role"], "assistant")
        self.assertEqual(memory_items[1]["content"], "Mock response")

    def test_tool_execution(self):
        """Test executing tools."""
        # Mock the handle_tool_command method to return the tool result
        self.agent._handle_tool_command = MagicMock(return_value="Tool result")

        # Send a tool command
        response = self.agent.process_message("!echo Hello", session_id=self.session_id)

        # Check that the tool command was handled
        self.agent._handle_tool_command.assert_called_once_with("!echo Hello")

        # Check that the response is correct
        self.assertEqual(response, "Tool result")

    def test_memory_persistence(self):
        """Test memory persistence across interactions."""
        # Send a message
        self.agent.process_message("My name is Test User", session_id=self.session_id)

        # Send another message
        response = self.agent.process_message(
            "What's my name?", session_id=self.session_id
        )

        # Check that the response is correct
        self.assertEqual(response, "Mock response")

        # Check that both interactions are in short-term memory
        memory_items = self.agent.short_term_memory.get_all()
        self.assertEqual(
            len(memory_items), 4
        )  # Two user messages and two agent responses
        self.assertEqual(memory_items[0]["role"], "user")
        self.assertEqual(memory_items[0]["content"], "My name is Test User")
        self.assertEqual(memory_items[2]["role"], "user")
        self.assertEqual(memory_items[2]["content"], "What's my name?")

    def test_file_system_tools(self):
        """Test file system tools."""
        # Test read_file
        read_result = self.agent._handle_tool_command(f"!read_file {self.test_file}")
        self.assertEqual(read_result, "This is a test file.")

        # Test write_file
        write_file = os.path.join(self.test_dir, "write_test.txt")
        write_content = "This is a write test."
        write_result = self.agent._handle_tool_command(
            f"!write_file {write_file} {write_content}"
        )
        self.assertTrue(write_result["success"])

        # Verify the file was written
        with open(write_file) as f:
            content = f.read()
        self.assertEqual(content, write_content)

        # Test list_directory
        list_result = self.agent._handle_tool_command(
            f"!list_directory {self.test_dir}"
        )
        self.assertTrue(list_result["success"])
        self.assertIn("test.txt", [file["name"] for file in list_result["files"]])
        self.assertIn("write_test.txt", [file["name"] for file in list_result["files"]])

        # Test file_exists
        exists_result = self.agent._handle_tool_command(
            f"!file_exists {self.test_file}"
        )
        self.assertTrue(exists_result)

        not_exists_result = self.agent._handle_tool_command(
            "!file_exists /path/to/nonexistent/file"
        )
        self.assertFalse(not_exists_result)

    def test_vector_search_tools(self):
        """Test vector search tools."""
        # Test vector_search
        search_result = self.agent._handle_tool_command("!vector_search test query")
        self.assertEqual(len(search_result), 2)
        self.assertEqual(search_result[0]["text"], "Mock vector search result 1")

        # Test search_knowledge
        knowledge_result = self.agent._handle_tool_command(
            "!search_knowledge test query"
        )
        self.assertEqual(len(knowledge_result), 2)
        self.assertEqual(knowledge_result[0]["text"], "Mock knowledge search result 1")

        # Test get_health_status
        health_result = self.agent._handle_tool_command("!get_health_status")
        self.assertEqual(health_result["status"], "healthy")

    def test_web_search_tool(self):
        """Test web search tool."""
        # Test web_search
        search_result = self.agent._handle_tool_command("!web_search test query")
        self.assertEqual(len(search_result), 2)
        self.assertEqual(search_result[0]["title"], "Mock web result 1")

    def test_knowledge_graph_tools(self):
        """Test knowledge graph tools."""
        # Test kg_query
        query_result = self.agent._handle_tool_command("!kg_query project VANA")
        self.assertEqual(len(query_result), 1)
        self.assertEqual(query_result[0]["name"], "VANA")

        # Test kg_store
        store_result = self.agent._handle_tool_command(
            "!kg_store VANA project 'VANA is an AI project'"
        )
        self.assertTrue(store_result["success"])

        # Test kg_relationship
        relationship_result = self.agent._handle_tool_command(
            "!kg_relationship VANA uses 'Vector Search'"
        )
        self.assertTrue(relationship_result["success"])

        # Test kg_extract_entities
        extract_result = self.agent._handle_tool_command(
            "!kg_extract_entities 'VANA is an AI project'"
        )
        self.assertEqual(len(extract_result), 1)
        self.assertEqual(extract_result[0]["name"], "VANA")

    def test_end_to_end_workflow(self):
        """Test an end-to-end workflow."""
        # Step 1: Introduce the user
        self.agent.process_message(
            "My name is Test User and I'm interested in AI agents.",
            session_id=self.session_id,
        )

        # Step 2: Ask about VANA
        self.agent.process_message("What is VANA?", session_id=self.session_id)

        # Step 3: Store information in the knowledge graph
        self.agent.process_message(
            "Please remember that VANA is an AI project with memory capabilities.",
            session_id=self.session_id,
        )

        # Step 4: Query the knowledge graph
        self.agent.process_message(
            "What do you know about VANA?", session_id=self.session_id
        )

        # Step 5: Search for information
        self.agent.process_message(
            "Can you search for information about AI agents?",
            session_id=self.session_id,
        )

        # Step 6: Write a file
        file_path = os.path.join(self.test_dir, "summary.txt")
        self.agent.process_message(
            f"Please write a summary of what we've discussed to {file_path}",
            session_id=self.session_id,
        )

        # Verify the file was written
        self.assertTrue(os.path.exists(file_path))

        # Step 7: Check memory
        memory_items = self.agent.short_term_memory.get_all()
        self.assertEqual(len(memory_items), 14)  # 7 user messages and 7 agent responses


if __name__ == "__main__":
    unittest.main()
