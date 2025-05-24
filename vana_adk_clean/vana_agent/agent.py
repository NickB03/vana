"""
VANA Agent - Google ADK Implementation

This module implements the VANA agent using Google ADK patterns.
It integrates with Google's Agent Development Kit for proper LLM integration.
"""

import os
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import Google ADK components
from google.adk.agents import LlmAgent
from google.genai import types

# Import VANA tools
from agent.tools import (
    echo, read_file, write_file, list_directory, file_exists,
    vector_search, search_knowledge, get_health_status,
    web_search,
    kg_query, kg_store, kg_relationship, kg_extract_entities
)

# Create VANA tools as ADK-compatible functions
def create_vana_tools():
    """Create VANA tools as ADK-compatible functions."""

    def echo_tool(message: str) -> str:
        """Echo a message back to the user."""
        return echo(message)

    def read_file_tool(file_path: str) -> str:
        """Read the contents of a file."""
        return read_file(file_path)

    def write_file_tool(file_path: str, content: str) -> str:
        """Write content to a file."""
        return write_file(f"{file_path} {content}")

    def list_directory_tool(directory_path: str) -> str:
        """List the contents of a directory."""
        return list_directory(directory_path)

    def file_exists_tool(file_path: str) -> str:
        """Check if a file exists."""
        return file_exists(file_path)

    def vector_search_tool(query: str) -> str:
        """Search using vector similarity."""
        return vector_search(query)

    def web_search_tool(query: str) -> str:
        """Search the web for information."""
        return web_search(query)

    def kg_query_tool(query: str) -> str:
        """Query the knowledge graph."""
        return kg_query(query)

    def kg_store_tool(data: str) -> str:
        """Store data in the knowledge graph."""
        return kg_store(data)

    def get_health_tool() -> str:
        """Get system health status."""
        return get_health_status("")

    return [
        echo_tool,
        read_file_tool,
        write_file_tool,
        list_directory_tool,
        file_exists_tool,
        vector_search_tool,
        web_search_tool,
        kg_query_tool,
        kg_store_tool,
        get_health_tool
    ]

# Create the VANA agent
root_agent = LlmAgent(
    model=os.getenv("VANA_MODEL", "gemini-2.0-flash"),
    name="vana",
    description="VANA AI assistant with memory, knowledge graph, and search capabilities",
    instruction="""You are VANA, an AI assistant with advanced capabilities including:

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
""",
    tools=create_vana_tools(),
    generate_content_config=types.GenerateContentConfig(
        temperature=0.7,  # Balanced creativity and consistency
        max_output_tokens=2048  # Allow for detailed responses
    )
)
