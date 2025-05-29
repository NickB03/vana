"""
VANA - Agent Discovery Redirect

This file redirects ADK discovery to the comprehensive VANA agent
in ../agents/team.py instead of using a simple agent definition.

This ensures the production system exposes all 46 tools and 22 agents
instead of just 2 basic tools.
"""

import sys
import os

# Add parent directory to path to import from agents
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the comprehensive VANA agent from agents/team.py
from agents.team import root_agent

# Export for ADK discovery
agent = root_agent
