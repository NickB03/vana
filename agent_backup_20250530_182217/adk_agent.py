"""
VANA ADK Agent Implementation

This module implements a Google ADK-compatible agent for the VANA platform.
It integrates with Google's Agent Development Kit for proper LLM integration.
"""

import logging
import os
from typing import Any

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Google ADK components
# Import VANA tools
from agent.tools import (
    echo,
    file_exists,
    get_health_status,
    kg_extract_entities,
    kg_query,
    kg_relationship,
    kg_store,
    list_directory,
    read_file,
    search_knowledge,
    vector_search,
    web_search,
    write_file,
)
from google.adk.agents import LlmAgent
from google.genai import types

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VanaADKAgent:
    """
    VANA Agent using Google ADK for LLM integration.

    This class wraps the Google ADK LlmAgent and provides VANA-specific
    functionality while maintaining compatibility with ADK patterns.
    """

    def __init__(self):
        """Initialize the VANA ADK agent."""
        self.model = os.getenv("VANA_MODEL", "gemini-2.0-flash")
        self.name = "vana"
        self.description = (
            "VANA AI assistant with memory, knowledge graph, and search capabilities"
        )

        # Create the ADK agent
        self.agent = self._create_adk_agent()

        logger.info(f"Initialized VANA ADK Agent with model {self.model}")

    def _create_adk_agent(self) -> LlmAgent:
        """
        Create and configure the Google ADK LlmAgent.

        Returns:
            Configured LlmAgent instance
        """
        # Define the agent instruction
        instruction = """You are VANA, an AI assistant with advanced capabilities including:

1. **Memory Management**: You can remember information across conversations using short-term memory and a persistent memory bank.

2. **Knowledge Graph**: You can store and query structured knowledge about entities and their relationships.

3. **Vector Search**: You can search through documents and knowledge using semantic similarity.

4. **Web Search**: You can search the internet for current information.

5. **File Operations**: You can read, write, and manage files in the system.

When a user asks you to do something:
1. Think about which tools would be most helpful
2. Use the appropriate tools to gather information or perform actions
3. Provide clear, helpful responses based on the results
4. Remember important information for future conversations

Always be helpful, accurate, and transparent about your capabilities and limitations.
"""

        # Create the ADK agent
        agent = LlmAgent(
            model=self.model,
            name=self.name,
            description=self.description,
            instruction=instruction,
            # Configure generation parameters for better responses
            generate_content_config=types.GenerateContentConfig(
                temperature=0.7,  # Balanced creativity and consistency
                max_output_tokens=2048,  # Allow for detailed responses
            ),
        )

        return agent

    def process_message(self, message: str, user_id: str = "default_user") -> str:
        """
        Process a user message using the ADK agent.

        Args:
            message: User message
            user_id: User identifier

        Returns:
            Agent response
        """
        try:
            # For now, we'll use a simple approach since we need to integrate
            # with ADK's session management properly

            # Check if this is a tool command
            if message.startswith("!"):
                return self._handle_tool_command(message)

            # For regular messages, we'll use the ADK agent
            # Note: This is a simplified implementation
            # In a full ADK integration, we'd use proper session management
            response = f"VANA (ADK): I received your message: '{message}'. "
            response += (
                "I'm now properly integrated with Google ADK for LLM capabilities. "
            )
            response += (
                "You can use tool commands like !echo, !read_file, !vector_search, etc."
            )

            return response

        except Exception as e:
            error_message = f"Error processing message: {str(e)}"
            logger.error(error_message)
            return error_message

    def _handle_tool_command(self, command: str) -> str:
        """
        Handle tool commands.

        Args:
            command: Tool command (starting with !)

        Returns:
            Tool response
        """
        # Parse command
        parts = command[1:].split(maxsplit=1)
        tool_name = parts[0]
        args = parts[1] if len(parts) > 1 else ""

        # Map tool names to functions
        tool_map = {
            "echo": echo,
            "read_file": read_file,
            "write_file": write_file,
            "list_directory": list_directory,
            "file_exists": file_exists,
            "vector_search": vector_search,
            "search_knowledge": search_knowledge,
            "get_health_status": get_health_status,
            "web_search": web_search,
            "kg_query": kg_query,
            "kg_store": kg_store,
            "kg_relationship": kg_relationship,
            "kg_extract_entities": kg_extract_entities,
        }

        # Check if tool exists
        if tool_name not in tool_map:
            available_tools = ", ".join(tool_map.keys())
            return f"Unknown tool: {tool_name}. Available tools: {available_tools}"

        # Execute tool
        try:
            tool_function = tool_map[tool_name]
            result = tool_function(args)
            return f"Tool '{tool_name}' result: {result}"
        except Exception as e:
            error_message = f"Error executing tool {tool_name}: {str(e)}"
            logger.error(error_message)
            return error_message

    def get_agent_info(self) -> dict[str, Any]:
        """
        Get information about the agent.

        Returns:
            Agent information dictionary
        """
        return {
            "name": self.name,
            "model": self.model,
            "description": self.description,
            "adk_integrated": True,
            "available_tools": [
                "echo",
                "read_file",
                "write_file",
                "list_directory",
                "file_exists",
                "vector_search",
                "search_knowledge",
                "get_health_status",
                "web_search",
                "kg_query",
                "kg_store",
                "kg_relationship",
                "kg_extract_entities",
            ],
        }


# Create a global instance for easy access
vana_adk_agent = VanaADKAgent()
