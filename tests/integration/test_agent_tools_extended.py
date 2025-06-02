"""
Extended integration tests for the VANA agent with all tools.
"""

import os
import shutil
import tempfile
import unittest
from unittest.mock import patch

from agent.core import VanaAgent
from agent.tools.echo import echo
from agent.tools.file_system import file_exists, list_directory, read_file, write_file
from agent.tools.vector_search import search as vector_search
from agent.tools.web_search import search_mock


class TestAgentToolsExtendedIntegration(unittest.TestCase):
    """Integration tests for the VANA agent with all tools."""

    def setUp(self):
        """Set up test environment."""
        # Create a temporary directory for file system tests
        self.test_dir = tempfile.mkdtemp()

        # Create a test file
        self.test_file_path = os.path.join(self.test_dir, "test_file.txt")
        with open(self.test_file_path, "w") as f:
            f.write("Test content")

        # Create the agent
        self.agent = VanaAgent(name="test_agent", model="test_model")

        # Register all tools
        self.agent.register_tool("echo", echo)
        self.agent.register_tool("read_file", read_file)
        self.agent.register_tool("write_file", write_file)
        self.agent.register_tool("list_directory", list_directory)
        self.agent.register_tool("file_exists", file_exists)
        self.agent.register_tool("vector_search", vector_search)
        self.agent.register_tool("web_search", search_mock)  # Use mock for web search

    def tearDown(self):
        """Clean up after tests."""
        # Remove the temporary directory and its contents
        shutil.rmtree(self.test_dir)

    def test_tool_registration(self):
        """Test that all tools are registered correctly."""
        # Check that all tools are registered
        self.assertIn("echo", self.agent.tools)
        self.assertIn("read_file", self.agent.tools)
        self.assertIn("write_file", self.agent.tools)
        self.assertIn("list_directory", self.agent.tools)
        self.assertIn("file_exists", self.agent.tools)
        self.assertIn("vector_search", self.agent.tools)
        self.assertIn("web_search", self.agent.tools)

        # Check that the agent can list all tools
        tools = self.agent.get_available_tools()
        self.assertEqual(len(tools), 7)

        # Check that tool names are correct
        tool_names = [tool["name"] for tool in tools]
        self.assertIn("echo", tool_names)
        self.assertIn("read_file", tool_names)
        self.assertIn("write_file", tool_names)
        self.assertIn("list_directory", tool_names)
        self.assertIn("file_exists", tool_names)
        self.assertIn("vector_search", tool_names)
        self.assertIn("web_search", tool_names)

    def test_echo_tool(self):
        """Test the echo tool."""
        response = self.agent.process_message(
            "!echo Hello, world!", user_id="test_user"
        )
        self.assertEqual(response, "Echo: Hello, world!")

    def test_file_system_tools(self):
        """Test the file system tools."""
        # Test read_file
        response = self.agent.process_message(
            f"!read_file {self.test_file_path}", user_id="test_user"
        )
        self.assertEqual(response, "Test content")

        # Test write_file
        new_file_path = os.path.join(self.test_dir, "new_file.txt")
        response = self.agent.process_message(
            f"!write_file {new_file_path} New content", user_id="test_user"
        )
        self.assertTrue(response.get("success", False))

        # Verify the file was written
        with open(new_file_path) as f:
            content = f.read()
        self.assertEqual(content, "New content")

        # Test list_directory
        response = self.agent.process_message(
            f"!list_directory {self.test_dir}", user_id="test_user"
        )
        self.assertIsInstance(response, list)
        self.assertEqual(len(response), 2)  # test_file.txt and new_file.txt

        # Test file_exists
        response = self.agent.process_message(
            f"!file_exists {new_file_path}", user_id="test_user"
        )
        self.assertTrue(response)

        response = self.agent.process_message(
            f"!file_exists {os.path.join(self.test_dir, 'non_existent.txt')}",
            user_id="test_user",
        )
        self.assertFalse(response)

    @patch("agent.tools.vector_search.VectorSearchTool.search")
    def test_vector_search_tool(self, mock_search):
        """Test the vector search tool."""
        # Set up mock search results
        mock_search.return_value = {
            "success": True,
            "results": [
                {
                    "content": "Vector search result 1",
                    "score": 0.9,
                    "source": "test-source-1",
                    "id": "test-id-1",
                },
                {
                    "content": "Vector search result 2",
                    "score": 0.8,
                    "source": "test-source-2",
                    "id": "test-id-2",
                },
            ],
        }

        # Test vector_search
        response = self.agent.process_message(
            "!vector_search test query", user_id="test_user"
        )
        self.assertIsInstance(response, list)
        self.assertEqual(len(response), 2)
        self.assertEqual(response[0]["content"], "Vector search result 1")

        # Test with error
        mock_search.return_value = {"success": False, "error": "Test error"}
        response = self.agent.process_message(
            "!vector_search test query", user_id="test_user"
        )
        self.assertIsInstance(response, dict)
        self.assertEqual(response["error"], "Test error")

    @patch("agent.tools.web_search.WebSearchTool.search")
    def test_web_search_tool(self, mock_search):
        """Test the web search tool."""
        # Set up mock search results
        mock_search.return_value = {
            "success": True,
            "results": [
                {
                    "title": "Web search result 1",
                    "link": "https://example.com/1",
                    "snippet": "This is web search result 1",
                    "source": "web",
                },
                {
                    "title": "Web search result 2",
                    "link": "https://example.com/2",
                    "snippet": "This is web search result 2",
                    "source": "web",
                },
            ],
        }

        # Test web_search
        response = self.agent.process_message(
            "!web_search test query", user_id="test_user"
        )
        self.assertIsInstance(response, list)
        self.assertEqual(len(response), 2)
        self.assertEqual(response[0]["title"], "Web search result 1")

        # Test with error
        mock_search.return_value = {"success": False, "error": "Test error"}
        response = self.agent.process_message(
            "!web_search test query", user_id="test_user"
        )
        self.assertIsInstance(response, dict)
        self.assertEqual(response["error"], "Test error")

    def test_tool_error_handling(self):
        """Test error handling when tools raise exceptions."""
        # Test with non-existent file
        response = self.agent.process_message(
            "!read_file /non/existent/file.txt", user_id="test_user"
        )
        self.assertIsInstance(response, dict)
        self.assertFalse(response["success"])
        self.assertIn("not found", response["error"])

        # Test with invalid directory
        response = self.agent.process_message(
            "!list_directory /etc/passwd", user_id="test_user"
        )
        self.assertIsInstance(response, dict)
        self.assertFalse(response["success"])
        self.assertIn("Not a directory", response["error"])

    def test_unknown_tool(self):
        """Test handling of unknown tools."""
        response = self.agent.process_message("!unknown_tool test", user_id="test_user")
        self.assertTrue(response.startswith("Unknown tool: unknown_tool"))
        self.assertIn("Available tools:", response)

    def test_multiple_tools_in_session(self):
        """Test using multiple tools in a single session."""
        # Create a session
        session_id = self.agent.create_session("test_user")

        # Use echo tool
        response1 = self.agent.process_message(
            "!echo First message", session_id=session_id
        )
        self.assertEqual(response1, "Echo: First message")

        # Use file_exists tool
        response2 = self.agent.process_message(
            f"!file_exists {self.test_file_path}", session_id=session_id
        )
        self.assertTrue(response2)

        # Use read_file tool
        response3 = self.agent.process_message(
            f"!read_file {self.test_file_path}", session_id=session_id
        )
        self.assertEqual(response3, "Test content")

        # Check conversation history
        history = self.agent.get_conversation_history()
        self.assertEqual(len(history), 6)  # 3 user messages and 3 assistant responses

    def test_tool_integration_with_task_parser(self):
        """Test integration of tools with the task parser."""
        # This test verifies that the agent can process non-tool commands
        # and still use the task parser to generate responses

        # Process a regular message
        response = self.agent.process_message(
            "Hello, how are you?", user_id="test_user"
        )

        # The response should be generated by the task parser
        self.assertTrue(response.startswith("Echo: Hello, how are you?"))
        self.assertIn("Task type:", response)


if __name__ == "__main__":
    unittest.main()
