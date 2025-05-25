"""
VANA Multi-Agent Team

This package defines the multi-agent team structure for the VANA system,
including the orchestrator agent and specialist agents.
"""

from .team import root_agent

# Create agent attribute for ADK compatibility
agent = root_agent

__all__ = ["root_agent", "agent"]
