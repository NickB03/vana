"""
ADK-Compliant Agent-as-Tool Implementation

This module implements the official Google ADK agent-as-tool pattern using
the AgentTool class from google.adk.tools.agent_tool.
"""

import logging
import os
from typing import Any, Optional

from google.adk.tools import FunctionTool
from google.adk.tools.agent_tool import AgentTool

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_specialist_agent_tool(
    specialist_agent: Any,
    name: Optional[str] = None,
    description: Optional[str] = None
) -> AgentTool:
    """
    Create an ADK AgentTool from a specialist agent.
    
    This replaces the custom AgentToolWrapper implementation with the official
    ADK pattern, reducing code complexity and improving reliability.
    
    Args:
        specialist_agent: The specialist agent to wrap as a tool
        name: Optional name override for the tool
        description: Optional description override
        
    Returns:
        AgentTool instance from the official ADK
    """
    # Use the official ADK AgentTool - it handles all the complexity internally
    agent_tool = AgentTool(agent=specialist_agent)
    
    # ADK's AgentTool automatically extracts name and description from the agent
    # but we can override if needed
    if name:
        agent_tool.name = name
    if description:
        # AgentTool doesn't have a description attribute, but we can add it for metadata
        agent_tool._description = description
        
    logger.info(f"Created ADK AgentTool for specialist: {agent_tool.name}")
    
    return agent_tool


def create_specialist_tools(specialist_agents: list) -> list:
    """
    Create ADK agent tools for a list of specialist agents.
    
    This function is used by the orchestrator to convert specialist agents
    into tools that can be used by other agents.
    
    Args:
        specialist_agents: List of specialist agents to convert to tools
        
    Returns:
        List of AgentTool instances
    """
    tools = []
    
    # Check if we should use the official ADK agent tools
    use_official = os.getenv("USE_OFFICIAL_AGENT_TOOL", "false").lower() == "true"
    
    if use_official:
        logger.info("Using official ADK AgentTool implementation")
        for agent in specialist_agents:
            tool = create_specialist_agent_tool(agent)
            tools.append(tool)
    else:
        # Legacy path - create FunctionTool wrappers as fallback
        logger.info("Using legacy FunctionTool wrappers (set USE_OFFICIAL_AGENT_TOOL=true to use ADK)")
        tools.extend(_create_legacy_function_tools())
        
    return tools


# Legacy function tools for backward compatibility
def _create_legacy_function_tools() -> list:
    """Create legacy FunctionTool instances for gradual migration."""
    
    def architecture_tool_func(context: str) -> str:
        """🏗️ Architecture specialist tool for system design and architecture analysis."""
        return f"Architecture Analysis for: {context}\n\n[Legacy mode - set USE_OFFICIAL_AGENT_TOOL=true]"
    
    def ui_tool_func(context: str) -> str:
        """🎨 UI/UX specialist tool for interface design and user experience."""
        return f"UI/UX Design for: {context}\n\n[Legacy mode - set USE_OFFICIAL_AGENT_TOOL=true]"
    
    def devops_tool_func(context: str) -> str:
        """⚙️ DevOps specialist tool for infrastructure and deployment planning."""
        return f"DevOps Plan for: {context}\n\n[Legacy mode - set USE_OFFICIAL_AGENT_TOOL=true]"
    
    def qa_tool_func(context: str) -> str:
        """🧪 QA specialist tool for testing strategy and quality assurance."""
        return f"QA Strategy for: {context}\n\n[Legacy mode - set USE_OFFICIAL_AGENT_TOOL=true]"
    
    def data_science_tool_func(context: str) -> str:
        """📊 Data Science specialist tool for analysis and insights."""
        return f"Data Analysis for: {context}\n\n[Legacy mode - set USE_OFFICIAL_AGENT_TOOL=true]"
    
    def security_tool_func(context: str) -> str:
        """🔒 Security specialist tool for security analysis and recommendations."""
        return f"Security Analysis for: {context}\n\n[Legacy mode - set USE_OFFICIAL_AGENT_TOOL=true]"
    
    # Create tools with proper naming
    tools = []
    
    for func, name in [
        (architecture_tool_func, "architecture_tool"),
        (ui_tool_func, "ui_tool"),
        (devops_tool_func, "devops_tool"),
        (qa_tool_func, "qa_tool"),
        (data_science_tool_func, "data_science_tool"),
        (security_tool_func, "security_tool")
    ]:
        tool = FunctionTool(func=func)
        tool.name = name
        tools.append(tool)
        
    return tools


# Backward compatibility exports
def get_adk_architecture_tool():
    """Legacy getter - use create_specialist_tools instead."""
    logger.warning("get_adk_architecture_tool is deprecated. Use create_specialist_tools instead.")
    return _create_legacy_function_tools()[0]


def get_adk_ui_tool():
    """Legacy getter - use create_specialist_tools instead."""
    logger.warning("get_adk_ui_tool is deprecated. Use create_specialist_tools instead.")
    return _create_legacy_function_tools()[1]


def get_adk_devops_tool():
    """Legacy getter - use create_specialist_tools instead."""
    logger.warning("get_adk_devops_tool is deprecated. Use create_specialist_tools instead.")
    return _create_legacy_function_tools()[2]


def get_adk_qa_tool():
    """Legacy getter - use create_specialist_tools instead."""  
    logger.warning("get_adk_qa_tool is deprecated. Use create_specialist_tools instead.")
    return _create_legacy_function_tools()[3]


# Module-level variables for backward compatibility (will be removed in final phase)
adk_architecture_tool = None
adk_ui_tool = None  
adk_devops_tool = None
adk_qa_tool = None


def initialize_agent_tools():
    """Legacy initialization - no longer needed with new implementation."""
    logger.warning("initialize_agent_tools is deprecated. Tools are created on demand now.")