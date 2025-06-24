"""
VANA Agent Package

This package contains the main VANA agent implementation.
The root_agent is the primary entry point for the VANA system.
"""

from .team import root_agent

# Export the root_agent for ADK discovery
__all__ = ["root_agent"]

# Also export as 'agent' for compatibility
agent = root_agent
