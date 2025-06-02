"""
Integration tests for the VANA agent with tools.
"""

import unittest

from agent.core import VanaAgent
from agent.tools.echo import echo


class TestAgentToolsIntegration(unittest.TestCase):
    """Integration tests for the VANA agent with tools."""

    def setUp(self):
        """Set up test environment."""
        self.agent = VanaAgent(name="test_agent", model="test_model")

        # Register the echo tool
        self.agent.register_tool("echo", echo)

    def test_tool_registration_and_execution(self):
        """Test registering and executing a tool."""
        # Check that the tool was registered
        self.assertIn("echo", self.agent.tools)

        # Process a message using the tool
        response = self.agent.process_message(
            "!echo Hello, world!", user_id="test_user"
        )

        # Check the response
        self.assertEqual(response, "Echo: Hello, world!")

        # Check that the conversation history was updated
        self.assertEqual(len(self.agent.conversation_history), 2)
        self.assertEqual(self.agent.conversation_history[0]["role"], "user")
        self.assertEqual(
            self.agent.conversation_history[0]["content"], "!echo Hello, world!"
        )
        self.assertEqual(self.agent.conversation_history[1]["role"], "assistant")
        self.assertEqual(
            self.agent.conversation_history[1]["content"], "Echo: Hello, world!"
        )

    def test_multiple_tools(self):
        """Test using multiple tools."""

        # Register a second tool
        def reverse(text):
            """Reverse the input text."""
            return text[::-1]

        self.agent.register_tool("reverse", reverse, "Reverse the input text")

        # Check that both tools are registered
        self.assertIn("echo", self.agent.tools)
        self.assertIn("reverse", self.agent.tools)

        # Process messages using both tools
        echo_response = self.agent.process_message(
            "!echo Hello, world!", user_id="test_user"
        )
        reverse_response = self.agent.process_message("!reverse Hello, world!")

        # Check the responses
        self.assertEqual(echo_response, "Echo: Hello, world!")
        self.assertEqual(reverse_response, "!dlrow ,olleH")

        # Check that the conversation history was updated
        self.assertEqual(len(self.agent.conversation_history), 4)

    def test_tool_error_handling(self):
        """Test error handling when a tool raises an exception."""

        # Register a tool that raises an exception
        def error_tool(text):
            """A tool that always raises an exception."""
            raise ValueError("Test error")

        self.agent.register_tool("error", error_tool)

        # Process a message using the error tool
        response = self.agent.process_message("!error test", user_id="test_user")

        # Check the response
        self.assertTrue(response.startswith("Error executing tool error:"))
        self.assertIn("Test error", response)

    def test_unknown_tool(self):
        """Test handling of unknown tools."""
        # Process a message using an unknown tool
        response = self.agent.process_message("!unknown test", user_id="test_user")

        # Check the response
        self.assertTrue(response.startswith("Unknown tool: unknown"))
        self.assertIn("Available tools: echo", response)

    def test_get_available_tools(self):
        """Test getting available tools."""

        # Register a second tool
        def reverse(text):
            """Reverse the input text."""
            return text[::-1]

        self.agent.register_tool("reverse", reverse, "Reverse the input text")

        # Get available tools
        tools = self.agent.get_available_tools()

        # Check the tools
        self.assertEqual(len(tools), 2)
        tool_names = [tool["name"] for tool in tools]
        self.assertIn("echo", tool_names)
        self.assertIn("reverse", tool_names)

        # Check the descriptions
        for tool in tools:
            if tool["name"] == "echo":
                self.assertIn("echoes back", tool["description"].lower())
            elif tool["name"] == "reverse":
                self.assertEqual(tool["description"], "Reverse the input text")

    def test_session_persistence(self):
        """Test that tools work across multiple sessions."""
        # Create a session
        user_id = "test_user"
        session_id = self.agent.create_session(user_id)

        # Process a message using a tool
        response1 = self.agent.process_message(
            "!echo First message", session_id=session_id
        )

        # Create a new session
        new_session_id = self.agent.create_session(user_id)

        # Process a message in the new session
        response2 = self.agent.process_message(
            "!echo Second message", session_id=new_session_id
        )

        # Load the first session
        self.agent.load_session(session_id, user_id)

        # Process another message in the first session
        response3 = self.agent.process_message(
            "!echo Third message", session_id=session_id
        )

        # Check the responses
        self.assertEqual(response1, "Echo: First message")
        self.assertEqual(response2, "Echo: Second message")
        self.assertEqual(response3, "Echo: Third message")


if __name__ == "__main__":
    unittest.main()
