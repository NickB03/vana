"""
VANA Agent Package

This package contains the main VANA agent implementation.
The root_agent is the primary entry point for the VANA system.

Following ADK standards for agent module structure:
https://google.github.io/adk-docs/deploy/cloud-run/
"""

# ADK standard import pattern
from . import agent

# Export the root_agent for ADK discovery
root_agent = agent.root_agent

__all__ = ["root_agent", "agent"]
