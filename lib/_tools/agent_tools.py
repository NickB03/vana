"""
Agents-as-Tools Implementation for Google ADK

This module implements the "Agents-as-Tools" pattern using Google ADK's
official AgentTool, enabling proper agent composition and delegation.
"""

import logging
from typing import Any, Dict, List, Optional

# Import official ADK AgentTool
from google.adk.tools.agent_tool import AgentTool as ADKAgentTool

# Configure logging
logger = logging.getLogger(__name__)


# ADK Implementation - Create agent tools using official Google ADK
def create_specialist_agent_tool(specialist_agent, name=None, description=None):
    """
    Create an ADK AgentTool from a specialist agent.
    
    Args:
        specialist_agent: The specialist agent to wrap
        name: Optional name for the tool
        description: Optional description
        
    Returns:
        ADKAgentTool instance
    """
    tool_name = name or getattr(specialist_agent, "name", "specialist_agent")
    tool_description = description or getattr(
        specialist_agent, "description", 
        f"Specialist agent tool for {tool_name}"
    )
    
    logger.info(f"Creating ADK AgentTool for '{tool_name}'")
    
    return ADKAgentTool(
        agent=specialist_agent,
        name=tool_name,
        description=tool_description
    )


def create_specialist_tools(specialist_agents):
    """
    Create agent tools for a list of specialist agents using ADK implementation.
    
    Args:
        specialist_agents: List or dict of specialist agents
        
    Returns:
        List of ADK agent tools
    """
    logger.info("Creating specialist tools using ADK AgentTool")
    
    # Convert dict to list if needed
    if isinstance(specialist_agents, dict):
        specialist_agents = list(specialist_agents.values())
    
    tools = []
    for agent in specialist_agents:
        if agent is not None:
            adk_tool = create_specialist_agent_tool(agent)
            tools.append(adk_tool)
    return tools


# Lazy initialization for specialist tools
_specialist_tools_cache = {}

def _get_tool_or_initialize(tool_name: str) -> Optional[ADKAgentTool]:
    """
    Get or initialize a specialist tool with lazy loading.
    
    Args:
        tool_name: Name of the tool to get/initialize
        
    Returns:
        ADKAgentTool instance or None if not available
    """
    if tool_name in _specialist_tools_cache:
        return _specialist_tools_cache[tool_name]
    
    try:
        # Map tool names to specialist imports
        specialist_map = {
            "adk_architecture_tool": ("agents.specialists.architecture_specialist", "architecture_specialist"),
            "adk_ui_tool": ("agents.specialists.ui_specialist", "ui_specialist"),
            "adk_devops_tool": ("agents.specialists.devops_specialist", "devops_specialist"),
            "adk_qa_tool": ("agents.specialists.qa_specialist", "qa_specialist"),
        }
        
        if tool_name in specialist_map:
            module_path, agent_name = specialist_map[tool_name]
            module = __import__(module_path, fromlist=[agent_name])
            specialist = getattr(module, agent_name, None)
            
            if specialist:
                tool = create_specialist_agent_tool(specialist)
                _specialist_tools_cache[tool_name] = tool
                return tool
    except ImportError as e:
        logger.warning(f"Could not import specialist for {tool_name}: {e}")
    
    return None


# Lazy getters for individual specialist tools
def get_adk_architecture_tool() -> Optional[ADKAgentTool]:
    """Get the architecture specialist as an ADK tool."""
    return _get_tool_or_initialize("adk_architecture_tool")


def get_adk_ui_tool() -> Optional[ADKAgentTool]:
    """Get the UI specialist as an ADK tool."""
    return _get_tool_or_initialize("adk_ui_tool")


def get_adk_devops_tool() -> Optional[ADKAgentTool]:
    """Get the DevOps specialist as an ADK tool."""
    return _get_tool_or_initialize("adk_devops_tool")


def get_adk_qa_tool() -> Optional[ADKAgentTool]:
    """Get the QA specialist as an ADK tool."""
    return _get_tool_or_initialize("adk_qa_tool")


# For backward compatibility, create module-level variables that auto-initialize
adk_architecture_tool = get_adk_architecture_tool()
adk_ui_tool = get_adk_ui_tool()
adk_devops_tool = get_adk_devops_tool()
adk_qa_tool = get_adk_qa_tool()


# Export main functions
__all__ = [
    "create_specialist_agent_tool",
    "create_specialist_tools",
    "get_adk_architecture_tool",
    "get_adk_ui_tool", 
    "get_adk_devops_tool",
    "get_adk_qa_tool",
    "adk_architecture_tool",
    "adk_ui_tool",
    "adk_devops_tool",
    "adk_qa_tool",
]