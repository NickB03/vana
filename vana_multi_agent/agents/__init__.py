"""
VANA Multi-Agent Team

This package defines the multi-agent team structure for the VANA system,
including the orchestrator agent and specialist agents.

Note: This package does NOT expose an 'agent' attribute to prevent
Google ADK from discovering this directory as an agent. The actual
agent discovery happens through the vana/ directory structure.
"""

from .team import root_agent

__all__ = ["root_agent"]
