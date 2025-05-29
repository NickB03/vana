"""
VANA Multi-Agent System - Agent Discovery Redirect

This file redirects ADK discovery to the comprehensive VANA agent
in agents/team.py instead of using a simple agent definition.

This ensures the production system exposes all 46 tools and 22 agents
instead of just 2 basic tools.
"""

# Import the comprehensive VANA agent from agents/team.py
from agents.team import root_agent

# Export for ADK discovery
agent = root_agent
