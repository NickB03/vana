"""
Example of integrating the memory system with an ADK agent.
This is a sample implementation and should be adapted to your specific agent structure.
"""

import logging

from .buffer_manager import MemoryBufferManager
from .mcp_interface import MemoryMCP

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_memory_to_agent(agent_class):
    """
    Decorator to add memory capabilities to an agent class.
    This is a sample implementation and should be adapted to your specific agent structure.
    """

    # Store the original __init__ method
    original_init = agent_class.__init__

    # Define a new __init__ method that adds memory capabilities
    def __init__(self, *args, **kwargs):
        # Call the original __init__ method
        original_init(self, *args, **kwargs)

        # Add memory capabilities
        self.memory_buffer = MemoryBufferManager()
        self.memory_mcp = MemoryMCP(self.memory_buffer)

        # Add memory command handling to the agent
        self._add_memory_command_handling()

    # Replace the __init__ method
    agent_class.__init__ = __init__

    # Store the original process_message method if it exists
    if hasattr(agent_class, "process_message"):
        original_process = agent_class.process_message

        # Define a new process_message method that adds memory recording
        def process_message(self, message, *args, **kwargs):
            # Check if it's a memory command
            if isinstance(message, str) and message.strip().startswith("!"):
                return self.memory_mcp.handle_command(message)

            # Call the original process_message method
            response = original_process(self, message, *args, **kwargs)

            # Add to memory buffer if recording is on
            if self.memory_buffer.memory_on:
                if isinstance(message, str):
                    self.memory_buffer.add_message("user", message)
                    if isinstance(response, str):
                        self.memory_buffer.add_message("assistant", response)

            return response

        # Replace the process_message method
        agent_class.process_message = process_message

    # Add method to handle memory commands
    def _add_memory_command_handling(self):
        """Add memory command handling to the agent"""
        # This implementation depends on your agent structure
        # For ADK agents, you might need to add a tool
        if hasattr(self, "add_tool"):
            self.add_tool(
                self._handle_memory_command,
                name="handle_memory_command",
                description="Handle memory-related commands (!memory_on, !memory_off, !rag)",
            )

    # Add method to the agent class
    agent_class._add_memory_command_handling = _add_memory_command_handling

    # Add method to handle memory commands
    def _handle_memory_command(self, command: str) -> str:
        """Handle memory-related commands"""
        return self.memory_mcp.handle_command(command)

    # Add method to the agent class
    agent_class._handle_memory_command = _handle_memory_command

    return agent_class


# Example usage:
"""
from google.adk import Agent

@add_memory_to_agent
class BenAgent(Agent):
    def __init__(self, name, description, instructions):
        super().__init__(name=name, description=description, instructions=instructions)
        # Original initialization code
        
    def process_message(self, message):
        # Original message processing code
        return "Response to " + message
"""
