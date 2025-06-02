"""
Echo Tool for VANA Agent

This module provides a simple echo tool for testing the VANA agent's tool integration.
"""

import logging
from typing import Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class EchoTool:
    """
    A simple echo tool that returns the input text.

    This tool is primarily used for testing the agent's tool integration
    and execution capabilities.
    """

    def __init__(self, prefix: str = "Echo: "):
        """
        Initialize the echo tool.

        Args:
            prefix: Prefix to add to the echo response
        """
        self.prefix = prefix
        logger.info("Initialized EchoTool")

    def execute(self, text: str) -> str:
        """
        Execute the echo tool.

        Args:
            text: Text to echo

        Returns:
            Echo response
        """
        response = f"{self.prefix}{text}"
        logger.info(f"EchoTool executed with input: '{text}'")
        return response

    def get_metadata(self) -> dict[str, Any]:
        """
        Get metadata about the tool.

        Returns:
            Tool metadata
        """
        return {
            "name": "echo",
            "description": "A simple tool that echoes back the input text",
            "parameters": [
                {
                    "name": "text",
                    "type": "string",
                    "description": "Text to echo",
                    "required": True,
                }
            ],
            "returns": {"type": "string", "description": "Echo response"},
        }


def echo(text: str) -> str:
    """
    Echo the input text.

    This is a simple function wrapper around the EchoTool class
    that echoes back the input text. It's useful for testing the
    agent's tool integration capabilities.

    Args:
        text: Text to echo

    Returns:
        Echo response
    """
    tool = EchoTool()
    return tool.execute(text)
