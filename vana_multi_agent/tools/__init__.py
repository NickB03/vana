"""
VANA Multi-Agent Tools Package

This package provides ADK-compatible tools that integrate all the enhanced VANA tools
with Google ADK's tool system for use in the multi-agent architecture.
"""

from vana_multi_agent.tools.adk_tools import (
    # File System Tools
    adk_read_file,
    adk_write_file,
    adk_list_directory,
    adk_file_exists,

    # Search Tools
    adk_vector_search,
    adk_web_search,
    adk_search_knowledge,

    # Knowledge Graph Tools
    adk_kg_query,
    adk_kg_store,
    adk_kg_relationship,
    adk_kg_extract_entities,

    # System Tools
    adk_echo,
    adk_get_health_status,

    # Agent Coordination Tools
    adk_coordinate_task,
    adk_delegate_to_agent,
    adk_get_agent_status
)

# Create a dummy agent for ADK compatibility (tools directory should not have agents)
class DummyAgent:
    root_agent = False

agent = DummyAgent()

__all__ = [
    # File System Tools
    "adk_read_file",
    "adk_write_file",
    "adk_list_directory",
    "adk_file_exists",

    # Search Tools
    "adk_vector_search",
    "adk_web_search",
    "adk_search_knowledge",

    # Knowledge Graph Tools
    "adk_kg_query",
    "adk_kg_store",
    "adk_kg_relationship",
    "adk_kg_extract_entities",

    # System Tools
    "adk_echo",
    "adk_get_health_status",

    # Agent Coordination Tools
    "adk_coordinate_task",
    "adk_delegate_to_agent",
    "adk_get_agent_status"
]
