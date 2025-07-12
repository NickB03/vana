"""
Base Agents Module - Central location for root agent reference

This module helps break circular dependencies by providing a central
location for the root agent that can be imported by other modules.
"""

from typing import Optional

from google.adk.agents import Agent

# Global reference to root agent - initialized by team.py
_root_agent: Optional[Agent] = None


def set_root_agent(agent: Agent) -> None:
    """
    Set the root agent reference.

    Args:
        agent: The root agent instance
    """
    global _root_agent
    _root_agent = agent


def get_root_agent() -> Optional[Agent]:
    """
    Get the root agent reference.

    Returns:
        The root agent instance or None if not initialized
    """
    return _root_agent


# Export functions
__all__ = ["set_root_agent", "get_root_agent"]
