"""
Tests for the Echo tool.
"""

import unittest

from agent.tools.echo import EchoTool, echo


class TestEchoTool(unittest.TestCase):
    """Test cases for the EchoTool class."""

    def setUp(self):
        """Set up test environment."""
        self.echo_tool = EchoTool()
        self.echo_tool_custom = EchoTool(prefix="Custom: ")

    def test_initialization(self):
        """Test tool initialization."""
        self.assertEqual(self.echo_tool.prefix, "Echo: ")
        self.assertEqual(self.echo_tool_custom.prefix, "Custom: ")

    def test_execute(self):
        """Test executing the tool."""
        # Test with default prefix
        result = self.echo_tool.execute("Hello, world!")
        self.assertEqual(result, "Echo: Hello, world!")

        # Test with custom prefix
        result = self.echo_tool_custom.execute("Hello, world!")
        self.assertEqual(result, "Custom: Hello, world!")

        # Test with empty input
        result = self.echo_tool.execute("")
        self.assertEqual(result, "Echo: ")

    def test_get_metadata(self):
        """Test getting tool metadata."""
        metadata = self.echo_tool.get_metadata()

        self.assertEqual(metadata["name"], "echo")
        self.assertIn("description", metadata)
        self.assertIn("parameters", metadata)
        self.assertIn("returns", metadata)

        # Check parameters
        self.assertEqual(len(metadata["parameters"]), 1)
        self.assertEqual(metadata["parameters"][0]["name"], "text")
        self.assertEqual(metadata["parameters"][0]["type"], "string")
        self.assertTrue(metadata["parameters"][0]["required"])

        # Check returns
        self.assertEqual(metadata["returns"]["type"], "string")

    def test_echo_function(self):
        """Test the echo function wrapper."""
        # Test with normal input
        result = echo("Hello, world!")
        self.assertEqual(result, "Echo: Hello, world!")

        # Test with empty input
        result = echo("")
        self.assertEqual(result, "Echo: ")


if __name__ == "__main__":
    unittest.main()
