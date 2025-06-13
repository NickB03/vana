"""
VANA Agent - Root Level Import
This module provides a root-level import for the VANA agent to ensure ADK compatibility.
"""

# Import the agent and root_agent from the proper location
from agents.vana import agent, root_agent

# Export both agent and root_agent at the root level for ADK discovery
__all__ = ["agent", "root_agent"]
