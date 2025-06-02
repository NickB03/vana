"""
Tests for the VanaAgent core class.
"""

import unittest
import uuid
from unittest.mock import MagicMock

from agent.core import VanaAgent
from agent.task_parser import TaskParser


class TestVanaAgent(unittest.TestCase):
    """Test cases for the VanaAgent class."""

    def setUp(self):
        """Set up test environment."""
        self.agent = VanaAgent(name="test_agent", model="test_model")

    def test_initialization(self):
        """Test agent initialization."""
        self.assertEqual(self.agent.name, "test_agent")
        self.assertEqual(self.agent.model, "test_model")
        self.assertIsInstance(self.agent.task_parser, TaskParser)
        self.assertEqual(self.agent.tools, {})
        self.assertEqual(self.agent.conversation_history, [])
        self.assertIsNone(self.agent.current_session_id)
        self.assertIsNone(self.agent.current_user_id)

    def test_register_tool(self):
        """Test registering a tool."""

        def test_tool(arg):
            """Test tool docstring."""
            return f"Test tool: {arg}"

        self.agent.register_tool("test_tool", test_tool)

        self.assertIn("test_tool", self.agent.tools)
        self.assertEqual(self.agent.tools["test_tool"]["function"], test_tool)
        self.assertEqual(
            self.agent.tools["test_tool"]["description"], "Test tool docstring."
        )

    def test_register_tool_with_description(self):
        """Test registering a tool with a custom description."""

        def test_tool(arg):
            return f"Test tool: {arg}"

        self.agent.register_tool("test_tool", test_tool, "Custom description")

        self.assertIn("test_tool", self.agent.tools)
        self.assertEqual(
            self.agent.tools["test_tool"]["description"], "Custom description"
        )

    def test_create_session(self):
        """Test creating a session."""
        user_id = "test_user"
        session_id = self.agent.create_session(user_id)

        self.assertEqual(self.agent.current_user_id, user_id)
        self.assertEqual(self.agent.current_session_id, session_id)
        self.assertEqual(self.agent.conversation_history, [])

    def test_load_session(self):
        """Test loading a session."""
        user_id = "test_user"
        session_id = str(uuid.uuid4())

        result = self.agent.load_session(session_id, user_id)

        self.assertTrue(result)
        self.assertEqual(self.agent.current_user_id, user_id)
        self.assertEqual(self.agent.current_session_id, session_id)

    def test_process_message_with_new_session(self):
        """Test processing a message with a new session."""
        message = "Hello, world!"
        user_id = "test_user"

        # Mock the _generate_response method
        self.agent._generate_response = MagicMock(return_value="Test response")

        response = self.agent.process_message(message, user_id=user_id)

        self.assertEqual(response, "Test response")
        self.assertEqual(len(self.agent.conversation_history), 2)
        self.assertEqual(self.agent.conversation_history[0]["role"], "user")
        self.assertEqual(self.agent.conversation_history[0]["content"], message)
        self.assertEqual(self.agent.conversation_history[1]["role"], "assistant")
        self.assertEqual(self.agent.conversation_history[1]["content"], "Test response")

    def test_process_message_with_existing_session(self):
        """Test processing a message with an existing session."""
        # Create a session
        user_id = "test_user"
        session_id = self.agent.create_session(user_id)

        # Mock the _generate_response method
        self.agent._generate_response = MagicMock(return_value="Test response")

        # Process a message
        message = "Hello, world!"
        response = self.agent.process_message(message, session_id=session_id)

        self.assertEqual(response, "Test response")
        self.assertEqual(len(self.agent.conversation_history), 2)

    def test_process_message_with_tool_command(self):
        """Test processing a message with a tool command."""

        # Register a test tool
        def test_tool(arg):
            return f"Test tool: {arg}"

        self.agent.register_tool("test", test_tool)

        # Process a tool command
        message = "!test argument"
        response = self.agent.process_message(message, user_id="test_user")

        self.assertEqual(response, "Test tool: argument")

    def test_process_message_with_unknown_tool(self):
        """Test processing a message with an unknown tool."""
        # Process a tool command for an unknown tool
        message = "!unknown argument"
        response = self.agent.process_message(message, user_id="test_user")

        self.assertTrue(response.startswith("Unknown tool: unknown"))

    def test_process_message_with_error(self):
        """Test processing a message that causes an error."""
        # Mock the _generate_response method to raise an exception
        self.agent._generate_response = MagicMock(side_effect=Exception("Test error"))

        # Process a message
        message = "Hello, world!"
        response = self.agent.process_message(message, user_id="test_user")

        self.assertEqual(response, "Error processing message: Test error")
        self.assertEqual(len(self.agent.conversation_history), 2)
        self.assertEqual(self.agent.conversation_history[1]["error"], True)

    def test_get_available_tools(self):
        """Test getting available tools."""

        # Register some test tools
        def test_tool1(arg):
            """Test tool 1."""
            return f"Test tool 1: {arg}"

        def test_tool2(arg):
            """Test tool 2."""
            return f"Test tool 2: {arg}"

        self.agent.register_tool("test1", test_tool1)
        self.agent.register_tool("test2", test_tool2)

        # Get available tools
        tools = self.agent.get_available_tools()

        self.assertEqual(len(tools), 2)
        self.assertEqual(tools[0]["name"], "test1")
        self.assertEqual(tools[0]["description"], "Test tool 1.")
        self.assertEqual(tools[1]["name"], "test2")
        self.assertEqual(tools[1]["description"], "Test tool 2.")

    def test_get_conversation_history(self):
        """Test getting conversation history."""
        # Create a session and add some messages
        user_id = "test_user"
        self.agent.create_session(user_id)

        # Mock the _generate_response method
        self.agent._generate_response = MagicMock(return_value="Test response")

        # Process a message
        message = "Hello, world!"
        self.agent.process_message(message)

        # Get conversation history
        history = self.agent.get_conversation_history()

        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["role"], "user")
        self.assertEqual(history[0]["content"], message)
        self.assertEqual(history[1]["role"], "assistant")
        self.assertEqual(history[1]["content"], "Test response")


if __name__ == "__main__":
    unittest.main()
