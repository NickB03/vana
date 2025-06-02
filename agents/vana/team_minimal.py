"""
VANA Multi-Agent Team Definition - Minimal Working Version

This is a simplified version with only working tools to test basic functionality.
"""

import os

# Add project root to Python path for absolute imports
import sys

from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables before importing Google ADK
load_dotenv()

# Google ADK imports (installed in environment)
from google.adk.agents import LlmAgent

# Import only working ADK-compatible tools
from lib._tools import (
    # Agent Coordination Tools
    adk_coordinate_task,
    adk_delegate_to_agent,
    # System Tools
    adk_echo,
    adk_file_exists,
    adk_get_agent_status,
    adk_get_health_status,
    adk_list_directory,
    # File System Tools
    adk_read_file,
    adk_search_knowledge,
    adk_transfer_to_agent,
    # Search Tools
    adk_vector_search,
    adk_web_search,
    adk_write_file,
)

# Create a simple VANA agent with working tools
root_agent = LlmAgent(
    name="vana",
    model="gemini-2.0-flash-exp",
    instruction="""You are VANA, an AI assistant with access to file operations, search capabilities, and system tools.

Available tools:
- File operations: read, write, list, check existence
- Search: vector search, web search, knowledge search
- System: echo, health status
- Agent coordination: coordinate tasks, delegate, get status, transfer

You can help users with:
- File management and operations
- Information search and retrieval
- System status and health checks
- Task coordination and delegation

Always be helpful, accurate, and efficient in your responses.""",
    tools=[
        # File System Tools
        adk_read_file,
        adk_write_file,
        adk_list_directory,
        adk_file_exists,
        # Search Tools
        adk_vector_search,
        adk_web_search,
        adk_search_knowledge,
        # System Tools
        adk_echo,
        adk_get_health_status,
        # Agent Coordination Tools
        adk_coordinate_task,
        adk_delegate_to_agent,
        adk_get_agent_status,
        adk_transfer_to_agent,
    ],
)
