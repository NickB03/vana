#!/usr/bin/env python3
"""
Integration script for the VANA memory management system with the MCP server.
This script provides a handler for memory-related MCP commands.
"""

import json
import logging
import os
import sys

from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

# Add the project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Import the memory management classes
from tools.memory.buffer_manager import MemoryBufferManager
from tools.memory.mcp_interface import MemoryMCP


class MemoryMCPHandler:
    """Handler for memory-related MCP commands"""

    def __init__(self):
        """Initialize the handler"""
        # Load environment variables
        self._load_environment()

        # Create memory components
        self.buffer_manager = MemoryBufferManager()
        self.mcp = MemoryMCP(self.buffer_manager)

        logger.info("Memory MCP handler initialized")

    def _load_environment(self):
        """Load environment variables"""
        # Try to load from .env.memory first, then fall back to .env
        if os.path.exists(".env.memory"):
            load_dotenv(".env.memory")
            logger.info("Loaded environment variables from .env.memory")
        elif os.path.exists(".env"):
            load_dotenv(".env")
            logger.info("Loaded environment variables from .env")
        else:
            logger.warning("No .env file found. Using existing environment variables.")

    def handle_command(self, command):
        """Handle a memory-related MCP command"""
        if not isinstance(command, str):
            logger.error(f"Invalid command type: {type(command)}")
            return {"error": "Invalid command type"}

        command = command.strip()

        # Check if this is a memory command
        if command.startswith("!memory_") or command == "!rag":
            logger.info(f"Handling memory command: {command}")
            response = self.mcp.handle_command(command)
            logger.info(f"Memory command response: {response}")
            return {"response": response}

        # Not a memory command
        logger.debug(f"Not a memory command: {command}")
        return {"error": "Not a memory command"}

    def add_message(self, role, content):
        """Add a message to the buffer if memory recording is on"""
        if self.buffer_manager.memory_on:
            logger.debug(f"Adding message to buffer: {role}: {content[:50]}...")
            return self.buffer_manager.add_message(role, content)
        return False

    def get_status(self):
        """Get the status of the memory buffer"""
        return self.buffer_manager.get_status()


# Example usage in an MCP server
def handle_mcp_request(request):
    """Handle an MCP request"""
    # Parse the request
    try:
        data = json.loads(request)
        command = data.get("command")

        # Create the handler
        handler = MemoryMCPHandler()

        # Handle the command
        response = handler.handle_command(command)

        # Return the response
        return json.dumps(response)
    except Exception as e:
        logger.error(f"Error handling MCP request: {e}")
        return json.dumps({"error": str(e)})


# Example usage
if __name__ == "__main__":
    # Example MCP request
    request = json.dumps({"command": "!memory_on"})

    # Handle the request
    response = handle_mcp_request(request)

    # Print the response
    logger.info("%s", response)
