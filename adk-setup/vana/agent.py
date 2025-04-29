"""
VANA Agent Module

This module exposes the root agent for the VANA system.
"""

# Import the root agent from the agents module
try:
    from vana.agents.team import root_agent
except ImportError:
    # Fallback to the vana agent if team.py doesn't have a root_agent
    try:
        from vana.agents.vana import VanaAgent
        root_agent = VanaAgent()
    except ImportError:
        # Create a placeholder agent if neither is available
        from google.adk.agents import Agent
        root_agent = Agent(
            name="vana",
            model="gemini-1.5-pro",
            description="VANA Agent",
            instruction="You are VANA, a versatile agent network architecture."
        )
