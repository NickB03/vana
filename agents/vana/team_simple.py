"""
VANA Agent - Simplified Version for Testing
Fixed agent-tool integration issues by simplifying instruction
"""

import os
from dotenv import load_dotenv

# Add project root to Python path for absolute imports
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Load environment variables before importing Google ADK
load_dotenv()

# Google ADK imports
from google.adk.agents import LlmAgent

# Import only essential working tools
from lib._tools import (
    # File System Tools
    adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
    
    # Search Tools
    adk_vector_search, adk_web_search, adk_search_knowledge,
    
    # System Tools
    adk_echo, adk_get_health_status,
    
    # Agent Coordination Tools
    adk_coordinate_task, adk_delegate_to_agent, adk_get_agent_status
)

# Create simplified VANA agent with concise instruction
root_agent = LlmAgent(
    name="vana",
    model="gemini-2.0-flash-exp",
    instruction="""You are VANA, an AI assistant with file operations, search capabilities, and system tools.

TOOL USAGE RULES:
- For "echo" requests: use echo tool immediately
- For "health" requests: use get_health_status tool immediately  
- For "agent status" requests: use get_agent_status tool immediately
- For file operations: use read_file, write_file, list_directory, file_exists
- For searches: use vector_search, web_search, search_knowledge
- For coordination: use coordinate_task, delegate_to_agent

BEHAVIOR:
- Always use tools immediately when requested
- Never ask permission to use tools
- Be direct and helpful
- Use the most appropriate tool for each request

Available tools: echo, get_health_status, get_agent_status, read_file, write_file, list_directory, file_exists, vector_search, web_search, search_knowledge, coordinate_task, delegate_to_agent""",
    
    tools=[
        # System Tools (for testing)
        adk_echo, adk_get_health_status, adk_get_agent_status,
        
        # File System Tools
        adk_read_file, adk_write_file, adk_list_directory, adk_file_exists,
        
        # Search Tools
        adk_vector_search, adk_web_search, adk_search_knowledge,
        
        # Agent Coordination Tools
        adk_coordinate_task, adk_delegate_to_agent
    ]
)
